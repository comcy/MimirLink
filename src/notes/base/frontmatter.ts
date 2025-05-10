/**
 * Erzeugt initiales Frontmatter mit Titel, Typ und Erstellungsdatum
 */
export function generateFrontmatter(title: string, contentType: "journal" | "page"): string {
    const createdAt = new Date().toISOString();
    return `---\ntitle: "${title}"\ncreatedAt: "${createdAt}"\ncontentType: "${contentType}"\nupdatedAt: "${createdAt}"\n---\n\n# ${title}`;
}


/**
 * Aktualisiert oder ergänzt das updatedAt-Feld im Frontmatter
 */
export function updateFrontmatterUpdatedAt(content: string): string {
    const now = new Date().toISOString();

    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
        const frontmatter = match[1];

        if (/updatedAt:/.test(frontmatter)) {
            return content.replace(/(updatedAt:\s*")[^"]*(")/, `$1${now}$2`);
        }

        const newFrontmatter = frontmatter + `\nupdatedAt: "${now}"`;
        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${newFrontmatter}\n---`);
    }

    return `---\nupdatedAt: "${now}"\n---\n\n${content}`;
}
