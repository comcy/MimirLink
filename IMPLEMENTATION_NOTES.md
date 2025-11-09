# Mimirlink Editor: Implementation Notes

This document summarizes the current state of the Markdown editor implementation, its core concepts, and potential next steps.

## 1. Project Goal

The primary goal is to create a feature-rich, hybrid WYSIWYG (What You See Is What You Get) Markdown editor using **SolidJS** and **CodeMirror 6**. The editor should render Markdown syntax as styled text when the user's cursor is not on the element, and show the raw Markdown source when the cursor is active on that line.

## 2. Current Status

The application now features a two-panel layout: a left-side menu and a main editor area.

### Editor Features
The editor is functional and provides a hybrid preview for the following Markdown elements:

-   **Headings** (H1-H6)
-   **Bold** (`**text**`)
-   **Italic** (`*text*`)
-   **Inline Code** (` `code` `)
-   **Blockquotes** (`> text`)
-   **Unordered Lists** (`-`, `*`, `+`)
-   **Ordered Lists** (e.g., `1.`)
-   **Fenced Code Blocks** (```` ``` ````) with language badge and syntax highlighting.
-   **Emoji & Icons**: Renders `:word:` style emoji and Confluence-style icons like `(!)` and `(/)`.
-   **Frontmatter**: YAML frontmatter blocks are now correctly parsed and displayed with a distinct visual frame.
-   **Task Checkboxes**: Markdown task list items (`- [ ] `) are rendered as clickable checkboxes.

**General editor enhancements include:**
-   **Line Numbers**: Displayed in the gutter.
-   **Full Viewport Height**: The editor and side panel fill the entire screen.
-   **Code Ligatures**: Enabled for "Fira Code" font in code blocks and the active line, as well as all other rendered Markdown text.
-   **Insert Shortcuts**: Slash commands (`/today`, `/task`, `/frontmatter`) are available for quick content insertion.

### Side Panel
-   **Calendar**: A functional monthly calendar view has been added at the top of the side panel. It shows the current month and allows navigation. The current day is highlighted.
-   **File List**: A placeholder for a future file list component is present below the calendar.

## 3. Core Implementation

### Main Layout (`App.tsx`)
The main application layout is now a `flex` container, dividing the screen between a fixed-width side panel (`w-80`) and the main editor area (`flex-grow`).

### Hybrid Editor (`src/frontend/src/components/HybridEditor.tsx`)
The core logic is encapsulated in the `HybridEditor.tsx` component. It uses two separate `ViewPlugin`s for different concerns.

#### `unifiedDecorationPlugin`
This plugin, created via `EditorView.decorations.of()`, handles all Markdown-related styling and replacements by parsing the syntax tree.

**Key Strategies:**
1.  **Active Line Separation**: The plugin first decorates the active line with a `cm-active-line` class (which applies a monospace font). It then explicitly skips processing any other Markdown syntax on that line to ensure the raw source is always shown.
2.  **Block-Level Decoration (Line-by-Line)**: For block elements like `Blockquote` and `FencedCode`, the plugin iterates through each line of the block and applies a `Decoration.line` with a specific class. This is a robust method that avoids the "Ranges must be added sorted" error.
3.  **Inline-Level Decoration (Non-Overlapping Ranges)**: For inline elements (`StrongEmphasis`, `Emphasis`, `InlineCode`, `Frontmatter`), the logic creates non-overlapping ranges by creating a `replace` decoration for the opening/closing marks and a `mark` decoration for the content *between* the marks.
4.  **Custom Widgets (`WidgetType`)**: `WidgetType` is used to render custom elements like the `•` for unordered lists (`BulletWidget`) and the language name for code blocks (`LanguageBadgeWidget`).

#### `iconEmojiPlugin`
This is a second `ViewPlugin` that operates independently of the Markdown syntax tree. It uses regular expressions (`matchAll`) to find and replace `:word:` emoji codes and `(!)` / `(/)` icon shortcuts. It uses a simple `IconWidget` to render the corresponding emoji or icon character.

### Calendar (`src/frontend/src/components/Calendar.tsx`)
A simple, self-contained calendar component built with SolidJS and `dayjs` for date logic. It displays a monthly grid and supports navigation between months.

## 4. Styling (`src/frontend/src/components/editor-styles.css`)

All custom styling for the editor is done in `editor-styles.css`. 
-   The base editor font is now **"Fira Code"** to support ligatures throughout the text.
-   `.cm-heading-*`, `.cm-blockquote`, `.cm-code-block`, etc. provide styling for the rendered Markdown.
-   `.cm-language-badge` positions and styles the language name in the top-right corner of the code block.
-   `.cm-active-line` applies a monospace font to the currently active line.
-   `.cm-gutters` has a `min-width` to pre-allocate space for line numbers.
-   `.cm-frontmatter` provides a distinct visual frame for frontmatter blocks.
-   `.cm-task-checkbox` styles the clickable checkboxes for task list items.

## 5. Next Steps & Improvements

-   **Handle More Elements**: The current implementation does not handle:
    -   Links (`[text](url)`)
    -   Images (`![alt](url)`)
    -   Tables
    -   Horizontal Rules (`---`)
-   **File List**: Implement the file list functionality in the `FileList.tsx` component.
-   **Calendar Interaction**: Add logic to the calendar to show or filter notes based on the selected date.
-   **Plugin Performance**: The regex-based `iconEmojiPlugin` could be slow on large files. It could be optimized or integrated into the main syntax tree parser for better performance.
-   **Continue `IDEA.md`**: This editor is a solid foundation. The next phases from `IDEA.md` (file storage, query engine, etc.) can now be built out.
