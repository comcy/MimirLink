import fs from "fs";
import matter from "gray-matter";
import { marked } from "marked";
import path from "path";
import { WORKSPACE } from "../configuration/config";

const outputDir = path.join(WORKSPACE, "public");
const templatePath = path.join(WORKSPACE, ".ygg", "templates", "page.html");
const stylePath = path.join(WORKSPACE, ".ygg", "styles", "style.css");

interface SiteStructure {
  journals: Array<{title: string, path: string}>;
  pages: Array<{title: string, path: string}>;
  allContent: Array<{title: string, path: string}>;
}

function escapeHTML(str: string): string {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

function calculateRelativePath(fromPath: string, toPath: string): string {
  // Normalize paths and ensure they start from the same root
  const from = fromPath.split('/').filter(Boolean);
  const to = toPath.split('/').filter(Boolean);
  
  // Calculate how many levels to go back
  const goBack = from.length;
  const backPath = '../'.repeat(goBack);
  
  // Combine with target path and ensure .html extension
  return backPath + to.join('/') + '.html';
}

// Neue Funktion: Konvertiert Markdown-Links zu HTML-Links
function convertMarkdownLinks(content: string, currentPath: string): string {
  // RegEx für Markdown-Links: [Text](link.md) oder [Text](./link.md) oder [Text](../folder/link.md)
  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*\.md(?:#[^)]*)?)\)/g;
  
  return content.replace(markdownLinkRegex, (match, linkText, linkPath) => {
    // Extrahiere Anker-Link falls vorhanden
    const [filePath, anchor] = linkPath.split('#');
    
    // Normalisiere den Pfad
    let normalizedPath = filePath;
    
    // Wenn der Pfad mit ./ beginnt, entferne es
    if (normalizedPath.startsWith('./')) {
      normalizedPath = normalizedPath.substring(2);
    }
    
    // Berechne den relativen Pfad basierend auf der aktuellen Position
    let targetPath: string;
    
    if (normalizedPath.startsWith('../')) {
      // Relativer Pfad nach oben
      targetPath = normalizedPath;
    } else if (path.isAbsolute(normalizedPath)) {
      // Absoluter Pfad - berechne relativ zur aktuellen Position
      const currentDepth = currentPath.split('/').filter(Boolean).length;
      const backPath = '../'.repeat(currentDepth);
      targetPath = backPath + normalizedPath;
    } else {
      // Relativer Pfad im gleichen Verzeichnis oder nach unten
      targetPath = normalizedPath;
    }
    
    // Ersetze .md mit .html
    targetPath = targetPath.replace(/\.md$/, '.html');
    
    // Füge Anker wieder hinzu falls vorhanden
    if (anchor) {
      targetPath += '#' + anchor;
    }
    
    return `[${linkText}](${targetPath})`;
  });
}

// Neue Funktion: Konvertiert auch Wiki-Style Links [[Link]]
function convertWikiLinks(content: string, currentPath: string, structure: SiteStructure): string {
  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  
  return content.replace(wikiLinkRegex, (match, linkContent) => {
    // Extrahiere Titel und Link falls Format: [[Link|Title]] verwendet wird
    const [linkPath, displayText] = linkContent.includes('|') 
      ? linkContent.split('|').reverse() 
      : [linkContent, linkContent];
    
    // Suche nach der entsprechenden Datei in der Site-Struktur
    const foundContent = structure.allContent.find(item => 
      item.title.toLowerCase() === linkPath.toLowerCase() ||
      item.path.toLowerCase().includes(linkPath.toLowerCase())
    );
    
    if (foundContent) {
      const relativePath = calculateRelativePath(currentPath, foundContent.path);
      return `[${displayText}](${relativePath})`;
    }
    
    // Falls nicht gefunden, erstelle einen Standard-Link
    const targetPath = linkPath.replace(/\s+/g, '-').toLowerCase() + '.html';
    return `[${displayText}](${targetPath})`;
  });
}

function buildSiteStructure(rootDir: string): SiteStructure {
  const structure: SiteStructure = {
    journals: [],
    pages: [],
    allContent: []
  };

  function scanDirectory(dir: string, relativePath: string = "") {
    const items = fs.readdirSync(dir).filter(item => item !== "public" && !item.startsWith('.'));
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relPath = path.join(relativePath, item).replace(/\\/g, '/');
      
      if (fs.statSync(fullPath).isDirectory()) {
        // Categorize directories
        if (item.toLowerCase().includes('journal')) {
          scanJournals(fullPath, relPath);
        } else if (item.toLowerCase().includes('page')) {
          scanPages(fullPath, relPath);
        } else {
          scanDirectory(fullPath, relPath);
        }
      } else if (item.endsWith('.md')) {
        const htmlPath = relPath.replace(/\.md$/, '');
        const title = item.replace(/\.md$/, '');
        structure.allContent.push({title, path: htmlPath});
      }
    }
  }

  function scanJournals(dir: string, relativePath: string) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item.endsWith('.md')) {
        const htmlPath = path.join(relativePath, item).replace(/\.md$/, '').replace(/\\/g, '/');
        const title = item.replace(/\.md$/, '');
        structure.journals.push({title, path: htmlPath});
      } else if (fs.statSync(fullPath).isDirectory()) {
        scanJournals(fullPath, path.join(relativePath, item));
      }
    }
  }

  function scanPages(dir: string, relativePath: string) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      if (item.endsWith('.md')) {
        const htmlPath = path.join(relativePath, item).replace(/\.md$/, '').replace(/\\/g, '/');
        const title = item.replace(/\.md$/, '');
        structure.pages.push({title, path: htmlPath});
      } else if (fs.statSync(fullPath).isDirectory()) {
        scanPages(fullPath, path.join(relativePath, item));
      }
    }
  }

  scanDirectory(rootDir);
  return structure;
}

