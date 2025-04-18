// view-static.ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { loadConfig } from "./config";

// Ordner innerhalb des Arbeitsverzeichnisses
const config = loadConfig();
const wrkdyPath = config.wrkdyPath;
const templateDir = path.join(wrkdyPath, ".wrkdy", "templates");
const styleDir = path.join(wrkdyPath, ".wrkdy", "styles");
const outputDir = path.join(wrkdyPath, "public");

// Lade HTML Template
const template = fs.readFileSync(path.join(templateDir, "page.html"), "utf8");

// Optional: Stylesheet
const customCSS = fs.existsSync(path.join(styleDir, "custom.css"))
  ? fs.readFileSync(path.join(styleDir, "custom.css"), "utf8")
  : "";

// HTML Escaping für einfache Titel/Strings
function escapeHTML(str: string): string {
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Hilfsfunktion: Inhalt rendern und Datei schreiben
function renderMarkdownToHTML(inputPath: string, outputPath: string, relPath: string) {
  const raw = fs.readFileSync(inputPath, "utf8");
  const { content, data } = matter(raw);
  const html = marked(content);

  const frontMatter = Object.entries(data)
    .map(([k, v]) => `<div class="meta"><span class="key">${escapeHTML(k)}:</span> <span class="value">${escapeHTML(String(v))}</span></div>`)
    .join("");

  const fullHtml = template
    .replace("{{title}}", escapeHTML(data.title || path.basename(inputPath, ".md")))
    .replace("{{content}}", `<div class="front-matter">${frontMatter}</div><hr/>${html}`)
    .replace("{{styles}}", `<style>${customCSS}</style>`)
    .replace("{{toc}}", `<p><a href="/index.html">🔙 Übersicht</a></p>`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, fullHtml);
}

// Rekursiv durchlaufen
function walkDir(dir: string, relBase: string = "") {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = path.join(relBase, item.name);

    if (item.isDirectory()) {
      walkDir(fullPath, relPath);
    } else if (item.isFile() && item.name.endsWith(".md")) {
      const outputPath = path.join(outputDir, relBase, item.name.replace(/\.md$/, ".html"));
      renderMarkdownToHTML(fullPath, outputPath, relPath);
    }
  }
}

// Start
export function generateStaticSite() {
  if (!fs.existsSync(wrkdyPath)) throw new Error("wrkdyPath nicht gefunden.");
  fs.rmSync(outputDir, { recursive: true, force: true }); // vorheriges löschen
  fs.mkdirSync(outputDir, { recursive: true });

  // Generiere Index
  const folders = fs.readdirSync(wrkdyPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "public")
    .map(entry => `<li><a href="${entry.name}/index.html">${entry.name}</a></li>`)
    .join("");

  const indexHtml = template
    .replace("{{title}}", "Startseite")
    .replace("{{content}}", `<h1>Inhalte</h1><ul>${folders}</ul>`)
    .replace("{{styles}}", `<style>${customCSS}</style>`)
    .replace("{{toc}}", "");

  fs.writeFileSync(path.join(outputDir, "index.html"), indexHtml);

  // Durchlaufe alle Inhalte
  walkDir(wrkdyPath);
}