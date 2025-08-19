import { sql } from "drizzle-orm";
import { text, timestamp, pgTable, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { nanoid } from "@/lib/utils";

export const govDocuments = pgTable("gov_documents", {
  id: varchar("id", { length: 191 }).primaryKey().$defaultFn(() => nanoid()),
  title: text("title").notNull(),
  category: varchar("category", { length: 100 }).notNull(), // e.g. Service Catalog, Rules of Business, Estacode
  documentType: varchar("document_type", { length: 50 }).notNull(), // e.g. PDF, DOCX
  fileUrl: text("file_url").notNull(), // Where the document is stored
  summary: text("summary"), // Optional short description
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertGovDocumentSchema = createSelectSchema(govDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GovDocument = typeof govDocuments.$inferSelect;
export type NewGovDocument = typeof govDocuments.$inferInsert;
