import fs from "fs";
import path from "path";
import chalk from "chalk";
import {
  format,
  parseISO,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getDay,
  getMonth,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { de } from "date-fns/locale";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;
const logPath = path.join(workspace, '.ygg', 'edit-log.json');

function loadEditLog(): Record<string, number> {
    if (!fs.existsSync(logPath)) return {};
    return JSON.parse(fs.readFileSync(logPath, "utf-8"));
  }
  
  function getColor(count: number): (s: string) => string {
    if (count >= 10) return chalk.bgGreenBright;
    if (count >= 5) return chalk.bgGreen;
    if (count >= 3) return chalk.bgYellow;
    if (count >= 1) return chalk.bgRed;
    return chalk.bgGray;
  }
  
  export function printConsoleEditHeatmap() {
    const data = loadEditLog();
  
    const today = new Date();
    const monthsToShow = 7;
  
    const monthDates = Array.from({ length: monthsToShow }, (_, i) =>
      subMonths(today, monthsToShow - 1 - i)
    );
  
    const dayLabels = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
    console.log(chalk.bold(`📆 Edit-Heatmap – Letzte ${monthsToShow} Monate\n`));
    console.log("    " + dayLabels.join("  "));
  
    for (const monthDate of monthDates) {
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });
  
      // Vorbereitung: 7 Reihen (So-Sa), jede Zeile besteht aus farbigen Kästchen pro Tag
      const weekRows: string[][] = Array.from({ length: 7 }, () => []);
  
      for (const date of days) {
        const iso = format(date, "yyyy-MM-dd");
        const count = data[iso] || 0;
        const dayOfWeek = getDay(date); // 0 = So
        weekRows[dayOfWeek].push(getColor(count)(" ") + " ");
      }
  
      const title = format(monthDate, "MMMM yyyy", { locale: de });
      console.log(chalk.bold(`\n${title}`));
  
      for (let d = 0; d < 7; d++) {
        const rowStr = weekRows[d].join("");
        console.log(`${dayLabels[d]}: ${rowStr}`);
      }
    }
  
    console.log("\nLegende:");
    console.log(
      `${chalk.bgGray("  ")} = 0  ${chalk.bgRed("  ")} = 1+  ${chalk.bgYellow("  ")} = 3+  ${chalk.bgGreen("  ")} = 5+  ${chalk.bgGreenBright("  ")} = 10+`
    );
  }