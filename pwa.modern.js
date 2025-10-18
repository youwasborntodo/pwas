#!/usr/bin/env node
/**
 * pwa.modern.js
 * Modernized rewrite of pwas/pwa.es5.js
 *
 * - async/await, fs.promises
 * - path.join for cross-platform paths
 * - unified logging
 * - preserve original CLI: init, entry, build, version, help
 * - parse html, inject manifest and entry script
 * - collect resources for service worker cache list
 * - generate icons (local or from remote iconUrl) with jimp
 * - write manifest.json and service worker files
 */

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();
const chalk = require('chalk');
const jimp = require('jimp');
const terser = require('terser');
const { JSDOM } = require('jsdom');

const PKG = (() => {
  try {
    return require('pwas/package.json');
  } catch (e) {
    return { version: 'unknown' };
  }
})();

const log = {
  info: (msg) => console.log(chalk.cyan('[INFO]'), msg),
  success: (msg) => console.log(chalk.green('[OK]'), msg),
  warn: (msg) => console.warn(chalk.yellow('[WARN]'), msg),
  error: (msg) => console.error(chalk.red('[ERROR]'), msg)
};

// Default configuration (will be overridden by .pwarc if exists)
const DEFAULT_CONFIG = {
  buildDir: 'static/pwa/', // relative to project root
  scope: './',
  redirectPath: '',
  registerFile: 'sw.js',
  entryScript: 'entry_sw.js',
  defaultEntry: 'index.html',
  iconsPath: 'icons/',
  manifestUrl: '',
  relativeFilePath: '',
  isWindows: process.env.os && process.env.os === 'Windows_NT',
  cacheName: 'index',
  exclude: [],
  apiExclude: [],
  iconUrl: '',
  isBuild: false,
  createIcon: false,
  isConfig: false,
  isEntry: false,
  isDefault: true,
  relativePath: process.cwd(),
  manifest: {
    name: 'PWAs应用',
    "short_name": "PWAs",
    "description": "这只是一个测试应用！",
    "start_url": "index.html",
    "display": "standalone",
    "orientation": "any",
    icons: [
      { src: 'icon_ss.png', sizes: '32x32', type: 'image/png' },
      { src: 'icon_s.png', sizes: '48x48', type: 'image/png' },
      { src: 'icon.png', sizes: '96x96', type: 'image/png' },
      { src: 'icon_m.png', sizes: '152x152', type: 'image/png' },
      { src: 'apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: 'icon_x.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon_xx.png', sizes: '256x256', type: 'image/png' }
    ]
  }
};

let config = { ...DEFAULT_CONFIG };
let Manifest = {};
let iconList = [];
let bufferList = [];
const exceptFile = ['node_modules', 'package.json', config.entryScript];

function resolveProjectPath(...parts) {
  return path.join(config.relativePath, ...parts);
}

// Helper: ensure directory exists (recursive)
async function ensureDir(dir) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    return true;
  } catch (err) {
    log.error(`创建目录失败: ${dir} — ${err.message}`);
    return false;
  }
}

// Helper: write file safely (utf-8)
async function writeFileSafe(filePath, data) {
  try {
    await ensureDir(path.dirname(filePath));
    await fs.promises.writeFile(filePath, data, 'utf-8');
    log.success(`${filePath} 写入成功`);
    return true;
  } catch (err) {
    log.error(`写入失败: ${filePath} — ${err.message}`);
    return false;
  }
}

