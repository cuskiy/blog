import { build } from "./build.ts";
import { serve } from "./serve.ts";

const [command = "build", argument] = process.argv.slice(2);

try {
  if (command === "build") {
    console.log(`built ${await build()} posts into dist/`);
  } else if (command === "serve") {
    const port = Number(argument ?? "3000");
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`invalid port: ${JSON.stringify(argument)}`);
    }
    await serve(port);
  } else {
    console.error(`unknown command: ${command} (expected build or serve)`);
    process.exit(1);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
