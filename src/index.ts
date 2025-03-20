#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";

const FILE_NAME = "todo.md";
const MAIN_HEADER = "# TODO\n";
const PLANNED_HEADER = "## Planned\n";
const SCOPED_HEADER = "## Scoped\n";
const PRIORITY_HEADER = "## Priority\n";
const PRIORITY_SUBHEADERS: Record<string, string> = {
    high: "### 🔴 High\n",
    medium: "### 🟡 Medium\n",
    low: "### 🟢 Low\n"
};

const PRIORITY_ICONS: Record<string, string> = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
};

function writeToFile(content: string, scope?: string, dueDate?: string, priority?: string) {
    const filePath = path.join(process.cwd(), FILE_NAME);
    let fileContent = "";
    let plannedTodos: string[] = [];
    let generalTodos: string[] = [];
    let scopedTodos: Record<string, string[]> = {};
    let priorityTodos: Record<string, string[]> = { high: [], medium: [], low: [] };
    
    if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, "utf8");
        const lines = fileContent.split("\n");
        let currentSection = "";
        let currentScope = "";
        
        for (const line of lines) {
            if (line.startsWith("## ")) {
                currentSection = line;
                currentScope = "";
                continue;
            }
            if (currentSection === SCOPED_HEADER.trim() && line.startsWith("### ")) {
                currentScope = line.substring(4).trim();
                scopedTodos[currentScope] = scopedTodos[currentScope] || [];
                continue;
            }
            if (currentSection === PRIORITY_HEADER.trim()) {
                for (const key of Object.keys(PRIORITY_SUBHEADERS)) {
                    if (line.startsWith(PRIORITY_SUBHEADERS[key].trim())) {
                        currentScope = key;
                        priorityTodos[currentScope] = priorityTodos[currentScope] || [];
                        break;
                    }
                }
                continue;
            }
            if (line.startsWith("- [ ] ")) {
                if (currentSection === PLANNED_HEADER.trim()) {
                    plannedTodos.push(line);
                } else if (currentSection === SCOPED_HEADER.trim() && currentScope) {
                    scopedTodos[currentScope].push(line);
                } else if (currentSection === PRIORITY_HEADER.trim() && currentScope) {
                    priorityTodos[currentScope].push(line);
                } else {
                    generalTodos.push(line);
                }
            }
        }
    }
    
    if (!fileContent.startsWith(MAIN_HEADER)) {
        fileContent = `${MAIN_HEADER}\n`;
    }
    
    const priorityIcon = priority ? (PRIORITY_ICONS[priority] || "") + " " : "";
    const todoEntry = `- [ ] ${priorityIcon}${scope ? `[${scope}] ` : ""}${content}` + (dueDate ? ` 📅 ${dueDate}` : "");
    
    if (priority) {
        if (!priorityTodos[priority]) {
            priorityTodos[priority] = [];
        }
        if (!priorityTodos[priority].includes(todoEntry)) {
            priorityTodos[priority].push(todoEntry);
        }
    }
    if (scope) {
        if (!scopedTodos[scope]) {
            scopedTodos[scope] = [];
        }
        if (!scopedTodos[scope].includes(todoEntry)) {
            scopedTodos[scope].push(todoEntry);
        }
    }
    if (dueDate) {
        if (!plannedTodos.includes(todoEntry)) {
            plannedTodos.push(todoEntry);
        }
    } else if (!scope && !priority) {
        if (!generalTodos.includes(todoEntry)) {
            generalTodos.push(todoEntry);
        }
    }
    
    plannedTodos.sort(compareDueDates);
    for (const key of Object.keys(scopedTodos)) {
        scopedTodos[key].sort(compareDueDates);
    }
    for (const key of Object.keys(priorityTodos)) {
        priorityTodos[key].sort(compareDueDates);
    }
    
    let updatedContent = `${MAIN_HEADER}\n${generalTodos.join("\n")}\n\n`;
    if (plannedTodos.length > 0) {
        updatedContent += `${PLANNED_HEADER}\n${plannedTodos.join("\n")}\n`;
    }
    if (Object.keys(scopedTodos).length > 0) {
        updatedContent += `${SCOPED_HEADER}\n`;
        for (const key of Object.keys(scopedTodos)) {
            updatedContent += `### ${key}\n${scopedTodos[key].join("\n")}\n`;
        }
    }
    if (Object.keys(priorityTodos).some(key => priorityTodos[key].length > 0)) {
        updatedContent += `${PRIORITY_HEADER}\n`;
        for (const key of Object.keys(PRIORITY_SUBHEADERS)) {
            if (priorityTodos[key].length > 0) {
                updatedContent += `${PRIORITY_SUBHEADERS[key]}${priorityTodos[key].join("\n")}\n`;
            }
        }
    }
    
    fs.writeFileSync(filePath, updatedContent.trim() + "\n", "utf8");
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
    rl.question("Enter TODO: ", (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            return;
        }
        processInput(input);
        askForInput();
    });
}

function processInput(input: string) {
    const args = input.split(" ");
    if (args[0] !== "TODO" || args.length < 2) return;
    
    let scope = "";
    let dueDate = "";
    let priority = "";
    let todoText = "";
    
    while (args.length > 1) {
        const arg = args[1];
        args.shift();
        if (arg === "-s" && args.length > 1) {
            scope = args[1];
            args.shift();
        } else if (arg === "-d" && args.length > 1) {
            dueDate = args[1];
            args.shift();
        } else if (arg === "-p" && args.length > 1) {
            priority = args[1];
            args.shift();
        } else {
            todoText += (todoText ? " " : "") + arg;
        }
    }
    if (!todoText) return;
    writeToFile(todoText, scope || undefined, dueDate || undefined, priority || undefined);
    console.log("TODO gespeichert.");
}

askForInput();
