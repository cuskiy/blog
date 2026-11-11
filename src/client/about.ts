// Fills in the contacts that must not appear in the page source, encoded in src/lib/contact.ts
for (const holder of document.querySelectorAll<HTMLElement>("[data-encoded]")) {
  const { encoded, contact: prefix } = holder.dataset;
  if (encoded === undefined || prefix === undefined) {
    continue;
  }

  const value = atob(encoded);
  const link = document.createElement("a");
  link.href = prefix + value;
  link.rel = "noopener";
  link.textContent = value;
  holder.replaceChildren(link);
}
