import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../users/user.decorator.js';
import { CartService } from './cart.service.js';
import { SetCartQuantityDto } from './cart.dto.js';

@Controller('cart')
@UseGuards(AuthGuard('jwt'))
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items/:productId')
  addToCart(
    @CurrentUser() user: { userId: number },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.addToCart(user.userId, productId);
  }

  @Post('items/:productId/decrement')
  decrementItem(
    @CurrentUser() user: { userId: number },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.decrementItem(user.userId, productId);
  }

  @Get()
  getCart(@CurrentUser() user: { userId: number }) {
    return this.cartService.getCart(user.userId);
  }

  @Patch('items/:productId')
  setQuantity(
    @CurrentUser() user: { userId: number },
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: SetCartQuantityDto,
  ) {
    return this.cartService.setQuantity(user.userId, productId, dto.quantity);
  }

  @Delete('items/:productId')
  removeItem(
    @CurrentUser() user: { userId: number },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.cartService.removeItem(user.userId, productId);
  }

  @Delete()
  clearCart(@CurrentUser() user: { userId: number }) {
    return this.cartService.clearCart(user.userId);
  }
}
