import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferRepository } from './transfer.repository';
import { TransferDto } from '../dto/transfer.dto';

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
  async transferFromExt(@Body() transferDto: TransferDto) {
    const cuentaNumero = parseInt(transferDto.originAccount, 10);
    try {
      return await this.transferService.transferFromExt(
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
}
