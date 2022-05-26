var express = require('express')
var config = require('./config')
const fs = require("fs");
let { ReloadRouter } = require("./reloader");
// var bodyParser = require('body-parser');
const reloadRouter = new ReloadRouter();
var app = express()
var router = express.Router()
var cluster = require('cluster')
var numCPUs = require('os').cpus().length
var port = process.env.PORT || config.build.port

router.get("/", function (req, res, next) {
  req.url = './index.html'
  next()
})


app.use(router)
app.use(express.json())

/*******************mock interfaces begin*******************/
// cee订购接口mock
let mockData = require('./mock/mock.json')

function loadMockRoute(mockData, router) {
  for (var i in mockData) {
    switch (mockData[i].method) {
      case 'get':
        router.get(mockData[i].uri, function (req, res) {
          res.json(mockData[i].data)
        })
        break
      case 'post':
      default:
        router.post(mockData[i].uri, function (req, res) {
          res.json(mockData[i].data)
        })
        break
    }
  }
  reloadRouter.reload([router])
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
      console.error(err);
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
  console.log(cluster.worker.pid, ', save')
  writeJson(req.body)
  mockData = req.body
  loadMockRoute(mockData, express.Router())
  process.send(mockData);

  res.json("mockData")
})

app.use('/manage', apiRouterData)
app.use('/mock', reloadRouter.handler());
app.use(express.static('./static'))

/*******************app listen begin*******************/
let args = process.argv.splice(2)
console.log()
if (args[0] === 'single') {
  app.listen(port, function (err) {
    if (err) {
      console.log(err)
      return
    }
  })
}
else {
  if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
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


