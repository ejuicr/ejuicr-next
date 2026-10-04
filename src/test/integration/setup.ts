/**
 * Integration-test database lifecycle.
 *
 * Every test file gets its own temporary database, and the database is
 * dropped when the file finishes. When `MONGODB_TEST_URI` is set, that
 * server is used; otherwise an in-memory MongoDB is started for the run. The
 * resulting URI is written to `MONGODB_URI` before `lib/db` is first loaded,
 * so the application's cached `connectDB` uses the test database and never
 * the development or production one.
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll } from "vitest";
import { Recipe } from "@/lib/models/recipe";
import { Settings } from "@/lib/models/settings";
import { User } from "@/lib/models/user";

/** Replace the database name in a MongoDB URI, preserving options. */
export function withDatabase(uri: string, database: string): string {
  if (/(mongodb(?:\+srv)?:\/\/[^/]+\/)[^?]*/.test(uri)) {
    return uri.replace(/(mongodb(?:\+srv)?:\/\/[^/]+\/)[^?]*/, `$1${database}`);
  }
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/[^/?]+)(?=\?|$)/,
    `$1/${database}`,
  );
}

const databaseName = `ejuicr_test_${process.pid}_${Math.random()
  .toString(36)
  .slice(2, 8)}`;

let memoryServer: MongoMemoryServer | null = null;
let baseUri = process.env.MONGODB_TEST_URI;
if (!baseUri) {
  memoryServer = await MongoMemoryServer.create();
  baseUri = memoryServer.getUri();
}

process.env.MONGODB_URI = withDatabase(baseUri, databaseName);
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "integration-test-jwt-secret";

beforeAll(async () => {
  // Import after MONGODB_URI is set: `lib/db` reads it when first loaded.
  const { connectDB } = await import("@/lib/db");
  await connectDB();
  // Create the schema indexes before tests rely on their constraints.
  await Promise.all([User.init(), Recipe.init(), Settings.init()]);
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (memoryServer) await memoryServer.stop();
});
