import { describe, it, expect, beforeEach } from 'vitest';
import { HelplineService } from '../../src/services';
import {
  CaseRepository,
  CaseFilter,
  ProviderRepository,
  ProviderFilter,
  AgentRepository,
  AgentFilter,
} from '../../src/repositories';
import {
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  HelplineCasePriority,
  HelplineAgent,
  HealthcareProvider,
  Hospital,
  Clinic,
} from '../../src/domain';

/**
 * Mock CaseRepository implementation for unit testing.
 */
class MockCaseRepository implements CaseRepository {
  public cases: Map<string, HelplineCase> = new Map();

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
    const list = await this.findAll(filter);
    return list.length;
  }
}

/**
 * Mock ProviderRepository implementation for recommendations.
 */
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
}

/**
 * Mock AgentRepository implementation.
 */
class MockAgentRepository implements AgentRepository {
  public agents: Map<string, HelplineAgent> = new Map();

  async findById(id: string): Promise<HelplineAgent | null> {
    return this.agents.get(id) || null;
  }

  async findAll(filter?: AgentFilter): Promise<HelplineAgent[]> {
    let result = Array.from(this.agents.values());
    if (filter?.isAvailableForDuty !== undefined) {
      result = result.filter(
        (a) => a.getIsAvailableForDuty() === filter.isAvailableForDuty,
      );
    }
    if (filter?.languageCode) {
      result = result.filter((a) =>
        a.getSpokenLanguages().includes(filter.languageCode!.toLowerCase()),
      );
    }
    return result;
  }

  async findAvailable(languageCode?: string): Promise<HelplineAgent[]> {
    return Array.from(this.agents.values()).filter((a) =>
      a.canTakeCase(languageCode),
    );
  }

  async save(agent: HelplineAgent): Promise<void> {
    this.agents.set(agent.getId(), agent);
  }

  async delete(id: string): Promise<void> {
    this.agents.delete(id);
  }
}