// Read .pwarc file if exists
async function loadPwarc() {
  const pwarcPath = path.join(__dirname, 'pwarc.json');
  try {
    const raw = await fs.promises.readFile(pwarcPath, 'utf-8');
    const parsed = JSON.parse(raw);
    config.isConfig = true;
    // merge parsed into config
    config = { ...config, ...parsed };
    // ensure nested manifest merges (but ignore icons)
    if (parsed.manifest) {
      // Remove icons from parsed manifest if present
      const { icons, ...restManifest } = parsed.manifest;
      config.manifest = { ...restManifest };
    }
    // Always use DEFAULT_CONFIG.manifest.icons
    Manifest = { ...config.manifest };
    Manifest.icons = DEFAULT_CONFIG.manifest.icons.map(img => ({
      ...img,
      src: path.posix.join(config.buildDir, config.iconsPath, img.src)
    }));
    iconList = Manifest.icons.map(img => path.basename(img.src));
    log.info('使用 pwarc.json 配置');
  } catch (err) {
    // no config, use defaults
    log.info('.pwarc/pwarc.json 未找到，使用默认配置');
    Manifest = { ...config.manifest };
    Manifest.icons = DEFAULT_CONFIG.manifest.icons.map(img => ({
      ...img,
      src: path.posix.join(config.buildDir, config.iconsPath, img.src)
    }));
    iconList = Manifest.icons.map(img => path.basename(img.src));
  }
}

// Read .pwarc from project root (if present) — fallback also checks project root .pwarc
async function loadProjectPwarc() {
  const localPwarc = path.join(config.relativePath, '.pwarc');
  const localPwarcJson = path.join(config.relativePath, 'pwarc.json');
  try {
    const candidate = fs.existsSync(localPwarc) ? localPwarc : (fs.existsSync(localPwarcJson) ? localPwarcJson : null);
    if (candidate) {
      const raw = await fs.promises.readFile(candidate, 'utf-8');
      const parsed = JSON.parse(raw);
      config = { ...config, ...parsed };
      // Only use manifest fields except icons
      if (parsed.manifest) {
        const { icons, ...restManifest } = parsed.manifest;
        config.manifest = { ...restManifest };
      }
      // Always use DEFAULT_CONFIG.manifest.icons
      Manifest = { ...config.manifest };
      Manifest.icons = DEFAULT_CONFIG.manifest.icons.map(img => ({
        ...img,
        src: path.posix.join(config.buildDir, config.iconsPath, img.src)
      }));
      iconList = Manifest.icons.map(img => path.basename(img.src));
      config.isConfig = true;
      log.info(`读取项目配置 ${candidate}`);
    }
  } catch (err) {
    log.warn('读取项目 pwarc 失败，继续使用默认或全局配置');
  }
}

// Scan directory and return file list (relative paths from project root)
function readFileList(dir, filesList = []) {
  let files = [];
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    return filesList;
  }
  files.forEach((item) => {
    try {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (!exceptFile.includes(item)) {
        if (stat.isDirectory()) {
          readFileList(path.join(dir, item), filesList);
        } else {
          const relativePath = fullPath.replace(config.relativePath, '').replace(/\\/g, '/').replace(/^\//, '');
          // ensure leading slash removed, match original behavior using relative URLs starting without /
          filesList.push(relativePath);
        }
      }
    } catch (err) {
      // ignore
    }
  });
  return filesList;
}

// Parse HTML and collect assets, inject manifest and entry script if needed
function getChildNodes(node, attrFileList) {
  if (!node || !node.hasChildNodes()) return;
  const doms = node.childNodes;
  doms.forEach(child => {
    if (child.nodeType === 1) { // ELEMENT_NODE
      getChildNodes(child, attrFileList);
      getAttrList(child, attrFileList);
    }
  });
}

function getAttrList(node, attrFileList) {
  const tag = node.nodeName;
  switch (tag) {
    case 'LINK': {
      const href = node.getAttribute('href');
      if (href) attrFileList.push(href);
      break;
    }
    case 'A': {
      const href = node.getAttribute('href');
      if (href) attrFileList.push(href);
      break;
    }
    case 'SCRIPT': {
      const src = node.getAttribute('src');
      if (src) attrFileList.push(src);
      break;
    }
    case 'IMG': {
      const src = node.getAttribute('src');
      if (src) attrFileList.push(src);
      break;
    }
    default:
      break;
  }
}

