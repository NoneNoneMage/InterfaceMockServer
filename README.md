# 安装依赖
```npm install```
# 运行
## 单进程运行 
```npm run single```
单进程支持页面动态配置模拟接口，配置页面为http://localhost:9000
## 多进程运行
```npm run multi```
没有需要计算的操作单进程即可
多进程目前不支持动态配置模拟接口，需要，mock的接口在mock/mock.json中配置，然后重启