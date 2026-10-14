import { Injectable } from '@nestjs/common';
import {
  HealthcareProvider,
  Hospital,
  Clinic,
  Doctor,
  VerificationRecord,
  PriceEntry,
  ProviderType,
} from '../domain';
import { PrismaService } from '../common/prisma.service';
import {
  ProviderFilter,
  ProviderRepository,
} from './provider.repository.interface';

const providerInclude = {
  hospitalDetail: true,
  clinicDetail: true,
  doctorDetail: true,
  verificationRecord: true,
  priceEntries: true,
  spokenLanguages: {
    include: {
      language: true,
    },
  },
  specialties: {
    include: {
      specialty: true,
    },
  },
};

@Injectable()
export class PrismaProviderRepository implements ProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<HealthcareProvider | null> {
    const record = await this.prisma.healthcareProvider.findUnique({
      where: { id },
      include: providerInclude,
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async findAll(filter?: ProviderFilter): Promise<HealthcareProvider[]> {
    const where: any = {};

    if (filter?.cityId) {
      where.cityId = filter.cityId;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.isVerified !== undefined) {
      where.verificationRecord = {
        status: filter.isVerified ? 'VERIFIED' : { not: 'VERIFIED' },
      };
    }

    if (filter?.specialtyId) {
      where.specialties = {
        some: {
          specialtyId: filter.specialtyId,
        },
      };
    }

    if (filter?.languageCode) {
      where.spokenLanguages = {
        some: {
          language: {
            code: filter.languageCode.toLowerCase(),
          },
        },
      };
    }

    if (filter?.searchTerm) {
      where.name = {
        contains: filter.searchTerm,
        mode: 'insensitive',
      };
    }

    const records = await this.prisma.healthcareProvider.findMany({
      where,
      include: providerInclude,
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByCity(cityId: string): Promise<HealthcareProvider[]> {
    return this.findAll({ cityId });
  }

  async findByLanguage(languageCode: string): Promise<HealthcareProvider[]> {
    return this.findAll({ languageCode });
  }

  async findBySpecialty(specialtyId: string): Promise<HealthcareProvider[]> {
    return this.findAll({ specialtyId });
  }

  async save(provider: HealthcareProvider): Promise<void> {
    const id = provider.getId();
    const type = provider.getType();

    const baseData = {
      name: provider.getName(),
      type: type as any,
      cityId: provider.getCityId(),
      address: provider.getAddress(),
      contactNumber: provider.getContactNumber(),
      email: provider.getEmail(),
      websiteUrl: provider.getWebsiteUrl(),
      averageRating: provider.getAverageRating(),
      totalReviews: provider.getTotalReviews(),
      isActive: provider.getIsActive(),
    };

    await this.prisma.healthcareProvider.upsert({
      where: { id },
      create: {
        id,
        ...baseData,
      },
      update: {
        ...baseData,
      },
    });

    // Save type-specific details
    if (provider instanceof Hospital) {
      await this.prisma.hospitalDetail.upsert({
        where: { providerId: id },
        create: {
          providerId: id,
          emergencyDepartment24x7: provider.getEmergencyDepartment24x7(),
          totalInpatientBeds: provider.getTotalInpatientBeds(),
          traumaLevel: provider.getTraumaLevel(),
          ambulanceServiceAvailable: provider.getAmbulanceServiceAvailable(),
        },
        update: {
          emergencyDepartment24x7: provider.getEmergencyDepartment24x7(),
          totalInpatientBeds: provider.getTotalInpatientBeds(),
          traumaLevel: provider.getTraumaLevel(),
          ambulanceServiceAvailable: provider.getAmbulanceServiceAvailable(),
        },
      });
    } else if (provider instanceof Clinic) {
      await this.prisma.clinicDetail.upsert({
        where: { providerId: id },
        create: {
          providerId: id,
          allowsWalkIns: provider.getAllowsWalkIns(),
          appointmentRequired: provider.getAppointmentRequired(),
          operatingHoursDescription: provider.getOperatingHoursDescription(),
          offersTelehealth: provider.getOffersTelehealth(),
        },
        update: {
          allowsWalkIns: provider.getAllowsWalkIns(),
          appointmentRequired: provider.getAppointmentRequired(),
          operatingHoursDescription: provider.getOperatingHoursDescription(),
          offersTelehealth: provider.getOffersTelehealth(),
        },
      });
    } else if (provider instanceof Doctor) {
      await this.prisma.doctorDetail.upsert({
        where: { providerId: id },
        create: {
          providerId: id,
          medicalLicenseNumber: provider.getMedicalLicenseNumber(),
          yearsOfExperience: provider.getYearsOfExperience(),
          professionalTitle: provider.getProfessionalTitle(),
          affiliatedFacilityId: provider.getAffiliatedFacilityId(),
          acceptsEmergencyCalls: provider.getAcceptsEmergencyCalls(),
        },
        update: {
          yearsOfExperience: provider.getYearsOfExperience(),
          professionalTitle: provider.getProfessionalTitle(),
          affiliatedFacilityId: provider.getAffiliatedFacilityId(),
          acceptsEmergencyCalls: provider.getAcceptsEmergencyCalls(),
        },
      });
    }

    // Save verification record if present
    const vRecord = provider.getVerificationRecord();
    if (vRecord) {
      await this.prisma.verificationRecord.upsert({
        where: { providerId: id },
        create: {
          id: vRecord.getId(),
          providerId: id,
          status: vRecord.getStatus() as any,
          licenseDocumentUrl: vRecord.getLicenseDocumentUrl(),
          verifiedByAdminId: vRecord.getVerifiedByAdminId(),
          notes: vRecord.getNotes(),
          registrationNumber: vRecord.getRegistrationNumber(),
          issuingCouncil: vRecord.getIssuingCouncil(),
          lastVerifiedAt: vRecord.getLastVerifiedAt(),
          verifiedBy: vRecord.getVerifiedBy(),
          verificationNotes: vRecord.getVerificationNotes(),
          verifiedAt: vRecord.getVerifiedAt(),
          expiresAt: vRecord.getExpiresAt(),
        },
        update: {
          status: vRecord.getStatus() as any,
          licenseDocumentUrl: vRecord.getLicenseDocumentUrl(),
          verifiedByAdminId: vRecord.getVerifiedByAdminId(),
          notes: vRecord.getNotes(),
          registrationNumber: vRecord.getRegistrationNumber(),
          issuingCouncil: vRecord.getIssuingCouncil(),
          lastVerifiedAt: vRecord.getLastVerifiedAt(),
          verifiedBy: vRecord.getVerifiedBy(),
          verificationNotes: vRecord.getVerificationNotes(),
          verifiedAt: vRecord.getVerifiedAt(),
          expiresAt: vRecord.getExpiresAt(),
        },
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.healthcareProvider.delete({
      where: { id },
    });
  }

  async count(filter?: ProviderFilter): Promise<number> {
    const list = await this.findAll(filter);
    return list.length;
  }

  private toDomain(record: any): HealthcareProvider {
    const spokenLanguageCodes = (record.spokenLanguages || []).map(
      (sl: any) => sl.language?.code || '',
    );
    const specialtyIds = (record.specialties || []).map(
      (s: any) => s.specialty?.name || s.specialtyId,
    );

    const verificationRecord = record.verificationRecord
      ? new VerificationRecord({
          id: record.verificationRecord.id,
          providerId: record.verificationRecord.providerId,
          licenseDocumentUrl: record.verificationRecord.licenseDocumentUrl,
          status: record.verificationRecord.status as any,
          verifiedByAdminId: record.verificationRecord.verifiedByAdminId ?? undefined,
          notes: record.verificationRecord.notes,
          registrationNumber: record.verificationRecord.registrationNumber ?? undefined,
          issuingCouncil: record.verificationRecord.issuingCouncil ?? undefined,
          lastVerifiedAt: record.verificationRecord.lastVerifiedAt ?? record.verificationRecord.verifiedAt ?? undefined,
          verifiedBy: record.verificationRecord.verifiedBy ?? undefined,
          verificationNotes: record.verificationRecord.verificationNotes ?? record.verificationRecord.notes ?? undefined,
          verifiedAt: record.verificationRecord.verifiedAt ?? undefined,
          expiresAt: record.verificationRecord.expiresAt ?? undefined,
        })
      : undefined;

    const priceEntries = (record.priceEntries || []).map(
      (pe: any) =>
        new PriceEntry({
          id: pe.id,
          providerId: pe.providerId,
          treatmentId: pe.treatmentId,
          amount: pe.amount,
          currency: pe.currency as any,
          isEstimate: pe.isEstimate,
          minAmount: pe.minAmount ?? undefined,
          maxAmount: pe.maxAmount ?? undefined,
          notes: pe.notes,
          includesMedicine: pe.includesMedicine,
          includesFacilityFee: pe.includesFacilityFee,
          effectiveFrom: pe.effectiveFrom,
          effectiveUntil: pe.effectiveUntil ?? undefined,
        }),
    );

    const baseParams = {
      id: record.id,
      name: record.name,
      type: record.type as ProviderType,
      cityId: record.cityId,
      address: record.address,
      contactNumber: record.contactNumber,
      email: record.email,
      websiteUrl: record.websiteUrl ?? undefined,
      spokenLanguageCodes,
      specialtyIds,
      verificationRecord,
      priceEntries,
      averageRating: record.averageRating,
      totalReviews: record.totalReviews,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    if (record.type === ProviderType.HOSPITAL) {
      return new Hospital({
        ...baseParams,
        emergencyDepartment24x7:
          record.hospitalDetail?.emergencyDepartment24x7 ?? true,
        totalInpatientBeds: record.hospitalDetail?.totalInpatientBeds ?? 50,
        traumaLevel: record.hospitalDetail?.traumaLevel ?? undefined,
        ambulanceServiceAvailable:
          record.hospitalDetail?.ambulanceServiceAvailable ?? true,
      });
    }

    if (record.type === ProviderType.CLINIC) {
      return new Clinic({
        ...baseParams,
        allowsWalkIns: record.clinicDetail?.allowsWalkIns ?? true,
        appointmentRequired: record.clinicDetail?.appointmentRequired ?? false,
        operatingHoursDescription:
          record.clinicDetail?.operatingHoursDescription ?? '09:00 - 18:00',
        offersTelehealth: record.clinicDetail?.offersTelehealth ?? false,
      });
    }

    if (record.type === ProviderType.DOCTOR) {
      return new Doctor({
        ...baseParams,
        medicalLicenseNumber:
          record.doctorDetail?.medicalLicenseNumber ?? 'UNKNOWN',
        yearsOfExperience: record.doctorDetail?.yearsOfExperience ?? 0,
        professionalTitle: record.doctorDetail?.professionalTitle ?? 'Dr.',
        affiliatedFacilityId:
          record.doctorDetail?.affiliatedFacilityId ?? undefined,
        acceptsEmergencyCalls:
          record.doctorDetail?.acceptsEmergencyCalls ?? false,
      });
    }

    throw new Error(`Unsupported provider type: ${record.type}`);
  }
}
