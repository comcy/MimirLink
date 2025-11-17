#!/usr/bin/env node

import readline from "readline";
import { createJournalEntry } from "../notes/journals/journal";
import { createPage } from "../notes/pages/page";
import { interactiveSearch } from "../search-interactive";
import { startViewMode } from "../viewer/view-server";
import { startStaticSiteGeneration } from "../viewer/view-static";
import { initializeWatcher } from "../watcher/watch";
import { youtubeLinkRewriter } from "../utils/youtube-link-rewriter";
import { getPackageVersion } from "../version/version";
import { AppConfig } from "../config";
import { replaceEmojisInAllMarkdownFiles } from "../utils/emoji-rewriter";


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
        // syncTags();
        // syncImages();
        synchronizeTasks(AppConfig.notesDirectory);
        youtubeLinkRewriter();
        replaceEmojisInAllMarkdownFiles();
        console.log("✅ Synchronisation abgeschlossen.");
    }

    else if (command === "watch") {
        initializeWatcher();
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
    
    else if (command === "version") {
        console.log(`VERSION: ${getPackageVersion()}`);
    }
  
    else if (command === "config") {
        console.log(`Configuration: ${JSON.stringify(AppConfig, null, 2)}`);
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