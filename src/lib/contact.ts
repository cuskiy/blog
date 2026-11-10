export type Contact =
  | { readonly kind: "plain"; readonly label: string; readonly value: string; readonly href: string }
  | { readonly kind: "encoded"; readonly label: string; readonly prefix: string; readonly encoded: string };

// The email and the matrix handle never reach the page source: the browser decodes them
// in src/client/about.ts.
export const contacts: readonly Contact[] = [
  {
    kind: "encoded",
    label: "Matrix",
    prefix: "https://matrix.to/#/",
    encoded: "QHl1cnU6dW5yZWRhY3RlZC5vcmc=",
  },
  { kind: "encoded", label: "邮箱", prefix: "mailto:", encoded: "Y3Vza2l5QHByb3Rvbi5tZQ==" },
  { kind: "plain", label: "代码", value: "codeberg.org/ity", href: "https://codeberg.org/ity" },
];

export const gpgFingerprint = "77D3EA2DD4E0130CFFF2C3B0860D7F687C489251";
