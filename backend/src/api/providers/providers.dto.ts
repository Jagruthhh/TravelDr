import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { VerificationStatus } from '../../domain';

/**
 * Query parameters for filtering providers in GET /providers.
 */
export class GetProvidersQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1') return true;
    if (value === 'false' || value === false || value === '0') return false;
    return value;
  })
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsString()
  treatmentId?: string;
}

/**
 * Route parameter validation for GET /providers/:id and PATCH /providers/:id/verification.
 */
export class ProviderIdParamDto {
  @IsString()
  @IsNotEmpty({ message: 'Provider ID is required' })
  id: string;
}

/**
 * Optional query parameter for GET /providers/:id.
 */
export class GetProviderDetailQueryDto {
  @IsOptional()
  @IsString()
  treatmentId?: string;
}

/**
 * Body DTO for PATCH /providers/:id/verification (admin only).
 */
export class UpdateProviderVerificationDto {
  @IsEnum(VerificationStatus, {
    message: 'status must be a valid VerificationStatus (PENDING, VERIFIED, REJECTED, SUSPENDED)',
  })
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  licenseDocumentUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'expiresAt must be a valid ISO 8601 date string' },
  )
  expiresAt?: string;
}

/**
 * Standard cost range metadata representation.
 */
export interface ProviderCostRangeDto {
  hasData: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  currency: string | null;
  label: string;
}

/**
 * Price entry presentation DTO.
 */
export interface PriceEntryDto {
  id: string;
  treatmentId: string;
  amount: number;
  currency: string;
  isEstimate: boolean;
  minPrice?: number;
  maxPrice?: number;
  isCurrent: boolean;
  label: string;
}

/**
 * Detailed Provider response object.
 */
export interface ProviderResponseDto {
  id: string;
  name: string;
  type: string;
  category: string;
  cityId: string;
  address: string;
  contactNumber: string;
  email: string;
  websiteUrl?: string;
  spokenLanguages: string[];
  specialties: string[];
  isVerified: boolean;
  verificationStatus: string;
  averageRating: number;
  totalReviews: number;
  isActive: boolean;
  costRange: ProviderCostRangeDto;
  priceEntries?: PriceEntryDto[];
  treatmentCostEstimate?: {
    hasData: boolean;
    treatmentId?: string;
    currency?: string;
    price?: number;
    minPrice?: number;
    maxPrice?: number;
    isRange?: boolean;
    isEstimate?: boolean;
    label?: string;
  };
}
