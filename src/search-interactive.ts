import fs from "fs";
import path from "path";
import readline from "readline";
import inquirer from "inquirer";
import chalk from "chalk";
import { wrkdyPath } from "./config";

function isMarkdown(file: string) {
  return file.endsWith(".md");
}

function walkMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(walkMarkdownFiles(fullPath));
    } else if (isMarkdown(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function searchInFile(filePath: string, term: string): { file: string, line: number, preview: string }[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  return lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.toLowerCase().includes(term.toLowerCase()))
    .map(({ line, index }) => ({
      file: filePath,
      line: index + 1,
      preview: line.trim()
    }));
}

export async function interactiveSearch() {
  const { term } = await inquirer.prompt([
    {
      type: "input",
      name: "term",
      message: "🔍 Wonach möchtest du suchen?"
    }
  ]);

  if (!term.trim()) {
    console.log("❗ Kein Suchbegriff eingegeben.");
    return;
  }

  const allFiles = walkMarkdownFiles(wrkdyPath);
  let allMatches: { file: string, line: number, preview: string }[] = [];

  for (const file of allFiles) {
    allMatches = allMatches.concat(searchInFile(file, term));
  }

  if (allMatches.length === 0) {
    console.log("🚫 Keine Treffer gefunden.");
    return;
  }

  const choices = allMatches.map((match) => ({
    name: `${chalk.cyan(path.relative(wrkdyPath, match.file))}:${chalk.gray(match.line)} → ${chalk.yellow(match.preview)}`,
    value: match.file
  }));

  const { selectedFile } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedFile",
      message: `🔎 ${allMatches.length} Treffer – wähle eine Datei aus:`,
      choices
    }
  ]);

  // Optional: Datei im Editor öffnen
  const { open } = await inquirer.prompt([
    {
      type: "confirm",
      name: "open",
      message: "📂 Möchtest du die Datei im Editor öffnen?",
      default: true
    }
  ]);

  if (open) {
    const platform = process.platform;
    const { exec } = await import("child_process");
    if (platform === "win32") {
      exec(`start "" "${selectedFile}"`);
    } else if (platform === "darwin") {
      exec(`open "${selectedFile}"`);
    } else {
      exec(`xdg-open "${selectedFile}"`);
    }
  }
}

