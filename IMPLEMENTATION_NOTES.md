# Mimirlink: Implementation Notes

This document summarizes the current state of the Mimirlink application, its core concepts, and potential next steps. It covers both the backend services and the frontend editor.

## 1. High-Level Architecture

Mimirlink is a **local-first, full-stack note-taking application** built on a client-server model.

-   **Backend**: A **Node.js/Express.js** server responsible for all file system interactions, metadata management, and providing a REST API. It acts as a smart file management service.
-   **Frontend**: A **SolidJS** single-page application (SPA) that provides the user interface, including a sophisticated hybrid Markdown editor built with **CodeMirror 6**.

The two components are decoupled. The backend runs as a separate process, and the frontend communicates with it via HTTP requests. This architecture allows for a rich, responsive user experience while keeping all data stored locally in Markdown files.

## 2. Backend (`src/backend`)

The backend's primary responsibility is to manage a directory of notes. It avoids reading and parsing Markdown files on every request by maintaining a metadata cache.

### Core Concepts

#### Metadata Cache (`.mimirlink` directory)
On startup and after any file modification, the backend builds a cache of metadata inside a `.mimirlink` directory within the user's notes folder. This is the key to the application's performance. The cache includes:
-   `pages.json` & `journals.json`: Lists of all page and journal notes, including their frontmatter data.
-   `referenceIndex.json`: A map of all `[[wiki-links]]` and where they are referenced (backlinks).
-   `tasks.json` & `done.json`: A collection of all open and completed tasks (`- [ ]`, `- [x]`) found in the notes.
-   `tags.json`: An index of all tags (e.g., `#tag`) and the files they appear in.

This cache is the "single source of truth" for the frontend.

### REST API (`src/backend/server.ts`)
The backend exposes a REST API to the frontend. The main routes are:
-   **Files API (`/api/files`)**: Handles all CRUD (Create, Read, Update, Delete) operations for notes. It also manages:
    -   File uploads (e.g., images).
    -   Automatic creation of new notes when a `[[wiki-link]]` to a non-existent file is created.
    -   Updating the metadata cache after any changes.
-   **References API (`/api/references`)**: Provides access to the backlink data from `referenceIndex.json`.
-   **Todos API (`/api/todos`)**: Provides access to the task data from `tasks.json` and `done.json`.

### Command-Line Interface (CLI) (`src/backend/cli/cli.ts`)
The backend also includes a CLI for utility and maintenance tasks, such as:
-   `sync`: Manually triggers a full synchronization of the metadata cache.
-   `note`: Creates new notes.
-   `build`: Runs a static-site generator to export notes as a simple website.

## 3. Frontend (`src/frontend`)

The frontend is a SolidJS application designed for a fluid and productive user experience.

### UI & Theming
-   **Layout**: The UI is structured with a top menu bar, a left-side panel (for navigation and context), and a main editor area.
-   **Theme Switcher**: A theme switcher in the menu bar toggles between light and dark modes. Custom styles for both themes are implemented, ensuring readability across all components, including the CodeMirror editor.
-   **Side Panel**:
    -   **Calendar**: A functional monthly calendar view.
    -   **File List**: A component to display and navigate the file list fetched from the backend.

### Core Components

#### Hybrid Editor (`src/frontend/src/components/HybridEditor.tsx`)
This is the application's centerpiece. It uses **CodeMirror 6** to provide a hybrid WYSIWYG experience, rendering Markdown as styled text when the cursor is not on the element.

**Key Features & Implementation:**
-   **Hybrid Preview**: Supports headings, bold, italic, inline code, blockquotes, lists, tables, and fenced code blocks. Markdown control characters (like `**`, `|`) are hidden for a clean, WYSIWYG-like appearance.
-   **Parser Logic**: The `unifiedDecorationPlugin` iterates through the syntax tree provided by the Markdown parser. It correctly handles nested contexts (e.g., bold inside blockquotes) by allowing the iterator to descend into block-level elements.
-   **Active Line Logic**: The plugin explicitly styles the active line to show raw Markdown source and skips all other "live preview" processing on that line to allow for easy editing.
-   **Custom Widgets**: Uses `WidgetType` to render custom elements like list bullets and language badges for code blocks.
-   **Special Syntax**:
    -   Renders `:word:` style emoji and Confluence-style icons like `(!)`.
    -   Displays YAML frontmatter in a distinct visual frame.
    *   Renders Markdown task list items (`- [ ] `) as clickable checkboxes.
