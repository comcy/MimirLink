import fs from "fs";
import path from "path";
import { loadConfig } from "../../configuration/config";
import { generateFrontmatter } from "../base/frontmatter";


const config = loadConfig();
const workspace = config.workspace;

export function createJournalEntry(date?: string) {
    const journalDir = path.join(workspace, "journals");
    if (!fs.existsSync(journalDir)) {
        fs.mkdirSync(journalDir, { recursive: true });
    }

    const today = date || new Date().toISOString().split("T")[0];
    const fileName = `${today}.md`;
    const journalPath = path.join(journalDir, fileName);

    if (fs.existsSync(journalPath)) {
        console.log(`Journal für ${today} existiert bereits.`);
    } else {
        const frontmatter = generateFrontmatter(today, "journal");
        const initialContent = `${frontmatter}# ${today}\n\n`;
        fs.writeFileSync(journalPath, initialContent, "utf8");
        console.log(`Journal-Eintrag erstellt: ${journalPath}`);
    }
}