// Write service worker file using fileList and config
async function createServiceWorkerFile(fileList) {
  // build SW content with caching list, exclude, apiExclude
  const buildTime = new Date().toLocaleString().replace(' ', '|');
  let swData = `
    const edition = 'pwas[${config.cacheName}]@${buildTime}'
    const fileList = [\n${fileList.map(f => `      '${f.replace(/^\//, '')}',`).join('\n')}\n    ];
  `;
  // exclude arrays
  if (Array.isArray(config.exclude) && config.exclude.length) {
    swData += `\n    const exclude = [${config.exclude.map(e => `'${e}'`).join(',')}];\n`;
  } else {
    swData += `\n    const exclude = [];\n`;
  }
  if (Array.isArray(config.apiExclude) && config.apiExclude.length) {
    swData += `\n    const apiExclude = [${config.apiExclude.map(e => `'${e}'`).join(',')}];\n`;
  } else {
    swData += `\n    const apiExclude = [];\n`;
  }

  // Add basic service worker logic (install/activate/fetch) — similar to original
  swData += `
    self.addEventListener('install', e => {
      e.waitUntil(
        caches.open(edition).then(cache => {
          return Promise.all(
            fileList.filter(f => {
              const fileName = f.split('/').pop().split('?')[0];
              return !exclude.includes(fileName);
            }).map(f => cache.add(f))
          );
        })
      );
    });

    function deleteCache() {
      caches.keys().then(list => {
        return Promise.all(
          list.filter(cacheName => {
            if (cacheName.includes('@')) {
              const cacheTime = cacheName.split('@')[1];
              const cacheLabel = cacheName.split('@')[0];
              const editionLabel = edition.split('@')[0];
              const editionTime = edition.split('@')[1];
              if (cacheLabel === editionLabel) {
                return cacheTime !== editionTime;
              }
            } else {
              return cacheName !== edition;
            }
          }).map(cacheName => caches.delete(cacheName))
        );
      }).catch(err => console.error(err));
    }

    self.addEventListener('activate', e => {
      e.waitUntil(deleteCache());
    });

    self.addEventListener('fetch', e => {
      if (e.request.method !== 'GET') return;
      e.respondWith(
        caches.match(e.request).then(res => {
          if (res) return res;
          let fetchRequest = e.request.clone();
          return fetch(fetchRequest).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') return response;
            const responseToCache = response.clone();
            caches.open(edition).then(cache => {
              const getFileName = (new URL(fetchRequest.url, location.origin)).pathname.split('/').pop();
              if (!exclude.includes(getFileName)) {
                cache.put(e.request, responseToCache);
              }
            });
            return response;
          }).catch(err => {
            return fetch(e.request);
          });
        })
      );
    });
  `;

  // minify
  try {
    const minified = terser.minify(swData, { toplevel: true });
    const swOut = minified && minified.code ? minified.code : swData;
    const swPath = resolveProjectPath(config.relativeFilePath, config.registerFile);
    await writeFileSafe(swPath, swOut);
  } catch (err) {
    log.error(`生成 service worker 失败: ${err.message}`);
  }
}

// Create entry script that registers service worker and provides uninstall and PWA install prompt handler
async function createEntryScript() {
  const entryScriptPath = resolveProjectPath(config.relativeFilePath, config.buildDir, config.entryScript);
  const manifestFetch = config.manifestUrl ? config.manifestUrl : `${config.redirectPath}/manifest.json`;
  const entryContent = `
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('${path.posix.join(config.redirectPath, config.registerFile)}', { scope: "${config.scope}"})
        .then(res => console.log('service worker is registered', res))
        .catch(err => console.error('service worker register fail', err));
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA install prompt captured');
      });

      window.onInstallPWA = async () => {
        if (!deferredPrompt) {
          console.log('No install prompt available');
          return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(outcome === 'accepted' ? 'PWA installation accepted' : 'PWA installation dismissed');
        deferredPrompt = null;
      };
      window.uninstallServiceWorker = function(cacheName) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (!reg) return;
          reg.unregister();
        }).catch(err => console.error(err));
      }
    }
  `;
  await writeFileSafe(entryScriptPath, entryContent);
}

