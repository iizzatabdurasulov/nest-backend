import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ValidationPipe } from '@nestjs/common';
import { AdminGuard } from '../dist/auth/admin.guard.js';
import { ProductsService } from '../dist/products/products.service.js';
import { ProductDto } from '../dist/products/products.dto.js';
import { UpdateProductDto } from '../dist/products/update.product.dto.js';

const product = { id: 10, userId: 20, title: 'Test', price: 100 };
function setup() {
  const calls = [];
  const prisma = {
    product: {
      findUnique: async () => product,
      findFirst: async ({ where }) => {
        if (where.userId !== undefined && where.userId !== product.userId) return null;
        return product;
      },
      create: async ({ data }) => { calls.push(data); return data; },
      update: async ({ data }) => { calls.push(data); return { ...product, ...data }; },
      delete: async () => { calls.push('deleted'); return product; },
    },
  };
  return { service: new ProductsService(prisma), calls };
}

for (const role of ['admin', 'owner']) {
  test(`${role} can enter the panel and manage another user's product`, async () => {
    const guard = new AdminGuard();
    assert.equal(guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }) }), true);
    const { service, calls } = setup();
    await service.update(10, 99, { title: 'Changed', oldPrice: 200 }, undefined, role);
    assert.equal(calls[0].title, 'Changed');
    assert.equal(calls[0].oldPrice, '200');
    await service.delete(10, 99, role);
    assert.equal(calls[1], 'deleted');
  });
}

test('clients and anonymous users cannot enter the admin panel', () => {
  const guard = new AdminGuard();
  for (const user of [undefined, { role: 'client' }, { role: 'unknown' }]) {
    assert.throws(() => guard.canActivate({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }),
      (error) => error.getStatus() === 403);
  }
});

test('clients cannot update or delete another user’s product', async () => {
  const { service, calls } = setup();
  await assert.rejects(() => service.update(10, 99, { title: 'Changed' }), (error) => error.getStatus() === 403);
  await assert.rejects(() => service.delete(10, 99), (error) => error.getStatus() === 404);
  assert.equal(calls.length, 0);
});

test('clients can still manage their own products', async () => {
  const { service, calls } = setup();
  await service.update(10, 20, { price: 250 });
  await service.delete(10, 20);
  assert.equal(calls[0].price, 250);
  assert.equal(calls[1], 'deleted');
});

test('create and update accept the panel payload, including cleared optional fields', async () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  const body = { title: 'Test product', price: 25000, oldPrice: null, image: null, desc: 'Description', category: 'Home' };
  const { service, calls } = setup();
  const create = await pipe.transform(body, { type: 'body', metatype: ProductDto });
  await service.create(create, 20);
  assert.equal(calls[0].userId, 20);
  assert.equal(calls[0].image, null);
  const update = await pipe.transform(body, { type: 'body', metatype: UpdateProductDto });
  await service.update(10, 99, update, undefined, 'admin');
  assert.equal(calls[1].oldPrice, null);
  assert.equal(calls[1].desc, 'Description');
});

test('invalid product values are rejected before saving', async () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true });
  for (const body of [{ title: 'a' }, { price: -5 }, { image: 'https://example.com/file.png' }]) {
    await assert.rejects(() => pipe.transform(body, { type: 'body', metatype: UpdateProductDto }),
      (error) => error.getStatus() === 400);
  }
});
