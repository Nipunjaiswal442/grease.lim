import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateBatchId(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, "0");
  return `${mm}${dd}IV${hex}`;
}

export const listBatches = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db
      .query("batches")
      .withIndex("by_started")
      .order("desc")
      .take(50);
    return batches;
  },
});

export const getBatch = query({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    return ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", batchId))
      .first();
  },
});

export const createBatch = mutation({
  args: {
    gradeId: v.string(),
    gradeName: v.string(),
    groupCode: v.string(),
    hasDye: v.boolean(),
    reactorId: v.string(),
    kettleId: v.string(),
    homogeniserId: v.string(),
    fillingPointId: v.string(),
  },
  handler: async (ctx, args) => {
    let batchId = generateBatchId();
    const conflict = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", batchId))
      .first();
    if (conflict) batchId = generateBatchId();

    // Mark all equipment SCHEDULED, reactor immediately BUSY
    const setStatus = async (equipId: string, status: string) => {
      const eq = await ctx.db
        .query("equipment")
        .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipId))
        .first();
      if (!eq) throw new Error(`Equipment ${equipId} not found`);
      await ctx.db.patch(eq._id, { status: status as any, lastBatchId: batchId });
    };

    await setStatus(args.reactorId, "BUSY");
    await setStatus(args.kettleId, "SCHEDULED");
    await setStatus(args.homogeniserId, "SCHEDULED");
    await setStatus(args.fillingPointId, "SCHEDULED");

    return ctx.db.insert("batches", {
      batchId,
      gradeId: args.gradeId,
      gradeName: args.gradeName,
      groupCode: args.groupCode,
      hasDye: args.hasDye,
      reactorId: args.reactorId,
      kettleId: args.kettleId,
      homogeniserId: args.homogeniserId,
      fillingPointId: args.fillingPointId,
      stage: "reactor",
      startedAt: Date.now(),
    });
  },
});

const STAGE_ORDER = ["reactor", "kettle", "homogeniser", "fill_pt", "complete"] as const;
type Stage = (typeof STAGE_ORDER)[number];

function equipmentIdForStage(
  batch: {
    reactorId?: string;
    kettleId?: string;
    homogeniserId?: string;
    fillingPointId?: string;
  },
  stage: Stage
) {
  if (stage === "reactor") return batch.reactorId;
  if (stage === "kettle") return batch.kettleId;
  if (stage === "homogeniser") return batch.homogeniserId;
  if (stage === "fill_pt") return batch.fillingPointId;
  return undefined;
}

export const advanceBatch = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", batchId))
      .first();
    if (!batch) throw new Error("Batch not found");
    if (batch.stage === "complete") throw new Error("Batch already complete");

    const currentIdx = STAGE_ORDER.indexOf(batch.stage as Stage);
    const nextStage = STAGE_ORDER[currentIdx + 1];

    const getEquip = async (id: string | undefined) => {
      if (!id) return null;
      return ctx.db
        .query("equipment")
        .withIndex("by_equipment_id", (q) => q.eq("equipmentId", id))
        .first();
    };

    // When leaving current stage, set that equipment's post-use status
    const leaveEquipId = {
      reactor: batch.reactorId,
      kettle: batch.kettleId,
      homogeniser: batch.homogeniserId,
      fill_pt: batch.fillingPointId,
    }[batch.stage as Exclude<Stage, "complete">];

    if (leaveEquipId) {
      const leaveEquip = await getEquip(leaveEquipId);
      if (leaveEquip) {
        const isDyeEquip =
          batch.hasDye &&
          (leaveEquip.type === "KETTLE" ||
            leaveEquip.type === "HOMOGENISER" ||
            leaveEquip.type === "FILLING_POINT");
        await ctx.db.patch(leaveEquip._id, {
          status: isDyeEquip ? "DYE_FLUSH_REQUIRED" : "AVAILABLE",
          lastGroupCode: batch.groupCode,
          lastBatchId: batchId,
        });
      }
    }

    // When entering next stage, set that equipment BUSY (unless complete)
    if (nextStage !== "complete") {
      const enterEquipId = {
        kettle: batch.kettleId,
        homogeniser: batch.homogeniserId,
        fill_pt: batch.fillingPointId,
      }[nextStage as "kettle" | "homogeniser" | "fill_pt"];

      if (enterEquipId) {
        const enterEquip = await getEquip(enterEquipId);
        if (enterEquip) {
          await ctx.db.patch(enterEquip._id, { status: "BUSY" });
        }
      }
    } else {
      // Completing — handle fill_pt leave is above; reactor/kettle/homo were already handled
      // Also handle the filling_point dye flush
      const fpEquip = await getEquip(batch.fillingPointId);
      if (fpEquip) {
        const isDye = batch.hasDye;
        await ctx.db.patch(fpEquip._id, {
          status: isDye ? "DYE_FLUSH_REQUIRED" : "AVAILABLE",
          lastGroupCode: batch.groupCode,
          lastBatchId: batchId,
        });
      }
    }

    await ctx.db.patch(batch._id, {
      stage: nextStage,
      ...(nextStage === "complete" ? { completedAt: Date.now() } : {}),
    });
  },
});

export const resetBatchStage = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, { batchId }) => {
    const batch = await ctx.db
      .query("batches")
      .withIndex("by_batch_id", (q) => q.eq("batchId", batchId))
      .first();
    if (!batch) throw new Error("Batch not found");
    if (batch.stage === "reactor") throw new Error("Already at first stage");
    const currentIdx = STAGE_ORDER.indexOf(batch.stage as Stage);
    const prevStage = STAGE_ORDER[currentIdx - 1];

    const patchEquipment = async (equipmentId: string | undefined, status: "BUSY" | "SCHEDULED") => {
      if (!equipmentId) return;
      const eq = await ctx.db
        .query("equipment")
        .withIndex("by_equipment_id", (q) => q.eq("equipmentId", equipmentId))
        .first();
      if (eq) await ctx.db.patch(eq._id, { status, lastBatchId: batchId });
    };

    await patchEquipment(equipmentIdForStage(batch, prevStage), "BUSY");
    await patchEquipment(equipmentIdForStage(batch, batch.stage as Stage), "SCHEDULED");
    await ctx.db.patch(batch._id, { stage: prevStage, completedAt: undefined });
  },
});
