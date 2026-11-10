const escapes: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export class Html {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

// the only way markup bypasses escaping
export function raw(value: string): Html {
  return new Html(value);
}

function escape(text: string): string {
  return text.replace(/[&<>"']/g, (character) => escapes[character] ?? character);
}

function render(value: unknown): string {
  if (value instanceof Html) {
    return value.value;
  }
  if (Array.isArray(value)) {
    return value.map(render).join("");
  }
  if (value === undefined || value === null || value === false) {
    return "";
  }
  if (typeof value === "string") {
    return escape(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  throw new TypeError(`cannot render ${typeof value} as markup`);
}

export function html(strings: TemplateStringsArray, ...values: readonly unknown[]): Html {
  let out = strings[0] ?? "";
  for (const [index, value] of values.entries()) {
    out += render(value) + (strings[index + 1] ?? "");
  }
  return new Html(out);
}
