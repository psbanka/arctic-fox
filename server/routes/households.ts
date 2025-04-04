import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { households, householdMembers, users } from "../db/schema";
import type { HouseholdMember, NewHousehold, NewHouseholdMember } from "../db/types";
import { authenticate } from "../middleware/auth";
import type { HouseholdDetail, User, Household } from "@shared/types";
import {
  createDatabaseQueryError,
  createRecordNotFoundError,
  createInvalidInputError,
  createInsufficientPermissionsError,
  createDuplicateRecordError,
  type AppResult,
} from "../utils/result";
import { ok, err } from "neverthrow";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  householdSchema,
  householdDetailSchema,
  createHouseholdSchema,
  addMemberSchema,
  type householdMemberSchema,
} from "@shared/schemas";
import { typedJson, type TypedResponse, safeParse } from "./helpers";

const householdRoutes = new Hono();

// Apply authentication to all routes
householdRoutes.use("*", authenticate);

/**
 * Check if a user is an owner of a household
 */
async function verifyHouseholdOwnership(
  userId: number,
  householdId: number,
): Promise<AppResult<HouseholdMember>> {
  try {
    const membership = (await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    })) as HouseholdMember | undefined;

    if (!membership) {
      return err(createRecordNotFoundError("Household not found or access denied"));
    }

    if (!membership.isOwner) {
      return err(
        createInsufficientPermissionsError("Only household owners can perform this action"),
      );
    }

    return ok(membership);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to verify household ownership", error));
  }
}

/**
 * Check if a user is a member of a household
 */
async function verifyHouseholdMembership(
  userId: number,
  householdId: number,
): Promise<AppResult<HouseholdMember>> {
  try {
    const membership = (await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    })) as HouseholdMember | undefined;

    if (!membership) {
      return err(createRecordNotFoundError("Household not found or access denied"));
    }

    return ok(membership);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to verify household membership", error));
  }
}

/**
 * Get a household by ID
 */
async function getHouseholdById(
  householdId: number,
): Promise<AppResult<typeof households.$inferSelect>> {
  try {
    const [householdResult] = await db
      .select()
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1);
    if (householdResult === undefined) {
      return err(createRecordNotFoundError("Household not found"));
    }

    return ok(householdResult);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get household", error));
  }
}

/**
 * Get a user by ID
 */
async function getUserById(userId: number): Promise<AppResult<User>> {
  try {
    const user = (await db.query.users.findFirst({
      where: eq(users.id, userId),
    })) as User | undefined;

    if (!user) {
      return err(createRecordNotFoundError("User not found"));
    }

    return ok(user);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to get user", error));
  }
}

/**
 * Get user's households
 */
async function getUserHouseholds(userId: number): Promise<AppResult<z.infer<typeof householdSchema>[]>> {
  try {
    const householdsData = await db.query.households
      .findMany({
        with: {
          members: {
            where: eq(householdMembers.userId, userId),
          },
        },
      })
      .then((households) =>
        households.map((h) => ({
          id: h.id,
          name: h.name,
          createdAt: h.createdAt,
          updatedAt: h.updatedAt,
          isOwner: h.members[0]?.isOwner ?? false,
        })),
      );

    return ok(householdsData);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch households", error));
  }
}

/**
 * Create a new household
 */
async function createHousehold(name: string): Promise<AppResult<typeof households.$inferSelect>> {
  try {
    const householdData: NewHousehold = { name };

    const [newHousehold] = await db.insert(households).values(householdData).returning();
    if (newHousehold === undefined) {
      return err(createDatabaseQueryError("Failed to create household"));
    }

    return ok(newHousehold);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to create household", error));
  }
}

/**
 * Add a user as a member to a household
 */
async function addMemberToHousehold(
  userId: number,
  householdId: number,
  isOwner: boolean,
): Promise<AppResult<boolean>> {
  try {
    const memberData: NewHouseholdMember = {
      userId,
      householdId,
      isOwner,
    };

    await db.insert(householdMembers).values(memberData);

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to add member to household", error));
  }
}

/**
 * Get all members of a household with user info
 */
