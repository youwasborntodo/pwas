#!/usr/bin/env node
'use strict';

//pwa
var fs = require('fs');
var path = require('path');
var PKG = require('./package.json');
var program = require("commander");
var terser = require('terser');
var jsDom = require("jsdom");
var SW_MODEL_EXPORT = 'self.addEventListener(\'install\', e => {\n        console.log(\'installing.........\')\n        e.waitUntil(\n            caches.open(edition).then(cache => {\n                fileList.forEach((file, index) => {\n                    cache.add(file).then(() => {\n                        // console.log(\'installed===>\', file)\n                        // console.log(\'fileList.len===>\', fileList.length)\n                        if (index == fileList.length - 1) {\n                            // \u5224\u65AD\u662F\u5426\u5B89\u88C5\u5B8C\u6210\n                            console.log(\'files installed\')\n                            // const myObj2 = {\n                            //     from: \'installing......\',\n                            //     content: edition\n                            // }\n                            // arrived.postMessage(myObj2)\n                            self.skipWaiting()\n                        }\n                    }).catch(err => {\n                        console.error(err)\n                    })\n                })\n            })\n        )\n    })\n\n    function deleteCache() {\n        // \u8FC7\u6EE4\u5220\u9664\u9664\u5F53\u524D\u7248\u672C\u4E4B\u5916\u7684\u6240\u6709\u7F13\u5B58\n        caches.keys().then(list => {\n            // console.log(list)\n            return Promise.all(\n                list.filter(cacheName => {\n                    return cacheName != edition\n                }).map(cacheName => {\n                    return caches.delete(cacheName)\n                })\n            )\n        }).catch(err => {\n            console.error(err)\n        })\n    }\n    // self.addEventListener(\'installed\', e => {\n    //     console.log(\'\u3010service worker\u3011====> \' + edition + \'is installed!\')\n    // })\n\n    self.addEventListener(\'error\', event => {\n        // \u76D1\u542C\u5176\u5B83\u9519\u8BEF\n        console.error(\'error==>\', event)\n    })\n\n    self.addEventListener(\'unhandledrejection\', event => {\n        // \u8DE8\u57DF\u52A0\u8F7D\u8D44\u6E90\u51FA\u9519\u65F6\n        console.error(\'unhandledrejection==>\', event)\n    })\n\n    self.addEventListener(\'activate\', e => {\n        console.log(\'service worker \' + edition + \' is running!\')\n        // arrived.onmessage = function (e) {\n        //     console.log(\'activate========>\', e.data)\n        // }\n        // const myObj2 = {\n        //     from: \'activate\',\n        //     content: \'worker\'\n        // }\n        // arrived.postMessage(myObj2)\n        e.waitUntil(deleteCache())\n    })\n\n    self.addEventListener(\'fetch\', e => {\n        if (e.request.method !== \'GET\') {\n            return;\n        }\n        // const url = new URL(e.request.url)\n        e.respondWith(\n            caches.match(e.request).then(res => {\n                if (res) {\n                    return res\n                }\n                let fetchRequest = e.request.clone()\n                return fetch(fetchRequest).then(response => {\n                    if (!response || response.status != 200 || response.type != \'basic\') {\n                        return response\n                    }\n                    // \u590D\u5236\u8BF7\u6C42\n                    const responseToCache = response.clone()\n                    const getFile = fetchRequest.url.replace(fetchRequest.referrer, \'/\')\n                    // if (fileList.includes(getFile)) {\n                    // \u5224\u65AD\u5F53\u524D\u8BF7\u6C42\u7684\u6587\u4EF6\u662F\u5426\u5728\u5141\u8BB8\u7F13\u5B58\u7684\u6587\u4EF6\u914D\u7F6E\u5217\u8868\u4E2D\n                    caches.open(edition).then(cache => {\n\n\n                        cache.put(e.request, responseToCache)\n\n                    })\n                    // }\n                    return response\n                })\n            })\n        )\n    })\n    ';
var JSDOM = jsDom.JSDOM;

