#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { loadConfig } from './config';

const config = loadConfig();
const wrkdyPath = config.wrkdyPath;
const TODO_PATH = path.join(wrkdyPath, "todo.md");
const TAGS_JSON_PATH = path.join(wrkdyPath, ".wrkdy", "tags.json");
const MAIN_HEADER = "# TODO\n";
const PLANNED_HEADER = "## Planned\n";
const SCOPED_HEADER = "## Scoped\n";
const PRIORITY_HEADER = "## Priority\n";
const DONE_HEADER = "--- \n## Done\n";
const PRIORITY_ICONS: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
};


export function writeToFile(content: string, scope?: string, dueDate?: string, priority?: string) {
    let fileContent = fs.existsSync(TODO_PATH) ? fs.readFileSync(TODO_PATH, "utf8") : "";
    if (!fileContent.startsWith(MAIN_HEADER)) {
        fileContent = `${MAIN_HEADER}\n`;
    }

    const priorityIcon = priority ? (PRIORITY_ICONS[priority] || "") + " " : "";
    const todoEntry = `- [ ] ${priorityIcon}${scope ? `[${scope}] ` : ""}${content}` + (dueDate ? ` 📅 ${dueDate}` : "");

    const sections = parseFileContent(fileContent);

    if (priority) {
        if (!sections.priority.includes(todoEntry)) {
            sections.priority.push(todoEntry);
        }
    }
    if (scope) {
        sections.scoped[scope] = sections.scoped[scope] || [];
        if (!sections.scoped[scope].includes(todoEntry)) {
            sections.scoped[scope].push(todoEntry);
        }
    }
    if (dueDate) {
        if (!sections.planned.includes(todoEntry)) {
            sections.planned.push(todoEntry);
        }
    } else if (!scope && !priority) {
        if (!sections.general.includes(todoEntry)) {
            sections.general.push(todoEntry);
        }
    }

    sections.planned.sort(compareDueDates);
    for (const key of Object.keys(sections.scoped)) {
        sections.scoped[key].sort(compareDueDates);
    }

    fs.writeFileSync(TODO_PATH, generateUpdatedContent(sections), "utf8");
}

function parseFileContent(content: string) {
    const sections = {
        general: [] as string[],
        planned: [] as string[],
        scoped: {} as Record<string, string[]>,
        priority: [] as string[],
        done: [] as string[],
    };

    let currentSection = "";
    let currentScope = "";
    for (const line of content.split("\n")) {
        if (line.startsWith("## ")) {
            currentSection = line;
            currentScope = "";
            continue;
        }
        if (currentSection === SCOPED_HEADER.trim() && line.startsWith("### ")) {
            currentScope = line.substring(4).trim();
            sections.scoped[currentScope] = sections.scoped[currentScope] || [];
            continue;
        }
        if (line.startsWith("- [ ] ")) {
            if (currentSection === PLANNED_HEADER.trim()) {
                sections.planned.push(line);
            } else if (currentSection === SCOPED_HEADER.trim() && currentScope) {
                sections.scoped[currentScope].push(line);
            } else if (currentSection === PRIORITY_HEADER.trim()) {
                sections.priority.push(line);
            } else {
                sections.general.push(line);
            }
        } else if (line.startsWith("- [x] ")) {
            sections.done.push(line);
        }
    }
    return sections;
}

function generateUpdatedContent(sections: ReturnType<typeof parseFileContent>) {
    let content = `${MAIN_HEADER}\n`;
    content += `${sections.general.filter(item => !item.startsWith("- [x] ")).join("\n")}\n\n`;
    if (sections.planned.length > 0) {
        content += `${PLANNED_HEADER}\n${sections.planned.filter(item => !item.startsWith("- [x] ")).join("\n")}\n`;
    }
    if (Object.keys(sections.scoped).length > 0) {
        content += `${SCOPED_HEADER}\n`;
        for (const key of Object.keys(sections.scoped)) {
            const scopedItems = sections.scoped[key].filter(item => !item.startsWith("- [x] "));
            if (scopedItems.length > 0) {
                content += `### ${key}\n${scopedItems.join("\n")}\n`;
            }
        }
    }
    if (sections.priority.length > 0) {
        content += `${PRIORITY_HEADER}\n${sections.priority.filter(item => !item.startsWith("- [x] ")).join("\n")}\n`;
    }
    if (sections.done.length > 0) {
        content += `${DONE_HEADER}\n${sections.done.join("\n")}\n`;
    }
    return content.trim() + "\n";
}

