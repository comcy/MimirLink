export function generateFrontmatter(title: string, contentType: "journal" | "page") {
    const createdAt = new Date().toISOString();
    return `---\ntitle: "${title}"\ncreatedAt: "${createdAt}"\ncontentType: "${contentType}"\n---\n\n`;
}