var attrFileList = [];
var config = {
  buildDir: 'pwa/',
  relativeFile: 'sw.js',
  entryScript: 'entry_sw.js',
  defaultEntry: 'index.html', // 如果不指定入口文件，默认在执行目录下查找index.html
  relativeFilePath: null,
  iconsPath: 'icons/',
  isBuild: false,
  isEntry: false, // 判断是否指定入口文件
  isDefault: true, // 是否执行默认操作      
  relativePath: process.cwd() ? process.cwd() : process.env.pwd,
  icons: [{
    "src": "/img/icon_s.png",
    "sizes": "48x48",
    "type": "image/png"
  }, {
    "src": "/img/icon.png",
    "sizes": "96x96",
    "type": "image/png"
  }, {
    "src": "/img/icon_m.png",
    "sizes": "152x152",
    "type": "image/png"
  }, {
    "src": "/img/icon_x.png",
    "sizes": "192x192",
    "type": "image/png"
  }, {
    "src": "/img/icon_xx.png",
    "sizes": "256x256",
    "type": "image/png"
  }]
};
var exceptFile = ['node_modules', 'package.json', config.entryScript];

// 定义版本和参数选项
program.command('version').description('查看当前版本').action(function () {
  config.isDefault = false;
  console.log('当前版本:', PKG.version);
});

program.command('entry <file>').description('entry 【file】入口文件配置').action(function (file) {
  // 判断有没有带入文件名，后期加入文件夹前缀功能
  config.isEntry = true;
  config.isDefault = true;
  entryFile(file);
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
  entryFile(file);
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
  var path = null;
  if (/\//mg.test(file)) {
    //  判断是否带有路径
    if (/(^.+\/)(\S+.html)$/mg.test(file)) {
      var fileExec = /(^.+\/)(\S+.html)$/mg.exec(file);
      path = fileExec[1];
      fileName = fileExec[2];
      config.defaultEntry = fileName;
      config.relativeFilePath = path;
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
  filePath = process.env.os && process.env.os == 'Windows_NT' ? config.relativePath + "\\" + file : config.relativePath + "/" + file;
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
    if (!htmlText.includes('<script src="' + config.buildDir + config.entryScript + '"></script>')) {
      // 判断是否己经存在注册入口文件
      var replaceText = '<script src="' + config.buildDir + config.entryScript + '"></script></body>';
      newHTML = htmlText.replace('</body>', replaceText);
    } else {
      newHTML = htmlText;
    }
    if (!newHTML.includes('<link rel="manifest" href="' + config.buildDir + 'manifest.json">')) {
      // 判断是否己经存在Manifest.json文件
      var _replaceText = '<link rel="manifest" href="' + config.buildDir + 'manifest.json">\n      </head>';
      newHTML = newHTML.replace('</head>', _replaceText);
    }
    createFile(file, newHTML);
    var htmlDom = new JSDOM(htmlText);
    var parentDOM = htmlDom.window.document;
    getChildNodes(parentDOM);
    // console.log(attrFileList)
    attrFileList.push(config.defaultEntry);
    var buildPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir;
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
  var SW_DATA = '\n    // serviceWorker.js\n    const edition = \'pwas:' + buildTime + '\'\n    const fileList = [\n  ';
  list.forEach(function (str) {
    SW_DATA += '\'' + str + '\',\n      ';
  });
  SW_DATA += '\n        ]  \n    ';
  SW_DATA = SW_DATA + SW_MODEL_EXPORT;
  createServiceWorkerFile(SW_DATA);
  // })
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

var Manifest = '\n    {\n      "name": "PWA\u5E94\u7528",\n      "short_name": "\u6D4B\u8BD5\u540D\u79F0",\n      "description": "\u8FD9\u53EA\u662F\u4E00\u4E2A\u6D4B\u8BD5\u5E94\u7528\uFF01",\n      "start_url": "' + config.defaultEntry + '",\n      "display": "standalone",\n      "orientation": "any",\n      "background_color": "#ACE",\n      "theme_color": "#ACE",\n      "icons": [{\n            "src": "' + config.iconsPath + 'icon_s.png",\n            "sizes": "48x48",\n            "type": "image/png"\n          },{\n            "src": "' + config.iconsPath + 'icon.png",\n            "sizes": "96x96",\n            "type": "image/png"\n          },{\n            "src": "' + config.iconsPath + 'icon_m.png",\n            "sizes": "152x152",\n            "type": "image/png"\n          },{\n            "src": "' + config.iconsPath + 'icon_x.png",\n            "sizes": "192x192",\n            "type": "image/png"\n          },{\n            "src": "' + config.iconsPath + 'icon_xx.png",\n            "sizes": "256x256",\n            "type": "image/png"\n          }]\n    }\n';

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
      if (bufferList.length == config.icons.length) {
        bufferList.forEach(function (data) {
          // 处理异步问题
          createFile(data.target, data.buffer);
        });
      }
    }
  });
}
var bufferList = [];
function multipleCreateImageFile(targetPath) {
  // 批量操作图片文件
  config.icons.forEach(function (file) {
    // console.log(file.src)
    var target = null;
    var pathSplit = file.src.split('/');
    var fileName = pathSplit[pathSplit.length - 1];
    target = targetPath + fileName;
    var source = __dirname + file.src;
    createImageFile(source, target);
  });
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
  var manifestPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir;
  // console.log('manifestPath==>', manifestPath)
  fs.exists(manifestPath, function (exists) {
    if (exists) {
      createFile(manifestPath + 'manifest.json', Manifest);
    } else {
      fs.mkdir(manifestPath, function (err) {
        if (err) {
          console.log(err);
          throw new Error(manifestPath + "创建目录失败！");
        } else {
          createFile(manifestPath + 'manifest.json', Manifest);
        }
      });
    }
  });
}