describe('HelplineService', () => {
  let mockCaseRepo: MockCaseRepository;
  let mockProviderRepo: MockProviderRepository;
  let mockAgentRepo: MockAgentRepository;
  let helplineService: HelplineService;

  // Sample Agents
  let agentEnglishSpanish: HelplineAgent;
  let agentEnglishHindi: HelplineAgent;
  let agentBusyEnglish: HelplineAgent;
  let agentOffDuty: HelplineAgent;

  // Sample Provider
  let sampleHospital: Hospital;

  beforeEach(() => {
    mockCaseRepo = new MockCaseRepository();
    mockProviderRepo = new MockProviderRepository();
    mockAgentRepo = new MockAgentRepository();

    // Agent 1: Speaks English & Spanish, 1 active case, max 5
    agentEnglishSpanish = new HelplineAgent({
      id: 'agent-en-es',
      email: 'maria@fixmyitch.com',
      fullName: 'Maria Rodriguez',
      phoneNumber: '+1-555-0101',
      spokenLanguages: ['en', 'es'],
      isAvailableForDuty: true,
      currentActiveCases: 1,
      maxConcurrentCases: 5,
    });

    // Agent 2: Speaks English & Hindi, 0 active cases, max 5 (least busy!)
    agentEnglishHindi = new HelplineAgent({
      id: 'agent-en-hi',
      email: 'raj@fixmyitch.com',
      fullName: 'Raj Patel',
      phoneNumber: '+91-9876-0102',
      spokenLanguages: ['en', 'hi'],
      isAvailableForDuty: true,
      currentActiveCases: 0,
      maxConcurrentCases: 5,
    });

    // Agent 3: Speaks English, at max capacity (5/5)
    agentBusyEnglish = new HelplineAgent({
      id: 'agent-busy',
      email: 'busy@fixmyitch.com',
      fullName: 'Busy Bob',
      phoneNumber: '+1-555-0103',
      spokenLanguages: ['en'],
      isAvailableForDuty: true,
      currentActiveCases: 5,
      maxConcurrentCases: 5,
    });

    // Agent 4: Speaks French, off duty
    agentOffDuty = new HelplineAgent({
      id: 'agent-off-duty',
      email: 'claire@fixmyitch.com',
      fullName: 'Claire Dupont',
      phoneNumber: '+33-6-0104',
      spokenLanguages: ['fr'],
      isAvailableForDuty: false,
      currentActiveCases: 0,
      maxConcurrentCases: 5,
    });

    mockAgentRepo.save(agentEnglishSpanish);
    mockAgentRepo.save(agentEnglishHindi);
    mockAgentRepo.save(agentBusyEnglish);
    mockAgentRepo.save(agentOffDuty);

    sampleHospital = new Hospital({
      id: 'hosp-emergency-1',
      name: 'Goa Medical College & Hospital',
      cityId: 'city-goa',
      address: 'Bambolim, Goa',
      contactNumber: '+91-832-2458725',
      email: 'emergency@gmc.gov.in',
      emergencyServices: true,
    });
    mockProviderRepo.save(sampleHospital);

    helplineService = new HelplineService(
      mockCaseRepo,
      mockProviderRepo,
      mockAgentRepo,
    );
  });

  describe('createCase', () => {
    it('creates a new case in NEW status with valid properties', async () => {
      const helplineCase = await helplineService.createCase({
        id: 'case-001',
        travelerId: 'trav-10',
        cityId: 'city-goa',
        subject: 'Severe allergic skin rash after swimming',
        initialDescription: 'Traveler broke out in hives and needs urgent clinic',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.URGENT,
      });

      expect(helplineCase).toBeInstanceOf(HelplineCase);
      expect(helplineCase.getId()).toBe('case-001');
      expect(helplineCase.getStatus()).toBe(HelplineCaseStatus.NEW);
      expect(helplineCase.getUrgency()).toBe(HelplineUrgency.URGENT);
      expect(helplineCase.getPriority()).toBe(HelplineCasePriority.HIGH);
      expect(helplineCase.getAgentId()).toBeUndefined();

      const saved = await mockCaseRepo.findById('case-001');
      expect(saved).toBeDefined();
      expect(saved?.getId()).toBe('case-001');
    });

    it('auto-generates an ID if not explicitly provided', async () => {
      const helplineCase = await helplineService.createCase({
        travelerId: 'trav-10',
        cityId: 'city-goa',
        subject: 'General medical inquiry',
        initialDescription: 'Looking for a general practitioner',
        preferredLanguageCode: 'en',
      });

      expect(helplineCase.getId()).toBeDefined();
      expect(helplineCase.getId().length).toBeGreaterThan(0);
      expect(helplineCase.getStatus()).toBe(HelplineCaseStatus.NEW);
    });

    it('auto-picks and assigns an available agent when autoAssign is true', async () => {
      const helplineCase = await helplineService.createCase({
        id: 'case-auto-1',
        travelerId: 'trav-10',
        cityId: 'city-goa',
        subject: 'Emergency spider bite',
        initialDescription: 'Bitten by unknown spider',
        preferredLanguageCode: 'en',
        urgency: HelplineUrgency.EMERGENCY,
        autoAssign: true,
      });

      expect(helplineCase.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      // agentEnglishHindi had 0 active cases, so they should be picked first over agentEnglishSpanish (1 active)
      expect(helplineCase.getAgentId()).toBe('agent-en-hi');

      // Check agent load was incremented
      const updatedAgent = await mockAgentRepo.findById('agent-en-hi');
      expect(updatedAgent?.getCurrentActiveCases()).toBe(1);
    });

    it('leaves case in NEW status if autoAssign is true but no agent is available for that language', async () => {
      const helplineCase = await helplineService.createCase({
        id: 'case-no-agent',
        travelerId: 'trav-10',
        cityId: 'city-goa',
        subject: 'Japanese language support required',
        initialDescription: 'Traveler only speaks Japanese',
        preferredLanguageCode: 'ja',
        autoAssign: true,
      });

      expect(helplineCase.getStatus()).toBe(HelplineCaseStatus.NEW);
      expect(helplineCase.getAgentId()).toBeUndefined();
    });
  });

  describe('pickAvailableAgent', () => {
    it('picks the least busy available agent matching preferred language', async () => {
      // Both Maria (en, es: 1 active) and Raj (en, hi: 0 active) speak English
      const picked = await helplineService.pickAvailableAgent('en');

      expect(picked).toBeDefined();
      expect(picked?.getId()).toBe('agent-en-hi'); // Raj with 0 active cases
    });

    it('picks language-specific agent when only one speaks the requested language', async () => {
      const picked = await helplineService.pickAvailableAgent('es');

      expect(picked).toBeDefined();
      expect(picked?.getId()).toBe('agent-en-es'); // Maria speaks Spanish
    });

    it('skips agents who are off duty', async () => {
      // Claire speaks French but is off-duty
      const picked = await helplineService.pickAvailableAgent('fr');

      expect(picked).toBeNull();
    });

    it('skips agents who have reached maxConcurrentCases', async () => {
      // Set Maria to 5 active cases as well
      agentEnglishSpanish = new HelplineAgent({
        id: 'agent-en-es',
        email: 'maria@fixmyitch.com',
        fullName: 'Maria Rodriguez',
        phoneNumber: '+1-555-0101',
        spokenLanguages: ['en', 'es'],
        isAvailableForDuty: true,
        currentActiveCases: 5,
        maxConcurrentCases: 5,
      });
      await mockAgentRepo.save(agentEnglishSpanish);

      const pickedSpanish = await helplineService.pickAvailableAgent('es');
      expect(pickedSpanish).toBeNull();
    });

    it('returns null when no agent speaks the language and fallback is disabled', async () => {
      const picked = await helplineService.pickAvailableAgent({
        languageCode: 'de',
        fallbackToAny: false,
      });

      expect(picked).toBeNull();
    });

    it('picks available agent via fallbackToAny when no language match exists', async () => {
      const picked = await helplineService.pickAvailableAgent({
        languageCode: 'de',
        fallbackToAny: true,
      });

      expect(picked).toBeDefined();
      // Should pick the least busy general agent (Raj: 0 active)
      expect(picked?.getId()).toBe('agent-en-hi');
    });

    it('works seamlessly with in-memory registered agents without AgentRepository', async () => {
      const inMemoryService = new HelplineService(mockCaseRepo);
      const customAgent = new HelplineAgent({
        id: 'agent-custom',
        email: 'custom@agent.com',
        fullName: 'Custom Agent',
        phoneNumber: '+123456',
        spokenLanguages: ['it'],
        isAvailableForDuty: true,
        currentActiveCases: 0,
      });

      inMemoryService.registerAgent(customAgent);

      const picked = await inMemoryService.pickAvailableAgent('it');
      expect(picked).toBeDefined();
      expect(picked?.getId()).toBe('agent-custom');
    });
  });

  describe('Moving States using HelplineCase methods', () => {
    let testCase: HelplineCase;

    beforeEach(async () => {
      testCase = await helplineService.createCase({
        id: 'case-flow-1',
        travelerId: 'trav-99',
        cityId: 'city-goa',
        subject: 'Suspected malaria fever',
        initialDescription: 'High fever and chills in Goa',
        preferredLanguageCode: 'hi',
        urgency: HelplineUrgency.URGENT,
      });
    });

    it('transitions NEW -> ASSIGNED using assignAvailableAgent()', async () => {
      expect(testCase.getStatus()).toBe(HelplineCaseStatus.NEW);

      const assigned = await helplineService.assignAvailableAgent('case-flow-1');

      expect(assigned.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      expect(assigned.getAgentId()).toBe('agent-en-hi'); // Raj speaks Hindi

      // Verify agent's active case count was incremented
      const agent = await mockAgentRepo.findById('agent-en-hi');
      expect(agent?.getCurrentActiveCases()).toBe(1);
    });

    it('transitions NEW -> ASSIGNED with specific agent using assign(caseId, agentId)', async () => {
      const assigned = await helplineService.assign('case-flow-1', 'agent-en-es');

      expect(assigned.getStatus()).toBe(HelplineCaseStatus.ASSIGNED);
      expect(assigned.getAgentId()).toBe('agent-en-es');

      // Verify agent active load incremented from 1 to 2
      const agent = await mockAgentRepo.findById('agent-en-es');
      expect(agent?.getCurrentActiveCases()).toBe(2);
    });

    it('transitions ASSIGNED -> RECOMMENDED using recommendProvider()', async () => {
      await helplineService.assign('case-flow-1', 'agent-en-hi');

      const recommended = await helplineService.recommend(
        'case-flow-1',
        'hosp-emergency-1',
        'Direct admission booked at Goa Medical College Emergency Ward',
      );

      expect(recommended.getStatus()).toBe(HelplineCaseStatus.RECOMMENDED);
      expect(recommended.getRecommendedProviderId()).toBe('hosp-emergency-1');
      expect(recommended.getRecommendationNotes()).toContain('Direct admission booked');
    });

    it('escalates urgency using escalate()', async () => {
      await helplineService.assign('case-flow-1', 'agent-en-hi');

      const escalated = await helplineService.escalate(
        'case-flow-1',
        HelplineUrgency.EMERGENCY,
      );

      expect(escalated.getUrgency()).toBe(HelplineUrgency.EMERGENCY);
      expect(escalated.getPriority()).toBe(HelplineCasePriority.CRITICAL);
    });

    it('transitions RECOMMENDED -> RESOLVED using resolve() and releases agent case load', async () => {
      await helplineService.assign('case-flow-1', 'agent-en-hi');
      await helplineService.recommend('case-flow-1', 'hosp-emergency-1');

      // Before resolve: Raj had 1 active case
      let agent = await mockAgentRepo.findById('agent-en-hi');
      expect(agent?.getCurrentActiveCases()).toBe(1);

      const resolved = await helplineService.resolve(
        'case-flow-1',
        'Traveler arrived at Goa Medical College, tested negative for malaria, treated for viral fever and discharged.',
      );

      expect(resolved.getStatus()).toBe(HelplineCaseStatus.RESOLVED);
      expect(resolved.getResolutionSummary()).toContain('discharged');
      expect(resolved.getResolvedAt()).toBeInstanceOf(Date);

      // After resolve: Raj's active case load is released back to 0!
      agent = await mockAgentRepo.findById('agent-en-hi');
      expect(agent?.getCurrentActiveCases()).toBe(0);
    });

    it('transitions RESOLVED -> CLOSED using close()', async () => {
      await helplineService.assign('case-flow-1', 'agent-en-hi');
      await helplineService.recommend('case-flow-1', 'hosp-emergency-1');
      await helplineService.resolve(
        'case-flow-1',
        'Patient fully recovered and travel itinerary resumed.',
      );

      const closed = await helplineService.close('case-flow-1');
      expect(closed.getStatus()).toBe(HelplineCaseStatus.CLOSED);
    });
  });

  describe('Invalid State Transitions & Guards', () => {
    it('throws when attempting to recommend a provider directly from NEW status', async () => {
      const newCase = await helplineService.createCase({
        id: 'case-unassigned',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Allergy',
        initialDescription: 'Rash',
        preferredLanguageCode: 'en',
      });

      await expect(
        helplineService.recommend('case-unassigned', 'hosp-emergency-1'),
      ).rejects.toThrow(
        'Cannot recommend provider for case in NEW status: must be in ASSIGNED status',
      );
    });

    it('throws when attempting to resolve a case directly from NEW status', async () => {
      await helplineService.createCase({
        id: 'case-new-direct',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Allergy',
        initialDescription: 'Rash',
        preferredLanguageCode: 'en',
      });

      await expect(
        helplineService.resolve(
          'case-new-direct',
          'Attempting direct resolution without assignment',
        ),
      ).rejects.toThrow(
        'Cannot resolve case in NEW status: must be ASSIGNED or RECOMMENDED first',
      );
    });

    it('throws when attempting to reassign a RECOMMENDED case', async () => {
      await helplineService.createCase({
        id: 'case-reassign-test',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Allergy',
        initialDescription: 'Rash',
        preferredLanguageCode: 'en',
      });

      await helplineService.assign('case-reassign-test', 'agent-en-hi');
      await helplineService.recommend('case-reassign-test', 'hosp-emergency-1');

      await expect(
        helplineService.assign('case-reassign-test', 'agent-en-es'),
      ).rejects.toThrow(
        'Cannot assign case in RECOMMENDED status: must be in NEW status',
      );
    });

    it('throws when attempting to close a case that is not RESOLVED', async () => {
      await helplineService.createCase({
        id: 'case-not-resolved',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Allergy',
        initialDescription: 'Rash',
        preferredLanguageCode: 'en',
      });

      await expect(helplineService.close('case-not-resolved')).rejects.toThrow(
        'Case must be resolved before it can be closed',
      );
    });

    it('throws when recommending a non-existent provider', async () => {
      await helplineService.createCase({
        id: 'case-fake-provider',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Allergy',
        initialDescription: 'Rash',
        preferredLanguageCode: 'en',
      });
      await helplineService.assign('case-fake-provider', 'agent-en-hi');

      await expect(
        helplineService.recommend('case-fake-provider', 'non-existent-provider'),
      ).rejects.toThrow(
        'Healthcare provider with ID "non-existent-provider" was not found for recommendation',
      );
    });

    it('throws NotFoundException when operating on a non-existent case', async () => {
      await expect(
        helplineService.assign('ghost-case-id', 'agent-en-hi'),
      ).rejects.toThrow('Helpline case with ID "ghost-case-id" was not found');
    });

    it('throws BadRequestException when assignAvailableAgent cannot find an agent', async () => {
      await helplineService.createCase({
        id: 'case-unsupported-lang',
        travelerId: 'trav-1',
        cityId: 'city-goa',
        subject: 'Language problem',
        initialDescription: 'Only speaks Japanese',
        preferredLanguageCode: 'ja',
      });

      await expect(
        helplineService.assignAvailableAgent('case-unsupported-lang'),
      ).rejects.toThrow('No available helpline agent found for language "ja"');
    });
  });

  describe('Queries', () => {
    it('returns open cases with getOpenCases()', async () => {
      await helplineService.createCase({
        id: 'c-open-1',
        travelerId: 't-1',
        cityId: 'city-goa',
        subject: 'Open 1',
        initialDescription: 'Desc 1',
        preferredLanguageCode: 'en',
      });
      await helplineService.createCase({
        id: 'c-open-2',
        travelerId: 't-2',
        cityId: 'city-goa',
        subject: 'Open 2',
        initialDescription: 'Desc 2',
        preferredLanguageCode: 'en',
      });
      await helplineService.assign('c-open-2', 'agent-en-hi'); // c-open-2 is now ASSIGNED

      const openCases = await helplineService.getOpenCases();
      expect(openCases.length).toBe(1);
      expect(openCases[0].getId()).toBe('c-open-1');
    });
  });
});
