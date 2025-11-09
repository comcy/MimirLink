# 🧭 Implementierungsplan: Markdown-basierte Notiz- & To-Do-App (SilverBullet-ähnlich)

## 🧰 Tech-Stack

| Bereich | Tool / Technik | Begründung |
|----------|----------------|------------|
| UI / Frontend | **SolidJS** + **Vite** + **TailwindCSS** | performant, minimal, reactive |
| Editor | **CodeMirror 6** + Markdown Plugin | flexible Markdown-Syntax, erweiterbar |
| Markdown Rendering | **marked** oder **markdown-it** | schnelles, anpassbares HTML-Rendering |
| Styling | **Tailwind** + optional **ShadCN UI** | modernes, schnelles UI-Design |
| Kalender | **Day.js** + Solid-Kalenderkomponente | simple Datumslogik, kein Overhead |
| Storage | **IndexedDB / FileSystem API** | offline-fähig, persistente Speicherung |
| Git-Sync (später) | **isomorphic-git** | läuft im Browser & Node |
| Parser | **gray-matter** | YAML Frontmatter aus Markdown extrahieren |
| Query Engine (später) | **Lua (via wasm)** oder kleine JS DSL | flexible eingebettete Queries |
| Build & Dev | **Vite** + **ESM** | ultraschneller Build-Prozess |

---

## 🧱 Projektstruktur

```
src/
 ├─ components/
 │   ├─ Editor.jsx
 │   ├─ Calendar.jsx
 │   ├─ PageList.jsx
 │   ├─ FrontmatterBlock.jsx
 │   ├─ CommandPalette.jsx
 │   └─ MarkdownPreview.jsx
 ├─ stores/
 │   ├─ pagesStore.js
 │   ├─ settingsStore.js
 │   └─ syncStore.js
 ├─ utils/
 │   ├─ markdown.js
 │   ├─ wikilinks.js
 │   ├─ frontmatter.js
 │   └─ fsAdapter.js
 ├─ App.jsx
 └─ main.jsx
```

---

## 🧩 Implementierungsschritte

### **Phase 1 – Grundgerüst / Editor**
1. Solid + Vite + Tailwind Setup  
2. CodeMirror Editor + Live Markdown Preview  
3. Reactive `createSignal`-Binding für Inhalt  
4. Markdown-Rendering via `marked`  
5. Trennung Editor / Preview Ansicht  

### **Phase 2 – Dateisystem & Datenhaltung**
1. Local IndexedDB Adapter (`fsAdapter.js`)  
2. CRUD-Operationen: create/update/delete Markdown Pages  
3. `pagesStore.js` → zentrale Verwaltung von Seiten-Metadaten  
4. Speichern des aktuellen Inhalts automatisch bei Änderung  
5. Temporäre Autosaves im Browser  

### **Phase 3 – Kalender & Page-Listen**
1. `Calendar.jsx`: Monats-View mit auswählbarem Tag  
2. Anbindung an `pagesStore` → zeigt Pages, die an diesem Tag erstellt/editiert wurden  
3. `PageList.jsx`: Anzeige “Recently Modified” Pages  
4. Klick → öffnet Page im Editor  

### **Phase 4 – Frontmatter & Tags**
1. Parser mit `gray-matter`  
2. Darstellung von Frontmatter separat (visuell abgesetzt über dem Content)  
3. Tags (`#tag`) automatisch erfassen  
4. Wiki-Links `[[page-name]]` erkennen → Click-Navigation  

### **Phase 5 – Slash Commands & Command Palette**
1. `/task`, `/frontmatter`, `/code` als Insert-Shortcuts  
2. Command Palette (`Ctrl+P`)  
   - Suche nach Pages, Tags, Commands  
   - Keyboard Navigation  
3. Anzeige aller verfügbaren Shortcuts  

### **Phase 6 – Query & Embedding Language**
1. Query-Blocks in Markdown:  
   ```md
   ```query
   from: pages
   where: tag == "todo"
   ```
   ```  
2. Minimaler Query-Interpreter (JS-basiert)  
3. Optional später: Lua / Clojure / DSL (per Wasm Sandbox)  

### **Phase 7 – Offline Sync & Git Integration**
1. `syncStore.js` → Queue von Änderungen  
2. Sync Adapter (`isomorphic-git`)  
3. Sync-Strategie:
   - Offline → local changes in IndexedDB  
   - Online → Commit & Push  
4. Merge & Konflikt-Strategie (simple rebase + user review)  

### **Phase 8 – Polish / Extras**
- Dark / Light Theme  
- Custom Keyboard Shortcuts  
- Graph-Ansicht (via D3 oder Cytoscape)  
- Mobile Layout (responsive)  
- Plugin-System für spätere Erweiterbarkeit  

---

## 🚀 Empfohlene Reihenfolge zum Bauen

| Schritt | Fokus | Ziel |
|----------|--------|------|
| 1 | Editor + Preview | Text eingeben & rendern |
| 2 | File Storage | persistente Seiten |
| 3 | Calendar + PageList | Navigation über Tage |
| 4 | Frontmatter & Tags | Meta-Infos sichtbar machen |
| 5 | Slash Commands | schnell strukturieren |
| 6 | Query Engine | dynamische Seiten |
| 7 | Git Sync | Collaboration & Backup |
| 8 | Graph + Extras | Wissen visuell verbinden |

---

## 📦 Tooling Setup
Einmalige Grundinstallation:
```bash
npm create vite@latest my-notes -- --template solid
cd my-notes
npm install tailwindcss codemirror marked gray-matter dayjs isomorphic-git
npx tailwindcss init -p
```
