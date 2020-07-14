# PWAs
Quickly upgrade your project to PWAs
助你快速将现有项目升级成为PWA
创建初衷：
PWAs是一种非常不错的谷歌小程序技术，目前而言虽然还不能像原生APP一样性能和体验，不过pwa这个技术的基础特性还是非常值得尝试的，特别是针对那些需要在弱网环境下使用的项目，只需要第一次加载完成之后，后期二次加载直接从用户本地读取缓存的ServiceWorker，抛开API接口数据响应的前提，资源文件加载速度几乎可以秒开，很多SPA单页应用项目，【不管你是用angular.js、 vue.js、 react.js，只要你是用的nodejs在前端构建的代码，理论上都是可以使用此工具快速生成PWA】编译之后都会面临几个比较大的JS公共文件，每次加载会造成极大的浪费，所以使用PWA的第一步就是可以利用它的缓存机制对项目在弱网环境下进行资源加速；
本项目[源码地址](https://github.com/youwasborntodo/pwas)
# 升级问题
项目第一次在浏览器中安装成功serviceworker之后，后期升级均是无感知加载

# 使用方式一 【usage method 1】
全局安装安装使用

``` bash
npm install pwas@latest -g
// 1.进入你的项目己经构建的目录，例如你的项目名叫example;【open your Project folder】
// 【For example】 C:\Users\Administrator\Desktop\example\
// 2.在example目录下找到你己经构建好的目录地址，例如己经构建好的项目文件均放在【dist】目录下
// cd dist
// 3.在dist目录下执行pwas命令，默认会自动寻找index.html 【default entry file: index.html】
// run pwas
// 4.如果你的项目入口文件不是index.html【even you can custom entry file】
// pwas entry test.html
```

# 使用方式二  【usage method 2】
项目依赖安装，构建时自动添加相应的脚本

``` bash
// 1.进入你的项目己经构建的目录，例如你的项目名叫example;【open your Project folder】
// 2.安装NPM包到开发依赖
npm install pwas@latest -D
// 3.配置package.json 执行脚本：【pwas build dist/index.html】
// 【For example】
// ...
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
    "babel-polyfill": "^6.26.0",
  },
  "devDpendencies": {
    "pwas": "^1.2.3",
  }
// ....   
【"build": "node build/build.js && pwas build dist/index.html"】
 可以使用类似上面的方式集成到生产环境自动化构建脚本后执行
```

# 使用自定义配置
1.进行项目的根目录，等同于package.json文件所在目录
2.全局安装pwas,如果己经全局安装过，可以跳过此步骤,直接执行pwas init
``` bash
  npm install pwas@latest -g
  pwas init
```
3.此时在项目根目录中会生成一个.pwarc文件，可以在此文件中配置manifest.json文件或者注册文件名字的反向代理路径等
4.修改icons图标请在默认生成的icons图片目录替换，后期加入自定义Icons路径功能

# 配置参数说明

``` bash
  "buildDir": "static/pwa/", // 构建之后生成的目录文件夹地址，PWA应用Manifest引用的默认图标和入口文件存放位置
  "scope": "./", // 缓存的作用域范围
  "redirectPath": "", // 如果项目在生产环境访问的地址使用了nginx反向代理，则需要使用此配置项，生成的结果参考entryScript配置项名称【默认entry_sw.js】
  "registerFile": "sw.js", // 注册文件名称，可以自行修改，建议使用默认名称
  "entryScript": "entry_sw.js", // 入口文件名称，可以自行修改，建议使用默认名称
  "cacheName": "index", // PWA的缓存名称，生成效果参考开发工具，比如Chrome -> F12 -> Application -> Cache Storage
  "iconUrl": "", // 手动配置PWA的ICON图标，打包时引用的第三方链接图片地址，打包时会下载替换默认的ICON图标
  "createIcon": false, // 是否创建图标
  "exclude": [], // 需要过滤排除的文件类型或者文件名，使用参考：['.png', 'test.jpg', 'filter.mp4']
  "apiExclude": [], // 需要过滤排队的API接口地址，可以模糊输入API接口中带有的路由或者path名称，使用参考：['/api/test', '/api/device/list']
  "manifest": // 参考PWA官方manifest配置说明 https://developer.mozilla.org/en-US/docs/Web/Manifest
```


# 常见问题说明
1.项目必须使用https协议
2.注意合理处理跨域资源，目前暂时未做资源的跨域缓存处理，如果有使用cdn加速部分资源文件，请在header消息头中配置Access-Control-Allow-Origin：*
3.项目在服务器上的资源路径如果配置了Nginx反向代理，导致默认路径不能正常访问，请在Nginx上配置好相关资源的反向映射,.pwarc文件中可以配置构建生成的目录位置和注册文件的反向代理位置

PS:说明文档写的比较促忙，如果有看不懂的地方或者错误的地方可以到git上指出，谢谢





