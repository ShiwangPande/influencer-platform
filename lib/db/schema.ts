import { relations } from "drizzle-orm"
import { pgTable, serial, text, timestamp, boolean, integer, decimal, uuid } from "drizzle-orm/pg-core"

// Users table (extends Clerk user data)
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  imageUrl: text("image_url"),
  role: text("role").notNull().default("user"), // "user", "influencer", "admin"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Influencer profiles
export const influencerProfiles = pgTable("influencer_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  messagePrice: decimal("message_price", { precision: 10, scale: 2 }).notNull().default("5.00"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  categories: text("categories").array(),
  socialLinks: text("social_links").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// User credits
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Credit transactions
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // "purchase", "usage", "refund"
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  influencerId: text("influencer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Messages
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Voice memos
export const voiceMemos = pgTable("voice_memos", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  influencerId: text("influencer_id")
    .notNull()
    .references(() => users.id),
  fileUrl: text("file_url").notNull(),
  duration: integer("duration"), // in seconds
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  influencerProfile: many(influencerProfiles),
  credits: many(userCredits),
  sentMessages: many(messages, { relationName: "sender" }),
  userConversations: many(conversations, { relationName: "userConversations" }),
  influencerConversations: many(conversations, { relationName: "influencerConversations" }),
}))

export const influencerProfilesRelations = relations(influencerProfiles, ({ one }) => ({
  user: one(users, {
    fields: [influencerProfiles.userId],
    references: [users.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
    relationName: "userConversations",
  }),
  influencer: one(users, {
    fields: [conversations.influencerId],
    references: [users.id],
    relationName: "influencerConversations",
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  voiceMemos: many(voiceMemos),
}))

export const voiceMemosRelations = relations(voiceMemos, ({ one }) => ({
  message: one(messages, {
    fields: [voiceMemos.messageId],
    references: [messages.id],
  }),
  influencer: one(users, {
    fields: [voiceMemos.influencerId],
    references: [users.id],
  }),
}))
