import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewService } from '../../services';
import { Review, ReviewStatus, UserRole } from '../../domain';
import {
  CreateReviewDto,
  ModerateReviewDto,
  GetReviewsQueryDto,
  ReviewResponseDto,
} from './reviews.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reviews')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ReviewsController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * POST /reviews (Traveler or Admin)
   * A traveler can create one review (rating 1-5, comment) only for a
   * RESOLVED helpline case or COMPLETED appointment linked to that provider.
   * Stored with status PENDING_MODERATION, marked as "Verified visit".
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TRAVELER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createReview(
    @Body() dto: CreateReviewDto,
    @Req() req: any,
  ): Promise<ReviewResponseDto> {
    const travelerId = req.user?.sub || 'traveler-user';
    const review = await this.reviewService.createReview(dto, travelerId);
    return this.mapToResponse(review);
  }

  /**
   * GET /reviews
   * Retrieves reviews, optionally filtered by providerId and moderation status.
   */
  @Get()
  async getReviews(
    @Query() query: GetReviewsQueryDto,
  ): Promise<ReviewResponseDto[]> {
    let reviews: Review[];

    if (query.providerId) {
      // If status explicitly requested (e.g. admin), query that; else default to APPROVED
      reviews = await this.reviewService.getReviewsForProvider(
        query.providerId,
        query.status ?? ReviewStatus.APPROVED,
      );
    } else {
      reviews = await this.reviewService.getAllReviews(query.status);
    }

    return reviews.map((r) => this.mapToResponse(r));
  }

  /**
   * GET /reviews/:id
   * Retrieves single review by ID.
   */
  @Get(':id')
  async getReviewById(@Param('id') id: string): Promise<ReviewResponseDto> {
    const review = await this.reviewService.getReviewById(id);
    return this.mapToResponse(review);
  }

  /**
   * PATCH /reviews/:id/status (Admin Only)
   * Moderates review: approves or hides it.
   * Automatically recomputes provider averageRating and totalReviews from approved reviews only.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async moderateReviewStatus(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ): Promise<{ review: ReviewResponseDto; ratingStats: { averageRating: number; totalReviews: number } }> {
    const result = await this.reviewService.moderateReview(id, dto.status);
    return {
      review: this.mapToResponse(result.review),
      ratingStats: result.ratingStats,
    };
  }

  /**
   * PATCH /reviews/:id/approve (Admin Only shortcut)
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveReview(
    @Param('id') id: string,
  ): Promise<{ review: ReviewResponseDto; ratingStats: { averageRating: number; totalReviews: number } }> {
    const result = await this.reviewService.approveReview(id);
    return {
      review: this.mapToResponse(result.review),
      ratingStats: result.ratingStats,
    };
  }

  /**
   * PATCH /reviews/:id/hide (Admin Only shortcut)
   */
  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async hideReview(
    @Param('id') id: string,
  ): Promise<{ review: ReviewResponseDto; ratingStats: { averageRating: number; totalReviews: number } }> {
    const result = await this.reviewService.hideReview(id);
    return {
      review: this.mapToResponse(result.review),
      ratingStats: result.ratingStats,
    };
  }

  private mapToResponse(review: Review): ReviewResponseDto {
    return {
      id: review.getId(),
      providerId: review.getProviderId(),
      travelerId: review.getTravelerId(),
      rating: review.getRating(),
      comment: review.getComment(),
      languageUsed: review.getLanguageUsed(),
      status: review.getStatus(),
      isVerifiedVisit: review.getIsVerifiedVisit(),
      verificationBadge: review.getVerificationBadge(),
      appointmentId: review.getAppointmentId(),
      caseId: review.getCaseId(),
      createdAt: review.getCreatedAt().toISOString(),
      updatedAt: review.getUpdatedAt().toISOString(),
    };
  }
}
