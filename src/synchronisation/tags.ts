import fs from "fs";
import path from "path";
import { loadConfig } from '../configuration/config';
import { createJournalEntry } from "../notes/journals/journal";
import { createPage } from "../notes/pages/page";

const config = loadConfig();
const workspace = config.workspace;
const TAGS_JSON_PATH = path.join(workspace, ".mimirlink", "tags.json");

export function syncTags() {
    const tagsDir = path.join(workspace, ".mimirlink");
    const markdownFiles = findMarkdownFiles(workspace);

    const tagMap: Record<string, { pages: string[], path: string }> = fs.existsSync(TAGS_JSON_PATH)
        ? JSON.parse(fs.readFileSync(TAGS_JSON_PATH, "utf8"))
        : {};

    for (const file of markdownFiles) {
        const relPath = path.relative(workspace, file).replace(/\\/g, "/");
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

function findMarkdownFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files = entries.flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== ".mimirlink") {
            return findMarkdownFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
            return [fullPath];
        } else {
            return [];
        }
    });
    return files;
}

function extractTagsFromLinks(content: string): string[] {
    const matches = [...content.matchAll(/\[#[a-zA-Z0-9-_]+\]\(pages\/([a-zA-Z0-9-_]+)\.md\)/g)];
    return [...new Set(matches.map(m => m[1]))];
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
        const relPath = path.relative(path.dirname(filePath), path.join(workspace, targetDir, `${tagName}.md`)).replace(/\\/g, "/");

        return `${leadingSpace}[${tag}](./${relPath})`;
    });
}
