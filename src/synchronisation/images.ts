import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { loadConfig } from "../configuration/config";

const config = loadConfig();
const workspace = config.workspace;
const assetsDir = path.join(workspace, "assets");
const IMAGES_JSON_PATH = path.join(workspace, ".ygg", "images.json");

interface ImageEntry {
  uuid: string;
  path: string;
  pages: string[];
}

export function syncImages() {
  const markdownFiles = findMarkdownFiles(workspace);
  const existingImageMap: Record<string, ImageEntry> = fs.existsSync(IMAGES_JSON_PATH)
    ? JSON.parse(fs.readFileSync(IMAGES_JSON_PATH, "utf8"))
    : {};

  const updatedImageMap: Record<string, ImageEntry> = {};
  const usedUuids = new Set<string>();

  for (const file of markdownFiles) {
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

      let existingEntry = Object.values(existingImageMap).find(e => {
        const assetPath = path.resolve(workspace, e.path);
        return assetPath === absoluteImagePath;
      });

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

      usedUuids.add(uuid);
    }

    if (modified) {
      fs.writeFileSync(file, content, "utf8");
    }
  }

  // Jetzt: existierende Bilder, die nicht mehr referenziert werden => löschen
  for (const uuid in existingImageMap) {
    if (!usedUuids.has(uuid)) {
      const imagePath = path.join(workspace, existingImageMap[uuid].path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
  }

  // Save updated image map
  fs.mkdirSync(path.dirname(IMAGES_JSON_PATH), { recursive: true });
  fs.writeFileSync(IMAGES_JSON_PATH, JSON.stringify(updatedImageMap, null, 2), "utf8");
  console.log("Bilder synchronisiert und verlinkt.");
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
