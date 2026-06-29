import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const relationValidator = v.union(
  v.literal("SAME"),
  v.literal("COMPATIBLE"),
  v.literal("BORDERLINE"),
  v.literal("INCOMPATIBLE")
);

export const getCompatibilityMatrix = query({
  args: {},
  handler: async (ctx) => {
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_code")
      .collect();
    groups.sort((a, b) => a.code - b.code);

    const allCompat = await ctx.db.query("compatibility").collect();
    const matrix: Record<string, Record<string, string>> = {};
    for (const c of allCompat) {
      if (!matrix[c.fromGroupCode]) matrix[c.fromGroupCode] = {};
      matrix[c.fromGroupCode][c.toGroupCode] = c.relation;
    }
    return { groups, matrix };
  },
});

export const setCompatibility = mutation({
  args: {
    fromGroupCode: v.string(),
    toGroupCode: v.string(),
    relation: relationValidator,
  },
  handler: async (ctx, args) => {
    const [fromGroup, toGroup] = await Promise.all([
      ctx.db
        .query("groups")
        .withIndex("by_code", (q) => q.eq("groupCode", args.fromGroupCode))
        .first(),
      ctx.db
        .query("groups")
        .withIndex("by_code", (q) => q.eq("groupCode", args.toGroupCode))
        .first(),
    ]);
    if (!fromGroup || !toGroup) throw new Error("Both groups must exist before editing compatibility");

    const existing = await ctx.db
      .query("compatibility")
      .withIndex("by_from_to", (q) =>
        q.eq("fromGroupCode", args.fromGroupCode).eq("toGroupCode", args.toGroupCode)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { relation: args.relation });
      return existing._id;
    }
    return ctx.db.insert("compatibility", args);
  },
});
