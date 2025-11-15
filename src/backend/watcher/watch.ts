import chokidar from "chokidar";
import { AppConfig } from "../config/index.js";
import { rebuildTagsFromMarkdown } from "../synchronisation/tags.js";
import { readMetadata } from "../synchronisation/metadata.js";

export function initializeWatcher() {
    const notesDirectory = AppConfig.notesDirectory;

    const watcher = chokidar.watch(notesDirectory, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: true,
        depth: 5
    });

    const triggerTagRebuild = () => {
        const allNotes = [...readMetadata(notesDirectory, 'journal'), ...readMetadata(notesDirectory, 'page')];
        rebuildTagsFromMarkdown(notesDirectory, allNotes);
    };

    watcher.on("change", (filePath) => {
        if (filePath.endsWith(".md")) {
            console.log(`📝 Änderung erkannt: ${filePath}`);
            triggerTagRebuild();
        }
    });

    watcher.on("unlink", (filePath) => {
        if (filePath.endsWith(".md")) {
            console.log(`❌ Datei gelöscht: ${filePath}`);
            triggerTagRebuild();
        }
    });

    console.log("🔁 Watch-Modus aktiviert. Änderungen an Markdown-Dateien werden überwacht...");
}