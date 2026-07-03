import { PrismaClient } from "@prisma/client";
import cron from "node-cron";

const prisma = new PrismaClient();

async function recordBackupHeartbeat() {
  const establishments = await prisma.establishment.findMany({
    select: { id: true, name: true }
  });

  for (const establishment of establishments) {
    await prisma.backupJob.create({
      data: {
        establishmentId: establishment.id,
        type: "scheduled",
        status: "PENDING",
        encrypted: true,
        errorMessage:
          "Job planifie cree. Le dump PostgreSQL chiffre sera implemente dans l'etape sauvegarde."
      }
    });

    console.log(`[backup] queued weekly backup for ${establishment.name}`);
  }
}

async function main() {
  console.log("[worker] SchoolSaaS BF worker started");

  cron.schedule("0 2 * * 0", () => {
    void recordBackupHeartbeat().catch((error) => {
      console.error("[worker] backup scheduling failed", error);
    });
  });
}

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

void main();

