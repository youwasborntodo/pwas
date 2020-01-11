#!/usr/bin/env node
'use strict';

//pwa
var fs = require('fs');
var request = require('request');
var images = require('images');
var path = require('path');
var PKG = require('./package.json');
var program = require("commander");
var terser = require('terser');
var jsDom = require("jsdom");
var SW_MODEL_EXPORT = 'self.addEventListener(\'install\', e => {\n        console.log(\'installing.........\')\n        e.waitUntil(\n            caches.open(edition).then(cache => {\n                fileList.forEach((file, index) => {\n                    cache.add(file).then(() => {\n                        // console.log(\'installed===>\', file)\n                        // console.log(\'fileList.len===>\', fileList.length)\n                        if (index == fileList.length - 1) {\n                            // \u5224\u65AD\u662F\u5426\u5B89\u88C5\u5B8C\u6210\n                            console.log(\'files installed\')\n                            // const myObj2 = {\n                            //     from: \'installing......\',\n                            //     content: edition\n                            // }\n                            // arrived.postMessage(myObj2)\n                            self.skipWaiting()\n                        }\n                    }).catch(err => {\n                        console.error(err)\n                    })\n                })\n            })\n        )\n    })\n\n    function deleteCache() {\n        // \u8FC7\u6EE4\u5220\u9664\u9664\u5F53\u524D\u7248\u672C\u4E4B\u5916\u7684\u6240\u6709\u7F13\u5B58\n        caches.keys().then(list => {\n            // console.log(list)\n            return Promise.all(\n                list.filter(cacheName => {\n                  if (cacheName.includes(\'@\')){\n                    // console.log(\'cacheName--->\', cacheName.split(\'@\'))\n                    // console.log(\'edition--->\', edition.split(\'@\'))\n                    const cacheTime = cacheName.split(\'@\')[1]\n                    const cacheLabel = cacheName.split(\'@\')[0]\n                    const editionLabel = edition.split(\'@\')[0]\n                    const editionTime = edition.split(\'@\')[1]\n                    if (cacheLabel == editionLabel) {\n                        return cacheTime != editionTime\n                    }\n                } else {\n                    return cacheName != edition\n                }\n                }).map(cacheName => {\n                    return caches.delete(cacheName)\n                })\n            )\n        }).catch(err => {\n            console.error(err)\n        })\n    }\n    // self.addEventListener(\'installed\', e => {\n    //     console.log(\'\u3010service worker\u3011====> \' + edition + \'is installed!\')\n    // })\n\n    self.addEventListener(\'error\', event => {\n        // \u76D1\u542C\u5176\u5B83\u9519\u8BEF\n        console.error(\'error==>\', event)\n    })\n\n    self.addEventListener(\'unhandledrejection\', event => {\n        // \u8DE8\u57DF\u52A0\u8F7D\u8D44\u6E90\u51FA\u9519\u65F6\n        console.error(\' \u8DE8\u57DF\u52A0\u8F7D\u8D44\u6E90\u7F13\u5B58\u5931\u8D25\uFF0C\u6682\u4E0D\u652F\u6301\u8DE8\u57DF\u8D44\u6E90==>\', event)\n    })\n\n    self.addEventListener(\'activate\', e => {\n        console.log(\'service worker \' + edition + \' is running!\')\n        // arrived.onmessage = function (e) {\n        //     console.log(\'activate========>\', e.data)\n        // }\n        // const myObj2 = {\n        //     from: \'activate\',\n        //     content: \'worker\'\n        // }\n        // arrived.postMessage(myObj2)\n        e.waitUntil(deleteCache())\n    })\n\n    self.addEventListener(\'fetch\', e => {\n        if (e.request.method !== \'GET\') {\n            return;\n        }\n        // const url = new URL(e.request.url)\n        e.respondWith(\n            caches.match(e.request).then(res => {\n                if (res) {\n                    return res\n                }\n                let fetchRequest = e.request.clone()\n                return fetch(fetchRequest).then(response => {\n                    if (!response || response.status != 200 || response.type != \'basic\') {\n                        return response\n                    }\n                    // \u590D\u5236\u8BF7\u6C42\n                    const responseToCache = response.clone()\n                    const getFile = fetchRequest.url.replace(fetchRequest.referrer, \'/\')\n                    const getFileSplit = getFile.split(\'/\')\n                    const getFileName = getFileSplit[getFileSplit.length-1].split(\'?\')[0]\n                    if (!exclude.includes(getFileName)) {\n                      // \u5224\u65AD\u5F53\u524D\u8BF7\u6C42\u7684\u6587\u4EF6\u662F\u5426\u5728\u5141\u8BB8\u7F13\u5B58\u7684\u6587\u4EF6\u914D\u7F6E\u5217\u8868\u4E2D\n                      caches.open(edition).then(cache => {\n                          cache.put(e.request, responseToCache)\n                      })\n                    }\n                    return response\n                })\n            })\n        )\n    })\n    ';
var JSDOM = jsDom.JSDOM;

