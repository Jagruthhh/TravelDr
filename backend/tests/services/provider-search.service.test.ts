import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProviderSearchService,
  NearestRanking,
  RankingStrategy,
  RankingContext,
} from '../../src/services';
import {
  ProviderRepository,
  ProviderFilter,
} from '../../src/repositories';
import {
  HealthcareProvider,
  Hospital,
  Clinic,
  Doctor,
  VerificationRecord,
  VerificationStatus,
} from '../../src/domain';

/**
 * Mock ProviderRepository implementation for unit testing.
 */
class MockProviderRepository implements ProviderRepository {
  public providers: HealthcareProvider[] = [];

  async findById(id: string): Promise<HealthcareProvider | null> {
    return this.providers.find((p) => p.getId() === id) || null;
  }

  async findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    let result = [...this.providers];

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
    const idx = this.providers.findIndex((p) => p.getId() === provider.getId());
    if (idx >= 0) {
      this.providers[idx] = provider;
    } else {
      this.providers.push(provider);
    }
  }

  async delete(id: string): Promise<void> {
    this.providers = this.providers.filter((p) => p.getId() !== id);
  }

  async count(filter?: ProviderFilter): Promise<number> {
    const res = await this.findAll(filter);
    return res.length;
  }
}

describe('ProviderSearchService with NearestRanking Strategy', () => {
  let mockRepo: MockProviderRepository;
  let searchService: ProviderSearchService;

  // Sample Providers
  let verifiedHydHospital: Hospital;
  let verifiedHydClinic: Clinic;
  let pendingHydDoctor: Doctor;
  let verifiedGoaClinic: Clinic;
  let unverifiedGoaHospital: Hospital;

  beforeEach(() => {
    mockRepo = new MockProviderRepository();
    searchService = new ProviderSearchService(mockRepo);

    // 1. Verified Hospital in Hyderabad (Dermatology, Emergency)
    verifiedHydHospital = new Hospital({
      id: 'prov-hyd-hosp-1',
      name: 'Apollo Jubilee Hills',
      cityId: 'hyd',
      address: 'Road No 72, Jubilee Hills',
      contactNumber: '+914023607777',
      email: 'apollo@hyd.com',
      spokenLanguageCodes: ['en', 'te', 'hi'],
      specialtyIds: ['spec-derm', 'spec-er'],
      verificationRecord: new VerificationRecord({
        id: 'vr-1',
        providerId: 'prov-hyd-hosp-1',
        licenseDocumentUrl: 'https://docs.com/apollo.pdf',
        status: VerificationStatus.VERIFIED,
        expiresAt: new Date(Date.now() + 86400000 * 365),
      }),
    });

    // 2. Verified Clinic in Hyderabad (Dermatology only)
    verifiedHydClinic = new Clinic({
      id: 'prov-hyd-clinic-1',
      name: 'DermaCare Madhapur',
      cityId: 'hyd',
      address: 'Hitec City, Madhapur',
      contactNumber: '+914040123456',
      email: 'dermacare@hyd.com',
      spokenLanguageCodes: ['en', 'te'],
      specialtyIds: ['spec-derm'],
      verificationRecord: new VerificationRecord({
        id: 'vr-2',
        providerId: 'prov-hyd-clinic-1',
        licenseDocumentUrl: 'https://docs.com/dermacare.pdf',
        status: VerificationStatus.VERIFIED,
        expiresAt: new Date(Date.now() + 86400000 * 180),
      }),
    });

    // 3. Pending Doctor in Hyderabad (Dermatology)
    pendingHydDoctor = new Doctor({
      id: 'prov-hyd-doc-1',
      name: 'Dr. Ananya Reddy',
      cityId: 'hyd',
      address: 'Banjara Hills',
      contactNumber: '+919440112233',
      email: 'ananya@hyd.com',
      medicalLicenseNumber: 'TS-MC-2016',
      spokenLanguageCodes: ['en', 'te', 'hi'],
      specialtyIds: ['spec-derm'],
      verificationRecord: new VerificationRecord({
        id: 'vr-3',
        providerId: 'prov-hyd-doc-1',
        licenseDocumentUrl: 'https://docs.com/ananya.pdf',
        status: VerificationStatus.PENDING,
      }),
    });

    // 4. Verified Clinic in Goa (Dermatology, Russian speaking)
    verifiedGoaClinic = new Clinic({
      id: 'prov-goa-clinic-1',
      name: 'Candolim Skin Health Clinic',
      cityId: 'goa',
      address: 'Candolim Beach Road',
      contactNumber: '+918322489111',
      email: 'candolim@goa.com',
      spokenLanguageCodes: ['en', 'ru', 'kok'],
      specialtyIds: ['spec-derm', 'spec-gp'],
      verificationRecord: new VerificationRecord({
        id: 'vr-4',
        providerId: 'prov-goa-clinic-1',
        licenseDocumentUrl: 'https://docs.com/candolim.pdf',
        status: VerificationStatus.VERIFIED,
        expiresAt: new Date(Date.now() + 86400000 * 200),
      }),
    });

    // 5. Unverified Hospital in Goa (Emergency only)
    unverifiedGoaHospital = new Hospital({
      id: 'prov-goa-hosp-1',
      name: 'Goa District Hospital',
      cityId: 'goa',
      address: 'Mapusa, Goa',
      contactNumber: '+918322255000',
      email: 'district@goa.com',
      spokenLanguageCodes: ['en', 'kok'],
      specialtyIds: ['spec-er'],
    });

    mockRepo.providers = [
      verifiedHydHospital,
      verifiedHydClinic,
      pendingHydDoctor,
      verifiedGoaClinic,
      unverifiedGoaHospital,
    ];
  });

  describe('Search Filtering: search(city, language, specialty, verifiedOnly)', () => {
    it('filters by city correctly', async () => {
      const hydResults = await searchService.search('hyd');
      expect(hydResults.length).toBe(3);
      expect(hydResults.map((p) => p.getId())).toEqual([
        'prov-hyd-hosp-1',
        'prov-hyd-clinic-1',
        'prov-hyd-doc-1',
      ]);

      const goaResults = await searchService.search('goa');
      expect(goaResults.length).toBe(2);
      expect(goaResults.map((p) => p.getId())).toEqual([
        'prov-goa-clinic-1',
        'prov-goa-hosp-1',
      ]);
    });

    it('filters by language correctly', async () => {
      const russianProviders = await searchService.search(undefined, 'ru');
      expect(russianProviders.length).toBe(1);
      expect(russianProviders[0].getId()).toBe('prov-goa-clinic-1');

      const hindiProviders = await searchService.search(undefined, 'hi');
      expect(hindiProviders.length).toBe(2);
      expect(hindiProviders.map((p) => p.getId())).toContain('prov-hyd-hosp-1');
      expect(hindiProviders.map((p) => p.getId())).toContain('prov-hyd-doc-1');
    });

    it('filters by specialty correctly', async () => {
      const erProviders = await searchService.search(undefined, undefined, 'spec-er');
      expect(erProviders.length).toBe(2);
      expect(erProviders.map((p) => p.getId())).toEqual([
        'prov-hyd-hosp-1',
        'prov-goa-hosp-1',
      ]);
    });

    it('filters by verifiedOnly correctly', async () => {
      // verifiedOnly = true: only 3 verified providers across all cities
      const verifiedResults = await searchService.search(
        undefined,
        undefined,
        undefined,
        true,
      );
      expect(verifiedResults.length).toBe(3);
      expect(verifiedResults.every((p) => p.isVerified())).toBe(true);

      // verifiedOnly = false: returns all 5 providers
      const allResults = await searchService.search(
        undefined,
        undefined,
        undefined,
        false,
      );
      expect(allResults.length).toBe(5);
    });

    it('combines all 4 filters: city, language, specialty, verifiedOnly', async () => {
      // In Hyderabad, speaking Hindi, Dermatology specialty, only verified
      const results = await searchService.search(
        'hyd',
        'hi',
        'spec-derm',
        true,
      );
      // pendingHydDoctor has 'hi' and 'spec-derm' but is NOT verified
      // verifiedHydClinic is verified with 'spec-derm' but does NOT speak 'hi'
      // verifiedHydHospital has 'hi', 'spec-derm', and is verified!
      expect(results.length).toBe(1);
      expect(results[0].getId()).toBe('prov-hyd-hosp-1');
      expect(results[0].getName()).toBe('Apollo Jubilee Hills');
    });

    it('supports object parameters format search({ city, language, specialty, verifiedOnly })', async () => {
      const results = await searchService.search({
        city: 'goa',
        language: 'ru',
        specialty: 'spec-derm',
        verifiedOnly: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].getId()).toBe('prov-goa-clinic-1');
    });

    it('returns empty array when no providers match criteria', async () => {
      const results = await searchService.search('hyd', 'ru', 'spec-er', true);
      expect(results).toEqual([]);
    });
  });

  describe('NearestRanking Strategy', () => {
    it('ranks providers by ascending distance using providerDistances map', async () => {
      const context: RankingContext = {
        providerDistances: new Map([
          ['prov-hyd-hosp-1', 12.5], // Apollo (12.5 km)
          ['prov-hyd-clinic-1', 2.1], // DermaCare (2.1 km) - closest!
          ['prov-hyd-doc-1', 5.8], // Dr. Ananya (5.8 km)
        ]),
      };

      const results = await searchService.search(
        'hyd',
        undefined,
        undefined,
        false,
        context,
      );

      expect(results.length).toBe(3);
      // Expected order: DermaCare (2.1km) -> Dr. Ananya (5.8km) -> Apollo (12.5km)
      expect(results[0].getId()).toBe('prov-hyd-clinic-1');
      expect(results[1].getId()).toBe('prov-hyd-doc-1');
      expect(results[2].getId()).toBe('prov-hyd-hosp-1');
    });

    it('ranks providers by geographic coordinates using Haversine formula', async () => {
      // Traveler is located in Hitec City, Hyderabad: 17.4474° N, 78.3762° E
      const userLocation = { latitude: 17.4474, longitude: 78.3762 };

      // Provider locations:
      // DermaCare Madhapur: ~1.5 km away (17.4485, 78.3900)
      // Jubilee Hills Apollo: ~5.6 km away (17.4265, 78.4110)
      // Banjara Hills Doctor: ~8.2 km away (17.4150, 78.4480)
      const providerLocations = new Map([
        ['prov-hyd-clinic-1', { latitude: 17.4485, longitude: 78.3900 }],
        ['prov-hyd-hosp-1', { latitude: 17.4265, longitude: 78.4110 }],
        ['prov-hyd-doc-1', { latitude: 17.4150, longitude: 78.4480 }],
      ]);

      const results = await searchService.search(
        'hyd',
        undefined,
        undefined,
        false,
        {
          userLocation,
          providerLocations,
        },
      );

      expect(results.length).toBe(3);
      expect(results[0].getId()).toBe('prov-hyd-clinic-1'); // closest to Hitec City
      expect(results[1].getId()).toBe('prov-hyd-hosp-1');
      expect(results[2].getId()).toBe('prov-hyd-doc-1'); // farthest
    });

    it('places providers with known distances before providers with unknown distances', async () => {
      const context: RankingContext = {
        providerDistances: {
          'prov-hyd-hosp-1': 10.0,
          // 'prov-hyd-clinic-1' is not in distance map (undefined)
          'prov-hyd-doc-1': 3.0,
        },
      };

      const results = await searchService.search(
        'hyd',
        undefined,
        undefined,
        false,
        context,
      );

      expect(results[0].getId()).toBe('prov-hyd-doc-1'); // 3.0 km
      expect(results[1].getId()).toBe('prov-hyd-hosp-1'); // 10.0 km
      expect(results[2].getId()).toBe('prov-hyd-clinic-1'); // undefined distance at end
    });

    it('calculates accurate Haversine distance in NearestRanking instance', () => {
      const nearestRanking = new NearestRanking();
      // Distance between Hyderabad (17.3850, 78.4867) and Mumbai (19.0760, 72.8777) ~620 km
      const distance = nearestRanking.haversineDistance(
        { latitude: 17.385, longitude: 78.4867 },
        { latitude: 19.076, longitude: 72.8777 },
      );

      expect(distance).toBeGreaterThan(600);
      expect(distance).toBeLessThan(650);
    });
  });

  describe('Strategy Pattern Swapping', () => {
    it('allows changing ranking strategy via setRankingStrategy', async () => {
      // Mock custom reverse rating ranking strategy
      class RatingDescendingRanking implements RankingStrategy {
        rank(providers: HealthcareProvider[]): HealthcareProvider[] {
          return [...providers].sort(
            (a, b) => b.getAverageRating() - a.getAverageRating(),
          );
        }
      }

      // Record ratings on sample providers
      verifiedHydClinic.recordReview(5); // average 5
      verifiedHydHospital.recordReview(3); // average 3

      searchService.setRankingStrategy(new RatingDescendingRanking());
      expect(searchService.getRankingStrategy()).toBeInstanceOf(
        RatingDescendingRanking,
      );

      const ranked = await searchService.search('hyd', undefined, undefined, true);
      expect(ranked.length).toBe(2);
      expect(ranked[0].getId()).toBe('prov-hyd-clinic-1'); // highest rated first
      expect(ranked[1].getId()).toBe('prov-hyd-hosp-1');
    });
  });
});
