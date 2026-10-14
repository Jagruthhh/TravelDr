import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsEmail,
  IsArray,
  IsNumber,
  Min,
  Max,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { VerificationStatus, ProviderType } from '../../domain';

/**
 * Request body DTO for POST /providers (admin only).
 */
export class CreateProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'Provider name is required' })
  name: string;

  @IsEnum(ProviderType, {
    message: 'type must be one of: HOSPITAL, CLINIC, DOCTOR',
  })
  type: ProviderType;

  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MinLength(10, { message: 'Address must be at least 10 characters long' })
  @Matches(/^(?!\s*none\s*$).+/i, { message: 'Address cannot be "none"' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  email: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray({ message: 'Languages must be an array of language codes or names' })
  @IsNotEmpty({ message: 'At least one spoken language is required' })
  languages: string[];

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return value;
  })
  @IsArray({ message: 'Specialties must be an array of specialty names or IDs' })
  @IsNotEmpty({ message: 'At least one specialty is required' })
  specialties: string[];

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  issuingCouncil?: string;

  @IsNotEmpty({ message: 'Consultation fee is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Consultation fee must be a number' })
  @Min(0, { message: 'Consultation fee cannot be negative' })
  @Max(100000, { message: 'Consultation fee cannot exceed 100000' })
  consultationFee: number;
}

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
  registrationNumber?: string;
  issuingCouncil?: string;
  lastVerifiedAt?: Date | string;
  verifiedBy?: string;
  verificationNotes?: string;
  verification?: {
    status: string;
    registrationNumber?: string;
    issuingCouncil?: string;
    lastVerifiedAt?: Date | string;
    verifiedBy?: string;
    verificationNotes?: string;
    verifiedAt?: Date | string;
    expiresAt?: Date | string;
  };
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
