import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import {
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
  HelplineAgent,
} from '../domain';
import {
  CASE_REPOSITORY,
  CaseRepository,
  PROVIDER_REPOSITORY,
  ProviderRepository,
  AGENT_REPOSITORY,
  AgentRepository,
  CaseFilter,
} from '../repositories';

export interface CreateHelplineCaseDto {
  id?: string;
  travelerId: string;
  cityId: string;
  subject: string;
  initialDescription: string;
  preferredLanguageCode: string;
  urgency?: HelplineUrgency;
  autoAssign?: boolean;
}

export interface PickAgentOptions {
  languageCode?: string;
  fallbackToAny?: boolean;
}

/**
 * Service orchestrating emergency helpline concierge workflows.
 * Responsible for creating cases, picking available agents by language and workload,
 * and transitioning case states using the existing HelplineCase domain methods.
 */
@Injectable()
export class HelplineService {
  private readonly inMemoryAgents: Map<string, HelplineAgent> = new Map();
  private readonly agentRepository?: AgentRepository;
  private readonly providerRepository?: ProviderRepository;

  constructor(
    @Inject(CASE_REPOSITORY)
    private readonly caseRepository: CaseRepository,
    @Optional()
    @Inject(PROVIDER_REPOSITORY)
    providerRepoOrAgents?: ProviderRepository | AgentRepository | HelplineAgent[],
    @Optional()
    @Inject(AGENT_REPOSITORY)
    agentRepoOrAgents?: AgentRepository | HelplineAgent[],
  ) {
    // Flexible constructor resolution to support DI and testing with mocks
    if (Array.isArray(providerRepoOrAgents)) {
      this.registerAgents(providerRepoOrAgents);
    } else if (providerRepoOrAgents && 'findByCity' in providerRepoOrAgents) {
      this.providerRepository = providerRepoOrAgents as ProviderRepository;
    } else if (providerRepoOrAgents && 'findAvailable' in providerRepoOrAgents) {
      this.agentRepository = providerRepoOrAgents as AgentRepository;
    }

    if (Array.isArray(agentRepoOrAgents)) {
      this.registerAgents(agentRepoOrAgents);
    } else if (agentRepoOrAgents && 'findAvailable' in agentRepoOrAgents) {
      this.agentRepository = agentRepoOrAgents as AgentRepository;
    }
  }

  // ─── Agent Management ────────────────────────────────────────────────────────

  /**
   * Registers a HelplineAgent into the in-memory pool for case routing.
   */
  public registerAgent(agent: HelplineAgent): void {
    this.inMemoryAgents.set(agent.getId(), agent);
  }

  /**
   * Registers multiple HelplineAgents for routing.
   */
  public registerAgents(agents: HelplineAgent[]): void {
    for (const agent of agents) {
      this.registerAgent(agent);
    }
  }

  /**
   * Returns all agents registered in-memory.
   */
  public getRegisteredAgents(): HelplineAgent[] {
    return Array.from(this.inMemoryAgents.values());
  }

  /**
   * Picks an available agent who can take a case.
   *
   * Filters by:
   * 1. Availability for duty and active status
   * 2. Remaining capacity (currentActiveCases < maxConcurrentCases)
   * 3. Preferred language compatibility
   *
   * When multiple candidates qualify, selects the one with the lowest current workload.
   */
  public async pickAvailableAgent(
    options?: string | PickAgentOptions,
  ): Promise<HelplineAgent | null> {
    const languageCode =
      typeof options === 'string'
        ? options
        : options?.languageCode;
    const fallbackToAny =
      typeof options === 'object' ? options.fallbackToAny ?? false : false;

    // Collect all candidate agents from repository and in-memory pool
    const allAgents = await this.getAllAgents();

    // 1. Language-matching candidates with capacity
    let eligible = allAgents.filter((agent) =>
      agent.canTakeCase(languageCode),
    );

    // 2. Fallback to any agent with capacity if enabled
    if (eligible.length === 0 && fallbackToAny) {
      eligible = allAgents.filter((agent) => agent.canTakeCase());
    }

    if (eligible.length === 0) {
      return null;
    }

    // 3. Rank by lowest active cases, then highest headroom
    eligible.sort((a, b) => {
      const activeDiff = a.getCurrentActiveCases() - b.getCurrentActiveCases();
      if (activeDiff !== 0) {
        return activeDiff;
      }
      const headroomA = a.getMaxConcurrentCases() - a.getCurrentActiveCases();
      const headroomB = b.getMaxConcurrentCases() - b.getCurrentActiveCases();
      return headroomB - headroomA;
    });

    return eligible[0];
  }

  // ─── Case Lifecycle & State Transitions ──────────────────────────────────────

