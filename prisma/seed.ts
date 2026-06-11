import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // System templates
  const { systemTemplates } = await import(
    "../src/server/services/template.service"
  );
  for (const t of systemTemplates) {
    const existing = await db.template.findFirst({
      where: { isSystem: true, name: t.name },
    });
    if (!existing) {
      await db.template.create({
        data: {
          name: t.name,
          channel: t.channel,
          theme: t.theme as Prisma.InputJsonValue,
          pages: t.pages as Prisma.InputJsonValue,
          isSystem: true,
        },
      });
    }
  }

  // Demo organization + user
  const existingOrg = await db.organization.findUnique({
    where: { slug: "metro-commercial" },
  });
  if (existingOrg) {
    console.log("Seed already applied.");
    return;
  }

  const org = await db.organization.create({
    data: {
      name: "Metro Commercial",
      slug: "metro-commercial",
      branding: { primaryColor: "#0f3057", accentColor: "#1e93b2" },
    },
  });

  const user = await db.user.create({
    data: {
      name: "Demo Broker",
      email: "demo@metrocommercial.com",
      passwordHash: await bcrypt.hash("metro-demo-1234", 10),
    },
  });

  await db.membership.create({
    data: { organizationId: org.id, userId: user.id, role: "OWNER" },
  });

  const property = await db.property.create({
    data: {
      organizationId: org.id,
      name: "Lawrence Park Shopping Center",
      slug: "lawrence-park-shopping-center",
      propertyType: "SHOPPING_CENTER",
      status: "ACTIVE",
      description:
        "Grocery-anchored neighborhood shopping center at a signalized intersection with strong daytime population and regional access.",
      totalGla: 364000,
      yearBuilt: 1972,
      parkingRatio: 5.2,
      address: {
        create: {
          street: "1991 Sproul Road",
          city: "Broomall",
          state: "PA",
          zip: "19008",
          county: "Delaware",
        },
      },
    },
  });

  await db.space.createMany({
    data: [
      {
        organizationId: org.id,
        propertyId: property.id,
        suiteNumber: "101",
        squareFootage: 2400,
        spaceType: "INLINE",
        status: "AVAILABLE",
        askingRate: 28,
        rateType: "NNN",
      },
      {
        organizationId: org.id,
        propertyId: property.id,
        suiteNumber: "115",
        squareFootage: 4800,
        spaceType: "ENDCAP",
        status: "AVAILABLE",
        askingRate: 32,
        rateType: "NNN",
      },
      {
        organizationId: org.id,
        propertyId: property.id,
        suiteNumber: "PAD-1",
        squareFootage: 3200,
        spaceType: "PAD",
        status: "PENDING",
        askingRate: 45,
        rateType: "NNN",
        notes: "Drive-thru capable outparcel",
      },
    ],
  });

  const tenants = await Promise.all(
    [
      { name: "Giant Food Stores", category: "Grocery", isAnchor: true, suite: "100", sf: 62000 },
      { name: "Planet Fitness", category: "Fitness", isAnchor: true, suite: "200", sf: 24000 },
      { name: "Starbucks", category: "Restaurant", isAnchor: false, suite: "110", sf: 1800 },
    ].map(async (t) => {
      const tenant = await db.tenant.create({
        data: { organizationId: org.id, name: t.name, category: t.category },
      });
      await db.tenantOccupancy.create({
        data: {
          propertyId: property.id,
          tenantId: tenant.id,
          suiteNumber: t.suite,
          squareFootage: t.sf,
          isAnchor: t.isAnchor,
        },
      });
      return tenant;
    }),
  );

  const contact = await db.contact.create({
    data: {
      organizationId: org.id,
      name: "Demo Broker",
      title: "Senior Vice President",
      email: "demo@metrocommercial.com",
      phone: "(610) 555-0142",
      license: "PA-RB068000",
    },
  });
  await db.propertyContact.create({
    data: { propertyId: property.id, contactId: contact.id, sortOrder: 0 },
  });

  await db.trafficCount.createMany({
    data: [
      { propertyId: property.id, roadName: "Sproul Road (Rt 320)", count: 24500, year: 2025, source: "PennDOT" },
      { propertyId: property.id, roadName: "West Chester Pike (Rt 3)", count: 38200, year: 2025, source: "PennDOT" },
    ],
  });

  for (const [radius, metrics] of [
    [1, { population: 14820, households: 5630, avgHouseholdIncome: 128400, daytimePopulation: 11200, medianHousingValue: 412000, medianAge: 42.1 }],
    [3, { population: 121400, households: 46900, avgHouseholdIncome: 142800, daytimePopulation: 98400, medianHousingValue: 455000, medianAge: 40.8 }],
    [5, { population: 318600, households: 124200, avgHouseholdIncome: 136200, daytimePopulation: 287300, medianHousingValue: 438000, medianAge: 39.6 }],
  ] as const) {
    await db.demographicDataset.create({
      data: {
        propertyId: property.id,
        provider: "manual",
        geographyType: "RADIUS",
        geographyParams: { radiusMiles: radius },
        metrics,
        asOfDate: new Date(),
      },
    });
  }

  console.log(`Seeded org ${org.slug} with ${tenants.length} tenants.`);
  console.log("Sign in: demo@metrocommercial.com / metro-demo-1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
