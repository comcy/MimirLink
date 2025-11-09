import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { loadConfig } from "../configuration/config";
import { createPage } from "../notes/pages/page";

const config = loadConfig();
const workspace = config.workspace;
const assetsDir = path.join(workspace, "assets");
const IMAGES_JSON_PATH = path.join(workspace, ".ygg", "images.json");
const QUICK_CAPTURE_JSON_PATH = path.join(workspace, ".ygg", "image-quick-capture.json");

interface ImageEntry {
  uuid: string;
  path: string;
  pages: string[];
}

interface QuickCaptureEntry {
  uuid: string;
  originalName: string;
  path: string;
  capturedAt: string;
}

export function syncImages() {
  const markdownFiles = findMarkdownFiles(workspace);
  const existingImageMap: Record<string, ImageEntry> = fs.existsSync(IMAGES_JSON_PATH)
    ? JSON.parse(fs.readFileSync(IMAGES_JSON_PATH, "utf8"))
    : {};

  const existingQuickCaptures: Record<string, QuickCaptureEntry> = fs.existsSync(QUICK_CAPTURE_JSON_PATH)
    ? JSON.parse(fs.readFileSync(QUICK_CAPTURE_JSON_PATH, "utf8"))
    : {};

  const updatedImageMap: Record<string, ImageEntry> = {};
  const updatedQuickCaptures: Record<string, QuickCaptureEntry> = {};
  const actuallyUsedUuids = new Set<string>(); // Nur für wirklich referenzierte Bilder
  const referencedImagePaths = new Set<string>();

  // Phase 1: Verarbeite referenzierte Bilder in Markdown-Dateien (außer image-quick-capture.md)
  for (const file of markdownFiles) {
    // Skip die image-quick-capture.md Datei - das sind keine "echten" Referenzen
    const isQuickCaptureFile = path.basename(file) === "image-quick-capture.md";
    
    let content = fs.readFileSync(file, "utf8");
    let modified = false;
    const matches = [...content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];

    for (const match of matches) {
      const altText = match[1];
      const imagePath = match[2];
      const absoluteImagePath = path.resolve(path.dirname(file), imagePath);

      if (!fs.existsSync(absoluteImagePath)) {
        continue;
      }

      referencedImagePaths.add(absoluteImagePath);

      let existingEntry = Object.values(existingImageMap).find(e => {
        const assetPath = path.resolve(workspace, e.path);
        return assetPath === absoluteImagePath;
      });

      // Prüfe auch in Quick Captures nach bestehender UUID
      if (!existingEntry) {
        const existingQuickCapture = Object.values(existingQuickCaptures).find(qc => {
          const qcPath = path.resolve(workspace, qc.path);
          return qcPath === absoluteImagePath;
        });
        if (existingQuickCapture) {
          // Verwende die UUID aus Quick Capture
          existingEntry = {
            uuid: existingQuickCapture.uuid,
            path: existingQuickCapture.path,
            pages: []
          };
        }
      }

      let uuid = existingEntry?.uuid || uuidv4();
      let filename = `${uuid}${path.extname(absoluteImagePath)}`;
      const targetAssetPath = path.join(assetsDir, filename);

      if (!existingEntry) {
        fs.mkdirSync(assetsDir, { recursive: true });
        fs.renameSync(absoluteImagePath, targetAssetPath);
      }

      const newRelativePath = path.relative(path.dirname(file), targetAssetPath).replace(/\\/g, "/");
      if (altText !== uuid || imagePath !== newRelativePath) {
        const newTag = `![${uuid}](${newRelativePath})`;
        content = content.replace(match[0], newTag);
        modified = true;
      }

      if (!updatedImageMap[uuid]) {
        updatedImageMap[uuid] = {
          uuid,
          path: path.relative(workspace, targetAssetPath).replace(/\\/g, "/"),
          pages: [],
        };
      }

      const pageRelativePath = path.relative(workspace, file).replace(/\\/g, "/");
      if (!updatedImageMap[uuid].pages.includes(pageRelativePath)) {
        updatedImageMap[uuid].pages.push(pageRelativePath);
      }

      // Nur als "wirklich verwendet" markieren wenn es NICHT die Quick Capture Datei ist
      if (!isQuickCaptureFile) {
        actuallyUsedUuids.add(uuid);
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
    }
  }

  // Phase 2: Verarbeite Quick Capture Bilder (lose Bilder im Workspace)
  const allImageFiles = findImageFiles(workspace);
  
  for (const imageFile of allImageFiles) {
    const absoluteImagePath = path.resolve(imageFile);
    
    // Skip bereits verarbeitete/referenzierte Bilder
    if (referencedImagePaths.has(absoluteImagePath)) {
      continue;
    }
    
    // Skip Bilder die bereits im assets Ordner sind (diese werden in Phase 3 behandelt)
    if (imageFile.startsWith(assetsDir)) {
      continue;
    }

    const originalName = path.basename(imageFile);
    
    // Prüfe ob dieses Bild bereits als Quick Capture erfasst wurde
    let existingQuickCapture = Object.values(existingQuickCaptures).find(qc => {
      const quickCapturePath = path.resolve(workspace, qc.path);
      return quickCapturePath === absoluteImagePath;
    });

    let uuid = existingQuickCapture?.uuid || uuidv4();
    let filename = `${uuid}${path.extname(absoluteImagePath)}`;
    const targetAssetPath = path.join(assetsDir, filename);

    // Verschiebe das Bild in den assets Ordner
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.renameSync(absoluteImagePath, targetAssetPath);

    updatedQuickCaptures[uuid] = {
      uuid,
      originalName: existingQuickCapture?.originalName || originalName,
      path: path.relative(workspace, targetAssetPath).replace(/\\/g, "/"),
      capturedAt: existingQuickCapture?.capturedAt || new Date().toISOString(),
    };
  }

  // Phase 3: Behalte bestehende Quick Captures die noch nicht verwendet wurden
  for (const uuid in existingQuickCaptures) {
    // Skip wenn dieses Bild bereits in einer echten Markdown-Datei verwendet wird
    if (actuallyUsedUuids.has(uuid)) {
      continue;
    }

    const quickCapture = existingQuickCaptures[uuid];
    const quickCapturePath = path.join(workspace, quickCapture.path);
    
    // Wenn das Quick Capture Bild noch existiert und nicht bereits verarbeitet wurde
    if (fs.existsSync(quickCapturePath) && !updatedQuickCaptures[uuid]) {
      updatedQuickCaptures[uuid] = quickCapture;
    }
  }

  // Phase 4: Cleanup - lösche nur Bilder die weder verwendet noch in Quick Captures sind
  for (const uuid in existingImageMap) {
    const isActuallyUsed = actuallyUsedUuids.has(uuid);
    const isInQuickCaptures = updatedQuickCaptures[uuid] !== undefined;
    
    if (!isActuallyUsed && !isInQuickCaptures) {
      const imagePath = path.join(workspace, existingImageMap[uuid].path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Gelöschtes ungenutztes Bild: ${imagePath}`);
      }
    }
  }

  // Phase 5: Cleanup verwaiste Quick Captures (deren Bilder nicht mehr existieren)
  const finalQuickCaptures: Record<string, QuickCaptureEntry> = {};
  for (const uuid in updatedQuickCaptures) {
    const quickCapture = updatedQuickCaptures[uuid];
    const imagePath = path.join(workspace, quickCapture.path);
    
    if (fs.existsSync(imagePath)) {
      finalQuickCaptures[uuid] = quickCapture;
    } else {
      console.log(`Entferne verwaistes Quick Capture: ${quickCapture.originalName}`);
    }
  }

  // Phase 6: Erstelle/Update Quick Capture Markdown-Datei
  if (Object.keys(finalQuickCaptures).length > 0) {
    createQuickCaptureMarkdownFile(finalQuickCaptures);
  } else {
    // Lösche Quick Capture Datei wenn keine Bilder mehr vorhanden
    const quickCaptureMarkdownPath = path.join(workspace, "pages", "image-quick-capture.md");
    if (fs.existsSync(quickCaptureMarkdownPath)) {
      fs.unlinkSync(quickCaptureMarkdownPath);
    }
  }

  // Save updated maps
  fs.mkdirSync(path.dirname(IMAGES_JSON_PATH), { recursive: true });
  fs.writeFileSync(IMAGES_JSON_PATH, JSON.stringify(updatedImageMap, null, 2), "utf8");
  fs.writeFileSync(QUICK_CAPTURE_JSON_PATH, JSON.stringify(finalQuickCaptures, null, 2), "utf8");
  
  console.log(`Bilder synchronisiert: ${Object.keys(updatedImageMap).length} referenzierte, ${Object.keys(finalQuickCaptures).length} Quick Captures.`);
}

function createQuickCaptureMarkdownFile(quickCaptures: Record<string, QuickCaptureEntry>) {
  const quickCaptureMarkdownPath = path.join(workspace, "pages", "image-quick-capture.md");
  
  // Erstelle die Seite falls sie nicht existiert
  if (!fs.existsSync(quickCaptureMarkdownPath)) {
    createPage("image-quick-capture");
  }

  let content = fs.readFileSync(quickCaptureMarkdownPath, "utf8");
  
  // Entferne existierenden Quick Capture Content (alles nach der ersten ## Überschrift)
  const frontmatterEndMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  const frontmatter = frontmatterEndMatch ? frontmatterEndMatch[0] : "";
  
  // Baue neuen Content
  let newContent = frontmatter + "\n";
  newContent += "# Quick Image Captures\n\n";
  newContent += "Diese Bilder wurden automatisch erfasst und sind noch nicht in anderen Seiten referenziert.\n\n";

  // Sortiere nach Capture-Datum (neueste zuerst)
  const sortedCaptures = Object.values(quickCaptures).sort((a, b) => 
    new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );

  for (const capture of sortedCaptures) {
    const relativePath = path.relative(
      path.dirname(quickCaptureMarkdownPath), 
      path.join(workspace, capture.path)
    ).replace(/\\/g, "/");
    
    const captureDate = new Date(capture.capturedAt).toLocaleDateString("de-DE");
    
    newContent += `## ${capture.originalName}\n\n`;
    newContent += `**Erfasst am:** ${captureDate}  \n`;
    newContent += `**UUID:** \`${capture.uuid}\`\n\n`;
    newContent += `![${capture.uuid}](${relativePath})\n\n`;
    newContent += "---\n\n";
  }

  fs.writeFileSync(quickCaptureMarkdownPath, newContent, "utf8");
}

function findMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".ygg" && entry.name !== "assets") {
      return findMarkdownFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      return [fullPath];
    } else {
      return [];
    }
  });
}

function findImageFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".ygg" && entry.name !== "assets") {
      return findImageFiles(fullPath);
    } else if (entry.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
      return [fullPath];
    } else {
      return [];
    }
  });
}