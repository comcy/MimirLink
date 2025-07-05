import fs from "fs";
import path from "path";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;
const logFilePath = path.join(workspace, '.ygg', 'edit-log.json');
const outputPath = path.join(workspace, "public", "heatmaps", "edit-heatmap.html");

function loadEditLog(): Record<string, number> {
    if (!fs.existsSync(logFilePath)) return {};
    const raw = fs.readFileSync(logFilePath, "utf-8");
    return JSON.parse(raw);
}

function generateHeatmapHTML(data: Record<string, number>): string {
    const timestampData: Record<number, number> = {};

    for (const date in data) {
        const ts = Math.floor(new Date(date).getTime() / 1000);
        timestampData[ts] = data[date];
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Edit Heatmap</title>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/cal-heatmap@4.0.0/dist/cal-heatmap.umd.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/cal-heatmap@4.0.0/cal-heatmap.css">
  <style>
    body {
      font-family: sans-serif;
      padding: 2rem;
      background: #fff;
    }
  </style>
</head>
<body>
  <h1>Edit Heatmap</h1>
  <div id="heatmap"></div>

  <script>
    // Hier eingebettete Daten – als Beispiel
    const data = {
      1738886400: 1,
      1738972800: 2,
      1739059200: 4
    };

    const cal = new CalHeatmap.CalHeatmap(); // <-- so wird die Klasse im UMD-Build verwendet!

    cal.paint({
      itemSelector: "#heatmap",
      domain: "year",
      subDomain: "day",
      range: 1,
      data: {
        source: data,
        type: "json"
      },
      scale: {
        color: {
          type: "linear",
          range: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
        }
      },
      legend: [1, 3, 5, 10]
    });
  </script>
</body>
</html>`;
}

export function createEditHeatmap() {
    const data = loadEditLog();
    const html = generateHeatmapHTML(data);

    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log("✅ Heatmap HTML erfolgreich generiert:", outputPath);
}

