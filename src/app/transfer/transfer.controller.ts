import { Body, Controller, HttpException, HttpStatus, Logger, Post, UseGuards } from "@nestjs/common";
import { TransferService } from './transfer.service';
import { TransferRepository } from './transfer.repository';
import { TransferDto } from '../dto/transfer.dto';
import { OauthGuard } from '../../auth/oauth/oauth.guard'


@Controller('transferencias')
export class TransferController {
  private readonly MODULE_NAME = 'CoreController';
  constructor(
    private transferService: TransferService,
    private transferRepository: TransferRepository,
    private readonly logger: Logger,
  ) {}

  /** * Realiza la transferencia al banco de Juan
   * * @param transferDto
   *  * @returns
   * */
  @Post('/transferirBankJuan')
  async transferToBankJuan(@Body() transferDto: TransferDto) {
    const cuentaNumero = parseInt(transferDto.originAccount, 10);
    try {
      return await this.transferService.transferToBankJuan(
        transferDto.id,
        transferDto.account,
        transferDto.value,
        cuentaNumero,
      );
    } catch (error) {
      this.logger.error(`Error during transfer: ${error.message}`);
      throw error;
    }
  }

  /** Recibir transacción desde exterior
   * * @param transferDto
   *  * @returns
   * */
  @Post('/transferFromExternal')
  @UseGuards(OauthGuard) // Aplicando el guard de autenticación
  async transferFromExt(@Body() transferDto: TransferDto) {
    const cuentaNumero = parseInt(transferDto.originAccount, 10);

    try {
      const result = await this.transferService.transferFromExt(
        transferDto.account,
        transferDto.value,
        cuentaNumero,
      );

      // Respuesta de éxito con un mensaje
      return {
        statusCode: 200,
        message: 'Transferencia realizada con éxito',
        data: result,
      };
    } catch (error) {
      // Log del error
      this.logger.error(`Error durante la transferencia: ${error.message}`);

      // Lanzar una excepción con un mensaje personalizado
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Error al realizar la transferencia',
          error: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
