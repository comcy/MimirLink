import fs from 'fs';
import path from 'path';
import { loadConfig } from '../../configuration/config';
import { generateFrontmatter } from '../base/frontmatter';


export function createJournalEntry(date?: string): void {
    const config = loadConfig();
    const workspace = config.workspace;
    const journalDate = date || new Date().toISOString().split('T')[0];
    const journalDir = path.join(workspace, 'journals');
    const journalPath = path.join(journalDir, `${journalDate}.md`);

    if (!fs.existsSync(journalDir)) {
        fs.mkdirSync(journalDir, { recursive: true });
    }

    if (!fs.existsSync(journalPath)) {
        const frontmatter = generateFrontmatter(journalDate, 'journal');
        fs.writeFileSync(journalPath, frontmatter, 'utf8');
        console.log(`Journal für ${journalDate} erstellt.`);
    } else {
        console.log(`Journal für ${journalDate} existiert bereits.`);
    }
}
