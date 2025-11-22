import { marked } from "marked";
import DOMPurify from "dompurify";
import { createEffect, onMount } from "solid-js";

type MarkdownPreviewProps = {
  markdown: string;
};

export function MarkdownPreview(props: MarkdownPreviewProps) {
  let container: HTMLDivElement | undefined;

  const updateHtml = () => {
    if (container) {
      const dirtyHtml = marked.parse(props.markdown);
      const cleanHtml = DOMPurify.sanitize(dirtyHtml as string);
      container.innerHTML = cleanHtml;
    }
  };

  onMount(updateHtml);
  createEffect(updateHtml);

  return <div ref={container} class="prose lg:prose-xl p-4" />;
}
