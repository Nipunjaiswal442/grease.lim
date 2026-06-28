import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { ToastType } from "../hooks/useToast";

interface Props {
  addToast: (msg: string, type?: ToastType) => void;
}

type EqWithCompat = {
  _id: string;
  equipmentId: string;
  displayName: string;
  type: string;
  capacityT?: number;
  status: string;
  lastGroupCode?: string;
  compatibilityWithNew?: string;
  recommended?: boolean;
  cleanRequired?: boolean;
  qcConsult?: boolean;
  selectable?: boolean;
};

type RoutingData = {
  grade: { gradeId: string; name: string; groupCode: string; hasDye: boolean; isSynthetic: boolean; isFoodGrade: boolean };
  reactors: EqWithCompat[];
  kettles: EqWithCompat[];
  homogenisers: EqWithCompat[];
  fillingPoints: EqWithCompat[];
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "available", BUSY: "busy", SCHEDULED: "scheduled",
  NEEDS_CLEAN: "needs clean", DYE_FLUSH_REQUIRED: "dye flush req", OUT_OF_ORDER: "out of order",
};

function StatusDot({ status }: { status: string }) {
  return <span className={`status-dot dot-${status}`} />;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function EqCard({
  eq, selected, onSelect,
}: {
  eq: EqWithCompat; selected: boolean; onSelect: () => void;
}) {
  const selectable = eq.selectable !== false;
  const cls = [
    "eq-card",
    `st-${eq.status}`,
    selected ? "selected" : "",
    !selectable ? "not-selectable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} onClick={selectable ? onSelect : undefined}>
      <div className="eq-card-header">
        <StatusDot status={eq.status} />
        <span className="eq-name">{eq.displayName}</span>
        {eq.recommended && <span className="badge-rec">★ REC</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
        <StatusBadge status={eq.status} />
        {eq.capacityT && (
          <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>{eq.capacityT}t</span>
        )}
        {eq.cleanRequired && (
          <span className="badge" style={{ background: "rgba(249,115,22,.12)", color: "var(--status-clean)" }}>
            clean req
          </span>
        )}
        {eq.qcConsult && (
          <span className="badge" style={{ background: "rgba(245,158,11,.12)", color: "var(--status-scheduled)" }}>
            QC consult
          </span>
        )}
        {eq.lastGroupCode && (
          <span style={{ fontSize: "0.6rem", color: "var(--text-dim)" }}>last: {eq.lastGroupCode}</span>
        )}
      </div>
    </div>
  );
}

export default function RoutingConsole({ addToast }: Props) {
  const [gradeInput, setGradeInput] = useState("");
  const [routingData, setRoutingData] = useState<RoutingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReactor, setSelectedReactor] = useState("");
  const [selectedKettle, setSelectedKettle] = useState("");
  const [selectedHomo, setSelectedHomo] = useState("");
  const [selectedFP, setSelectedFP] = useState("");

  const getRouting = useQuery(
    api.routing.getRouting,
    gradeInput.trim() && routingData ? { gradeId: gradeInput.trim() } : "skip"
  );
  const createBatch = useMutation(api.batches.createBatch);
  const markClean = useMutation(api.equipment.markClean);

  const handleRoute = async () => {
    if (!gradeInput.trim()) return;
    setLoading(true);
    setRoutingData(null);
    setSelectedReactor(""); setSelectedKettle(""); setSelectedHomo(""); setSelectedFP("");
    try {
      // Trigger query by setting state — query is reactive
      setRoutingData({ grade: null as any, reactors: [], kettles: [], homogenisers: [], fillingPoints: [] });
    } finally {
      setLoading(false);
    }
  };

  // Use real-time query result
  const data = getRouting ?? routingData;

  const autoSelect = (list: EqWithCompat[], setter: (v: string) => void) => {
    const rec = list.find((e) => e.recommended && e.selectable !== false);
    if (rec) setter(rec.equipmentId);
  };

  // Auto-select recommended when data arrives
  if (getRouting && getRouting.grade) {
    if (!selectedReactor && getRouting.reactors.length) autoSelect(getRouting.reactors, setSelectedReactor);
    if (!selectedKettle && getRouting.kettles.length) autoSelect(getRouting.kettles, setSelectedKettle);
    if (!selectedHomo && getRouting.homogenisers.length) autoSelect(getRouting.homogenisers, setSelectedHomo);
    if (!selectedFP && getRouting.fillingPoints.length) autoSelect(getRouting.fillingPoints, setSelectedFP);
  }

  const handleStartBatch = async () => {
    if (!data?.grade || !selectedReactor || !selectedKettle || !selectedHomo || !selectedFP) return;
    try {
      await createBatch({
        gradeId: data.grade.gradeId,
        gradeName: data.grade.name,
        groupCode: data.grade.groupCode,
        hasDye: data.grade.hasDye,
        reactorId: selectedReactor,
        kettleId: selectedKettle,
        homogeniserId: selectedHomo,
        fillingPointId: selectedFP,
      });
      addToast(`Batch started: ${data.grade.gradeId} (${data.grade.name})`, "success");
      setGradeInput("");
      setRoutingData(null);
      setSelectedReactor(""); setSelectedKettle(""); setSelectedHomo(""); setSelectedFP("");
    } catch (e: any) {
      addToast(e.message ?? "Failed to start batch", "error");
    }
  };

  const handleMarkClean = async (equipmentId: string) => {
    try {
      await markClean({ equipmentId });
      addToast(`${equipmentId} marked clean`, "success");
    } catch (e: any) {
      addToast(e.message ?? "Failed", "error");
    }
  };

  const grade = getRouting?.grade;
  const reactors = getRouting?.reactors ?? [];
  const kettles = getRouting?.kettles ?? [];
  const homogenisers = getRouting?.homogenisers ?? [];
  const fillingPoints = getRouting?.fillingPoints ?? [];

  const allSelected = selectedReactor && selectedKettle && selectedHomo && selectedFP;

  const selectedKettleEq = kettles.find((k) => k.equipmentId === selectedKettle);

  return (
    <div className="routing-layout">
      {/* LEFT SIDEBAR */}
      <div className="routing-sidebar">
        <div className="section-heading">Product Selection</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: 5 }}>PRODUCT CODE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="e.g. 7770"
              value={gradeInput}
              onChange={(e) => {
                setGradeInput(e.target.value);
                if (!e.target.value.trim()) { setRoutingData(null); }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleRoute()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleRoute} disabled={loading || !gradeInput.trim()}>
              Route
            </button>
          </div>
        </div>

        {grade === null && gradeInput && (
          <div style={{ fontSize: "0.75rem", color: "var(--status-busy)", padding: "8px 0" }}>
            Grade not found. Consult QC lab for blending sequence advice.
          </div>
        )}

        {grade && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>
              {grade.name}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span className="badge badge-SCHEDULED">{grade.groupCode}</span>
              {grade.hasDye && <span className="badge badge-dye">🎨 Dye</span>}
              {grade.isFoodGrade && <span className="badge badge-food">Food Grade</span>}
              {grade.isSynthetic && <span className="badge badge-synth">Synthetic</span>}
            </div>

            {grade.hasDye && (
              <div className="warn-banner purple" style={{ fontSize: "0.7rem" }}>
                Contains dye / colour. Dye flush required on kettle, homogeniser &amp; filling point after this batch.
              </div>
            )}
            {grade.isSynthetic && (
              <div className="warn-banner blue" style={{ fontSize: "0.7rem" }}>
                Synthetic/polyurea grade — requires dedicated equipment. Consult QC.
              </div>
            )}
            {grade.isFoodGrade && (
              <div className="warn-banner" style={{ fontSize: "0.7rem" }}>
                Food grade — requires exclusive facility free from mineral oils. Consult QC.
              </div>
            )}
          </div>
        )}

        {grade && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.62rem", color: "var(--text-dim)", marginBottom: 8, letterSpacing: "0.08em" }}>
              SELECTED ROUTE
            </div>
            {[
              { label: "Reactor", val: selectedReactor },
              { label: "Kettle", val: selectedKettle },
              { label: "Homo", val: selectedHomo },
              { label: "Fill Pt", val: selectedFP },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "0.72rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ color: val ? "var(--accent)" : "var(--text-dim)" }}>{val || "—"}</span>
              </div>
            ))}

            {selectedKettleEq?.cleanRequired && (
              <div className="warn-banner" style={{ marginTop: 8, fontSize: "0.68rem" }}>
                Kettle wash will be generated. Collect in barrel; use for Servo Grease C or consult QC.
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="routing-main">
        {!grade && !gradeInput && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)", fontSize: "0.8rem" }}>
            Enter a product code to route a batch
          </div>
        )}

        {grade && (
          <>
            {(["reactors", "kettles", "homogenisers", "fillingPoints"] as const).map((key) => {
              const items = { reactors, kettles, homogenisers, fillingPoints }[key];
              const labels: Record<string, string> = {
                reactors: "Reactors", kettles: "Kettles",
                homogenisers: "Homogenisers", fillingPoints: "Filling Points",
              };
              const getSelected = () => {
                if (key === "reactors") return selectedReactor;
                if (key === "kettles") return selectedKettle;
                if (key === "homogenisers") return selectedHomo;
                return selectedFP;
              };
              const setSelected = (id: string) => {
                if (key === "reactors") setSelectedReactor(id);
                else if (key === "kettles") setSelectedKettle(id);
                else if (key === "homogenisers") setSelectedHomo(id);
                else setSelectedFP(id);
              };

              return (
                <div key={key} className="eq-section">
                  <div className="section-heading">{labels[key]}</div>
                  <div className="eq-grid">
                    {items.map((eq) => (
                      <div key={eq.equipmentId}>
                        <EqCard
                          eq={eq}
                          selected={getSelected() === eq.equipmentId}
                          onSelect={() => setSelected(eq.equipmentId)}
                        />
                        {eq.status === "NEEDS_CLEAN" && (
                          <button
                            className="btn btn-warn btn-sm"
                            style={{ width: "100%", marginTop: 4, justifyContent: "center" }}
                            onClick={() => handleMarkClean(eq.equipmentId)}
                          >
                            Mark as Cleaned
                          </button>
                        )}
                        {eq.status === "DYE_FLUSH_REQUIRED" && (
                          <button
                            className="btn btn-warn btn-sm"
                            style={{ width: "100%", marginTop: 4, justifyContent: "center", borderColor: "rgba(168,85,247,.3)", color: "var(--status-dye)", background: "rgba(168,85,247,.12)" }}
                            onClick={() => handleMarkClean(eq.equipmentId)}
                          >
                            Mark Dye Flush Done
                          </button>
                        )}
                        {getSelected() === eq.equipmentId && eq.cleanRequired && (
                          <div style={{ fontSize: "0.62rem", color: "var(--status-clean)", marginTop: 3 }}>
                            ⚠ This equipment needs cleaning before use
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* BOTTOM PREVIEW + CONFIRM */}
            <div className="route-preview">
              <div className="route-path">
                <span className="hl">{grade.gradeId}</span>
                <span style={{ color: "var(--text-dim)", margin: "0 6px" }}>→</span>
                <span className="hl">{selectedReactor || "?"}</span>
                <span style={{ color: "var(--text-dim)", margin: "0 6px" }}>→</span>
                <span className="hl">{selectedKettle || "?"}</span>
                <span style={{ color: "var(--text-dim)", margin: "0 6px" }}>→</span>
                <span className="hl">{selectedHomo || "?"}</span>
                <span style={{ color: "var(--text-dim)", margin: "0 6px" }}>→</span>
                <span className="hl">{selectedFP || "?"}</span>
              </div>
              <button
                className="btn btn-confirm"
                disabled={!allSelected}
                onClick={handleStartBatch}
              >
                ✓ Confirm &amp; Start Batch
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
