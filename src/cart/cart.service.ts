import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotFoundError } from 'rxjs';
import { subscribe } from 'diagnostics_channel';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addToCart(userId: number, productId: number) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    return this.prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      update: {
        quantity: { increment: 1 },
      },

      create: {
        cartId: cart.id,
        productId,
        quantity: 1,
      },
    });
  }

  async decrementItem(userId: number, productId: number) {
    return this.prisma.cartItem.updateMany({
      where: {
        productId,
        cart: { userId },
        quantity: { gt: 1 },
      },
      data: { quantity: { decrement: 1 } },
    });
  }

  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const subTotal = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const deliveryPrice = cart.items.reduce(
      (sum, item) => sum + Number(item.product.deliveryPrice) * item.quantity,
      0,
    );

    const totalPrice = subTotal + deliveryPrice;

    return {
      ...cart,
      subTotal,
      totalPrice,
      deliveryPrice,
    };
  }

  async removeItem(userId: number, productId: number) {
    return this.prisma.cartItem.deleteMany({
      where: {
        productId,
        cart: { userId },
      },
    });
  }

  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) return { count: 0 };

    return this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });
  }
}
