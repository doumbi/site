const express = require('express')
const staticServe = require('serve-static')
const path = require('path')
const utils = require('./utils')

module.exports = (dir = '.') => {
  const config = utils.loadConfig(dir)
  const app = express()

  config.basic.root || (config.basic.root = '')

  app.use(config.basic.root+'/',staticServe(path.resolve(dir,'public')))
  app.listen(config.server.port, () =>
    console.log(`the local blog server has been listened at localhost:${
      config.server.port}${config.basic.root}`))
}
