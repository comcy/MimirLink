import fs from "fs";
import path from "path";
import { loadConfig } from "../configuration/config";
import { format } from "date-fns";

const config = loadConfig();
const workspace = config.workspace;
const TODOS_DIR = path.join(workspace, ".ygg");
const TODOS_JSON = path.join(TODOS_DIR, "todos.json");
const DONE_JSON = path.join(TODOS_DIR, "done.json");
const QUESTION_JSON = path.join(TODOS_DIR, "questions.json");
const ANSWER_JSON = path.join(TODOS_DIR, "answers.json");
const DECISION_JSON = path.join(TODOS_DIR, "decisions.json");
const IDEAS_JSON = path.join(TODOS_DIR, "ideas.json");
const REMINDER_JSON = path.join(TODOS_DIR, "reminders.json");

const JOURNAL_DIR = path.join(workspace, "journals");
const TODAY_PATH = path.join(JOURNAL_DIR, "@TODAY.md");
const QUESTION_PATH = path.join(JOURNAL_DIR, "@QUESTION.md");
const ANSWER_PATH = path.join(JOURNAL_DIR, "@ANSWER.md");
const DECISION_PATH = path.join(JOURNAL_DIR, "@DECISION.md");

export interface Entry {
  content: string;
  scope?: string[];
  dueDate?: string;
  priority?: string;
  createdAt: string;
  closedAt?: string;
  type: "TODO" | "DONE" | "QUESTION" | "ANSWER" | "DECISION" | "IDEA" | "REMINDER";
  sourceFile: string;
  ref: string;
}

function ensureTodosDir() {
  if (!fs.existsSync(TODOS_DIR)) {
    fs.mkdirSync(TODOS_DIR);
  }
}

function loadEntries(file: string): Entry[] {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : [];
}

function saveEntries(file: string, entries: Entry[]) {
  fs.writeFileSync(file, JSON.stringify(entries, null, 2), "utf-8");
}

function getAllMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getAllMarkdownFiles(fullPath);
    } else if (entry.isFile() && fullPath.endsWith(".md")) {
      return [fullPath];
    }
    return [];
  });
}

function parseEntry(lines: string[], index: number, sourceFile: string): [Entry | null, number] {
  const baseLine = lines[index];
  const match = baseLine.match(/^\s*@(TODO|DONE|QUESTION|ANSWER|DECISION|IDEA|REMINDER)\s+(.+)/);
  if (!match) return [null, index];

  const [, type, fullLineRaw] = match;
  const createdAt = format(new Date(), "yyyy-MM-dd");

  const tagRegex = /\[#([^\]]+)\]\([^)]+\)/g;
  let scopeTags: string[] = [];
  let dueDate: string | undefined;
  let priority: string | undefined;

  let tagMatch;
  while ((tagMatch = tagRegex.exec(fullLineRaw)) !== null) {
    const tag = tagMatch[1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(tag)) {
      dueDate = tag;
    } else if (/^!{1,3}$/.test(tag)) {
      priority = tag;
    } else {
      scopeTags.push(tag);
    }
  }

  let emojiPrefix = "";
  if (priority) {
    emojiPrefix += {
      "!": "⚠️ ",
      "!!": "‼️ ",
      "!!!": "❗❗❗ ",
    }[priority] ?? "";
  }
  if (dueDate) {
    emojiPrefix += "⏰ ";
  }

  const fullLine = emojiPrefix + fullLineRaw.trim();
  const plainText = fullLineRaw.replace(tagRegex, "").trim();

  const baseIndent = baseLine.match(/^\s*/)?.[0].length ?? 0;
  let bodyLines: string[] = [];

  let i = index + 1;
  let usedExplicitEnd = false;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "@@") {
      usedExplicitEnd = true;
      i++;
      break;
    }
    bodyLines.push(line);
    i++;
  }

  // Fallback auf alte Logik wenn kein @@
  if (!usedExplicitEnd) {
    bodyLines = [];
    i = index + 1;
    while (i < lines.length) {
      const line = lines[i];
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      const isEmpty = line.trim() === "";
      const nextLine = lines[i + 1] || "";
      const isNextToken = nextLine.trim().match(/^@(?:TODO|DONE|QUESTION|ANSWER|DECISION|IDEA|REMINDER)\b/);
  
      if (isEmpty && isNextToken) break;
      if (isEmpty || indent > baseIndent) {
        bodyLines.push(line);
        i++;
      } else {
        break;
      }
    }
  }

  // Clean bodyLines: strip leading indentation
  const minIndent = Math.min(...bodyLines.filter(l => l.trim()).map(l => l.match(/^\s*/)?.[0].length ?? 0));
  const cleanedBody = bodyLines.map(l => l.substring(minIndent)).join("\n");

  const fullContent = `${fullLine}\n${cleanedBody}`.trim();

  const sourceFileRelative = path.relative(workspace, sourceFile);
  const sourceFileName = path.basename(sourceFile, path.extname(sourceFile));
  const ref = `[#${sourceFileName}](${sourceFileRelative})`;
  const closedAt = type === "DONE" ? createdAt : undefined;

  return [
    {
      content: fullContent,
      scope: scopeTags.length > 0 ? scopeTags : undefined,
      dueDate,
      priority,
      createdAt,
      closedAt,
      type: type as Entry["type"],
      sourceFile: sourceFileRelative,
      ref
    },
    i - 1,
  ];
}


function formatBodyAsMarkdownList(lines: string[]): string {
  return lines.map(line => {
    if (!line.trim()) return "";
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const bulletLevel = Math.floor(indent / 2); // oder 1, je nach Format
    return `${"  ".repeat(bulletLevel)}- ${line.trim()}`;
  }).join("\n");
}