  /**
   * Creates a new HelplineCase in NEW state.
   * If autoAssign is requested, attempts to pick and assign an available agent immediately.
   */
  public async createCase(dto: CreateHelplineCaseDto): Promise<HelplineCase> {
    const id =
      dto.id?.trim() ||
      `case-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const helplineCase = new HelplineCase({
      id,
      travelerId: dto.travelerId,
      cityId: dto.cityId,
      subject: dto.subject,
      initialDescription: dto.initialDescription,
      preferredLanguageCode: dto.preferredLanguageCode,
      urgency: dto.urgency ?? HelplineUrgency.ROUTINE,
    });

    if (dto.autoAssign) {
      const agent = await this.pickAvailableAgent(dto.preferredLanguageCode);
      if (agent) {
        // Move state using existing HelplineCase.assign method
        helplineCase.assign(agent.getId());
        agent.assignCase();
        await this.saveAgent(agent);
      }
    }

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /**
   * Picks an available agent for the case and assigns them.
   * Moves state: NEW -> ASSIGNED using existing HelplineCase.assign() method.
   */
  public async assignAvailableAgent(caseId: string): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    const agent = await this.pickAvailableAgent({
      languageCode: helplineCase.getPreferredLanguageCode(),
      fallbackToAny: false,
    });

    if (!agent) {
      throw new BadRequestException(
        `No available helpline agent found for language "${helplineCase.getPreferredLanguageCode()}"`,
      );
    }

    // Move state using existing HelplineCase.assign method
    helplineCase.assign(agent.getId());
    agent.assignCase();
    await this.saveAgent(agent);

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /**
   * Assigns a specific agent to the case.
   * Moves state: NEW -> ASSIGNED using existing HelplineCase.assign() method.
   */
  public async assign(caseId: string, agentId?: string): Promise<HelplineCase> {
    if (!agentId) {
      return this.assignAvailableAgent(caseId);
    }

    const helplineCase = await this.getCaseById(caseId);

    // Move state using existing HelplineCase.assign method
    helplineCase.assign(agentId);

    // Track active case count on agent if known
    const agent = await this.findAgentById(agentId);
    if (agent && agent.canTakeCase()) {
      agent.assignCase();
      await this.saveAgent(agent);
    }

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /** Alias for assign(caseId, agentId) */
  public async assignCase(caseId: string, agentId: string): Promise<HelplineCase> {
    return this.assign(caseId, agentId);
  }

  /**
   * Recommends a verified healthcare provider for the case.
   * Moves state: ASSIGNED -> RECOMMENDED using existing HelplineCase.recommend() method.
   */
  public async recommend(
    caseId: string,
    providerId: string,
    notes?: string,
  ): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    if (this.providerRepository) {
      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        throw new NotFoundException(
          `Healthcare provider with ID "${providerId}" was not found for recommendation`,
        );
      }
    }

    // Move state using existing HelplineCase.recommend method
    helplineCase.recommend(providerId, notes);

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /** Alias for recommend(caseId, providerId, notes) */
  public async recommendProvider(
    caseId: string,
    providerId: string,
    notes?: string,
  ): Promise<HelplineCase> {
    return this.recommend(caseId, providerId, notes);
  }

  /**
   * Escalates the urgency and priority of the case.
   * Invokes existing HelplineCase.escalate() method.
   */
  public async escalate(
    caseId: string,
    urgency: HelplineUrgency = HelplineUrgency.EMERGENCY,
  ): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    // Invoke existing HelplineCase.escalate method
    helplineCase.escalate(urgency);

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /** Alias for escalate(caseId, urgency) */
  public async escalateCase(
    caseId: string,
    urgency: HelplineUrgency = HelplineUrgency.EMERGENCY,
  ): Promise<HelplineCase> {
    return this.escalate(caseId, urgency);
  }

  /**
   * Resolves the case with a final summary.
   * Moves state: RECOMMENDED (or ASSIGNED) -> RESOLVED using existing HelplineCase.resolve() method.
   * Releases active case load from the assigned agent.
   */
  public async resolve(caseId: string, summary: string): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    // Move state using existing HelplineCase.resolve method
    helplineCase.resolve(summary);

    // Release agent active case count
    const agentId = helplineCase.getAgentId();
    if (agentId) {
      const agent = await this.findAgentById(agentId);
      if (agent) {
        agent.releaseCase();
        await this.saveAgent(agent);
      }
    }

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /** Alias for resolve(caseId, summary) */
  public async resolveCase(caseId: string, summary: string): Promise<HelplineCase> {
    return this.resolve(caseId, summary);
  }

  /**
   * Closes a resolved case.
   * Moves state: RESOLVED -> CLOSED using existing HelplineCase.close() method.
   */
  public async close(caseId: string): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    // Move state using existing HelplineCase.close method
    helplineCase.close();

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  /** Alias for close(caseId) */
  public async closeCase(caseId: string): Promise<HelplineCase> {
    return this.close(caseId);
  }

  // ─── Query Methods ───────────────────────────────────────────────────────────

  public async getCaseById(id: string): Promise<HelplineCase> {
    const helplineCase = await this.caseRepository.findById(id);
    if (!helplineCase) {
      throw new NotFoundException(`Helpline case with ID "${id}" was not found`);
    }
    return helplineCase;
  }

  public async findCases(filter?: CaseFilter): Promise<HelplineCase[]> {
    return this.caseRepository.findAll(filter);
  }

  public async getOpenCases(): Promise<HelplineCase[]> {
    return this.caseRepository.findByStatus(HelplineCaseStatus.NEW);
  }

  // ─── Internal Helpers ────────────────────────────────────────────────────────

  private async getAllAgents(): Promise<HelplineAgent[]> {
    const map = new Map<string, HelplineAgent>();

    // Add in-memory agents
    for (const [id, agent] of this.inMemoryAgents.entries()) {
      map.set(id, agent);
    }

    // Add agents from repository if configured
    if (this.agentRepository) {
      const repoAgents = await this.agentRepository.findAll();
      for (const agent of repoAgents) {
        if (!map.has(agent.getId())) {
          map.set(agent.getId(), agent);
        }
      }
    }

    return Array.from(map.values());
  }

  private async findAgentById(agentId: string): Promise<HelplineAgent | null> {
    if (this.inMemoryAgents.has(agentId)) {
      return this.inMemoryAgents.get(agentId)!;
    }
    if (this.agentRepository) {
      return this.agentRepository.findById(agentId);
    }
    return null;
  }

  private async saveAgent(agent: HelplineAgent): Promise<void> {
    this.inMemoryAgents.set(agent.getId(), agent);
    if (this.agentRepository) {
      await this.agentRepository.save(agent);
    }
  }
}
