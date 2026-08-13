import express from "express";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { reportSchema, type Report } from "@engineercheck/report-schema";

export async function startDashboard(
  options: { reportsDirectory?: string; port?: number } = {},
): Promise<void> {
  const app = express();
  const port = options.port ?? 4173;
  const reportsDirectory = path.resolve(
    options.reportsDirectory ?? ".engineercheck/reports",
  );
  const staticDirectory = path.resolve(import.meta.dirname, "../dist");
  const load = async (): Promise<Report[]> => {
    try {
      const names = (await readdir(reportsDirectory)).filter((x) =>
        x.endsWith(".json"),
      );
      const reports = await Promise.all(
        names.map(async (name) =>
          reportSchema.parse(
            JSON.parse(
              await readFile(path.join(reportsDirectory, name), "utf8"),
            ),
          ),
        ),
      );
      return reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    } catch {
      return [];
    }
  };
  app.get("/api/reports", async (_req, res) => res.json(await load()));
  app.get("/api/reports/:id/export", async (req, res) => {
    const report = (await load()).find((x) => x.scanId === req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.attachment(`${report.project.name}-${report.scanId}.json`).json(report);
  });
  app.use(express.static(staticDirectory));
  app.use((_req, res) =>
    res.sendFile(path.join(staticDirectory, "index.html")),
  );
  app.listen(port, "127.0.0.1", () =>
    console.log(
      `EngineerCheck dashboard: http://127.0.0.1:${port}\nReports: ${reportsDirectory}`,
    ),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
)
  void startDashboard();
