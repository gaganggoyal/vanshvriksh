import { PrismaClient } from "@prisma/client";

// Seeding builds three families at once; nobody should get "kin found" letters for it.
process.env.VV_NO_NOTIFY = "1";
import { addRelative, createPerson } from "../src/lib/people";
import { scanTreeMatches } from "../src/lib/matching";

const prisma = new PrismaClient();

async function familyPriya() {
  const user = await prisma.user.upsert({
    where: { email: "priya@vanshvriksh.app" },
    update: { emailVerified: new Date(), locale: "en", kinNotifiedAt: null, invitePersonId: "" },
    create: {
      email: "priya@vanshvriksh.app",
      emailVerified: new Date(),
      locale: "en",
    },
  });
  await prisma.tree.deleteMany({ where: { userId: user.id } });
  const tree = await prisma.tree.create({
    data: { userId: user.id, title: "शर्मा वंश वृक्ष" },
  });
  const priya = await createPerson(
    tree.id,
    {
      givenName: "Priya",
      familyName: "Sharma",
      nativeName: "प्रिया शर्मा",
      gender: "FEMALE",
      birthDate: "1995-03-12",
      village: "Jaipur",
      gotra: "Bharadwaj",
    },
    true,
  );
  await prisma.person.update({
    where: { id: priya.id },
    data: { claimedByUserId: user.id },
  });

  const father = await addRelative(tree.id, priya.id, "father", {
    givenName: "Rajesh",
    familyName: "Sharma",
    nativeName: "राजेश शर्मा",
    gender: "MALE",
    birthDate: "1968-07-22",
    village: "Jaipur",
    gotra: "Bharadwaj",
  });
  await addRelative(tree.id, priya.id, "mother", {
    givenName: "Sunita",
    familyName: "Sharma",
    nativeName: "सुनीता शर्मा",
    gender: "FEMALE",
    birthDate: "1971-11-03",
    village: "Jaipur",
  });
  await addRelative(tree.id, priya.id, "sibling", {
    givenName: "Ananya",
    familyName: "Sharma",
    nativeName: "अनन्या शर्मा",
    gender: "FEMALE",
    birthDate: "1998-09-01",
    village: "Jaipur",
  });
  await addRelative(tree.id, father.id, "father", {
    givenName: "Harishankar",
    familyName: "Sharma",
    nativeName: "हरिशंकर शर्मा",
    alsoKnownAs: "Hari Shankar",
    gender: "MALE",
    birthDate: "1940-01-18",
    village: "Jaipur",
    gotra: "Bharadwaj",
    isLiving: false,
    deathDate: "2018-06-04",
  });
  await addRelative(tree.id, father.id, "mother", {
    givenName: "Kamla",
    familyName: "Devi",
    nativeName: "कमला देवी",
    alsoKnownAs: "Kamala Devi",
    gender: "FEMALE",
    birthDate: "1943-05-09",
    village: "Jaipur",
    isLiving: false,
  });
  return tree.id;
}

async function familyArjun() {
  const user = await prisma.user.upsert({
    where: { email: "arjun@vanshvriksh.app" },
    update: { emailVerified: new Date(), locale: "hi", kinNotifiedAt: null, invitePersonId: "" },
    create: {
      email: "arjun@vanshvriksh.app",
      emailVerified: new Date(),
      locale: "hi",
    },
  });
  await prisma.tree.deleteMany({ where: { userId: user.id } });
  const tree = await prisma.tree.create({
    data: { userId: user.id, title: "वंश वृक्ष" },
  });
  const arjun = await createPerson(
    tree.id,
    {
      givenName: "Arjun",
      familyName: "Sharma",
      nativeName: "अर्जुन शर्मा",
      gender: "MALE",
      birthDate: "1992-08-20",
      village: "Jaipur",
      gotra: "Bharadwaj",
    },
    true,
  );
  await prisma.person.update({
    where: { id: arjun.id },
    data: { claimedByUserId: user.id },
  });

  const father = await addRelative(tree.id, arjun.id, "father", {
    givenName: "Vikram",
    familyName: "Sharma",
    nativeName: "विक्रम शर्मा",
    gender: "MALE",
    birthDate: "1965-04-02",
    village: "Jaipur",
    gotra: "Bharadwaj",
  });
  await addRelative(tree.id, arjun.id, "mother", {
    givenName: "Meena",
    familyName: "Sharma",
    nativeName: "मीना शर्मा",
    gender: "FEMALE",
    birthDate: "1968-12-11",
    village: "Jaipur",
  });
  await addRelative(tree.id, arjun.id, "spouse", {
    givenName: "Diya",
    familyName: "Sharma",
    nativeName: "दिया शर्मा",
    gender: "FEMALE",
    birthDate: "1993-02-14",
    village: "Udaipur",
  });
  await addRelative(tree.id, arjun.id, "child", {
    givenName: "Kabir",
    familyName: "Sharma",
    nativeName: "कबीर शर्मा",
    gender: "MALE",
    birthDate: "2019-11-02",
    village: "Jaipur",
  });
  await addRelative(tree.id, father.id, "father", {
    givenName: "Hari Shankar",
    familyName: "Sharma",
    nativeName: "हरि शंकर शर्मा",
    alsoKnownAs: "Harishankar",
    gender: "MALE",
    birthDate: "1940-01-18",
    village: "Jaipur",
    gotra: "Bharadwaj",
    isLiving: false,
  });
  await addRelative(tree.id, father.id, "mother", {
    givenName: "Kamala",
    familyName: "Devi",
    nativeName: "कमला देवी",
    alsoKnownAs: "Kamla Devi",
    gender: "FEMALE",
    birthDate: "1943-05-09",
    village: "Jaipur",
    isLiving: false,
  });
  return tree.id;
}

