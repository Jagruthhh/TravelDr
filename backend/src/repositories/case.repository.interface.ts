import { HelplineCase, HelplineCaseStatus, HelplineUrgency } from '../domain';

export interface CaseFilter {
  travelerId?: string;
  agentId?: string;
  status?: HelplineCaseStatus;
  urgency?: HelplineUrgency;
  cityId?: string;
}

/**
 * Port/Interface for helpline emergency case persistence operations.
 * Application services depend exclusively on this interface.
 */
export interface CaseRepository {
  findById(id: string): Promise<HelplineCase | null>;
  findAll(filter?: CaseFilter): Promise<HelplineCase[]>;
  findByTravelerId(travelerId: string): Promise<HelplineCase[]>;
  findByAgentId(agentId: string): Promise<HelplineCase[]>;
  findByStatus(status: HelplineCaseStatus): Promise<HelplineCase[]>;
  save(helplineCase: HelplineCase): Promise<void>;
  delete(id: string): Promise<void>;
  count(filter?: CaseFilter): Promise<number>;
}

/**
 * Injection token for CaseRepository in NestJS dependency injection.
 */
export const CASE_REPOSITORY = Symbol('CASE_REPOSITORY');
