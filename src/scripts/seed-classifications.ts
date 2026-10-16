
import mongoose from "mongoose";
import { env } from "../config/env";
import { ClassificationRule } from "../models/ClassificationRule";

const DEFAULT_CLASSIFICATIONS = [
  {
    name: "Support",
    minEspees: 1,
    maxEspees: 10,
    nairaEquivalent: 20_500,
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Pass",
    minEspees: 10.01,
    maxEspees: 49.99,
    nairaEquivalent: 99_999,
    displayOrder: 2,
    isActive: true,
  },
  {
    name: "Free Kick",
    minEspees: 50,
    maxEspees: 121.99,
    nairaEquivalent: 100_000,
    displayOrder: 3,
    isActive: true,
  },
  {
    name: "Goal",
    minEspees: 122,
    maxEspees: 488.99,
    nairaEquivalent: 250_000,
    displayOrder: 4,
    isActive: true,
  },
  {
    name: "Golden Boot",
    minEspees: 489,
    maxEspees: 2_499.99,
    nairaEquivalent: 1_000_000,
    displayOrder: 5,
    isActive: true,
  },
  {
    name: "Wonder",
    minEspees: 2_500,
    maxEspees: null,
    nairaEquivalent: 5_000_000,
    displayOrder: 6,
    isActive: true,
  },
] as const;

async function seedClassifications(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });

  let inserted = 0;
  let preserved = 0;

  for (const classification of DEFAULT_CLASSIFICATIONS) {
    const result = await ClassificationRule.updateOne(
      { name: classification.name },
      {
        $setOnInsert: classification,
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
      console.log(`Created classification: ${classification.name}`);
    } else {
      preserved += 1;
      console.log(
        `Preserved existing classification: ${classification.name}`,
      );
    }
  }

  console.log(
    `Classification seeding complete. Created: ${inserted}; preserved: ${preserved}.`,
  );
}

seedClassifications()
  .catch((error: unknown) => {
    console.error("Failed to seed classifications:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
