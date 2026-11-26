import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repository = fileURLToPath(new URL("../../../", import.meta.url));
const docs = resolve(repository, "apps/docs/content/docs");
const directory = await mkdtemp(resolve(repository, "apps/playground/.docs-examples-"));

try {
  const examples = [];

  for (const file of await readdir(docs)) {
    if (!file.endsWith(".mdx")) continue;

    const text = await readFile(resolve(docs, file), "utf8");

    for (const match of text.matchAll(/```ts title="([^"\n]+\.ts)"\n([\s\S]*?)```/g)) {
      const filename = resolve(directory, file.replace(".mdx", ""), match[1]);

      await mkdir(dirname(filename), { recursive: true });
      await writeFile(filename, match[2]);
      examples.push(filename);
    }
  }

  const shared = new Map();

  for (const filename of examples) {
    shared.set(filename.split("/").at(-1), await readFile(filename, "utf8"));
  }

  for (const filename of examples) {
    const text = await readFile(filename, "utf8");

    for (const match of text.matchAll(/from "\.\/([^"/]+)\.js"/g)) {
      const source = shared.get(match[1] + ".ts");

      assert(source, `Missing example dependency ${match[1]} in ${filename}`);

      const dependency = resolve(dirname(filename), match[1] + ".ts");

      await writeFile(dependency, source);

      if (!examples.includes(dependency)) examples.push(dependency);
    }
  }

  // Bun's listener is exercised by the runtime smoke command. This minimal ambient
  // declaration checks the portable Fetch handler without adding Bun types to docs.
  const bunTypes = resolve(directory, "bun.d.ts");

  await writeFile(
    bunTypes,
    "declare const Bun: { serve(options: { port: number; fetch: (request: Request) => Response | Promise<Response> }): unknown };\n",
  );

  const configPath = resolve(repository, "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);

  assert(!config.error, "Cannot read workspace TypeScript configuration");

  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, repository);
  const program = ts.createProgram([...examples, bunTypes], { ...parsed.options, noEmit: true });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => repository,
        getNewLine: () => "\n",
      }),
    );
  }

  const testConfig = resolve(directory, "vitest.config.mts");
  const aliases = Object.fromEntries(
    Object.entries(parsed.options.paths).map(([name, paths]) => [
      name,
      resolve(repository, paths[0]),
    ]),
  );

  await writeFile(
    testConfig,
    `export default ${JSON.stringify(
      {
        test: { include: [directory + "/**/*.test.ts"] },
        resolve: { alias: aliases },
      },
      null,
      2,
    )};\n`,
  );

  const result = spawnSync(
    process.execPath,
    [resolve(repository, "node_modules/vitest/vitest.mjs"), "run", "--config", testConfig],
    { cwd: repository, stdio: "inherit" },
  );

  assert.equal(result.status, 0, "Documentation example tests failed");

  console.log(`Type-checked ${examples.length} documentation files and ran their example tests`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
