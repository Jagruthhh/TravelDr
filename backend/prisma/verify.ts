import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  const cities = await prisma.city.findMany({ select: { name: true } });
  const providers = await prisma.healthcareProvider.findMany({
    include: {
      verificationRecord: true,
      city: true,
      spokenLanguages: { include: { language: true } },
      specialties: { include: { specialty: true } },
    },
  });
  const languages = await prisma.language.findMany();
  const specialties = await prisma.specialty.findMany();
  const prices = await prisma.priceEntry.findMany({
    include: { provider: true, treatment: true },
  });

  const verified = providers.filter((p) => p.verificationRecord?.status === 'VERIFIED');
  const pending = providers.filter((p) => p.verificationRecord?.status === 'PENDING');

  console.log('=== DATABASE VERIFICATION SUMMARY ===');
  console.log('Cities (' + cities.length + '):', cities.map((c) => c.name).join(', '));
  console.log('Total Providers:', providers.length);
  console.log('Verified Providers (' + verified.length + '):', verified.map((p) => p.name).join(' | '));
  console.log('Pending Providers (' + pending.length + '):', pending.map((p) => p.name).join(' | '));
  console.log('Languages (' + languages.length + '):', languages.map((l) => `${l.name} (${l.code})`).join(', '));
  console.log('Specialties (' + specialties.length + '):', specialties.map((s) => s.name).join(', '));
  console.log('Price Entries (' + prices.length + '):');
  prices.forEach((pe) => {
    console.log(` - ${pe.provider.name} -> ${pe.treatment.name}: ${pe.currency} ${pe.amount}${pe.isEstimate ? ' (Estimate)' : ' (Fixed)'}`);
  });
  console.log('=====================================');
}

verify()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
