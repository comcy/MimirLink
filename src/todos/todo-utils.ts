export function extractTodoMetadata(line: string): Partial<Todo> {
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

  if (!content.startsWith("\"") && content.includes(" ")) {
    content = `"${content}"`;
  }

  return { content, dueDate, priority, scope };
}