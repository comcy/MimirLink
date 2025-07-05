import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { loadConfig } from "../configuration/config";
import { createPage } from "../notes/pages/page";
import { createFileRegistry } from "../utils/file-registry";
import { findImageFiles } from "../utils/file-scanner";

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
  const fileRegistry = createFileRegistry(workspace);
  const filesToWrite: Record<string, string> = {};

  const existingImageMap: Record<string, ImageEntry> = fs.existsSync(IMAGES_JSON_PATH)
    ? JSON.parse(fs.readFileSync(IMAGES_JSON_PATH, "utf8"))
    : {};

  const existingQuickCaptures: Record<string, QuickCaptureEntry> = fs.existsSync(QUICK_CAPTURE_JSON_PATH)
    ? JSON.parse(fs.readFileSync(QUICK_CAPTURE_JSON_PATH, "utf8"))
    : {};

  const updatedImageMap: Record<string, ImageEntry> = {};
  const updatedQuickCaptures: Record<string, QuickCaptureEntry> = {};
  const actuallyUsedUuids = new Set<string>();
  const referencedImagePaths = new Set<string>();

  // Phase 1: Verarbeite referenzierte Bilder in Markdown-Dateien
  for (const relPath in fileRegistry) {
    const fileData = fileRegistry[relPath];
    const { filePath, content } = fileData;
    const isQuickCaptureFile = path.basename(filePath) === "image-quick-capture.md";

    let modifiedContent = content;
    const matches = [...content.matchAll(/!\[(.*?)\]\((.*?)\)/g)];

    for (const match of matches) {
      const altText = match[1];
      const imagePath = match[2];
      const absoluteImagePath = path.resolve(path.dirname(filePath), imagePath);

      if (!fs.existsSync(absoluteImagePath)) {
        continue;
      }

      referencedImagePaths.add(absoluteImagePath);

      let existingEntry = Object.values(existingImageMap).find(e => path.resolve(workspace, e.path) === absoluteImagePath);

      if (!existingEntry) {
        const existingQuickCapture = Object.values(existingQuickCaptures).find(qc => path.resolve(workspace, qc.path) === absoluteImagePath);
        if (existingQuickCapture) {
          existingEntry = { uuid: existingQuickCapture.uuid, path: existingQuickCapture.path, pages: [] };
        }
      }

      const uuid = existingEntry?.uuid || uuidv4();
      const filename = `${uuid}${path.extname(absoluteImagePath)}`;
      const targetAssetPath = path.join(assetsDir, filename);

      if (!existingEntry) {
        fs.mkdirSync(assetsDir, { recursive: true });
        fs.renameSync(absoluteImagePath, targetAssetPath);
      }

      const newRelativePath = path.relative(path.dirname(filePath), targetAssetPath).replace(/\\/g, "/");
      if (altText !== uuid || imagePath !== newRelativePath) {
        const newTag = `![${uuid}](${newRelativePath})`;
        modifiedContent = modifiedContent.replace(match[0], newTag);
      }

      if (!updatedImageMap[uuid]) {
        updatedImageMap[uuid] = { uuid, path: path.relative(workspace, targetAssetPath).replace(/\\/g, "/"), pages: [] };
      }

      if (!updatedImageMap[uuid].pages.includes(relPath)) {
        updatedImageMap[uuid].pages.push(relPath);
      }

      if (!isQuickCaptureFile) {
        actuallyUsedUuids.add(uuid);
      }
    }

    if (modifiedContent !== content) {
      filesToWrite[filePath] = modifiedContent;
    }
  }

  // Phase 2: Verarbeite Quick Capture Bilder
  const allImageFiles = findImageFiles(workspace);
  for (const imageFile of allImageFiles) {
    const absoluteImagePath = path.resolve(imageFile);

    if (referencedImagePaths.has(absoluteImagePath) || imageFile.startsWith(assetsDir)) {
      continue;
    }

    const originalName = path.basename(imageFile);
    let existingQuickCapture = Object.values(existingQuickCaptures).find(qc => path.resolve(workspace, qc.path) === absoluteImagePath);

    const uuid = existingQuickCapture?.uuid || uuidv4();
    const filename = `${uuid}${path.extname(absoluteImagePath)}`;
    const targetAssetPath = path.join(assetsDir, filename);

    fs.mkdirSync(assetsDir, { recursive: true });
    fs.renameSync(absoluteImagePath, targetAssetPath);

    updatedQuickCaptures[uuid] = {
      uuid,
      originalName: existingQuickCapture?.originalName || originalName,
      path: path.relative(workspace, targetAssetPath).replace(/\\/g, "/"),
      capturedAt: existingQuickCapture?.capturedAt || new Date().toISOString(),
    };
  }

  // Phase 3: Behalte bestehende Quick Captures
  for (const uuid in existingQuickCaptures) {
    if (actuallyUsedUuids.has(uuid)) {
      continue;
    }
    const quickCapture = existingQuickCaptures[uuid];
    if (fs.existsSync(path.join(workspace, quickCapture.path)) && !updatedQuickCaptures[uuid]) {
      updatedQuickCaptures[uuid] = quickCapture;
    }
  }

  // Phase 4: Cleanup ungenutzte Bilder
  for (const uuid in existingImageMap) {
    if (!actuallyUsedUuids.has(uuid) && !updatedQuickCaptures[uuid]) {
      const imagePath = path.join(workspace, existingImageMap[uuid].path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log(`Gelöschtes ungenutztes Bild: ${imagePath}`);
      }
    }
  }

  // Phase 5: Cleanup verwaiste Quick Captures
  const finalQuickCaptures: Record<string, QuickCaptureEntry> = {};
  for (const uuid in updatedQuickCaptures) {
    const quickCapture = updatedQuickCaptures[uuid];
    if (fs.existsSync(path.join(workspace, quickCapture.path))) {
      finalQuickCaptures[uuid] = quickCapture;
    } else {
      console.log(`Entferne verwaistes Quick Capture: ${quickCapture.originalName}`);
    }
  }

  // Phase 6: Erstelle/Update Quick Capture Markdown-Datei
  if (Object.keys(finalQuickCaptures).length > 0) {
    createQuickCaptureMarkdownFile(finalQuickCaptures, filesToWrite);
  } else {
    const quickCaptureMarkdownPath = path.join(workspace, "pages", "image-quick-capture.md");
    if (fs.existsSync(quickCaptureMarkdownPath)) {
      fs.unlinkSync(quickCaptureMarkdownPath);
    }
  }

  // Save updated maps and markdown files
  fs.mkdirSync(path.dirname(IMAGES_JSON_PATH), { recursive: true });
  fs.writeFileSync(IMAGES_JSON_PATH, JSON.stringify(updatedImageMap, null, 2), "utf8");
  fs.writeFileSync(QUICK_CAPTURE_JSON_PATH, JSON.stringify(finalQuickCaptures, null, 2), "utf8");

  for (const filePath in filesToWrite) {
    fs.writeFileSync(filePath, filesToWrite[filePath], "utf8");
  }
  
  console.log(`Bilder synchronisiert: ${Object.keys(updatedImageMap).length} referenzierte, ${Object.keys(finalQuickCaptures).length} Quick Captures.`);
}

