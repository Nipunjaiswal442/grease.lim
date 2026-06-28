import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listGrades = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("grades").collect();
  },
});

export const getGrade = query({
  args: { gradeId: v.string() },
  handler: async (ctx, { gradeId }) => {
    return ctx.db
      .query("grades")
      .withIndex("by_grade_id", (q) => q.eq("gradeId", gradeId))
      .first();
  },
});

export const searchGrades = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    const all = await ctx.db.query("grades").collect();
    return all
      .filter(
        (g) =>
          g.gradeId.toLowerCase().includes(lower) ||
          g.name.toLowerCase().includes(lower)
      )
      .slice(0, 20);
  },
});

export const addGrade = mutation({
  args: {
    gradeId: v.string(),
    name: v.string(),
    groupCode: v.string(),
    hasDye: v.boolean(),
    isBituminous: v.optional(v.boolean()),
    isSynthetic: v.optional(v.boolean()),
    isFoodGrade: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("grades")
      .withIndex("by_grade_id", (q) => q.eq("gradeId", args.gradeId))
      .first();
    if (existing) throw new Error(`Grade ${args.gradeId} already exists`);
    return ctx.db.insert("grades", {
      gradeId: args.gradeId,
      name: args.name,
      groupCode: args.groupCode,
      hasDye: args.hasDye,
      isBituminous: args.isBituminous ?? false,
      isSynthetic: args.isSynthetic ?? false,
      isFoodGrade: args.isFoodGrade ?? false,
      notes: args.notes,
    });
  },
});