var attrFileList = [];
var config = {
  buildDir: 'static/pwa/', // 资源构建路径，主要包括icon图标等文件，如果此目录单独生成，在使用Nginx反向代理的时候需要对此文件夹做处理
  scope: './',
  redirectPath: '', // 如果网站开启了nginx反向代理，可能需要对实际访问路径进行配置
  registerFile: 'sw.js',
  entryScript: 'entry_sw.js',
  defaultEntry: 'index.html', // 如果不指定入口文件，默认在执行目录下查找index.html
  iconsPath: 'icons/',
  manifestUrl: '',
  relativeFilePath: '',
  isWindows: process.env.os && process.env.os == 'Windows_NT',
  cacheName: "index",
  exclude: [],
  iconUrl: '',
  isBuild: false,
  createIcon: false,
  isConfig: false, // 判断是否读取配置文件
  isEntry: false, // 判断是否指定入口文件
  isDefault: true, // 是否执行默认操作      
  relativePath: process.cwd() ? process.cwd() : process.env.pwd,
  manifest: {
    name: 'PWAs应用',
    icons: [{
      "src": "icon_ss.png",
      "sizes": "32x32",
      "type": "image/png"
    }, {
      "src": "icon_s.png",
      "sizes": "48x48",
      "type": "image/png"
    }, {
      "src": "icon.png",
      "sizes": "96x96",
      "type": "image/png"
    }, {
      "src": "icon_m.png",
      "sizes": "152x152",
      "type": "image/png"
    }, {
      "src": "apple-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }, {
      "src": "icon_x.png",
      "sizes": "192x192",
      "type": "image/png"
    }, {
      "src": "icon_xx.png",
      "sizes": "256x256",
      "type": "image/png"
    }]
  }
};
var iconsTargetPath = '' + config.buildDir + config.iconsPath;
var Manifest = {};
var iconList = [];
var pwarcPath = config.isWindows ? config.relativePath + "\\.pwarc" : config.relativePath + "/.pwarc";
// console.log('pwarcPath======>', pwarcPath)
function init(file) {
  fs.readFile(pwarcPath, 'utf-8', function (err, data) {
    // 读取默认配置
    if (!err) {
      console.log('读取配置文件.....');
      config.isConfig = true;
      var pwarc = JSON.parse(data);
      config.buildDir = pwarc.buildDir;
      config.scope = pwarc.scope;
      config.cacheName = pwarc.cacheName;
      config.exclude = pwarc.exclude;
      config.iconUrl = pwarc.iconUrl;
      config.redirectPath = pwarc.redirectPath;
      config.createIcon = pwarc.createIcon;
      config.registerFile = pwarc.registerFile;
      config.entryScript = pwarc.entryScript;
      // config.iconsPath = pwarc.iconsPath
      config.manifest = pwarc.manifest;
      Manifest = pwarc.manifest;
      Manifest.icons.forEach(function (img) {
        iconList.push(img.src);
        img.src = iconsTargetPath + img.src;
      });
    } else {
      console.log('使用默认配置......');
    }
    entryFile(file);
  });
}

var exceptFile = ['node_modules', 'package.json', config.entryScript];

// 定义版本和参数选项
program.command('version').description('查看当前版本').action(function () {
  config.isDefault = false;
  console.log('当前版本:', PKG.version);
});

program.command('init').description('生成config.pwarc配置文件').action(function () {
  config.isDefault = false;
  var dir = __dirname + '/pwarc.json';
  fs.readFile(dir, 'utf-8', function (err, data) {
    if (err) {
      console.log(err);
      throw new Error('配置文件创建失败！');
    }
    createFile(pwarcPath, data);
  });
});

program.command('entry <file>').description('entry 【file】入口文件配置').action(function (file) {
  // 判断有没有带入文件名，后期加入文件夹前缀功能
  config.isEntry = true;
  config.isDefault = true;
  init(file);
}).on('--help', function () {
  console.log('');
  console.log('Entry file【入口文件配置】:');
  console.log('');
  console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
  console.log('');
});