// Create manifest.json and icons
async function createManifestAndIcons() {
  try {
    const iconsDir = resolveProjectPath(config.relativeFilePath, config.buildDir, config.iconsPath);
    await ensureDir(iconsDir);

    // If iconUrl provided, download and generate sized icons via jimp
    if (config.iconUrl) {
      const tmpSource = path.join(iconsDir, 'iconSource.png');
      await streamRequestToFile(config.iconUrl, tmpSource);
      // generate required sizes (reverse order to preserve original behavior)
      const sizeList = [
        { name: 'icon_ss.png', size: 32 },
        { name: 'icon_s.png', size: 64 },
        { name: 'icon.png', size: 96 },
        { name: 'icon_m.png', size: 152 },
        { name: 'apple-icon.png', size: 180 },
        { name: 'icon_x.png', size: 192 },
        { name: 'icon_xx.png', size: 256 }
      ];
      for (const data of sizeList) {
        try {
          const img = await jimp.read(tmpSource);
          img.resize(data.size, data.size).quality(100);
          await img.writeAsync(path.join(iconsDir, data.name));
        } catch (e) {
          log.error(`生成 icon ${data.name} 失败: ${e.message}`);
        }
      }
      // remove source
      try { await fs.promises.unlink(tmpSource); } catch(e) {}
    } else {
      // use local icons from package img/ if exists
      const pkgImgDir = path.join(__dirname, 'img');
      for (const src of iconList) {
        const fileName = src.split('/').pop();
        const srcPath = path.join(__dirname, 'img', fileName);
        const dest = path.join(iconsDir, fileName);
        try {
          if (fs.existsSync(srcPath)) {
            await fs.promises.copyFile(srcPath, dest);
          } else {
            // If not found in package, ignore; user may provide icons elsewhere
            log.warn(`本地 icon 未找到：${srcPath}`);
          }
        } catch (e) {
          log.error(`复制 icon 失败: ${e.message}`);
        }
      }
    }

    // write manifest.json to relativeFilePath (project root + relativeFilePath)
    const manifestPath = resolveProjectPath(config.relativeFilePath, 'manifest.json');
    // Manifest already had icons modified earlier in load functions to include buildDir/iconsPath prefix
    const manifestData = JSON.stringify(Manifest, null, 2);
    await writeFileSafe(manifestPath, manifestData);
    log.success('manifest.json 和 icons 已生成');
  } catch (err) {
    log.error(`createManifestAndIcons 失败: ${err.message}`);
  }
}

// download stream helper (use native https)
function streamRequestToFile(url, destPath) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP 状态码 ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', (err) => {
      fs.unlink(destPath, () => reject(err));
    });
  });
}

