import fs from "fs";
import path from "path";
import readline from "readline";

export class FileWriter {

    
    public writeToFile(filePath: string, content: string, scope?: string, dueDate?: string, priority?: string) {
        let fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
        if (!fileContent.startsWith(MAIN_HEADER)) {
            fileContent = `${MAIN_HEADER}\n`;
        }
    
        const priorityIcon = priority ? (PRIORITY_ICONS[priority] || "") + " " : "";
        const todoEntry = `- [ ] ${priorityIcon}${scope ? `[${scope}] ` : ""}${content}` + (dueDate ? ` 📅 ${dueDate}` : "");
        
        const sections = parseFileContent(fileContent);
    
        if (priority) {
            if (!sections.priority.includes(todoEntry)) {
                sections.priority.push(todoEntry);
            }
        }
        if (scope) {
            sections.scoped[scope] = sections.scoped[scope] || [];
            if (!sections.scoped[scope].includes(todoEntry)) {
                sections.scoped[scope].push(todoEntry);
            }
        }
        if (dueDate) {
            if (!sections.planned.includes(todoEntry)) {
                sections.planned.push(todoEntry);
            }
        } else if (!scope && !priority) {
            if (!sections.general.includes(todoEntry)) {
                sections.general.push(todoEntry);
            }
        }
        
        sections.planned.sort(compareDueDates);
        for (const key of Object.keys(sections.scoped)) {
            sections.scoped[key].sort(compareDueDates);
        }
        
        fs.writeFileSync(filePath, generateUpdatedContent(sections), "utf8");

}