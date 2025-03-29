import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Households table
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User-Household relationship (many-to-many)
export const householdMembers = pgTable(
  "household_members",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: integer("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    isOwner: boolean("is_owner").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.householdId] }),
    };
  },
);

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Template table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Template Tasks table
export const templateTasks = pgTable("template_tasks", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  timesPerMonth: integer("times_per_month").notNull(),
  storyPoints: integer("story_points").notNull(),
  assignToAll: boolean("assign_to_all").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Template Task Assignments table
export const templateTaskAssignments = pgTable(
  "template_task_assignments",
  {
    templateTaskId: integer("template_task_id")
      .notNull()
      .references(() => templateTasks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.templateTaskId, table.userId] }),
    };
  },
);

// Monthly Plans table
export const monthlyPlans = pgTable("monthly_plans", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tasks table (instances of template tasks or one-time tasks for a specific month)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  monthlyPlanId: integer("monthly_plan_id")
    .notNull()
    .references(() => monthlyPlans.id, { onDelete: "cascade" }),
  templateTaskId: integer("template_task_id").references(() => templateTasks.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  storyPoints: integer("story_points").notNull(),
  isTemplateTask: boolean("is_template_task").default(true).notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by").references(() => users.id),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task Assignments table
export const taskAssignments = pgTable(
  "task_assignments",
  {
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.taskId, table.userId] }),
    };
  },
);

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  householdMembers: many(householdMembers),
  templateTaskAssignments: many(templateTaskAssignments),
  taskAssignments: many(taskAssignments),
  completedTasks: many(tasks, { relationName: "completedBy" }),
}));

export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  categories: many(categories),
  templates: many(templates),
  monthlyPlans: many(monthlyPlans),
}));

export const householdMembersRelations = relations(householdMembers, ({ one }) => ({
  user: one(users, { fields: [householdMembers.userId], references: [users.id] }),
  household: one(households, { fields: [householdMembers.householdId], references: [households.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  household: one(households, { fields: [categories.householdId], references: [households.id] }),
  templateTasks: many(templateTasks),
  tasks: many(tasks),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  household: one(households, { fields: [templates.householdId], references: [households.id] }),
  templateTasks: many(templateTasks),
}));

export const templateTasksRelations = relations(templateTasks, ({ one, many }) => ({
  template: one(templates, { fields: [templateTasks.templateId], references: [templates.id] }),
  category: one(categories, { fields: [templateTasks.categoryId], references: [categories.id] }),
  assignments: many(templateTaskAssignments),
  tasks: many(tasks),
}));

export const templateTaskAssignmentsRelations = relations(templateTaskAssignments, ({ one }) => ({
  templateTask: one(templateTasks, {
    fields: [templateTaskAssignments.templateTaskId],
    references: [templateTasks.id]
  }),
  user: one(users, {
    fields: [templateTaskAssignments.userId],
    references: [users.id]
  }),
}));

export const monthlyPlansRelations = relations(monthlyPlans, ({ one, many }) => ({
  household: one(households, { fields: [monthlyPlans.householdId], references: [households.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  monthlyPlan: one(monthlyPlans, { fields: [tasks.monthlyPlanId], references: [monthlyPlans.id] }),
  templateTask: one(templateTasks, {
    fields: [tasks.templateTaskId],
    references: [templateTasks.id],
  }),
  category: one(categories, { fields: [tasks.categoryId], references: [categories.id] }),
  assignees: many(taskAssignments),
  completedByUser: one(users, {
    fields: [tasks.completedBy],
    references: [users.id],
    relationName: "completedBy",
  }),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  task: one(tasks, { fields: [taskAssignments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskAssignments.userId], references: [users.id] }),
}));
