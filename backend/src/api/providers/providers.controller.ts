import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ProviderSearchService,
  ProviderService,
  CostEstimator,
} from '../../services';
import {
  HealthcareProvider,
  PriceEntry,
  VerificationRecord,
  VerificationStatus,
  UserRole,
} from '../../domain';
import {
  GetProvidersQueryDto,
  GetProviderDetailQueryDto,
  ProviderIdParamDto,
  UpdateProviderVerificationDto,
  ProviderResponseDto,
  ProviderCostRangeDto,
  PriceEntryDto,
} from './providers.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Controller exposing healthcare provider search, catalog, and cost details.
 * Implements GET /providers with query filters, GET /providers/:id with cost range,
 * and PATCH /providers/:id/verification (admin only).
 */
@Controller('providers')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ProvidersController {
  constructor(
    private readonly providerSearchService: ProviderSearchService,
    private readonly providerService: ProviderService,
    private readonly costEstimator: CostEstimator,
  ) {}

  /**
   * GET /providers
   * Searches and filters providers with query parameters (city, language, specialty, verifiedOnly).
   * Ranks results and computes cost range for each provider.
   */
  @Get()
  async getProviders(
    @Query() query: GetProvidersQueryDto,
  ): Promise<ProviderResponseDto[]> {
    const providers = await this.providerSearchService.search({
      city: query.city,
      language: query.language,
      specialty: query.specialty,
      verifiedOnly: query.verifiedOnly ?? false,
    });

    return Promise.all(
      providers.map((p) => this.mapToResponseDto(p, query.treatmentId)),
    );
  }

  /**
   * GET /providers/:id
   * Retrieves single provider details by ID, including complete cost range
   * across active price entries, and optional treatment cost estimate.
   */
  @Get(':id')
  async getProviderById(
    @Param() params: ProviderIdParamDto,
    @Query() query: GetProviderDetailQueryDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerService.getProviderById(params.id);
    return this.mapToResponseDto(provider, query.treatmentId, true);
  }

  /**
   * PATCH /providers/:id/verification (Admin only)
   * Updates or approves the provider's official credential verification status.
   */
  @Patch(':id/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateVerification(
    @Param() params: ProviderIdParamDto,
    @Body() dto: UpdateProviderVerificationDto,
    @Req() req: any,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providerService.getProviderById(params.id);
    const adminId = req.user?.sub || 'admin-system';

    const existingRecord = provider.getVerificationRecord();
    const docUrl =
      dto.licenseDocumentUrl ||
      existingRecord?.getLicenseDocumentUrl() ||
      'https://verified.traveldoc.internal/license.pdf';

    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 365 * 86_400_000);

    if (dto.status === VerificationStatus.VERIFIED) {
      if (
        existingRecord &&
        existingRecord.getStatus() === VerificationStatus.PENDING
      ) {
        existingRecord.verify(adminId, expiresAt, dto.notes);
      } else {
        const record = new VerificationRecord({
          id:
            existingRecord?.getId() ||
            `vr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          providerId: provider.getId(),
          licenseDocumentUrl: docUrl,
          status: VerificationStatus.VERIFIED,
          verifiedByAdminId: adminId,
          verifiedAt: new Date(),
          expiresAt,
          notes: dto.notes,
        });
        provider.attachVerificationRecord(record);
      }
    } else if (dto.status === VerificationStatus.REJECTED) {
      if (
        existingRecord &&
        existingRecord.getStatus() === VerificationStatus.PENDING
      ) {
        existingRecord.reject(
          adminId,
          dto.notes || 'Verification rejected by administrator',
        );
      } else {
        const record = new VerificationRecord({
          id:
            existingRecord?.getId() ||
            `vr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          providerId: provider.getId(),
          licenseDocumentUrl: docUrl,
          status: VerificationStatus.REJECTED,
          verifiedByAdminId: adminId,
          notes: dto.notes || 'Verification rejected by administrator',
        });
        provider.attachVerificationRecord(record);
      }
    } else if (dto.status === VerificationStatus.SUSPENDED) {
      if (
        existingRecord &&
        existingRecord.getStatus() === VerificationStatus.VERIFIED
      ) {
        existingRecord.suspend(
          adminId,
          dto.notes || 'Verification suspended by administrator',
        );
      } else {
        const record = new VerificationRecord({
          id:
            existingRecord?.getId() ||
            `vr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          providerId: provider.getId(),
          licenseDocumentUrl: docUrl,
          status: VerificationStatus.SUSPENDED,
          verifiedByAdminId: adminId,
          notes: dto.notes || 'Verification suspended by administrator',
        });
        provider.attachVerificationRecord(record);
      }
    } else {
      // PENDING
      const record = new VerificationRecord({
        id:
          existingRecord?.getId() ||
          `vr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        providerId: provider.getId(),
        licenseDocumentUrl: docUrl,
        status: VerificationStatus.PENDING,
        notes: dto.notes,
      });
      provider.attachVerificationRecord(record);
    }

    await this.providerService.registerProvider(provider);
    return this.mapToResponseDto(provider, undefined, true);
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  private async mapToResponseDto(
    provider: HealthcareProvider,
    treatmentId?: string,
    includePriceEntries: boolean = false,
  ): Promise<ProviderResponseDto> {
    const costRange = this.calculateCostRange(provider);

    let treatmentEstimateDto: ProviderResponseDto['treatmentCostEstimate'];
    if (treatmentId) {
      const estimate = await this.costEstimator.estimate(provider, treatmentId);
      if (estimate.data.hasData) {
        treatmentEstimateDto = {
          hasData: true,
          treatmentId,
          currency: estimate.data.currency,
          price: estimate.data.price,
          minPrice: estimate.data.minPrice,
          maxPrice: estimate.data.maxPrice,
          isRange: estimate.data.isRange,
          isEstimate: estimate.data.isEstimate,
          label: estimate.data.label,
        };
      } else {
        treatmentEstimateDto = {
          hasData: false,
          label: 'Price not available',
        };
      }
    }

    const response: ProviderResponseDto = {
      id: provider.getId(),
      name: provider.getName(),
      type: provider.getType(),
      category: provider.getProviderCategory(),
      cityId: provider.getCityId(),
      address: provider.getAddress(),
      contactNumber: provider.getContactNumber(),
      email: provider.getEmail(),
      websiteUrl: provider.getWebsiteUrl(),
      spokenLanguages: provider.getSpokenLanguageCodes(),
      specialties: provider.getSpecialtyIds(),
      isVerified: provider.isVerified(),
      verificationStatus: provider.getVerificationStatus(),
      averageRating: provider.getAverageRating(),
      totalReviews: provider.getTotalReviews(),
      isActive: provider.getIsActive(),
      costRange,
      treatmentCostEstimate: treatmentEstimateDto,
    };

    if (includePriceEntries) {
      response.priceEntries = provider
        .getPriceEntries()
        .map((entry: PriceEntry) => ({
          id: entry.getId(),
          treatmentId: entry.getTreatmentId(),
          amount: entry.getAmount(),
          currency: entry.getCurrency(),
          isEstimate: entry.getIsEstimate(),
          minPrice: entry.getMinPrice(),
          maxPrice: entry.getMaxPrice(),
          isCurrent: entry.isCurrent(),
          label: entry.getFormattedPrice(),
        }));
    }

    return response;
  }

  /**
   * Computes the aggregated minimum and maximum price range across a provider's active tariffs.
   */
  private calculateCostRange(
    provider: HealthcareProvider,
  ): ProviderCostRangeDto {
    const currentEntries = provider
      .getPriceEntries()
      .filter((entry) => entry.isCurrent());

    if (currentEntries.length === 0) {
      return {
        hasData: false,
        minPrice: null,
        maxPrice: null,
        currency: null,
        label: 'Price not available',
      };
    }

    let min = Infinity;
    let max = -Infinity;
    const currency = currentEntries[0].getCurrency();

    for (const entry of currentEntries) {
      const entryMin = entry.getMinPrice() ?? entry.getAmount();
      const entryMax = entry.getMaxPrice() ?? entry.getAmount();

      if (entryMin < min) min = entryMin;
      if (entryMax > max) max = entryMax;
    }

    const isRange = min !== max;
    const label = isRange
      ? `${currency} ${min} - ${max}`
      : `${currency} ${min.toFixed(2)}`;

    return {
      hasData: true,
      minPrice: min,
      maxPrice: max,
      currency,
      label,
    };
  }
}
