# react-native-webview-amap-demo
react native高德地图拖拽定位demo，使用webview实现。

只需要明白react native如何与webview通信，web端能实现的功能基本可以用在react native上，文档参考[react native webview](https://reactnative.cn/docs/0.47/webview.html)和[高德地图JavaScript API](https://lbs.amap.com/api/javascript-api/summary/)

## 注意
本项目只提供集成高德地图Web版本的思路，想要更好的用户体验建议使用原生去实现。

截止到2019-08-05，React-Native版本更新到0.60，WebView组件已经从SDK中分离成一个独立的组件[react-native-webview](https://github.com/react-native-community/react-native-webview)。RN与Webview的通信接口相比0.47发生了变化，具体请阅读官方文档的。直接拷贝代码到0.60版本的RN项目下是运行不起来的。

## 安装

*   `git clone https://github.com/z372183629/react-native-webview-amap-demo.git`
*   `cd react-native-webview-amap-demo`
*   `npm install`

## 编译问题
xcode 10以上的版本在编译React Native 0.57以下版本时会出现问题。  

经过测试，使用xcode 10编译此项目到真机上，可以在项目根目录执行下面的命令
*   `cd node_modules/react-native/third-party/glog-0.3.4`
*   `./configure`  

执行上面两个命令后，编译又会出现下面的错误
```
No member named '__rip' in '__darwin_arm_thread_state64'
```
编辑``node_modules/react-native/third-party/glog-0.3.4/src/config.h``  
找到
```
/* How to access the PC from a struct ucontext */
#define PC_FROM_UCONTEXT uc_mcontext->__ss.__rip
```
替换成
```
/* How to access the PC from a struct ucontext */
#if defined(__arm__) || defined(__arm64__)
#define PC_FROM_UCONTEXT uc_mcontext->__ss.__pc
#else
#define PC_FROM_UCONTEXT uc_mcontext->__ss.__rip
#endif
```
再编译就没有问题了。

解决方案参考链接:
*   [Problem with third-party in Xcode 10 building to iOS physical device](https://github.com/facebook/react-native/issues/19839)
*   [react native 项目报错](https://www.jianshu.com/p/cf0ec5469522)

## 效果图
![Alt Text](https://github.com/z372183629/react-native-webview-amap-demo/raw/master/images/GIF.gif)
