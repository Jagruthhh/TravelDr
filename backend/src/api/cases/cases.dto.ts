import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import {
  HelplineCaseStatus,
  HelplineUrgency,
  HelplineCasePriority,
} from '../../domain';

/**
 * Body DTO for POST /cases.
 */
export class CreateCaseRequestDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty({ message: 'Traveler ID is required' })
  travelerId: string;

  @IsString()
  @IsNotEmpty({ message: 'City ID is required' })
  cityId: string;

  @IsString()
  @IsNotEmpty({ message: 'Subject is required' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'Initial description is required' })
  initialDescription: string;

  @IsString()
  @IsNotEmpty({ message: 'Preferred language code is required' })
  preferredLanguageCode: string;

  @IsOptional()
  @IsEnum(HelplineUrgency, {
    message: 'urgency must be a valid HelplineUrgency (EMERGENCY, URGENT, ROUTINE)',
  })
  urgency?: HelplineUrgency;

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean;
}

/**
 * Route parameter validation for GET /cases/:id and PATCH /cases/:id/status.
 */
export class CaseIdParamDto {
  @IsString()
  @IsNotEmpty({ message: 'Case ID is required' })
  id: string;
}

/**
 * Body DTO for PATCH /cases/:id/status (agent only).
 */
export class UpdateCaseStatusDto {
  @IsEnum(HelplineCaseStatus, {
    message:
      'status must be a valid HelplineCaseStatus (NEW, ASSIGNED, RECOMMENDED, RESOLVED, CLOSED)',
  })
  status: HelplineCaseStatus;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(HelplineUrgency, {
    message: 'urgency must be a valid HelplineUrgency (EMERGENCY, URGENT, ROUTINE)',
  })
  urgency?: HelplineUrgency;
}

/**
 * Serialized HelplineCase response DTO.
 */
export interface CaseResponseDto {
  id: string;
  travelerId: string;
  cityId: string;
  agentId?: string;
  status: HelplineCaseStatus;
  urgency: HelplineUrgency;
  priority: HelplineCasePriority;
  subject: string;
  initialDescription: string;
  preferredLanguageCode: string;
  recommendedProviderId?: string;
  recommendationNotes?: string;
  resolutionSummary?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
