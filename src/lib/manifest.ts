import type { Assets, Icon } from "./assets.ts";
import { paper, routes, site } from "./config.ts";

interface Manifest {
  readonly name: string;
  readonly short_name: string;
  readonly description: string;
  readonly lang: string;
  readonly start_url: string;
  readonly scope: string;
  readonly display: string;
  readonly background_color: string;
  readonly theme_color: string;
  readonly icons: readonly Icon[];
}

// Generated rather than copied, so the name, the language, the description and the icon
// addresses all come from the build that produced them.
export function manifest(assets: Assets): Manifest {
  return {
    name: site.title,
    short_name: "苏斯基",
    description: site.motto,
    lang: site.lang,
    start_url: routes.home,
    scope: routes.home,
    display: "standalone",
    background_color: paper.light,
    theme_color: paper.light,
    icons: assets.icons,
  };
}