function buildBreadcrumb(relPath: string, currentDepth: number): string {
  // For root level, use direct path, otherwise use relative path
  const rootPath = currentDepth === 0 ? '' : '../'.repeat(currentDepth);
  const indexHref = currentDepth === 0 ? 'index.html' : rootPath + 'index.html';
  
  if (!relPath) {
    return `<nav class="breadcrumbs"><a href="${indexHref}">🏠 Startseite</a></nav>`;
  }

  const parts = relPath.split('/').filter(part => part);
  const links = parts.map((part, i) => {
    const backLevels = currentDepth;
    const forwardPath = parts.slice(0, i + 1).join("/");
    const href = '../'.repeat(backLevels) + forwardPath + "/index.html";
    return `<a href="${href}">${part}</a>`;
  });

  return `<nav class="breadcrumbs"><a href="${indexHref}">🏠 Startseite</a> → ${links.join(" → ")}</nav>`;
}

function loadTemplate(): string {
  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error(`❌ Fehler beim Laden des Templates: ${templatePath}`);
    throw error;
  }
}

function copyStylesheet(): void {
  try {
    const stylesOutputDir = path.join(outputDir, 'styles');
    fs.mkdirSync(stylesOutputDir, { recursive: true });
    
    const styleContent = fs.readFileSync(stylePath, "utf8");
    const outputStylePath = path.join(stylesOutputDir, 'style.css');
    fs.writeFileSync(outputStylePath, styleContent);
    
    console.log("✅ CSS-Datei kopiert nach: styles/style.css");
  } catch (error) {
    console.error(`❌ Fehler beim Kopieren der CSS-Datei: ${stylePath}`);
    throw error;
  }
}

