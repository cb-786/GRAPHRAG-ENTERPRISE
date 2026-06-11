import { useState } from "react";
import { fetchHealth, fetchStatus } from "../services/api";

const pill = (state) => {
  const map = {
    up: { color: "var(--green)", label: "UP" },
    operational: { color: "var(--green)", label: "OPERATIONAL" },
    not_configured: { color: "var(--yellow)", label: "NOT CONFIGURED" },
    down: { color: "var(--red)", label: "DOWN" },
  };
  const { color, label } = map[state] ?? { color: "var(--muted)", label: state.toUpperCase() };
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}55`,
      borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      letterSpacing: ".05em",
    }}>
      {label}
    </span>
  );
};

export default function HealthCheck() {
  const [health, setHealth]   = useState(null);
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    setHealth(null);
    setStatus(null);
    try {
      const [h, s] = await Promise.all([fetchHealth(), fetchStatus()]);
      setHealth(h);
      setStatus(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: 28, maxWidth: 540, width: "100%",
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18, color: "var(--text)" }}>
        Backend Health
      </h2>

      <button
        onClick={check}
        disabled={loading}
        style={{
          background: loading ? "var(--accent-dim)" : "var(--accent)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "10px 22px", fontWeight: 600, fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "background .15s",
          width: "100%",
        }}
      >
        {loading ? "Checking…" : "Check Backend Health"}
      </button>

      {error && (
        <p style={{
          marginTop: 16, padding: "10px 14px",
          background: "#ef444420", border: "1px solid #ef444455",
          borderRadius: 8, color: "var(--red)", fontSize: 13,
        }}>
          ⚠ {error}
        </p>
      )}

      {health && (
        <div style={{ marginTop: 20 }}>
          {/* Liveness */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Status</span>
            {pill(health.status === "OK" ? "operational" : "down")}
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: "1px solid var(--border)",
          }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Service</span>
            <span style={{ fontSize: 13 }}>{health.service}</span>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "12px 0", borderBottom: status ? "1px solid var(--border)" : "none",
          }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Version</span>
            <span style={{ fontSize: 13, fontFamily: "monospace" }}>v{health.version}</span>
          </div>

          {/* Dependencies */}
          {status?.services && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10, letterSpacing: ".06em" }}>
                DEPENDENCIES
              </p>
              {Object.entries(status.services).map(([svc, state]) => (
                <div key={svc} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 13, textTransform: "capitalize" }}>{svc}</span>
                  {pill(state)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}