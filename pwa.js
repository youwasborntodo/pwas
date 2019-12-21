#!/usr/bin/env node
//pwa
const fs = require('fs');
const path = require('path')
const PKG = require('./package.json')
const program = require("commander");
const terser = require('terser')
const jsDom = require("jsdom");
const SW_MODEL_EXPORT = `self.addEventListener('install', e => {
        console.log('installing.........')
        e.waitUntil(
            caches.open(edition).then(cache => {
                fileList.forEach((file, index) => {
                    cache.add(file).then(() => {
                        // console.log('installed===>', file)
                        // console.log('fileList.len===>', fileList.length)
                        if (index == fileList.length - 1) {
                            // 判断是否安装完成
                            console.log('files installed')
                            // const myObj2 = {
                            //     from: 'installing......',
                            //     content: edition
                            // }
                            // arrived.postMessage(myObj2)
                            self.skipWaiting()
                        }
                    }).catch(err => {
                        console.error(err)
                    })
                })
            })
        )
    })

    function deleteCache() {
        // 过滤删除除当前版本之外的所有缓存
        caches.keys().then(list => {
            // console.log(list)
            return Promise.all(
                list.filter(cacheName => {
                    return cacheName != edition
                }).map(cacheName => {
                    return caches.delete(cacheName)
                })
            )
        }).catch(err => {
            console.error(err)
        })
    }
    // self.addEventListener('installed', e => {
    //     console.log('【service worker】====> ' + edition + 'is installed!')
    // })

    self.addEventListener('error', event => {
        // 监听其它错误
        console.error('error==>', event)
    })

    self.addEventListener('unhandledrejection', event => {
        // 跨域加载资源出错时
        console.error('unhandledrejection==>', event)
    })

    self.addEventListener('activate', e => {
        console.log('service worker ' + edition + ' is running!')
        // arrived.onmessage = function (e) {
        //     console.log('activate========>', e.data)
        // }
        // const myObj2 = {
        //     from: 'activate',
        //     content: 'worker'
        // }
        // arrived.postMessage(myObj2)
        e.waitUntil(deleteCache())
    })

    self.addEventListener('fetch', e => {
        if (e.request.method !== 'GET') {
            return;
        }
        // const url = new URL(e.request.url)
        e.respondWith(
            caches.match(e.request).then(res => {
                if (res) {
                    return res
                }
                let fetchRequest = e.request.clone()
                return fetch(fetchRequest).then(response => {
                    if (!response || response.status != 200 || response.type != 'basic') {
                        return response
                    }
                    // 复制请求
                    const responseToCache = response.clone()
                    const getFile = fetchRequest.url.replace(fetchRequest.referrer, '/')
                    // if (fileList.includes(getFile)) {
                    // 判断当前请求的文件是否在允许缓存的文件配置列表中
                    caches.open(edition).then(cache => {


                        cache.put(e.request, responseToCache)

                    })
                    // }
                    return response
                })
            })
        )
    })
    `
const { JSDOM } = jsDom;
const attrFileList = []
const config = {
  buildDir: 'static/pwa/', // 资源构建路径，主要包括icon图标等文件，如果此目录单独生成，在使用Nginx反向代理的时候需要对此文件夹做处理
  scope: './',
  redirectPath: '', // 如果网站开启了nginx反向代理，可能需要对实际访问路径进行配置
  registerFile: 'sw.js',
  entryScript: 'entry_sw.js',
  defaultEntry: 'index.html', // 如果不指定入口文件，默认在执行目录下查找index.html
  iconsPath: 'icons/',
  relativeFilePath: '',
  isBuild: false,
  isEntry: false, // 判断是否指定入口文件
  isDefault: true, // 是否执行默认操作      
  relativePath: process.cwd() ? process.cwd() : process.env.pwd,
  name: 'PWAs应用',
  manifest: {
    icons: [{
      "src": "/img/icon_ss.png",
      "sizes": "32x32",
      "type": "image/png"
    },{
      "src": "/img/icon_s.png",
      "sizes": "48x48",
      "type": "image/png"
    },{
      "src": "/img/icon.png",
      "sizes": "96x96",
      "type": "image/png"
    },{
      "src": "/img/icon_m.png",
      "sizes": "152x152",
      "type": "image/png"
    },{
      "src": "/img/apple-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    },{
      "src": "/img/icon_x.png",
      "sizes": "192x192",
      "type": "image/png"
    },{
      "src": "/img/icon_xx.png",
      "sizes": "256x256",
      "type": "image/png"
    }]
  }
}
const pwarcPath = config.relativePath + '\\.pwarc'
// console.log('pwarcPath======', pwarcPath)
fs.readFile(pwarcPath, 'utf-8', (err, data) => {
  // 读取默认配置
  if (!err) {
    console.log('读取配置文件.....')
    const pwarc = JSON.parse(data)
    config.buildDir = pwarc.buildDir
    config.scope = pwarc.scope
    config.redirectPath = pwarc.redirectPath
    config.registerFile = pwarc.registerFile
    config.entryScript = pwarc.entryScript
    config.iconsPath = pwarc.iconsPath
    config.manifest = pwarc.manifest
  } else {
    console.log('使用默认配置......')
  }
})
const exceptFile= [
  'node_modules',
  'package.json',
  config.entryScript
]

