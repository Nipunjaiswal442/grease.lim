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

export const addEquipment = mutation({
  args: {
    equipmentId: v.string(),
    displayName: v.string(),
    type: v.union(
      v.literal("REACTOR"),
      v.literal("KETTLE"),
      v.literal("HOMOGENISER"),
      v.literal("FILLING_POINT")
    ),
    capacityT: v.optional(v.number()),
    outOfOrder: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const equipmentId = args.equipmentId.trim().toUpperCase();
    const existing = await ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
    if (existing) throw new Error(`Equipment ${equipmentId} already exists`);
    return ctx.db.insert("equipment", {
      equipmentId,
      displayName: args.displayName.trim(),
      type: args.type,
      capacityT: args.capacityT,
      status: args.outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE",
      outOfOrder: args.outOfOrder ?? false,
    });
  },
});

export const updateEquipment = mutation({
  args: {
    equipmentId: v.string(),
    displayName: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("REACTOR"),
      v.literal("KETTLE"),
      v.literal("HOMOGENISER"),
      v.literal("FILLING_POINT")
    )),
    capacityT: v.optional(v.number()),
    outOfOrder: v.optional(v.boolean()),
  },
  handler: async (ctx, { equipmentId, ...updates }) => {
    const eq = await ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    await ctx.db.patch(eq._id, {
      ...updates,
      displayName: updates.displayName?.trim(),
      status: updates.outOfOrder ? "OUT_OF_ORDER" : eq.status,
    });
  },
});

export const removeEquipment = mutation({
  args: { equipmentId: v.string() },
  handler: async (ctx, { equipmentId }) => {
    const eq = await ctx.db
      .query("equipment")
      .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
      .first();
    if (!eq) throw new Error(`Equipment ${equipmentId} not found`);
    const activeBatches = await ctx.db
      .query("batches")
      .filter((q) => q.neq(q.field("stage"), "complete"))
      .collect();
    const inUse = activeBatches.some(
      (batch) =>
        batch.reactorId === equipmentId ||
        batch.kettleId === equipmentId ||
        batch.homogeniserId === equipmentId ||
        batch.fillingPointId === equipmentId
    );
    if (inUse) throw new Error("Cannot remove equipment in an active batch");
    await ctx.db.delete(eq._id);
  },
});
