import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ToastType } from "../hooks/useToast";

interface Props {
  addToast: (msg: string, type?: ToastType) => void;
}

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available", BUSY: "Busy", SCHEDULED: "Scheduled",
  NEEDS_CLEAN: "Needs Clean", DYE_FLUSH_REQUIRED: "Dye Flush Req", OUT_OF_ORDER: "Out of Order",
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot dot-${status}`} style={{ marginRight: 6 }} />;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

type Batch = {
  batchId: string; gradeId: string; gradeName: string; groupCode: string; stage: string;
} | null;

type Equipment = {
  _id: string; equipmentId: string; displayName: string; type: string;
  status: string; lastGroupCode?: string; capacityT?: number;
  outOfOrder: boolean; currentBatch: Batch;
};

function PlantEqCard({
  eq, onMarkClean, onToggleOOR, onResetStage,
}: {
  eq: Equipment;
  onMarkClean: () => void;
  onToggleOOR: () => void;
  onResetStage: () => void;
}) {
  const showReset = eq.status === "BUSY" && eq.currentBatch;

  return (
    <div className={`plant-eq-card st-${eq.status}`}>
      <div className="plant-card-top">
        <div className="plant-card-name">
          <StatusDot status={eq.status} />
          <span>{eq.displayName}</span>
        </div>
        <StatusBadge status={eq.status} />
      </div>

      {eq.lastGroupCode && (
        <div className="plant-card-meta">
          Last: {eq.lastGroupCode}
        </div>
      )}
      {eq.capacityT && (
        <div className="plant-card-meta">
          {eq.capacityT}t capacity
        </div>
      )}

      {eq.currentBatch && (
        <div className="plant-batch-block">
          <div className="plant-batch-title">
            {eq.status === "SCHEDULED" ? "Incoming:" : "Active:"} {eq.currentBatch.gradeId}
          </div>
          <div className="plant-batch-tags">
            <span className="badge badge-SCHEDULED">{eq.currentBatch.groupCode}</span>
            <span className={`badge badge-stage-${eq.currentBatch.stage}`}>{eq.currentBatch.stage}</span>
          </div>
        </div>
      )}

      <div className="plant-card-actions">
        {showReset && (
          <button className="btn btn-outline btn-sm" onClick={onResetStage}>
            Reset
          </button>
        )}
        {(eq.status === "NEEDS_CLEAN" || eq.status === "DYE_FLUSH_REQUIRED") && (
          <button className="btn btn-warn btn-sm" onClick={onMarkClean}>
            {eq.status === "DYE_FLUSH_REQUIRED" ? "Dye Flush Done" : "Mark Clean"}
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={onToggleOOR}>
          {eq.outOfOrder ? "Set Online" : "Set OOR"}
        </button>
      </div>
    </div>
  );
}

export default function PlantStatus({ addToast }: Props) {
  const plantStatus = useQuery(api.plantStatus.getPlantStatus);
  const markClean = useMutation(api.equipment.markClean);
  const setOOR = useMutation(api.equipment.setOutOfOrder);
  const resetStage = useMutation(api.batches.resetBatchStage);

  const handleMarkClean = async (equipmentId: string) => {
    try {
      await markClean({ equipmentId });
      addToast(`${equipmentId} marked clean`, "success");
    } catch (e: any) {
      addToast(e.message ?? "Failed", "error");
    }
  };

  const handleToggleOOR = async (equipmentId: string, current: boolean) => {
    try {
      await setOOR({ equipmentId, outOfOrder: !current });
      addToast(`${equipmentId} ${!current ? "set out of order" : "set online"}`, "warning");
    } catch (e: any) {
      addToast(e.message ?? "Failed", "error");
    }
  };

  const handleResetStage = async (batchId: string) => {
    try {
      await resetStage({ batchId });
      addToast("Stage reset", "warning");
    } catch (e: any) {
      addToast(e.message ?? "Failed", "error");
    }
  };

  if (!plantStatus) {
    return <div style={{ color: "var(--text-secondary)", padding: "24px", fontSize: "0.8rem" }}>Loading plant status...</div>;
  }

  const columns = [
    { key: "reactors" as const, label: "Reactors", tone: "reactor" },
    { key: "kettles" as const, label: "Kettles", tone: "kettle" },
    { key: "homogenisers" as const, label: "Homogenisers", tone: "homo" },
    { key: "fillingPoints" as const, label: "Filling Points", tone: "fill" },
  ];

  return (
    <div>
      <div className="view-toolbar">
        <div className="live-label"><span className="live-dot" />Live plant view</div>
        <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
      <div className="plant-grid">
        {columns.map(({ key, label, tone }) => (
          <div key={key} className={`plant-col group-${tone}`}>
            <div className="section-heading">{label}</div>
            {(plantStatus[key] as Equipment[]).map((eq) => (
              <PlantEqCard
                key={eq.equipmentId}
                eq={eq}
                onMarkClean={() => handleMarkClean(eq.equipmentId)}
                onToggleOOR={() => handleToggleOOR(eq.equipmentId, eq.outOfOrder)}
                onResetStage={() => eq.currentBatch && handleResetStage(eq.currentBatch.batchId)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