function createServiceWorkerFile(data) {
  // 创建Service Worker文件
  var serviceWorkerFileName = config.relativePath + '/' + config.relativeFilePath + config.relativeFile;
  var entryScript = config.relativePath + '/' + config.relativeFilePath + config.buildDir + config.entryScript;
  var indexFileData = '\n  if (navigator.serviceWorker) {\n    navigator.serviceWorker.register(\'/' + config.relativeFile + '\', {scope: "/"}).then(res => {\n      // console.log(\'service worker is registered\', res)\n      let sw = null, state;\n      if (res.installing) {\n        sw = res.installing\n        state = \'installing\'\n      } else if (res.waiting) {\n        // \u66F4\u65B0\u5B8C\u6210\u7B49\u5F85\u8FD0\u884C\n        sw = res.waiting\n        state = \'waiting\'\n      } else if (res.active) {\n        // \u66F4\u65B0\u5B8C\u6210\u6FC0\u6D3B\u72B6\u6001\n        sw = res.active\n        state = \'activated\'\n      } else if (res.redundant) {\n        // \u65B0\u7684\u7F13\u5B58\u751F\u6548\u540E\u4E4B\u524D\u7684\u7F13\u5B58\u4F1A\u8FDB\u5165\u6B64\u72B6\u6001\n        sw.res.redundant\n        state = \'redundant\'\n      }\n      if (state) {\n        console.log(\'\u3010---SW---\u3011 state is \' + state)\n        if (state === \'waiting\') {\n          // \u5237\u65B0\u540E\u5224\u65AD\u662F\u5426\u4E3A\u7B49\u5F85\u72B6\u6001\n          // self.skipWaiting()\n        }\n      }\n  \n      if (sw) {\n        sw.onStateChange = () => {\n          console.log(\'sw state is \' + sw.state)\n        }\n      }\n    }).catch(err => {\n      console.error(\'something error is happened\', err)\n    })\n\n  }\n  ';
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
  entryFile(config.defaultEntry);
}
