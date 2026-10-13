import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HealthcareProvider } from '../domain';
import {
  PROVIDER_REPOSITORY,
  ProviderRepository,
  ProviderFilter,
} from '../repositories';

/**
 * Service encapsulating business logic for healthcare providers.
 * Strictly depends ONLY on the ProviderRepository interface.
 */
@Injectable()
export class ProviderService {
  constructor(
    @Inject(PROVIDER_REPOSITORY)
    private readonly providerRepository: ProviderRepository,
  ) {}

  async getProviderById(id: string): Promise<HealthcareProvider> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException(`Healthcare provider with ID "${id}" was not found`);
    }
    return provider;
  }

  async searchProviders(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    return this.providerRepository.findAll(filter);
  }

  async getVerifiedProvidersInCity(cityId: string): Promise<HealthcareProvider[]> {
    return this.providerRepository.findAll({
      cityId,
      isVerified: true,
      isActive: true,
    });
  }

  async getProvidersByLanguage(languageCode: string): Promise<HealthcareProvider[]> {
    return this.providerRepository.findByLanguage(languageCode);
  }

  async getProvidersBySpecialty(specialtyId: string): Promise<HealthcareProvider[]> {
    return this.providerRepository.findBySpecialty(specialtyId);
  }

  async registerProvider(provider: HealthcareProvider): Promise<void> {
    await this.providerRepository.save(provider);
  }
}
