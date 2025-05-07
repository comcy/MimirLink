import fs from "fs";
import path from "path";
import { loadConfig } from "../configuration/config";
import { format, parseISO, isAfter, subDays } from "date-fns";

const config = loadConfig();
const workspace = config.workspace;
const TODOS_DIR = path.join(workspace, ".ygg");
const TODOS_JSON = path.join(TODOS_DIR, "todos.json");
const DONE_JSON = path.join(TODOS_DIR, "done.json");
const JOURNAL_PATH = path.join(workspace, "journals", "TODAY.md");

export interface Todo {
  content: string;
  scope?: string;
  dueDate?: string;
  priority?: string;
  status: "TODO" | "DONE";
  sourceFile: string;
  createdAt: string;
  closedAt?: string;
}

function ensureTodosDir() {
  if (!fs.existsSync(TODOS_DIR)) {
    fs.mkdirSync(TODOS_DIR);
  }
}

function loadTodos(): Todo[] {
  if (!fs.existsSync(TODOS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TODOS_JSON, "utf-8"));
}

function loadDone(): Todo[] {
  if (!fs.existsSync(DONE_JSON)) return [];
  return JSON.parse(fs.readFileSync(DONE_JSON, "utf-8"));
}

function saveTodos(todos: Todo[]) {
  fs.writeFileSync(TODOS_JSON, JSON.stringify(todos, null, 2), "utf-8");
}

function saveDone(todos: Todo[]) {
  fs.writeFileSync(DONE_JSON, JSON.stringify(todos, null, 2), "utf-8");
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractTodoMetadata(line: string): Partial<Todo> {
  let content = line.replace(/^\s*- \[[ xX]\] /, "").trim();

  let dueDate: string | undefined;
  let priority: string | undefined;
  let scope: string | undefined;

  const inlineMatches = content.match(/\[(due|priority|scope):([^\]]+)\]/g);
  if (inlineMatches) {
    for (const match of inlineMatches) {
      const [, key, value] = match.match(/\[(due|priority|scope):([^\]]+)\]/)!;
      if (key === "due") dueDate = value.trim();
      if (key === "priority") priority = value.trim().toLowerCase();
      if (key === "scope") scope = value.trim();
    }
    content = content.replace(/\[(due|priority|scope):([^\]]+)\]/g, "").trim();
  }

  if (!dueDate && content.includes("📅")) {
    const match = content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
    if (match) dueDate = match[1];
    content = content.replace(/📅\s*\d{4}-\d{2}-\d{2}/, "").trim();
  }

  if (!priority) {
    if (content.includes("🔴")) priority = "high";
    else if (content.includes("🟡")) priority = "medium";
    else if (content.includes("🟢")) priority = "low";
    content = content.replace(/[🔴🟡🟢]/g, "").trim();
  }

  if (!scope && content.includes("🗂️")) {
    const match = content.match(/🗂️\s*(\w+)/);
    if (match) scope = match[1];
    content = content.replace(/🗂️\s*\w+/, "").trim();
  }

  if (!content.startsWith("\"")) {
    content = `"${content}"`;
  }

  return { content, dueDate, priority, scope };
}

function writeTodayJournal(allTodos: Todo[]) {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const frontmatter = `---\ntitle: My Day\ndate: ${today}\ntype: journal\n---`;
  const header = `# My Day — ${today}`;

  const visibleTodos = allTodos.filter(t => {
    if (t.status === "TODO") return true;
    if (t.closedAt) {
      return t.closedAt >= yesterday;
    }
    return false;
  });

  const nowTodos = visibleTodos.filter(t => t.dueDate && (t.dueDate <= today));
  const laterTodos = visibleTodos.filter(t => t.dueDate && t.dueDate > today);
  const otherTodos = visibleTodos.filter(t => !t.dueDate);

  const sortFn = (a: Todo, b: Todo) => {
    return b.createdAt.localeCompare(a.createdAt);
  };

  const formatEntry = (t: Todo) => {
    const anchor = `#${slugify(t.content)}`;
    const relativePath = path.relative(path.dirname(JOURNAL_PATH), path.join(workspace, t.sourceFile)).replace(/\\/g, "/");
    const checkbox = t.status === "DONE" ? "x" : " ";

    const symbols = [
      t.dueDate ? `📅 ${t.dueDate}` : "",
      t.scope ? `🗂️ ${t.scope}` : "",
      t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : t.priority === "low" ? "🟢" : ""
    ].filter(Boolean).join(" ");

    return `- [${checkbox}] [${t.content} (${symbols})](${relativePath}${anchor})`;
  };

  const sections = [
    `## NOW\n${nowTodos.sort(sortFn).map(formatEntry).join("\n")}`,
    `## Later\n${laterTodos.sort(sortFn).map(formatEntry).join("\n")}`,
    `## Other tasks\n${otherTodos.sort(sortFn).map(formatEntry).join("\n")}`
  ];

  const content = `${frontmatter}\n\n${header}\n\n${sections.join("\n\n")}`;

  fs.mkdirSync(path.dirname(JOURNAL_PATH), { recursive: true });
  fs.writeFileSync(JOURNAL_PATH, content, "utf-8");
}

export function syncTodos() {
  ensureTodosDir();
  const allFiles = getAllMarkdownFiles(workspace);
  const todos: Todo[] = [];
  const done: Todo[] = [];
  const today = format(new Date(), "yyyy-MM-dd");

  for (const file of allFiles) {
    if (file.endsWith("journals/TODAY.md")) continue;
    const content = fs.readFileSync(file, "utf-8");
    const lines = content.split("\n");
    const updatedLines: string[] = [];

    for (let line of lines) {
      const trimmedLine = line.trimStart();
      if (trimmedLine.startsWith("- [ ] ") || trimmedLine.startsWith("- [x] ")) {
        const status = trimmedLine.startsWith("- [ ] ") ? "TODO" : "DONE";
        const parsed = extractTodoMetadata(trimmedLine);
        const existing = [...todos, ...done].find(t => t.content === parsed.content);

        const todo: Todo = {
          ...parsed,
          status,
          sourceFile: path.relative(workspace, file),
          createdAt: existing?.createdAt || today,
          closedAt: status === "DONE" ? (existing?.closedAt || today) : existing?.closedAt
        } as Todo;

        if (status === "DONE") {
          done.push(todo);
        } else {
          todos.push(todo);
        }
      }
      updatedLines.push(line);
    }

    fs.writeFileSync(file, updatedLines.join("\n"), "utf-8");
  }

  saveTodos(todos);
  saveDone(done);
  writeTodayJournal([...todos, ...done]);
}
