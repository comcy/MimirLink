#!/usr/bin/env node

import readline from "readline";
import { createJournalEntry } from "../notes/journals/journal";
import { createPage } from "../notes/pages/page";
import { interactiveSearch } from "../search-interactive";
import { syncTags } from "../synchronisation/tags";
import { startViewMode } from "../viewer/view-server";
import { startStaticSiteGeneration } from "../viewer/view-static";
import { startWatchMode } from "../watcher/watch";
import { syncImages } from "../synchronisation/images";
import { syncTodos } from "../todos/todo";

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
        syncImages();
        syncTodos(); // <-- diese Zeile ergänzt den Todo-Sync
        console.log("✅ Synchronisation abgeschlossen.");
    }

    else if (command === "watch") {
        startWatchMode();
    }

    else if (command === "view") {
        startViewMode();
    }    
    
    else if (command === "static") {
        startStaticSiteGeneration();
    }

    else if (command === "searchi") {
        interactiveSearch();
    }

    else {
        console.log("Unbekannter Befehl.");
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export function askForInput() {
    rl.question("Enter command: ", (input) => {
        if (input.toLowerCase() === "exit") {
            rl.close();
            return;
        }
        processInput(input);
        askForInput();
    });
}