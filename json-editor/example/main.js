import Vue from 'vue'
import App from './App.vue'
//引入相关依赖
import axios from 'axios'

import {Message} from 'element-ui'

Vue.prototype.$message = Message
//设置全局变量为$http方便调用
Vue.prototype.$http = axios.create({
  timeout: 1000 * 30,
  headers: {
    'Content-Type': 'application/json; charset=utf-8'
  }
})
// Vue.prototype.$http.defaults.baseURL='http://localhost:9000'

new Vue({
  el: '#app',
  components: { App },
  render (h) {
    return h('App')
  }
})
