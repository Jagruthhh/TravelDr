import { PrismaClient, ProviderType, VerificationStatus, Currency } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  console.log('Cleaning existing records...');
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.priceEntry.deleteMany();
  await prisma.providerSpecialty.deleteMany();
  await prisma.providerLanguage.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.doctorDetail.deleteMany();
  await prisma.clinicDetail.deleteMany();
  await prisma.hospitalDetail.deleteMany();
  await prisma.verificationRecord.deleteMany();
  await prisma.providerStaff.deleteMany();
  await prisma.message.deleteMany();
  await prisma.helplineCase.deleteMany();
  await prisma.travelerLanguage.deleteMany();
  await prisma.agentLanguage.deleteMany();
  await prisma.traveler.deleteMany();
  await prisma.helplineAgent.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.user.deleteMany();
  await prisma.healthcareProvider.deleteMany();
  await prisma.language.deleteMany();
  await prisma.city.deleteMany();

  // 2. Seed 2 Cities (Hyderabad, Goa)
  console.log('Seeding cities...');
  const hyderabad = await prisma.city.create({
    data: {
      name: 'Hyderabad',
      countryCode: 'IN',
      countryName: 'India',
      timezone: 'Asia/Kolkata',
      emergencyAmbulance: '108',
      emergencyPolice: '100',
      emergencyGeneral: '112',
      latitude: 17.3850,
      longitude: 78.4867,
      isActive: true,
    },
  });

  const goa = await prisma.city.create({
    data: {
      name: 'Goa',
      countryCode: 'IN',
      countryName: 'India',
      timezone: 'Asia/Kolkata',
      emergencyAmbulance: '108',
      emergencyPolice: '100',
      emergencyGeneral: '112',
      latitude: 15.2993,
      longitude: 74.1240,
      isActive: true,
    },
  });

  // 3. Seed 5 Languages
  console.log('Seeding languages...');
  const languagesData = [
    { code: 'en', name: 'English', nativeName: 'English', isRtl: false },
    { code: 'hi', name: 'Hindi', nativeName: 'Hindi', isRtl: false },
    { code: 'te', name: 'Telugu', nativeName: 'Telugu', isRtl: false },
    { code: 'kok', name: 'Konkani', nativeName: 'Konkani', isRtl: false },
    { code: 'ru', name: 'Russian', nativeName: 'Russian', isRtl: false },
  ];

  const languages: Record<string, any> = {};
  for (const lang of languagesData) {
    languages[lang.code] = await prisma.language.create({ data: lang });
  }

  // 4. Seed 8 Specialties & Treatments
  console.log('Seeding specialties and treatments...');
  const specialtiesData = [
    { name: 'Dermatology', description: 'Skin, hair, nail disorders, rashes and allergies' },
    { name: 'General Practice', description: 'Primary health consultations and routine diagnostics' },
    { name: 'Emergency Medicine', description: 'Urgent interventions, trauma care, and acute emergencies' },
    { name: 'Pediatrics', description: 'Comprehensive healthcare for infants, children, and adolescents' },
    { name: 'Orthopedics', description: 'Musculoskeletal system, bone fractures, and joint care' },
    { name: 'Cardiology', description: 'Cardiovascular system, heart evaluations, and ECG screenings' },
    { name: 'Ophthalmology', description: 'Eye conditions, vision tests, and acute eye irritations' },
    { name: 'Dentistry', description: 'Emergency dental relief, cavity care, and oral hygiene' },
  ];

  const specialties: Record<string, any> = {};
  for (const spec of specialtiesData) {
    specialties[spec.name] = await prisma.specialty.create({ data: spec });
  }

  // Treatments for transparent pricing
  const dermTreatment = await prisma.treatment.create({
    data: {
      name: 'Dermatology Consultation & Allergy Assessment',
      description: 'Comprehensive dermatological diagnosis for rashes, tropical infections, and insect bites',
      standardDurationMinutes: 30,
      specialtyId: specialties['Dermatology'].id,
    },
  });

  const gpTreatment = await prisma.treatment.create({
    data: {
      name: 'General Practitioner Consultation',
      description: 'Standard clinical evaluation, vital check, and prescription',
      standardDurationMinutes: 20,
      specialtyId: specialties['General Practice'].id,
    },
  });

  const emergencyTreatment = await prisma.treatment.create({
    data: {
      name: 'Emergency Room Triage & Acute Care',
      description: '24/7 emergency department stabilization and triage fee',
      standardDurationMinutes: 60,
      specialtyId: specialties['Emergency Medicine'].id,
    },
  });

  // 5. Seed an Admin User (for signing off on verified provider records)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin.compliance@fixmyitch.com',
      fullName: 'Dr. Rajesh Sharma',
      phoneNumber: '+919876543210',
      role: 'ADMIN',
      adminProfile: {
        create: {
          department: 'Medical Credentialing & Verification',
          isSuperAdmin: true,
          permissions: ['VERIFY_PROVIDERS', 'MANAGE_CATALOG'],
        },
      },
    },
    include: {
      adminProfile: true,
    },
  });

  const adminProfileId = adminUser.adminProfile!.id;

  // 6. Seed 10 Providers (with 3 verified and 2 pending providers)
  console.log('Seeding 10 healthcare providers...');

  const providersData = [
    // 1. Hospital in Hyderabad (VERIFIED #1)
    {
      name: 'Apollo Health City Jubilee Hills',
      type: ProviderType.HOSPITAL,
      cityId: hyderabad.id,
      address: 'Road No 72, Film Nagar, Jubilee Hills, Hyderabad',
      contactNumber: '+914023607777',
      email: 'jubileehills@apollohealth.com',
      websiteUrl: 'https://www.apollohospitals.com',
      averageRating: 4.8,
      totalReviews: 24,
      hospitalDetail: {
        emergencyDepartment24x7: true,
        totalInpatientBeds: 350,
        traumaLevel: 'Level 1',
        ambulanceServiceAvailable: true,
      },
      verification: {
        status: VerificationStatus.VERIFIED,
        licenseDoc: 'https://cdn.fixmyitch.com/licenses/apollo-hyderabad.pdf',
        verifiedByAdminId: adminProfileId,
        notes: 'State Medical Council verified and JCI accredited facility.',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 year
      },
      languages: ['en', 'hi', 'te'],
      specialties: ['Emergency Medicine', 'Cardiology', 'Dermatology'],
    },

    // 2. Hospital in Goa (VERIFIED #2)
    {
      name: 'Manipal Hospital Goa',
      type: ProviderType.HOSPITAL,
      cityId: goa.id,
      address: 'Dr E Borges Road, Dona Paula, Panaji, Goa',
      contactNumber: '+918322453000',
      email: 'panaji@manipalhospitals.com',
      websiteUrl: 'https://www.manipalhospitals.com/goa',
      averageRating: 4.6,
      totalReviews: 18,
      hospitalDetail: {
        emergencyDepartment24x7: true,
        totalInpatientBeds: 235,
        traumaLevel: 'Level 2',
        ambulanceServiceAvailable: true,
      },
      verification: {
        status: VerificationStatus.VERIFIED,
        licenseDoc: 'https://cdn.fixmyitch.com/licenses/manipal-goa.pdf',
        verifiedByAdminId: adminProfileId,
        notes: 'NABH certified tertiary hospital.',
        expiresAt: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      },
      languages: ['en', 'hi', 'kok', 'ru'],
      specialties: ['Emergency Medicine', 'Orthopedics', 'General Practice'],
    },

    // 3. Clinic in Hyderabad (VERIFIED #3)
    {
      name: 'DermaCare Skin & Allergy Center',
      type: ProviderType.CLINIC,
      cityId: hyderabad.id,
      address: 'Plot 42, Hitec City Main Rd, Madhapur, Hyderabad',
      contactNumber: '+914040123456',
      email: 'contact@dermacarehyderabad.in',
      websiteUrl: 'https://dermacarehyderabad.in',
      averageRating: 4.9,
      totalReviews: 32,
      clinicDetail: {
        allowsWalkIns: true,
        appointmentRequired: false,
        operatingHoursDescription: '08:00 - 20:00 Daily',
        offersTelehealth: true,
      },
      verification: {
        status: VerificationStatus.VERIFIED,
        licenseDoc: 'https://cdn.fixmyitch.com/licenses/dermacare-hyd.pdf',
        verifiedByAdminId: adminProfileId,
        notes: 'Specialist dermatology facility audit complete.',
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
      languages: ['en', 'hi', 'te'],
      specialties: ['Dermatology', 'General Practice'],
    },

    // 4. Clinic in Goa (PENDING #1)
    {
      name: 'Candolim Tourist Health Clinic',
      type: ProviderType.CLINIC,
      cityId: goa.id,
      address: 'Main Candolim Beach Road, Candolim, North Goa',
      contactNumber: '+918322489111',
      email: 'care@candolimclinic.com',
      averageRating: 4.3,
      totalReviews: 8,
      clinicDetail: {
        allowsWalkIns: true,
        appointmentRequired: false,
        operatingHoursDescription: '09:00 - 21:00',
        offersTelehealth: false,
      },
      verification: {
        status: VerificationStatus.PENDING,
        licenseDoc: 'https://cdn.fixmyitch.com/licenses/candolim-clinic.pdf',
        notes: 'Registration submitted, awaiting clinical establishment inspection.',
      },
      languages: ['en', 'hi', 'kok', 'ru'],
      specialties: ['General Practice', 'Emergency Medicine'],
    },

    // 5. Doctor in Hyderabad (PENDING #2)
    {
      name: 'Dr. Ananya Reddy',
      type: ProviderType.DOCTOR,
      cityId: hyderabad.id,
      address: 'Road 10, Banjara Hills, Hyderabad',
      contactNumber: '+919440112233',
      email: 'dr.ananya.reddy@fixmyitch.com',
      averageRating: 4.7,
      totalReviews: 12,
      doctorDetail: {
        medicalLicenseNumber: 'TS-MC-2016-88741',
        yearsOfExperience: 9,
        professionalTitle: 'Dr.',
        acceptsEmergencyCalls: true,
      },
      verification: {
        status: VerificationStatus.PENDING,
        licenseDoc: 'https://cdn.fixmyitch.com/licenses/dr-ananya-reddy.pdf',
        notes: 'Degree credentials verified; state registration certificate validation pending.',
      },
      languages: ['en', 'te', 'hi'],
      specialties: ['Dermatology'],
    },

    // 6. Doctor in Goa
    {
      name: 'Dr. Vikram Dsouza',
      type: ProviderType.DOCTOR,
      cityId: goa.id,
      address: '18th June Road, Panaji, Goa',
      contactNumber: '+919822334455',
      email: 'dr.vikram.dsouza@fixmyitch.com',
      averageRating: 4.9,
      totalReviews: 15,
      doctorDetail: {
        medicalLicenseNumber: 'GOA-MC-2012-34211',
        yearsOfExperience: 14,
        professionalTitle: 'Dr.',
        acceptsEmergencyCalls: true,
      },
      languages: ['en', 'kok', 'hi', 'ru'],
      specialties: ['Dermatology', 'General Practice'],
    },

    // 7. Hospital in Hyderabad
    {
      name: 'Yashoda Hospital Somajiguda',
      type: ProviderType.HOSPITAL,
      cityId: hyderabad.id,
      address: 'Alexander Rd, Somajiguda, Hyderabad',
      contactNumber: '+914045674567',
      email: 'somajiguda@yashodamail.com',
      averageRating: 4.5,
      totalReviews: 40,
      hospitalDetail: {
        emergencyDepartment24x7: true,
        totalInpatientBeds: 400,
        traumaLevel: 'Level 1',
        ambulanceServiceAvailable: true,
      },
      languages: ['en', 'hi', 'te'],
      specialties: ['Emergency Medicine', 'Pediatrics', 'Cardiology'],
    },

    // 8. Clinic in Goa
    {
      name: 'Anjuna Coastal Dental & Medical Care',
      type: ProviderType.CLINIC,
      cityId: goa.id,
      address: 'De Mello Vaddo, Anjuna, Goa',
      contactNumber: '+918322273456',
      email: 'anjuna.med@coastgoa.in',
      averageRating: 4.4,
      totalReviews: 9,
      clinicDetail: {
        allowsWalkIns: true,
        appointmentRequired: false,
        operatingHoursDescription: '10:00 - 19:00',
        offersTelehealth: true,
      },
      languages: ['en', 'hi', 'ru'],
      specialties: ['Dentistry', 'General Practice'],
    },

    // 9. Doctor in Hyderabad
    {
      name: 'Dr. Suresh Varma',
      type: ProviderType.DOCTOR,
      cityId: hyderabad.id,
      address: 'Kondapur Main Road, Hyderabad',
      contactNumber: '+919849012345',
      email: 'dr.suresh.varma@fixmyitch.com',
      averageRating: 4.6,
      totalReviews: 14,
      doctorDetail: {
        medicalLicenseNumber: 'TS-MC-2010-44910',
        yearsOfExperience: 15,
        professionalTitle: 'Dr.',
        acceptsEmergencyCalls: false,
      },
      languages: ['en', 'te'],
      specialties: ['Pediatrics', 'General Practice'],
    },

    // 10. Clinic in Hyderabad
    {
      name: 'Gachibowli Ortho & Sports Injury Clinic',
      type: ProviderType.CLINIC,
      cityId: hyderabad.id,
      address: 'Gachibowli Circle, Near Bio Diversity Park, Hyderabad',
      contactNumber: '+914023005678',
      email: 'care@gachibowliortho.in',
      averageRating: 4.7,
      totalReviews: 19,
      clinicDetail: {
        allowsWalkIns: false,
        appointmentRequired: true,
        operatingHoursDescription: '09:00 - 18:00 Mon-Sat',
        offersTelehealth: true,
      },
      languages: ['en', 'hi', 'te'],
      specialties: ['Orthopedics'],
    },
  ];

  const createdProviders: any[] = [];

  for (const item of providersData) {
    const {
      hospitalDetail,
      clinicDetail,
      doctorDetail,
      verification,
      languages: providerLangs,
      specialties: providerSpecs,
      ...baseData
    } = item;

    const provider = await prisma.healthcareProvider.create({
      data: {
        ...baseData,
        hospitalDetail: hospitalDetail ? { create: hospitalDetail } : undefined,
        clinicDetail: clinicDetail ? { create: clinicDetail } : undefined,
        doctorDetail: doctorDetail ? { create: doctorDetail } : undefined,
        verificationRecord: verification
          ? {
              create: {
                status: verification.status,
                licenseDocumentUrl: verification.licenseDoc,
                verifiedByAdminId: verification.verifiedByAdminId,
                notes: verification.notes ?? '',
                verifiedAt: verification.status === VerificationStatus.VERIFIED ? new Date() : undefined,
                expiresAt: verification.expiresAt,
              },
            }
          : undefined,
        spokenLanguages: {
          create: providerLangs.map((code) => ({
            languageId: languages[code].id,
          })),
        },
        specialties: {
          create: providerSpecs.map((specName) => ({
            specialtyId: specialties[specName].id,
          })),
        },
      },
    });

    createdProviders.push(provider);
  }

  // 7. Seed Price Entries (Fixed and Estimated transparent costs)
  console.log('Seeding transparent price entries...');
  const priceEntriesData = [
    // DermaCare Clinic (Hyderabad) - Dermatology treatment
    {
      providerId: createdProviders[2].id, // DermaCare
      treatmentId: dermTreatment.id,
      amount: 800.0,
      currency: Currency.INR,
      isEstimate: false,
      notes: 'Includes diagnostic examination and dermatoscope skin test',
      includesMedicine: false,
      includesFacilityFee: true,
    },
    // Apollo Hospital (Hyderabad) - Dermatology treatment
    {
      providerId: createdProviders[0].id, // Apollo
      treatmentId: dermTreatment.id,
      amount: 1500.0,
      minAmount: 1200.0,
      maxAmount: 1800.0,
      currency: Currency.INR,
      isEstimate: true,
      notes: 'Consultation with senior consultant dermatologist + skin swab diagnostic',
      includesMedicine: false,
      includesFacilityFee: true,
    },
    // Apollo Hospital (Hyderabad) - Emergency Room Triage
    {
      providerId: createdProviders[0].id, // Apollo
      treatmentId: emergencyTreatment.id,
      amount: 2500.0,
      currency: Currency.INR,
      isEstimate: false,
      notes: 'Emergency registration, vitals monitoring, ER physician intake',
      includesMedicine: false,
      includesFacilityFee: true,
    },
    // Manipal Hospital (Goa) - Emergency Room
    {
      providerId: createdProviders[1].id, // Manipal Goa
      treatmentId: emergencyTreatment.id,
      amount: 2200.0,
      minAmount: 2000.0,
      maxAmount: 3000.0,
      currency: Currency.INR,
      isEstimate: true,
      notes: '24/7 tourist trauma and acute stabilization intake fee',
      includesMedicine: false,
      includesFacilityFee: true,
    },
    // Candolim Clinic (Goa) - GP Consultation
    {
      providerId: createdProviders[3].id, // Candolim Tourist Clinic
      treatmentId: gpTreatment.id,
      amount: 600.0,
      currency: Currency.INR,
      isEstimate: false,
      notes: 'Outpatient clinical visit for acute fever, sunstroke, traveler stomach upset',
      includesMedicine: false,
      includesFacilityFee: true,
    },
    // Dr. Vikram Dsouza (Goa) - Dermatology
    {
      providerId: createdProviders[5].id, // Dr. Vikram Dsouza
      treatmentId: dermTreatment.id,
      amount: 1000.0,
      minAmount: 800.0,
      maxAmount: 1200.0,
      currency: Currency.INR,
      isEstimate: true,
      notes: 'Tropical dermatosis, jellyfish sting, and insect reaction assessment',
      includesMedicine: false,
      includesFacilityFee: true,
    },
  ];

  for (const entry of priceEntriesData) {
    await prisma.priceEntry.create({ data: entry });
  }

  // 8. Verification summary
  const cityCount = await prisma.city.count();
  const providerCount = await prisma.healthcareProvider.count();
  const langCount = await prisma.language.count();
  const specialtyCount = await prisma.specialty.count();
  const priceCount = await prisma.priceEntry.count();
  const verifiedCount = await prisma.verificationRecord.count({
    where: { status: VerificationStatus.VERIFIED },
  });
  const pendingCount = await prisma.verificationRecord.count({
    where: { status: VerificationStatus.PENDING },
  });

  console.log('\n==========================================');
  console.log('✅ Database successfully seeded!');
  console.log(`🏙️  Cities:        ${cityCount} (Hyderabad, Goa)`);
  console.log(`🏥 Providers:     ${providerCount} (10 total)`);
  console.log(`🌐 Languages:     ${langCount} (5 total)`);
  console.log(`🩺 Specialties:   ${specialtyCount} (8 total)`);
  console.log(`💰 Price Entries: ${priceCount}`);
  console.log(`✔  Verified:      ${verifiedCount} providers`);
  console.log(`⏳ Pending:       ${pendingCount} providers`);
  console.log('==========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
