import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProvidersModule } from '../../src/api/providers/providers.module';
import { PROVIDER_REPOSITORY, ProviderRepository, ProviderFilter } from '../../src/repositories';
import {
  HealthcareProvider,
  Hospital,
  Clinic,
  Doctor,
  PriceEntry,
  Currency,
  VerificationRecord,
  VerificationStatus,
} from '../../src/domain';

/**
 * In-memory Mock ProviderRepository implementation for API testing.
 */
class MockProviderRepository implements ProviderRepository {
  public providers: Map<string, HealthcareProvider> = new Map();

  async findById(id: string): Promise<HealthcareProvider | null> {
    return this.providers.get(id) || null;
  }

  async findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    let result = Array.from(this.providers.values());

    if (filter?.cityId) {
      result = result.filter((p) => p.getCityId() === filter.cityId);
    }
    if (filter?.languageCode) {
      result = result.filter((p) => p.supportsLanguage(filter.languageCode!));
    }
    if (filter?.specialtyId) {
      result = result.filter((p) =>
        p.getSpecialtyIds().includes(filter.specialtyId!),
      );
    }
    if (filter?.isVerified !== undefined) {
      result = result.filter((p) => p.isVerified() === filter.isVerified);
    }
    if (filter?.isActive !== undefined) {
      result = result.filter((p) => p.getIsActive() === filter.isActive);
    }

    return result;
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
    const list = await this.findAll(filter);
    return list.length;
  }

  clear(): void {
    this.providers.clear();
  }
}

