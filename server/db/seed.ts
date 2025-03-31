import { db } from "./index";
import { hash } from "@node-rs/bcrypt";
import {
  users,
  households,
  householdMembers,
  categories,
  templates,
  templateTasks,
  templateTaskAssignments,
} from "./schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function seedDatabase() {
  console.log("Seeding database...");

  try {
    // Create a household
    const [doeHousehold] = await db
      .insert(households)
      .values({
        name: "Doe Family",
      })
      .returning();
    if (doeHousehold === undefined) {
      throw new Error("Failed to create household");
    }

    // Create admin user
    const adminPasswordHash = await hash("admin123", 10);
    const [ adminUser ] = await db
      .insert(users)
      .values({
        username: "admin",
        passwordHash: adminPasswordHash,
        defaultHouseholdId: doeHousehold.id,
        firstName: "Admin",
        lastName: "User",
        isAdmin: true,
      })
      .returning();

    // Create regular users
    const user1PasswordHash = await hash("password123", 10);
    const [user1] = await db
      .insert(users)
      .values({
        username: "john.doe",
        passwordHash: user1PasswordHash,
        defaultHouseholdId: doeHousehold.id,
        firstName: "John",
        lastName: "Doe",
        isAdmin: false,
      })
      .returning();

    const user2PasswordHash = await hash("password123", 10);
    const [user2] = await db
      .insert(users)
      .values({
        username: "jane.doe",
        passwordHash: user2PasswordHash,
        defaultHouseholdId: doeHousehold.id,
        firstName: "Jane",
        lastName: "Doe",
        isAdmin: false,
      })
      .returning();
    if (user2 === undefined || user1 === undefined || adminUser === undefined) {
      throw new Error("Failed to create users");
    }

    // Add users to household
    await db.insert(householdMembers).values([
      {
        userId: user1.id,
        householdId: doeHousehold.id,
        isOwner: true,
      },
      {
        userId: user2.id,
        householdId: doeHousehold.id,
        isOwner: false,
      },
      {
        userId: adminUser.id,
        householdId: doeHousehold.id,
        isOwner: true,
      },
    ]);

    // Create some categories
    const categoriesData = [
      {
        householdId: doeHousehold.id,
        name: "Health",
        description: "Physical and mental wellbeing activities",
      },
      {
        householdId: doeHousehold.id,
        name: "Family",
        description: "Activities related to family connections",
      },
      {
        householdId: doeHousehold.id,
        name: "Community",
        description: "Community involvement and volunteering",
      },
      {
        householdId: doeHousehold.id,
        name: "Home",
        description: "Home maintenance and improvement",
      },
    ];

    const [category1, category2, category3 ] = await db.insert(categories).values(categoriesData).returning();
    if (category1 === undefined || category2 === undefined || category3 === undefined) {
      throw new Error("Failed to create categories");
    }

    // Create a template
    const [monthlyTemplate] = await db
      .insert(templates)
      .values({
        householdId: doeHousehold.id,
        name: "Monthly Plan",
        description: "Our standard monthly plan template",
      })
      .returning();
    if (monthlyTemplate === undefined) {
      throw new Error("Failed to create template");
    }

    // Create template tasks
    const templateTasksData = [
      {
        templateId: monthlyTemplate.id,
        categoryId: category1.id, // Health
        name: "Exercise",
        description: "Go to the gym or workout at home",
        timesPerMonth: 12,
        storyPoints: 2,
        assignToAll: true,
      },
      {
        templateId: monthlyTemplate.id,
        categoryId: category1.id, // Health
        name: "Meditation",
        description: "10 minutes of meditation",
        timesPerMonth: 15,
        storyPoints: 1,
        assignToAll: true,
      },
      {
        templateId: monthlyTemplate.id,
        categoryId: category2.id, // Family
        name: "Family dinner",
        description: "Prepare and have dinner together as a family",
        timesPerMonth: 8,
        storyPoints: 3,
        assignToAll: true,
      },
      {
        templateId: monthlyTemplate.id,
        categoryId: category2.id, // Family
        name: "Visit parents",
        description: "Visit parents or in-laws",
        timesPerMonth: 2,
        storyPoints: 5,
        assignToAll: false,
      },
      {
        templateId: monthlyTemplate.id,
        categoryId: category3.id, // Community
        name: "Volunteer",
        description: "Volunteer at local charity or community event",
        timesPerMonth: 1,
        storyPoints: 8,
        assignToAll: false,
      },
      {
        templateId: monthlyTemplate.id,
        categoryId: category3.id, // Home
        name: "Deep cleaning",
        description: "Deep cleaning of a room or area",
        timesPerMonth: 4,
        storyPoints: 5,
        assignToAll: true,
      },
    ];

    const createdTemplateTasks = await db
      .insert(templateTasks)
      .values(templateTasksData)
      .returning();
    if (createdTemplateTasks.length < 5) {
      throw new Error("Failed to create template tasks");
    }

    // Assign specific tasks to specific users
    // Visiting parents assigned to John
    await db.insert(templateTaskAssignments).values({
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      templateTaskId: createdTemplateTasks[3]!.id, // Visit parents
      userId: user1.id,
    });

    // Volunteering assigned to Jane
    await db.insert(templateTaskAssignments).values({
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      templateTaskId: createdTemplateTasks[4]!.id, // Volunteer
      userId: user2.id,
    });

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
