import { query } from "./_generated/server";
import { v } from "convex/values";

type CompatResult = "SAME" | "COMPATIBLE" | "BORDERLINE" | "INCOMPATIBLE" | "AVAILABLE_CLEAN";

export const getRouting = query({
  args: { gradeId: v.string() },
  handler: async (ctx, { gradeId }) => {
    // Get grade
    const grade = await ctx.db
      .query("grades")
      .withIndex("by_grade_id", (q) => q.eq("gradeId", gradeId))
      .first();
    if (!grade) return null;

    const allEquipment = await ctx.db.query("equipment").collect();

    const resolveCompat = async (
      lastGroupCode: string | undefined,
      newGroupCode: string
    ): Promise<{ relation: CompatResult; recommended: boolean; cleanRequired: boolean; qcConsult: boolean }> => {
      if (!lastGroupCode) {
        return { relation: "AVAILABLE_CLEAN", recommended: true, cleanRequired: false, qcConsult: false };
      }
      if (lastGroupCode === newGroupCode) {
        return { relation: "SAME", recommended: true, cleanRequired: false, qcConsult: false };
      }
      const compat = await ctx.db
        .query("compatibility")
        .withIndex("by_from_to", (q) =>
          q.eq("fromGroupCode", lastGroupCode).eq("toGroupCode", newGroupCode)
        )
        .first();
      const rel = compat?.relation ?? "INCOMPATIBLE";
      if (rel === "SAME" || rel === "COMPATIBLE") {
        return { relation: rel, recommended: true, cleanRequired: false, qcConsult: false };
      }
      if (rel === "BORDERLINE") {
        return { relation: "BORDERLINE", recommended: false, cleanRequired: true, qcConsult: true };
      }
      return { relation: "INCOMPATIBLE", recommended: false, cleanRequired: true, qcConsult: false };
    };

    const buildList = async (type: "REACTOR" | "KETTLE" | "HOMOGENISER" | "FILLING_POINT") => {
      const units = allEquipment.filter((e) => e.type === type);
      const result = [];
      for (const eq of units) {
        if (eq.outOfOrder || eq.status === "OUT_OF_ORDER") {
          result.push({ ...eq, compatibilityWithNew: "UNAVAILABLE" as const, recommended: false, cleanRequired: false, qcConsult: false, selectable: false });
          continue;
        }
        if (eq.status === "BUSY" || eq.status === "SCHEDULED") {
          result.push({ ...eq, compatibilityWithNew: "UNAVAILABLE" as const, recommended: false, cleanRequired: false, qcConsult: false, selectable: false });
          continue;
        }
        // DYE_FLUSH or NEEDS_CLEAN override cleanRequired
        const { relation, recommended, qcConsult } = await resolveCompat(eq.lastGroupCode, grade.groupCode);
        const cleanRequired =
          eq.status === "NEEDS_CLEAN" ||
          eq.status === "DYE_FLUSH_REQUIRED" ||
          relation === "INCOMPATIBLE" ||
          relation === "BORDERLINE";
        result.push({
          ...eq,
          compatibilityWithNew: relation,
          recommended: recommended && !cleanRequired,
          cleanRequired,
          qcConsult,
          selectable: true,
        });
      }
      // Sort: recommended first, then by equipmentId
      result.sort((a, b) => {
        if (a.recommended && !b.recommended) return -1;
        if (!a.recommended && b.recommended) return 1;
        if (!a.cleanRequired && b.cleanRequired) return -1;
        if (a.cleanRequired && !b.cleanRequired) return 1;
        return a.equipmentId.localeCompare(b.equipmentId);
      });
      return result;
    };

    const [reactors, kettles, homogenisers, fillingPoints] = await Promise.all([
      buildList("REACTOR"),
      buildList("KETTLE"),
      buildList("HOMOGENISER"),
      buildList("FILLING_POINT"),
    ]);

    return { grade, reactors, kettles, homogenisers, fillingPoints };
  },
});