program.command('build <file>').description('build 【file】package.json 脚本配置入口文件命令专用').action(function (file) {
  // 判断有没有带入文件名，后期加入文件夹前缀功能
  config.isEntry = true;
  config.isBuild = true;
  config.isDefault = true;
  init(file);
}).on('--help', function () {
  console.log('');
  console.log('Entry file【入口文件配置】:');
  console.log('');
  console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
  console.log('');
});

program.command('--help').description('查看当前帮助选项').action(function () {
  config.isDefault = false;
  console.log('entry <file>【入口文件配置】');
  console.log('');
  console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
  console.log('');
  console.log('pwas init 【生成配置文件.pwarc，项目的package.json目录执行】');
  console.log('');
});
// 必须在.parse()之前，因为node的emit()是即时的
program.parse(process.argv);

function readFileList(dir) {
  var filesList = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

  var files = fs.readdirSync(dir);
  // console.log('files===>', files);
  files.forEach(function (item, index) {
    var fullPath = path.join(dir, item);
    var stat = fs.statSync(fullPath);

    if (!exceptFile.includes(item)) {
      // 判断是否需要过滤的文件或者文件夹
      if (stat.isDirectory()) {
        // 判断是否是文件夹
        readFileList(path.join(dir, item), filesList);
      } else {
        var relativePath = fullPath.replace(__dirname, "").replace(/\\/g, '/');
        filesList.push(relativePath);
      }
    }
  });
  return filesList;
}

var filesList = [];

function entryFile(file) {
  // 入口文件
  var filePath = null;
  var fileName = null;
  var fileFath = null;
  if (/\//mg.test(file)) {
    //  判断是否带有路径
    if (/(^.+\/)(\S+.html)$/mg.test(file)) {
      var fileExec = /(^.+\/)(\S+.html)$/mg.exec(file);
      fileFath = fileExec[1];
      fileName = fileExec[2];
      config.defaultEntry = fileName;
      config.relativeFilePath = fileFath;
    } else {
      throw new Error('请确认输入的路径格式是否正确！');
    }
  } else {
    config.defaultEntry = file;
    config.relativeFilePath = '';
  }

  // console.log("process.env====>", relativePath);
  if (config.isBuild) {
    // 判断是否为package.json 集成脚本构建
    // relativePath = relativePath.replace('\\node_modules\\pwas', '')
    // filePath = config.relativePath
    console.log('building.........');
  }
  if (!config.isConfig) {
    var dir = __dirname + '/pwarc.json';
    fs.readFile(dir, 'utf-8', function (err, data) {
      if (err) {
        console.log(err);
        Manifest = config.manifest;
      }
      var manifestConfig = JSON.parse(data);
      Manifest = manifestConfig.manifest;
      Manifest.icons.forEach(function (img) {
        iconList.push(img.src);
        img.src = iconsTargetPath + img.src;
      });
    });
  }
  filePath = config.isWindows ? config.relativePath + "\\" + file : config.relativePath + "/" + file;
  var htmlText = null;
  // console.log('filePath======>', filePath)
  fs.readFile(filePath, 'utf-8', function (err, data) {
    if (err) {
      var msg = '\n          \u9519\u8BEF\u63D0\u793A\u3010Error msg\u3011\n\n          \u539F\u56E0\uFF1A\u672A\u627E\u5230\u8BE5\u6587\u4EF6: ' + filePath + '\uFF0C\u8BF7\u68C0\u67E5\u6307\u5B9A\u7684\u5165\u53E3\u6587\u4EF6\u662F\u5426\u5B58\u5728\uFF01\n        \n          \u63D0\u793A\uFF1A\u53EF\u4EE5\u81EA\u5B9A\u4E49\u5165\u53E3\u6587\u4EF6,\u4F8B\u5982\u3010entry index.html\u3011 \n\n          \u9700\u8981\u4E86\u89E3\u5176\u5B83\u5E2E\u52A9\u4FE1\u606F\u53EF\u4EE5\u8F93\u5165\u3010 --help\u3011\n            ';
      console.error(msg);
      return false;
    }
    htmlText = data;
    var newHTML = '';
    var entryScript = '<script src="' + config.buildDir + config.entryScript + '"></script>';
    if (!htmlText.includes(entryScript)) {
      // 判断是否己经存在注册入口文件
      var replaceText = entryScript + '\n      </body>';
      newHTML = htmlText.replace('</body>', replaceText);
    } else {
      newHTML = htmlText;
    }
    var buildTime = new Date().getTime();
    var manifest = '<link rel="manifest" id="insertManifest" href="manifest.json?t=' + buildTime + '">';
    if (!newHTML.includes('<link rel="manifest" id="insertManifest"')) {
      // 判断是否己经存在Manifest.json文件
      var _replaceText = manifest + '\n      </head>';
      newHTML = newHTML.replace('</head>', _replaceText);
    } else {
      newHTML = newHTML.replace(/manifest.json\?t=\d+/mg, 'manifest.json?t=' + buildTime);
    }
    if (config.createIcon) {
      // 判断是否开启PWA安装图标配置
      var icon = '\n        <link rel="apple-touch-icon" sizes="180x180" href="' + config.buildDir + config.iconsPath + 'apple-icon.png"/>\n        <meta name="mobile-web-app-capable" content="yes">\n        <meta name="apple-mobile-web-app-status-bar-style" content="white">\n        <meta name="apple-mobile-web-app-title" content="' + Manifest.name + '">\n        <meta name="application-name" content="' + Manifest.name + '">\n        <link rel="icon" type="image/png" href="' + config.buildDir + config.iconsPath + 'icon_ss.png" sizes="32x32"/>\n        ';
      if (!newHTML.includes(icon)) {
        // 判断是否己经存在Manifest.json文件
        var _replaceText2 = '</title>' + icon;
        newHTML = newHTML.replace('</title>', _replaceText2);
      }
    }
    createFile(file, newHTML);
    var htmlDom = new JSDOM(htmlText);
    var parentDOM = htmlDom.window.document;
    getChildNodes(parentDOM);
    // console.log(attrFileList)
    attrFileList.push(config.defaultEntry);
    var buildPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir;
    // console.log('buildPath=====', buildPath)
    function mkdirsSync(dirname) {
      if (fs.existsSync(dirname)) {
        return true;
      } else {
        if (mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname);
          console.log('目录创建成功' + dirname);
          return true;
        }
      }
    }
    mkdirsSync(config.buildDir, function () {
      console.log('创建完成！');
      copyServiceWorkerFile(attrFileList);
    });
    fs.exists(buildPath, function (exists) {
      // 创建文件夹是否存在
      if (exists) {
        copyServiceWorkerFile(attrFileList);
      } else {
        fs.mkdir(buildPath, function (err) {
          if (err) {
            console.log(err);
            throw new Error(buildPath + "创建目录失败！");
          } else {
            copyServiceWorkerFile(attrFileList);
          }
        });
      }
    });
  });
}

