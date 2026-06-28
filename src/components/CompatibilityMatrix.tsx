import { usePlantStore } from "../data/plantContext";

const CELL_SYMBOLS: Record<string, string> = {
  SAME: "•",
  COMPATIBLE: "✓",
  BORDERLINE: "B",
  INCOMPATIBLE: "",
};

export default function CompatibilityMatrix() {
  const { compatibilityMatrix: data } = usePlantStore();

  if (!data) {
    return <div style={{ color: "var(--text-secondary)", padding: "24px", fontSize: "0.8rem" }}>Loading matrix...</div>;
  }

  const { groups, matrix } = data;

  return (
    <div>
      <div className="matrix-toolbar">
        <div>
          <div className="section-heading">Base Compatibility Matrix — Previous → Next (✓ = No Clean Needed)</div>
          <div className="matrix-subtitle">From ↓ / To →</div>
        </div>
        <div className="matrix-legend">
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
              <th className="corner row-hdr">From↓<br />To→</th>
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
