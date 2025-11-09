import { onMount, onCleanup } from "solid-js";
import type { Accessor, Setter } from "solid-js";
import "./editor-styles.css";
import { EditorState } from "@codemirror/state";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import type { DecorationSet, ViewUpdate, Range } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxTree } from "@codemirror/language";
import { languages } from "@codemirror/language-data";

type HybridEditorProps = {
  value: Accessor<string>;
  setValue: Setter<string>;
};

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "•";
    span.className = "cm-bullet";
    return span;
  }
}

class LanguageBadgeWidget extends WidgetType {
  constructor(readonly language: string) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-language-badge";
    span.textContent = this.language;
    return span;
  }
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
          if (node.to >= activeLine.from && node.from <= activeLine.to) {
            return;
          }

          if (node.name === "FencedCode") {
            for (let pos = node.from; pos <= node.to; ) {
              const line = view.state.doc.lineAt(pos);
              builder.push(Decoration.line({ attributes: { class: "cm-code-block" } }).range(line.from));
              pos = line.to + 1;
            }

            const firstMark = node.node.firstChild;
            const lastMark = node.node.lastChild;
            if (firstMark && firstMark.name === "CodeMark") {
              builder.push(Decoration.replace({}).range(firstMark.from, firstMark.to));
              const infoNode = firstMark.nextSibling;
              if (infoNode && infoNode.name === "CodeInfo") {
                const language = view.state.doc.sliceString(infoNode.from, infoNode.to);
                builder.push(Decoration.widget({
                  widget: new LanguageBadgeWidget(language),
                  side: 1
                }).range(firstMark.to));
              }
            }
            if (lastMark && lastMark.name === "CodeMark") {
              builder.push(Decoration.replace({}).range(lastMark.from, lastMark.to));
            }
            return false;
          }

          if (node.name === "Blockquote") {
            for (let pos = node.from; pos <= node.to; ) {
              const line = view.state.doc.lineAt(pos);
              builder.push(Decoration.line({ attributes: { class: "cm-blockquote" } }).range(line.from));
              const quoteMark = syntaxTree(view.state).cursorAt(line.from).node.firstChild;
              if (quoteMark && quoteMark.name === "QuoteMark") {
                builder.push(Decoration.replace({}).range(quoteMark.from, quoteMark.to));
              }
              pos = line.to + 1;
            }
            return false;
          }

          if (node.name.startsWith("ATXHeading")) {
            const mark = node.node.firstChild;
            if (mark && mark.name === "HeaderMark") {
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
            if (firstMark && firstMark.name === "EmphasisMark" && lastMark && lastMark.name === "EmphasisMark") {
              builder.push(Decoration.replace({}).range(firstMark.from, firstMark.to));
              builder.push(Decoration.replace({}).range(lastMark.from, lastMark.to));
              const className = node.name === "StrongEmphasis" ? "cm-strong-emphasis" : "cm-emphasis";
              builder.push(Decoration.mark({ class: className }).range(firstMark.to, lastMark.from));
            }
            return false;
          }
          
          if (node.name === "ListItem") {
            const mark = node.node.firstChild;
            if (mark && mark.name === "ListMark") {
              const markText = view.state.doc.sliceString(mark.from, mark.to);
              if (markText === "-" || markText === "*" || markText === "+") {
                builder.push(Decoration.replace({ widget: new BulletWidget() }).range(mark.from, mark.to));
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


export function HybridEditor(props: HybridEditorProps) {
  let editorRef: HTMLDivElement | undefined;
  let view: EditorView;

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      props.setValue(update.state.doc.toString());
    }
  });

  onMount(() => {
    if (editorRef) {
      const state = EditorState.create({
        doc: props.value(),
        extensions: [
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          updateListener,
          unifiedDecorationPlugin(),
        ],
      });

      view = new EditorView({
        state,
        parent: editorRef,
      });
    }
  });

  onCleanup(() => {
    view?.destroy();
  });

  return <div ref={editorRef} class="h-full w-full" />;
}