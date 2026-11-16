import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import { Module, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcrypt';
import request from 'supertest';
import { AuthService } from '../dist/auth/auth.service.js';
import { AuthController } from '../dist/auth/auth.controller.js';
import { AuthOriginGuard } from '../dist/auth/session.js';

const origin = 'http://localhost:3000';
const jwt = new JwtService();
const config = new ConfigService({
  JWT_ACCESS_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
});

async function setup(t) {
  const user = {
    id: 1,
    email: 'admin@example.com',
    password: await hash('password123', 4),
    role: 'admin',
    refreshTokenHash: null,
  };
  const prisma = {
    user: {
      // Match PrismaService's global omission of password and refreshTokenHash.
      findUnique: async ({ where, omit }) => {
        if (where.id !== user.id && where.email !== user.email) return null;
        const result = { ...user };
        if (omit?.password !== false) delete result.password;
        if (omit?.refreshTokenHash !== false) delete result.refreshTokenHash;
        return result;
      },
      update: async ({ data }) => Object.assign(user, data),
      updateMany: async ({ where, data }) => {
        if (
          where.id !== user.id ||
          where.refreshTokenHash !== user.refreshTokenHash
        )
          return { count: 0 };
        Object.assign(user, data);
        return { count: 1 };
      },
    },
  };
  const service = new AuthService(prisma, jwt, config);
  class TestModule {}
  Module({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: service }, AuthOriginGuard],
  })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  t.after(() => app.close());
  const http = request(app.getHttpServer());
  const login = () =>
    http
      .post('/auth/login')
      .set('Origin', origin)
      .send({ email: user.email, password: 'password123' });
  return { user, service, http, login };
}

test('login sets a persistent HttpOnly cookie; a new page restores access with current role', async (t) => {
  const { user, http, login } = await setup(t);
  const response = await login().expect(201);
  assert.equal(typeof response.body.accessToken, 'string');
  assert.equal(response.body.refreshToken, undefined);
  const cookie = response.headers['set-cookie'][0];
  for (const flag of [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/auth',
    'Max-Age=604800',
  ])
    assert.ok(cookie.includes(flag));
  assert.equal(response.headers['cache-control'], 'no-store');
  user.role = 'owner';
  const restored = await http
    .post('/auth/refresh')
    .set('Cookie', cookie.split(';')[0])
    .set('Origin', origin)
    .expect(201);
  const payload = await jwt.verifyAsync(restored.body.accessToken, {
    secret: 'test-access-secret',
  });
  assert.equal(payload.role, 'owner');
  assert.deepEqual(Object.keys(restored.body), ['accessToken']);
  // Reloading repeatedly must keep the original refresh cookie usable.
  for (let reload = 0; reload < 3; reload++) {
    const next = await http
      .post('/auth/refresh')
      .set('Cookie', cookie.split(';')[0])
      .set('Origin', origin)
      .expect(201);
    assert.deepEqual(Object.keys(next.body), ['accessToken']);
  }
});

test('logout revokes the cookie, clears it, and is idempotent', async (t) => {
  const { user, http, login } = await setup(t);
  const response = await login();
  const cookie = response.headers['set-cookie'][0].split(';')[0];
  const ended = await http
    .post('/auth/logout')
    .set('Cookie', cookie)
    .expect(201);
  assert.equal(user.refreshTokenHash, null);
  assert.match(ended.headers['set-cookie'][0], /Expires=Thu, 01 Jan 1970/);
  await http.post('/auth/refresh').set('Cookie', cookie).expect(401);
  await http.post('/auth/logout').set('Cookie', cookie).expect(201);
  await http.post('/auth/logout').expect(201);
});

test('missing, malformed, expired, wrong-secret and revoked refresh tokens are rejected', async (t) => {
  const { http, login } = await setup(t);
  await http.post('/auth/refresh').expect(401);
  for (const token of [
    'bad-token',
    '%ZZ',
    await jwt.signAsync(
      { sub: 1 },
      { secret: 'test-refresh-secret', expiresIn: -1 },
    ),
    await jwt.signAsync(
      { sub: 1 },
      { secret: 'test-access-secret', expiresIn: '1h' },
    ),
  ])
    await http
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${token}`)
      .expect(401);
  const old = (await login()).headers['set-cookie'][0].split(';')[0];
  const next = (await login()).headers['set-cookie'][0].split(';')[0];
  assert.notEqual(old, next);
  await http.post('/auth/refresh').set('Cookie', old).expect(401);
  await http.post('/auth/logout').set('Cookie', old).expect(201);
  await http.post('/auth/refresh').set('Cookie', next).expect(201);
});

test('browser auth writes reject untrusted origins and invalid passwords', async (t) => {
  const { http, user } = await setup(t);
  for (const path of ['login', 'register', 'refresh', 'logout']) {
    await http
      .post(`/auth/${path}`)
      .set('Origin', 'https://untrusted.example')
      .send({})
      .expect(403);
  }
  await http
    .post('/auth/login')
    .send({ email: user.email, password: 'wrong' })
    .expect(401);
});
