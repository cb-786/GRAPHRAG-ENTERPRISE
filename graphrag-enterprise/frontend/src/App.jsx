import HealthCheck from "./components/HealthCheck";

const ITERATIONS = [
  { n: 1, label: "Skeleton & Routing",      done: true  },
  { n: 2, label: "Graph DB + Cache",         done: false },
  { n: 3, label: "LLM Integration",          done: false },
  { n: 4, label: "GraphRAG Pipeline",        done: false },
  { n: 5, label: "Evaluation & Fine-tuning", done: false },
];

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "18px 32px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "var(--accent)", display: "grid", placeItems: "center",
          fontWeight: 900, fontSize: 16,
        }}>N</div>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700 }}>NIC Code Classification</h1>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>GraphRAG Enterprise</p>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 11, fontWeight: 700,
          background: "var(--accent-dim)", color: "var(--accent)",
          border: "1px solid var(--accent)", borderRadius: 99,
          padding: "3px 10px", letterSpacing: ".06em",
        }}>
          ITERATION 1
        </span>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1, display: "flex", gap: 32,
        padding: 32, maxWidth: 1100, margin: "0 auto", width: "100%",
      }}>
        {/* Left: roadmap */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".06em", marginBottom: 14 }}>
            BUILD ROADMAP
          </p>
          <ul style={{ listStyle: "none" }}>
            {ITERATIONS.map(({ n, label, done }) => (
              <li key={n} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 0", borderBottom: "1px solid var(--border)",
                opacity: done ? 1 : 0.45,
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: done ? "var(--accent)" : "var(--border)",
                  display: "grid", placeItems: "center",
                  fontSize: 11, fontWeight: 700,
                }}>
                  {done ? "✓" : n}
                </span>
                <span style={{ fontSize: 13 }}>{label}</span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Right: active panel */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Iteration 1 — Skeleton &amp; Routing</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
              FastAPI + React + Nginx are wired together. Click below to confirm the
              stack is healthy before moving on.
            </p>
          </div>
          <HealthCheck />
        </section>
      </main>
    </div>
  );
}