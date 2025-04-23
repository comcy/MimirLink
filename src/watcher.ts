import chokidar from "chokidar";
import { syncTags } from "./notes";
import { ConfigurationCore } from "./configuration";
import { firstValueFrom } from "rxjs";
import { Injectable } from "./base/dependency-injection-container";


/**
 * Start the watch mode to monitor changes in markdown files.
 */
@Injectable()
export class WorkspaceWatcher {
    
    private workspace: string = '';

    constructor(private configService: ConfigurationCore) { }

    public async startWatchMode(): Promise<void> {

        const config = await firstValueFrom(this.configService.getConfig$());
        
        if (config) {
            this.workspace = config.workspace;
            console.log("Workspace: ", this.workspace);
        }

        const watcher = chokidar.watch(this.workspace, {
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
}

