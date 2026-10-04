/**
 * Read-only duplicate inspection for the DATA-02/DATA-03 work.
 *
 * Checks:
 *   1. Recipes whose normalized title collides for the same author.
 *   2. Users with more than one settings document.
 *   3. Informational: mixed-case and case-colliding email addresses, which
 *      matter when normalizing account lookups.
 *
 * Usage (does not write anything):
 *   node --env-file=.env.local scripts/inspect-duplicates.mjs
 *
 * Exits 0 when no duplicates are found, 2 when duplicates exist, 1 on error.
 */
import mongoose from "mongoose";
import process from "node:process";

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error(
    "MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/inspect-duplicates.mjs",
  );
  process.exit(1);
}

try {
  await mongoose.connect(uri, { maxPoolSize: 5 });
  const db = mongoose.connection.db;

  const duplicateRecipes = await db
    .collection("recipes")
    .aggregate([
      { $match: { name: { $type: "string" }, author: { $ne: null } } },
      {
        $group: {
          _id: {
            author: "$author",
            name: { $toLower: { $trim: { input: "$name" } } },
          },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          names: { $push: "$name" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  const duplicateSettings = await db
    .collection("settings")
    .aggregate([
      { $match: { user: { $ne: null } } },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          ids: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  const mixedCaseEmails = await db
    .collection("users")
    .aggregate([
      { $match: { email: { $type: "string" } } },
      { $match: { $expr: { $ne: ["$email", { $toLower: "$email" }] } } },
      { $project: { _id: 0, email: 1 } },
    ])
    .toArray();

  const emailCaseCollisions = await db
    .collection("users")
    .aggregate([
      { $match: { email: { $type: "string" } } },
      {
        $group: {
          _id: { $toLower: { $trim: { input: "$email" } } },
          count: { $sum: 1 },
          emails: { $push: "$email" },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  console.log(`Database: ${db.databaseName}`);
  console.log("");

  console.log(`Recipe title duplicates (same author): ${duplicateRecipes.length}`);
  for (const group of duplicateRecipes) {
    console.log(
      `  author=${group._id.author} name="${group._id.name}" count=${group.count} ids=${group.ids.join(", ")}`,
    );
  }
  console.log("");

  console.log(`Users with duplicate settings documents: ${duplicateSettings.length}`);
  for (const group of duplicateSettings) {
    console.log(
      `  user=${group._id} count=${group.count} ids=${group.ids.join(", ")}`,
    );
  }
  console.log("");

  console.log(`Mixed-case emails (informational): ${mixedCaseEmails.length}`);
  for (const user of mixedCaseEmails) {
    console.log(`  ${user.email}`);
  }
  console.log("");

  console.log(`Case-insensitive email collisions (informational): ${emailCaseCollisions.length}`);
  for (const group of emailCaseCollisions) {
    console.log(`  ${group.emails.join(" / ")}`);
  }

  const hasDuplicates =
    duplicateRecipes.length > 0 || duplicateSettings.length > 0;
  process.exit(hasDuplicates ? 2 : 0);
} catch (error) {
  console.error("Inspection failed:", error);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
