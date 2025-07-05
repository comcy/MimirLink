import fs from "fs";
import path from "path";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;
const dataDir = path.join(workspace, '.ygg');
const logFile = path.join(dataDir, 'edit-log.json');

export function trackEdit(date: Date = new Date()) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    let log: Record<string, number> = {};
    if (fs.existsSync(logFile)) {
        log = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    }

    const dateStr = date.toISOString().split("T")[0];
    log[dateStr] = (log[dateStr] || 0) + 1;

    fs.writeFileSync(logFile, JSON.stringify(log, null, 2), "utf-8");
}
