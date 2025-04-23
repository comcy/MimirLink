#!/usr/bin/env node

import readline from "readline";
import { DependencyInjectionContainer } from "./base/dependency-injection-container";
import {
    createJournalEntry,
    createPage,
    syncTags,
    writeToFile
} from "./notes";
import { interactiveSearch } from "./search-interactive";
import { startViewMode } from "./view-server";
import { startStaticSiteGeneration } from "./view-static";
import { WorkspaceWatcher } from "./watcher";
import { ConfigurationProvider } from "./configuration/configuration.provider";
import { ConfigurationCore } from "./configuration/configuration.core";

async function processInput(input: string): Promise<void> {

    // Statt nur zu importieren:
    DependencyInjectionContainer.resolve(ConfigurationProvider);
    DependencyInjectionContainer.resolve(ConfigurationCore);
    const watcher = DependencyInjectionContainer.resolve(WorkspaceWatcher);

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

    else if (command === "watch") {;
        await watcher.startWatchMode();
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
