import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import {
  Review,
  ReviewStatus,
  HelplineCaseStatus,
  AppointmentStatus,
  HealthcareProvider,
} from '../domain';
import {
  REVIEW_REPOSITORY,
  ReviewRepository,
  CASE_REPOSITORY,
  CaseRepository,
  PROVIDER_REPOSITORY,
  ProviderRepository,
} from '../repositories';
import { PrismaService } from '../common/prisma.service';

export interface CreateReviewInput {
  providerId: string;
  rating: number;
  comment: string;
  appointmentId?: string;
  caseId?: string;
  languageUsed?: string;
}

export interface ReviewRatingStats {
  averageRating: number;
  totalReviews: number;
}

@Injectable()
export class ReviewService {
  // In-memory appointments fallback for testing environments without Prisma DB
  private mockAppointments: Map<
    string,
    {
      id: string;
      providerId: string;
      travelerId: string;
      status: AppointmentStatus;
    }
  > = new Map();

  constructor(
    @Inject(REVIEW_REPOSITORY)
    private readonly reviewRepository: ReviewRepository,
    @Inject(CASE_REPOSITORY)
    private readonly caseRepository: CaseRepository,
    @Inject(PROVIDER_REPOSITORY)
    private readonly providerRepository: ProviderRepository,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  /**
   * Helper for tests to register mock appointments
   */
  public registerMockAppointment(appointment: {
    id: string;
    providerId: string;
    travelerId: string;
    status: AppointmentStatus;
  }): void {
    this.mockAppointments.set(appointment.id, appointment);
  }

  /**
   * Creates a review for a verified visit (RESOLVED helpline case or COMPLETED appointment).
   * Review is created with status PENDING_MODERATION and marked as "Verified visit".
   */
  async createReview(
    dto: CreateReviewInput,
    travelerId: string,
  ): Promise<Review> {
    if (!dto.providerId || dto.providerId.trim() === '') {
      throw new BadRequestException('Provider ID is required');
    }

    if (typeof dto.rating !== 'number' || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be a number between 1 and 5');
    }

    if (!dto.comment || dto.comment.trim().length < 5) {
      throw new BadRequestException('Comment must be at least 5 characters');
    }

    if (!dto.caseId && !dto.appointmentId) {
      throw new BadRequestException(
        'A review must be linked to a RESOLVED helpline case or COMPLETED appointment for this provider',
      );
    }

    // Verify provider exists
    const provider = await this.providerRepository.findById(dto.providerId);
    if (!provider) {
      throw new NotFoundException(
        `Healthcare provider with ID "${dto.providerId}" was not found`,
      );
    }

    // 1. Validate Appointment if provided
    if (dto.appointmentId) {
      const existingReview = await this.reviewRepository.findByAppointmentId(
        dto.appointmentId,
      );
      if (existingReview) {
        throw new ConflictException(
          'A review has already been submitted for this appointment',
        );
      }

      let appointmentStatus: AppointmentStatus | null = null;
      let appointmentProviderId: string | null = null;

      if (this.mockAppointments.has(dto.appointmentId)) {
        const mockAppt = this.mockAppointments.get(dto.appointmentId)!;
        appointmentStatus = mockAppt.status;
        appointmentProviderId = mockAppt.providerId;
      } else if (this.prisma) {
        const record = await this.prisma.appointment.findUnique({
          where: { id: dto.appointmentId },
        });
        if (record) {
          appointmentStatus = record.status as AppointmentStatus;
          appointmentProviderId = record.providerId;
        }
      }

      if (!appointmentStatus) {
        throw new NotFoundException(
          `Appointment with ID "${dto.appointmentId}" was not found`,
        );
      }

      if (appointmentStatus !== AppointmentStatus.COMPLETED) {
        throw new BadRequestException(
          `Reviews can only be created for COMPLETED appointments (current status: ${appointmentStatus})`,
        );
      }

      if (appointmentProviderId !== dto.providerId) {
        throw new BadRequestException(
          'This appointment is not linked to the specified healthcare provider',
        );
      }
    }

    // 2. Validate HelplineCase if provided
    if (dto.caseId) {
      const existingReview = await this.reviewRepository.findByCaseId(
        dto.caseId,
      );
      if (existingReview) {
        throw new ConflictException(
          'A review has already been submitted for this helpline case',
        );
      }

      const helplineCase = await this.caseRepository.findById(dto.caseId);
      if (!helplineCase) {
        throw new NotFoundException(
          `Helpline case with ID "${dto.caseId}" was not found`,
        );
      }

      if (helplineCase.getStatus() !== HelplineCaseStatus.RESOLVED) {
        throw new BadRequestException(
          `Reviews can only be created for RESOLVED helpline cases (current status: ${helplineCase.getStatus()})`,
        );
      }

      if (helplineCase.getRecommendedProviderId() !== dto.providerId) {
        throw new BadRequestException(
          'This helpline case is not linked to the specified healthcare provider',
        );
      }
    }

    const reviewId = `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const review = new Review({
      id: reviewId,
      travelerId: travelerId.trim(),
      providerId: dto.providerId.trim(),
      rating: Math.floor(dto.rating),
      comment: dto.comment.trim(),
      appointmentId: dto.appointmentId?.trim(),
      caseId: dto.caseId?.trim(),
      languageUsed: dto.languageUsed?.trim() || 'en',
      status: ReviewStatus.PENDING_MODERATION,
      isVerifiedVisit: true,
      verificationBadge: 'Verified visit',
      isVerifiedPatient: true,
      createdAt: new Date(),
    });

    await this.reviewRepository.save(review);
    // Note: Do NOT recompute provider ratings here because status is PENDING_MODERATION!

    return review;
  }

  /**
   * Moderates a review (Admin only): approves or hides it.
   * Immediately recomputes averageRating and totalReviews from approved reviews only.
   */
  async moderateReview(
    reviewId: string,
    action: ReviewStatus.APPROVED | ReviewStatus.HIDDEN,
  ): Promise<{ review: Review; ratingStats: ReviewRatingStats }> {
    if (
      action !== ReviewStatus.APPROVED &&
      action !== ReviewStatus.HIDDEN
    ) {
      throw new BadRequestException(
        `Invalid moderation action. Must be ${ReviewStatus.APPROVED} or ${ReviewStatus.HIDDEN}`,
      );
    }

    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" was not found`);
    }

