```sh
nix develop
```

| Command                 | What it does                                       |
| ----------------------- | -------------------------------------------------- |
| `npm run build`         | Format, lint, type-check, then render into `dist/` |
| `npm run serve`         | The same checks, then serve `dist/` on a port      |
| `npm run code`          | Format, lint TS, lint CSS, type-check — no build   |
| `npm run fmt`           | Rewrite every file with Prettier                   |
| `npm run lint`          | ESLint with the strict typed presets               |
| `npm run lint:css`      | Stylelint over the stylesheet                      |
| `npm run typecheck`     | Type-check without emitting                        |
| `npm test`              | Run the test suite with `node --test`              |
| `npm run check`         | Code checks, tests, a build, then the output audit |
| `npm run verify:output` | Check the built HTML and CSS (needs `dist/`)       |
