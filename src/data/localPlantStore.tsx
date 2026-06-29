import { useMemo, useState, type ReactNode } from "react";
import groupsJson from "../../data/groups.json";
import gradesJson from "../../data/grades.json";
import compatibilityJson from "../../data/compatibility.json";
import { StoreContext } from "./plantContext";

type EquipmentType = "REACTOR" | "KETTLE" | "HOMOGENISER" | "FILLING_POINT";
type EquipmentStatus = "AVAILABLE" | "BUSY" | "SCHEDULED" | "NEEDS_CLEAN" | "DYE_FLUSH_REQUIRED" | "OUT_OF_ORDER";
type BatchStage = "reactor" | "kettle" | "homogeniser" | "fill_pt" | "complete";
type Relation = "SAME" | "COMPATIBLE" | "BORDERLINE" | "INCOMPATIBLE";
type CompatResult = Relation | "AVAILABLE_CLEAN" | "UNAVAILABLE";

export type Grade = {
  gradeId: string;
  name: string;
  groupCode: string;
  hasDye: boolean;
  isBituminous: boolean;
  isSynthetic: boolean;
  isFoodGrade: boolean;
  notes?: string;
  isActive: boolean;
};

export type Group = {
  groupCode: string;
  code: number;
  name: string;
  colour?: string;
  thickener?: string;
};

export type Equipment = {
  _id: string;
  equipmentId: string;
  displayName: string;
  type: EquipmentType;
  capacityT?: number;
  status: EquipmentStatus;
  lastGroupCode?: string;
  lastBatchId?: string;
  outOfOrder: boolean;
};

export type EquipmentWithRouting = Equipment & {
  compatibilityWithNew?: CompatResult;
  recommended?: boolean;
  cleanRequired?: boolean;
  qcConsult?: boolean;
  selectable?: boolean;
};

export type Batch = {
  _id: string;
  batchId: string;
  gradeId: string;
  gradeName: string;
  groupCode: string;
  hasDye: boolean;
  reactorId?: string;
  kettleId?: string;
  homogeniserId?: string;
  fillingPointId?: string;
  stage: BatchStage;
  startedAt: number;
  completedAt?: number;
};

export type PlantEquipment = Equipment & {
  currentBatch: Pick<Batch, "batchId" | "gradeId" | "gradeName" | "groupCode" | "stage"> | null;
};

type RoutingResult = {
  grade: Grade;
  reactors: EquipmentWithRouting[];
  kettles: EquipmentWithRouting[];
  homogenisers: EquipmentWithRouting[];
  fillingPoints: EquipmentWithRouting[];
} | null;

type PlantStatus = {
  reactors: PlantEquipment[];
  kettles: PlantEquipment[];
  homogenisers: PlantEquipment[];
  fillingPoints: PlantEquipment[];
};

type CompatibilityMatrixData = {
  groups: Group[];
  matrix: Record<string, Record<string, Relation>>;
};

export type PlantStore = {
  groups: Group[];
  grades: Grade[];
  equipment: Equipment[];
  getRouting: (gradeId: string) => RoutingResult;
  plantStatus: PlantStatus;
  batches: Batch[];
  compatibilityMatrix: CompatibilityMatrixData;
  addGrade: (args: Omit<Grade, "isActive"> & { isActive?: boolean }) => Promise<void>;
  updateGrade: (gradeId: string, updates: Partial<Omit<Grade, "gradeId">>) => Promise<void>;
  deactivateGrade: (gradeId: string) => Promise<void>;
  addGroup: (args: Group) => Promise<void>;
  updateGroup: (groupCode: string, updates: Partial<Omit<Group, "groupCode">>) => Promise<void>;
  removeGroup: (groupCode: string) => Promise<void>;
  addEquipment: (args: Omit<Equipment, "_id" | "status" | "outOfOrder"> & { outOfOrder?: boolean }) => Promise<void>;
  updateEquipment: (equipmentId: string, updates: Partial<Omit<Equipment, "_id" | "equipmentId">>) => Promise<void>;
  removeEquipment: (equipmentId: string) => Promise<void>;
  setCompatibility: (args: { fromGroupCode: string; toGroupCode: string; relation: Relation }) => Promise<void>;
  createBatch: (args: {
    gradeId: string;
    gradeName: string;
    groupCode: string;
    hasDye: boolean;
    reactorId: string;
    kettleId: string;
    homogeniserId: string;
    fillingPointId: string;
  }) => Promise<void>;
  markClean: (args: { equipmentId: string }) => Promise<void>;
  setOutOfOrder: (args: { equipmentId: string; outOfOrder: boolean }) => Promise<void>;
  advanceBatch: (args: { batchId: string }) => Promise<void>;
  resetBatchStage: (args: { batchId: string }) => Promise<void>;
};