function copyServiceWorkerFile(list) {
  // 拼接sw.js文件
  var dateTime = new Date();
  var buildTime = dateTime.toLocaleString().replace(' ', '|');
  // console.log('edition', buildTime)
  var SW_DATA = '\n    // serviceWorker.js\n    const edition = \'pwas[' + config.cacheName + ']@' + buildTime + '\'\n    const fileList = [\n  ';
  list.forEach(function (file) {
    SW_DATA += '\'' + file + '\',\n      ';
  });
  SW_DATA += ']';
  if (config.exclude.length > 0) {
    SW_DATA += '\n      // \u6392\u9664\u4E0D\u9700\u8981\u7F13\u5B58\u7684\u6587\u4EF6\n      const exclude = [';
    config.exclude.forEach(function (file) {
      SW_DATA += '\'' + file + '\',\n        ';
    });
    SW_DATA += ']';
  } else {
    SW_DATA += '\n      const exclude = []\n      ';
  }

  SW_DATA = SW_DATA + SW_MODEL_EXPORT;
  createServiceWorkerFile(SW_DATA);
}

function getChildNodes(node) {
  // 获取所有节点
  if (node.hasChildNodes()) {
    var doms = node.childNodes;
    doms.forEach(function (child) {
      if (child.nodeType == 1) {
        // domList.push(child.nodeName);
        getChildNodes(child);
        getAttrList(child);
      }
    });
  }
}

function getAttrList(node) {
  // 过滤链接文件列表
  switch (node.nodeName) {
    case 'LINK':
    case 'A':
      var href = node.getAttribute('href');
      // console.log(href)
      if (href) {
        attrFileList.push(href);
      }
      break;
    case 'SCRIPT':
    case 'IMG':
      var src = node.getAttribute('src');
      // console.log(src)
      if (src) {
        attrFileList.push(src);
      }
      break;
    default:
    // console.log(node.nodeName)
  }
}

