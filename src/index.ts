#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";

const CONFIG_PATH = path.join(require("os").homedir(), ".wrkdy", "wrkdy.config.json");
const DEFAULT_CONFIG = { wrkdyPath: path.join(require("os").homedir(), "wrkdy") };

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } else {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf8");
        return DEFAULT_CONFIG;
    }
}

const config = loadConfig();
const TODO_PATH = path.join(config.wrkdyPath, "todo.md");
if (!fs.existsSync(config.wrkdyPath)) {
    fs.mkdirSync(config.wrkdyPath, { recursive: true });
}

const FILE_NAME = "todo.md";
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

function writeToFile(content: string, scope?: string, dueDate?: string, priority?: string) {
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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askForInput() {
    rl.question("Enter command: ", (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            return;
        }
        processInput(input);
        askForInput();
    });
}

function createJournalEntry() {
    const journalDir = path.join(config.wrkdyPath, "journals");
    if (!fs.existsSync(journalDir)) {
        fs.mkdirSync(journalDir, { recursive: true });
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const fileName = `${today}.md`;
    const journalPath = path.join(journalDir, fileName);

    if (fs.existsSync(journalPath)) {
        console.log(`Journal für heute (${today}) existiert bereits.`);
    } else {
        const frontmatter = generateFrontmatter(today, "journal");
        const initialContent = `${frontmatter}# Journal Entry – ${today}\n\n`;
        fs.writeFileSync(journalPath, initialContent, "utf8");
        console.log(`Neuer Journal-Eintrag erstellt: ${journalPath}`);
    }
}

function createPage(name: string) {
    if (!name) {
        console.log("Bitte einen Namen für die Seite angeben.");
        return;
    }

    const pagesDir = path.join(config.wrkdyPath, "pages");
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
        console.log(`Neue Seite erstellt: ${filePath}`);
    }
}



function generateFrontmatter(title: string, contentType: "journal" | "page") {
    const createdAt = new Date().toISOString();
    return `---\ntitle: "${title}"\ncreatedAt: "${createdAt}"\ncontentType: "${contentType}"\n---\n\n`;
}


function processInput(input: string) {
    const args = input.trim().split(" ");
    const command = args.shift()?.toLowerCase();

    if (command === "todo" && args.length > 0) {
        let scope = "";
        let dueDate = "";
        let priority = "";
        let todoText = "";

        while (args.length > 0) {
            const arg = args.shift();
            if (arg === "-s" && args.length > 0) {
                scope = args.shift()!;
            } else if (arg === "-d" && args.length > 0) {
                dueDate = args.shift()!;
            } else if (arg === "-p" && args.length > 0) {
                priority = args.shift()!;
            } else {
                todoText += (todoText ? " " : "") + arg;
            }
        }

        if (!todoText) return;
        writeToFile(todoText, scope || undefined, dueDate || undefined, priority || undefined);
        console.log("TODO gespeichert.");
    }

    else if (command === "journal" && args[0] === "new") {
        createJournalEntry();
    }

    else if (command === "page" && args[0] === "new" && args.length > 1) {
        args.shift(); // remove 'new'
        const pageName = args.join(" ");
        createPage(pageName);
    }

    else {
        console.log("Unbekannter Befehl.");
    }
}



askForInput();