-   **Shortcuts & Commands**:
    -   `/slash` commands support quick insertion of elements like tasks and frontmatter.
    -   `Mod-d` (`Ctrl+d` or `Cmd+d`) is implemented to duplicate the current line.
    -   A `//` shortcut opens a floating date picker to insert dates in `[[YYYY-MM-DD]]` format.

#### State Management (`src/frontend/src/store.ts`)
Global state management is likely handled here, managing application-wide state such as the current file, file lists, search results, etc. (Note: This file was not fully analyzed and needs verification).

#### Main Application (`src/frontend/src/App.tsx`)
This is the root component that assembles the main layout, orchestrates UI components, and likely handles fetching initial data from the backend API. (Note: This file was not fully analyzed and needs verification).

## 4. Styling (`src/frontend/src/components/editor-styles.css` & `index.css`)

-   **`index.css`**: Contains base CSS variables for light and dark themes.
-   **`editor-styles.css`**: Contains all custom styling for the CodeMirror editor, using "Fira Code" for ligature support.

## 5. Next Steps & Improvements

-   **Connect Frontend to Backend**:
    -   Implement the file list functionality in `FileList.tsx` by fetching data from the `/api/files` endpoint.
    -   Wire up the calendar to interact with notes (e.g., clicking a date opens the corresponding journal note).
    -   Load and save files using the backend API instead of local placeholders.
-   **Editor Enhancements**:
    -   Implement rendering for Links (`[text](url)`) and Horizontal Rules (`---`).
-   **Performance**:
    -   The regex-based `iconEmojiPlugin` could be slow on large files. It could be optimized by integrating it into the main syntax tree parser.
-   **Build on Foundation**: With the backend and editor foundation in place, work can continue on the more advanced features outlined in `IDEA.md`, such as the query engine and advanced search.

## 6. Table Rendering in Hybrid Editor

A significant effort was made to implement live preview rendering for Markdown tables directly within the CodeMirror 6 editor. This was a complex task due to the interaction between the Markdown parser and CodeMirror's decoration API.

### Final Approach

The final, successful implementation uses a combination of a correctly configured parser, a Flexbox-based CSS layout, and a careful application of CodeMirror `Decoration` objects.

1.  **Parser Configuration:** The root cause of many initial problems was an incorrect parser setup. The final configuration in `HybridEditor.tsx` correctly uses `@codemirror/lang-markdown` as the base language, with `GFM` (from `@lezer/markdown`) and `yamlFrontmatter` as extensions. This ensures that the parser correctly identifies table structures in the document and produces the right syntax tree.

2.  **Decoration Logic (`unifiedDecorationPlugin`):** The plugin iterates through the syntax tree and applies decorations to style the table:
    *   **Hiding Delimiters:** All Markdown delimiters (`|` characters between cells and the `|---|` separator line) are hidden using `Decoration.replace({})`. This was a primary source of rendering errors. The `Ranges must be added sorted` error was resolved by carefully using `startSide` properties on adjacent decorations to tell CodeMirror their intended rendering order.
    *   **Applying Classes:** `Decoration.line` is used to apply `.cm-table-row` or `.cm-table-header` classes to the `div` for each line. `Decoration.mark` is used to wrap cell content (`TableCell` nodes), including their padding spaces, in spans with `.cm-table-cell` or `.cm-table-header-cell` classes.

3.  **CSS Layout (`editor-styles.css`):** The `display: table` model proved incompatible with CodeMirror's DOM structure. The final solution uses a Flexbox model:
    *   Each table row (`.cm-table-row`, `.cm-table-header`) is a `display: flex` container.
    *   Each cell (`.cm-table-cell`, `.cm-table-header-cell`) is a `flex: 1` item, allowing columns to share space.
    *   Borders, padding, and horizontal margins are applied directly to the line and cell elements to create a clear, grid-like appearance for the entire table block.

4.  **Style Overrides:** Specific and aggressive CSS overrides were necessary to prevent CodeMirror's `defaultHighlightStyle` from applying unwanted `text-decoration: underline` and `font-weight: bold` to text and spaces within the table header. This was achieved by targeting any `span` within a header cell (`.cm-table-header-cell *`) and forcing the desired `font-weight` and `text-decoration`.