// 定义版本和参数选项
program.command('version')
  .description('查看当前版本')
  .action(function() {
    config.isDefault = false
    console.log('当前版本:', PKG.version)
  })

program.command('init')
  .description('生成.pwarc配置文件')
  .action(function(){
    config.isDefault = false
    const dir = __dirname + '/pwarc.json'
    console.log('PWArc--------', dir)
    fs.readFile(dir, 'utf-8', (err, data) => {
      if(err) {
        console.log(err)
        throw new Error('配置文件创建失败！')
      }
      createFile(pwarcPath, data)
    })
  })

program.command('entry <file>')
  .description('entry 【file】入口文件配置')
  .action(function (file) {
    // 判断有没有带入文件名，后期加入文件夹前缀功能
    config.isEntry = true
    config.isDefault = true
    entryFile(file)
  }).on('--help', function () {
    console.log('');
    console.log('Entry file【入口文件配置】:');
    console.log('');
    console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
    console.log('');
  })

program.command('build <file>')
  .description('build 【file】package.json 脚本配置入口文件命令专用')
  .action(function (file) {
    // 判断有没有带入文件名，后期加入文件夹前缀功能
    config.isEntry = true
    config.isBuild = true
    config.isDefault = true
    entryFile(file)
  }).on('--help', function () {
    console.log('');
    console.log('Entry file【入口文件配置】:');
    console.log('');
    console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
    console.log('');
  })

program.command('--help')
    .description('查看当前帮助选项')
    .action(function () {
      config.isDefault = false
      console.log('entry <file>【入口文件配置】');
      console.log('');
      console.log('pwas entry index.html [Default:默认为空自动寻找 index.html]');
      console.log('');
    })
// 必须在.parse()之前，因为node的emit()是即时的
program.parse(process.argv);

function readFileList(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  // console.log('files===>', files);
  files.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (!exceptFile.includes(item)) {
      // 判断是否需要过滤的文件或者文件夹
      if (stat.isDirectory()) {
        // 判断是否是文件夹
        readFileList(path.join(dir, item), filesList);
      } else {
        const relativePath = fullPath.replace(__dirname, "").replace(/\\/g, '/')
        filesList.push(relativePath);
      }
    }

  });
  return filesList;
}

const filesList = []


