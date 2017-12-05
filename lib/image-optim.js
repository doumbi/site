const { promisify } = require('util')
const child_process = require('child_process')
const fs = require('fs')
const { extname, parse: pathParse, join } = require('path')
const readdir = promisify(fs.readdir)
const writeFile = promisify(fs.writeFile)
const exec = promisify(child_process.exec)
const { loadConfig } = require('./utils')
const gm = require('gm')
const bufferToHex = b => '#'+ b.toString('hex').toUpperCase()
const getDominant = imgPath => new Promise((s, f) => gm(imgPath)
  .resize(1, 1)
  .toBuffer('PPM', (err, buffer) => err
    ? f(err)
    : s(bufferToHex(buffer.slice(11, 14)))))

const getSize = imgPath => new Promise((s, f) => gm(imgPath)
  .size((err, size) => err
    ? f(err)
    : s(size.width / size.height)))

const x = _ => (console.log(_), _)
const gen = (settings, HDPI) => (imgPath, srcPath) => exec(x([
  'convert',
  srcPath,
  '-resize',
  HDPI ? 592*2 : 592,
  '-sampling-factor',
  '4:2:0',
  '-colorspace',
  'RGB',
  '-strip',
  '-quality 85',
].concat(settings(imgPath, HDPI)).join(' ')))


const webpSettings = (imgPath, HDPI) => [
  `${imgPath}${(HDPI ? '-x2' : '')}.webp`,
]

const jpgSettings = (imgPath, HDPI) => [

  '-interlace JPEG',
  `${imgPath}${(HDPI ? '-x2' : '')}.jpg`
]

const generateWebpHDPI = gen(webpSettings, true)
const generateWebp = gen(webpSettings)
const generateHDPI = gen(jpgSettings, true)
const generate = gen(jpgSettings)

module.exports = (dir = '.') => {
  const config = loadConfig('.')
  const imageDir = 'themes/'+ config.theme.themeName +'/assets/images'
  readdir(imageDir +'/src')
    .then(files => Promise.all(Array.from(files
      .reduce((acc, file) => {
        const ext = extname(file)
        acc[ext === '.json' ? 'delete' : 'set'](`${imageDir}/${file.slice(0, -ext.length)}`, `${imageDir}/src/${file}`)
        return acc
      }, new Map())).map(([imgPath, srcPath]) => Promise.all([
        getDominant(srcPath),
        getSize(srcPath),
        pathParse(imgPath),
        generateWebpHDPI(imgPath, srcPath),
        generateWebp(imgPath, srcPath),
        generateHDPI(imgPath, srcPath),
        generate(imgPath, srcPath),
      ])
      .then(([ color, height, { dir, name } ]) =>
        writeFile(join(dir, name +'-meta.json'),
          JSON.stringify({ color, height }))))))
    .then(console.log)
    .catch(console.log)
}
