import { query } from "./_generated/server";

export const getPlantStatus = query({
  args: {},
  handler: async (ctx) => {
    const allEquipment = await ctx.db.query("equipment").collect();
    const activeBatches = await ctx.db
      .query("batches")
      .withIndex("by_stage")
      .filter((q) => q.neq(q.field("stage"), "complete"))
      .collect();

    const batchByEquip: Record<string, (typeof activeBatches)[0]> = {};
    for (const b of activeBatches) {
      if (b.reactorId && b.stage === "reactor") batchByEquip[b.reactorId] = b;
      if (b.kettleId && b.stage === "kettle") batchByEquip[b.kettleId] = b;
      if (b.homogeniserId && b.stage === "homogeniser") batchByEquip[b.homogeniserId] = b;
      if (b.fillingPointId && b.stage === "fill_pt") batchByEquip[b.fillingPointId] = b;
      // Also mark scheduled equipment
      if (b.kettleId && b.stage === "reactor") batchByEquip[b.kettleId] = b;
      if (b.homogeniserId && ["reactor","kettle"].includes(b.stage)) batchByEquip[b.homogeniserId] = b;
      if (b.fillingPointId && ["reactor","kettle","homogeniser"].includes(b.stage)) batchByEquip[b.fillingPointId] = b;
    }

    const enrich = (eq: (typeof allEquipment)[0]) => ({
      ...eq,
      currentBatch: batchByEquip[eq.equipmentId] ?? null,
    });

    return {
      reactors: allEquipment.filter((e) => e.type === "REACTOR").map(enrich),
      kettles: allEquipment.filter((e) => e.type === "KETTLE").map(enrich),
      homogenisers: allEquipment.filter((e) => e.type === "HOMOGENISER").map(enrich),
      fillingPoints: allEquipment.filter((e) => e.type === "FILLING_POINT").map(enrich),
    };
  },
});
