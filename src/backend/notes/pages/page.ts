import fs from "fs";
import path from "path";
import { AppConfig } from "../../config";
import { generateFrontmatter } from "../base/frontmatter";

const config = AppConfig;
const workspace = config.workspace;

export function createPage(name: string, customDir?: string) {
    if (!name) {
        console.log("Bitte einen Namen für die Seite angeben.");
        return;
    }

    const baseDir = customDir || "pages";
    const pagesDir = path.join(workspace, baseDir);
    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
    }

    const safeFileName = name.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const filePath = path.join(pagesDir, `${safeFileName}.md`);

    if (fs.existsSync(filePath)) {
        console.log(`Die Seite "${safeFileName}" existiert bereits.`);
    } else {
        const frontmatter = generateFrontmatter(safeFileName, "page");
        const initialContent = `${frontmatter}\n\n`;
        fs.writeFileSync(filePath, initialContent, "utf8");
        console.log(`Seite erstellt: ${filePath}`);
    }
}