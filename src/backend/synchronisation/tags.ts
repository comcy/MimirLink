import fs from "fs";
import path from "path";
import { createPage } from "../notes/pages/page";
import { createJournalEntry } from "../notes/journals/journal";
import { loadConfig } from "../configuration/config";
import { updateFrontmatterUpdatedAt } from "../notes/base/frontmatter";

const config = loadConfig();
const workspace = config.workspace;
const TAGS_JSON_PATH = path.join(workspace, ".ygg", "tags.json");

export function syncTags() {
    const markdownFiles = findMarkdownFiles(workspace);
    const tagsDir = path.join(workspace, ".ygg");

    const tagMap: Record<string, { pages: string[], path: string }> = fs.existsSync(TAGS_JSON_PATH)
        ? JSON.parse(fs.readFileSync(TAGS_JSON_PATH, "utf8"))
        : {};

    const seenTags = new Set<string>();
    const fileToTagsMap: Record<string, string[]> = {};

    // Erste Phase: Tags sammeln und verarbeiten
    for (const file of markdownFiles) {
        const relPath = path.relative(workspace, file).replace(/\\/g, "/");
        const oldContent = fs.readFileSync(file, "utf8");
        const rendered = renderWithLinkedTags(oldContent, file);

        if (rendered !== oldContent) {
            const updated = updateFrontmatterUpdatedAt(rendered);
            fs.writeFileSync(file, updated, "utf8");
        }

        const content = fs.readFileSync(file, "utf8");
        const tags = extractAllTags(content);

        fileToTagsMap[relPath] = tags;

        for (const tag of tags) {
            seenTags.add(tag);
            const isDate = /^\d{4}-\d{2}-\d{2}$/.test(tag);
            const targetDir = isDate ? "journals" : "pages";
            const tagFilePath = `${targetDir}/${tag}.md`;

            if (!tagMap[tag]) {
                tagMap[tag] = { pages: [], path: tagFilePath };

                if (isDate) {
                    createJournalEntry(tag);
                } else {
                    createPage(tag, targetDir);
                }
            }

            if (!tagMap[tag].pages.includes(relPath)) {
                tagMap[tag].pages.push(relPath);
            }
        }
    }

    // Aktualisiere tagMap: Entferne Tags ohne Referenzen und ohne existierende Datei
    for (const tag in tagMap) {
        const tagFilePath = path.join(workspace, tagMap[tag].path);

        // Entferne nicht mehr referenzierte Seiten aus der pages-Liste
        tagMap[tag].pages = tagMap[tag].pages.filter(page => {
            const tagsInFile = fileToTagsMap[page] || [];
            return tagsInFile.includes(tag);
        });

        const hasReferences = tagMap[tag].pages.length > 0 || seenTags.has(tag);

        // Entferne den Tag, wenn keine Referenzen mehr existieren und die Datei gelöscht wurde
        if (!hasReferences && !fs.existsSync(tagFilePath)) {
            delete tagMap[tag];
        }
    }

    // Zweite Phase: Page References zu allen Seiten hinzufügen
    updatePageReferences(tagMap);

    fs.mkdirSync(tagsDir, { recursive: true });
    fs.writeFileSync(TAGS_JSON_PATH, JSON.stringify(tagMap, null, 2), "utf8");
    console.log("Tags synchronisiert, verlinkt und Page References aktualisiert.");
}

function updatePageReferences(tagMap: Record<string, { pages: string[], path: string }>) {
    // Für jede Tag-Datei die Page References hinzufügen
    for (const [tagName, tagData] of Object.entries(tagMap)) {
        const tagFilePath = path.join(workspace, tagData.path);
        
        if (!fs.existsSync(tagFilePath)) {
            continue;
        }

        const content = fs.readFileSync(tagFilePath, "utf8");
        const updatedContent = addPageReferencesSection(content, tagData.pages, tagFilePath);
        
        if (updatedContent !== content) {
            const finalContent = updateFrontmatterUpdatedAt(updatedContent);
            fs.writeFileSync(tagFilePath, finalContent, "utf8");
        }
    }
}

function addPageReferencesSection(content: string, referencingPages: string[], currentFilePath: string): string {
    // Entferne existierende Page References Sektion
    const pageReferencesRegex = /\n## Page references\n[\s\S]*?(?=\n##|\n---|\n$|$)/;
    let cleanContent = content.replace(pageReferencesRegex, "");
    
    // Entferne trailing whitespace am Ende
    cleanContent = cleanContent.replace(/\s+$/, "");
    
    if (referencingPages.length === 0) {
        return cleanContent;
    }

    // Ermittle den Tag-Namen aus dem aktuellen Datei-Pfad
    const currentTagName = path.basename(currentFilePath, ".md");

    // Erstelle die Page References Sektion
    let pageReferencesSection = "\n\n## Page references\n\n";
    
    for (const referencingPage of referencingPages) {
        // Berechne relativen Pfad von der aktuellen Tag-Datei zur referenzierenden Seite
        const relativePath = path.relative(
            path.dirname(currentFilePath), 
            path.join(workspace, referencingPage)
        ).replace(/\\/g, "/");
        
        // Extrahiere den Dateinamen ohne .md Extension für den Link-Text
        const fileName = path.basename(referencingPage, ".md");
        
        pageReferencesSection += `- [${fileName}](./${relativePath})\n`;
        
        // Füge Preview-Text hinzu
        const previewText = extractTagContext(path.join(workspace, referencingPage), currentTagName);
        if (previewText) {
            pageReferencesSection += `  *${previewText}*\n`;
        }
        pageReferencesSection += "\n";
    }
    
    return cleanContent + pageReferencesSection;
}

function findMarkdownFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== ".ygg") {
            return findMarkdownFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            return [fullPath];
        } else {
            return [];
        }
    });
}

function extractAllTags(content: string): string[] {
    const tagMatches = [...content.matchAll(/(^|\s)#([a-zA-Z0-9-_]+)/g)];
    const linkMatches = [...content.matchAll(/\[#([a-zA-Z0-9-_]+)\]\(.*?\)/g)];
    return [...new Set([...tagMatches.map(m => m[2]), ...linkMatches.map(m => m[1])])];
}

export function renderWithLinkedTags(content: string, filePath: string): string {
    const codeBlocks: [number, number][] = [];
    const regexCode = /```[\s\S]*?```/g;
    let match;

    while ((match = regexCode.exec(content)) !== null) {
        codeBlocks.push([match.index, regexCode.lastIndex]);
    }

    const existingLinks = new Set<number>();
    const linkPattern = /\[#([a-zA-Z0-9-_]+)\]\((.*?)\)/g;
    while ((match = linkPattern.exec(content)) !== null) {
        existingLinks.add(match.index);
    }

    return content.replace(/(^|\s)(#[a-zA-Z0-9-_]+)/g, (fullMatch, leadingSpace, tag, offset) => {
        if (
            codeBlocks.some(([start, end]) => offset >= start && offset < end) ||
            existingLinks.has(offset)
        ) {
            return fullMatch; // Tag nicht ersetzen
        }

        const tagName = tag.substring(1);
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(tagName);
        const targetDir = isDate ? "journals" : "pages";
        const relativePath = path.relative(path.dirname(filePath), path.join(workspace, targetDir, `${tagName}.md`)).replace(/\\/g, "/");

        return `${leadingSpace}[${tag}](./${relativePath})`;
    });
}

function extractTagContext(filePath: string, tagName: string): string {
    if (!fs.existsSync(filePath)) {
        return "";
    }

    const content = fs.readFileSync(filePath, "utf8");
    
    // Suche nach dem Tag (sowohl #tag als auch [#tag](...) Format)
    const tagPatterns = [
        new RegExp(`(^|\\s)(#${tagName})(?=\\s|$)`, 'gi'),
        new RegExp(`\\[#${tagName}\\]\\([^)]*\\)`, 'gi')
    ];
    
    let bestMatch: { start: number, end: number } | null = null;
    
    for (const pattern of tagPatterns) {
        const matches = [...content.matchAll(pattern)];
        if (matches.length > 0) {
            const match = matches[0];
            bestMatch = { 
                start: match.index!, 
                end: match.index! + match[0].length 
            };
            break;
        }
    }
    
    if (!bestMatch) {
        return "";
    }
    
    // Finde den Anfang und das Ende des Satzes/Absatzes
    const beforeTag = content.substring(0, bestMatch.start);
    const afterTag = content.substring(bestMatch.end);
    
    // Suche rückwärts nach Satzanfang (Absatz, Punkt, oder Zeilenanfang)
    const sentenceStartMatch = beforeTag.match(/.*[.\n]([^.\n]*)$/s);
    const sentenceStart = sentenceStartMatch ? sentenceStartMatch[1] : beforeTag.split('\n').pop() || "";
    
    // Suche vorwärts nach Satzende (Punkt, Zeilenende, oder nächster Absatz)
    const sentenceEndMatch = afterTag.match(/^([^.\n]*[.\n]?)/s);
    const sentenceEnd = sentenceEndMatch ? sentenceEndMatch[1] : "";
    
    // Kombiniere den Kontext
    let context = (sentenceStart + content.substring(bestMatch.start, bestMatch.end) + sentenceEnd).trim();
    
    // Bereinige den Kontext
    context = context
        .replace(/\n+/g, ' ')  // Ersetze Zeilenumbrüche durch Leerzeichen
        .replace(/\s+/g, ' ')  // Normalisiere Leerzeichen
        .trim();
    
    // Kürze wenn zu lang (max. 150 Zeichen)
    if (context.length > 150) {
        context = context.substring(0, 147) + "...";
    }
    
    return context;
}