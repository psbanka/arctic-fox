import { db } from "../db";
import { householdMembers } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { ok, err, type AppResult } from "./result";
import { createDatabaseQueryError, createInsufficientPermissionsError } from "./result";

/**
 * Verify a user is a member of a household
 */
export async function verifyHouseholdMembership(userId: number, householdId: number): Promise<AppResult<boolean>> {
  try {
    const membership = await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    });

    if (!membership) {
      return err(createInsufficientPermissionsError("Household not found or access denied"));
    }

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to verify household membership", error));
  }
} 