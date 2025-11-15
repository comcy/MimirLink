import type { Completion, CompletionResult } from "@codemirror/autocomplete";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { defaultHighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { EditorState, Range, Annotation } from "@codemirror/state";
import { Decoration, EditorView, keymap, lineNumbers, ViewUpdate, WidgetType } from "@codemirror/view";
import dayjs from "dayjs";
import { createEffect, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";
import { store, API_BASE_URL } from "../store";
import "./editor-styles.css";

const loadContentAnnotation = Annotation.define<string>();
const WIKILINK_REGEX = /\[\[(.*?)\]\]/g;
const IMAGE_REGEX = /!\[(.*?)\]\((.*?)\)/g;

interface HybridEditorProps {
  value: Accessor<string>;
  setValue: (value: string) => void;
  onShowDatePicker: (pos: { top: number, left: number }, callback: (date: string) => void) => void;
}

const emojiMap: { [key: string]: string } = {
  smile: '😄',
  laugh: '😆',
  wink: '😉',
  heart: '❤️',
  tada: '🎉',
  warning: '⚠️',
  check: '✅',
  cross: '❌',
  question: '❓',
};

// --- Widgets ---

class ImageWidget extends WidgetType {
  url: string;
  constructor(url: string) {
    super();
    this.url = url;
  }

  toDOM() {
    const img = document.createElement("img");
    img.src = this.url;
    img.className = "cm-image";
    return img;
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "•";
    span.className = "cm-bullet";
    return span;
  }
}

class LanguageBadgeWidget extends WidgetType {
  readonly language: string;
  constructor(language: string) {
    super();
    this.language = language;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-language-badge";
    span.textContent = this.language;
    return span;
  }
}

class CheckboxWidget extends WidgetType {
  readonly checked: boolean;
  readonly pos: number;
  constructor(checked: boolean, pos: number) {
    super();
    this.checked = checked;
    this.pos = pos;
  }

  toDOM(view: EditorView) {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.className = "cm-task-checkbox";
    checkbox.addEventListener("click", (event) => {
      const newText = this.checked ? "[ ]" : "[x]";
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: newText }
      });
      event.preventDefault();
    });
    return checkbox;
  }
}

class IconWidget extends WidgetType {
  readonly text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  toDOM() {
    const span = document.createElement("span");
    span.textContent = this.text;
    return span;
  }
}

// --- Plugins ---

function imagePlugin() {
  return EditorView.decorations.of((view) => {
    const builder: Range<Decoration>[] = [];
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      for (const match of text.matchAll(IMAGE_REGEX)) {
        const start = from + match.index!;
        const end = start + match[0].length;
        const url = match[2];
        if (url.startsWith('assets/')) {
          builder.push(
            Decoration.replace({
              widget: new ImageWidget(`${API_BASE_URL.replace('/api', '')}/${url}`),
            }).range(start, end)
          );
        }
      }
    }
    return Decoration.set(builder);
  });
}

function wikiLinkPlugin() {
  return EditorView.decorations.of((view) => {
    const builder: Range<Decoration>[] = [];
    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      for (const match of text.matchAll(WIKILINK_REGEX)) {
        const start = from + match.index!;
        const end = start + match[0].length;
        const pageName = match[1];

        builder.push(
          Decoration.mark({
            class: "cm-wikilink",
            attributes: { "data-wikilink-name": pageName },
          }).range(start, end)
        );
      }
    }
    return Decoration.set(builder);
  });
}

