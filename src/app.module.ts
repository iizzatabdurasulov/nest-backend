import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProductsModule } from './products/products.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from '@nestjs/config';
import { CurrencyService } from './currency/currency.service.js';
import { CurrencyController } from './currency/currency.controller.js';
import { CurrencyModule } from './currency/currency.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'nest-tutorial',
    }),
    ProductsModule,
    PrismaModule,
    UsersModule,
    AuthModule,
    ConfigModule,
    CurrencyModule
  ],
  controllers: [AppController, CurrencyController],
  providers: [AppService, CurrencyService],
  exports: [],
})
export class AppModule {}
