import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

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
    // Guard the lower bound in the same query so concurrent requests cannot go below 1.
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
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
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
