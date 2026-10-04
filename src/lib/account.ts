import "server-only";

import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/user";

/**
 * True when the account still exists and is not being deleted.
 *
 * Dependent writes call this after writing their record. Account deletion
 * marks the user document first, then removes dependents; a write that
 * authenticated before that mark but landed after dependent cleanup sees
 * either `deleting: true` or no account at all, removes its own record, and
 * fails, so a successful deletion never leaves orphans.
 */
export async function accountAcceptingWrites(
  userId: string | Types.ObjectId,
): Promise<boolean> {
  await connectDB();
  const account = await User.exists({
    _id: userId,
    deleting: { $ne: true },
  });
  return Boolean(account);
}
