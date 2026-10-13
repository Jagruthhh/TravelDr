import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  HelplineCase,
  HelplineCaseStatus,
  HelplineUrgency,
} from '../domain';
import {
  CASE_REPOSITORY,
  CaseRepository,
  PROVIDER_REPOSITORY,
  ProviderRepository,
  CaseFilter,
} from '../repositories';

export interface CreateCaseDto {
  id: string;
  travelerId: string;
  cityId: string;
  subject: string;
  initialDescription: string;
  preferredLanguageCode: string;
  urgency?: HelplineUrgency;
}

/**
 * Service orchestrating emergency helpline concierge workflows.
 * Strictly depends ONLY on repository interfaces (CaseRepository, ProviderRepository).
 */
@Injectable()
export class CaseService {
  constructor(
    @Inject(CASE_REPOSITORY)
    private readonly caseRepository: CaseRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providerRepository: ProviderRepository,
  ) {}

  async createCase(dto: CreateCaseDto): Promise<HelplineCase> {
    const helplineCase = new HelplineCase({
      id: dto.id,
      travelerId: dto.travelerId,
      cityId: dto.cityId,
      subject: dto.subject,
      initialDescription: dto.initialDescription,
      preferredLanguageCode: dto.preferredLanguageCode,
      urgency: dto.urgency,
    });

    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  async getCaseById(id: string): Promise<HelplineCase> {
    const helplineCase = await this.caseRepository.findById(id);
    if (!helplineCase) {
      throw new NotFoundException(`Helpline case with ID "${id}" was not found`);
    }
    return helplineCase;
  }

  async findCases(filter?: CaseFilter): Promise<HelplineCase[]> {
    return this.caseRepository.findAll(filter);
  }

  async assignCase(caseId: string, agentId: string): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);
    helplineCase.assign(agentId);
    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  async recommendProvider(
    caseId: string,
    providerId: string,
    notes?: string,
  ): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);

    // Verify provider exists via ProviderRepository interface
    const provider = await this.providerRepository.findById(providerId);
    if (!provider) {
      throw new NotFoundException(
        `Healthcare provider with ID "${providerId}" was not found for recommendation`,
      );
    }

    helplineCase.recommend(providerId, notes);
    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  async escalateCase(
    caseId: string,
    urgency: HelplineUrgency = HelplineUrgency.EMERGENCY,
  ): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);
    helplineCase.escalate(urgency);
    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  async resolveCase(caseId: string, summary: string): Promise<HelplineCase> {
    const helplineCase = await this.getCaseById(caseId);
    helplineCase.resolve(summary);
    await this.caseRepository.save(helplineCase);
    return helplineCase;
  }

  async getOpenCases(): Promise<HelplineCase[]> {
    return this.caseRepository.findByStatus(HelplineCaseStatus.NEW);
  }
}
