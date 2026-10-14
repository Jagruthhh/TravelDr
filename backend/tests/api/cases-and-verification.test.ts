import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiModule } from '../../src/api/api.module';
import { AuthService } from '../../src/api/auth/auth.service';
import {
  CASE_REPOSITORY,
  CaseRepository,
  CaseFilter,
  PROVIDER_REPOSITORY,
  ProviderRepository,
  ProviderFilter,
} from '../../src/repositories';
import {
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  UserRole,
  HealthcareProvider,
  Hospital,
  Clinic,
  VerificationStatus,
} from '../../src/domain';

class MockCaseRepository implements CaseRepository {
  public cases: Map<string, HelplineCase> = new Map();

  async findById(id: string): Promise<HelplineCase | null> {
    return this.cases.get(id) || null;
  }

  async findAll(filter?: CaseFilter): Promise<HelplineCase[]> {
    return Array.from(this.cases.values());
  }

  async findByTravelerId(travelerId: string): Promise<HelplineCase[]> {
    return this.findAll({ travelerId });
  }

  async findByAgentId(agentId: string): Promise<HelplineCase[]> {
    return this.findAll({ agentId });
  }

  async findByStatus(status: HelplineCaseStatus): Promise<HelplineCase[]> {
    return this.findAll({ status });
  }

  async save(helplineCase: HelplineCase): Promise<void> {
    this.cases.set(helplineCase.getId(), helplineCase);
  }

  async delete(id: string): Promise<void> {
    this.cases.delete(id);
  }

  async count(filter?: CaseFilter): Promise<number> {
    return this.cases.size;
  }

  clear(): void {
    this.cases.clear();
  }
}

class MockProviderRepository implements ProviderRepository {
  public providers: Map<string, HealthcareProvider> = new Map();

  async findById(id: string): Promise<HealthcareProvider | null> {
    return this.providers.get(id) || null;
  }

  async findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    return Array.from(this.providers.values());
  }

  async findByCity(cityId: string): Promise<HealthcareProvider[]> {
    return this.findAll({ cityId });
  }

  async findByLanguage(languageCode: string): Promise<HealthcareProvider[]> {
    return this.findAll({ languageCode });
  }

  async findBySpecialty(specialtyId: string): Promise<HealthcareProvider[]> {
    return this.findAll({ specialtyId });
  }

  async save(provider: HealthcareProvider): Promise<void> {
    this.providers.set(provider.getId(), provider);
  }

  async delete(id: string): Promise<void> {
    this.providers.delete(id);
  }

  async count(filter?: ProviderFilter): Promise<number> {
    return this.providers.size;
  }

  clear(): void {
    this.providers.clear();
  }
}