function unifiedDecorationPlugin() {
  return EditorView.decorations.of((view) => {
    const builder: Range<Decoration>[] = [];
    const cursor = view.state.selection.main.head;
    const activeLine = view.state.doc.lineAt(cursor);

    builder.push(Decoration.line({ class: "cm-active-line" }).range(activeLine.from));

    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          // Don't apply special styling to the active line, but ALWAYS style Frontmatter
          if (node.name !== "Frontmatter" && node.to >= activeLine.from && node.from <= activeLine.to) {
            return;
          }

          const isSameLine = (from: number, to: number) => view.state.doc.lineAt(from).number === view.state.doc.lineAt(to).number;

          if (node.name === "Task") {
            const taskMarker = node.node.firstChild;
            if (taskMarker && taskMarker.name === "TaskMarker" && isSameLine(taskMarker.from, taskMarker.to)) {
              const checked = view.state.doc.sliceString(taskMarker.from, taskMarker.to) === "[x]";
              builder.push(Decoration.replace({
                widget: new CheckboxWidget(checked, taskMarker.from),
              }).range(taskMarker.from, taskMarker.to));
            }
            return false;
          }

          if (node.name === "FencedCode") {
            let isFirstLine = true;
            for (let pos = node.from; pos <= node.to;) {
              const line = view.state.doc.lineAt(pos);
              const lineClass = isFirstLine ? "cm-code-block cm-code-block-first-line" : "cm-code-block";
              builder.push(Decoration.line({ attributes: { class: lineClass } }).range(line.from));
              isFirstLine = false;
              pos = line.to + 1;
            }

            const firstMark = node.node.firstChild;
            const lastMark = node.node.lastChild;
            if (firstMark && firstMark.name === "CodeMark" && isSameLine(firstMark.from, firstMark.to)) {
              builder.push(Decoration.replace({}).range(firstMark.from, firstMark.to));

              const infoNode = firstMark.nextSibling;
              if (infoNode && infoNode.name === "CodeInfo" && isSameLine(infoNode.from, infoNode.to)) {
                const language = view.state.doc.sliceString(infoNode.from, infoNode.to);
                builder.push(Decoration.replace({
                  widget: new LanguageBadgeWidget(language),
                }).range(infoNode.from, infoNode.to));
              }
            }
            if (lastMark && lastMark.name === "CodeMark" && isSameLine(lastMark.from, lastMark.to)) {
              builder.push(Decoration.replace({}).range(lastMark.from, lastMark.to));
            }
            return false;
          }

          if (node.name === "Blockquote") {
            for (let pos = node.from; pos <= node.to;) {
              const line = view.state.doc.lineAt(pos);
              builder.push(Decoration.line({ attributes: { class: "cm-blockquote" } }).range(line.from));

              syntaxTree(view.state).iterate({
                from: line.from,
                to: line.to,
                enter: (innerNode) => {
                  if (innerNode.name === "QuoteMark" && isSameLine(innerNode.from, innerNode.to)) {
                    builder.push(Decoration.replace({}).range(innerNode.from, innerNode.to));
                  }
                }
              });

              pos = line.to + 1;
            }
            return false;
          }

          if (node.name === "Frontmatter") {
            const firstMark = node.node.firstChild;
            const lastMark = node.node.lastChild;
            if (firstMark && firstMark.name === "DashLine" && lastMark && lastMark.name === "DashLine") {
              // Apply badge to the first dash line
              const firstLine = view.state.doc.lineAt(firstMark.from);
              builder.push(Decoration.line({
                attributes: {
                  class: "cm-frontmatter-first-line",
                  "data-frontmatter-badge": "frontmatter"
                }
              }).range(firstLine.from));

              // Apply style to the entire block
              builder.push(Decoration.mark({ class: "cm-frontmatter" }).range(node.from, node.to));
            }
            return false;
          }

          if (node.name.startsWith("ATXHeading")) {
            const mark = node.node.firstChild;
            if (mark && mark.name === "HeaderMark" && isSameLine(mark.from, mark.to)) {
              builder.push(Decoration.replace({}).range(mark.from, mark.to));
              builder.push(
                Decoration.mark({
                  class: `cm-heading-${node.name.replace("ATXHeading", "")}`,
                }).range(mark.to, node.to)
              );
            }
            return false;
          }

          if (node.name === "StrongEmphasis" || node.name === "Emphasis") {
            const firstMark = node.node.firstChild;
            const lastMark = node.node.lastChild;
            if (firstMark && firstMark.name === "EmphasisMark" && lastMark && lastMark.name === "EmphasisMark" && isSameLine(firstMark.from, firstMark.to) && isSameLine(lastMark.from, lastMark.to)) {
              builder.push(Decoration.replace({}).range(firstMark.from, firstMark.to));
              builder.push(Decoration.replace({}).range(lastMark.from, lastMark.to));
              const className = node.name === "StrongEmphasis" ? "cm-strong-emphasis" : "cm-emphasis";
              builder.push(Decoration.mark({ class: className }).range(firstMark.to, lastMark.from));
            }
            return false;
          }

          if (node.name === "InlineCode") {
            const firstMark = node.node.firstChild;
            const lastMark = node.node.lastChild;
            if (firstMark && firstMark.name === "CodeMark" && lastMark && lastMark.name === "CodeMark" && isSameLine(firstMark.from, firstMark.to) && isSameLine(lastMark.from, lastMark.to)) {
              builder.push(Decoration.replace({}).range(firstMark.from, firstMark.to));
              builder.push(Decoration.replace({}).range(lastMark.from, lastMark.to));
              builder.push(Decoration.mark({ class: "cm-inline-code" }).range(firstMark.to, lastMark.from));
            }
            return false;
          }

          if (node.name === "ListItem") {
            let hasTaskChild = false;
            let child = node.node.firstChild;
            while (child) {
              if (child.name === "Task") {
                hasTaskChild = true;
                break;
              }
              child = child.nextSibling;
            }

            const mark = node.node.firstChild;
            if (mark && mark.name === "ListMark" && isSameLine(mark.from, mark.to)) {
              if (hasTaskChild) {
                builder.push(Decoration.replace({}).range(mark.from, mark.to));
              } else {
                const markText = view.state.doc.sliceString(mark.from, mark.to);
                if (markText === "-" || markText === "*" || markText === "+") {
                  builder.push(Decoration.replace({ widget: new BulletWidget() }).range(mark.from, mark.to));
                }
              }
            }
          }
        },
      });
    }

    try {
      return Decoration.set(builder.sort((a, b) => a.from - b.from));
    } catch (e) {
      console.error("Failed to build decorations", e);
      return Decoration.none;
    }
  });
}