    if (action === ReviewStatus.APPROVED) {
      review.approve();
    } else {
      review.hide();
    }

    await this.reviewRepository.save(review);

    // Recompute provider averageRating and totalReviews strictly from APPROVED reviews
    const ratingStats = await this.recomputeProviderRatingStats(
      review.getProviderId(),
    );

    return { review, ratingStats };
  }

  /**
   * Approves a review (Admin only shortcut).
   */
  async approveReview(
    reviewId: string,
  ): Promise<{ review: Review; ratingStats: ReviewRatingStats }> {
    return this.moderateReview(reviewId, ReviewStatus.APPROVED);
  }

  /**
   * Hides a review (Admin only shortcut).
   */
  async hideReview(
    reviewId: string,
  ): Promise<{ review: Review; ratingStats: ReviewRatingStats }> {
    return this.moderateReview(reviewId, ReviewStatus.HIDDEN);
  }

  /**
   * Computes averageRating and totalReviews strictly from approved reviews for a provider,
   * updates the provider domain entity and database record.
   */
  async recomputeProviderRatingStats(
    providerId: string,
  ): Promise<ReviewRatingStats> {
    const approvedReviews = await this.reviewRepository.findByProviderId(
      providerId,
      ReviewStatus.APPROVED,
    );

    const totalReviews = approvedReviews.length;
    let averageRating = 0;

    if (totalReviews > 0) {
      const sum = approvedReviews.reduce((acc, r) => acc + r.getRating(), 0);
      averageRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    const provider = await this.providerRepository.findById(providerId);
    if (provider) {
      provider.setRatingStats(averageRating, totalReviews);
      await this.providerRepository.save(provider);
    }

    // Direct database update for consistency if Prisma is available
    if (this.prisma) {
      try {
        const exists = await this.prisma.healthcareProvider.findUnique({
          where: { id: providerId },
        });
        if (exists) {
          await this.prisma.healthcareProvider.update({
            where: { id: providerId },
            data: {
              averageRating,
              totalReviews,
            },
          });
        }
      } catch {
        // Silently continue if Prisma DB record is not present (e.g. in-memory test mocks)
      }
    }

    return { averageRating, totalReviews };
  }

  /**
   * Retrieves reviews for a provider.
   * If status is not provided, defaults to APPROVED reviews only.
   */
  async getReviewsForProvider(
    providerId: string,
    status: ReviewStatus = ReviewStatus.APPROVED,
  ): Promise<Review[]> {
    return this.reviewRepository.findByProviderId(providerId, status);
  }

  /**
   * Retrieves all reviews across providers (useful for admin moderation queue).
   */
  async getAllReviews(status?: ReviewStatus): Promise<Review[]> {
    return this.reviewRepository.findAll(status ? { status } : undefined);
  }

  /**
   * Retrieves a single review by ID.
   */
  async getReviewById(id: string): Promise<Review> {
    const review = await this.reviewRepository.findById(id);
    if (!review) {
      throw new NotFoundException(`Review with ID "${id}" was not found`);
    }
    return review;
  }
}
