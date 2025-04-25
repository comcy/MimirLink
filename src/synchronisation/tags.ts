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

    // Clean orphan tags (exclude journals/pages that exist independently)
    for (const tag in tagMap) {
        if (!seenTags.has(tag)) {
            const filePath = path.join(workspace, tagMap[tag].path);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, "utf8");
                const stillUsed = extractAllTags(content).length > 0;
                if (!stillUsed) {
                    fs.unlinkSync(filePath);
                    delete tagMap[tag];
                }
            }
        }
    }

    fs.mkdirSync(tagsDir, { recursive: true });
    fs.writeFileSync(TAGS_JSON_PATH, JSON.stringify(tagMap, null, 2), "utf8");
    console.log("Tags synchronisiert und verlinkt.");
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