function createImageFile(source, target) {
  // 创建manifest.json 图标
  fs.readFile(source, function (err, buffer) {
    if (err) {
      console.error(err);
      throw new Error('请检查图片格式或者源路径是否正确！');
    } else {
      // console.log(source, '读取图片成功')
      var item = {
        buffer: buffer,
        target: target
      };
      bufferList.push(item);
      if (bufferList.length == iconList.length) {
        bufferList.forEach(function (data) {
          // 处理异步问题
          createFile(data.target, data.buffer);
        });
      }
    }
  });
}

function resetImage(pathTarget) {
  var pathName = pathTarget + 'icon.png';
  var writeStream = fs.createWriteStream(pathName);
  var readStream = request(config.iconUrl);
  var sizeList = [{
    name: 'icon_ss.png',
    size: 32
  }, {
    name: 'icon_s.png',
    size: 64
  }, {
    name: 'icon.png',
    size: 96
  }, {
    name: 'icon_m.png',
    size: 152
  }, {
    name: 'icon_x.png',
    size: 192
  }, {
    name: 'icon_xx.png',
    size: 256
  }];
  readStream.pipe(writeStream);
  writeStream.on('finish', function () {
    images(pathTarget + 'icon.png').size(180).fill(255, 255, 255).draw(images(pathTarget + 'icon.png').size(160), 10, 10).save(pathTarget + 'apple-icon.png', { quality: 100 });
    sizeList.map(function (data) {
      images(pathTarget + 'icon.png').size(data.size).save(pathTarget + data.name, { quality: 100 });
    });
    console.log('Icon创建成功！');
  });
  writeStream.on('error', function () {
    console.log('Icon获取失败，请检查配置链接是否正确！');
  });
}

var bufferList = [];
function multipleCreateImageFile(targetPath) {
  // 批量操作图片文件
  if (config.iconUrl) {
    resetImage(targetPath);
  } else {
    iconList.forEach(function (src) {
      // console.log(src)
      var target = null;
      var pathSplit = src.split('/');
      var fileName = pathSplit[pathSplit.length - 1];
      target = targetPath + fileName;
      var source = __dirname + '/img/' + src;
      createImageFile(source, target);
    });
  }
}
function createManifestFile() {
  // 创建manifest.json文件
  var targetPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir + config.iconsPath;
  fs.exists(targetPath, function (exists) {
    // 创建文件夹是否存在
    if (exists) {
      multipleCreateImageFile(targetPath);
    } else {
      fs.mkdir(targetPath, function (err) {
        if (err) {
          console.log(err);
          throw new Error(targetPath + "创建目录失败！");
        } else {
          multipleCreateImageFile(targetPath);
        }
      });
    }
  });
  var manifestPath = config.relativePath + '/' + config.relativeFilePath;
  // console.log('manifestPath==>', manifestPath)
  Manifest.start_url = config.defaultEntry;
  var ManifestStream = JSON.stringify(Manifest);
  fs.exists(manifestPath, function (exists) {
    if (exists) {
      createFile(manifestPath + 'manifest.json', ManifestStream);
    } else {
      fs.mkdir(manifestPath, function (err) {
        if (err) {
          console.log(err);
          throw new Error(manifestPath + "创建目录失败！");
        } else {
          createFile(manifestPath + 'manifest.json', ManifestStream);
        }
      });
    }
  });
}

