var express = require('express')
var config = require('./config')
const fs = require("fs");
const lodash = require('lodash')
const axios = require('axios')
const { v4: uuidv4,v3: uuidv3,v2: uuidv2,v1: uuidv1} = require('uuid');
let { ReloadRouter } = require("./reloader");
const multiparty = require('multiparty');
const reloadRouter = new ReloadRouter();
var app = express()
var router = express.Router()
var cluster = require('cluster')
var numCPUs = require('os').cpus().length
var port = process.env.PORT || config.build.port
const DATA_PREFIX='$data'
const PARAMS_PREFIX='$params'
const BODY_PREFIX='$body'
const FILEDS_PREFIX='$fields'
const EVAL_PREFIX='$eval#'

Date.prototype.Format = function (fmt) {
  var o = {
      "M+": this.getMonth() + 1, //月份 
      "d+": this.getDate(), //日 
      "H+": this.getHours(), //小时 
      "m+": this.getMinutes(), //分 
      "s+": this.getSeconds(), //秒 
      "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
      "S": this.getMilliseconds() //毫秒 
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
  if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

router.get("/", function (req, res, next) {
  req.url = './index.html'
  next()
})


app.use(router)
app.use(express.json())
app.use(express.urlencoded())
/*******************mock interfaces begin*******************/
let mockData = require('./mock/mock.json')
let mockcache = {}

function loadMockRoute(mockData, router) {
  for (var index in mockData) {
    mockcache[mockData[index].uri] = mockData[index]

    switch (mockData[index].method) {
      case 'get':
        router.get(mockData[index].uri, function (req, res) {
          let reqData = mockcache[req.url]
          let form = new multiparty.Form()
          form.parse(req,(err, fields, files) => {
            let data = resolveValueObject(reqData.data, reqData.data, req.params, req.body, fields)
            dealActions(reqData.action, data, req.params, req.body, fields)
            res.json(data)
          })
        })
        break
      case 'post':
      default:
        router.post(mockData[index].uri, function (req, res) {
          let reqData = mockcache[req.url]
          let form = new multiparty.Form()
          form.parse(req,(err, fields, files) => {
            let data = resolveObject(reqData.data, reqData.data, req.params, req.body, fields)
            dealActions(reqData.action, data, req.params, req.body, fields)
            res.json(data)
          })
        })
        break
    }
  }
  reloadRouter.reload([router])
}

function dealActions(actions, data, params, body, fields) {
  if (actions !== undefined && Array.isArray(actions)) {
    for (var i in actions) {
      doAction(actions[i], data, params, body, fields)
    }
  }
}

function doAction(action, data, params, body, fields) {
  if (action === undefined) {
    return
  }
  setTimeout(
    () => {
      switch(action.type) {
        case 'rest':
        default:
          doHttpRequest(action, data, params, body, fields)
          break
      }
    }, action.asyncTimeout || 1000
  )
}

/**
 * action type为rest发送http请求
 */
function doHttpRequest(action, data, params, body, fields) {
  let url = getUrlWithParams(action, data, params, body, fields)
  switch(action.method) {
    case 'post':
    default:
      axios({
        url: url,                    
        method: 'post',
        data: resolveObject(action.body, data, params, body, fields)
        });
        break
  }
}

function getUrlWithParams(action, data, params, body, fields) {
  let url = action.url
  if (action.params === undefined) {
    return url;
  }
  url = url.concat("?")
  Object.keys(action.params).map(key => {
    let value = action.params[key]
    if (isJSON(value)) {
       value = JSON.stringify(resolveObject(JSON.parse(value), data, params, body, fields))
    }
    else {
      value = resolveValue(value, data, params, body, fields)
    }
    value = encodeURIComponent(value);
    if (value !== undefined) {
        url = url + key + '=' +value + '&'
    }
  })
  return url;
}

function resolveObject(o ,data, params, body, fields) {
  if (Array.isArray(o)) {
    return resolveValueList(o, data, params, body, fields)
  }
  else {
     return resolveValueObject(o, data, params, body, fields)
  }
}

function resolveValueObject(valueObject, data, params, body, fields) {
  if (valueObject === undefined || valueObject === null) {
    return valueObject;
  }
  let ret = {}
  if(typeof valueObject == 'string') {
     return resolveValue(valueObject, data, params, body, fields)
  }
  Object.keys(valueObject).map(key => {
    console.log('resolveValueObject', ret)
    let value = valueObject[key]
    if (typeof value == 'string') {
      ret[key] = resolveValue(value, data, params, body, fields)
    }
    else if (typeof value == 'object') {
      if (Array.isArray(value)) {
        ret[key] = resolveValueList(value, data, params, body, fields)
      }
      else {
        ret[key] = resolveValueObject(value, data, params, body, fields)
      }
    }
    else {
      ret[key] = value
    }
  })
  return ret
}

function resolveValueList(valueList, data, params, body, fields) {
  console.log("values ", valueList.length, valueList)
  let ret = []
  for (var i = 0; i < valueList.length; ++i) {
     console.log("item ", valueList[i])
     ret.push(resolveValueObject(valueList[i], data, params, body, fields))
  }
  return ret;
}


function resolveValue(value, data, params, body, fields) {
  let ret = value
  if (value.startsWith(DATA_PREFIX)) {
    ret = value.startsWith(DATA_PREFIX + '.') ? lodash.get(data, value.substring(DATA_PREFIX.length + 1)) : lodash.get(data, value.substring(DATA_PREFIX.length))
  }
  else if (value.startsWith(PARAMS_PREFIX)) {
    ret = value.startsWith(PARAMS_PREFIX + '.') ? lodash.get(params, value.substring(PARAMS_PREFIX.length + 1)) : lodash.get(params, value.substring(DATA_PREFIX.length))
  }
  else if (value.startsWith(BODY_PREFIX)) {
    ret = value.startsWith(BODY_PREFIX + '.') ? lodash.get(body, value.substring(BODY_PREFIX.length + 1)) : lodash.get(body, value.substring(DATA_PREFIX.length))
  }
  else if (value.startsWith(FILEDS_PREFIX)) {
    ret =  value.startsWith(FILEDS_PREFIX + '.') ? lodash.get(fields, value.substring(FILEDS_PREFIX.length + 1)) : lodash.get(fields, value.substring(DATA_PREFIX.length))
  }
  else if (value.startsWith(EVAL_PREFIX)) {
    ret = eval(value.substring(EVAL_PREFIX.length))
  }
  return ret
}

function isJSON(str) {
	if (typeof str == 'string') {
	    try {
	        var obj=JSON.parse(str);
	        return true;
	    } catch(e) {
	        return false;
	    }
	}
  return false
 }

function solveCrossOrigin(res) {
  // res.header("Access-Control-Allow-Origin","*")
  // res.header("Access-Control-Allow-Methods","PUT,GET,POST,DELETE,OPTIONS")
  // res.header("Access-Control-Allow-Headers","X-Requestd-With")
  // res.header("Access-Control-Allow-Headers","Content-Type")
}
function writeJson(params) {
  var str = JSON.stringify(params);
  fs.writeFile("./mock/mock.json", str, function (
    err
  ) {
    if (err) {
    }
  });
}

loadMockRoute(mockData, express.Router())


/*******************mock interfaces end*******************/

let apiRouterData = express.Router()
apiRouterData.get("/json", function (req, res) {
  solveCrossOrigin(res)
  res.json(mockData)
})

apiRouterData.post("/save", function (req, res) {
  solveCrossOrigin(res)
  writeJson(req.body)
  mockData = req.body
  loadMockRoute(mockData, express.Router())
  res.json("mockData")
})

app.use('/manage', apiRouterData)
app.use('/mock', reloadRouter.handler());
app.use(express.static('./static'))
/*******************app listen begin*******************/
let args = process.argv.splice(2)
if (args[0] === 'single') {
  app.listen(port, function (err) {
    if (err) {
      return
    }
  })
}
else {
  if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
      console.log('worker ', i, ' starting')
      worker1 = cluster.fork();

      worker1.on('message', function (msg) {
        console.log('worker master ' + worker1.process.pid + ', ' + msg);
        loadMockRoute(mockData, express.Router())
      });
    }

    cluster.on('message', function (worker, msg) {
      console.log('worker cluster ' + worker.process.pid + ', ' + msg);
      worker.send(msg);
      loadMockRoute(mockData, express.Router())
    });

    cluster.on('listening', (worker, address) => {
      pid = worker.process.pid
      console.log('worker cluster ' + worker.process.pid + ', listen: ' + address.address + ":" + address.port);
    });

    cluster.on('exit', (worker, code, signal) => {
      console.log('worker cluster ' + worker.process.pid + ' died');
      worker = cluster.fork();
    });

  } else {
    app.listen(port, function (err) {
      if (err) {
        console.log(err)
        return
      }
    })
  }
}