describe('Cases API & Provider Verification API', () => {
  let app: INestApplication;
  let mockCaseRepo: MockCaseRepository;
  let mockProviderRepo: MockProviderRepository;
  let authService: AuthService;

  let travelerToken: string;
  let agentToken: string;
  let adminToken: string;

  let testClinic: Clinic;

  beforeAll(async () => {
    mockCaseRepo = new MockCaseRepository();
    mockProviderRepo = new MockProviderRepository();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(CASE_REPOSITORY)
      .useValue(mockCaseRepo)
      .overrideProvider(PROVIDER_REPOSITORY)
      .useValue(mockProviderRepo)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);

    // Register user accounts with different roles
    const travelerAuth = await authService.register({
      email: 'traveler-case@test.com',
      password: 'password123',
      fullName: 'Traveler Tim',
      role: UserRole.TRAVELER,
    });
    travelerToken = travelerAuth.accessToken;

    const agentAuth = await authService.register({
      email: 'agent-case@test.com',
      password: 'password123',
      fullName: 'Agent Alice',
      role: UserRole.HELPLINE_AGENT,
    });
    agentToken = agentAuth.accessToken;

    const adminAuth = await authService.register({
      email: 'admin-case@test.com',
      password: 'password123',
      fullName: 'Admin Aaron',
      role: UserRole.ADMIN,
    });
    adminToken = adminAuth.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mockCaseRepo.clear();
    mockProviderRepo.clear();

    testClinic = new Clinic({
      id: 'clinic-rec-99',
      name: 'Calangute Urgent Care',
      cityId: 'goa',
      address: 'Beach Road, Calangute',
      contactNumber: '+91-832-2277000',
      email: 'clinic@calangute.com',
    });
    await mockProviderRepo.save(testClinic);
  });

  // ─── 1. POST /cases ────────────────────────────────────────────────────────

  describe('POST /cases', () => {
    it('creates a new helpline case in NEW status with 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post('/cases')
        .send({
          travelerId: 'trav-101',
          cityId: 'goa',
          subject: 'Severe sunburn with dizziness',
          initialDescription: 'Traveler spent too much time on beach and feels faint',
          preferredLanguageCode: 'en',
          urgency: HelplineUrgency.URGENT,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe(HelplineCaseStatus.NEW);
      expect(res.body.urgency).toBe(HelplineUrgency.URGENT);
      expect(res.body.travelerId).toBe('trav-101');
      expect(res.body.cityId).toBe('goa');

      // Verify saved in repository
      const saved = await mockCaseRepo.findById(res.body.id);
      expect(saved).toBeDefined();
      expect(saved?.getSubject()).toBe('Severe sunburn with dizziness');
    });

    it('rejects missing required fields with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer()).post('/cases').send({
        travelerId: 'trav-101',
        // missing cityId, subject, etc.
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('City ID is required'),
          expect.stringContaining('Subject is required'),
        ]),
      );
    });
  });

  // ─── 2. GET /cases/:id ─────────────────────────────────────────────────────

  describe('GET /cases/:id', () => {
    let existingCaseId: string;

    beforeEach(async () => {
      const c = new HelplineCase({
        id: 'case-test-123',
        travelerId: 'trav-101',
        cityId: 'goa',
        subject: 'Tropical insect bite',
        initialDescription: 'Swollen red area on leg',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.ROUTINE,
      });
      await mockCaseRepo.save(c);
      existingCaseId = 'case-test-123';
    });

    it('returns case details by ID with 200 OK', async () => {
      const res = await request(app.getHttpServer()).get(`/cases/${existingCaseId}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(existingCaseId);
      expect(res.body.subject).toBe('Tropical insect bite');
      expect(res.body.status).toBe(HelplineCaseStatus.NEW);
    });

    it('returns 404 Not Found when case does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/cases/non-existent-case');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('was not found');
    });
  });

  // ─── 3. PATCH /cases/:id/status (Agent Only) ────────────────────────────────

  describe('PATCH /cases/:id/status (Agent Only)', () => {
    let testCaseId: string;

    beforeEach(async () => {
      const c = new HelplineCase({
        id: 'case-progression-1',
        travelerId: 'trav-101',
        cityId: 'goa',
        subject: 'Acute food poisoning',
        initialDescription: 'Vomiting and dehydration after street food',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.URGENT,
      });
      await mockCaseRepo.save(c);
      testCaseId = 'case-progression-1';
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-1' });

      expect(res.status).toBe(401);
    });

    it('rejects TRAVELER role with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-1' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: requires one of roles [HELPLINE_AGENT, ADMIN]');
    });

    it('allows HELPLINE_AGENT to transition NEW -> ASSIGNED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.ASSIGNED,
          agentId: 'agent-alice',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HelplineCaseStatus.ASSIGNED);
      expect(res.body.agentId).toBe('agent-alice');
    });

    it('allows transition ASSIGNED -> RECOMMENDED with providerId', async () => {
      // 1. Assign first
      await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-alice' });

      // 2. Recommend provider
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.RECOMMENDED,
          providerId: 'clinic-rec-99',
          notes: 'Walk-in emergency appointment arranged at Calangute Urgent Care',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HelplineCaseStatus.RECOMMENDED);
      expect(res.body.recommendedProviderId).toBe('clinic-rec-99');
      expect(res.body.recommendationNotes).toContain('Walk-in emergency');
    });

    it('rejects RECOMMENDED transition without providerId with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-alice' });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.RECOMMENDED,
          // missing providerId
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('providerId is required');
    });

    it('allows transition RECOMMENDED -> RESOLVED with summary', async () => {
      // 1. Assign
      await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-alice' });

      // 2. Recommend
      await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.RECOMMENDED,
          providerId: 'clinic-rec-99',
        });

      // 3. Resolve
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.RESOLVED,
          summary: 'Traveler received IV fluids and antiemetics at clinic and recovered fully.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HelplineCaseStatus.RESOLVED);
      expect(res.body.resolutionSummary).toContain('recovered fully');
      expect(res.body.resolvedAt).toBeDefined();
    });

    it('rejects RESOLVED transition with short summary (< 5 chars)', async () => {
      await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: HelplineCaseStatus.ASSIGNED, agentId: 'agent-alice' });

      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          status: HelplineCaseStatus.RESOLVED,
          summary: 'done', // only 4 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('minimum 5 characters');
    });

    it('allows ADMIN role to update case status as well', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/cases/${testCaseId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: HelplineCaseStatus.ASSIGNED,
          agentId: 'admin-assigned-agent',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(HelplineCaseStatus.ASSIGNED);
    });
  });

  // ─── 4. PATCH /providers/:id/verification (Admin Only) ─────────────────────

  describe('PATCH /providers/:id/verification (Admin Only)', () => {
    let unverifiedHospital: Hospital;

    beforeEach(async () => {
      unverifiedHospital = new Hospital({
        id: 'hosp-verify-test',
        name: 'Goa Horizon Hospital',
        cityId: 'goa',
        address: 'Margao, Goa',
        contactNumber: '+91-832-5544332',
        email: 'info@horizon-hospital.com',
      });
      await mockProviderRepo.save(unverifiedHospital);
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .send({ status: VerificationStatus.VERIFIED });

      expect(res.status).toBe(401);
    });

    it('rejects TRAVELER role with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send({ status: VerificationStatus.VERIFIED });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: requires one of roles [ADMIN]');
    });

    it('rejects HELPLINE_AGENT role with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ status: VerificationStatus.VERIFIED });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: requires one of roles [ADMIN]');
    });

    it('allows ADMIN to verify a provider and updates isVerified to true', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: VerificationStatus.VERIFIED,
          licenseDocumentUrl: 'https://docs.horizon.com/license.pdf',
          notes: 'Accreditation verified by State Medical Directorate',
          expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('hosp-verify-test');
      expect(res.body.isVerified).toBe(true);
      expect(res.body.verificationStatus).toBe(VerificationStatus.VERIFIED);

      // Verify in repository
      const updated = await mockProviderRepo.findById('hosp-verify-test');
      expect(updated?.isVerified()).toBe(true);
      expect(updated?.getVerificationStatus()).toBe(VerificationStatus.VERIFIED);
    });

    it('allows ADMIN to reject or suspend provider verification', async () => {
      // 1. Verify first
      await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: VerificationStatus.VERIFIED });

      // 2. Suspend
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: VerificationStatus.SUSPENDED,
          notes: 'License under investigation',
        });

      expect(res.status).toBe(200);
      expect(res.body.isVerified).toBe(false);
      expect(res.body.verificationStatus).toBe(VerificationStatus.SUSPENDED);
    });

    it('returns 404 Not Found when provider ID does not exist', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/non-existent-provider/verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: VerificationStatus.VERIFIED });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('was not found');
    });

    it('rejects invalid verification status with 400 Bad Request (DTO validation)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/providers/hosp-verify-test/verification')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('status must be a valid VerificationStatus')]),
      );
    });
  });

  // ─── 5. POST /providers (Admin Only) ───────────────────────────────────────

  describe('POST /providers (Admin Only)', () => {
    const validPayload = {
      name: 'Lotus Wellness & Skin Clinic',
      type: 'CLINIC',
      city: 'hyderabad',
      address: 'Road No 36, Jubilee Hills, Hyderabad',
      phone: '+919876543210',
      email: 'contact@lotusclinic.com',
      languages: ['en', 'hi', 'te'],
      specialties: ['Dermatology', 'General Practice'],
      registrationNumber: 'TS-CL-2026-99120',
      issuingCouncil: 'Telangana State Medical Council',
      consultationFee: 750,
    };

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .send(validPayload);

      expect(res.status).toBe(401);
    });

    it('rejects non-admin role (TRAVELER) with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${travelerToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied: requires one of roles [ADMIN]');
    });

    it('validates required fields and returns 400 Bad Request on empty payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Provider name is required'),
          expect.stringContaining('City is required'),
          expect.stringContaining('Address is required'),
        ]),
      );
    });

    it('validates email format and rejects invalid emails with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('valid email address is required')]),
      );
    });

    it('allows ADMIN to create a provider and saves it with status PENDING', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(validPayload.name);
      expect(res.body.isVerified).toBe(false);
      expect(res.body.verificationStatus).toBe(VerificationStatus.PENDING);
      expect(res.body.registrationNumber).toBe(validPayload.registrationNumber);
      expect(res.body.issuingCouncil).toBe(validPayload.issuingCouncil);

      // Verify provider was persisted in repository
      const savedProvider = await mockProviderRepo.findById(res.body.id);
      expect(savedProvider).toBeDefined();
      expect(savedProvider?.getName()).toBe(validPayload.name);
      expect(savedProvider?.isVerified()).toBe(false);
      expect(savedProvider?.getVerificationStatus()).toBe(VerificationStatus.PENDING);
      expect(savedProvider?.getVerificationRecord()?.getRegistrationNumber()).toBe(
        validPayload.registrationNumber,
      );
      expect(savedProvider?.getVerificationRecord()?.getIssuingCouncil()).toBe(
        validPayload.issuingCouncil,
      );
    });

    it('rejects duplicate provider submission with the same name and address', async () => {
      // First submission succeeds
      const uniquePayload = {
        ...validPayload,
        name: 'Apollo Jubilee Clinic',
        address: 'Plot 10, Road No 36, Jubilee Hills',
      };

      const res1 = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(uniquePayload);
      expect(res1.status).toBe(201);

      // Second submission with same name and address must be rejected
      const res2 = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(uniquePayload);
      expect(res2.status).toBe(409);
      expect(res2.body.message).toContain('already exists');
    });

    it('rejects an address that is less than 10 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, name: 'Unique Clinic A', address: 'Short Rd' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Address must be at least 10 characters long')]),
      );
    });

    it('rejects an address that is "none"', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, name: 'Unique Clinic B', address: 'none' });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/cannot be "none"|minimum 10 characters/i),
        ]),
      );
    });

    it('rejects consultation fee of 800850 (> 100000)', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, name: 'Unique Clinic C', consultationFee: 800850 });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Consultation fee cannot exceed 100000')]),
      );
    });

    it('rejects negative consultation fee (< 0)', async () => {
      const res = await request(app.getHttpServer())
        .post('/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validPayload, name: 'Unique Clinic D', consultationFee: -50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('Consultation fee cannot be negative')]),
      );
    });
  });
});

