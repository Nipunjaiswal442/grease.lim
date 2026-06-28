import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listEquipment = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("equipment").collect();
  },
});

export const getEquipment = query({
  args: { equipmentId: v.string() },
  handler: async (ctx, { equipmentId }) => {
    return ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
  },
});

export const setOutOfOrder = mutation({
  args: { equipmentId: v.string(), outOfOrder: v.boolean() },
  handler: async (ctx, { equipmentId, outOfOrder }) => {
    const eq = await ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    await ctx.db.patch(eq._id, {
      outOfOrder,
      status: outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE",
    });
  },
});

export const markClean = mutation({
  args: { equipmentId: v.string() },
  handler: async (ctx, { equipmentId }) => {
    const eq = await ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    if (eq.status !== "NEEDS_CLEAN" && eq.status !== "DYE_FLUSH_REQUIRED") {
      throw new Error(`Equipment ${equipmentId} does not need cleaning`);
    }
    await ctx.db.patch(eq._id, { status: "AVAILABLE" });
  },
});
