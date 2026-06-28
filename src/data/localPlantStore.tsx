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
  groups: Array<{ groupCode: string; code: number; name: string; colour?: string; thickener?: string }>;
  matrix: Record<string, Record<string, Relation>>;
};

export type PlantStore = {
  getRouting: (gradeId: string) => RoutingResult;
  plantStatus: PlantStatus;
  batches: Batch[];
  compatibilityMatrix: CompatibilityMatrixData;
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

const groups = groupsJson.map((g) => ({
  groupCode: g.id,
  code: g.code,
  name: g.name,
  colour: g.colour,
  thickener: g.thickener,
}));

const grades: Grade[] = gradesJson.map((g) => ({
  gradeId: g.id,
  name: g.name,
  groupCode: g.groupId,
  hasDye: g.hasDye,
  isBituminous: g.isBituminous,
  isSynthetic: g.isSynthetic,
  isFoodGrade: g.isFoodGrade,
}));

const compatibility = compatibilityJson as Array<{
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

function generateBatchId() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hex = Math.random().toString(16).slice(2, 10).toUpperCase().padEnd(8, "0");
  return `${mm}${dd}IV${hex}`;
}

export function PlantDataProvider({ children }: { children: ReactNode }) {
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

  const setBatches = (next: Batch[] | ((prev: Batch[]) => Batch[])) => {
    setBatchesState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      persist("grease-batches", value);
      return value;
    });
  };

  const compatibilityMatrix = useMemo<CompatibilityMatrixData>(() => {
    const matrix: Record<string, Record<string, Relation>> = {};
    for (const c of compatibility) {
      matrix[c.fromGroupCode] ??= {};
      matrix[c.fromGroupCode][c.toGroupCode] = c.relation;
    }
    return { groups, matrix };
  }, []);

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
    const grade = grades.find((g) => g.gradeId === gradeId);
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
      getRouting,
      plantStatus,
      batches: [...batches].sort((a, b) => b.startedAt - a.startedAt).slice(0, 50),
      compatibilityMatrix,
      createBatch: async (args) => {
        const batchId = generateBatchId();
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
        const stageOrder: BatchStage[] = ["reactor", "kettle", "homogeniser", "fill_pt", "complete"];
        const batch = batches.find((b) => b.batchId === batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.stage === "complete") throw new Error("Batch already complete");
        const nextStage = stageOrder[stageOrder.indexOf(batch.stage) + 1];

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
        const stageOrder: BatchStage[] = ["reactor", "kettle", "homogeniser", "fill_pt", "complete"];
        const batch = batches.find((b) => b.batchId === batchId);
        if (!batch) throw new Error("Batch not found");
        if (batch.stage === "reactor") throw new Error("Already at first stage");
        const prevStage = stageOrder[stageOrder.indexOf(batch.stage) - 1];
        setBatches((prev) =>
          prev.map((b) => (b.batchId === batchId ? { ...b, stage: prevStage, completedAt: undefined } : b))
        );
      },
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
