import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMySql } from './app/shared/config/connection.service';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TransferModule } from './app/transfer/transfer.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { OauthGuard } from './auth/oauth/oauth.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({ useClass: ConfigMySql }),
    ThrottlerModule.forRoot([
      {
        ttl: 10 * 60000,
        limit: 10,
      },
    ]),
    TransferModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    OauthGuard,
  ],
})
export class AppModule {}
