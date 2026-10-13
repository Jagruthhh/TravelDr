import {
  HelplineCasePriority,
  HelplineCaseStatus,
  HelplineUrgency,
} from '../common/enums';
import { Message } from './message.entity';

/**
 * HelplineCase domain entity representing an emergency or concierge fallback case
 * opened by an international traveler who needs urgent human assistance finding care.
 *
 * Supports state transitions:
 * NEW -> ASSIGNED -> RECOMMENDED -> RESOLVED
 */
export class HelplineCase {
  private readonly id: string;
  private readonly travelerId: string;
  private readonly cityId: string;
  private agentId?: string;
  private status: HelplineCaseStatus;
  private urgency: HelplineUrgency;
  private priority: HelplineCasePriority;
  private subject: string;
  private initialDescription: string;
  private preferredLanguageCode: string;
  private messages: Message[];
  private recommendedProviderId?: string;
  private recommendationNotes?: string;
  private resolutionSummary?: string;
  private resolvedAt?: Date;
  private readonly createdAt: Date;
  private updatedAt: Date;

  constructor(params: {
    id: string;
    travelerId: string;
    cityId: string;
    subject: string;
    initialDescription: string;
    preferredLanguageCode: string;
    agentId?: string;
    status?: HelplineCaseStatus;
    urgency?: HelplineUrgency;
    priority?: HelplineCasePriority;
    messages?: Message[];
    recommendedProviderId?: string;
    recommendationNotes?: string;
    resolutionSummary?: string;
    resolvedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    if (!params.id || params.id.trim() === '') {
      throw new Error('Case ID is required');
    }
    if (!params.travelerId || params.travelerId.trim() === '') {
      throw new Error('Traveler ID is required');
    }
    if (!params.cityId || params.cityId.trim() === '') {
      throw new Error('City ID is required');
    }
    if (!params.subject || params.subject.trim() === '') {
      throw new Error('Case subject is required');
    }
    if (!params.initialDescription || params.initialDescription.trim() === '') {
      throw new Error('Initial description is required');
    }

    this.id = params.id.trim();
    this.travelerId = params.travelerId.trim();
    this.cityId = params.cityId.trim();
    this.subject = params.subject.trim();
    this.initialDescription = params.initialDescription.trim();
    this.preferredLanguageCode = params.preferredLanguageCode.trim().toLowerCase();
    this.agentId = params.agentId?.trim();
    this.status = params.status ?? HelplineCaseStatus.NEW;
    this.urgency = params.urgency ?? HelplineUrgency.ROUTINE;
    this.priority = params.priority ?? this.mapUrgencyToPriority(this.urgency);
    this.messages = params.messages ?? [];
    this.recommendedProviderId = params.recommendedProviderId?.trim();
    this.recommendationNotes = params.recommendationNotes?.trim();
    this.resolutionSummary = params.resolutionSummary?.trim();
    this.resolvedAt = params.resolvedAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  public getId(): string {
    return this.id;
  }

  public getTravelerId(): string {
    return this.travelerId;
  }

  public getCityId(): string {
    return this.cityId;
  }

  public getAgentId(): string | undefined {
    return this.agentId;
  }

  public getStatus(): HelplineCaseStatus {
    return this.status;
  }

  public getUrgency(): HelplineUrgency {
    return this.urgency;
  }

  public getPriority(): HelplineCasePriority {
    return this.priority;
  }

  public getSubject(): string {
    return this.subject;
  }

  public getInitialDescription(): string {
    return this.initialDescription;
  }

  public getPreferredLanguageCode(): string {
    return this.preferredLanguageCode;
  }

  public getMessages(): Message[] {
    return [...this.messages];
  }

  public getRecommendedProviderId(): string | undefined {
    return this.recommendedProviderId;
  }

  public getRecommendationNotes(): string | undefined {
    return this.recommendationNotes;
  }

  public getResolutionSummary(): string | undefined {
    return this.resolutionSummary;
  }

  public getResolvedAt(): Date | undefined {
    return this.resolvedAt;
  }

  public getCreatedAt(): Date {
    return this.createdAt;
  }

  public getUpdatedAt(): Date {
    return this.updatedAt;
  }

  /**
   * Transition: NEW -> ASSIGNED
   */
  public assign(agentId: string): void {
    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required for assignment');
    }
    if (this.status !== HelplineCaseStatus.NEW) {
      throw new Error(`Cannot assign case in ${this.status} status: must be in ${HelplineCaseStatus.NEW} status`);
    }
    this.agentId = agentId.trim();
    this.status = HelplineCaseStatus.ASSIGNED;
    this.touch();
  }

  /** Backwards compatibility alias for assign */
  public assignToAgent(agentId: string): void {
    this.assign(agentId);
  }

  /**
   * Transition: ASSIGNED (or IN_ASSISTANCE) -> RECOMMENDED
   */
  public recommend(providerId: string, notes?: string): void {
    if (!providerId || providerId.trim() === '') {
      throw new Error('Provider ID is required to make a recommendation');
    }
    if (this.status !== HelplineCaseStatus.ASSIGNED && this.status !== HelplineCaseStatus.IN_ASSISTANCE) {
      throw new Error(
        `Cannot recommend provider for case in ${this.status} status: must be in ${HelplineCaseStatus.ASSIGNED} status`,
      );
    }
    this.recommendedProviderId = providerId.trim();
    if (notes) {
      this.recommendationNotes = notes.trim();
    }
    this.status = HelplineCaseStatus.RECOMMENDED;
    this.touch();
  }

  /**
   * Escalate urgency and priority.
   */
  public escalate(newUrgency: HelplineUrgency = HelplineUrgency.EMERGENCY): void {
    if (this.status === HelplineCaseStatus.RESOLVED || this.status === HelplineCaseStatus.CLOSED) {
      throw new Error(`Cannot escalate a ${this.status} case`);
    }
    this.urgency = newUrgency;
    this.priority = this.mapUrgencyToPriority(newUrgency);
    this.touch();
  }

  public escalatePriority(newPriority: HelplineCasePriority): void {
    this.priority = newPriority;
    this.touch();
  }

  /**
   * Transition: RECOMMENDED -> RESOLVED
   * (Also permits resolving directly from ASSIGNED/IN_ASSISTANCE if human resolved on call).
   */
  public resolve(summary: string): void {
    if (!summary || summary.trim().length < 5) {
      throw new Error('Detailed resolution summary is required to resolve case');
    }
    if (
      this.status !== HelplineCaseStatus.RECOMMENDED &&
      this.status !== HelplineCaseStatus.ASSIGNED &&
      this.status !== HelplineCaseStatus.IN_ASSISTANCE
    ) {
      throw new Error(`Cannot resolve case in ${this.status} status: must be ASSIGNED or RECOMMENDED first`);
    }
    this.status = HelplineCaseStatus.RESOLVED;
    this.resolutionSummary = summary.trim();
    this.resolvedAt = new Date();
    this.touch();
  }

  public addMessage(message: Message): void {
    if (message.getCaseId() !== this.id) {
      throw new Error('Message does not belong to this helpline case');
    }
    this.messages.push(message);
    if (this.status === HelplineCaseStatus.ASSIGNED) {
      this.status = HelplineCaseStatus.IN_ASSISTANCE;
    }
    this.touch();
  }

  public close(): void {
    if (this.status !== HelplineCaseStatus.RESOLVED) {
      throw new Error('Case must be resolved before it can be closed');
    }
    this.status = HelplineCaseStatus.CLOSED;
    this.touch();
  }

  public isUrgent(): boolean {
    return (
      this.urgency === HelplineUrgency.EMERGENCY ||
      this.urgency === HelplineUrgency.URGENT ||
      this.priority === HelplineCasePriority.HIGH ||
      this.priority === HelplineCasePriority.CRITICAL
    );
  }

  private mapUrgencyToPriority(urgency: HelplineUrgency): HelplineCasePriority {
    switch (urgency) {
      case HelplineUrgency.EMERGENCY:
        return HelplineCasePriority.CRITICAL;
      case HelplineUrgency.URGENT:
        return HelplineCasePriority.HIGH;
      case HelplineUrgency.ROUTINE:
      default:
        return HelplineCasePriority.MEDIUM;
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
