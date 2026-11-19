import { Module } from '@nestjs/common';
import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProductsModule } from '../products/products.module.js';

@Module({
  imports: [PrismaModule,ProductsModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}
