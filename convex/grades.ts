import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listGrades = query({
  args: {},
  handler: async (ctx) => {
    const grades = await ctx.db.query("grades").collect();
    return grades.sort((a, b) => a.gradeId.localeCompare(b.gradeId));
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
    if (!q.trim()) {
      const all = await ctx.db.query("grades").collect();
      return all.filter((g) => g.isActive !== false).slice(0, 20);
    }
    const lower = q.toLowerCase();
    const all = await ctx.db.query("grades").collect();
    return all
      .filter(
        (g) =>
          g.isActive !== false &&
          (g.gradeId.toLowerCase().includes(lower) ||
            g.name.toLowerCase().includes(lower))
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
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("groupCode", args.groupCode))
      .first();
    if (!group) throw new Error(`Group ${args.groupCode} not found`);
    return ctx.db.insert("grades", {
      gradeId: args.gradeId.trim().toUpperCase(),
      name: args.name,
      groupCode: args.groupCode,
      hasDye: args.hasDye,
      isBituminous: args.isBituminous ?? false,
      isSynthetic: args.isSynthetic ?? false,
      isFoodGrade: args.isFoodGrade ?? false,
      notes: args.notes,
      isActive: true,
    });
  },
});

export const updateGrade = mutation({
  args: {
    gradeId: v.string(),
    name: v.optional(v.string()),
    groupCode: v.optional(v.string()),
    hasDye: v.optional(v.boolean()),
    isBituminous: v.optional(v.boolean()),
    isSynthetic: v.optional(v.boolean()),
    isFoodGrade: v.optional(v.boolean()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, { gradeId, ...updates }) => {
    const grade = await ctx.db
      .query("grades")
      .withIndex("by_grade_id", (q) => q.eq("gradeId", gradeId))
      .first();
    if (!grade) throw new Error(`Grade ${gradeId} not found`);
    if (updates.groupCode) {
      const group = await ctx.db
        .query("groups")
        .withIndex("by_code", (q) => q.eq("groupCode", updates.groupCode!))
        .first();
      if (!group) throw new Error(`Group ${updates.groupCode} not found`);
    }
    await ctx.db.patch(grade._id, updates);
  },
});

export const deactivateGrade = mutation({
  args: { gradeId: v.string() },
  handler: async (ctx, { gradeId }) => {
    const grade = await ctx.db
      .query("grades")
      .withIndex("by_grade_id", (q) => q.eq("gradeId", gradeId))
      .first();
    if (!grade) throw new Error(`Grade ${gradeId} not found`);
    const activeBatches = await ctx.db
      .query("batches")
      .filter((q) => q.neq(q.field("stage"), "complete"))
      .collect();
    if (activeBatches.some((batch) => batch.gradeId === gradeId)) {
      throw new Error("Cannot deactivate a grade in an active batch");
    }
    await ctx.db.patch(grade._id, { isActive: false });
  },
});