describe('Providers API (GET /providers & GET /providers/:id with Cost Range)', () => {
  let app: INestApplication;
  let mockRepo: MockProviderRepository;

  // Sample Providers
  let hydHospital: Hospital;
  let hydClinic: Clinic;
  let goaDoctor: Doctor;

  beforeAll(async () => {
    mockRepo = new MockProviderRepository();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ProvidersModule],
    })
      .overrideProvider(PROVIDER_REPOSITORY)
      .useValue(mockRepo)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mockRepo.clear();

    // 1. Hyderabad Hospital (Verified, has consultation & MRI pricing)
    hydHospital = new Hospital({
      id: 'hosp-hyd-1',
      name: 'Apollo International Hospital',
      cityId: 'hyd',
      address: 'Jubilee Hills, Hyderabad',
      contactNumber: '+91-40-23607777',
      email: 'contact@apollo-hyd.com',
      spokenLanguageCodes: ['en', 'te', 'hi'],
      specialtyIds: ['spec-derm', 'spec-cardio'],
      emergencyServices: true,
      bedCount: 400,
    });

    const hydVerification = new VerificationRecord({
      id: 'vr-hyd-1',
      providerId: 'hosp-hyd-1',
      licenseDocumentUrl: 'https://docs.apollo.com/license.pdf',
      status: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
    });
    hydHospital.attachVerificationRecord(hydVerification);

    // Fixed consultation: 80 USD
    hydHospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-1',
        providerId: 'hosp-hyd-1',
        treatmentId: 'treatment-consultation',
        amount: 80,
        currency: Currency.USD,
        isEstimate: false,
      }),
    );

    // Range MRI: 250 - 350 USD
    hydHospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-2',
        providerId: 'hosp-hyd-1',
        treatmentId: 'treatment-mri',
        amount: 300,
        currency: Currency.USD,
        minAmount: 250,
        maxAmount: 350,
        isEstimate: true,
      }),
    );

    // 2. Hyderabad Clinic (Pending verification, consultation only: 50 USD)
    hydClinic = new Clinic({
      id: 'clinic-hyd-2',
      name: 'Madhapur Skin Care Clinic',
      cityId: 'hyd',
      address: 'Madhapur, Hyderabad',
      contactNumber: '+91-40-11223344',
      email: 'care@madhapurclinic.com',
      spokenLanguageCodes: ['en', 'te'],
      specialtyIds: ['spec-derm'],
    });

    hydClinic.addPriceEntry(
      new PriceEntry({
        id: 'pe-clinic-1',
        providerId: 'clinic-hyd-2',
        treatmentId: 'treatment-consultation',
        amount: 50,
        currency: Currency.USD,
        isEstimate: false,
      }),
    );

    // 3. Doctor (Verified, Russian & English speaking, NO prices listed)
    goaDoctor = new Doctor({
      id: 'doc-goa-3',
      name: 'Dr. Sergei Ivanov',
      cityId: 'goa',
      address: 'Panaji, Goa',
      contactNumber: '+91-832-9988776',
      email: 'dr.sergei@gmail.com',
      medicalLicenseNumber: 'GOA-MED-7788',
      spokenLanguageCodes: ['en', 'ru'],
      specialtyIds: ['spec-gp'],
    });

    const goaVerification = new VerificationRecord({
      id: 'vr-goa-1',
      providerId: 'doc-goa-3',
      licenseDocumentUrl: 'https://docs.goamed.gov.in/sergei.pdf',
      status: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 86_400_000),
    });
    goaDoctor.attachVerificationRecord(goaVerification);

    await mockRepo.save(hydHospital);
    await mockRepo.save(hydClinic);
    await mockRepo.save(goaDoctor);
  });

  // ─── GET /providers ────────────────────────────────────────────────────────

  describe('GET /providers', () => {
    it('returns all active providers with costRange included', async () => {
      const res = await request(app.getHttpServer()).get('/providers');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);

      const hospital = res.body.find((p: any) => p.id === 'hosp-hyd-1');
      expect(hospital).toBeDefined();
      expect(hospital.name).toBe('Apollo International Hospital');
      expect(hospital.cityId).toBe('hyd');
      expect(hospital.isVerified).toBe(true);

      // Verify cost range across Apollo tariffs (80 to 350 USD)
      expect(hospital.costRange).toEqual({
        hasData: true,
        minPrice: 80,
        maxPrice: 350,
        currency: Currency.USD,
        label: 'USD 80 - 350',
      });

      // Verify provider without price entries (Dr. Sergei)
      const doc = res.body.find((p: any) => p.id === 'doc-goa-3');
      expect(doc).toBeDefined();
      expect(doc.costRange).toEqual({
        hasData: false,
        minPrice: null,
        maxPrice: null,
        currency: null,
        label: 'Price not available',
      });
    });

    it('filters providers by city query param (?city=hyd)', async () => {
      const res = await request(app.getHttpServer()).get('/providers?city=hyd');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.every((p: any) => p.cityId === 'hyd')).toBe(true);
    });

    it('filters providers by language query param (?language=ru)', async () => {
      const res = await request(app.getHttpServer()).get('/providers?language=ru');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('doc-goa-3');
    });

    it('filters providers by specialty query param (?specialty=spec-cardio)', async () => {
      const res = await request(app.getHttpServer()).get('/providers?specialty=spec-cardio');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('hosp-hyd-1');
    });

    it('filters providers by verifiedOnly query param (?verifiedOnly=true)', async () => {
      const res = await request(app.getHttpServer()).get('/providers?verifiedOnly=true');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body.every((p: any) => p.isVerified === true)).toBe(true);
      expect(res.body.some((p: any) => p.id === 'clinic-hyd-2')).toBe(false); // clinic is unverified
    });

    it('combines multiple query parameters (?city=hyd&verifiedOnly=true)', async () => {
      const res = await request(app.getHttpServer()).get(
        '/providers?city=hyd&verifiedOnly=true',
      );

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe('hosp-hyd-1');
    });

    it('rejects invalid query parameter types with 400 Bad Request (DTO validation)', async () => {
      const res = await request(app.getHttpServer()).get(
        '/providers?verifiedOnly=not_a_boolean',
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('verifiedOnly must be a boolean')]),
      );
    });
  });

  // ─── GET /providers/:id ────────────────────────────────────────────────────

  describe('GET /providers/:id with Cost Range', () => {
    it('returns provider details with complete cost range and price entries', async () => {
      const res = await request(app.getHttpServer()).get('/providers/hosp-hyd-1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('hosp-hyd-1');
      expect(res.body.name).toBe('Apollo International Hospital');
      expect(res.body.isVerified).toBe(true);

      // Verify cost range
      expect(res.body.costRange).toEqual({
        hasData: true,
        minPrice: 80,
        maxPrice: 350,
        currency: Currency.USD,
        label: 'USD 80 - 350',
      });

      // Verify individual price entries
      expect(Array.isArray(res.body.priceEntries)).toBe(true);
      expect(res.body.priceEntries.length).toBe(2);

      const consultation = res.body.priceEntries.find(
        (pe: any) => pe.treatmentId === 'treatment-consultation',
      );
      expect(consultation).toBeDefined();
      expect(consultation.amount).toBe(80);
      expect(consultation.currency).toBe(Currency.USD);
      expect(consultation.isEstimate).toBe(false);

      const mri = res.body.priceEntries.find(
        (pe: any) => pe.treatmentId === 'treatment-mri',
      );
      expect(mri).toBeDefined();
      expect(mri.minPrice).toBe(250);
      expect(mri.maxPrice).toBe(350);
      expect(mri.isEstimate).toBe(true);
    });

    it('calculates specific treatment estimate when ?treatmentId is provided', async () => {
      const res = await request(app.getHttpServer()).get(
        '/providers/hosp-hyd-1?treatmentId=treatment-mri',
      );

      expect(res.status).toBe(200);
      expect(res.body.treatmentCostEstimate).toBeDefined();
      expect(res.body.treatmentCostEstimate).toEqual({
        hasData: true,
        treatmentId: 'treatment-mri',
        currency: Currency.USD,
        price: 300,
        minPrice: 250,
        maxPrice: 350,
        isRange: true,
        isEstimate: true,
        label: '~USD 250 - 350',
      });
    });

    it('handles provider with single fixed price formatting as single value', async () => {
      const res = await request(app.getHttpServer()).get('/providers/clinic-hyd-2');

      expect(res.status).toBe(200);
      expect(res.body.costRange).toEqual({
        hasData: true,
        minPrice: 50,
        maxPrice: 50,
        currency: Currency.USD,
        label: 'USD 50.00',
      });
    });

    it('handles provider with no pricing as hasData: false', async () => {
      const res = await request(app.getHttpServer()).get('/providers/doc-goa-3');

      expect(res.status).toBe(200);
      expect(res.body.costRange).toEqual({
        hasData: false,
        minPrice: null,
        maxPrice: null,
        currency: null,
        label: 'Price not available',
      });
      expect(res.body.priceEntries).toHaveLength(0);
    });

    it('returns 404 Not Found when provider ID does not exist', async () => {
      const res = await request(app.getHttpServer()).get('/providers/non-existent-id');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Healthcare provider with ID "non-existent-id" was not found');
    });
  });
});
