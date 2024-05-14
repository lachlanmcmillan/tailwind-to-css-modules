import { twi, twj } from "tw-to-css";
import { readdir, lstat } from "node:fs/promises";
import * as prettier from "prettier";
import { join } from "node:path";
import { classes } from "./classes";

if (process.argv.length < 3) {
  console.log("usage: bun start [filename]");
  process.exit(0);
}

const path = process.argv[2];

const pathIsFolder = (await lstat(path)).isDirectory();

if (pathIsFolder) {
  const files = (await readdir(path, { recursive: true }))
    .filter((p) => p.endsWith(".jsx") || p.endsWith(".tsx"))
    .map((p) => join(path, p));

  for (let f of files) {
    await transform(f);
  }
} else {
  transform(path);
}

async function transform(filePath: string) {
  console.log(filePath);
  // read file
  let text = await Bun.file(filePath).text();
  let css = "";

  const regex = /className=\"([\.\-\[\]\#\:\%_a-zA-Z0-9 ]+)\"/;
  let result;
  let counter = 0;
  while (result = regex.exec(text)) {
    const className = classes[counter];
    css += `.${className} {\n ${twi(result[1])}\n}\n\n`;
    text = text.replaceAll(result[0], `className=\{styles.${className}\}`);
    counter++;
  }
  if (counter > 0) {
    const cssModulePath =
      filePath.substring(0, filePath.length - 3) + "module.css";
    const cssModuleRelativePath = cssModulePath
      .split("/")
      .findLast((x) => true);

    // add css module import
    text = `import styles from \"./${cssModuleRelativePath}\";\n` + text;

    // format the css
    css = await prettier.format(css, {
      parser: "css",
      tabWidth: 2,
      useTabs: false,
    });

    // write original file
    Bun.write(filePath, text);
    // write css file - warning this will overwrite any existing css module
    Bun.write(cssModulePath, css);
  }
}
