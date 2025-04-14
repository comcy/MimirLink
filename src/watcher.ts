import chokidar from "chokidar";
import { syncTags } from "./notes";
import { loadConfig } from "./config";

const config = loadConfig();

export function startWatchMode() {
    const watcher = chokidar.watch(config.wrkdyPath, {
        ignored: /(^|[\/\\])\../, // ignoriert versteckte Dateien wie .git, .wrkdy
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: true,
        depth: 5
    });

    watcher.on("change", (filePath) => {
        if (filePath.endsWith(".md")) {
            console.log(`📝 Änderung erkannt: ${filePath}`);
            syncTags();
        }
    });

    watcher.on("unlink", (filePath) => {
        if (filePath.endsWith(".md")) {
            console.log(`❌ Datei gelöscht: ${filePath}`);
            syncTags();
        }
    });

    console.log("🔁 Watch-Modus aktiviert. Änderungen an Markdown-Dateien werden überwacht...");
}