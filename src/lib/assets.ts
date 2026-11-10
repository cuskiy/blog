export interface Assets {
  readonly css: string;
  readonly scripts: Readonly<Record<"music" | "search" | "oneko" | "about", string>>;
}
