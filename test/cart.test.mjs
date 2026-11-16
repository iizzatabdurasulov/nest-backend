import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CartService } from '../dist/cart/cart.service.js';

// Deliberately use different user, cart, item, and product IDs.
function setup() {
  const carts = [
    { id: 7, userId: 42 },
    { id: 42, userId: 9 },
  ];
  let items = [
    { id: 101, cartId: 7, productId: 5, quantity: 1 },
    { id: 102, cartId: 7, productId: 6, quantity: 2 },
    { id: 5, cartId: 42, productId: 5, quantity: 3 },
  ];
  const prisma = {
    cart: {
      findUnique: async ({ where, include }) => {
        const cart = carts.find((cart) =>
          Object.entries(where).every(([key, value]) => cart[key] === value),
        );
        if (!cart) return null;
        return include
          ? { ...cart, items: items.filter((item) => item.cartId === cart.id) }
          : cart;
      },
      upsert: async ({ where }) =>
        carts.find((cart) => cart.userId === where.userId),
    },
    cartItem: {
      updateMany: async ({ where, data }) => {
        let count = 0;
        for (const item of items) {
          if (
            item.productId === where.productId &&
            item.quantity > where.quantity.gt &&
            carts.some(
              (cart) =>
                cart.id === item.cartId && cart.userId === where.cart.userId,
            )
          ) {
            item.quantity -= data.quantity.decrement;
            count++;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }) => {
        const before = items.length;
        items = items.filter(
          (item) =>
            !Object.entries(where).every(([key, value]) =>
              key === 'cart'
                ? carts.some(
                    (cart) =>
                      cart.id === item.cartId && cart.userId === value.userId,
                  )
                : item[key] === value,
            ),
        );
        return { count: before - items.length };
      },
      upsert: async ({ where, update, create }) => {
        const item = items.find(
          (item) =>
            item.cartId === where.cartId_productId.cartId &&
            item.productId === where.cartId_productId.productId,
        );
        if (item) {
          item.quantity += update.quantity.increment;
          return item;
        }
        const added = { id: 200 + items.length, ...create };
        items.push(added);
        return added;
      },
    },
  };
  return new CartService(prisma);
}

test('loads the current user cart when cart ID differs from user ID', async () => {
  const service = setup();
  const cart = await service.getCart(42);
  assert.equal(cart.id, 7);
  assert.deepEqual(
    cart.items.map((item) => item.productId),
    [5, 6],
  );
  assert.equal(await service.getCart(99), null);
});

test('removes by product ID and leaves other users and products untouched', async () => {
  const service = setup();
  assert.deepEqual(await service.removeItem(42, 5), { count: 1 });
  assert.deepEqual(
    (await service.getCart(42)).items.map((item) => item.productId),
    [6],
  );
  assert.equal((await service.getCart(9)).items[0].quantity, 3);
  assert.deepEqual(await service.removeItem(42, 5), { count: 0 });
});

test('repeated addition increments quantity and allows another product', async () => {
  const service = setup();
  assert.equal((await service.addToCart(42, 5)).quantity, 2);
  assert.equal((await service.addToCart(42, 8)).quantity, 1);
  assert.equal((await service.getCart(42)).items.length, 3);
});

test('clears only the current user cart and handles a missing cart', async () => {
  const service = setup();
  assert.deepEqual(await service.clearCart(42), { count: 2 });
  assert.deepEqual((await service.getCart(42)).items, []);
  assert.equal((await service.getCart(9)).items.length, 1);
  assert.deepEqual(await service.clearCart(99), { count: 0 });
});

test('decrement reduces only the matching product in the current user cart', async () => {
  const service = setup();
  await service.addToCart(42, 5);
  assert.deepEqual(await service.decrementItem(42, 5), { count: 1 });
  const cart = await service.getCart(42);
  assert.equal(cart.items.find((item) => item.productId === 5).quantity, 1);
  assert.equal(cart.items.find((item) => item.productId === 6).quantity, 2);
  assert.equal((await service.getCart(9)).items[0].quantity, 3);
});

test('repeated decrements stop at 1 without deleting the item', async () => {
  const service = setup();
  const results = await Promise.all(
    Array.from({ length: 10 }, () => service.decrementItem(42, 6)),
  );
  assert.equal(
    results.reduce((sum, result) => sum + result.count, 0),
    1,
  );
  assert.equal(
    (await service.getCart(42)).items.find((item) => item.productId === 6)
      .quantity,
    1,
  );
  assert.deepEqual(await service.decrementItem(42, 5), { count: 0 });
});

test('decrement does nothing for missing products and other users carts', async () => {
  const service = setup();
  assert.deepEqual(await service.decrementItem(42, 999), { count: 0 });
  assert.deepEqual(await service.decrementItem(99, 5), { count: 0 });
  assert.equal((await service.getCart(9)).items[0].quantity, 3);
});