const EQUIPMENT: Omit<Equipment, "_id" | "status">[] = [
  { equipmentId: "R-101", displayName: "Reactor 1", type: "REACTOR", capacityT: 5, outOfOrder: false },
  { equipmentId: "R-102", displayName: "Reactor 2", type: "REACTOR", capacityT: 8, outOfOrder: false },
  { equipmentId: "K-101", displayName: "Kettle 1", type: "KETTLE", capacityT: 3, outOfOrder: false },
  { equipmentId: "K-102", displayName: "Kettle 2", type: "KETTLE", capacityT: 3, outOfOrder: false },
  { equipmentId: "K-103", displayName: "Kettle 3", type: "KETTLE", capacityT: 5, outOfOrder: false },
  { equipmentId: "K-104", displayName: "Kettle 4", type: "KETTLE", capacityT: 3, outOfOrder: true },
  { equipmentId: "K-105", displayName: "Kettle 5", type: "KETTLE", capacityT: 3, outOfOrder: false },
  { equipmentId: "K-106", displayName: "Kettle 6", type: "KETTLE", capacityT: 8, outOfOrder: false },
  { equipmentId: "K-107", displayName: "Kettle 7", type: "KETTLE", capacityT: 3, outOfOrder: false },
  { equipmentId: "H-101", displayName: "Homogeniser 1", type: "HOMOGENISER", outOfOrder: false },
  { equipmentId: "H-102", displayName: "Homogeniser 2", type: "HOMOGENISER", outOfOrder: false },
  { equipmentId: "H-103", displayName: "Homogeniser 3", type: "HOMOGENISER", outOfOrder: false },
  { equipmentId: "H-104", displayName: "Homogeniser 4", type: "HOMOGENISER", outOfOrder: false },
  { equipmentId: "H-105", displayName: "Homogeniser 5", type: "HOMOGENISER", outOfOrder: false },
  { equipmentId: "FP-101", displayName: "Filling Point 1", type: "FILLING_POINT", outOfOrder: false },
  { equipmentId: "FP-102", displayName: "Filling Point 2", type: "FILLING_POINT", outOfOrder: false },
  { equipmentId: "FP-103", displayName: "Filling Point 3", type: "FILLING_POINT", outOfOrder: false },
  { equipmentId: "FP-104", displayName: "Filling Point 4", type: "FILLING_POINT", outOfOrder: false },
  { equipmentId: "FP-105", displayName: "Filling Point 5", type: "FILLING_POINT", outOfOrder: false },
];

const defaultGroups: Group[] = groupsJson.map((g) => ({
  groupCode: g.id,
  code: g.code,
  name: g.name,
  colour: g.colour,
  thickener: g.thickener,
}));

const defaultGrades: Grade[] = gradesJson.map((g) => ({
  gradeId: g.id,
  name: g.name,
  groupCode: g.groupId,
  hasDye: g.hasDye,
  isBituminous: g.isBituminous,
  isSynthetic: g.isSynthetic,
  isFoodGrade: g.isFoodGrade,
  notes: undefined,
  isActive: true,
}));

const defaultCompatibility = compatibilityJson as Array<{
  fromGroupCode: string;
  toGroupCode: string;
  relation: Relation;
}>;

const initialEquipment = (): Equipment[] =>
  EQUIPMENT.map((eq) => ({
    ...eq,
    _id: eq.equipmentId,
    status: eq.outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE",
  }));

function loadStored<T>(key: string, fallback: () => T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

function persist<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function buildMatrix(rows: Array<{ fromGroupCode: string; toGroupCode: string; relation: Relation }>) {
  const matrix: Record<string, Record<string, Relation>> = {};
  for (const c of rows) {
    matrix[c.fromGroupCode] ??= {};
    matrix[c.fromGroupCode][c.toGroupCode] = c.relation;
  }
  return matrix;
}

function generateBatchId() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, "0");
  return `${mm}${dd}IV${hex}`;
}