async function getHouseholdMembers(
  householdId: number,
): Promise<AppResult<z.infer<typeof householdMemberSchema>[]>> {
  try {
    const membersData = await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        isOwner: householdMembers.isOwner,
      })
      .from(users)
      .innerJoin(
        householdMembers,
        and(eq(householdMembers.userId, users.id), eq(householdMembers.householdId, householdId)),
      );
    if (membersData === undefined) {
      return err(createDatabaseQueryError("Failed to fetch household members"));
    }

    return ok(membersData);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to fetch household members", error));
  }
}

/**
 * Check if a user is already a member of a household
 */
async function checkMemberExists(userId: number, householdId: number): Promise<AppResult<boolean>> {
  try {
    const existingMembership = (await db.query.householdMembers.findFirst({
      where: and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
      ),
    })) as HouseholdMember | undefined;

    return ok(!!existingMembership);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to check existing membership", error));
  }
}

/**
 * Update household name
 */
async function updateHouseholdName(
  householdId: number,
  name: string,
): Promise<AppResult<typeof households.$inferSelect>> {
  try {
    const [updatedHousehold] = await db
      .update(households)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(households.id, householdId))
      .returning();
    if (updatedHousehold === undefined) {
      return err(createDatabaseQueryError("Failed to update household"));
    }

    return ok(updatedHousehold);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to update household", error));
  }
}

/**
 * Count household owners
 */
async function countHouseholdOwners(householdId: number): Promise<AppResult<number>> {
  try {
    const owners = await db
      .select({ count: householdMembers.userId })
      .from(householdMembers)
      .where(
        and(eq(householdMembers.householdId, householdId), eq(householdMembers.isOwner, true)),
      );

    return ok(owners.length);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to count household owners", error));
  }
}

/**
 * Remove member from household
 */
async function removeMemberFromHousehold(
  userId: number,
  householdId: number,
): Promise<AppResult<boolean>> {
  try {
    await db
      .delete(householdMembers)
      .where(
        and(eq(householdMembers.userId, userId), eq(householdMembers.householdId, householdId)),
      );

    return ok(true);
  } catch (error) {
    return err(createDatabaseQueryError("Failed to remove member from household", error));
  }
}

// Here are all th endpoint handlers
// ----------------------------------------------------------------------------------------

