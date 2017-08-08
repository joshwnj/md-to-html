#!/usr/bin/env node

const pull = require('pull-stream')
const fs = require('fs')
const glob = require('pull-glob')
const tee = require('pull-tee')
const path = require('path')
const marked = require('marked')
const mkdirp = require('mkdirp')

const srcDir = process.cwd()
const outDir = path.join(srcDir, 'dist')

const store = {
  files: {}
}

pull(
  glob(`${srcDir}/**/*.md`),
  pull.filter((filename) => filename.indexOf(outDir) === -1),

  pull.through((filename) => store.files[filename] = {}),
  pull.asyncMap(readFile),
  pull.asyncMap(renderFile),

  pull.through(ensureDir),
  pull.through(writeFile),
  
  pull.collect((err, files) => {
    if (err) { throw err }

    console.log(files)
  })
)

function readFile (filename, cb) {
  fs.readFile(filename, (err, raw) => {
    store.files[filename].raw = raw
    cb(err, filename)
  })
}

function renderFile (filename, cb) {
  try {
    const file = store.files[filename]
    const raw = file.raw.toString('utf8')
    const content = tpl(marked(raw))

    const relFilename = filename.slice(srcDir.length + 1)
    const outPath = path.join(outDir, relFilename).replace(/\.md$/, '.html')

    cb(null, {
      outPath,
      content
    })
  } catch (err) {
    cb(err)
  }
}

function ensureDir (file, cb) {
  // TODO: maybe more efficient to get a unique list of dirs and only mkdirp them?
  mkdirp(path.dirname(file.outPath), cb)
}

function writeFile (file, cb) {
  fs.writeFile(file.outPath, file.content, cb)
}

const tpl = (content) => `<!doctype html>
<html>
  <head>
    <title>...</title>
    <style>
      body {
        background: #fafafa;
        color: #222;
        font: 14px/1 normal sans-serif;
      }

      #content {
        width: 70%;
        max-width: 800px;
        min-width: 200px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div id="content">
      ${content}
    </div>
  </body>
</html>`
