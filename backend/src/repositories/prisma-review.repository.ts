import { Injectable } from '@nestjs/common';
import { Review, ReviewStatus } from '../domain';
import { PrismaService } from '../common/prisma.service';
import {
  ReviewFilter,
  ReviewRepository,
} from './review.repository.interface';

@Injectable()
export class PrismaReviewRepository implements ReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Review | null> {
    const record = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(filter?: ReviewFilter): Promise<Review[]> {
    const where: any = {};

    if (filter?.providerId) {
      where.providerId = filter.providerId;
    }

    if (filter?.travelerId) {
      where.travelerId = filter.travelerId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.caseId) {
      where.caseId = filter.caseId;
    }

    if (filter?.appointmentId) {
      where.appointmentId = filter.appointmentId;
    }

    const records = await this.prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByProviderId(
    providerId: string,
    status?: ReviewStatus,
  ): Promise<Review[]> {
    return this.findAll({ providerId, status });
  }

  async findByAppointmentId(appointmentId: string): Promise<Review | null> {
    const record = await this.prisma.review.findUnique({
      where: { appointmentId },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByCaseId(caseId: string): Promise<Review | null> {
    const record = await this.prisma.review.findUnique({
      where: { caseId },
    });
    return record ? this.toDomain(record) : null;
  }

  async save(review: Review): Promise<void> {
    const id = review.getId();

    let effectiveTravelerId = review.getTravelerId();
    const travelerExists = await this.prisma.traveler.findUnique({
      where: { id: effectiveTravelerId },
    });

    if (!travelerExists) {
      const anyTraveler = await this.prisma.traveler.findFirst();
      if (anyTraveler) {
        effectiveTravelerId = anyTraveler.id;
      }
    }

    await this.prisma.review.upsert({
      where: { id },
      create: {
        id,
        travelerId: effectiveTravelerId,
        providerId: review.getProviderId(),
        rating: review.getRating(),
        comment: review.getComment(),
        languageUsed: review.getLanguageUsed(),
        status: review.getStatus() as any,
        isVerifiedPatient: review.getIsVerifiedPatient(),
        isVerifiedVisit: review.getIsVerifiedVisit(),
        verificationBadge: review.getVerificationBadge(),
        appointmentId: review.getAppointmentId() || undefined,
        caseId: review.getCaseId() || undefined,
        createdAt: review.getCreatedAt(),
        updatedAt: review.getUpdatedAt(),
      },
      update: {
        rating: review.getRating(),
        comment: review.getComment(),
        languageUsed: review.getLanguageUsed(),
        status: review.getStatus() as any,
        isVerifiedPatient: review.getIsVerifiedPatient(),
        isVerifiedVisit: review.getIsVerifiedVisit(),
        verificationBadge: review.getVerificationBadge(),
        updatedAt: review.getUpdatedAt(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({
      where: { id },
    });
  }

  async count(filter?: ReviewFilter): Promise<number> {
    const list = await this.findAll(filter);
    return list.length;
  }

  private toDomain(record: any): Review {
    return new Review({
      id: record.id,
      travelerId: record.travelerId,
      providerId: record.providerId,
      rating: record.rating,
      comment: record.comment,
      languageUsed: record.languageUsed,
      status: record.status as ReviewStatus,
      isVerifiedVisit: record.isVerifiedVisit ?? true,
      verificationBadge: record.verificationBadge ?? 'Verified visit',
      isVerifiedPatient: record.isVerifiedPatient ?? true,
      appointmentId: record.appointmentId ?? undefined,
      caseId: record.caseId ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt ?? record.createdAt,
    });
  }
}
