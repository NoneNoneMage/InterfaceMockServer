const express = require("express");
class ReloadRouter {
    constructor() {
        this.router = express.Router();
    }
    handler() {
        return (req, res, next) => {
            // console.log(req)
            this.router(req, res, next);
        };
    }
    reload(handlers) {
        const newRouter = express.Router();
        // console.log(handlers)
        if (handlers.length) {
            // console.log('use aaaa')
            newRouter.use(handlers);
        }
        this.router = newRouter;
    }
}
exports.ReloadRouter = ReloadRouter;