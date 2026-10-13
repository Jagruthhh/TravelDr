import { HelplineAgent } from '../domain';

export interface AgentFilter {
  isAvailableForDuty?: boolean;
  languageCode?: string;
  isActive?: boolean;
}

/**
 * Port/Interface for helpline agent persistence and availability queries.
 * Application services depend exclusively on this interface.
 */
export interface AgentRepository {
  findById(id: string): Promise<HelplineAgent | null>;
  findAll(filter?: AgentFilter): Promise<HelplineAgent[]>;
  findAvailable(languageCode?: string): Promise<HelplineAgent[]>;
  save(agent: HelplineAgent): Promise<void>;
  delete?(id: string): Promise<void>;
  count?(filter?: AgentFilter): Promise<number>;
}

/**
 * Injection token for AgentRepository in NestJS dependency injection.
 */
export const AGENT_REPOSITORY = Symbol('AGENT_REPOSITORY');
