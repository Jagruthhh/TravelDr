import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProviderService,
  CaseService,
} from '../../src/services';
import {
  ProviderRepository,
  ProviderFilter,
  CaseRepository,
  CaseFilter,
} from '../../src/repositories';
import {
  HealthcareProvider,
  Hospital,
  Clinic,
  Doctor,
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  ProviderType,
} from '../../src/domain';

/**
 * In-memory implementation of ProviderRepository interface.
 * Proves that ProviderService works completely isolated from any database/Prisma.
 */
class InMemoryProviderRepository implements ProviderRepository {
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
    const res = await this.findAll(filter);
    return res.length;
  }
}

/**
 * In-memory implementation of CaseRepository interface.
 * Proves that CaseService works completely isolated from any database/Prisma.
 */
class InMemoryCaseRepository implements CaseRepository {
  private cases: Map<string, HelplineCase> = new Map();

  async findById(id: string): Promise<HelplineCase | null> {
    return this.cases.get(id) || null;
  }

  async findAll(filter?: CaseFilter): Promise<HelplineCase[]> {
    let result = Array.from(this.cases.values());

    if (filter?.travelerId) {
      result = result.filter((c) => c.getTravelerId() === filter.travelerId);
    }
    if (filter?.agentId) {
      result = result.filter((c) => c.getAgentId() === filter.agentId);
    }
    if (filter?.status) {
      result = result.filter((c) => c.getStatus() === filter.status);
    }
    if (filter?.urgency) {
      result = result.filter((c) => c.getUrgency() === filter.urgency);
    }

    return result;
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
    const res = await this.findAll(filter);
    return res.length;
  }
}

describe('Services Depend Only on Repository Interfaces', () => {
  let mockProviderRepo: InMemoryProviderRepository;
  let mockCaseRepo: InMemoryCaseRepository;
  let providerService: ProviderService;
  let caseService: CaseService;

  beforeEach(() => {
    mockProviderRepo = new InMemoryProviderRepository();
    mockCaseRepo = new InMemoryCaseRepository();

    // Instantiate services injecting strictly the interfaces
    providerService = new ProviderService(mockProviderRepo);
    caseService = new CaseService(mockCaseRepo, mockProviderRepo);
  });

  describe('ProviderService with Interface Mock', () => {
    it('registers and retrieves a provider by ID', async () => {
      const hospital = new Hospital({
        id: 'hosp-test-1',
        name: 'Apollo Jubilee Hills',
        cityId: 'city-hyd',
        address: 'Jubilee Hills, Hyderabad',
        contactNumber: '+914023607777',
        email: 'info@apollo.com',
        spokenLanguageCodes: ['en', 'te', 'hi'],
        specialtyIds: ['spec-derm', 'spec-er'],
      });

      await providerService.registerProvider(hospital);

      const retrieved = await providerService.getProviderById('hosp-test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved.getId()).toBe('hosp-test-1');
      expect(retrieved.getName()).toBe('Apollo Jubilee Hills');
      expect(retrieved.supportsLanguage('te')).toBe(true);
      expect(retrieved).toBeInstanceOf(Hospital);
    });

    it('throws NotFoundException when provider does not exist', async () => {
      await expect(providerService.getProviderById('non-existent')).rejects.toThrow(
        'Healthcare provider with ID "non-existent" was not found',
      );
    });

    it('filters providers by language and specialty using repository interface', async () => {
      const clinic = new Clinic({
        id: 'clinic-1',
        name: 'Skin Care Madhapur',
        cityId: 'city-hyd',
        address: 'Madhapur',
        contactNumber: '+9140123456',
        email: 'info@skincare.com',
        spokenLanguageCodes: ['en', 'te'],
        specialtyIds: ['spec-derm'],
      });

      const doctor = new Doctor({
        id: 'doc-1',
        name: 'Dr. Vikram',
        cityId: 'city-goa',
        address: 'Panaji',
        contactNumber: '+9198220000',
        email: 'vikram@doc.com',
        medicalLicenseNumber: 'GOA-1234',
        spokenLanguageCodes: ['en', 'ru', 'kok'],
        specialtyIds: ['spec-gp'],
      });

      await providerService.registerProvider(clinic);
      await providerService.registerProvider(doctor);

      const hydProviders = await providerService.searchProviders({ cityId: 'city-hyd' });
      expect(hydProviders.length).toBe(1);
      expect(hydProviders[0].getId()).toBe('clinic-1');

      const russianSpeakers = await providerService.getProvidersByLanguage('ru');
      expect(russianSpeakers.length).toBe(1);
      expect(russianSpeakers[0].getId()).toBe('doc-1');
    });
  });

  describe('CaseService with Interface Mocks', () => {
    it('creates, assigns, recommends, and resolves a helpline case', async () => {
      // 1. Prepare a mock provider to recommend
      const clinic = new Clinic({
        id: 'clinic-rec-1',
        name: 'Goa Coastal Emergency Clinic',
        cityId: 'city-goa',
        address: 'Calangute',
        contactNumber: '+918321111',
        email: 'goa@clinic.com',
      });
      await mockProviderRepo.save(clinic);

      // 2. Create case
      const createdCase = await caseService.createCase({
        id: 'case-test-1',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Severe sunburn and tropical allergic reaction',
        initialDescription: 'Traveler needs urgent dermatologist near Calangute',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.URGENT,
      });

      expect(createdCase.getStatus()).toBe(HelplineCaseStatus.NEW);
      expect(createdCase.getUrgency()).toBe(HelplineUrgency.URGENT);

      // 3. Assign to agent
      const assigned = await caseService.assignCase('case-test-1', 'agent-99');
      expect(assigned.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      expect(assigned.getAgentId()).toBe('agent-99');

      // 4. Recommend provider
      const recommended = await caseService.recommendProvider(
        'case-test-1',
        'clinic-rec-1',
        'Direct consultation booked at Goa Coastal Clinic',
      );
      expect(recommended.getStatus()).toBe(HelplineCaseStatus.RECOMMENDED);
      expect(recommended.getRecommendedProviderId()).toBe('clinic-rec-1');

      // 5. Escalate urgency
      const escalated = await caseService.escalateCase('case-test-1', HelplineUrgency.EMERGENCY);
      expect(escalated.getUrgency()).toBe(HelplineUrgency.EMERGENCY);

      // 6. Resolve case
      const resolved = await caseService.resolveCase(
        'case-test-1',
        'Patient received emergency antihistamine treatment and recovered.',
      );
      expect(resolved.getStatus()).toBe(HelplineCaseStatus.RESOLVED);
      expect(resolved.getResolutionSummary()).toContain('Patient received emergency');
    });

    it('throws NotFoundException when recommending a provider that does not exist', async () => {
      await caseService.createCase({
        id: 'case-test-2',
        travelerId: 'trav-1',
        cityId: 'city-hyd',
        subject: 'Inquiry',
        initialDescription: 'Looking for doctor',
        preferredLanguageCode: 'en',
      });
      await caseService.assignCase('case-test-2', 'agent-1');

      await expect(
        caseService.recommendProvider('case-test-2', 'missing-provider-id'),
      ).rejects.toThrow('Healthcare provider with ID "missing-provider-id" was not found');
    });

    it('throws NotFoundException when loading non-existent case', async () => {
      await expect(caseService.getCaseById('non-existent-case')).rejects.toThrow(
        'Helpline case with ID "non-existent-case" was not found',
      );
    });
  });
});