function entryFile(file) {
  // 入口文件
  let filePath = null
  let fileName = null
  let fileFath = null
  if (/\//mg.test(file)) {
    //  判断是否带有路径
    if (/(^.+\/)(\S+.html)$/mg.test(file)) {
      const fileExec = /(^.+\/)(\S+.html)$/mg.exec(file)
      fileFath = fileExec[1]
      fileName = fileExec[2]
      config.defaultEntry = fileName
      config.relativeFilePath = fileFath
    } else {
      throw new Error('请确认输入的路径格式是否正确！')
    }
  } else {
    config.defaultEntry = file
    config.relativeFilePath = ''
  }

  // console.log("process.env====>", relativePath);
  if (config.isBuild) {
    // 判断是否为package.json 集成脚本构建
    // relativePath = relativePath.replace('\\node_modules\\pwas', '')
    // filePath = config.relativePath
    console.log('building.........')
  }
  filePath = process.env.os && process.env.os == 'Windows_NT' ? config.relativePath + "\\" + file : config.relativePath + "/" + file
  let htmlText = null
  // console.log('filePath======>', filePath)
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
          const msg = `
          错误提示【Error msg】

          原因：未找到该文件: ${filePath}，请检查指定的入口文件是否存在！
        
          提示：可以自定义入口文件,例如【entry index.html】 

          需要了解其它帮助信息可以输入【 --help】
            `;
      console.error(msg);
      return false
    }
    htmlText = data;
    let newHTML = ''
    const entryScript = `<script src="${config.buildDir}${config.entryScript}"></script>`
    if (!htmlText.includes(entryScript)) {
      // 判断是否己经存在注册入口文件
      const replaceText = `${entryScript}
      </body>`;
      newHTML = htmlText.replace(`</body>`, replaceText);
    } else {
      newHTML = htmlText
    }
    const manifest = `<link rel="manifest" href="manifest.json">`
    if (!newHTML.includes(manifest)) {
      // 判断是否己经存在Manifest.json文件
      const replaceText = `${manifest}
      </head>`;
      newHTML = newHTML.replace(`</head>`, replaceText);
    }
    const icon = `
    <link rel="apple-touch-icon" sizes="180x180" href="${config.buildDir}icons/apple-icon.png"/>
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="white">
    <meta name="apple-mobile-web-app-title" content="${config.name}">
    <meta name="application-name" content="${config.name}">
    <link rel="icon" type="image/png" href="${config.buildDir}icons/icon_ss.png" sizes="32x32"/>
    `
    if (!newHTML.includes(icon)) {
      // 判断是否己经存在Manifest.json文件
      const replaceText = `</title>${icon}`;
      newHTML = newHTML.replace(`</title>`, replaceText);
    }
    createFile(file, newHTML);
    const htmlDom = new JSDOM(htmlText);
    const parentDOM = htmlDom.window.document;
    getChildNodes(parentDOM);
    // console.log(attrFileList)
    attrFileList.push(config.defaultEntry);
    const buildPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir
    // console.log('buildPath=====', buildPath)
    function mkdirsSync(dirname) {
      if (fs.existsSync(dirname)){
        return true
      } else {
        if (mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname);
          console.log('目录创建成功' + dirname);
          return true;
        }
      }
    }
    mkdirsSync(config.buildDir, () => {
      console.log('创建完成！')
       copyServiceWorkerFile(attrFileList);
    })
    fs.exists(buildPath, exists => {
      // 创建文件夹是否存在
      if (exists) {
        copyServiceWorkerFile(attrFileList);
      } else {
        fs.mkdir(buildPath, err => {
          if (err) {
            console.log(err)
            throw new Error(buildPath + "创建目录失败！")
          } else {
            copyServiceWorkerFile(attrFileList);
          }
        })
      }
    })

  });
}

function copyServiceWorkerFile(list) {
  // 拼接sw.js文件
  const dateTime = new Date()
  const buildTime = dateTime.toLocaleString().replace(' ', '|')
  // console.log('edition', buildTime)
  let SW_DATA = `
    // serviceWorker.js
    const edition = 'pwas:${buildTime}'
    const fileList = [
  `
    list.forEach(str => {
        SW_DATA += `'${str}',
      `
    })
    SW_DATA += `
        ]  
    `
  SW_DATA = SW_DATA + SW_MODEL_EXPORT
      createServiceWorkerFile(SW_DATA)
    // })
}

function getChildNodes(node) {
  // 获取所有节点
  if (node.hasChildNodes()) {
    let doms = node.childNodes;
    doms.forEach(child => {
      if (child.nodeType == 1) {
        // domList.push(child.nodeName);
        getChildNodes(child);
        getAttrList(child)
      }
    });
  }
}

function getAttrList(node) {
  // 过滤链接文件列表
  switch (node.nodeName) {
    case 'LINK':
    case 'A':
      let href = node.getAttribute('href')
      // console.log(href)
      if (href) {
        attrFileList.push(href)
      }
      break;
    case 'SCRIPT':
    case 'IMG':
      let src = node.getAttribute('src')
      // console.log(src)
      if (src) {
        attrFileList.push(src)
      }
      break;
    default:
      // console.log(node.nodeName)
  }
}
const iconsDirPath = `${config.buildDir}${config.iconsPath}`
const Manifest = `
    {
      "name": "PWAs",
      "short_name": "PWAs",
      "description": "这只是一个测试应用！",
      "start_url": "${config.defaultEntry}",
      "display": "standalone",
      "orientation": "any",
      "background_color": "#ACE",
      "theme_color": "#ACE",
      "icons": [{
          "src": "${iconsDirPath}icon_ss.png",
          "sizes": "32x32",
          "type": "image/png"
          },{
            "src": "${iconsDirPath}icon_s.png",
            "sizes": "48x48",
            "type": "image/png"
          },{
            "src": "${iconsDirPath}icon.png",
            "sizes": "96x96",
            "type": "image/png"
          },{
            "src": "${iconsDirPath}icon_m.png",
            "sizes": "152x152",
            "type": "image/png"
          },{
            "src": "${iconsDirPath}icon_x.png",
            "sizes": "192x192",
            "type": "image/png"
          },{
            "src": "${iconsDirPath}icon_xx.png",
            "sizes": "256x256",
            "type": "image/png"
          }]
    }
`

