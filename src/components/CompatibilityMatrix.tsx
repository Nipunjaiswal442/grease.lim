import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const CELL_SYMBOLS: Record<string, string> = {
  SAME: "•",
  COMPATIBLE: "✓",
  BORDERLINE: "B",
  INCOMPATIBLE: "",
};

export default function CompatibilityMatrix() {
  const data = useQuery(api.compatibility.getCompatibilityMatrix);

  if (!data) {
    return <div style={{ color: "var(--text-secondary)", padding: "24px", fontSize: "0.8rem" }}>Loading matrix...</div>;
  }

  const { groups, matrix } = data;

  return (
    <div>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="section-heading">Base Compatibility Matrix</div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Row = From (previous batch group) · Col = To (next batch group) · ✓ = No Clean Needed
          </div>
        </div>
        <div style={{ display: "flex", gap: "16px", fontSize: "0.65rem" }}>
          <span><span className="badge badge-AVAILABLE" style={{ marginRight: 4 }}>•</span>Same group</span>
          <span><span className="badge badge-AVAILABLE" style={{ marginRight: 4 }}>✓</span>Compatible</span>
          <span><span className="badge badge-SCHEDULED" style={{ marginRight: 4 }}>B</span>Borderline (QC)</span>
          <span style={{ color: "var(--text-dim)" }}>empty = Incompatible</span>
        </div>
      </div>
      <div className="compat-wrap">
        <table className="compat-table">
          <thead>
            <tr>
              <th className="corner row-hdr" style={{ background: "var(--bg-panel)" }}>↓ FROM \ TO →</th>
              {groups.map((g) => (
                <th key={g.groupCode} title={g.name}>
                  {g.groupCode}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((from) => (
              <tr key={from.groupCode}>
                <th className="row-hdr" title={from.name}>{from.groupCode}</th>
                {groups.map((to) => {
                  const rel = matrix[from.groupCode]?.[to.groupCode] ?? "INCOMPATIBLE";
                  return (
                    <td
                      key={to.groupCode}
                      className={`cell-${rel}`}
                      title={`${from.groupCode} → ${to.groupCode}: ${rel}`}
                    >
                      {CELL_SYMBOLS[rel]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