function iconEmojiPlugin() {
  return EditorView.decorations.of((view) => {
    const builder: Range<Decoration>[] = [];
    const cursor = view.state.selection.main.head;

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);

      for (const match of text.matchAll(/:([a-z_]+):/g)) {
        const start = from + match.index!;
        const end = start + match[0].length;
        const word = match[1];
        if (view.state.doc.lineAt(start).number !== view.state.doc.lineAt(end).number) continue;

        if (cursor >= start && cursor <= end) continue;

        if (emojiMap[word]) {
          builder.push(Decoration.replace({
            widget: new IconWidget(emojiMap[word]),
          }).range(start, end));
        }
      }

      for (const match of text.matchAll(/(\(!\)|\(\/\)|\(x\)|\(\?\))/g)) {
        const start = from + match.index!;
        const end = start + match[0].length;
        const iconText = match[1];
        if (view.state.doc.lineAt(start).number !== view.state.doc.lineAt(end).number) continue;

        if (cursor >= start && cursor <= end) continue;

        if (iconText === '(!)') {
          builder.push(Decoration.replace({
            widget: new IconWidget(emojiMap['warning']),
          }).range(start, end));
        } else if (iconText === '(/)') {
          builder.push(Decoration.replace({
            widget: new IconWidget(emojiMap['check']),
          }).range(start, end));
        } else if (iconText === '(x)') {
          builder.push(Decoration.replace({
            widget: new IconWidget(emojiMap['cross']),
          }).range(start, end));
        } else if (iconText === '(?)') {
          builder.push(Decoration.replace({
            widget: new IconWidget(emojiMap['question']),
          }).range(start, end));
        }
      }
    }

    return Decoration.set(builder.sort((a, b) => a.from - b.from));
  });
}

const slashCommands = (context: CompletionContext): CompletionResult | null => {
  let word = context.matchBefore(/\/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const options: Completion[] = [
    {
      label: "/today",
      apply: (view, _completion, from, to) => {
        const today = dayjs().format('YYYY-MM-DD');
        view.dispatch({
          changes: { from, to, insert: `[[${today}]]` }
        });
      },
      type: "text",
      detail: "Insert today's date as a wiki link",
    },
    {
      label: "/task",
      apply: (view, _completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert: "- [ ] " }
        });
      },
      type: "text",
      detail: "Insert a task list item",
    },
    {
      label: "/frontmatter",
      apply: (view, _completion, from, to) => {
        const frontmatter = `---
title: 
date: ${dayjs().format('YYYY-MM-DD')}
tags: 
---
`;
        view.dispatch({
          changes: { from, to, insert: frontmatter }
        });
      },
      type: "text",
      detail: "Insert a YAML frontmatter block",
    },
  ];

  return {
    from: word.from,
    options: options.filter(option => option.label.startsWith(word!.text)),
    validFor: /^\w*$/,
  };
};