// Get user's households
householdRoutes.get("/", async (c): Promise<TypedResponse<z.infer<typeof householdSchema>[]>> => {
  const user = c.get("user");

  const householdsResult = await getUserHouseholds(user.id);

  if (householdsResult.isErr()) {
    const error = householdsResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const householdsData = householdsResult.value;

  const output = householdsData.map((r) => safeParse(householdSchema, r));
  return typedJson(c, output, 200);
});

// Create a new household
householdRoutes.post(
  "/",
  zValidator("json", createHouseholdSchema),
  async (c): Promise<TypedResponse<z.infer<typeof householdSchema>>> => {
    const user = c.get("user");
    const { name } = await c.req.valid("json");

    // Create the household
    const householdResult = await createHousehold(name);

    if (householdResult.isErr()) {
      const error = householdResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    const newHousehold = householdResult.value;

    // Add the current user as an owner
    const memberResult = await addMemberToHousehold(user.id, newHousehold.id, true);

    if (memberResult.isErr()) {
      const error = memberResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    return typedJson(c, householdSchema.parse(newHousehold), 201);
  },
);

// Get a specific household by ID
householdRoutes.get("/:id", async (c): Promise<TypedResponse<z.infer<typeof householdDetailSchema>>> => {
  const user = c.get("user");
  const householdId = Number.parseInt(c.req.param("id"));

  if (Number.isNaN(householdId)) {
    const error = createInvalidInputError("Invalid household ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Get household details
  const householdResult = await getHouseholdById(householdId);

  if (householdResult.isErr()) {
    const error = householdResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const household = householdResult.value;

  // Check if user is a member of this household
  const membershipResult = await verifyHouseholdMembership(user.id, householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  const membership = membershipResult.value;

  // Get all members of this household
  const membersResult = await getHouseholdMembers(householdId);

  if (membersResult.isErr()) {
    const error = membersResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  const membersData = membersResult.value;

  // Map to HouseholdMember type
  const members: HouseholdMember[] = membersData.map((member) => ({
    id: member.id,
    username: member.username,
    firstName: member.firstName,
    lastName: member.lastName,
    isOwner: member.isOwner,
  }));

  const householdDetail = {
    id: household.id,
    name: household.name,
    createdAt: household.createdAt,
    updatedAt: household.updatedAt,
    isOwner: membership.isOwner,
    members,
  };

  const output = safeParse(householdDetailSchema, householdDetail);
  return typedJson(c, output, 200);
});

// Add a member to a household
householdRoutes.post("/:id/members", zValidator("json", addMemberSchema), async (c) => {
  const user = c.get("user");
  const householdId = Number.parseInt(c.req.param("id"));
  const { userId, isOwner } = await c.req.valid("json");

  if (Number.isNaN(householdId)) {
    const error = createInvalidInputError("Invalid household ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Check if the current user is an owner of this household
  const ownershipResult = await verifyHouseholdOwnership(user.id, householdId);

  if (ownershipResult.isErr()) {
    const error = ownershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Check if the user to be added exists
  const userToAddResult = await getUserById(userId);

  if (userToAddResult.isErr()) {
    const error = userToAddResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const userToAdd = userToAddResult.value;

  // Check if the user is already a member
  const memberExistsResult = await checkMemberExists(userId, householdId);

  if (memberExistsResult.isErr()) {
    const error = memberExistsResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  if (memberExistsResult.value) {
    const error = createDuplicateRecordError("User is already a member of this household");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Add the user to the household
  const addMemberResult = await addMemberToHousehold(userId, householdId, isOwner);

  if (addMemberResult.isErr()) {
    const error = addMemberResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json(
    {
      message: "Member added successfully",
      member: {
        id: userToAdd.id,
        username: userToAdd.username,
        firstName: userToAdd.firstName,
        lastName: userToAdd.lastName,
        isOwner,
      },
    },
    201,
  );
});

// Update household name
householdRoutes.put("/:id", zValidator("json", createHouseholdSchema), async (c) => {
  const user = c.get("user");
  const householdId = Number.parseInt(c.req.param("id"));
  const { name } = await c.req.valid("json");

  if (Number.isNaN(householdId)) {
    const error = createInvalidInputError("Invalid household ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Check if the current user is an owner of this household
  const ownershipResult = await verifyHouseholdOwnership(user.id, householdId);

  if (ownershipResult.isErr()) {
    const error = ownershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Update the household
  const updateResult = await updateHouseholdName(householdId, name);

  if (updateResult.isErr()) {
    const error = updateResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ household: updateResult.value });
});

// Remove a member from a household
householdRoutes.delete("/:householdId/members/:userId", async (c) => {
  const currentUser = c.get("user");
  const householdId = Number.parseInt(c.req.param("householdId"));
  const userIdToRemove = Number.parseInt(c.req.param("userId"));

  if (Number.isNaN(householdId) || Number.isNaN(userIdToRemove)) {
    const error = createInvalidInputError("Invalid household ID or user ID");
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 400) as ContentfulStatusCode,
    );
  }

  // Check if the current user is a member of this household
  const membershipResult = await verifyHouseholdMembership(currentUser.id, householdId);

  if (membershipResult.isErr()) {
    const error = membershipResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 404) as ContentfulStatusCode,
    );
  }

  const membership = membershipResult.value;

  // Allow users to remove themselves, or owners to remove anyone
  if (currentUser.id !== userIdToRemove && !membership.isOwner) {
    const error = createInsufficientPermissionsError(
      "Only household owners can remove other members",
    );
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 403) as ContentfulStatusCode,
    );
  }

  // Make sure we're not removing the last owner
  if (membership.isOwner && currentUser.id === userIdToRemove) {
    // Count other owners
    const ownersCountResult = await countHouseholdOwners(householdId);

    if (ownersCountResult.isErr()) {
      const error = ownersCountResult.error;
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 500) as ContentfulStatusCode,
      );
    }

    // If this is the only owner, prevent removal
    if (ownersCountResult.value <= 1) {
      const error = createInvalidInputError(
        "Cannot remove the only owner. Promote another member to owner first",
      );
      return c.json(
        { message: error.message, type: error.type },
        (error.statusCode || 400) as ContentfulStatusCode,
      );
    }
  }

  // Remove the member
  const removeResult = await removeMemberFromHousehold(userIdToRemove, householdId);

  if (removeResult.isErr()) {
    const error = removeResult.error;
    return c.json(
      { message: error.message, type: error.type },
      (error.statusCode || 500) as ContentfulStatusCode,
    );
  }

  return c.json({ message: "Member removed successfully" }, 200);
});

export default householdRoutes;