function copyAssets(): void {
  try {
    const assetsSourceDir = path.join(WORKSPACE, "assets");
    const assetsOutputDir = path.join(outputDir, "assets");
    
    // Check if assets directory exists
    if (fs.existsSync(assetsSourceDir)) {
      fs.mkdirSync(assetsOutputDir, { recursive: true });
      
      // Copy all files from assets directory
      const copyRecursive = (src: string, dest: string) => {
        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          
          if (fs.statSync(srcPath).isDirectory()) {
            fs.mkdirSync(destPath, { recursive: true });
            copyRecursive(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyRecursive(assetsSourceDir, assetsOutputDir);
      console.log("✅ Assets kopiert nach: assets/");
    } else {
      console.log("ℹ️ Kein assets-Verzeichnis gefunden, überspringe Asset-Kopierung");
    }
  } catch (error) {
    console.error(`❌ Fehler beim Kopieren der Assets: ${error.message}`);
    throw error;
  }
}

function renderPage(
  title: string, 
  content: string, 
  structure: SiteStructure, 
  currentPath: string,
  breadcrumb: string = "", 
  frontMatter: string = "",
  template: string
): string {
  // Calculate depth for relative paths
  const currentDepth = currentPath.split('/').filter(Boolean).length;
  const rootPath = '../'.repeat(currentDepth);
  const stylePath = rootPath + 'styles/style.css';
  
  // Build navigation menus with correct relative paths
  const journalsMenu = structure.journals.map(item => {
    const relativePath = calculateRelativePath(currentPath, item.path);
    return `<div class="nav-item"><a href="${relativePath}">${item.title}</a></div>`;
  }).join("");

  const pagesMenu = structure.pages.map(item => {
    const relativePath = calculateRelativePath(currentPath, item.path);
    return `<div class="nav-item"><a href="${relativePath}">${item.title}</a></div>`;
  }).join("");

  const allContentMenu = structure.allContent.map(item => {
    const relativePath = calculateRelativePath(currentPath, item.path);
    return `<div class="nav-item"><a href="${relativePath}">${item.title}</a></div>`;
  }).join("");

  return template
    .replace(/\{\{title\}\}/g, escapeHTML(title))
    .replace(/\{\{stylePath\}\}/g, stylePath)
    .replace(/\{\{rootPath\}\}/g, rootPath)
    .replace(/\{\{journalsMenu\}\}/g, journalsMenu)
    .replace(/\{\{pagesMenu\}\}/g, pagesMenu)
    .replace(/\{\{allContentMenu\}\}/g, allContentMenu)
    .replace(/\{\{breadcrumb\}\}/g, breadcrumb)
    .replace(/\{\{frontMatter\}\}/g, frontMatter)
    .replace(/\{\{content\}\}/g, content);
}

function renderMarkdownToHTML(
  inputPath: string, 
  relDirPath: string, 
  fileName: string, 
  structure: SiteStructure,
  template: string
) {
  const rawContent = fs.readFileSync(inputPath, "utf8");
  const { content, data } = matter(rawContent);
  
  // Hier ist die wichtige Änderung: Links vor der Markdown-Verarbeitung konvertieren
  const currentPath = path.join(relDirPath, fileName.replace(/\.md$/, "")).replace(/\\/g, '/');
  
  // Konvertiere Markdown-Links und Wiki-Links
  let processedContent = convertMarkdownLinks(content, currentPath);
  processedContent = convertWikiLinks(processedContent, currentPath, structure);
  
  // Jetzt erst zu HTML konvertieren
  const html = marked.parse(processedContent);

  const frontMatter = Object.entries(data).map(
    ([key, value]) => `<div class="meta"><strong>${key}</strong>: ${value}</div>`
  ).join("");

  const currentDepth = currentPath.split('/').filter(Boolean).length;
  const breadcrumb = buildBreadcrumb(relDirPath, currentDepth);

  const pageHtml = renderPage(
    data.title || fileName.replace(/\.md$/, ""),
    html,
    structure,
    currentPath,
    breadcrumb,
    frontMatter,
    template
  );

  const outputPath = path.join(outputDir, relDirPath, `${fileName.replace(/\.md$/, ".html")}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, pageHtml);
}

function renderDirectoryIndex(relDirPath: string, structure: SiteStructure, template: string) {
  const absDir = path.join(WORKSPACE, relDirPath);
  const items = fs.readdirSync(absDir)
    .filter(f => f.endsWith(".md") || (fs.statSync(path.join(absDir, f)).isDirectory() && !f.startsWith('.')))
    .map(f => {
      const filePath = path.join(absDir, f);
      const isDir = fs.statSync(filePath).isDirectory();
      const name = f.replace(/\.md$/, "");
      const href = isDir 
        ? `${name}/index.html`
        : `${name}.html`;
      return `<li><a href="${href}">${name}</a></li>`;
    });

  const currentDepth = relDirPath.split('/').filter(Boolean).length;
  const breadcrumb = buildBreadcrumb(relDirPath, currentDepth);
  
  const content = `
    <div class="fade-in">
      <h1>📁 ${relDirPath || "Startseite"}</h1>
      <div class="directory-content">
        <h2>Inhalte in diesem Verzeichnis</h2>
        <ul class="directory-list">
          ${items.join("")}
        </ul>
      </div>
    </div>
  `;

  const pageHtml = renderPage(
    relDirPath || "Second Brain",
    content,
    structure,
    relDirPath,
    breadcrumb,
    "",
    template
  );

  // Main index.html goes to root of public directory
  const indexPath = relDirPath === "" 
    ? path.join(outputDir, "index.html")
    : path.join(outputDir, relDirPath, "index.html");
    
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, pageHtml);
}

function generateStaticSite(dir: string, relDir: string = "", structure: SiteStructure, template: string) {
  const absDir = path.join(dir, relDir);
  const items = fs.readdirSync(absDir).filter(item => item !== "public" && !item.startsWith('.'));

  renderDirectoryIndex(relDir, structure, template);

  for (const item of items) {
    const absPath = path.join(absDir, item);
    const relPath = path.join(relDir, item);

    if (fs.statSync(absPath).isDirectory()) {
      generateStaticSite(dir, relPath, structure, template);
    } else if (item.endsWith(".md")) {
      renderMarkdownToHTML(absPath, relDir, item, structure, template);
    }
  }
}

function validateRequiredFiles(): void {
  const requiredFiles = [
    { path: templatePath, name: "HTML Template" },
    { path: stylePath, name: "CSS Stylesheet" }
  ];

  for (const { path: filePath, name } of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ Erforderliche Datei nicht gefunden: ${name} (${filePath})`);
    }
  }
}

export function startStaticSiteGeneration() {
  try {
    console.log("🔍 Validiere erforderliche Dateien...");
    validateRequiredFiles();

    // Clean and prepare output directory
    console.log("🧹 Bereinige Output-Verzeichnis...");
    fs.rmSync(outputDir, { recursive: true, force: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Load template
    console.log("📄 Lade HTML-Template...");
    const template = loadTemplate();

    // Copy stylesheet to make public folder standalone
    console.log("🎨 Kopiere CSS-Datei...");
    copyStylesheet();

    // Copy assets (images, etc.) to make public folder standalone
    console.log("🖼️ Kopiere Assets...");
    copyAssets();

    // Build site structure for navigation
    console.log("🔍 Scanne Site-Struktur...");
    const structure = buildSiteStructure(WORKSPACE);
    
    console.log(`📔 Gefunden: ${structure.journals.length} Journal-Einträge`);
    console.log(`📄 Gefunden: ${structure.pages.length} Seiten`);
    console.log(`📚 Gefunden: ${structure.allContent.length} Gesamt-Inhalte`);

    // Generate all pages
    console.log("🔧 Generiere statische Seiten...");
    console.log("🔗 Konvertiere Markdown-Links zu HTML-Links...");
    generateStaticSite(WORKSPACE, "", structure, template);

    console.log("✅ Statische Seiten erfolgreich generiert!");
    console.log(`📁 Output-Verzeichnis: ${outputDir}`);
    console.log("🚀 Das 'public' Verzeichnis ist nun standalone-fähig!");
    console.log("🔗 Alle Markdown-Links wurden zu HTML-Links konvertiert!");
    
  } catch (error) {
    console.error("❌ Fehler bei der Generierung der statischen Seiten:", error.message);
    throw error;
  }
}