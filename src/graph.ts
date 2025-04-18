import * as fs from 'fs';
import * as path from 'path';
import { Graph } from 'graphlib';

// Funktion zum Einlesen von Markdown-Dateien im Verzeichnis
export function getMarkdownFiles(directory: string): string[] {
  return fs.readdirSync(directory).filter(file => file.endsWith('.md'));
}

// Funktion zum Extrahieren von Tags und Links aus einer Markdown-Datei
export function extractTagsAndLinks(filePath: string): { tags: string[], links: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const tags = content.match(/#\w+/g) || [];
  const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
  
  return { 
    tags, 
    links: links.map(link => link.match(/\(([^)]+)\)/)?.[1] || '') 
  };
}

// Funktion zum Erstellen des Graphen
export function createGraph(directory: string): Graph {
  const graph = new Graph();

  const files = getMarkdownFiles(directory);

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const { tags, links } = extractTagsAndLinks(filePath);

    if (!graph.hasNode(file)) {
      graph.setNode(file);
    }

    links.forEach(link => {
      if (files.includes(link)) {
        graph.setEdge(file, link);
      }
    });

    tags.forEach(tag => {
      const tagNode = `${file}#${tag}`;
      if (!graph.hasNode(tagNode)) {
        graph.setNode(tagNode);
      }
      graph.setEdge(file, tagNode);
    });
  });

  return graph;
}
