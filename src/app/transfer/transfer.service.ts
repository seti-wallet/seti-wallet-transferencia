import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TransferRepository } from './transfer.repository';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { SaldoConsumerService } from './transfer.saldoconsumerservice';
import { SaldosDiariosEntity } from '../entities/saldo.entity';
import { MovimientosEntity } from '../entities/movimiento.entity';

@Injectable()
export class TransferService {
  private readonly MODULE_NAME = 'TransferService';
  constructor(
    private transferRepository: TransferRepository,
    @InjectDataSource() private dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly saldoConsumerService: SaldoConsumerService,
  ) {}

  /**
   * Envio de transferencia a servicio de Juan
   * @returns
   */
  async transferToBankJuan(
    id: string,
    account: string,
    value: number,
    originAccount: number,
  ) {
    console.log(`Received originAccount: ${originAccount}`);
    console.log(`Received value: ${value}`);

    if (isNaN(value)) {
      throw new BadRequestException(
        'El valor a transferir debe ser un número.',
      );
    }

    // Validar que originAccount sea un número
    if (isNaN(originAccount)) {
      throw new BadRequestException(
        'El número de cuenta de origen no es válido.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const urlIntegration = `${process.env.BANK_JUAN_SERVICES_URL}/receive`;
    const payload = { id: id, account: account, value: value };

    const repo = queryRunner.manager.getRepository(SaldosDiariosEntity);
    const movimientosRepo =
      queryRunner.manager.getRepository(MovimientosEntity);

    const saldo = await this.saldoConsumerService.getSaldoUser(originAccount);
    console.log(`El valor de saldo es: ${saldo}`);

    if (saldo < value) {
      throw new BadRequestException(
        `No tiene fondos suficientes para realizar el retiro de la cuenta: ${originAccount}`,
      );
    }
    const saldoExistente = await repo.findOne({
      where: { cuenta: Number(originAccount) },
    });

    if (!saldoExistente) {
      throw new NotFoundException(
        `No se encontró el número de cuenta: ${originAccount}`,
      );
    }

    const fechaActual = new Date();

    saldoExistente.fecha = fechaActual;

    try {
      // Guardar movimiento inicial en base de datos
      const movimiento = new MovimientosEntity();
      movimiento.canal = 1;
      movimiento.clienteProducto = 3;
      movimiento.descripcion = 'Transferencia a cuenta ' + account;
      movimiento.destino = originAccount.toString();
      movimiento.fecha = fechaActual;
      movimiento.monto = value;
      movimiento.naturaleza = 'DB';
      movimiento.origen = '1';
      await movimientosRepo.save(movimiento);

      const { data } = await firstValueFrom(
        this.httpService
          .post<any[]>(urlIntegration, payload, {
            headers: {
              Authorization: `bearer ${process.env.INTEGRATION_TOKEN}`,
            },
          })
          .pipe(
            catchError((error) => {
              if (error?.response?.status === 400) {
                throw new BadRequestException('Invalid ID provided', error);
              } else if (error?.response?.status === 404) {
                throw new NotFoundException('Page not found', error);
              } else {
                throw new InternalServerErrorException(
                  'Error transferring',
                  error,
                );
              }
            }),
          ),
      );
      // Actualizar el saldo después de la transferencia
      saldoExistente.saldo = Number(saldoExistente.saldo) - Number(value);
      await repo.save(saldoExistente);

      // Guardar auditoría de éxito en base de datos
      await queryRunner.commitTransaction();
      return data;
    } catch (error) {
      // Rollback y guardar auditoría de error
      await queryRunner.rollbackTransaction();
      if (error instanceof InternalServerErrorException) {
        await this.compensateTransfer(id, account, value);
      } else if (error instanceof BadRequestException) {
        console.log('Error 400: Invalid ID provided. No compensation needed.');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  /** * Servicio de compensación en caso de error * @param id * @param account */
  async compensateTransfer(id: string, account: string, value: number) {
    const urlCompensation = `${process.env.COMPENSATION_SERVICE_URL}/compensate`;
    const payload = { id: id, account: account, value: value };

    try {
      await firstValueFrom(
        this.httpService
          .post<any>(urlCompensation, payload, {
            headers: {
              Authorization: `Bearer ${process.env.INTEGRATION_TOKEN}`,
            },
          })
          .pipe(
            catchError((error) => {
              throw new InternalServerErrorException(
                'Error in compensation service',
                error,
              );
            }),
          ),
      );
    } catch (error) {
      throw new InternalServerErrorException('Compensation failed', error);
    }
  }

  /**
   * Envio de transferencia a servicio de Juan
   * @returns
   */
  async transferFromExt(
    account: string,
    value: number,
    originAccount: number,
  ) {
    // Se genera transacción transversal
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const repo = queryRunner.manager.getRepository(SaldosDiariosEntity);

    const movimientosRepo =
      queryRunner.manager.getRepository(MovimientosEntity);
    const saldoExistente = await repo.findOne({
      where: { cuenta: Number(originAccount) },
    });

    // Realizar Consignación
    // a. Se valida Saldo
    const saldo = await this.saldoConsumerService.getSaldoUser(originAccount);
    console.log(`Saldo antes de transferencia es: ${saldo}`);

    // Registrar Movimiento
    try {
      // Guardar movimiento inicial en base de datos
      const movimiento = new MovimientosEntity();
      movimiento.canal = 1;
      movimiento.clienteProducto = 3;
      movimiento.descripcion = 'Transferencia a cuenta ' + account;
      movimiento.destino = originAccount.toString();
      movimiento.fecha = new Date();
      movimiento.monto = value;
      movimiento.naturaleza = 'DB';
      movimiento.origen = '1';
      await movimientosRepo.save(movimiento);
      // Actualizar el saldo después de la transferencia
      saldoExistente.saldo = Number(saldoExistente.saldo) + Number(value);
      await repo.save(saldoExistente);

      // Guardar auditoría de éxito en base de datos
      await queryRunner.commitTransaction();
    } catch (error) {
      // Rollback y guardar auditoría de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