function createServiceWorkerFile(data) {
  // 创建Service Worker文件
  var serviceWorkerFileName = config.relativePath + '/' + config.relativeFilePath + config.registerFile;
  var entryScript = config.relativePath + '/' + config.relativeFilePath + config.buildDir + config.entryScript;
  var indexFileData = '\n  if (navigator.serviceWorker) {\n    navigator.serviceWorker.register(\'' + config.redirectPath + '/' + config.registerFile + '\', {scope: "' + config.scope + '"}).then(res => {\n      // console.log(\'service worker is registered\', res)\n      let sw = null, state;\n      if (res.installing) {\n        sw = res.installing\n        state = \'installing\'\n      } else if (res.waiting) {\n        // \u66F4\u65B0\u5B8C\u6210\u7B49\u5F85\u8FD0\u884C\n        sw = res.waiting\n        state = \'waiting\'\n      } else if (res.active) {\n        // \u66F4\u65B0\u5B8C\u6210\u6FC0\u6D3B\u72B6\u6001\n        sw = res.active\n        state = \'activated\'\n      } else if (res.redundant) {\n        // \u65B0\u7684\u7F13\u5B58\u751F\u6548\u540E\u4E4B\u524D\u7684\u7F13\u5B58\u4F1A\u8FDB\u5165\u6B64\u72B6\u6001\n        sw.res.redundant\n        state = \'redundant\'\n      }\n      if (state) {\n        console.log(\'\u3010---SW---\u3011 state is \' + state)\n        if (state === \'waiting\') {\n          // \u5237\u65B0\u540E\u5224\u65AD\u662F\u5426\u4E3A\u7B49\u5F85\u72B6\u6001\n          // self.skipWaiting()\n        }\n      }\n  \n      if (sw) {\n        sw.onStateChange = () => {\n          console.log(\'sw state is \' + sw.state)\n        }\n      }\n    }).catch(err => {\n      console.error(\'something error is happened\', err)\n    })\n    const getURL = new XMLHttpRequest();\n    const getManifestUrl = ' + (config.manifestUrl ? config.manifestUrl : null) + '\n    const url = getManifestUrl ? getManifestUrl : location.origin + \'' + config.redirectPath + '/manifest.json\'\n    getURL.open("GET",url, true);\n    getURL.send();\n    getURL.addEventListener(\'readystatechange\', function(){\n        if(getURL.readyState==4&&getURL.status==200){\n          // const res = JSON.parse(getURL.responseText)\n          // const dataString = JSON.stringify(getURL.responseText)\n          const blob = new Blob([getURL.responseText], {type: \'application/json\'})\n          const manifestURL = URL.createObjectURL(blob)\n          document.querySelector("#insertManifest").setAttribute(\'href\', manifestURL)\n        }\n    })\n    window.uninstallServiceWorker = function (cacheName) {\n      // \u5982\u679C\u6CA1\u6709\u6307\u5B9A\u9700\u8981\u5220\u9664\u7684cacheName\uFF0C\u9ED8\u8BA4\u5168\u90E8\u5220\u9664\n        navigator.serviceWorker.getRegistration().then(registrations => {\n        console.log(\'registrations\', registrations)\n        registrations.unregister()\n      })\n      deleteCache(cacheName)\n    }\n    function deleteCache(deleteName) {\n      // \u5220\u9664\u6240\u6709\u7F13\u5B58\n      caches.keys().then(list => {\n          return Promise.all(\n              list.map(cacheName => {\n                if (deleteName) {\n                  const execName = /^pwas[(S+)].+/.exec(cacheName)[1]\n                  if (execName == deleteName) {\n                    return caches.delete(cacheName)\n                  } \n                } else {\n                  return caches.delete(cacheName)\n                }    \n              })\n          )\n      }).catch(err => {\n          console.error(err)\n      })\n    }\n  }\n  ';

  var pathDir = config.relativePath + '/' + config.relativeFilePath + config.buildDir; // 目前配置是当前路径，后期需要增加自定义路径功能，预留路径判断功能
  // terser 
  var options = {
    toplevel: true,
    compress: {
      global_defs: {
        "@console.log": "console.info"
      },
      passes: 2
    },
    output: {
      beautify: false,
      preamble: "/* minified */"
    }
  };
  var result = terser.minify(data, options);
  // console.log(pathDir)
  var uglifyDealWithData = result.code;
  fs.exists(pathDir, function (exists) {
    if (exists) {
      // 判断当前路径是否存在
      createFile(serviceWorkerFileName, uglifyDealWithData);
      createFile(entryScript, indexFileData);
    } else {
      fs.mkdir(pathDir, function (err) {
        // 创建文件夹
        if (err) {
          return false;
        } else {
          createFile(serviceWorkerFileName, uglifyDealWithData);
          createFile(entryScript, indexFileData);
        }
      });
    }
  });
  createManifestFile();
}

function createFile(serviceWorkerFileName, data) {
  // 写入数据
  // console.log('开始写入', fileName)
  fs.writeFile(serviceWorkerFileName, data, "utf-8", function (err) {
    if (err) {
      console.error(err);
      return false;
    } else {
      console.log(serviceWorkerFileName, "写入成功");
    }
  });
}

if (!config.isEntry && config.isDefault) {
  // readFileList(__dirname, filesList)
  // 默认执行文件
  init(config.defaultEntry);
}
