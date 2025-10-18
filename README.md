# PWAs

Quickly upgrade your project to PWAs  
助你快速将现有项目升级成为 PWA  
(Create PWAs quickly for your existing projects)

---

## 创建初衷 / Purpose of Creation

PWAs 是一种非常不错的谷歌小程序技术，目前而言虽然还不能像原生 APP 一样性能和体验，不过 PWA 这个技术的基础特性还是非常值得尝试的，特别是针对那些需要在弱网环境下使用的项目，只需要第一次加载完成之后，后期二次加载直接从用户本地读取缓存的 ServiceWorker，抛开 API 接口数据响应的前提，资源文件加载速度几乎可以秒开。  
PWAs are a powerful Google web app technology. Although not yet equal to native apps in performance or UX, they’re worth exploring — especially for projects that must work under poor network conditions. Once initially loaded, later loads read directly from the local Service Worker cache, providing almost instant loading even without network response.

很多 SPA 单页应用项目【不管你是用 angular.js、vue.js、react.js，只要你是用的 nodejs 在前端构建的代码，理论上都是可以使用此工具快速生成 PWA】编译之后都会面临几个比较大的 JS 公共文件，每次加载会造成极大的浪费。  
Many SPA (Single Page Application) projects — whether built with Angular.js, Vue.js, or React.js — face large shared JS bundles after compilation, which wastes bandwidth on every load.

所以使用 PWA 的第一步就是可以利用它的缓存机制对项目在弱网环境下进行资源加速。  
Using PWA’s caching mechanism is the first step to accelerating resource loading in weak network conditions.

本项目 [源码地址](https://github.com/youwasborntodo/pwas)  
(Project source code: [GitHub Repository](https://github.com/youwasborntodo/pwas))

---

## 升级问题 / Upgrade Behavior

项目第一次在浏览器中安装成功 service worker 之后，后期升级均是无感知加载。  
Once the Service Worker is installed successfully in the browser, all subsequent upgrades are silently applied without user awareness.

Service Worker 正常载入后会在 window 对象上绑定一个全局方法 window.onInstallPWA ，可以使用此方法触发安装 pwa 的逻辑
After the Service Worker is successfully loaded, a global method window.onInstallPWA will be bound to the window object. You can use this method to trigger the logic for installing the PWA.

---

## 使用方式一 【Usage Method 1】

全局安装并使用  
(Global installation and usage)

```bash
npm install pwas@latest -g
// 1.进入你的项目已构建的目录，例如你的项目名叫 example
// Step 1: Go to your project’s built directory (for example, project “example”)
// 2.在 example 目录下找到构建好的目录，例如 dist
// Step 2: In the example directory, locate your built folder, usually “dist”
// cd dist
// 3.在 dist 目录下执行 pwas 命令，默认自动寻找 index.html
// Step 3: Run “pwas” inside dist — it automatically finds index.html
// 4.如果入口文件不是 index.html，可自定义
// Step 4: If your entry file isn’t index.html, specify it manually
// pwas entry test.html
```

# 使用方式二 【usage method 2】

项目依赖安装，构建时自动添加相应的脚本
(Install as a project dependency; add script for build automation)

```bash
// 1.进入你的项目己经构建的目录，例如你的项目名叫example;【open your Project folder】
// Step 1: Enter your project's built directory, for example “example”
// 2.安装NPM包到开发依赖
// Step 2: Install the NPM package as a development dependency
npm install pwas@latest -D
// 3.配置package.json 执行脚本：【pwas build dist/index.html】
// Step 3: Configure package.json to include build command “pwas build dist/index.html”
// 【For example】
  "scripts": {
    "dev": "webpack-dev-server --inline --progress --config build/webpack.dev.conf.js",
    "start": "npm run dev",
    "unit": "jest --config test/unit/jest.conf.js --coverage",
    "e2e": "node test/e2e/runner.js",
    "test": "npm run unit && npm run e2e",
    "lint": "eslint --ext .js,.vue src test/unit test/e2e/specs",
    "build": "node build/build.js && pwas build dist/index.html"
  },
  "dependencies": {
    "babel-polyfill": "^6.26.0"
  },
  "devDependencies": {
    "pwas": "^1.2.3"
  }
// ....
// 【"build": "node build/build.js && pwas build dist/index.html"】
// 可以使用类似上面的方式集成到生产环境自动化构建脚本后执行
// The above example can be integrated into your production automation build script
```

# 使用自定义配置 / Custom Configuration

1.进入项目的根目录，等同于 package.json 文件所在目录
(Enter your project root directory, same as where package.json is located)

2.全局安装 pwas，如果已经全局安装过，可跳过此步骤，直接执行 pwas init
(Install pwas globally. If already installed, skip this step and run pwas init directly)

```bash
  npm install pwas@latest -g
  pwas init
```

3.此时在项目根目录中会生成 .pwarc 文件，可以在此文件中配置 manifest.json 文件或者注册文件名、反向代理路径等。
(This command will generate a .pwarc file in the project root, where you can configure manifest.json, registration filenames, or reverse proxy paths.)

4.修改 icons 图标请在默认生成的 icons 目录中替换，后期将加入自定义 Icons 路径功能。
(To replace icons, update the files in the default icons folder. Support for custom icon paths will be added later.)

# 配置参数说明 / Configuration Options

```bash
  "buildDir": "static/pwa/", // 构建后生成的目录文件夹地址
  // Directory for PWA build output files
  "scope": "./", // 缓存的作用域范围
  // Scope of the Service Worker cache
  "redirectPath": "", // 生产环境使用 Nginx 反向代理时需配置
  // Required when using Nginx reverse proxy in production
  "registerFile": "sw.js", // 注册文件名称
  // Registration file name (default “sw.js”)
  "entryScript": "entry_sw.js", // 入口文件名称
  // Entry script file name (default “entry_sw.js”)
  "cacheName": "index", // PWA 缓存名称
  // PWA cache name shown in Chrome DevTools -> Application -> Cache Storage
  "iconUrl": "", // 手动配置 PWA 的 ICON 图标 URL
  // Manually specify icon URL (downloads and replaces default icons)
  "createIcon": false, // 是否自动生成图标
  // Whether to automatically generate icons
  "exclude": [], // 排除缓存的文件类型
  // Excluded files or file types (e.g. ['.png', 'test.jpg', 'filter.mp4'])
  "apiExclude": [], // 排除缓存的 API 地址
  // Excluded API endpoints (supports partial match, e.g. ['/api/test', '/api/device/list'])
  "manifest": // 参考官方文档 https://developer.mozilla.org/en-US/docs/Web/Manifest
  // See official PWA manifest documentation
```

# 常见问题说明/ FAQ

1.项目必须使用 HTTPS 协议
(Project must use HTTPS — Service Workers require HTTPS except on localhost)

2.注意合理处理跨域资源，目前暂未做跨域缓存处理。如果使用 CDN，请在 Header 中配置：
(Cross-domain caching is not currently supported. If using CDN, ensure the response header includes:)

```bash
Access-Control-Allow-Origin：*
```

3.如果服务器使用了 Nginx 反向代理，导致路径无法访问，请正确配置资源映射。.pwarc 文件可设置生成目录和注册文件路径。
(If using Nginx reverse proxy causes access issues, configure correct path mapping. .pwarc can define build and registration paths.)

PS: 说明文档写得比较匆忙，如有错误或不清楚的地方，请到 GitHub 提 issue。
(Note: This document was written quickly — feel free to submit an issue on GitHub for corrections or clarifications.)
