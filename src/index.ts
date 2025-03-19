#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";

const FILE_NAME = "todo.md";
const MAIN_HEADER = "# TODO\n";
const PLANNED_HEADER = "## Planned\n";
const SCOPED_HEADER = "## Scoped\n";

// Funktion zum Schreiben in die Markdown-Datei
function writeToFile(content: string, scope?: string, dueDate?: string) {
    const filePath = path.join(process.cwd(), FILE_NAME);
    let fileContent = "";
    let plannedTodos: string[] = [];
    let generalTodos: string[] = [];
    let scopedTodos: Record<string, string[]> = {};
    
    if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, "utf8");
        const lines = fileContent.split("\n");
        let currentScope = "";
        let isPlannedSection = false;
        let isScopedSection = false;
        
        for (const line of lines) {
            if (line.startsWith("## ")) {
                isPlannedSection = line === PLANNED_HEADER.trim();
                isScopedSection = line === SCOPED_HEADER.trim();
                currentScope = "";
                continue;
            }
            if (isScopedSection && line.startsWith("### ")) {
                currentScope = line.substring(4);
                scopedTodos[currentScope] = scopedTodos[currentScope] || [];
                continue;
            }
            if (line.startsWith("- ")) {
                if (isPlannedSection) {
                    plannedTodos.push(line);
                } else if (isScopedSection && currentScope) {
                    scopedTodos[currentScope].push(line);
                } else {
                    generalTodos.push(line);
                }
            }
        }
    }
    
    if (!fileContent.startsWith(MAIN_HEADER)) {
        fileContent = `${MAIN_HEADER}\n`;
    }
    
    if (dueDate) {
        plannedTodos.push(`- ${content} [due: ${dueDate}]`);
    } else if (scope) {
        if (!scopedTodos[scope]) {
            scopedTodos[scope] = [];
        }
        scopedTodos[scope].push(`- ${content}` + (dueDate ? ` [due: ${dueDate}]` : ""));
    } else {
        generalTodos.push(`- ${content}`);
    }
    
    // Sortiere die geplanten Todos nach dem Due-Date
    plannedTodos.sort((a, b) => compareDueDates(a, b));
    
    // Sortiere die Scoped Todos nach Due-Date
    for (const key in scopedTodos) {
        scopedTodos[key].sort((a, b) => compareDueDates(a, b));
    }
    
    let updatedContent = `${MAIN_HEADER}\n${generalTodos.join("\n")}\n\n`;
    if (plannedTodos.length > 0) {
        updatedContent += `${PLANNED_HEADER}\n${plannedTodos.join("\n")}\n`;
    }
    if (Object.keys(scopedTodos).length > 0) {
        updatedContent += `${SCOPED_HEADER}\n`;
        for (const key in scopedTodos) {
            updatedContent += `### ${key}\n${scopedTodos[key].join("\n")}\n`;
        }
    }
    
    fs.writeFileSync(filePath, updatedContent.trim() + "\n", "utf8");
}

// Vergleichsfunktion für Due-Dates
function compareDueDates(a: string, b: string): number {
    const matchA = a.match(/\[due: (\d{4}-\d{2}-\d{2})\]/);
    const matchB = b.match(/\[due: (\d{4}-\d{2}-\d{2})\]/);
    if (!matchA || !matchB) return 0;
    return new Date(matchA[1]).getTime() - new Date(matchB[1]).getTime();
}

// CLI-Eingabe verarbeiten
function processInput(input: string) {
    const args = input.split(" ");
    if (args[0] !== "TODO" || args.length < 2) return;
    
    let scope = "";
    let dueDate = "";
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
        } else {
            todoText += (todoText ? " " : "") + arg;
        }
    }
    
    if (!todoText) return;
    const formattedTodo = todoText;
    writeToFile(formattedTodo, scope || undefined, dueDate || undefined);
    console.log("TODO gespeichert.");
}

// Interaktiver Modus
function startInteractiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "> "
    });
    
    rl.prompt();
    rl.on("line", (line) => {
        processInput(line.trim());
        rl.prompt();
    }).on("close", () => {
        console.log("CLI beendet.");
        process.exit(0);
    });
}

// CLI-Startlogik
const args = process.argv.slice(2);
if (args[0] === "start") {
    console.log("Interaktiver Modus gestartet. Geben Sie TODO-Befehle ein.");
    startInteractiveMode();
} else {
    processInput(args.join(" "));
}
