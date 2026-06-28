import { query } from "./_generated/server";

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
