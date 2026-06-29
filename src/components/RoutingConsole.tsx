import { useEffect, useMemo, useState } from "react";
import type { ToastType } from "../hooks/useToast";
import { usePlantStore } from "../data/plantContext";

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
        <span className="eq-card-spacer" />
        {eq.capacityT && <span className="eq-capacity">{eq.capacityT}t</span>}
        <StatusBadge status={eq.status} />
      </div>
      <div className="eq-card-meta">
        {eq.cleanRequired && (
          <span className="badge badge-clean">
            needs clean
          </span>
        )}
        {eq.qcConsult && (
          <span className="badge badge-qc">
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
  const { getRouting: getLocalRouting, createBatch, markClean, grades } = usePlantStore();
  const [gradeInput, setGradeInput] = useState("");
  const [submittedGradeId, setSubmittedGradeId] = useState("");
  const [selectedReactor, setSelectedReactor] = useState("");
  const [selectedKettle, setSelectedKettle] = useState("");
  const [selectedHomo, setSelectedHomo] = useState("");
  const [selectedFP, setSelectedFP] = useState("");

  const getRouting = submittedGradeId ? getLocalRouting(submittedGradeId) : undefined;

  const resetSelection = () => {
    setSelectedReactor(""); setSelectedKettle(""); setSelectedHomo(""); setSelectedFP("");
  };

  const handleRoute = (gradeId = gradeInput) => {
    const nextGradeId = gradeId.trim();
    if (!nextGradeId) return;
    setGradeInput(nextGradeId);
    resetSelection();
    setSubmittedGradeId(nextGradeId);
  };

  const gradeSuggestions = useMemo(() => {
    const q = gradeInput.trim().toLowerCase();
    if (!q || q === submittedGradeId.toLowerCase()) return [];
    return grades
      .filter(
        (grade) =>
          grade.isActive !== false &&
          (grade.gradeId.toLowerCase().includes(q) || grade.name.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [gradeInput, grades, submittedGradeId]);

  const autoSelect = (list: EqWithCompat[], setter: (v: string) => void) => {
    const rec = list.find((e) => e.recommended && e.selectable !== false);
    if (rec) setter(rec.equipmentId);
  };

  useEffect(() => {
    if (!getRouting?.grade) return;
    if (!selectedReactor && getRouting.reactors.length) autoSelect(getRouting.reactors, setSelectedReactor);
    if (!selectedKettle && getRouting.kettles.length) autoSelect(getRouting.kettles, setSelectedKettle);
    if (!selectedHomo && getRouting.homogenisers.length) autoSelect(getRouting.homogenisers, setSelectedHomo);
    if (!selectedFP && getRouting.fillingPoints.length) autoSelect(getRouting.fillingPoints, setSelectedFP);
  }, [getRouting, selectedReactor, selectedKettle, selectedHomo, selectedFP]);

  const handleStartBatch = async () => {
    if (!getRouting?.grade || !selectedReactor || !selectedKettle || !selectedHomo || !selectedFP) return;
    try {
      await createBatch({
        gradeId: getRouting.grade.gradeId,
        gradeName: getRouting.grade.name,
        groupCode: getRouting.grade.groupCode,
        hasDye: getRouting.grade.hasDye,
        reactorId: selectedReactor,
        kettleId: selectedKettle,
        homogeniserId: selectedHomo,
        fillingPointId: selectedFP,
      });
      addToast(`Batch started: ${getRouting.grade.gradeId} (${getRouting.grade.name})`, "success");
      setGradeInput("");
      setSubmittedGradeId("");
      resetSelection();
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
  const loading = false;
  const gradeNotFound = Boolean(submittedGradeId) && getRouting === null;

  const selectedKettleEq = kettles.find((k) => k.equipmentId === selectedKettle);
  const groupNumber = grade?.groupCode ? Number.parseInt(grade.groupCode.replace("G", ""), 10) : null;
  const equipmentSections = [
    { key: "reactors" as const, label: "Reactors", tone: "reactor", items: reactors },
    { key: "kettles" as const, label: "Kettles", tone: "kettle", items: kettles },
    { key: "homogenisers" as const, label: "Homogenisers", tone: "homo", items: homogenisers },
    { key: "fillingPoints" as const, label: "Filling Points", tone: "fill", items: fillingPoints },
  ];

  return (
    <div className="routing-layout">
      <div className="routing-sidebar">
        <div className="section-heading">Product Selection</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: 5 }}>PRODUCT CODE</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              placeholder="e.g. 7770 or EP 2"
              value={gradeInput}
              onChange={(e) => {
                setGradeInput(e.target.value);
                if (!e.target.value.trim()) {
                  setSubmittedGradeId("");
                  resetSelection();
                }
              }}
              onKeyDown={(e) => e.key === "Enter" && handleRoute()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => handleRoute()} disabled={loading || !gradeInput.trim()}>
              Route
            </button>
          </div>
          {gradeSuggestions.length > 0 && (
            <div className="grade-suggestions" role="listbox" aria-label="Matching grades">
              {gradeSuggestions.map((suggestion) => (
                <button
                  key={suggestion.gradeId}
                  type="button"
                  className="grade-suggestion"
                  onClick={() => handleRoute(suggestion.gradeId)}
                >
                  <span>{suggestion.gradeId}</span>
                  <span>{suggestion.name}</span>
                  <span>{suggestion.groupCode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {grade && (
          <div className="product-summary">
            <div className="product-code">{grade.gradeId}</div>
            <div className="product-group">
              Group {groupNumber ?? grade.groupCode} ({grade.groupCode})
            </div>
            <div className="product-name">{grade.name}</div>
            <div className="product-badges">
              {grade.hasDye && <span className="badge badge-dye">🎨 Dye</span>}
              {grade.isBituminous && <span className="badge badge-clean">Bituminous</span>}
              {grade.isFoodGrade && <span className="badge badge-food">Food Grade</span>}
              {grade.isSynthetic && <span className="badge badge-synth">Synthetic</span>}
            </div>
          </div>
        )}

        <div className="dye-card">
          <span className={`dye-check ${grade?.hasDye ? "checked" : ""}`} />
          <div>
            <div className="dye-title">Contains dye / colour</div>
            <div className="dye-copy">Dye flush required on kettle, homogeniser &amp; filling point after this batch.</div>
          </div>
        </div>

        {grade?.isSynthetic && (
          <div className="warn-banner blue" style={{ fontSize: "0.7rem" }}>
            Synthetic/polyurea grade — requires dedicated equipment. Consult QC.
          </div>
        )}
        {grade?.isFoodGrade && (
          <div className="warn-banner" style={{ fontSize: "0.7rem" }}>
            Food grade — requires exclusive facility free from mineral oils. Consult QC.
          </div>
        )}
        {grade?.isBituminous && (
          <div className="warn-banner blue" style={{ fontSize: "0.7rem" }}>
            Bituminous product — verify kettle cleanliness and prior wash records before charging.
          </div>
        )}

        {grade && (
          <div className="selected-route-list">
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

      <section className="equipment-panel">
        <div className="section-heading">Equipment Selection</div>
        {!grade && !submittedGradeId && (
          <div className="empty-state">
            Enter a product code to route a batch
          </div>
        )}

        {loading && (
          <div className="empty-state">
            Checking route options...
          </div>
        )}

        {gradeNotFound && (
          <div className="empty-state error">
            Grade not found. Consult QC lab for blending sequence advice.
          </div>
        )}

        {grade && (
          <>
            <div className="equipment-grid">
              {equipmentSections.map(({ key, label, tone, items }) => {
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
                <div key={key} className={`equipment-group group-${tone}`}>
                  <div className="equipment-group-title">
                    <span className="group-dot" />
                    {label}
                  </div>
                  <div className="equipment-list">
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
                          <div className="clean-note">
                            ⚠ This equipment needs cleaning before use
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
              })}
            </div>

            <div className="status-legend">
              <span><i className="legend-dot available" />Available</span>
              <span><i className="legend-dot busy" />Busy</span>
              <span><i className="legend-dot scheduled" />Scheduled</span>
              <span><i className="legend-dot clean" />Needs Clean</span>
              <span><i className="legend-dot dye" />Dye Flush Required</span>
            </div>

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
      </section>
    </div>
  );
}
