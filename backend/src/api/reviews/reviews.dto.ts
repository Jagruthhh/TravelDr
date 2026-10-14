import {
  IsNotEmpty,
  IsString,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsEnum,
  IsIn,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewStatus } from '../../domain';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'Provider ID is required' })
  @IsString()
  providerId: string;

  @IsNotEmpty({ message: 'Rating is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  rating: number;

  @IsNotEmpty({ message: 'Review comment is required' })
  @IsString()
  @MinLength(5, { message: 'Comment must be at least 5 characters' })
  comment: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsString()
  languageUsed?: string;
}

export class ModerateReviewDto {
  @IsNotEmpty({ message: 'Moderation action status is required' })
  @IsIn([ReviewStatus.APPROVED, ReviewStatus.HIDDEN], {
    message: 'Status must be either APPROVED or HIDDEN',
  })
  status: ReviewStatus.APPROVED | ReviewStatus.HIDDEN;
}

export class GetReviewsQueryDto {
  @IsOptional()
  @IsString()
  providerId?: string;

  @IsOptional()
  @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

export class ReviewResponseDto {
  id: string;
  providerId: string;
  travelerId: string;
  rating: number;
  comment: string;
  languageUsed: string;
  status: ReviewStatus;
  isVerifiedVisit: boolean;
  verificationBadge: string;
  appointmentId?: string;
  caseId?: string;
  createdAt: string;
  updatedAt: string;
}
