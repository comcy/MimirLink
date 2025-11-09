import chokidar from "chokidar";
import { WORKSPACE } from "../configuration/config";
import { syncTags } from "../synchronisation/tags";

export function startWatchMode() {
    const watcher = chokidar.watch(WORKSPACE, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
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