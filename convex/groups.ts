import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listGroups = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db.query("groups").collect();
    return groups.sort((a, b) => a.code - b.code);
  },
});

export const addGroup = mutation({
  args: {
    groupCode: v.string(),
    code: v.number(),
    name: v.string(),
    colour: v.optional(v.string()),
    thickener: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const groupCode = args.groupCode.trim().toUpperCase();
    const existingByCode = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("groupCode", groupCode))
      .first();
    if (existingByCode) throw new Error(`Group ${groupCode} already exists`);
    const existingByNumber = (await ctx.db.query("groups").collect()).find((g) => g.code === args.code);
    if (existingByNumber) throw new Error(`Group number ${args.code} already exists`);
    return ctx.db.insert("groups", {
      groupCode,
      code: args.code,
      name: args.name.trim(),
      colour: args.colour,
      thickener: args.thickener,
    });
  },
});

export const updateGroup = mutation({
  args: {
    groupCode: v.string(),
    code: v.optional(v.number()),
    name: v.optional(v.string()),
    colour: v.optional(v.string()),
    thickener: v.optional(v.string()),
  },
  handler: async (ctx, { groupCode, ...updates }) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("groupCode", groupCode))
      .first();
    if (!group) throw new Error(`Group ${groupCode} not found`);
    if (updates.code !== undefined) {
      const duplicate = (await ctx.db.query("groups").collect()).find(
        (candidate) => candidate.code === updates.code && candidate._id !== group._id
      );
      if (duplicate) throw new Error(`Group number ${updates.code} already exists`);
    }
    await ctx.db.patch(group._id, {
      ...updates,
      name: updates.name?.trim(),
    });
  },
});

export const removeGroup = mutation({
  args: { groupCode: v.string() },
  handler: async (ctx, { groupCode }) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("groupCode", groupCode))
      .first();
    if (!group) throw new Error(`Group ${groupCode} not found`);

    const activeGrade = (await ctx.db.query("grades").collect()).find(
      (grade) => grade.groupCode === groupCode && grade.isActive !== false
    );
    if (activeGrade) throw new Error("Cannot remove a group with active grades");

    const activeBatch = (await ctx.db.query("batches").collect()).find(
      (batch) => batch.groupCode === groupCode && batch.stage !== "complete"
    );
    if (activeBatch) throw new Error("Cannot remove a group in an active batch");

    const compatibilityRows = await ctx.db.query("compatibility").collect();
    for (const row of compatibilityRows) {
      if (row.fromGroupCode === groupCode || row.toGroupCode === groupCode) {
        await ctx.db.delete(row._id);
      }
    }
    await ctx.db.delete(group._id);
  },
});
