#!/usr/bin/env node

import readline from "readline";
import { syncTags } from "./notes";
import { startWatchMode } from "./watcher";
import { startViewMode } from "./view-server";
import { writeToFile } from "./notes";
import { 
    //createTodo, 
    createPage, 
    createJournalEntry 
} from "./notes";

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
        args.shift();
        const pageName = args.join(" ");
        createPage(pageName);
    }

    else if (command === "sync") {
        syncTags();
    }

    else if (command === "watch") {
        startWatchMode();
    }

    else if (command === "view") {
        startViewMode();
    }

    else {
        console.log("Unbekannter Befehl.");
    }
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

askForInput();
