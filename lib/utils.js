const fs = require('fs');
const path = require('path');
const hljs = require('highlight.js');
const rd = require('rd');
const fse = require('fs-extra');
const md = require('markdown-it')({
    html: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return `<pre class=${lang}><code>${hljs.highlight(lang, str, true).value}</code></pre>`;
          } catch (__) {}
        }

        return `<pre class=${lang}><code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
})
const defaultRender = md.renderer.rules.image

md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const src = tokens[idx].attrs[tokens[idx].attrIndex('src')][1]

  if (/https?:\/\//.test(src)) return defaultRender(tokens, idx, options, env, self)

  let meta
  try {
    meta = require(path.resolve(`./themes/default/assets/images/${src}-meta.json`))
  } catch (e) {
    console.log(`Image ${src} meta data not found, run \`yohe meta\``)
    throw e
  }

  return `<div class="img" data-src="${src}" style="background-color: ${meta.color};height:0;
    padding-bottom:${100/meta.height}%;width:100%"><noscript><img src="/assets/images/${src}.jpg"></img></noscript></div>`
}


const swig = require('swig')
swig.setDefaults({cache: false})

function parseSourceContent(data){
    var split = '---\n';
    var i = data.indexOf(split);
    var info = {};
    if (i !== -1) {
      var j = data.indexOf(split, i + split.length);
      if (j !== -1) {
        var str = data.slice(i + split.length, j).trim();
        data = data.slice(j + split.length);
        str.split('\n').forEach(function (line) {
          var i = line.indexOf(':');
          if (i !== -1) {
            var name = line.slice(0, i).trim();
            var value = line.slice(i + 1).trim();
            info[name] = value;
          }
        });
      }
    }
    info.source = data;
    info.layout = info.layout || 'post';
    info.content = md.render(info.source || '');

    // 处理 <!--more-->
    let moreFlag = data.indexOf('<!--more-->');
    info.headContent = moreFlag !== -1?md.render(data.slice(0,moreFlag)):info.content;

    info.dateInfo = info.date.split('-');
    return info;
}

function renderFile(file,data){
    return swig.render(fs.readFileSync(file).toString(),{
        filename: file,
        autoescape: false,
        locals: data
    })
}
const loadConfig = dir => require(path.resolve(dir,'config.json'))

function stripExtName(name){
    let i = 0 - path.extname(name).length;
    if(i === 0) i = name.length;
    return name.slice(0,i);
}

function renderPage(dir,sourceDir,outputDir,pageName,themeDir,extraDatas){
     let source = fs.readFileSync(sourceDir).toString();
     let content = parseSourceContent(source);
     let layout = path.resolve(themeDir,'layout',content.layout + '.html');
     let html = renderFile(layout,{
         content,
         config: extraDatas.config,
         categories: extraDatas.categories
     });
     fse.outputFileSync(path.resolve(outputDir,pageName,'index.html'),html);
}


exports.parseSourceContent = parseSourceContent;

exports.renderFile = renderFile;

exports.loadConfig = loadConfig;

exports.stripExtName = stripExtName;

exports.renderPage = renderPage;
