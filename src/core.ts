import favicons from "favicons-lib";
import type { FaviconOptions } from "favicons-lib";
import fs from "fs/promises";

import { logger } from "./utils";

export const defaultConfig: FaviconOptions = {
  path: "/",
  appName: "Welcome to Astro Favicons.",
  appShortName: "Astro Favicons",
  appDescription: "A Multi-platform Favicon generator for Astro Project.",
  faviconsDarkMode: true,
  icons: {
    android: [
      "android-chrome-192x192.png",
      "android-chrome-512x512.png"
    ],
    appleIcon: [
      { name: "apple-touch-icon.png", offset: 11.5 }
    ],
    appleStartup: false,
    favicons: true,
    windows: [
      "mstile-150x150.png"
    ],
    yandex: true,
    safari: true,
  },
};

type IconSize = {
  readonly width: number;
  readonly height: number;
}

type IconOptions = {
  readonly sizes: IconSize[];
  readonly offset?: number;
  readonly background?: string | boolean;
  readonly transparent: boolean;
  readonly rotate: boolean;
  readonly purpose?: string;
  readonly pixelArt?: boolean;
}

interface NamedIconOptions extends IconOptions {
  readonly name: string;
}

function logInfo(logs: string[]) {
  logs.forEach((log, idx) => {
    let symbol: string = '└─';
    if (idx === logs.length - 1) {
      symbol = '└─';
    } else {
      symbol = '├─'
    }
    console.log(`  \x1b[36m${symbol}\x1b[0m ${log}`)
  });
}

function getPlatform(fileName: string) {
  if (fileName.includes('manifest.webmanifest')) {
    return 'Android/Chrome';
  }
  if (fileName.includes('browserconfig.xml')) {
    return 'Windows Metro';
  }
  if (fileName.includes('yandex-browser-manifest.json')) {
    return 'Yandex';
  }
  return 'Unknown';
}

function fixOutPath(path: string): string {
  path = path
    // 去除开头结尾多余的 `/` 和 `..`
    .replace(/(?:^\/?)|(?:\/+$)|(?:\.{2}\/)/g, '')
    // 将多个空格替换为单个 `/`
    .replace(/\s+/g, '/')
    // 将开头多个 `/` 替换为空
    .replace(/^\/+/, '');

    if(!path) {
      path = '';
    } else if(!path.endsWith('/')) {
      path += '/';
    }

  return path;
}


export async function createFiles(src: string, dist: URL, options: FaviconOptions) {

  const startTime = Date.now();

  let path = fixOutPath(options.path  || "/");
  // Out directory
  const dest = new URL(path, dist);

  // console.log(dist);
  // console.log(dest);

  // Below is the processing.
  const response = await favicons(src, options);

  let totalFile: number = response.images.length + response.files.length;
  let imgLogs: string[] = [], fileLogs: string[] = [];

  await fs.mkdir(dest, { recursive: true });

  // Create image
  await Promise.all(
    response.images.map(async (image, index) => {
      const startTime = Date.now();
      await fs.writeFile(new URL(image.name, dest), image.contents);
      const endTime = Date.now();
      const excutionTime = endTime - startTime;
      return imgLogs.push(`\x1b[2m/${fixOutPath(options.path || "/")}${image.name} (+${excutionTime}ms)\x1b[22m`);
    }),
  );

  // Create file
  await Promise.all(
    response.files.map(async (file, index) => {
      const startTime = Date.now();
      await fs.writeFile(new URL(file.name, dest), file.contents);
      const endTime = Date.now();
      const excutionTime = endTime - startTime;
      return fileLogs.push(`\x1b[2m/${fixOutPath(options.path || "/")}${file.name} (+${excutionTime}ms)\x1b[22m`);
    }),
  );

  const totalTime = (Date.now() - startTime) / 1000;

  // Log infos
  logger.info(`Parsing options...`);
  console.log(`\n\x1b[42m generating favicons \x1b[0m`);
  console.log(`\x1b[32m▶\x1b[0m ${src.replace(/^\.\//, '')}`);
  logInfo(imgLogs);
  fileLogs.forEach((log, idx) => {
    console.log(`\x1b[32m▶\x1b[0m ${getPlatform(log)}`);
    console.log(`  \x1b[36m└─\x1b[0m ${log}`)
  });
  console.log(`\x1b[2mCompleted in ${totalTime}s.\x1b[22m\n`);
  logger.info(`${totalFile} file(s) built in \x1b[1m${totalTime}s\x1b[m`);
  logger.info(`\x1b[1mComplete!\x1b[m`);

};


export async function vitePluginFavicons(src: string, options: FaviconOptions, compressHTML: boolean) {

  const response = await favicons(src, options);
  let htmlTags: string;

  if (compressHTML) {
    htmlTags = `${response.html.join('').replaceAll('\n', '')}`;
  } else {
    htmlTags = `\\n\\n<!-- Astro Favicons v1.2.0 - https://github.com/ACP-CODE/astro-favicons -->\\n${response.html.join('\\n').replace(/(?<!\\n)\\n\\n+(?!\\n)/g, '\n')}\\n<!--  Astro Favicons -->\\n\\t`;
  }
  return {
    name: 'vite-plugin-favicons',
    enforce: 'pre',
    transform(html: string) {
      try {
        // console.log(html)
        const regex = /"/g;
        return html.replace('</head>', `${htmlTags.replace(regex, '\\"')}</head>`);
      } catch (error) {
        throw error;
      }
    }
  }
};
