const path = require('path')
const fse = require('fs-extra')
const rd = require('rd')
const fs = require('fs')
const moment = require('moment')
const utils = require('./utils')
const chunk = require("lodash/chunk")


function renderTagsCates(dir,outputDir,tpl,datas,config,categories) {
  let layoutDir = path.resolve(dir,'themes',config.theme.themeName,'layout')
  if (tpl === 'tags') {
    let htmlList = utils.renderFile(path.resolve(layoutDir,tpl+'.html'), {
      datas,
      config,
      categories
    })

    let fileList = path.resolve(outputDir,tpl,'index.html')
    fse.outputFileSync(fileList,htmlList)
  }
  for(let d in datas) {
    let item = datas[d];

    let html = utils.renderFile(path.resolve(layoutDir,'list.html'), {
      title: item.name,
      list: item.posts.sort((a,b)=>b.timeStamp - a.timeStamp),
      config,
      categories,
      flag: tpl
    })
    let file = path.resolve(outputDir,tpl,item.name,'index.html')
    fse.outputFileSync(file,html)
  }
}

module.exports = (dir,options) => {
  dir = dir || '.';
  let outputDir = path.resolve(dir,options.output || 'public')
  let sourceDir = path.resolve(dir,'source','_posts')
  let config = utils.loadConfig(dir)
  let themeDir = path.resolve(dir,'themes',config.theme.themeName)

  let list = [];
  let tags = {};
  let categories = {};

  rd.eachFileFilterSync(sourceDir,(f,s) => {
    let source = fs.readFileSync(f).toString()
    let post = utils.parseSourceContent(source)

    post.timeStamp = new Date(post.date)

    let dateStr = post.dateInfo.join('/')
    post.shortName = utils.stripExtName(f.slice(sourceDir.length + 1))
    post.url = `${config.basic.root}/${dateStr}/${post.shortName}`

    if (config.theme.filter.indexOf(post.categories) === -1) {
      list.push(post)
    }

    let postTags = post.tags.slice(1,post.tags.length-1).split(',')
    postTags.forEach(tag => {
      if (tag in tags) {
        tags[tag].posts.push(post)
      } else {
        tags[tag] = {
          name: tag,
          posts: [post],
          url: `${config.basic.root}/tags/${tag}`,
        }
      }
    })

    let postCategories = post.categories;
    if (postCategories in categories) {
      categories[postCategories].posts.push(post)
    } else {
      categories[postCategories] = {
        name: postCategories,
        posts: [post],
        url: `${config.basic.root}/categories/${postCategories}`
      }
    }

    let layout = path.resolve(themeDir,'layout',(post.layout || 'post') + '.html')
    let html = utils.renderFile(layout,{
      config,
      post,
      tags,
      categories,
    })

    fse.outputFileSync(path.resolve(outputDir,post.dateInfo[0],post.dateInfo[1],post.dateInfo[2],utils.stripExtName(f.slice(sourceDir.length + 1)),'index.html'),html)
  })

  list.sort((a,b) => b.timeStamp - a.timeStamp)

  const pages = chunk(list,config.theme.per_page)

  pages.forEach((page,i) => {
    const blogHtml = utils.renderFile(path.resolve(themeDir,'layout','blog.html'), {
      config,
      categories,
      tags,
      posts: page,
      pageNumber: i,
      sumPages: pages.length,
    })

    if (!i) {
      fse.outputFileSync(path.resolve(outputDir,'blog','index.html'), blogHtml)
    }
    fse.outputFileSync(path.resolve(outputDir,'page',i.toString(),'index.html'),
      blogHtml)
  })

  fse.outputFileSync(path.resolve(outputDir, 'index.html'),
    utils.renderFile(path.resolve(themeDir,'layout','index.html'), {
      config,
      categories,
      tags,
    }))

  renderTagsCates(dir,outputDir,'tags',tags,config,categories)
  renderTagsCates(dir,outputDir,'categories',categories,config,categories)
  fse.copySync(path.resolve(themeDir,'assets'),path.resolve(outputDir,'assets'))

  console.log('build successfully! Now type [yohe server] to preview your blog ')
}