function datePickerPlugin(onShowDatePicker: (pos: { top: number, left: number }, callback: (date: string) => void) => void) {
  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!update.docChanged) return;

    const { state, dispatch } = update.view;
    const cursor = state.selection.main.head;
    const textBefore = state.doc.sliceString(Math.max(0, cursor - 2), cursor);

    if (textBefore === '//') {
      const coords = update.view.coordsAtPos(cursor);
      if (coords) {
        const callback = (date: string) => {
          dispatch({
            changes: { from: cursor - 2, to: cursor, insert: date }
          });
        };
        onShowDatePicker({ top: coords.bottom, left: coords.left }, callback);
      }
    }
  });
}

// --- Main Component ---

export function HybridEditor(props: HybridEditorProps) {
  let editorRef: HTMLDivElement | undefined;
  let view: EditorView;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      // Don't call setValue if the change is from loading content
      if (!update.transactions.some(tr => tr.annotation(loadContentAnnotation))) {
        props.setValue(update.state.doc.toString());
      }
    }
  });

  onMount(() => {
    if (editorRef) {
      const state = EditorState.create({
        doc: props.value(),
        extensions: [
          keymap.of([
            indentWithTab,
            {
              key: "Mod-s",
              run: () => {
                store.saveCurrentNote();
                return true;
              },
              preventDefault: true,
            }
          ]),
          yamlFrontmatter({
            content: markdown({
              base: markdownLanguage,
              codeLanguages: languages,
            })
          }),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          lineNumbers(),
          EditorView.lineWrapping,
          updateListener,
          unifiedDecorationPlugin(),
          iconEmojiPlugin(),
          wikiLinkPlugin(), // Moved to after other decoration plugins
          imagePlugin(),
          autocompletion({ override: [slashCommands] }),
          datePickerPlugin(props.onShowDatePicker),
          EditorView.domEventHandlers({
            paste: (event, view) => {
              event.preventDefault(); // Always prevent default paste behavior
              
              navigator.clipboard.read().then(items => {
                for (const item of items) {
                  if (item.types.some(type => type.startsWith('image/'))) {
                    const imageType = item.types.find(type => type.startsWith('image/'))!;
                    item.getType(imageType).then(blob => {
                      const file = new File([blob], "pasted-image.png", { type: imageType });
                      console.log('Pasted file object from new API:', file);

                      const formData = new FormData();
                      formData.append('image', file);

                      fetch(`${API_BASE_URL}/files/upload`, {
                        method: 'POST',
                        body: formData,
                      })
                        .then(response => response.json())
                        .then(data => {
                          if (data.path) {
                            const markdown = `![pasted image](${data.path})`;
                            view.dispatch({
                              changes: { from: view.state.selection.main.head, insert: markdown }
                            });
                          }
                        })
                        .catch(error => {
                          console.error('Error uploading image:', error);
                        });
                    });
                    return; // Handle first image found
                  }
                }
              }).catch(err => {
                console.error('Failed to read clipboard contents: ', err);
                // Fallback or error message can be added here
              });
            },
            mousedown: (event, view) => {
              const target = event.target as HTMLElement;
              const linkElement = target.closest('.cm-wikilink');
              
              if (linkElement) {
                const wikilinkName = linkElement.getAttribute('data-wikilink-name');
                if (wikilinkName) {
                  event.preventDefault();
                  store.openWikiLink(wikilinkName);
                  return;
                }
              }

              const pos = view.posAtCoords(event, false);
              if (pos === null || pos < 0) {
                // If the click is outside the text area, check if it's in the scroll area
                const target = event.target as HTMLElement;
                if (target.classList.contains('cm-scroller') || target.classList.contains('cm-content')) {
                  // Move cursor to the end of the document
                  view.dispatch({
                    selection: { anchor: view.state.doc.length },
                    scrollIntoView: true,
                  });
                  // Focus the editor
                  view.focus();
                  // Prevent default behavior which might cause loss of focus
                  event.preventDefault();
                }
              }
            },
          }),
        ],
      });

      view = new EditorView({
        state,
        parent: editorRef,
      });
    }
  });

  createEffect(() => {
    const newValue = props.value();
    if (view && newValue !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newValue },
        annotations: loadContentAnnotation.of('load')
      });
    }
  });

  onCleanup(() => {
    view?.destroy();
  });

  return <div ref={editorRef} class="h-full w-full" />;
}