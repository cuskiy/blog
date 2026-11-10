import { parse, renderHTML } from "@djot/djot";
import type { Cell, HTMLRenderer } from "@djot/djot";

function renderCell(node: Cell, renderer: HTMLRenderer): string {
  const tag = node.head ? "th" : "td";
  const modifier = node.align === "default" ? "" : ` class="align-${node.align}"`;
  return `<${tag}${modifier}>${renderer.renderChildren(node)}</${tag}>`;
}

export function renderDjot(source: string, file: string): string {
  const warnings: string[] = [];
  const ast = parse(source, { warn: (warning) => warnings.push(warning.render()) });
  const html = renderHTML(ast, {
    warn: (warning) => warnings.push(warning.render()),
    overrides: { cell: renderCell },
  });

  if (warnings.length > 0) {
    throw new Error(`${file}:\n${warnings.map((warning) => `  ${warning}`).join("\n")}`);
  }

  return html;
}
