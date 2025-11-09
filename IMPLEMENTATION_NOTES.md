# Mimirlink Editor: Implementation Notes

This document summarizes the current state of the Markdown editor implementation, its core concepts, and potential next steps.

## 1. Project Goal

The primary goal is to create a hybrid WYSIWYG (What You See Is What You Get) Markdown editor using **SolidJS** and **CodeMirror 6**. The editor should render Markdown syntax as styled text when the user's cursor is not on the element, and show the raw Markdown source when the cursor is active on that line.

## 2. Current Status

The editor is functional and provides a hybrid preview for the following Markdown elements:

-   **Headings** (H1-H6)
-   **Bold** (`**text**`)
-   **Italic** (`*text*`)
-   **Blockquotes** (`> text`)
-   **Unordered Lists** (`-`, `*`, `+`)
-   **Ordered Lists** (e.g., `1.`)
-   **Fenced Code Blocks** (```` ``` ````) with language badge

The editor also implements a feature where the active line is displayed in a monospace font for a clear editing focus.

## 3. Core Implementation (`src/frontend/src/components/HybridEditor.tsx`)

The entire logic is encapsulated within the `HybridEditor.tsx` component. The core of the functionality is the `unifiedDecorationPlugin`.

### `unifiedDecorationPlugin`

This is a CodeMirror `ViewPlugin` created via `EditorView.decorations.of()`. It is responsible for analyzing the document and applying all visual styling and replacements.

**Key Strategies:**

1.  **Unified Plugin**: All decorations, including the active line highlight and the Markdown styling, are handled in this single plugin. This prevents conflicts between different plugins trying to decorate the same parts of the document, which was the source of many "Ranges must be added sorted" errors.

2.  **Active Line Separation**: The plugin first decorates the active line with a `cm-active-line` class. It then explicitly skips processing any other Markdown syntax on that line. This ensures that the active line always shows the raw, undecorated source text.

3.  **Block-Level Decoration (Line-by-Line)**: For block elements that can span multiple lines (like `Blockquote` and `FencedCode`), the plugin iterates through each line of the block and applies a `Decoration.line` with a specific class. This has proven to be more robust than applying a single `Decoration.mark` to the entire block, as it avoids sorting errors with child decorations.

4.  **Inline-Level Decoration (Non-Overlapping Ranges)**: For inline elements (`StrongEmphasis`, `Emphasis`), the logic is carefully structured to create non-overlapping ranges. It creates:
    -   A `Decoration.replace` for the opening and closing marks (e.g., `**`).
    -   A `Decoration.mark` for the content *between* the marks.
    This prevents conflicts where multiple decorations start at the same position.

5.  **Custom Widgets (`WidgetType`)**: For elements that require replacing syntax with a custom rendered element, `WidgetType` is used.
    -   `BulletWidget`: Replaces unordered list markers (`-`, `*`) with a `•` character.
    -   `LanguageBadgeWidget`: Inserts a `<span>` containing the language name at the beginning of a fenced code block.

## 4. Styling (`src/frontend/src/components/editor-styles.css`)

All custom styling for the editor is done in `editor-styles.css`. It contains `cm-` prefixed classes that correspond to the decorations applied by the plugin.

-   `.cm-heading-*`: Styles for H1-H6.
-   `.cm-blockquote`: Styles for blockquotes (border, background).
-   `.cm-code-block`: Styles for code blocks (background, font).
-   `.cm-language-badge`: Positions and styles the language name in the top-right corner of the code block.
-   `.cm-active-line`: Applies a monospace font to the currently active line.

## 5. Next Steps & Improvements

-   **Handle More Elements**: The current implementation does not handle:
    -   Links (`[text](url)`)
    -   Images (`![alt](url)`)
    -   Tables
    -   Horizontal Rules (`---`)
-   **Refine Parsing**: The logic for finding child nodes (e.g., `firstChild`, `nextSibling`) can be brittle if the Markdown grammar changes. A more robust method would be to use the `cursor()` method on a `SyntaxNode` to iterate its children.
-   **Styling Polish**: The current styling is functional but could be refined for a better aesthetic.
-   **Continue `IDEA.md`**: This editor is the first step. The next phases from `IDEA.md` (file storage, calendar view, etc.) can now be built on top of this functional editor component.
