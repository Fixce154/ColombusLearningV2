import { db } from "./db";
import { users, formations, sessions, registrations } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(registrations);
  await db.delete(sessions);
  await db.delete(formations);
  await db.delete(users);
  console.log("✓ Cleared existing data");

  // Create users
  const createdUsers = await db
    .insert(users)
    .values([
      {
        email: "marie.dupont@colombus.fr",
        password: "password", // In production, this would be hashed
        name: "Marie Dupont",
        roles: ["consultant"],
        seniority: "confirme",
        businessUnit: "Digital",
        p1Used: 0,
        p2Used: 0,
      },
      {
        email: "sophie.martin@colombus.fr",
        password: "password",
        name: "Sophie Martin",
        roles: ["consultant", "rh"], // Un RH est forcément consultant
        seniority: "senior",
        businessUnit: "RH",
        p1Used: 0,
        p2Used: 0,
      },
      {
        email: "pierre.bernard@colombus.fr",
        password: "password",
        name: "Pierre Bernard",
        roles: ["formateur"],
        seniority: "expert",
        businessUnit: "Formation",
        p1Used: 0,
        p2Used: 0,
      },
      {
        email: "jean.dubois@colombus.fr",
        password: "password",
        name: "Jean Dubois",
        roles: ["consultant", "manager"], // Un manager est aussi consultant
        seniority: "senior",
        businessUnit: "Digital",
        p1Used: 0,
        p2Used: 0,
      },
    ])
    .returning();
  console.log(`✓ Created ${createdUsers.length} users`);

  // Create formations
  const createdFormations = await db
    .insert(formations)
    .values([
      {
        title: "Leadership et Management d'Équipe",
        description:
          "Développez vos compétences en leadership pour gérer efficacement votre équipe et atteindre vos objectifs.",
        objectives:
          "Maîtriser les techniques de communication, savoir motiver et fédérer une équipe, gérer les conflits.",
        prerequisites: "Expérience managériale souhaitée",
        duration: "3 jours",
        modality: "presentiel",
        seniorityRequired: "confirme",
        theme: "Management",
        tags: ["leadership", "management", "soft-skills"],
        active: true,
      },
      {
        title: "Python pour la Data Science",
        description:
          "Apprenez à utiliser Python pour l'analyse de données, la visualisation et le machine learning.",
        objectives:
          "Maîtriser pandas, numpy, matplotlib et scikit-learn pour l'analyse de données.",
        prerequisites: "Connaissances de base en programmation",
        duration: "5 jours",
        modality: "hybride",
        seniorityRequired: "junior",
        theme: "Technique",
        tags: ["python", "data-science", "machine-learning"],
        active: true,
      },
      {
        title: "Gestion de Projet Agile avec Scrum",
        description:
          "Maîtrisez la méthodologie Scrum pour piloter vos projets avec agilité et efficacité.",
        objectives:
          "Comprendre les principes Agile, implémenter Scrum, gérer un backlog et animer des cérémonies.",
        prerequisites: null,
        duration: "2 jours",
        modality: "distanciel",
        seniorityRequired: "junior",
        theme: "Méthodologie",
        tags: ["agile", "scrum", "gestion-projet"],
        active: true,
      },
      {
        title: "Architecture Cloud AWS",
        description:
          "Concevez et déployez des architectures cloud scalables et sécurisées sur AWS.",
        objectives:
          "Maîtriser les services AWS (EC2, S3, RDS, Lambda), concevoir des architectures hautement disponibles.",
        prerequisites: "Expérience en administration système",
        duration: "4 jours",
        modality: "presentiel",
        seniorityRequired: "confirme",
        theme: "Technique",
        tags: ["cloud", "aws", "architecture"],
        active: true,
      },
      {
        title: "Communication Efficace et Prise de Parole",
        description:
          "Développez votre aisance à l'oral et apprenez à captiver votre audience lors de présentations.",
        objectives:
          "Structurer un discours, gérer son stress, utiliser le langage corporel, répondre aux questions.",
        prerequisites: null,
        duration: "2 jours",
        modality: "presentiel",
        seniorityRequired: "junior",
        theme: "Soft Skills",
        tags: ["communication", "prise-parole", "soft-skills"],
        active: true,
      },
      {
        title: "DevOps et CI/CD avec GitLab",
        description:
          "Automatisez vos déploiements et adoptez une culture DevOps avec les outils GitLab.",
        objectives:
          "Mettre en place des pipelines CI/CD, containeriser avec Docker, orchestrer avec Kubernetes.",
        prerequisites: "Connaissances en développement et Git",
        duration: "3 jours",
        modality: "hybride",
        seniorityRequired: "confirme",
        theme: "Technique",
        tags: ["devops", "ci-cd", "gitlab", "docker", "kubernetes"],
        active: true,
      },
    ])
    .returning();
  console.log(`✓ Created ${createdFormations.length} formations`);

  // Create sessions
  const now = new Date();
  const in2Weeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in1Month = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in2Months = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const sessionsData = [];
  for (const formation of createdFormations) {
    // Create 2-3 sessions per formation
    const sessionCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < sessionCount; i++) {
      const startDate = new Date(
        now.getTime() + (14 + i * 30) * 24 * 60 * 60 * 1000
      );
      const durationDays = parseInt(formation.duration.match(/\d+/)?.[0] || "2");
      const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

      sessionsData.push({
        formationId: formation.id,
        startDate,
        endDate,
        location:
          formation.modality === "distanciel"
            ? "Visio Teams"
            : `Salle ${String.fromCharCode(65 + i)}`,
        capacity: Math.floor(Math.random() * 5) + 10, // 10-15 participants
        instructorId: createdUsers.find((u) => u.roles.includes("formateur"))?.id,
        status: "open",
      });
    }
  }

  const createdSessions = await db.insert(sessions).values(sessionsData).returning();
  console.log(`✓ Created ${createdSessions.length} sessions`);

  // Create some sample registrations
  const consultant = createdUsers.find((u) => u.roles.includes("consultant"));
  if (consultant && createdSessions.length > 0) {
    await db.insert(registrations).values([
      {
        userId: consultant.id,
        sessionId: createdSessions[0].id,
        formationId: createdSessions[0].formationId,
        priority: "P1",
        status: "validated",
      },
      {
        userId: consultant.id,
        sessionId: createdSessions[1].id,
        formationId: createdSessions[1].formationId,
        priority: "P3",
        status: "pending",
      },
    ]);
    console.log("✓ Created sample registrations");
  }

  console.log("✅ Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
