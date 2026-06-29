import { useMemo, useState, type FormEvent } from "react";
import type { ToastType } from "../hooks/useToast";
import { usePlantStore } from "../data/plantContext";
import type { Equipment, Grade, Group } from "../data/localPlantStore";

type AdminTab = "grades" | "equipment" | "groups" | "matrix";
type Relation = "SAME" | "COMPATIBLE" | "BORDERLINE" | "INCOMPATIBLE";
type EquipmentType = "REACTOR" | "KETTLE" | "HOMOGENISER" | "FILLING_POINT";

interface Props {
  addToast: (msg: string, type?: ToastType) => void;
}

const ADMIN_TABS: Array<{ id: AdminTab; label: string }> = [
  { id: "grades", label: "Grades" },
  { id: "equipment", label: "Equipment" },
  { id: "groups", label: "Groups" },
  { id: "matrix", label: "Matrix" },
];

const RELATIONS: Relation[] = ["SAME", "COMPATIBLE", "BORDERLINE", "INCOMPATIBLE"];
const EQUIPMENT_TYPES: EquipmentType[] = ["REACTOR", "KETTLE", "HOMOGENISER", "FILLING_POINT"];

const emptyGrade = {
  gradeId: "",
  name: "",
  groupCode: "G01",
  hasDye: false,
  isBituminous: false,
  isSynthetic: false,
  isFoodGrade: false,
  notes: "",
};

const emptyEquipment = {
  equipmentId: "",
  displayName: "",
  type: "KETTLE" as EquipmentType,
  capacityT: "",
  outOfOrder: false,
};

