import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../../src/api/auth/auth.module';
import { AuthService } from '../../src/api/auth/auth.service';
import { UserRole } from '../../src/domain';

describe('Auth & Role Guards API (POST /auth/register, POST /auth/login, Protected Routes)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.clearUsers();
  });

  // ─── 1. Registration & Login ───────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('successfully registers a new traveler user and returns a signed JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'traveler@example.com',
          password: 'securePassword123',
          fullName: 'Alice Walker',
          phoneNumber: '+1-555-0100',
          role: UserRole.TRAVELER,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toEqual({
        id: expect.any(String),
        email: 'traveler@example.com',
        fullName: 'Alice Walker',
        role: UserRole.TRAVELER,
      });
    });

    it('rejects duplicate email registration with 409 Conflict', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'duplicate@example.com',
        password: 'password123',
        fullName: 'First User',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'anotherPassword456',
          fullName: 'Second User',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already registered');
    });

    it('rejects registration with short password (< 6 chars) with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'short@example.com',
          password: '123',
          fullName: 'Short Pass',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 6 characters');
    });

    it('rejects registration with invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          fullName: 'Bad Email',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('valid email address is required');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'registered@example.com',
        password: 'correctPassword123',
        fullName: 'Registered User',
        role: UserRole.TRAVELER,
      });
    });

    it('successfully logs in with valid credentials and returns JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'registered@example.com',
          password: 'correctPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user.email).toBe('registered@example.com');
      expect(res.body.user.role).toBe(UserRole.TRAVELER);
    });

    it('rejects login with wrong password (401 Unauthorized)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'registered@example.com',
          password: 'wrongPassword999',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('rejects login with non-existent email (401 Unauthorized)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ghost@example.com',
          password: 'correctPassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  // ─── 2. CHECK: Protected Route Rejects Request Without Token ───────────────

  describe('CHECK: Protected Route (GET /auth/me)', () => {
    let travelerToken: string;

    beforeEach(async () => {
      const auth = await authService.register({
        email: 'token-tester@example.com',
        password: 'password123',
        fullName: 'Token Tester',
        role: UserRole.TRAVELER,
      });
      travelerToken = auth.accessToken;
    });

    it('rejects a request completely without an Authorization header with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authorization token is required');
    });

    it('rejects a request with an empty Authorization header with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', '   ');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authorization token is required');
    });

    it('rejects a request with malformed authorization scheme (not Bearer) with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Basic dXNlcjpwYXNz');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Bearer <token> required');
    });

    it('rejects a request with an invalid or forged token with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.forged.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid or expired authorization token');
    });

    it('accepts a request with a valid Bearer token and returns user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${travelerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.user).toEqual({
        sub: expect.any(String),
        email: 'token-tester@example.com',
        fullName: 'Token Tester',
        role: UserRole.TRAVELER,
        iat: expect.any(Number),
        exp: expect.any(Number),
      });
    });
  });

  // ─── 3. Role Guards Verification ────────────────────────────────────────────

  describe('Role Guards (GET /auth/admin, GET /auth/agent, GET /auth/provider)', () => {
    let travelerToken: string;
    let agentToken: string;
    let staffToken: string;
    let adminToken: string;

    beforeEach(async () => {
      const traveler = await authService.register({
        email: 'trav@example.com',
        password: 'password123',
        fullName: 'Traveler Tom',
        role: UserRole.TRAVELER,
      });
      travelerToken = traveler.accessToken;

      const agent = await authService.register({
        email: 'agent@example.com',
        password: 'password123',
        fullName: 'Agent Amy',
        role: UserRole.HELPLINE_AGENT,
      });
      agentToken = agent.accessToken;

      const staff = await authService.register({
        email: 'staff@example.com',
        password: 'password123',
        fullName: 'Staff Sam',
        role: UserRole.PROVIDER_STAFF,
      });
      staffToken = staff.accessToken;

      const admin = await authService.register({
        email: 'admin@example.com',
        password: 'password123',
        fullName: 'Admin Arthur',
        role: UserRole.ADMIN,
      });
      adminToken = admin.accessToken;
    });

    describe('GET /auth/admin (Requires ADMIN role)', () => {
      it('rejects unauthenticated request with 401', async () => {
        const res = await request(app.getHttpServer()).get('/auth/admin');
        expect(res.status).toBe(401);
      });

      it('rejects TRAVELER with 403 Forbidden', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/admin')
          .set('Authorization', `Bearer ${travelerToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Access denied: requires one of roles [ADMIN]');
      });

      it('rejects HELPLINE_AGENT with 403 Forbidden', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/admin')
          .set('Authorization', `Bearer ${agentToken}`);

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Access denied');
      });

      it('grants access to ADMIN with 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/admin')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Admin authorization granted');
        expect(res.body.user.role).toBe(UserRole.ADMIN);
      });
    });

    describe('GET /auth/agent (Requires HELPLINE_AGENT or ADMIN role)', () => {
      it('rejects TRAVELER with 403 Forbidden', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/agent')
          .set('Authorization', `Bearer ${travelerToken}`);

        expect(res.status).toBe(403);
      });

      it('grants access to HELPLINE_AGENT with 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/agent')
          .set('Authorization', `Bearer ${agentToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Helpline agent authorization granted');
      });

      it('grants access to ADMIN with 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/agent')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });

    describe('GET /auth/provider (Requires PROVIDER_STAFF or ADMIN role)', () => {
      it('rejects TRAVELER with 403 Forbidden', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/provider')
          .set('Authorization', `Bearer ${travelerToken}`);

        expect(res.status).toBe(403);
      });

      it('grants access to PROVIDER_STAFF with 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/provider')
          .set('Authorization', `Bearer ${staffToken}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Provider staff authorization granted');
      });

      it('grants access to ADMIN with 200 OK', async () => {
        const res = await request(app.getHttpServer())
          .get('/auth/provider')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
      });
    });
  });
});