const STAGE_ORDER: BatchStage[] = ["reactor", "kettle", "homogeniser", "fill_pt", "complete"];

function equipmentIdForStage(batch: Batch, stage: BatchStage) {
  if (stage === "reactor") return batch.reactorId;
  if (stage === "kettle") return batch.kettleId;
  if (stage === "homogeniser") return batch.homogeniserId;
  if (stage === "fill_pt") return batch.fillingPointId;
  return undefined;
}

export function PlantDataProvider({ children }: { children: ReactNode }) {
  const [groups, setGroupsState] = useState<Group[]>(() =>
    loadStored("grease-groups", () => defaultGroups)
  );
  const [grades, setGradesState] = useState<Grade[]>(() =>
    loadStored("grease-grades", () => defaultGrades)
  );
  const [compatibility, setCompatibilityState] = useState<typeof defaultCompatibility>(() =>
    loadStored("grease-compatibility", () => defaultCompatibility)
  );
  const [equipment, setEquipmentState] = useState<Equipment[]>(() =>
    loadStored("grease-equipment", initialEquipment)
  );
  const [batches, setBatchesState] = useState<Batch[]>(() =>
    loadStored("grease-batches", () => [])
  );

  const setEquipment = (next: Equipment[] | ((prev: Equipment[]) => Equipment[])) => {
    setEquipmentState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-equipment", value);
      return value;
    });
  };

  const setGroups = (next: Group[] | ((prev: Group[]) => Group[])) => {
    setGroupsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-groups", value);
      return value;
    });
  };

  const setGrades = (next: Grade[] | ((prev: Grade[]) => Grade[])) => {
    setGradesState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-grades", value);
      return value;
    });
  };

  const setCompatibilityRows = (
    next: typeof defaultCompatibility | ((prev: typeof defaultCompatibility) => typeof defaultCompatibility)
  ) => {
    setCompatibilityState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-compatibility", value);
      return value;
    });
  };

  const setBatches = (next: Batch[] | ((prev: Batch[]) => Batch[])) => {
    setBatchesState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-batches", value);
      return value;
    });
  };

  const compatibilityMatrix = useMemo<CompatibilityMatrixData>(() => {
    return { groups: [...groups].sort((a, b) => a.code - b.code), matrix: buildMatrix(compatibility) };
  }, [compatibility, groups]);

  const plantStatus = useMemo<PlantStatus>(() => {
    const activeBatches = batches.filter((b) => b.stage !== "complete");
    const batchByEquip: Record<string, Batch> = {};
    for (const b of activeBatches) {
      if (b.reactorId && b.stage === "reactor") batchByEquip[b.reactorId] = b;
      if (b.kettleId && b.stage === "kettle") batchByEquip[b.kettleId] = b;
      if (b.homogeniserId && b.stage === "homogeniser") batchByEquip[b.homogeniserId] = b;
      if (b.fillingPointId && b.stage === "fill_pt") batchByEquip[b.fillingPointId] = b;
      if (b.kettleId && b.stage === "reactor") batchByEquip[b.kettleId] = b;
      if (b.homogeniserId && ["reactor", "kettle"].includes(b.stage)) batchByEquip[b.homogeniserId] = b;
      if (b.fillingPointId && ["reactor", "kettle", "homogeniser"].includes(b.stage)) batchByEquip[b.fillingPointId] = b;
    }

    const enrich = (eq: Equipment): PlantEquipment => ({
      ...eq,
      currentBatch: batchByEquip[eq.equipmentId] ?? null,
    });

    return {
      reactors: equipment.filter((e) => e.type === "REACTOR").map(enrich),
      kettles: equipment.filter((e) => e.type === "KETTLE").map(enrich),
      homogenisers: equipment.filter((e) => e.type === "HOMOGENISER").map(enrich),
      fillingPoints: equipment.filter((e) => e.type === "FILLING_POINT").map(enrich),
    };
  }, [batches, equipment]);

  const getRouting = (gradeId: string): RoutingResult => {
    const grade = grades.find((g) => g.gradeId.toLowerCase() === gradeId.toLowerCase() && g.isActive !== false);
    if (!grade) return null;

    const resolveCompat = (lastGroupCode: string | undefined, newGroupCode: string) => {
      if (!lastGroupCode) {
        return { relation: "AVAILABLE_CLEAN" as CompatResult, recommended: true, cleanRequired: false, qcConsult: false };
      }
      if (lastGroupCode === newGroupCode) {
        return { relation: "SAME" as CompatResult, recommended: true, cleanRequired: false, qcConsult: false };
      }
      const rel =
        compatibility.find((c) => c.fromGroupCode === lastGroupCode && c.toGroupCode === newGroupCode)?.relation ??
        "INCOMPATIBLE";
      if (rel === "SAME" || rel === "COMPATIBLE") {
        return { relation: rel, recommended: true, cleanRequired: false, qcConsult: false };
      }
      if (rel === "BORDERLINE") {
        return { relation: rel, recommended: false, cleanRequired: true, qcConsult: true };
      }
      return { relation: rel, recommended: false, cleanRequired: true, qcConsult: false };
    };

    const buildList = (type: EquipmentType) =>
      equipment
        .filter((e) => e.type === type)
        .map<EquipmentWithRouting>((eq) => {
          if (eq.outOfOrder || eq.status === "OUT_OF_ORDER" || eq.status === "BUSY" || eq.status === "SCHEDULED") {
            return { ...eq, compatibilityWithNew: "UNAVAILABLE", recommended: false, cleanRequired: false, qcConsult: false, selectable: false };
          }
          const { relation, recommended, qcConsult } = resolveCompat(eq.lastGroupCode, grade.groupCode);
          const cleanRequired =
            eq.status === "NEEDS_CLEAN" ||
            eq.status === "DYE_FLUSH_REQUIRED" ||
            relation === "INCOMPATIBLE" ||
            relation === "BORDERLINE";
          return {
            ...eq,
            compatibilityWithNew: relation,
            recommended: recommended && !cleanRequired,
            cleanRequired,
            qcConsult,
            selectable: true,
          };
        })
        .sort((a, b) => {
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          if (!a.cleanRequired && b.cleanRequired) return -1;
          if (a.cleanRequired && !b.cleanRequired) return 1;
          return a.equipmentId.localeCompare(b.equipmentId);
        });

    return {
      grade,
      reactors: buildList("REACTOR"),
      kettles: buildList("KETTLE"),
      homogenisers: buildList("HOMOGENISER"),
      fillingPoints: buildList("FILLING_POINT"),
    };
  };

  const store: PlantStore = {
      groups: [...groups].sort((a, b) => a.code - b.code),
      grades: [...grades].sort((a, b) => a.gradeId.localeCompare(b.gradeId)),
      equipment: [...equipment].sort((a, b) => a.equipmentId.localeCompare(b.equipmentId)),
      getRouting,
      plantStatus,
      batches: [...batches].sort((a, b) => b.startedAt - a.startedAt).slice(0, 50),
      compatibilityMatrix,
      addGrade: async (args) => {
        const gradeId = args.gradeId.trim().toUpperCase();
        if (!/^[A-Z0-9]{4,6}$/.test(gradeId)) throw new Error("Grade code must be 4-6 alphanumeric characters");
        if (!groups.some((g) => g.groupCode === args.groupCode)) throw new Error(`Group ${args.groupCode} not found`);
        if (grades.some((g) => g.gradeId.toLowerCase() === gradeId.toLowerCase())) {
          throw new Error(`Grade ${gradeId} already exists`);
        }
        setGrades((prev) => [
          ...prev,
          {
            gradeId,
            name: args.name.trim(),
            groupCode: args.groupCode,
            hasDye: args.hasDye,
            isBituminous: args.isBituminous,
            isSynthetic: args.isSynthetic,
            isFoodGrade: args.isFoodGrade,
            notes: args.notes?.trim() || undefined,
            isActive: args.isActive ?? true,
          },
        ]);
      },
      updateGrade: async (gradeId, updates) => {
        const existing = grades.find((grade) => grade.gradeId === gradeId);
        if (!existing) throw new Error(`Grade ${gradeId} not found`);
        if (updates.groupCode && !groups.some((g) => g.groupCode === updates.groupCode)) {
          throw new Error(`Group ${updates.groupCode} not found`);
        }
        setGrades((prev) =>
          prev.map((grade) =>
            grade.gradeId === gradeId
              ? { ...grade, ...updates, name: updates.name?.trim() ?? grade.name }
              : grade
          )
        );
      },
      deactivateGrade: async (gradeId) => {
        if (batches.some((b) => b.gradeId === gradeId && b.stage !== "complete")) {
          throw new Error("Cannot deactivate a grade in an active batch");
        }
        let found = false;
        setGrades((prev) =>
          prev.map((grade) => {
            if (grade.gradeId !== gradeId) return grade;
            found = true;
            return { ...grade, isActive: false };
          })
        );
        if (!found) throw new Error(`Grade ${gradeId} not found`);
      },
      addGroup: async (args) => {
        const groupCode = args.groupCode.trim().toUpperCase();
        if (!/^G\d{2}$/.test(groupCode)) throw new Error("Group code must look like G01");
        if (groups.some((g) => g.groupCode === groupCode || g.code === args.code)) {
          throw new Error(`Group ${groupCode} or code ${args.code} already exists`);
        }
        setGroups((prev) => [...prev, { ...args, groupCode, name: args.name.trim() }]);
      },
      updateGroup: async (groupCode, updates) => {
        if (!groups.some((group) => group.groupCode === groupCode)) throw new Error(`Group ${groupCode} not found`);
        setGroups((prev) =>
          prev.map((group) =>
            group.groupCode === groupCode
              ? { ...group, ...updates, name: updates.name?.trim() ?? group.name }
              : group
          )
        );
      },
      removeGroup: async (groupCode) => {
        if (grades.some((g) => g.groupCode === groupCode && g.isActive !== false)) {
          throw new Error("Cannot remove a group with active grades");
        }
        if (batches.some((b) => b.groupCode === groupCode && b.stage !== "complete")) {
          throw new Error("Cannot remove a group in an active batch");
        }
        setGroups((prev) => prev.filter((g) => g.groupCode !== groupCode));
        setCompatibilityRows((prev) =>
          prev.filter((row) => row.fromGroupCode !== groupCode && row.toGroupCode !== groupCode)
        );
      },
      addEquipment: async (args) => {
        const equipmentId = args.equipmentId.trim().toUpperCase();
        if (!/^[A-Z]{1,3}-\d{3}$/.test(equipmentId)) throw new Error("Equipment ID must look like K-101");
        if (equipment.some((eq) => eq.equipmentId === equipmentId)) {
          throw new Error(`Equipment ${equipmentId} already exists`);
        }
        setEquipment((prev) => [
          ...prev,
          {
            _id: equipmentId,
            equipmentId,
            displayName: args.displayName.trim(),
            type: args.type,
            capacityT: args.capacityT,
            status: args.outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE",
            outOfOrder: args.outOfOrder ?? false,
          },
        ]);
      },
      updateEquipment: async (equipmentId, updates) => {
        if (!equipment.some((eq) => eq.equipmentId === equipmentId)) throw new Error(`Equipment ${equipmentId} not found`);
        setEquipment((prev) =>
          prev.map((eq) =>
            eq.equipmentId === equipmentId
              ? {
                  ...eq,
                  ...updates,
                  displayName: updates.displayName?.trim() ?? eq.displayName,
                  status: updates.outOfOrder ? "OUT_OF_ORDER" : updates.status ?? eq.status,
                }
              : eq
          )
        );
      },
      removeEquipment: async (equipmentId) => {
        const inUse = batches.some(
          (b) =>
            b.stage !== "complete" &&
            [b.reactorId, b.kettleId, b.homogeniserId, b.fillingPointId].includes(equipmentId)
        );
        if (inUse) throw new Error("Cannot remove equipment in an active batch");
        setEquipment((prev) => prev.filter((eq) => eq.equipmentId !== equipmentId));
      },
      setCompatibility: async ({ fromGroupCode, toGroupCode, relation }) => {
        if (!groups.some((g) => g.groupCode === fromGroupCode) || !groups.some((g) => g.groupCode === toGroupCode)) {
          throw new Error("Both groups must exist before editing compatibility");
        }
        setCompatibilityRows((prev) => {
          const without = prev.filter(
            (row) => !(row.fromGroupCode === fromGroupCode && row.toGroupCode === toGroupCode)
          );
          return [...without, { fromGroupCode, toGroupCode, relation }];
        });
      },
      createBatch: async (args) => {
        let batchId = generateBatchId();
        if (batches.some((batch) => batch.batchId === batchId)) {
          batchId = generateBatchId();
        }
        setEquipment((prev) =>
          prev.map((eq) => {
            if (eq.equipmentId === args.reactorId) return { ...eq, status: "BUSY", lastBatchId: batchId };
            if ([args.kettleId, args.homogeniserId, args.fillingPointId].includes(eq.equipmentId)) {
              return { ...eq, status: "SCHEDULED", lastBatchId: batchId };
            }
            return eq;
          })
        );
        setBatches((prev) => [
          {
            _id: batchId,
            batchId,
            ...args,
            stage: "reactor",
            startedAt: Date.now(),
          },
          ...prev,
        ]);
      },
      markClean: async ({ equipmentId }) => {
        setEquipment((prev) =>
          prev.map((eq) => (eq.equipmentId === equipmentId ? { ...eq, status: "AVAILABLE" } : eq))
        );
      },
      setOutOfOrder: async ({ equipmentId, outOfOrder }) => {
        setEquipment((prev) =>
          prev.map((eq) =>
            eq.equipmentId === equipmentId
              ? { ...eq, outOfOrder, status: outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE" }
              : eq
          )
        );
      },
      advanceBatch: async ({ batchId }) => {
        const batch = batches.find((b) => b.batchId === batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.stage === "complete") throw new Error("Batch already complete");
        const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(batch.stage) + 1];

        setEquipment((prev) =>
          prev.map((eq) => {
            const leaving =
              (batch.stage === "reactor" && eq.equipmentId === batch.reactorId) ||
              (batch.stage === "kettle" && eq.equipmentId === batch.kettleId) ||
              (batch.stage === "homogeniser" && eq.equipmentId === batch.homogeniserId) ||
              (batch.stage === "fill_pt" && eq.equipmentId === batch.fillingPointId);
            const entering =
              (nextStage === "kettle" && eq.equipmentId === batch.kettleId) ||
              (nextStage === "homogeniser" && eq.equipmentId === batch.homogeniserId) ||
              (nextStage === "fill_pt" && eq.equipmentId === batch.fillingPointId);
            if (leaving) {
              const needsDyeFlush =
                batch.hasDye && (eq.type === "KETTLE" || eq.type === "HOMOGENISER" || eq.type === "FILLING_POINT");
              return {
                ...eq,
                status: needsDyeFlush ? "DYE_FLUSH_REQUIRED" : "AVAILABLE",
                lastGroupCode: batch.groupCode,
                lastBatchId: batchId,
              };
            }
            if (entering) return { ...eq, status: "BUSY" };
            return eq;
          })
        );

        setBatches((prev) =>
          prev.map((b) =>
            b.batchId === batchId
              ? { ...b, stage: nextStage, ...(nextStage === "complete" ? { completedAt: Date.now() } : {}) }
              : b
          )
        );
      },
      resetBatchStage: async ({ batchId }) => {
        const batch = batches.find((b) => b.batchId === batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.stage === "reactor") throw new Error("Already at first stage");
        const prevStage = STAGE_ORDER[STAGE_ORDER.indexOf(batch.stage) - 1];
        const currentEquipId = equipmentIdForStage(batch, batch.stage);
        const previousEquipId = equipmentIdForStage(batch, prevStage);

        setEquipment((prev) =>
          prev.map((eq) => {
            if (previousEquipId && eq.equipmentId === previousEquipId) {
              return { ...eq, status: "BUSY", lastBatchId: batchId };
            }
            if (currentEquipId && eq.equipmentId === currentEquipId) {
              return { ...eq, status: "SCHEDULED", lastBatchId: batchId };
            }
            return eq;
          })
        );
        setBatches((prev) =>
          prev.map((b) => (b.batchId === batchId ? { ...b, stage: prevStage, completedAt: undefined } : b))
        );
      },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
