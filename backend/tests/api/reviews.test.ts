import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ApiModule } from '../../src/api/api.module';
import { AuthService } from '../../src/api/auth/auth.service';
import { ReviewService } from '../../src/services';
import {
  CASE_REPOSITORY,
  CaseRepository,
  CaseFilter,
  PROVIDER_REPOSITORY,
  ProviderRepository,
  ProviderFilter,
  REVIEW_REPOSITORY,
  ReviewRepository,
  ReviewFilter,
} from '../../src/repositories';
import {
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  UserRole,
  HealthcareProvider,
  Clinic,
  AppointmentStatus,
  Review,
  ReviewStatus,
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

class MockReviewRepository implements ReviewRepository {
  public reviews: Map<string, Review> = new Map();

  async findById(id: string): Promise<Review | null> {
    return this.reviews.get(id) || null;
  }

  async findAll(filter?: ReviewFilter): Promise<Review[]> {
    let list = Array.from(this.reviews.values());
    if (filter?.providerId) {
      list = list.filter((r) => r.getProviderId() === filter.providerId);
    }
    if (filter?.status) {
      list = list.filter((r) => r.getStatus() === filter.status);
    }
    if (filter?.caseId) {
      list = list.filter((r) => r.getCaseId() === filter.caseId);
    }
    if (filter?.appointmentId) {
      list = list.filter((r) => r.getAppointmentId() === filter.appointmentId);
    }
    return list;
  }

  async findByProviderId(providerId: string, status?: ReviewStatus): Promise<Review[]> {
    return this.findAll({ providerId, status });
  }

  async findByAppointmentId(appointmentId: string): Promise<Review | null> {
    return Array.from(this.reviews.values()).find((r) => r.getAppointmentId() === appointmentId) || null;
  }

  async findByCaseId(caseId: string): Promise<Review | null> {
    return Array.from(this.reviews.values()).find((r) => r.getCaseId() === caseId) || null;
  }

  async save(review: Review): Promise<void> {
    this.reviews.set(review.getId(), review);
  }

  async delete(id: string): Promise<void> {
    this.reviews.delete(id);
  }

  async count(filter?: ReviewFilter): Promise<number> {
    const list = await this.findAll(filter);
    return list.length;
  }

  clear(): void {
    this.reviews.clear();
  }
}

describe('Reviews API (POST /reviews, moderation, rating computation)', () => {
  let app: INestApplication;
  let mockCaseRepo: MockCaseRepository;
  let mockProviderRepo: MockProviderRepository;
  let mockReviewRepo: MockReviewRepository;
  let authService: AuthService;
  let reviewService: ReviewService;

  let travelerToken: string;
  let adminToken: string;
  let staffToken: string;

  let testClinic: Clinic;
  const testClinicId = 'clinic-review-test-100';

  beforeAll(async () => {
    mockCaseRepo = new MockCaseRepository();
    mockProviderRepo = new MockProviderRepository();
    mockReviewRepo = new MockReviewRepository();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    })
      .overrideProvider(CASE_REPOSITORY)
      .useValue(mockCaseRepo)
      .overrideProvider(PROVIDER_REPOSITORY)
      .useValue(mockProviderRepo)
      .overrideProvider(REVIEW_REPOSITORY)
      .useValue(mockReviewRepo)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
    reviewService = moduleRef.get<ReviewService>(ReviewService);

    // Register user accounts
    const travelerAuth = await authService.register({
      email: 'traveler-rev@test.com',
      password: 'password123',
      fullName: 'Alice Walker',
      role: UserRole.TRAVELER,
    });
    travelerToken = travelerAuth.accessToken;

    const adminAuth = await authService.register({
      email: 'admin-rev@test.com',
      password: 'password123',
      fullName: 'Admin Alex',
      role: UserRole.ADMIN,
    });
    adminToken = adminAuth.accessToken;

    const staffAuth = await authService.register({
      email: 'staff-rev@test.com',
      password: 'password123',
      fullName: 'Staff Sam',
      role: UserRole.PROVIDER_STAFF,
    });
    staffToken = staffAuth.accessToken;
  });

  beforeEach(() => {
    mockCaseRepo.clear();
    mockReviewRepo.clear();
    mockProviderRepo.clear();

    testClinic = new Clinic({
      id: testClinicId,
      name: 'Sunrise Tourist Health Center',
      cityId: 'hyderabad',
      address: 'Banjara Hills Rd 12, Hyderabad',
      contactNumber: '+919876500000',
      email: 'contact@sunriseclinic.com',
      spokenLanguageCodes: ['en', 'hi'],
      averageRating: 0,
      totalReviews: 0,
    });
    mockProviderRepo.save(testClinic);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── 1. Authentication & Validation ────────────────────────────────────────

  it('rejects unauthenticated review creation with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Great doctor and clean clinic',
      });

    expect(res.status).toBe(401);
  });

  it('rejects unauthorized role (PROVIDER_STAFF) with 403', async () => {
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Great doctor and clean clinic',
      });

    expect(res.status).toBe(403);
  });

  it('rejects review without appointmentId or caseId with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Very helpful staff and fast check-in',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('RESOLVED helpline case or COMPLETED appointment');
  });

  it('validates rating is between 1 and 5', async () => {
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 6,
        comment: 'Too high rating',
        caseId: 'case-dummy',
      });

    expect(res.status).toBe(400);
  });

  // ─── 2. Review for COMPLETED Appointment ────────────────────────────────────

  it('rejects review if appointment is not COMPLETED', async () => {
    reviewService.registerMockAppointment({
      id: 'appt-requested-01',
      providerId: testClinicId,
      travelerId: 'traveler-user',
      status: AppointmentStatus.REQUESTED,
    });

    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 4,
        comment: 'Appointment was nice',
        appointmentId: 'appt-requested-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('COMPLETED appointments');
  });

  it('rejects review if appointment is linked to a different provider', async () => {
    reviewService.registerMockAppointment({
      id: 'appt-diff-provider',
      providerId: 'other-hospital-999',
      travelerId: 'traveler-user',
      status: AppointmentStatus.COMPLETED,
    });

    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Doctor was good',
        appointmentId: 'appt-diff-provider',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not linked to the specified healthcare provider');
  });

  it('successfully creates review for COMPLETED appointment with status PENDING_MODERATION', async () => {
    reviewService.registerMockAppointment({
      id: 'appt-completed-01',
      providerId: testClinicId,
      travelerId: 'traveler-user',
      status: AppointmentStatus.COMPLETED,
    });

    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Super fast triage and wonderful English communication',
        appointmentId: 'appt-completed-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.comment).toBe('Super fast triage and wonderful English communication');
    expect(res.body.appointmentId).toBe('appt-completed-01');
    expect(res.body.status).toBe(ReviewStatus.PENDING_MODERATION);
    expect(res.body.isVerifiedVisit).toBe(true);
    expect(res.body.verificationBadge).toBe('Verified visit');

    // Pending review MUST NOT alter provider's averageRating or totalReviews!
    const provider = await mockProviderRepo.findById(testClinicId);
    expect(provider?.getAverageRating()).toBe(0);
    expect(provider?.getTotalReviews()).toBe(0);
  });

  it('rejects duplicate review for the same appointment with 409 Conflict', async () => {
    reviewService.registerMockAppointment({
      id: 'appt-duplicate-test',
      providerId: testClinicId,
      travelerId: 'traveler-user',
      status: AppointmentStatus.COMPLETED,
    });

    // First review succeeds
    await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Initial review for visit',
        appointmentId: 'appt-duplicate-test',
      });

    // Second review must fail
    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 4,
        comment: 'Attempting a second review for the same appointment',
        appointmentId: 'appt-duplicate-test',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already been submitted for this appointment');
  });

  // ─── 3. Review for RESOLVED Helpline Case ───────────────────────────────────

  it('rejects review if helpline case is not RESOLVED', async () => {
    const unfinalizedCase = new HelplineCase({
      id: 'case-in-progress',
      travelerId: 'traveler-user',
      cityId: 'hyderabad',
      subject: 'Need help finding ENT',
      initialDescription: 'Foreign visitor with ear infection',
      preferredLanguageCode: 'en',
      status: HelplineCaseStatus.RECOMMENDED,
      recommendedProviderId: testClinicId,
    });
    await mockCaseRepo.save(unfinalizedCase);

    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Helpful helpline recommendation',
        caseId: 'case-in-progress',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('RESOLVED helpline cases');
  });

  it('successfully creates review for RESOLVED helpline case with status PENDING_MODERATION', async () => {
    const resolvedCase = new HelplineCase({
      id: 'case-resolved-01',
      travelerId: 'traveler-user',
      cityId: 'hyderabad',
      subject: 'Severe allergic skin reaction',
      initialDescription: 'Looking for dermatologist in Banjara Hills',
      preferredLanguageCode: 'en',
      status: HelplineCaseStatus.RESOLVED,
      recommendedProviderId: testClinicId,
    });
    await mockCaseRepo.save(resolvedCase);

    const res = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 4,
        comment: 'Case was resolved quickly and doctor was very thorough',
        caseId: 'case-resolved-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.caseId).toBe('case-resolved-01');
    expect(res.body.status).toBe(ReviewStatus.PENDING_MODERATION);
    expect(res.body.isVerifiedVisit).toBe(true);
    expect(res.body.verificationBadge).toBe('Verified visit');

    // Pending review MUST NOT affect rating
    const provider = await mockProviderRepo.findById(testClinicId);
    expect(provider?.getAverageRating()).toBe(0);
    expect(provider?.getTotalReviews()).toBe(0);
  });

  // ─── 4. Admin Moderation & Rating Recomputation ────────────────────────────

  it('allows Admin to approve review and updates averageRating and totalReviews', async () => {
    // Create a review
    reviewService.registerMockAppointment({
      id: 'appt-for-approval',
      providerId: testClinicId,
      travelerId: 'traveler-user',
      status: AppointmentStatus.COMPLETED,
    });

    const createRes = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({
        providerId: testClinicId,
        rating: 5,
        comment: 'Excellent service and clear communication',
        appointmentId: 'appt-for-approval',
      });

    const reviewId = createRes.body.id;

    // Non-admin cannot approve
    const travelerApproveRes = await request(app.getHttpServer())
      .patch(`/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({ status: ReviewStatus.APPROVED });

    expect(travelerApproveRes.status).toBe(403);

    // Admin approves
    const adminApproveRes = await request(app.getHttpServer())
      .patch(`/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ReviewStatus.APPROVED });

    expect(adminApproveRes.status).toBe(200);
    expect(adminApproveRes.body.review.status).toBe(ReviewStatus.APPROVED);
    expect(adminApproveRes.body.ratingStats.totalReviews).toBe(1);
    expect(adminApproveRes.body.ratingStats.averageRating).toBe(5.0);

    // Verify provider stats are updated
    const updatedProvider = await mockProviderRepo.findById(testClinicId);
    expect(updatedProvider?.getTotalReviews()).toBe(1);
    expect(updatedProvider?.getAverageRating()).toBe(5.0);
  });

  it('computes averageRating and totalReviews from APPROVED reviews only when a review is hidden', async () => {
    // 1st approved review: 5 stars
    const r1 = new Review({
      id: 'rev-approved-1',
      travelerId: 't1',
      providerId: testClinicId,
      appointmentId: 'appt-1',
      rating: 5,
      comment: 'Top notch care 5 stars',
      status: ReviewStatus.APPROVED,
    });
    await mockReviewRepo.save(r1);

    // 2nd review: 1 star initially approved
    const r2 = new Review({
      id: 'rev-to-hide-2',
      travelerId: 't2',
      providerId: testClinicId,
      appointmentId: 'appt-2',
      rating: 1,
      comment: 'Spam or inappropriate review',
      status: ReviewStatus.APPROVED,
    });
    await mockReviewRepo.save(r2);

    // Both approved: average = (5+1)/2 = 3.0, total = 2
    await reviewService.recomputeProviderRatingStats(testClinicId);
    let provider = await mockProviderRepo.findById(testClinicId);
    expect(provider?.getTotalReviews()).toBe(2);
    expect(provider?.getAverageRating()).toBe(3.0);

    // Admin hides r2
    const hideRes = await request(app.getHttpServer())
      .patch(`/reviews/${r2.getId()}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: ReviewStatus.HIDDEN });

    expect(hideRes.status).toBe(200);
    expect(hideRes.body.review.status).toBe(ReviewStatus.HIDDEN);
    // Rating must now be computed ONLY from r1 (5 stars, 1 review)
    expect(hideRes.body.ratingStats.totalReviews).toBe(1);
    expect(hideRes.body.ratingStats.averageRating).toBe(5.0);

    provider = await mockProviderRepo.findById(testClinicId);
    expect(provider?.getTotalReviews()).toBe(1);
    expect(provider?.getAverageRating()).toBe(5.0);
  });
});
