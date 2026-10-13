import { Injectable } from '@nestjs/common';
import {
  HelplineCase,
  HelplineCaseStatus,
  Message,
} from '../domain';
import { PrismaService } from '../common/prisma.service';
import { CaseFilter, CaseRepository } from './case.repository.interface';

const caseInclude = {
  messages: {
    orderBy: {
      sentAt: 'asc' as const,
    },
  },
};

@Injectable()
export class PrismaCaseRepository implements CaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<HelplineCase | null> {
    const record = await this.prisma.helplineCase.findUnique({
      where: { id },
      include: caseInclude,
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(filter?: CaseFilter): Promise<HelplineCase[]> {
    const where: any = {};

    if (filter?.travelerId) {
      where.travelerId = filter.travelerId;
    }

    if (filter?.agentId) {
      where.agentId = filter.agentId;
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    if (filter?.urgency) {
      where.urgency = filter.urgency;
    }

    if (filter?.cityId) {
      where.cityId = filter.cityId;
    }

    const records = await this.prisma.helplineCase.findMany({
      where,
      include: caseInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByTravelerId(travelerId: string): Promise<HelplineCase[]> {
    return this.findAll({ travelerId });
  }

  async findByAgentId(agentId: string): Promise<HelplineCase[]> {
    return this.findAll({ agentId });
  }

  async findByStatus(status: HelplineCaseStatus): Promise<HelplineCase[]> {
    return this.findAll({ status });
  }

  async save(helplineCase: HelplineCase): Promise<void> {
    const id = helplineCase.getId();

    let effectiveTravelerId = helplineCase.getTravelerId();
    const travelerExists = await this.prisma.traveler.findUnique({
      where: { id: effectiveTravelerId },
    });
    if (!travelerExists) {
      const anyTraveler = await this.prisma.traveler.findFirst();
      if (anyTraveler) {
        effectiveTravelerId = anyTraveler.id;
      }
    }

    let effectiveCityId = helplineCase.getCityId();
    const cityExists = await this.prisma.city.findUnique({
      where: { id: effectiveCityId },
    });
    if (!cityExists) {
      const anyCity = await this.prisma.city.findFirst();
      if (anyCity) {
        effectiveCityId = anyCity.id;
      }
    }

    const data = {
      travelerId: effectiveTravelerId,
      cityId: effectiveCityId,
      agentId: helplineCase.getAgentId(),
      subject: helplineCase.getSubject(),
      initialDescription: helplineCase.getInitialDescription(),
      preferredLanguageCode: helplineCase.getPreferredLanguageCode(),
      status: helplineCase.getStatus() as any,
      urgency: helplineCase.getUrgency() as any,
      priority: helplineCase.getPriority() as any,
      recommendedProviderId: helplineCase.getRecommendedProviderId(),
      recommendationNotes: helplineCase.getRecommendationNotes(),
      resolutionSummary: helplineCase.getResolutionSummary(),
      resolvedAt: helplineCase.getResolvedAt(),
    };

    await this.prisma.helplineCase.upsert({
      where: { id },
      create: {
        id,
        ...data,
      },
      update: {
        ...data,
      },
    });

    // Persist any messages that don't yet exist
    for (const msg of helplineCase.getMessages()) {
      await this.prisma.message.upsert({
        where: { id: msg.getId() },
        create: {
          id: msg.getId(),
          caseId: id,
          senderId: msg.getSenderId(),
          senderName: msg.getSenderName(),
          content: msg.getContent(),
          isInternalNote: msg.getIsInternalNote(),
          attachments: msg.getAttachments(),
          sentAt: msg.getSentAt(),
        },
        update: {
          content: msg.getContent(),
          isInternalNote: msg.getIsInternalNote(),
          attachments: msg.getAttachments(),
        },
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.helplineCase.delete({
      where: { id },
    });
  }

  async count(filter?: CaseFilter): Promise<number> {
    const list = await this.findAll(filter);
    return list.length;
  }

  private toDomain(record: any): HelplineCase {
    const messages = (record.messages || []).map(
      (m: any) =>
        new Message({
          id: m.id,
          caseId: m.caseId,
          senderId: m.senderId,
          senderName: m.senderName,
          content: m.content,
          isInternalNote: m.isInternalNote,
          attachments: m.attachments || [],
          sentAt: m.sentAt,
        }),
    );

    return new HelplineCase({
      id: record.id,
      travelerId: record.travelerId,
      cityId: record.cityId,
      subject: record.subject,
      initialDescription: record.initialDescription,
      preferredLanguageCode: record.preferredLanguageCode,
      agentId: record.agentId ?? undefined,
      status: record.status as any,
      urgency: record.urgency as any,
      priority: record.priority as any,
      messages,
      recommendedProviderId: record.recommendedProviderId ?? undefined,
      recommendationNotes: record.recommendationNotes ?? undefined,
      resolutionSummary: record.resolutionSummary ?? undefined,
      resolvedAt: record.resolvedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