function createImageFile(source, target) {
  // 创建manifest.json 图标
  fs.readFile(source, (err, buffer) => {
    if (err) {
      console.error(err)
      throw new Error('请检查图片格式或者源路径是否正确！')
    } else {
      // console.log(source, '读取图片成功')
      const item = {
        buffer,
        target
      }
      bufferList.push(item)
      if (bufferList.length == config.manifest.icons.length) {
          bufferList.forEach(data => {
            // 处理异步问题
            createFile(data.target, data.buffer)
          })
      }
    }
  })
}
const bufferList = []
function multipleCreateImageFile(targetPath) {
  // 批量操作图片文件
  config.manifest.icons.forEach(file => {
    // console.log(file.src)
    let target = null
    const pathSplit = file.src.split('/')
    const fileName = pathSplit[pathSplit.length - 1]
    target = targetPath + fileName
    const source = __dirname + file.src
    createImageFile(source, target)
  })
}
function createManifestFile() {
  // 创建manifest.json文件
    const targetPath = config.relativePath + '/' + config.relativeFilePath + config.buildDir + config.iconsPath;
    fs.exists(targetPath, exists => {
      // 创建文件夹是否存在
      if (exists) {
        multipleCreateImageFile(targetPath)
      } else {
        fs.mkdir(targetPath, err => {
          if (err) {
            console.log(err)
            throw new Error(targetPath + "创建目录失败！")
          } else {
            multipleCreateImageFile(targetPath)
          }
        })
      }
    })
    const manifestPath = config.relativePath + '/' + config.relativeFilePath
    // console.log('manifestPath==>', manifestPath)
    fs.exists(manifestPath, exists => {
      if (exists) {
        createFile(manifestPath + 'manifest.json', Manifest)
      } else {
        fs.mkdir(manifestPath, err => {
          if (err) {
            console.log(err)
            throw new Error(manifestPath + "创建目录失败！")
          } else {
            createFile(manifestPath + 'manifest.json', Manifest)
          }
        })
      }
    }) 
}

function createServiceWorkerFile(data) {
  // 创建Service Worker文件
  const serviceWorkerFileName = config.relativePath + '/' + config.relativeFilePath + config.registerFile
  const entryScript = config.relativePath + '/' + config.relativeFilePath + config.buildDir + config.entryScript
  const indexFileData = `
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('${config.redirectPath}/${config.registerFile}', {scope: "${config.scope}"}).then(res => {
      // console.log('service worker is registered', res)
      let sw = null, state;
      if (res.installing) {
        sw = res.installing
        state = 'installing'
      } else if (res.waiting) {
        // 更新完成等待运行
        sw = res.waiting
        state = 'waiting'
      } else if (res.active) {
        // 更新完成激活状态
        sw = res.active
        state = 'activated'
      } else if (res.redundant) {
        // 新的缓存生效后之前的缓存会进入此状态
        sw.res.redundant
        state = 'redundant'
      }
      if (state) {
        console.log('【---SW---】 state is ' + state)
        if (state === 'waiting') {
          // 刷新后判断是否为等待状态
          // self.skipWaiting()
        }
      }
  
      if (sw) {
        sw.onStateChange = () => {
          console.log('sw state is ' + sw.state)
        }
      }
    }).catch(err => {
      console.error('something error is happened', err)
    })

  }
  `
  const pathDir = config.relativePath + '/' + config.relativeFilePath + config.buildDir // 目前配置是当前路径，后期需要增加自定义路径功能，预留路径判断功能
  // terser 
  const options = {
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
  }
  const result = terser.minify(data, options)
  // console.log(pathDir)
  const uglifyDealWithData = result.code
  fs.exists(pathDir, exists => {
    if (exists) {
      // 判断当前路径是否存在
      createFile(serviceWorkerFileName, uglifyDealWithData)
      createFile(entryScript, indexFileData)
    } else {
      fs.mkdir(pathDir, err => {
        // 创建文件夹
        if(err) {
          return false
        } else {
          createFile(serviceWorkerFileName, uglifyDealWithData)
          createFile(entryScript, indexFileData)
        }
      })
    }
  })
  createManifestFile()
}

function createFile (serviceWorkerFileName, data) {
  // 写入数据
  // console.log('开始写入', fileName)
  fs.writeFile(serviceWorkerFileName, data, "utf-8", err => {
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
  entryFile(config.defaultEntry)
}
