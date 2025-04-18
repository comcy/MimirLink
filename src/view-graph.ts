import express, { Express } from "express";
import * as path from 'path';
import { createGraph } from './graph';
import * as cytoscape from 'cytoscape';
import { loadConfig } from "./config";

// Erstelle den Express Webserver
const app: Express = express();
const port = 3000;

const config = loadConfig()


// Stelle die Markdown-Dateien bereit (aus dem "markdown"-Ordner)
const markdownDirectory = path.join(config.wrkdyPath + '/pages');
const graph = createGraph(markdownDirectory);

// Erstelle den Graphen für Cytoscape
const elements: any[] = [];
graph.nodes().forEach(node => {
  elements.push({ data: { id: node } });
});
graph.edges().forEach(edge => {
  elements.push({
    data: { source: edge.v, target: edge.w }
  });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Route für die Anzeige des Graphen
app.get('/', (req, res) => {
  res.render('index', { elements: JSON.stringify(elements) });
});

// Server starten
app.listen(port, () => {
  console.log(`Server läuft auf http://localhost:${port}`);
});
