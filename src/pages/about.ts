import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import { routes } from "../lib/config.ts";
import { contacts, gpgFingerprint } from "../lib/contact.ts";
import type { Contact } from "../lib/contact.ts";
import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";

const title = "关于";

function contactValue(contact: Contact): Html {
  if (contact.kind === "plain") {
    return html`<a href="${contact.href}" rel="noopener">${contact.value}</a>`;
  }
  // the address arrives base64 encoded and is filled in by src/client/about.ts
  return html`<span data-contact="${contact.prefix}" data-encoded="${contact.encoded}"></span>`;
}

function contactSection(): Html {
  const rows = contacts.map(
    (contact) => html`      <dt>${contact.label}</dt>
      <dd>${contactValue(contact)}</dd>`,
  );

  return html`  <section>
    <h2 class="section-title">联系方式</h2>
    <dl class="contact-list">
${rows}
      <dt>GPG</dt>
      <dd><code>${gpgFingerprint}</code></dd>
    </dl>
    <noscript>
      <p class="noscript-note">邮箱与 Matrix 需要 JavaScript，开启后刷新页面即可。</p>
    </noscript>
  </section>`;
}

export function aboutPage(assets: Assets): string {
  return layout({
    assets,
    title,
    path: routes.about,
    // the title stays in the document outline only; the page is the contact list
    heading: title,
    body: html`  <article>
${contactSection()}  </article>`,
    script: assets.scripts.about,
  });
}
