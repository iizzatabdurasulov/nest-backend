import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getAddress(userId: number) {
    return this.prisma.userAddress.findMany({
      where: {
        id: userId,
      },
      orderBy: {
        isDefault: 'desc',
      },
    });
  }

  async getDeliveryType() {
    return this.prisma.deliveryType.findMany({
      where: {
        isActive: true,
      },
    });
  }

  async getPickUpPoints(city?: string) {
    return this.prisma.pickupPoint.findMany({
      where: {
        isActive: true,
        ...(city ? { city } : {}),
      },
    });
  }

  async getCheckout(userId: number) {
    const [addresses, deliveryTypes] = await Promise.all([
      this.getAddress(userId),
      this.getDeliveryType(),
    ]);

    return {
      addresses,
      deliveryTypes,
    };
  }
}