// main flow: process html, collect assets, create sw, manifest, entry script
async function entryFile(file) {
  try {
    // parse path and filename
    if (/\//.test(file)) {
      // has path
      const match = /(^.+\/)(\S+.html)$/.exec(file);
      if (!match) {
        throw new Error('请确认输入的路径格式是否正确！');
      }
      config.relativeFilePath = match[1];
      config.defaultEntry = match[2];
    } else {
      config.relativeFilePath = '';
      config.defaultEntry = file;
    }

    if (config.isBuild) log.info('building.........');

    // try to load global and project pwarc files
    await loadPwarc().catch(() => {});
    await loadProjectPwarc().catch(() => {});

    // read HTML file
    const filePath = path.join(config.relativePath, config.relativeFilePath, config.defaultEntry);
    let htmlText;
    try {
      htmlText = await fs.promises.readFile(filePath, 'utf-8');
    } catch (err) {
      const msg = `
      错误提示【Error msg】

      原因：未找到该文件: ${filePath}，请检查指定的入口文件是否存在！

      提示：可以自定义入口文件,例如【entry index.html】

      需要了解其它帮助信息可以输入【 --help】
      `;
      log.error(msg);
      return false;
    }

    // ensure the build dir exists
    const buildPath = path.join(config.relativePath, config.relativeFilePath, config.buildDir);
    await ensureDir(buildPath);

    // inject entry script into body if not present
    const entryScriptTag = `<script src="${path.posix.join(config.buildDir, config.entryScript)}"></script>`;
    let newHTML = htmlText;
    if (!newHTML.includes(entryScriptTag)) {
      newHTML = newHTML.replace('</body>', `${entryScriptTag}\n</body>`);
    }

    // inject manifest link into head
    const manifestLink = `<link rel="manifest" id="insertManifest" href="manifest.json?t=${Date.now()}">`;
    if (!newHTML.includes('id="insertManifest"')) {
      newHTML = newHTML.replace('</head>', `${manifestLink}\n</head>`);
    } else {
      // replace existing timestamp if present
      newHTML = newHTML.replace(/manifest.json\?t=\d+/g, `manifest.json?t=${Date.now()}`);
    }

    // handle icons meta injection if createIcon enabled
    if (config.createIcon) {
      const iconMeta = `
<link rel="apple-touch-icon" sizes="180x180" href="${path.posix.join(config.buildDir, config.iconsPath, 'apple-icon.png')}" />
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="white">
<meta name="apple-mobile-web-app-title" content="${Manifest.name}">
<meta name="application-name" content="${Manifest.name}">
<link rel="icon" type="image/png" href="${path.posix.join(config.buildDir, config.iconsPath, 'icon_ss.png')}" sizes="32x32"/>
`;
      if (!newHTML.includes(iconMeta.trim())) {
        newHTML = newHTML.replace('</title>', `</title>\n${iconMeta}`);
      }
    }

    // write back modified HTML to the same file (original script wrote to file param)
    await writeFileSafe(path.join(config.relativePath, config.relativeFilePath, config.defaultEntry), newHTML);

    // parse original html to collect resources (use original htmlText)
    const dom = new JSDOM(htmlText);
    const document = dom.window.document;
    const attrFileList = [];
    getChildNodes(document, attrFileList);
    // ensure default entry is added
    attrFileList.push(config.defaultEntry);

    // normalize file paths: remove origin/leading slashes per original logic
    const normalizedList = attrFileList.map(p => {
      // if absolute URL (http/https) keep as-is, else clean starting slash
      if (/^https?:\/\//.test(p) || p.startsWith('//')) {
        return p;
      }
      return p.replace(/^\//, '');
    });

    // scan project files (to include static assets)
    const filesFromScan = readFileList(config.relativePath, []);
    // merge both lists and dedupe
    const merged = Array.from(new Set([...normalizedList, ...filesFromScan]));

    // create icons and manifest
    // set Manifest icons src to include buildDir/iconsPath prefixes
    Manifest = Manifest || config.manifest;
    if (Manifest && Array.isArray(Manifest.icons)) {
      Manifest.icons.forEach(img => {
        // already adjusted by load functions in many cases; ensure posix join
        img.src = path.posix.join(config.buildDir, config.iconsPath, path.basename(img.src));
      });
    }

    // generate icons + manifest.json
    await createManifestAndIcons();

    // create service worker (which requires the final file list)
    // For SW, ensure file paths are relative and include config.relativeFilePath if necessary
    // Use merged list but keep only relative or absolute resources; remove empty strings
    const finalList = merged.map(item => item.replace(/^\//, '')).filter(Boolean);
    await createServiceWorkerFile(finalList);
    // create entry script to register sw and helper functions
    await createEntryScript();

    log.success('entryFile 流程完成');

  } catch (err) {
    log.error(`entryFile 错误: ${err.message}`);
  }
}

// create manifest and icons wrapper (already defined above but expose name)
async function createManifestAndIcons() {
  // reuse earlier function defined above — ensure it's declared only once
  return createManifestAndIconsInner();
}

async function createManifestAndIconsInner() {
  // Implementation above already exists; to avoid duplication, we move its logic here.
  try {
    const iconsDir = resolveProjectPath(config.relativeFilePath, config.buildDir, config.iconsPath);
    await ensureDir(iconsDir);

    // If iconUrl provided, download and generate via jimp
    if (config.iconUrl) {
      const tmp = path.join(iconsDir, 'iconSource.png');
      await streamRequestToFile(config.iconUrl, tmp);
      const sizes = [
        { name: 'icon_ss.png', size: 32 },
        { name: 'icon_s.png', size: 64 },
        { name: 'icon.png', size: 96 },
        { name: 'icon_m.png', size: 152 },
        { name: 'apple-icon.png', size: 180 },
        { name: 'icon_x.png', size: 192 },
        { name: 'icon_xx.png', size: 256 }
      ];
      for (const s of sizes) {
        try {
          const img = await jimp.read(tmp);
          img.resize(s.size, s.size).quality(100);
          await img.writeAsync(path.join(iconsDir, s.name));
        } catch (e) {
          log.error(`生成icon ${s.name} 失败: ${e.message}`);
        }
      }
      try { await fs.promises.unlink(tmp); } catch (e) {}
    } else {
      // copy from package img dir if exists
      const pkgImgDir = path.join(__dirname, 'img');
      for (const src of iconList) {
        const fileName = path.basename(src);
        const srcPath = path.join(pkgImgDir, fileName);
        const dest = path.join(iconsDir, fileName);
        if (fs.existsSync(srcPath)) {
          try {
            await fs.promises.copyFile(srcPath, dest);
          } catch (e) {
            log.warn(`复制icon失败: ${e.message}`);
          }
        } else {
          log.warn(`未找到包内 icon: ${srcPath}`);
        }
      }
    }
    // write manifest.json
    const manifestFilePath = resolveProjectPath(config.relativeFilePath, 'manifest.json');
    const manifestData = JSON.stringify(Manifest, null, 2);
    await writeFileSafe(manifestFilePath, manifestData);
    return true;
  } catch (err) {
    log.error(`createManifestAndIconsInner 错误: ${err.message}`);
    return false;
  }
}

// CLI wiring
const version = (PKG && PKG.version) ? PKG.version : '0.0.0';
program
  .version(version, '-v, --version', '输出版本')
  .description('pwas modern');

program
  .command('version')
  .description('查看当前版本')
  .action(() => {
    config.isDefault = false;
    log.info(`当前版本: ${PKG.version}`);
  });

program
  .command('init')
  .description('生成 pwarc.json 配置文件')
  .action(async () => {
    config.isDefault = false;
    const sample = {
      ...DEFAULT_CONFIG,
      manifest: {
        name: DEFAULT_CONFIG.manifest.name,
        short_name: DEFAULT_CONFIG.manifest.short_name,
        description: DEFAULT_CONFIG.manifest.description,
        start_url: DEFAULT_CONFIG.manifest.start_url,
        display: DEFAULT_CONFIG.manifest.display,
        orientation: DEFAULT_CONFIG.manifest.orientation
      }
    };
    const target = path.join(process.cwd(), 'pwarc.json');
    await writeFileSafe(target, JSON.stringify(sample, null, 2));
    log.success(`生成配置文件: ${target}`);
  });

program
  .command('entry <file>')
  .description('entry 【file】入口文件配置')
  .action(async (file) => {
    config.isEntry = true;
    config.isDefault = true;
    await entryFile(file);
  });

program
  .command('build <file>')
  .description('build 【file】 package.json 脚本配置入口文件命令专用')
  .action(async (file) => {
    config.isEntry = true;
    config.isBuild = true;
    config.isDefault = true;
    await entryFile(file);
  });

program.parse(process.argv);

// default behavior when no commands
if (!process.argv.slice(2).length && config.isDefault) {
  (async () => {
    await loadPwarc().catch(() => {});
    await loadProjectPwarc().catch(() => {});
    // if no args given, fallback to default entry
    if (!config.isEntry) {
      await entryFile(config.defaultEntry);
    }
  })();
}