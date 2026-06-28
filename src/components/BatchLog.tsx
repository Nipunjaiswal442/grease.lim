import type { ToastType } from "../hooks/useToast";
import { usePlantStore } from "../data/plantContext";

interface Props {
  addToast: (msg: string, type?: ToastType) => void;
}

const STAGE_ACTIONS: Record<string, string> = {
  reactor: "+ Kettle",
  kettle: "+ Homogeniser",
  homogeniser: "+ Fill Pt",
  fill_pt: "✓ Complete",
};

const STAGE_LABELS: Record<string, string> = {
  reactor: "Reactor", kettle: "Kettle", homogeniser: "Homogeniser",
  fill_pt: "Fill Pt", complete: "Complete",
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function BatchLog({ addToast }: Props) {
  const { batches, advanceBatch } = usePlantStore();

  const handleAdvance = async (batchId: string) => {
    try {
      await advanceBatch({ batchId });
      addToast(`Batch ${batchId.slice(-6)} advanced to next stage`, "success");
    } catch (e: any) {
      addToast(e.message ?? "Failed", "error");
    }
  };

  if (!batches) {
    return <div style={{ color: "var(--text-secondary)", padding: "24px", fontSize: "0.8rem" }}>Loading batches...</div>;
  }

  if (batches.length === 0) {
    return (
      <div className="empty-state">
        No batches yet. Start one from the Routing Console.
      </div>
    );
  }

  return (
    <div>
      <div className="view-toolbar">
        <div className="live-label">Last {Math.min(batches.length, 10)} batches</div>
        <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
      <div className="batch-table-wrap">
        <table className="batch-table">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Product</th>
              <th>Group</th>
              <th>Dye</th>
              <th>Reactor</th>
              <th>Kettle</th>
              <th>Homo</th>
              <th>Fill Pt</th>
              <th>Stage</th>
              <th>Started</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b._id}>
                <td style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  {b.batchId}
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{b.gradeId}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{b.gradeName}</div>
                </td>
                <td>
                  <span className="badge badge-SCHEDULED">{b.groupCode}</span>
                </td>
                <td>
                  {b.hasDye && <span className="badge badge-dye">🎨</span>}
                  {!b.hasDye && <span style={{ color: "var(--text-dim)" }}>—</span>}
                </td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{b.reactorId ?? "—"}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{b.kettleId ?? "—"}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{b.homogeniserId ?? "—"}</td>
                <td style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{b.fillingPointId ?? "—"}</td>
                <td>
                  <span className={`badge badge-stage-${b.stage}`}>{STAGE_LABELS[b.stage]}</span>
                </td>
                <td style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{fmtDate(b.startedAt)}</td>
                <td>
                  {b.stage !== "complete" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAdvance(b.batchId)}
                    >
                      {STAGE_ACTIONS[b.stage].replace("+", "→")}
                    </button>
                  )}
                  {b.stage === "complete" && (
                    <span style={{ fontSize: "0.65rem", color: "var(--stage-complete)" }}>
                      {b.completedAt ? fmtDate(b.completedAt) : "Done"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
