import fs from "fs";
import path from "path";
import { format, parseISO, startOfYear, eachDayOfInterval, getDay, differenceInCalendarWeeks } from "date-fns";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;
const logPath = path.join(workspace, '.ygg', 'edit-log.json');
const outPath = path.join(workspace, "public", "heatmaps", "edit-heatmap.svg");


function loadEditLog(): Record<string, number> {
  if (!fs.existsSync(logPath)) return {};
  return JSON.parse(fs.readFileSync(logPath, "utf-8"));
}

function getColor(count: number): string {
  if (count >= 10) return "#216e39";
  if (count >= 5) return "#30a14e";
  if (count >= 3) return "#40c463";
  if (count >= 1) return "#9be9a8";
  return "#ebedf0";
}

function generateSVG(data: Record<string, number>, year: number): string {
  const daySize = 12;
  const padding = 2;
  const weeks = 53;

  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = new Date(year, 11, 31);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const rects = days.map((date) => {
    const iso = format(date, "yyyy-MM-dd");
    const count = data[iso] || 0;

    const week = differenceInCalendarWeeks(date, startDate, { weekStartsOn: 0 });
    const day = getDay(date); // 0 (So) – 6 (Sa)

    const x = week * (daySize + padding);
    const y = day * (daySize + padding);
    const color = getColor(count);

    return `<rect x="${x}" y="${y}" width="${daySize}" height="${daySize}" fill="${color}">
      <title>${iso}: ${count} Edit(s)</title>
    </rect>`;
  });

  const width = weeks * (daySize + padding);
  const height = 7 * (daySize + padding);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <style>rect:hover { stroke: #000; stroke-width: 1px; }</style>
  ${rects.join("\n")}
</svg>`;
}

export function writeHeatmapSVG() {
  const data = loadEditLog();
  const year = new Date().getFullYear(); // oder konfigurierbar
  const svg = generateSVG(data, year);

  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(outPath, svg, "utf-8");
  console.log("✅ SVG Heatmap erstellt:", outPath);
}
