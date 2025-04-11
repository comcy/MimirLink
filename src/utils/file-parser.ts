import fs from "fs";
import path from "path";
import readline from "readline";

export class FileParser {

    parseFileContent(content: string): FileContent<T> {
        const sections = {
            general: [] as string[],
            planned: [] as string[],
            scoped: {} as Record<string, string[]>,
            priority: [] as string[],
            done: [] as string[],
        };
    
        let currentSection = "";
        let currentScope = "";
        for (const line of content.split("\n")) {
            if (line.startsWith("## ")) {
                currentSection = line;
                currentScope = "";
                continue;
            }
            if (currentSection === SCOPED_HEADER.trim() && line.startsWith("### ")) {
                currentScope = line.substring(4).trim();
                sections.scoped[currentScope] = sections.scoped[currentScope] || [];
                continue;
            }
            if (line.startsWith("- [ ] ")) {
                if (currentSection === PLANNED_HEADER.trim()) {
                    sections.planned.push(line);
                } else if (currentSection === SCOPED_HEADER.trim() && currentScope) {
                    sections.scoped[currentScope].push(line);
                } else if (currentSection === PRIORITY_HEADER.trim()) {
                    sections.priority.push(line);
                } else {
                    sections.general.push(line);
                }
            } else if (line.startsWith("- [x] ")) {
                sections.done.push(line);
            }
        }
        return sections;
    }
    

}