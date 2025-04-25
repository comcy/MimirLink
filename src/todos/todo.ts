#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { loadConfig } from '../configuration/config';

const config = loadConfig();
const workspace = config.workspace;
const TODO_PATH = path.join(workspace, "todo.md");
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