function compareDueDates(a: string, b: string): number {
    const matchA = a.match(/📅 (\d{4}-\d{2}-\d{2})/);
    const matchB = b.match(/📅 (\d{4}-\d{2}-\d{2})/);
    if (!matchA || !matchB) return 0;
    return new Date(matchA[1]).getTime() - new Date(matchB[1]).getTime();
}

function extractTags(content: string): string[] {
    // 1. Entferne Codeblöcke
    const codeBlocks = [...content.matchAll(/```[\s\S]*?```/g)];
    for (const block of codeBlocks) {
        content = content.replace(block[0], "");
    }

    // 2. Entferne Links, bei denen der Linktext ein # enthält → z.B. [#tag](...)
    const tagLinks = [...content.matchAll(/\[([^\]]*#[^\]]*)\]\([^)]+\)/g)];
    for (const link of tagLinks) {
        content = content.replace(link[0], "");
    }

    // 3. Extrahiere alle noch übrig gebliebenen #tags
    const matches = [...content.matchAll(/(^|\s)(#[a-zA-Z0-9-_]+)/g)];
    return [...new Set(matches.map(m => m[2].substring(1)))];
}


function extractTagsFromLinks(content: string): string[] {
    const matches = [...content.matchAll(/\[#[a-zA-Z0-9-_]+\]\(pages\/([a-zA-Z0-9-_]+)\.md\)/g)];
    return [...new Set(matches.map(m => m[1]))];
}



function renderWithLinkedTags(content: string, filePath: string): string {
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
            return fullMatch;
        }

        const tagName = tag.substring(1);
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(tagName);
        const targetDir = isDate ? "journals" : "pages";
        const relPath = path.relative(path.dirname(filePath), path.join(wrkdyPath, targetDir, `${tagName}.md`)).replace(/\\/g, "/");

        return `${leadingSpace}[${tag}](./${relPath})`;
    });
}



function findMarkdownFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== ".wrkdy") {
            return findMarkdownFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            return [fullPath];
        } else {
            return [];
        }
    });
    return files;
}

export function syncTags() {
    const tagsDir = path.join(wrkdyPath, ".wrkdy");
    const markdownFiles = findMarkdownFiles(wrkdyPath);

    const tagMap: Record<string, { pages: string[], path: string }> = fs.existsSync(TAGS_JSON_PATH)
        ? JSON.parse(fs.readFileSync(TAGS_JSON_PATH, "utf8"))
        : {};

    for (const file of markdownFiles) {
        const relPath = path.relative(wrkdyPath, file).replace(/\\/g, "/");
        const content = fs.readFileSync(file, "utf8");

        const tagsFromLinks = extractTagsFromLinks(content);
        const tagsFromText = extractTags(content);
        const allTags = [...new Set([...tagsFromText, ...tagsFromLinks])];

        const newContent = renderWithLinkedTags(content, file);
        fs.writeFileSync(file, newContent, "utf8");

        for (const tag of allTags) {
            const isDate = /^\d{4}-\d{2}-\d{2}$/.test(tag);
            const targetDir = isDate ? "journals" : "pages";
            const tagFilePath = `${targetDir}/${tag}.md`;

            if (!tagMap[tag]) {
                tagMap[tag] = {
                    pages: [],
                    path: tagFilePath
                };

                // Statt createPage() → Journal-Funktion nutzen
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

    fs.mkdirSync(tagsDir, { recursive: true });
    fs.writeFileSync(TAGS_JSON_PATH, JSON.stringify(tagMap, null, 2), "utf8");
    console.log("Tags synchronisiert und verlinkt.");
}


export function createJournalEntry(date?: string) {
    const journalDir = path.join(wrkdyPath, "journals");
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

export function createPage(name: string, customDir?: string) {
    if (!name) {
        console.log("Bitte einen Namen für die Seite angeben.");
        return;
    }

    const baseDir = customDir || "pages";
    const pagesDir = path.join(wrkdyPath, baseDir);
    if (!fs.existsSync(pagesDir)) {
        fs.mkdirSync(pagesDir, { recursive: true });
    }

    const safeFileName = name.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();
    const filePath = path.join(pagesDir, `${safeFileName}.md`);

    if (fs.existsSync(filePath)) {
        console.log(`Die Seite "${safeFileName}" existiert bereits.`);
    } else {
        const frontmatter = generateFrontmatter(safeFileName, "page");
        const initialContent = `${frontmatter}# ${name}\n\n`;
        fs.writeFileSync(filePath, initialContent, "utf8");
        console.log(`Seite erstellt: ${filePath}`);
    }
}

function generateFrontmatter(title: string, contentType: "journal" | "page") {
    const createdAt = new Date().toISOString();
    return `---\ntitle: "${title}"\ncreatedAt: "${createdAt}"\ncontentType: "${contentType}"\n---\n\n`;
}
