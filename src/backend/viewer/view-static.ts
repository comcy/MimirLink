import fs from "fs";
import matter from "gray-matter";
import { marked } from "marked";
import path from "path";
import { WORKSPACE } from "../configuration/config";

const outputDir = path.join(WORKSPACE, "public");
const templatePath = path.join(WORKSPACE, ".ygg", "templates", "page.html");
const stylePath = path.join(WORKSPACE, ".ygg", "styles", "style.css");

const template = fs.readFileSync(templatePath, "utf8");
const customCSS = fs.readFileSync(stylePath, "utf8");

function escapeHTML(str: string): string {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}


function buildTOC(dirPath: string, relUrlPath: string): string {
  const items = fs.readdirSync(dirPath)
    .filter(f => f.endsWith(".md") || fs.statSync(path.join(dirPath, f)).isDirectory())
    .map(f => {
      const filePath = path.join(dirPath, f);
      const isDir = fs.statSync(filePath).isDirectory();
      const name = f.replace(/\.md$/, "");

      const href = isDir
        ? `${name}/index.html`
        : `${name}.html`;

      return `<li><a href="${href}">${name}</a></li>`;
    });

  return `<ul>${items.join("")}</ul>`;
}


function buildBreadcrumb(relPath: string): string {
  if (!relPath) return `<a href="index.html">🏠 Startseite</a>`;

  const parts = relPath.split(path.sep);
  const links = parts.map((part, i) => {
    const subPath = parts.slice(0, i + 1).join("/");
    return `<a href="${"./".repeat(parts.length - i - 1)}${subPath}/index.html">${part}</a>`;
  });


  return `<nav class="breadcrumbs"><a href="index.html">🏠 Startseite</a> / ${links.join(" / ")}</nav>`;
}

function renderPage(title: string, content: string, toc: string, folderTitle: string = "Inhalt"): string {
  return template
    .replace("{{title}}", escapeHTML(title))
    .replace("{{styles}}", `<style>${customCSS}</style>`)
    .replace("{{tocTitle}}", folderTitle)
    .replace("{{toc}}", toc)
    .replace("{{content}}", content);
}

function renderMarkdownToHTML(inputPath: string, relDirPath: string, fileName: string) {
  const rawContent = fs.readFileSync(inputPath, "utf8");
  const { content, data } = matter(rawContent);
  const html = marked.parse(content);

  const frontMatter = Object.entries(data).map(
    ([key, value]) => `<div class="meta"><strong>${key}</strong>: ${value}</div>`
  ).join("");

  const toc = buildTOC(path.join(WORKSPACE, relDirPath), relDirPath);
  const breadcrumb = buildBreadcrumb(path.join(relDirPath, fileName.replace(/\.md$/, "")));

  const pageHtml = renderPage(
    data.title || fileName.replace(/\.md$/, ""),
    `${breadcrumb}<div class="front-matter">${frontMatter}</div><hr/>${html}`,
    toc,
    path.basename(relDirPath || ".")
  );

  const outputPath = path.join(outputDir, relDirPath, `${fileName.replace(/\.md$/, ".html")}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pageHtml);
}

function renderDirectoryIndex(relDirPath: string) {
  const absDir = path.join(WORKSPACE, relDirPath);
  const toc = buildTOC(absDir, relDirPath);
  const breadcrumb = buildBreadcrumb(relDirPath);

  const content = `<h2>Verzeichnis: ${relDirPath || "Startseite"}</h2>${breadcrumb}<ul>${toc}</ul>`;
  const pageHtml = renderPage(relDirPath || "Startseite", content, toc, path.basename(relDirPath || "."));

  const indexPath = path.join(outputDir, relDirPath, "index.html");
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, pageHtml);
}

function generateStaticSite(dir: string, relDir: string = "") {
  const absDir = path.join(dir, relDir);
  const items = fs.readdirSync(absDir).filter(item => item !== "public");


  renderDirectoryIndex(relDir);

  for (const item of items) {
    const absPath = path.join(absDir, item);
    const relPath = path.join(relDir, item);

    if (fs.statSync(absPath).isDirectory()) {
      generateStaticSite(dir, relPath);
    } else if (item.endsWith(".md")) {
      renderMarkdownToHTML(absPath, relDir, item);
    }
  }
}

export function startStaticSiteGeneration() {

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  generateStaticSite(WORKSPACE, "");

  console.log("✅ Statische Seiten generiert in:", outputDir);

}