function createQuickCaptureMarkdownFile(quickCaptures: Record<string, QuickCaptureEntry>, filesToWrite: Record<string, string>) {
  const quickCaptureMarkdownPath = path.join(workspace, "pages", "image-quick-capture.md");
  
  if (!fs.existsSync(quickCaptureMarkdownPath)) {
    createPage("image-quick-capture");
  }

  const content = filesToWrite[quickCaptureMarkdownPath] || fs.readFileSync(quickCaptureMarkdownPath, "utf8");
  
  const frontmatterEndMatch = content.match(/^---\n[\s\S]*?\n---\n/);
  const frontmatter = frontmatterEndMatch ? frontmatterEndMatch[0] : "";
  
  let newContent = frontmatter + "\n";
  newContent += "# Quick Image Captures\n\n";
  newContent += "Diese Bilder wurden automatisch erfasst und sind noch nicht in anderen Seiten referenziert.\n\n";

  const sortedCaptures = Object.values(quickCaptures).sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

  for (const capture of sortedCaptures) {
    const relativePath = path.relative(path.dirname(quickCaptureMarkdownPath), path.join(workspace, capture.path)).replace(/\\/g, "/");
    const captureDate = new Date(capture.capturedAt).toLocaleDateString("de-DE");
    
    newContent += `## ${capture.originalName}\n\n`;
    newContent += `**Erfasst am:** ${captureDate}  \n`;
    newContent += `**UUID:** \`${capture.uuid}\`\n\n`;
    newContent += `![${capture.uuid}](${relativePath})\n\n`;
    newContent += "---\n\n";
  }

  filesToWrite[quickCaptureMarkdownPath] = newContent;
}