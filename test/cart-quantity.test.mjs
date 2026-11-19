import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import { CartController } from '../dist/cart/cart.controller.js';
import { CartService } from '../dist/cart/cart.service.js';

let app;
let items;
let writes;
beforeEach(() => {
  writes = 0;
  items = [
    { userId: 42, productId: 5, quantity: 2, active: true },
    { userId: 9, productId: 5, quantity: 3, active: true },
    { userId: 42, productId: 6, quantity: 4, active: false },
  ];
});
before(async () => {
  const prisma = {
    cartItem: {
      async updateMany({ where, data }) {
        writes++;
        const matches = items.filter((item) =>
          item.userId === where.cart.userId && item.productId === where.productId &&
          where.OR.some((condition) => condition.product
            ? item.active === condition.product.isActive
            : item.quantity >= condition.quantity.gte),
        );
        matches.forEach((item) => { item.quantity = data.quantity; });
        return { count: matches.length };
      },
    },
  };
  const module = await Test.createTestingModule({
    controllers: [CartController],
    providers: [{ provide: CartService, useValue: new CartService(prisma) }],
  }).overrideGuard(AuthGuard('jwt')).useValue({
    canActivate(context) {
      context.switchToHttp().getRequest().user = { userId: 42 };
      return true;
    },
  }).compile();
  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
});
after(async () => { await app?.close(); });

test('PATCH sets the exact quantity and only changes the authenticated user cart', async () => {
  await request(app.getHttpServer()).patch('/cart/items/5').send({ quantity: 116 })
    .expect(200, { count: 1 });
  assert.equal(items[0].quantity, 116);
  assert.equal(items[1].quantity, 3);
  assert.equal(writes, 1);
});

test('PATCH rejects empty, zero, negative, fractional, string, and overflowing quantities', async () => {
  for (const quantity of [undefined, null, '', 0, -1, 1.5, '12', 2147483648]) {
    await request(app.getHttpServer()).patch('/cart/items/5').send({ quantity }).expect(400);
  }
  assert.equal(writes, 0);
  assert.equal(items[0].quantity, 2);
});

test('PATCH cannot increase unavailable products, but can reduce them', async () => {
  await request(app.getHttpServer()).patch('/cart/items/6').send({ quantity: 5 }).expect(404);
  assert.equal(items[2].quantity, 4);
  await request(app.getHttpServer()).patch('/cart/items/6').send({ quantity: 1 }).expect(200);
  assert.equal(items[2].quantity, 1);
  await request(app.getHttpServer()).patch('/cart/items/999').send({ quantity: 1 }).expect(404);
});
