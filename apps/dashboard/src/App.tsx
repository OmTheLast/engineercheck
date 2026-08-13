import { useEffect, useMemo, useState } from "react";
import type { Finding, Report, Severity } from "@engineercheck/report-schema";

const levels: Array<Severity | "all"> = [
  "all",
  "blocker",
  "critical",
  "high",
  "medium",
  "low",
  "info",
];
export function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [active, setActive] = useState(0);
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Finding | null>(null);
  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setReports)
      .catch(() => setReports([]));
  }, []);
  const report = reports[active];
  const categories = useMemo(
    () => [...new Set(report?.findings.map((x) => x.category) ?? [])],
    [report],
  );
  const findings =
    report?.findings.filter(
      (x) =>
        (severity === "all" || x.severity === severity) &&
        (category === "all" || x.category === category),
    ) ?? [];
  if (!report)
    return (
      <main className="empty">
        <div className="mark">EC</div>
        <h1>No scans yet</h1>
        <p>
          Run <code>engineercheck scan /path/to/project</code>, then refresh.
        </p>
      </main>
    );
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="mark">EC</span>
          <b>EngineerCheck</b>
        </div>
        <p className="label">SCAN HISTORY</p>
        {reports.map((item, index) => (
          <button
            className={index === active ? "scan active" : "scan"}
            onClick={() => {
              setActive(index);
              setSelected(null);
            }}
            key={item.scanId}
          >
            <b>{item.project.name}</b>
            <small>{new Date(item.generatedAt).toLocaleString()}</small>
          </button>
        ))}
        <div className="boundary">
          <b>Local by design</b>
          <p>
            Repository contents stay on this machine. Static scans never execute
            project code.
          </p>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="label">PROJECT READINESS REVIEW</p>
            <h1>{report.project.name}</h1>
            <p>
              {report.project.stacks.join(" · ") || "Limited stack detection"} ·{" "}
              {report.inventory.filesScanned} files inspected
            </p>
          </div>
          <a className="export" href={`/api/reports/${report.scanId}/export`}>
            Export JSON
          </a>
        </header>
        <section
          className={`banner ${report.recommendation === "Do not ship" ? "danger" : ""}`}
        >
          <div>
            <p className="label">RELEASE RECOMMENDATION</p>
            <h2>{report.recommendation}</h2>
            <p>
              Based on repository evidence available at scan time—not a
              guarantee of safety.
            </p>
          </div>
          <div className="stat">
            <strong>{report.releaseBlockers.length}</strong>
            <span>release blockers</span>
          </div>
        </section>
        <section className="summary">
          <div>
            <span>Unknowns</span>
            <strong>{report.unknowns.length}</strong>
          </div>
          <div>
            <span>Findings</span>
            <strong>{report.findings.length}</strong>
          </div>
          <div>
            <span>Strengths</span>
            <strong>{report.strengths.length}</strong>
          </div>
        </section>
        <div className="content">
          <section>
            <div className="toolbar">
              <div>
                {levels.map((level) => (
                  <button
                    className={severity === level ? "chip active" : "chip"}
                    onClick={() => setSeverity(level)}
                    key={level}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <h2>
              Findings <span>{findings.length}</span>
            </h2>
            {findings.map((finding) => (
              <button
                className="finding"
                onClick={() => setSelected(finding)}
                key={finding.id}
              >
                <span className={`severity ${finding.severity}`}>
                  {finding.severity}
                </span>
                <div>
                  <b>{finding.title}</b>
                  <p>{finding.summary}</p>
                  <small>
                    {finding.category} · {finding.confidence} confidence
                  </small>
                </div>
                <span className="arrow">→</span>
              </button>
            ))}
          </section>
          <aside className="plan">
            <p className="label">PRIORITIZED REMEDIATION</p>
            <ol>
              {report.remediationPlan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="label">KNOWN UNKNOWNS</p>
            <ul>
              {report.unknowns.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      {selected && (
        <div className="scrim" onClick={() => setSelected(null)}>
          <section className="drawer" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>
              ×
            </button>
            <span className={`severity ${selected.severity}`}>
              {selected.severity}
            </span>
            <h2>{selected.title}</h2>
            <p className="lead">{selected.summary}</p>
            <h3>What was observed</h3>
            {selected.evidence.map((item) => (
              <pre key={`${item.file}:${item.line}`}>
                <b>
                  {item.file}:{item.line}
                </b>
                {"\n"}
                {item.excerpt}
              </pre>
            ))}
            <h3>What can go wrong</h3>
            <p>{selected.failureScenario}</p>
            <h3>How to fix it</h3>
            <ol>
              {selected.remediation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <h3>How to prove it</h3>
            <ol>
              {selected.verificationSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <h3>Limitations</h3>
            <ul>
              {selected.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