/** Priya's मामा — her mother's brother. His tree holds Priya's mother and her departed parents. */
async function familyMahesh() {
  const user = await prisma.user.upsert({
    where: { email: "mahesh@vanshvriksh.app" },
    update: { emailVerified: new Date(), locale: "hi", kinNotifiedAt: null, invitePersonId: "" },
    create: { email: "mahesh@vanshvriksh.app", emailVerified: new Date(), locale: "hi" },
  });
  await prisma.tree.deleteMany({ where: { userId: user.id } });
  const tree = await prisma.tree.create({ data: { userId: user.id, title: "तिवारी वंश वृक्ष" } });
  const mahesh = await createPerson(
    tree.id,
    {
      givenName: "Mahesh",
      familyName: "Tiwari",
      nativeName: "महेश तिवारी",
      gender: "MALE",
      birthDate: "1974-02-15",
      village: "Ajmer",
      gotra: "Kashyap",
    },
    true,
  );
  await prisma.person.update({ where: { id: mahesh.id }, data: { claimedByUserId: user.id } });

  const father = await addRelative(tree.id, mahesh.id, "father", {
    givenName: "Ramprasad",
    familyName: "Tiwari",
    nativeName: "रामप्रसाद तिवारी",
    gender: "MALE",
    birthDate: "1942-08-10",
    village: "Ajmer",
    gotra: "Kashyap",
    isLiving: false,
    deathDate: "2011-01-20",
  });
  await addRelative(tree.id, mahesh.id, "mother", {
    givenName: "Savitri",
    familyName: "Tiwari",
    nativeName: "सावित्री तिवारी",
    gender: "FEMALE",
    birthDate: "1946-03-21",
    village: "Ajmer",
    isLiving: false,
  });
  // Written by her brother with her married name, and her maiden name as an alias.
  await addRelative(tree.id, mahesh.id, "sibling", {
    givenName: "Sunita",
    familyName: "Sharma",
    nativeName: "सुनीता शर्मा",
    alsoKnownAs: "Sunita Tiwari",
    gender: "FEMALE",
    birthDate: "1971-11-03",
    village: "Jaipur",
  });
  await addRelative(tree.id, mahesh.id, "spouse", {
    givenName: "Rekha",
    familyName: "Tiwari",
    nativeName: "रेखा तिवारी",
    gender: "FEMALE",
    birthDate: "1977-06-30",
    village: "Ajmer",
  });
  await addRelative(tree.id, mahesh.id, "child", {
    givenName: "Kartik",
    familyName: "Tiwari",
    nativeName: "कार्तिक तिवारी",
    gender: "MALE",
    birthDate: "2003-09-12",
    village: "Ajmer",
  });
  await addRelative(tree.id, father.id, "father", {
    givenName: "Shivcharan",
    familyName: "Tiwari",
    nativeName: "शिवचरण तिवारी",
    gender: "MALE",
    birthDate: "1915-04-02",
    village: "Ajmer",
    gotra: "Kashyap",
    isLiving: false,
  });
  return tree.id;
}

async function main() {
  const a = await familyPriya();
  const b = await familyArjun();
  const c = await familyMahesh();
  for (const id of [a, b, c]) await scanTreeMatches(id);
  await prisma.user.updateMany({
    where: { email: { in: ["priya@vanshvriksh.app", "arjun@vanshvriksh.app", "mahesh@vanshvriksh.app"] } },
    data: { kinNotifiedAt: null },
  });
  const matches = await prisma.match.count({
    where: {
      OR: [a, b, c].flatMap((treeId) => [{ personA: { treeId } }, { personB: { treeId } }]),
    },
  });
  console.log(`Seeded Priya, Arjun & Mahesh trees. Demo matches: ${matches}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
