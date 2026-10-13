import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CostEstimator } from '../../src/services';
import { ProviderRepository, ProviderFilter } from '../../src/repositories';
import {
  HealthcareProvider,
  Hospital,
  Clinic,
  Doctor,
  PriceEntry,
  CostEstimate,
  Currency,
  ProviderType,
} from '../../src/domain';

/**
 * In-memory Mock ProviderRepository implementation for unit testing.
 */
class MockProviderRepository implements ProviderRepository {
  private providers: Map<string, HealthcareProvider> = new Map();

  async findById(id: string): Promise<HealthcareProvider | null> {
    return this.providers.get(id) || null;
  }

  async findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    let result = Array.from(this.providers.values());
    if (filter?.cityId) {
      result = result.filter((p) => p.getCityId() === filter.cityId);
    }
    if (filter?.isVerified !== undefined) {
      result = result.filter((p) => p.isVerified() === filter.isVerified);
    }
    if (filter?.languageCode) {
      result = result.filter((p) => p.supportsLanguage(filter.languageCode!));
    }
    if (filter?.specialtyId) {
      result = result.filter((p) => p.getSpecialtyIds().includes(filter.specialtyId!));
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
}

describe('CostEstimator', () => {
  let mockRepo: MockProviderRepository;
  let estimator: CostEstimator;

  // Sample Providers
  let hospital: Hospital;
  let clinic: Clinic;
  let doctor: Doctor;

  const TREATMENT_CONSULTATION = 'treatment-consultation';
  const TREATMENT_DENTAL_CLEANING = 'treatment-dental-cleaning';
  const TREATMENT_MRI = 'treatment-mri';
  const TREATMENT_UNKNOWN = 'treatment-unknown';

  beforeEach(() => {
    mockRepo = new MockProviderRepository();
    estimator = new CostEstimator(mockRepo);
    CostEstimator.setDefaultRepository(undefined);

    // 1. Hospital with fixed and range pricing
    hospital = new Hospital({
      id: 'hosp-101',
      name: 'Apollo International Hospital',
      cityId: 'hyd',
      address: 'Jubilee Hills, Hyderabad',
      contactNumber: '+91-40-23607777',
      email: 'info@apollo-hyd.com',
      emergencyServices: true,
      bedCount: 500,
    });

    // Current fixed price
    hospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-1',
        providerId: 'hosp-101',
        treatmentId: TREATMENT_CONSULTATION,
        amount: 80,
        currency: Currency.USD,
        isEstimate: false,
      }),
    );

    // Current range estimate
    hospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-2',
        providerId: 'hosp-101',
        treatmentId: TREATMENT_MRI,
        amount: 300,
        currency: Currency.USD,
        minAmount: 250,
        maxAmount: 350,
        isEstimate: true,
      }),
    );

    // Expired price entry
    hospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-expired',
        providerId: 'hosp-101',
        treatmentId: 'treatment-expired-promo',
        amount: 40,
        currency: Currency.USD,
        effectiveFrom: new Date(Date.now() - 30 * 86_400_000),
        effectiveUntil: new Date(Date.now() - 5 * 86_400_000), // Expired 5 days ago
      }),
    );

    // Future-dated price entry
    hospital.addPriceEntry(
      new PriceEntry({
        id: 'pe-hosp-future',
        providerId: 'hosp-101',
        treatmentId: 'treatment-future-tariff',
        amount: 120,
        currency: Currency.USD,
        effectiveFrom: new Date(Date.now() + 10 * 86_400_000), // Effective 10 days in future
      }),
    );

    // 2. Clinic with dental cleaning
    clinic = new Clinic({
      id: 'clinic-202',
      name: 'Goa Coastal Dental Clinic',
      cityId: 'goa',
      address: 'Calangute, Goa',
      contactNumber: '+91-832-2277889',
      email: 'care@goadental.com',
      appointmentOnly: false,
    });

    clinic.addPriceEntry(
      new PriceEntry({
        id: 'pe-clinic-1',
        providerId: 'clinic-202',
        treatmentId: TREATMENT_DENTAL_CLEANING,
        amount: 45,
        currency: Currency.EUR,
        isEstimate: false,
      }),
    );

    // 3. Doctor with no price entries
    doctor = new Doctor({
      id: 'doc-303',
      name: 'Dr. Sarah Matthews',
      cityId: 'hyd',
      address: 'Banjara Hills, Hyderabad',
      contactNumber: '+91-9876543210',
      email: 'dr.sarah@gmail.com',
      medicalLicenseNumber: 'MCI-2015-8899',
      yearsOfExperience: 12,
    });

    mockRepo.save(hospital);
    mockRepo.save(clinic);
    mockRepo.save(doctor);
  });

  afterEach(() => {
    CostEstimator.setDefaultRepository(undefined);
  });

  describe('estimate(providerId, treatmentId) with valid price data', () => {
    it('returns a fixed price CostEstimate when exact price exists', async () => {
      const estimate = await estimator.estimate('hosp-101', TREATMENT_CONSULTATION);

      expect(estimate).toBeInstanceOf(CostEstimate);
      expect(estimate.hasData).toBe(true);
      expect(estimate.data.hasData).toBe(true);

      if (estimate.data.hasData) {
        expect(estimate.data.treatmentId).toBe(TREATMENT_CONSULTATION);
        expect(estimate.data.currency).toBe(Currency.USD);
        expect(estimate.data.price).toBe(80);
        expect(estimate.data.minPrice).toBe(80);
        expect(estimate.data.maxPrice).toBe(80);
        expect(estimate.data.isRange).toBe(false);
        expect(estimate.data.isEstimate).toBe(false);
        expect(estimate.data.label).toBe('USD 80.00');
      }
    });

    it('returns a range CostEstimate when min/max prices exist', async () => {
      const estimate = await estimator.estimate('hosp-101', TREATMENT_MRI);

      expect(estimate.hasData).toBe(true);
      expect(estimate.data.hasData).toBe(true);

      if (estimate.data.hasData) {
        expect(estimate.data.treatmentId).toBe(TREATMENT_MRI);
        expect(estimate.data.currency).toBe(Currency.USD);
        expect(estimate.data.price).toBe(300);
        expect(estimate.data.minPrice).toBe(250);
        expect(estimate.data.maxPrice).toBe(350);
        expect(estimate.data.isRange).toBe(true);
        expect(estimate.data.isEstimate).toBe(true);
        expect(estimate.data.label).toBe('~USD 250 - 350');
      }
    });

    it('returns the most recently effective price when multiple current entries exist', async () => {
      const specializedClinic = new Clinic({
        id: 'clinic-multi-prices',
        name: 'Multi Price Clinic',
        cityId: 'goa',
        address: 'Panaji, Goa',
        contactNumber: '+91-832-1234567',
        email: 'multiprice@clinic.com',
      });

      const olderEntry = new PriceEntry({
        id: 'pe-clinic-older',
        providerId: 'clinic-multi-prices',
        treatmentId: 'treatment-multi-test',
        amount: 35,
        currency: Currency.EUR,
        effectiveFrom: new Date(Date.now() - 60 * 86_400_000),
      });
      const newerEntry = new PriceEntry({
        id: 'pe-clinic-newer',
        providerId: 'clinic-multi-prices',
        treatmentId: 'treatment-multi-test',
        amount: 55,
        currency: Currency.EUR,
        effectiveFrom: new Date(Date.now() - 5 * 86_400_000),
      });

      specializedClinic.addPriceEntry(olderEntry);
      specializedClinic.addPriceEntry(newerEntry);
      await mockRepo.save(specializedClinic);

      const estimate = await estimator.estimate('clinic-multi-prices', 'treatment-multi-test');
      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.price).toBe(55);
        expect(estimate.data.label).toBe('EUR 55.00');
      }
    });
  });

  describe('handling "no price data" cases', () => {
    it('returns CostEstimate.noData() when provider has no price for the treatment', async () => {
      const estimate = await estimator.estimate('hosp-101', TREATMENT_UNKNOWN);

      expect(estimate).toBeInstanceOf(CostEstimate);
      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when provider has empty price list', async () => {
      const estimate = await estimator.estimate('doc-303', TREATMENT_CONSULTATION);

      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when price entry has expired', async () => {
      const estimate = await estimator.estimate('hosp-101', 'treatment-expired-promo');

      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when price entry is future-dated', async () => {
      const estimate = await estimator.estimate('hosp-101', 'treatment-future-tariff');

      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when provider ID does not exist in repository', async () => {
      const estimate = await estimator.estimate('non-existent-provider', TREATMENT_CONSULTATION);

      expect(estimate).toBeInstanceOf(CostEstimate);
      expect(estimate.hasData).toBe(false);
      expect(estimate.data.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when providerId is empty or whitespace', async () => {
      const emptyEstimate = await estimator.estimate('', TREATMENT_CONSULTATION);
      const whitespaceEstimate = await estimator.estimate('   ', TREATMENT_CONSULTATION);

      expect(emptyEstimate.hasData).toBe(false);
      expect(whitespaceEstimate.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when providerId is null or undefined', async () => {
      const nullEstimate = await estimator.estimate(null as any, TREATMENT_CONSULTATION);
      const undefEstimate = await estimator.estimate(undefined as any, TREATMENT_CONSULTATION);

      expect(nullEstimate.hasData).toBe(false);
      expect(undefEstimate.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when treatmentId is empty or whitespace', async () => {
      const emptyEstimate = await estimator.estimate('hosp-101', '');
      const whitespaceEstimate = await estimator.estimate('hosp-101', '   ');

      expect(emptyEstimate.hasData).toBe(false);
      expect(whitespaceEstimate.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when provider is inactive', async () => {
      const inactiveHospital = new Hospital({
        id: 'hosp-inactive',
        name: 'Closed Medical Center',
        cityId: 'hyd',
        address: 'Old Town, Hyderabad',
        contactNumber: '+91-40-11112222',
        email: 'closed@hospital.com',
        isActive: false,
      });

      inactiveHospital.addPriceEntry(
        new PriceEntry({
          id: 'pe-inactive',
          providerId: 'hosp-inactive',
          treatmentId: TREATMENT_CONSULTATION,
          amount: 50,
          currency: Currency.USD,
        }),
      );
      await mockRepo.save(inactiveHospital);

      const estimate = await estimator.estimate('hosp-inactive', TREATMENT_CONSULTATION);
      expect(estimate.hasData).toBe(false);
    });

    it('returns CostEstimate.noData() when no repository is available to lookup provider string ID', async () => {
      const unconfiguredEstimator = new CostEstimator();
      const estimate = await unconfiguredEstimator.estimate('hosp-101', TREATMENT_CONSULTATION);

      expect(estimate.hasData).toBe(false);
    });
  });

  describe('direct HealthcareProvider entity estimation', () => {
    it('estimates price directly when given a HealthcareProvider entity', async () => {
      const estimate = await estimator.estimate(hospital, TREATMENT_CONSULTATION);

      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.price).toBe(80);
      }
    });

    it('returns noData when given a HealthcareProvider entity without that treatment', async () => {
      const estimate = await estimator.estimate(doctor, TREATMENT_CONSULTATION);

      expect(estimate.hasData).toBe(false);
    });
  });

  describe('static CostEstimator.estimate()', () => {
    it('synchronously estimates when given a HealthcareProvider entity', () => {
      const estimate = CostEstimator.estimate(hospital, TREATMENT_CONSULTATION);

      expect(estimate).toBeInstanceOf(CostEstimate);
      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.price).toBe(80);
      }
    });

    it('synchronously returns noData when given a HealthcareProvider entity without price', () => {
      const estimate = CostEstimator.estimate(doctor, TREATMENT_CONSULTATION);

      expect(estimate.hasData).toBe(false);
    });

    it('synchronously returns noData when given null or invalid parameters', () => {
      const estimateNull = CostEstimator.estimate(null as any, TREATMENT_CONSULTATION);
      const estimateBlank = CostEstimator.estimate(hospital, '  ');

      expect(estimateNull.hasData).toBe(false);
      expect(estimateBlank.hasData).toBe(false);
    });

    it('asynchronously estimates when given a provider ID and explicit repository', async () => {
      const estimate = await CostEstimator.estimate('hosp-101', TREATMENT_CONSULTATION, mockRepo);

      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.price).toBe(80);
      }
    });

    it('asynchronously returns noData when provider ID does not exist in explicit repository', async () => {
      const estimate = await CostEstimator.estimate('non-existent', TREATMENT_CONSULTATION, mockRepo);

      expect(estimate.hasData).toBe(false);
    });

    it('uses static default repository when configured', async () => {
      CostEstimator.setDefaultRepository(mockRepo);

      const estimate = await CostEstimator.estimate('clinic-202', TREATMENT_DENTAL_CLEANING);
      expect(estimate.hasData).toBe(true);
      if (estimate.data.hasData) {
        expect(estimate.data.price).toBe(45);
      }
    });
  });

  describe('hasPriceData() helper method', () => {
    it('returns true when valid price data exists', async () => {
      const hasPrice = await estimator.hasPriceData('hosp-101', TREATMENT_CONSULTATION);
      expect(hasPrice).toBe(true);
    });

    it('returns false when no price data exists', async () => {
      const hasPrice = await estimator.hasPriceData('hosp-101', TREATMENT_UNKNOWN);
      expect(hasPrice).toBe(false);
    });

    it('returns false for expired prices', async () => {
      const hasPrice = await estimator.hasPriceData('hosp-101', 'treatment-expired-promo');
      expect(hasPrice).toBe(false);
    });

    it('works directly with a HealthcareProvider entity', async () => {
      expect(await estimator.hasPriceData(hospital, TREATMENT_CONSULTATION)).toBe(true);
      expect(await estimator.hasPriceData(doctor, TREATMENT_CONSULTATION)).toBe(false);
    });
  });
});