function writeJournalFile(filePath: string, entries: Entry[], title: string) {
  if (entries.length === 0) return;

  const grouped: Record<Entry["type"], Entry[]> = {} as any;

  for (const entry of entries) {
    if (!grouped[entry.type]) grouped[entry.type] = [];
    grouped[entry.type].push(entry);
  }

  const typeOrder: Entry["type"][] = [
    "TODO",
    "REMINDER",
    "QUESTION",
    "IDEA",
    "DONE",
    "ANSWER",
    "DECISION"
  ];

  let output = `# ${title}\n\n`;

  for (const type of typeOrder) {
    const group = grouped[type];
    if (!group || group.length === 0) continue;

    const typeLabel = `## ${type}s`;
    output += `${typeLabel}\n\n`;

    const sortedGroup = group.sort((a, b) => b.createdAt.localeCompare(a.createdAt, undefined, { numeric: true }));

    for (const entry of sortedGroup) {
      const lines = entry.content.trim().split("\n");
      const summary = lines[0];
      const details = lines.slice(1).join("\n");

      const box = entry.type === "DONE" ? "[x]" : "[ ]";
      output += `- ${box} ${summary}\n`;

      const metadata: string[] = [];
      if (entry.scope?.length) {
        metadata.push(`- scopes: ${entry.scope.map(tag => `[#${tag}](../pages/${tag}.md)`).join(", ")}`);
      }
      if (entry.dueDate) {
        metadata.push(`- due: [#${entry.dueDate}](../journals/${entry.dueDate}.md)`);
      }
      metadata.push(`- ref: ../${entry.ref}`);

      if (details || metadata.length) {
        output += `\t<details>\n\t<summary>Details</summary>\n\n`;
        output += metadata.map(line => `\t${line}`).join("\n") + "\n";
        if (details) {
          output += "\n" + details.split("\n").map(line => `\t${line}`).join("\n") + "\n";
        }
        output += `\t</details>\n\n`;
      }
    }
  }

  fs.writeFileSync(filePath, output.trim() + "\n", "utf-8");
}


function writeGroupedJournalFile(filePath: string, entries: Entry[], groupTitle: string) {
  if (entries.length === 0) return;

  const grouped: Record<string, Entry[]> = {};

  for (const entry of entries) {
    const file = entry.sourceFile || "Unknown";
    if (!grouped[file]) grouped[file] = [];
    grouped[file].push(entry);
  }

  let output = `# ${groupTitle}\n\n`;

  for (const [source, groupEntries] of Object.entries(grouped)) {
    output += `## ${source}\n\n`;

    for (const entry of groupEntries) {
      const lines = entry.content.trim().split("\n");
      const summary = lines[0];
      const details = lines.slice(1).join("\n");

      const box = entry.type === "DONE" ? "[x]" : "[ ]";
      output += `- ${box} ${summary}\n`;

      const metadata: string[] = [];
      if (entry.scope?.length) {
        metadata.push(`- scopes: ${entry.scope.map(tag => `[#${tag}](../pages/${tag}.md)`).join(", ")}`);
      }
      if (entry.dueDate) {
        metadata.push(`- due: [#${entry.dueDate}](../journals/${entry.dueDate}.md)`);
      }
      metadata.push(`- ref: ../${entry.ref}`);

      if (details || metadata.length) {
        output += `\t<details>\n\t<summary>Details</summary>\n\n`;
        output += metadata.map(line => `\t${line}`).join("\n") + "\n";
        if (details) {
          output += "\n" + details.split("\n").map(line => `\t${line}`).join("\n") + "\n";
        }
        output += `\t</details>\n\n`;
      }
    }
  }

  fs.writeFileSync(filePath, output.trim() + "\n", "utf-8");
}


export function syncTodos() {
  ensureTodosDir();

  const todos: Entry[] = [];
  const done: Entry[] = [];
  const questions: Entry[] = [];
  const answers: Entry[] = [];
  const decisions: Entry[] = [];
  const reminders: Entry[] = [];
  const ideas: Entry[] = [];

  const allFiles = getAllMarkdownFiles(workspace);

  for (const file of allFiles) {
    const lines = fs.readFileSync(file, "utf-8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const [entry, newIndex] = parseEntry(lines, i, file);
      if (entry) {
        switch (entry.type) {
          case "TODO":
            todos.push(entry);
            break;
          case "DONE":
            done.push(entry);
            break;
          case "QUESTION":
            questions.push(entry);
            break;
          case "ANSWER":
            answers.push(entry);
            break;
          case "DECISION":
            decisions.push(entry);
            break;
          case "REMINDER":
            reminders.push(entry);
            break;
          case "IDEA":
            ideas.push(entry);
            break;
        }
        i = newIndex;
      }
    }
  }

  saveEntries(TODOS_JSON, todos);
  saveEntries(DONE_JSON, done);
  saveEntries(QUESTION_JSON, questions);
  saveEntries(ANSWER_JSON, answers);
  saveEntries(DECISION_JSON, decisions);
  saveEntries(REMINDER_JSON, reminders);
  saveEntries(IDEAS_JSON, ideas);

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  const filteredDone = done.filter(d => d.closedAt === today || d.closedAt === yesterday);
  const sortedTodos = [...todos, ...reminders, ...questions, ...ideas, ...filteredDone].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  writeJournalFile(TODAY_PATH, sortedTodos, "My Day");
  writeGroupedJournalFile(QUESTION_PATH, questions, "@QUESTION");
  writeGroupedJournalFile(ANSWER_PATH, answers, "@ANSWER");
  writeGroupedJournalFile(DECISION_PATH, decisions, "@DECISION");
}
