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
const TODAY_PATH = path.join(JOURNAL_DIR, "TODAY.md");
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
  type: "TODO" | "DONE" | "QUESTION" | "ANSWER" | "DECISION" | "IDEAS" | "REMINDER";
  sourceFile: string;
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
  const match = baseLine.match(/^\s*@(TODO|DONE|QUESTION|ANSWER|DECISION|IDEAS|REMINDER)\s+(.+)/);
  if (!match) return [null, index];

  const [, type, mainText] = match;
  let content = mainText.trim();
  const createdAt = format(new Date(), "yyyy-MM-dd");
  let dueDate: string | undefined;
  let priority: string | undefined;
  let scopeTags: string[] = [];

  const tagRegex = /\[#([^\]]+)\]\([^\)]+\)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    const tag = tagMatch[1];
    if (/^\d{4}-\d{2}-\d{2}$/.test(tag)) {
      dueDate = tag;
    } else if (/^!{1,3}$/.test(tag)) {
      priority = tag;
    } else {
      scopeTags.push(tag);
    }
  }

  content = content.replace(tagRegex, "").trim();

  let i = index + 1;
  while (i < lines.length && lines[i].startsWith("  ")) {
    content += "\n" + lines[i];
    i++;
  }

  const closedAt = type === "DONE" ? createdAt : undefined;

  return [
    {
      content,
      scope: scopeTags.length > 0 ? scopeTags : undefined,
      dueDate,
      priority,
      createdAt,
      closedAt,
      type: type as Entry["type"],
      sourceFile: path.relative(workspace, sourceFile),
    },
    i - 1,
  ];
}

function writeJournalFile(filePath: string, entries: Entry[], header: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const frontmatter = `---\ntitle: ${header}\ndate: ${today}\ntype: journal\n---`;
  const content = [`# ${header} — ${today}`];

  const upcoming = entries.filter(e => e.dueDate && e.type !== "DONE" && e.type !== "DECISION" && e.type !== "ANSWER" && (e.dueDate <= today));

  if (upcoming.length) {
    content.push("\n## 🔔 Due Today or Overdue");
    for (const e of upcoming) {
      const checkbox = e.type === "DONE" ? "[x]" : "[ ]";
      const lines = [`- ${checkbox} ${e.priority ? `#${e.priority} ` : ""}${e.content}`];
      if (e.scope?.length) {
        const scopeLinks = e.scope.map(s => `[#${s}](../pages/${s}.md)`).join(", ");
        lines.push(`  - scopes: ${scopeLinks}`);
      }
      if (e.dueDate) {
        lines.push(`  - due: [#${e.dueDate}](../journals/${e.dueDate}.md)`);
      }
      if (e.priority) {
        lines.push(`  - prio: #${e.priority}`);
      }
      if (e.sourceFile) {
        lines.push(`  - ref: [#${e.content}](../${e.sourceFile}.md)`);
      }
      content.push(lines.join("\n"));
    }
  }

  for (const e of entries) {
    const checkbox = e.type === "DONE" ? "[x]" : "[ ]";
    const lines = [`- ${checkbox} ${e.priority ? `#${e.priority} ` : ""}${e.content}`];
    if (e.scope?.length) {
      const scopeLinks = e.scope.map(s => `[#${s}](../pages/${s}.md)`).join(", ");
      lines.push(`  - scopes: ${scopeLinks}`);
    }
    if (e.dueDate) {
      lines.push(`  - due: [#${e.dueDate}](../journals/${e.dueDate}.md)`);
    }
    if (e.priority) {
      lines.push(`  - prio: #${e.priority}`);
    }
    if (e.sourceFile) {
      lines.push(`  - ref: [#${e.content}](../${e.sourceFile}.md)`);
    }
    content.push(lines.join("\n"));
  }

  fs.writeFileSync(filePath, `${frontmatter}\n\n${content.join("\n\n")}\n`, "utf-8");
}

function writeGroupedJournalFile(filePath: string, entries: Entry[], tokenHeader: string) {
  const frontmatter = `---\ntitle: ${tokenHeader}\ndate: ${format(new Date(), "yyyy-MM-dd")}\ntype: journal\n---`;
  const grouped: Record<string, Entry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.createdAt]) grouped[entry.createdAt] = [];
    grouped[entry.createdAt].push(entry);
  }

  const content = [`# ${tokenHeader}`];
  for (const date of Object.keys(grouped).sort().reverse()) {
    content.push(`\n\n## ${date}`);
    for (const entry of grouped[date]) {
      const anchor = `#${entry.content.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
      const fileLink = `[${entry.sourceFile}](../${entry.sourceFile}${anchor})`;
      content.push(`\n### ${tokenHeader}\n\n${entry.content}\n\nref: ${fileLink}\n\n---`);
    }
  }

  fs.writeFileSync(filePath, `${frontmatter}\n\n${content.join("\n")}`, "utf-8");
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
          case "IDEAS":
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
