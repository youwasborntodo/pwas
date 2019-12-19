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
    "pwas": "^1.0.1",
  }
// ....   
【"build": "node build/build.js && pwas build dist/index.html"】
 可以使用类似上面的方式集成到生产环境自动化构建脚本后执行
```

PS:说明文档写的比较促忙，如果有看不懂的地方或者错误的地方可以到git上指出，谢谢





