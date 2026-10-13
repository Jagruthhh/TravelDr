import { HealthcareProvider } from '../domain';

export interface ProviderFilter {
  cityId?: string;
  languageCode?: string;
  specialtyId?: string;
  isVerified?: boolean;
  isActive?: boolean;
  searchTerm?: string;
}

/**
 * Port/Interface for healthcare provider persistence operations.
 * Application services depend exclusively on this interface.
 */
export interface ProviderRepository {
  findById(id: string): Promise<HealthcareProvider | null>;
  findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]>;
  findByCity(cityId: string): Promise<HealthcareProvider[]>;
  findByLanguage(languageCode: string): Promise<HealthcareProvider[]>;
  findBySpecialty(specialtyId: string): Promise<HealthcareProvider[]>;
  save(provider: HealthcareProvider): Promise<void>;
  delete(id: string): Promise<void>;
  count(filter?: ProviderFilter): Promise<number>;
}

/**
 * Injection token for ProviderRepository in NestJS dependency injection.
 */
export const PROVIDER_REPOSITORY = Symbol('PROVIDER_REPOSITORY');
