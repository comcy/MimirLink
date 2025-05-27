import fs from 'fs';
import path from 'path';
import { loadConfig } from '../configuration/config';

const config = loadConfig();
const workspace = config.workspace;

// const outputDir = path.join(workspace, "public");
const templatePath = path.join(workspace, ".ygg", "templates", "timeline.html");
// const stylePath = path.join(workspace, ".ygg", "styles", "style.css");

export function generateTimelinePage() {

//   const templatePath = path.join(__dirname, '../../templates/timeline.html');
  const eventsPath = path.join(workspace, '.ygg/events.json');
  const outputDir = path.join(workspace, 'timeline');
  const outputPath = path.join(outputDir, 'index.html');

  // Lade Template & Events
  const template = fs.readFileSync(templatePath, 'utf-8');
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));

  // Ersetze Platzhalter
  const html = template.replace('__EVENTS__', JSON.stringify(events, null, 2));

  // Schreibe Datei in Arbeitsverzeichnis
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`✔ Timeline HTML generiert unter: ${outputPath}`);
}
