#!/usr/bin/env node

import fs from "fs";
import os from "os";
import path from "path";

const CONFIG_PATH = path.join(os.homedir(), ".mimirlink", "mimirlink.config.json");
const DEFAULT_CONFIG: Config = { workspace: path.join(os.homedir(), "mimirlink") };

export const WORKSPACE = loadConfig().workspace;
export const CONFIG: Config = loadConfig();

export function loadConfig(): Config {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } else {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf8");
        return DEFAULT_CONFIG;
    }
}

interface Config {
    workspace: string;
    editor?: ConfigEntry
}

interface ConfigEntry {
    name: string;
    value: string;
}


console.log(`🔧 Konfiguration geladen: ${JSON.stringify(loadConfig(), null, 4)}`);
console.log(`🔧 Editor config: ${JSON.stringify(loadConfig().editor, null, 4)}`);