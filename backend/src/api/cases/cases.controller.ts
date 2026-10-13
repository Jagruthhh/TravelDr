import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { HelplineService } from '../../services';
import {
  HelplineCase,
  HelplineCaseStatus,
  UserRole,
} from '../../domain';
import {
  CreateCaseRequestDto,
  CaseIdParamDto,
  UpdateCaseStatusDto,
  CaseResponseDto,
} from './cases.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Controller managing emergency helpline cases:
 * - GET /cases (List cases, optionally filtered by status)
 * - POST /cases (Open emergency/concierge case)
 * - GET /cases/:id (Retrieve case status and recommendations)
 * - PATCH /cases/:id/status (Agent only: move state through ASSIGNED, RECOMMENDED, RESOLVED, CLOSED)
 */
@Controller('cases')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CasesController {
  constructor(private readonly helplineService: HelplineService) {}

  /**
   * GET /cases
   * Retrieves cases, optionally filtered by status.
   */
  @Get()
  async getCases(
    @Query('status') status?: HelplineCaseStatus,
  ): Promise<CaseResponseDto[]> {
    const cases = await this.helplineService.findCases(
      status ? { status } : undefined,
    );
    return cases.map((c) => this.serializeCase(c));
  }

  /**
   * POST /cases
   * Opens a new emergency helpline concierge case.
   */
  @Post()
  async createCase(
    @Body() dto: CreateCaseRequestDto,
  ): Promise<CaseResponseDto> {
    const helplineCase = await this.helplineService.createCase(dto);
    return this.serializeCase(helplineCase);
  }

  /**
   * GET /cases/:id
   * Retrieves case details and active progression state.
   */
  @Get(':id')
  async getCaseById(
    @Param() params: CaseIdParamDto,
  ): Promise<CaseResponseDto> {
    const helplineCase = await this.helplineService.getCaseById(params.id);
    return this.serializeCase(helplineCase);
  }

  /**
   * PATCH /cases/:id/status (Agent only)
   * Advances case lifecycle: ASSIGNED -> RECOMMENDED -> RESOLVED -> CLOSED.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HELPLINE_AGENT, UserRole.ADMIN)
  async updateCaseStatus(
    @Param() params: CaseIdParamDto,
    @Body() dto: UpdateCaseStatusDto,
    @Req() req: any,
  ): Promise<CaseResponseDto> {
    const caseId = params.id;

    // Apply optional urgency escalation first if requested
    if (dto.urgency) {
      await this.helplineService.escalate(caseId, dto.urgency);
    }

    let updatedCase: HelplineCase;

    switch (dto.status) {
      case HelplineCaseStatus.ASSIGNED: {
        const agentId = dto.agentId || req.user?.sub;
        if (!agentId) {
          throw new BadRequestException('Agent ID is required for assignment');
        }
        updatedCase = await this.helplineService.assign(caseId, agentId);
        break;
      }

      case HelplineCaseStatus.RECOMMENDED: {
        if (!dto.providerId || dto.providerId.trim() === '') {
          throw new BadRequestException(
            'providerId is required to recommend a provider',
          );
        }
        updatedCase = await this.helplineService.recommend(
          caseId,
          dto.providerId,
          dto.notes,
        );
        break;
      }

      case HelplineCaseStatus.RESOLVED: {
        if (!dto.summary || dto.summary.trim().length < 5) {
          throw new BadRequestException(
            'Detailed resolution summary is required to resolve case (minimum 5 characters)',
          );
        }
        updatedCase = await this.helplineService.resolve(
          caseId,
          dto.summary,
        );
        break;
      }

      case HelplineCaseStatus.CLOSED: {
        updatedCase = await this.helplineService.close(caseId);
        break;
      }

      default: {
        updatedCase = await this.helplineService.getCaseById(caseId);
      }
    }

    return this.serializeCase(updatedCase);
  }

  private serializeCase(c: HelplineCase): CaseResponseDto {
    return {
      id: c.getId(),
      travelerId: c.getTravelerId(),
      cityId: c.getCityId(),
      agentId: c.getAgentId(),
      status: c.getStatus(),
      urgency: c.getUrgency(),
      priority: c.getPriority(),
      subject: c.getSubject(),
      initialDescription: c.getInitialDescription(),
      preferredLanguageCode: c.getPreferredLanguageCode(),
      recommendedProviderId: c.getRecommendedProviderId(),
      recommendationNotes: c.getRecommendationNotes(),
      resolutionSummary: c.getResolutionSummary(),
      resolvedAt: c.getResolvedAt(),
      createdAt: c.getCreatedAt(),
      updatedAt: c.getUpdatedAt(),
    };
  }
}
