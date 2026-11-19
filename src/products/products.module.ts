import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsController } from './products.controller.js';
import { CurrencyService } from '../currency/currency.service.js';
import { CurrencyModule } from '../currency/currency.module.js';

@Module({
  imports: [CurrencyModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
  exports: [ProductsService]
})
export class ProductsModule {}
