import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../users/user.decorator.js';
import { CartService } from './cart.service.js';

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