const emptyGroup = {
  groupCode: "",
  code: "",
  name: "",
  colour: "",
  thickener: "",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function AdminPanel({ addToast }: Props) {
  const store = usePlantStore();
  const {
    groups,
    grades,
    equipment,
    compatibilityMatrix,
    addGrade,
    updateGrade,
    deactivateGrade,
    addEquipment,
    updateEquipment,
    removeEquipment,
    addGroup,
    updateGroup,
    removeGroup,
    setCompatibility,
  } = store;
  const [tab, setTab] = useState<AdminTab>("grades");
  const [gradeDraft, setGradeDraft] = useState(emptyGrade);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [equipmentDraft, setEquipmentDraft] = useState(emptyEquipment);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState(emptyGroup);
  const [editingGroupCode, setEditingGroupCode] = useState<string | null>(null);
  const [matrixDraft, setMatrixDraft] = useState({
    fromGroupCode: groups[0]?.groupCode ?? "G01",
    toGroupCode: groups[0]?.groupCode ?? "G01",
    relation: "SAME" as Relation,
  });

  const activeGrades = useMemo(() => grades.filter((grade) => grade.isActive !== false), [grades]);
  const inactiveGrades = grades.length - activeGrades.length;

  const handleGradeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...gradeDraft,
        gradeId: gradeDraft.gradeId.trim().toUpperCase(),
        name: gradeDraft.name.trim(),
        notes: gradeDraft.notes.trim() || undefined,
      };
      if (editingGradeId) {
        await updateGrade(editingGradeId, payload);
        addToast(`Grade ${editingGradeId} updated`, "success");
      } else {
        await addGrade(payload);
        addToast(`Grade ${payload.gradeId} added`, "success");
      }
      setEditingGradeId(null);
      setGradeDraft(emptyGrade);
    } catch (error: any) {
      addToast(error.message ?? "Grade save failed", "error");
    }
  };

  const startEditGrade = (grade: Grade) => {
    setEditingGradeId(grade.gradeId);
    setGradeDraft({
      gradeId: grade.gradeId,
      name: grade.name,
      groupCode: grade.groupCode,
      hasDye: grade.hasDye,
      isBituminous: grade.isBituminous,
      isSynthetic: grade.isSynthetic,
      isFoodGrade: grade.isFoodGrade,
      notes: grade.notes ?? "",
    });
  };

  const handleEquipmentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const capacityT = equipmentDraft.capacityT.trim()
        ? Number(equipmentDraft.capacityT)
        : undefined;
      const payload = {
        equipmentId: equipmentDraft.equipmentId.trim().toUpperCase(),
        displayName: equipmentDraft.displayName.trim(),
        type: equipmentDraft.type,
        capacityT,
        outOfOrder: equipmentDraft.outOfOrder,
      };
      if (Number.isNaN(capacityT)) throw new Error("Capacity must be numeric");
      if (editingEquipmentId) {
        await updateEquipment(editingEquipmentId, payload);
        addToast(`${editingEquipmentId} updated`, "success");
      } else {
        await addEquipment(payload);
        addToast(`${payload.equipmentId} added`, "success");
      }
      setEditingEquipmentId(null);
      setEquipmentDraft(emptyEquipment);
    } catch (error: any) {
      addToast(error.message ?? "Equipment save failed", "error");
    }
  };

  const startEditEquipment = (eq: Equipment) => {
    setEditingEquipmentId(eq.equipmentId);
    setEquipmentDraft({
      equipmentId: eq.equipmentId,
      displayName: eq.displayName,
      type: eq.type,
      capacityT: eq.capacityT?.toString() ?? "",
      outOfOrder: eq.outOfOrder,
    });
  };

  const handleGroupSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        groupCode: groupDraft.groupCode.trim().toUpperCase(),
        code: Number(groupDraft.code),
        name: groupDraft.name.trim(),
        colour: groupDraft.colour.trim() || undefined,
        thickener: groupDraft.thickener.trim() || undefined,
      };
      if (!Number.isInteger(payload.code) || payload.code < 1) throw new Error("Group code number must be positive");
      if (editingGroupCode) {
        await updateGroup(editingGroupCode, payload);
        addToast(`${editingGroupCode} updated`, "success");
      } else {
        await addGroup(payload);
        addToast(`${payload.groupCode} added`, "success");
      }
      setEditingGroupCode(null);
      setGroupDraft(emptyGroup);
    } catch (error: any) {
      addToast(error.message ?? "Group save failed", "error");
    }
  };

  const startEditGroup = (group: Group) => {
    setEditingGroupCode(group.groupCode);
    setGroupDraft({
      groupCode: group.groupCode,
      code: String(group.code),
      name: group.name,
      colour: group.colour ?? "",
      thickener: group.thickener ?? "",
    });
  };

  const handleMatrixSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await setCompatibility(matrixDraft);
      addToast(`${matrixDraft.fromGroupCode} to ${matrixDraft.toGroupCode} set to ${matrixDraft.relation}`, "success");
    } catch (error: any) {
      addToast(error.message ?? "Matrix update failed", "error");
    }
  };

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div>
          <div className="section-heading">Admin Management</div>
          <div className="admin-metrics">
            <span>{activeGrades.length} active grades</span>
            <span>{equipment.length} equipment units</span>
            <span>{groups.length} groups</span>
            {inactiveGrades > 0 && <span>{inactiveGrades} inactive grades</span>}
          </div>
        </div>
        <div className="admin-tabs" role="tablist" aria-label="Admin sections">
          {ADMIN_TABS.map((item) => (
            <button
              key={item.id}
              className={cx("admin-tab", tab === item.id && "active")}
              type="button"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "grades" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={handleGradeSubmit}>
            <div className="section-heading">{editingGradeId ? "Edit Grade" : "Add Grade"}</div>
            <label>Grade Code<input className="input" value={gradeDraft.gradeId} disabled={Boolean(editingGradeId)} onChange={(e) => setGradeDraft({ ...gradeDraft, gradeId: e.target.value })} required /></label>
            <label>Grade Name<input className="input" value={gradeDraft.name} onChange={(e) => setGradeDraft({ ...gradeDraft, name: e.target.value })} required /></label>
            <label>Group<select className="input" value={gradeDraft.groupCode} onChange={(e) => setGradeDraft({ ...gradeDraft, groupCode: e.target.value })}>{groups.map((g) => <option key={g.groupCode} value={g.groupCode}>{g.groupCode} - {g.name}</option>)}</select></label>
            <div className="admin-check-grid">
              <label><input type="checkbox" checked={gradeDraft.hasDye} onChange={(e) => setGradeDraft({ ...gradeDraft, hasDye: e.target.checked })} /> Dye</label>
              <label><input type="checkbox" checked={gradeDraft.isBituminous} onChange={(e) => setGradeDraft({ ...gradeDraft, isBituminous: e.target.checked })} /> Bituminous</label>
              <label><input type="checkbox" checked={gradeDraft.isSynthetic} onChange={(e) => setGradeDraft({ ...gradeDraft, isSynthetic: e.target.checked })} /> Synthetic</label>
              <label><input type="checkbox" checked={gradeDraft.isFoodGrade} onChange={(e) => setGradeDraft({ ...gradeDraft, isFoodGrade: e.target.checked })} /> Food Grade</label>
            </div>
            <label>Notes<textarea className="input admin-textarea" value={gradeDraft.notes} onChange={(e) => setGradeDraft({ ...gradeDraft, notes: e.target.value })} /></label>
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">{editingGradeId ? "Save Grade" : "Add Grade"}</button>
              {editingGradeId && <button className="btn btn-outline" type="button" onClick={() => { setEditingGradeId(null); setGradeDraft(emptyGrade); }}>Cancel</button>}
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="batch-table admin-table">
              <thead><tr><th>Grade</th><th>Name</th><th>Group</th><th>Flags</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {grades.map((grade) => (
                  <tr key={grade.gradeId} className={grade.isActive === false ? "muted-row" : ""}>
                    <td>{grade.gradeId}</td>
                    <td>{grade.name}</td>
                    <td><span className="badge badge-SCHEDULED">{grade.groupCode}</span></td>
                    <td className="admin-flags">
                      {grade.hasDye && <span className="badge badge-dye">Dye</span>}
                      {grade.isBituminous && <span className="badge badge-clean">Bituminous</span>}
                      {grade.isSynthetic && <span className="badge badge-synth">Synthetic</span>}
                      {grade.isFoodGrade && <span className="badge badge-food">Food</span>}
                    </td>
                    <td>{grade.isActive === false ? "Inactive" : "Active"}</td>
                    <td className="admin-actions">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEditGrade(grade)}>Edit</button>
                      {grade.isActive !== false && <button className="btn btn-danger btn-sm" type="button" onClick={() => deactivateGrade(grade.gradeId).then(() => addToast(`Grade ${grade.gradeId} deactivated`, "warning")).catch((e: any) => addToast(e.message ?? "Deactivate failed", "error"))}>Deactivate</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "equipment" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={handleEquipmentSubmit}>
            <div className="section-heading">{editingEquipmentId ? "Edit Equipment" : "Add Equipment"}</div>
            <label>Equipment ID<input className="input" value={equipmentDraft.equipmentId} disabled={Boolean(editingEquipmentId)} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, equipmentId: e.target.value })} required /></label>
            <label>Display Name<input className="input" value={equipmentDraft.displayName} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, displayName: e.target.value })} required /></label>
            <label>Type<select className="input" value={equipmentDraft.type} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, type: e.target.value as EquipmentType })}>{EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <label>Capacity T<input className="input" value={equipmentDraft.capacityT} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, capacityT: e.target.value })} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={equipmentDraft.outOfOrder} onChange={(e) => setEquipmentDraft({ ...equipmentDraft, outOfOrder: e.target.checked })} /> Out of order</label>
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">{editingEquipmentId ? "Save Equipment" : "Add Equipment"}</button>
              {editingEquipmentId && <button className="btn btn-outline" type="button" onClick={() => { setEditingEquipmentId(null); setEquipmentDraft(emptyEquipment); }}>Cancel</button>}
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="batch-table admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {equipment.map((eq) => (
                  <tr key={eq.equipmentId}>
                    <td>{eq.equipmentId}</td>
                    <td>{eq.displayName}</td>
                    <td>{eq.type}</td>
                    <td>{eq.capacityT ? `${eq.capacityT}t` : "-"}</td>
                    <td><span className={`badge badge-${eq.status}`}>{eq.status}</span></td>
                    <td className="admin-actions">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEditEquipment(eq)}>Edit</button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeEquipment(eq.equipmentId).then(() => addToast(`${eq.equipmentId} removed`, "warning")).catch((e: any) => addToast(e.message ?? "Remove failed", "error"))}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "groups" && (
        <div className="admin-layout">
          <form className="admin-form" onSubmit={handleGroupSubmit}>
            <div className="section-heading">{editingGroupCode ? "Edit Group" : "Add Group"}</div>
            <label>Group Code<input className="input" value={groupDraft.groupCode} disabled={Boolean(editingGroupCode)} onChange={(e) => setGroupDraft({ ...groupDraft, groupCode: e.target.value })} required /></label>
            <label>Number<input className="input" value={groupDraft.code} onChange={(e) => setGroupDraft({ ...groupDraft, code: e.target.value })} required /></label>
            <label>Name<input className="input" value={groupDraft.name} onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })} required /></label>
            <label>Colour<input className="input" value={groupDraft.colour} onChange={(e) => setGroupDraft({ ...groupDraft, colour: e.target.value })} /></label>
            <label>Thickener<input className="input" value={groupDraft.thickener} onChange={(e) => setGroupDraft({ ...groupDraft, thickener: e.target.value })} /></label>
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">{editingGroupCode ? "Save Group" : "Add Group"}</button>
              {editingGroupCode && <button className="btn btn-outline" type="button" onClick={() => { setEditingGroupCode(null); setGroupDraft(emptyGroup); }}>Cancel</button>}
            </div>
          </form>

          <div className="admin-table-wrap">
            <table className="batch-table admin-table">
              <thead><tr><th>Group</th><th>No.</th><th>Name</th><th>Colour</th><th>Thickener</th><th>Actions</th></tr></thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.groupCode}>
                    <td>{group.groupCode}</td>
                    <td>{group.code}</td>
                    <td>{group.name}</td>
                    <td>{group.colour ?? "-"}</td>
                    <td>{group.thickener ?? "-"}</td>
                    <td className="admin-actions">
                      <button className="btn btn-outline btn-sm" type="button" onClick={() => startEditGroup(group)}>Edit</button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => removeGroup(group.groupCode).then(() => addToast(`${group.groupCode} removed`, "warning")).catch((e: any) => addToast(e.message ?? "Remove failed", "error"))}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "matrix" && (
        <div className="admin-layout matrix-admin-layout">
          <form className="admin-form" onSubmit={handleMatrixSubmit}>
            <div className="section-heading">Edit Pair</div>
            <label>From Group<select className="input" value={matrixDraft.fromGroupCode} onChange={(e) => setMatrixDraft({ ...matrixDraft, fromGroupCode: e.target.value })}>{groups.map((g) => <option key={g.groupCode} value={g.groupCode}>{g.groupCode} - {g.name}</option>)}</select></label>
            <label>To Group<select className="input" value={matrixDraft.toGroupCode} onChange={(e) => setMatrixDraft({ ...matrixDraft, toGroupCode: e.target.value })}>{groups.map((g) => <option key={g.groupCode} value={g.groupCode}>{g.groupCode} - {g.name}</option>)}</select></label>
            <label>Relation<select className="input" value={matrixDraft.relation} onChange={(e) => setMatrixDraft({ ...matrixDraft, relation: e.target.value as Relation })}>{RELATIONS.map((rel) => <option key={rel} value={rel}>{rel}</option>)}</select></label>
            <button className="btn btn-primary" type="submit">Save Pair</button>
          </form>
          <div className="admin-table-wrap">
            <table className="batch-table admin-table">
              <thead><tr><th>From</th><th>To</th><th>Relation</th></tr></thead>
              <tbody>
                {groups.flatMap((from) =>
                  groups.map((to) => {
                    const relation = compatibilityMatrix.matrix[from.groupCode]?.[to.groupCode] ?? "INCOMPATIBLE";
                    return (
                      <tr key={`${from.groupCode}-${to.groupCode}`} onClick={() => setMatrixDraft({ fromGroupCode: from.groupCode, toGroupCode: to.groupCode, relation })}>
                        <td>{from.groupCode}</td>
                        <td>{to.groupCode}</td>
                        <td><span className={`matrix-relation rel-${relation}`}>{relation}</span></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
