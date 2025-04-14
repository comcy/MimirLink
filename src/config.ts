#!/usr/bin/env node

import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_PATH = path.join(os.homedir(), ".wrkdy", "wrkdy.config.json");
const DEFAULT_CONFIG = { wrkdyPath: path.join(os.homedir(), "wrkdy") };

export function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } else {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf8");
        return DEFAULT_CONFIG;
    }
}
