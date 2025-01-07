import { HttpModule } from '@nestjs/axios';
import { Module, Logger } from '@nestjs/common';
import { TransferController } from './transfer.controller';
import { TransferRepository } from './transfer.repository';
import { TransferService } from './transfer.service';
import { SaldoConsumerService } from './transfer.saldoconsumerservice';

@Module({
  imports: [HttpModule],
  controllers: [TransferController],
  providers: [TransferService, TransferRepository, Logger, SaldoConsumerService],
})
export class TransferModule {}