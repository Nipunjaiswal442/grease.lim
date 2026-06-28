import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  groups: defineTable({
    groupCode: v.string(),
    code: v.number(),
    name: v.string(),
    colour: v.optional(v.string()),
    thickener: v.optional(v.string()),
  }).index("by_code", ["groupCode"]),

  grades: defineTable({
    gradeId: v.string(),
    name: v.string(),
    groupCode: v.string(),
    hasDye: v.boolean(),
    isBituminous: v.boolean(),
    isSynthetic: v.boolean(),
    isFoodGrade: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_grade_id", ["gradeId"])
    .index("by_group", ["groupCode"])
    .searchIndex("search_grades", { searchField: "name", filterFields: ["gradeId"] }),

  compatibility: defineTable({
    fromGroupCode: v.string(),
    toGroupCode: v.string(),
    relation: v.union(
      v.literal("SAME"),
      v.literal("COMPATIBLE"),
      v.literal("BORDERLINE"),
      v.literal("INCOMPATIBLE")
    ),
  }).index("by_from_to", ["fromGroupCode", "toGroupCode"]),

  equipment: defineTable({
    equipmentId: v.string(),
    displayName: v.string(),
    type: v.union(
      v.literal("REACTOR"),
      v.literal("KETTLE"),
      v.literal("HOMOGENISER"),
      v.literal("FILLING_POINT")
    ),
    capacityT: v.optional(v.number()),
    status: v.union(
      v.literal("AVAILABLE"),
      v.literal("BUSY"),
      v.literal("SCHEDULED"),
      v.literal("NEEDS_CLEAN"),
      v.literal("DYE_FLUSH_REQUIRED"),
      v.literal("OUT_OF_ORDER")
    ),
    lastGroupCode: v.optional(v.string()),
    lastBatchId: v.optional(v.string()),
    outOfOrder: v.boolean(),
  })
    .index("by_equipment_id", ["equipmentId"])
    .index("by_type", ["type"]),

  batches: defineTable({
    batchId: v.string(),
    gradeId: v.string(),
    gradeName: v.string(),
    groupCode: v.string(),
    hasDye: v.boolean(),
    reactorId: v.optional(v.string()),
    kettleId: v.optional(v.string()),
    homogeniserId: v.optional(v.string()),
    fillingPointId: v.optional(v.string()),
    stage: v.union(
      v.literal("reactor"),
      v.literal("kettle"),
      v.literal("homogeniser"),
      v.literal("fill_pt"),
      v.literal("complete")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_batch_id", ["batchId"])
    .index("by_stage", ["stage"])
    .index("by_started", ["startedAt"]),

  seedState: defineTable({
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
  }),
});
