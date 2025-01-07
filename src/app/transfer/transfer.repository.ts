import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TransferRepository {
  private readonly MODULE_NAME = 'TransferRepository';

  constructor(
    private readonly logger: Logger,
    @InjectDataSource() private dataSource: DataSource,
    private readonly httpService: HttpService,
    //private readonly saldoConsumerService: SaldoConsumerService
  ) {}
}
