import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { pathToFileURL } from "node:url";

type DrawApp = {
  drawTextOnSideA: (data: unknown) => string;
  drawTextOnSideB: (data: unknown, cardNum: string, cardTime: string) => string;
  drawFullInscr: (text: string, fontName: string) => string;
  drawOnSideANew?: (data: unknown, designFilePath: string) => string;
  drawOnSideBNew?: (data: unknown, cardNum: string, cardTime: string) => string;
};

let cached: DrawApp | null = null;
let loadingPromise: Promise<DrawApp> | null = null;
const moduleWithGlobals = Module as unknown as {
  globalPaths: string[];
  _initPaths: () => void;
};

function resolveApp2Path(): string {
  const app2PathCandidates = [
    path.resolve(process.cwd(), "../metalcards_site-main/app2.js"),
    path.resolve(process.cwd(), "metalcards_site-main/app2.js"),
  ];
  const app2Path = app2PathCandidates.find((candidate) => fs.existsSync(candidate));

  if (!app2Path) {
    throw new Error("metalcards_site-main/app2.js was not found");
  }

  return app2Path;
}

function configureModuleLookup() {
  const nodeModulesCandidates = [
    path.resolve(process.cwd(), "node_modules"),
    path.resolve(process.cwd(), "frontend-next/node_modules"),
  ];

  const availableNodeModules = nodeModulesCandidates.filter(
    (candidate) => fs.existsSync(candidate) && !moduleWithGlobals.globalPaths.includes(candidate),
  );

  if (availableNodeModules.length === 0) {
    return;
  }

  const currentNodePath = process.env.NODE_PATH;
  process.env.NODE_PATH = currentNodePath
    ? `${availableNodeModules.join(path.delimiter)}${path.delimiter}${currentNodePath}`
    : availableNodeModules.join(path.delimiter);
  moduleWithGlobals._initPaths();
}

export async function getDrawApp(): Promise<DrawApp> {
  if (cached) {
    return cached;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    configureModuleLookup();
    const app2Path = resolveApp2Path();
    const app2Url = pathToFileURL(app2Path).href;

    const dynamicImport = new Function("p", "return import(p);") as (p: string) => Promise<unknown>;
    const imported = await dynamicImport(app2Url);
    const loaded = (
      imported &&
      typeof imported === "object" &&
      "default" in imported
        ? (imported as { default: DrawApp }).default
        : imported
    ) as DrawApp;

    cached = loaded;
    return loaded;
  })();

  return loadingPromise;
}
