import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { CheckoutService } from './checkout.service.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('addresses')
  getAddresses(@Req() req: any) {
    return this.checkoutService.getAddress(req.user.id);
  }

  @Get('delivery-types')
  getDeliveryTypes() {
    return this.checkoutService.getDeliveryType();
  }

  @Get('pickup-points')
  getPickUpPoints(@Query('city') city?: string) {
    return this.checkoutService.getPickUpPoints(city);
  }

  @Get()
  getCheckout(@Req() req: any) {
    return this.checkoutService.getCheckout(req.user.id);
  }
}
