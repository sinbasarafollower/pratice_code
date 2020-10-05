/**
 * 参考资料： https://github.com/xbc30/large-file-upload/blob/master/server/app/controller/home.js
 */
const express = require('express')
const path = require('path')
const fs = require('fs')
const bodyParser = require('body-parser')

/** ========= 常规变量 Start ======= */
const uploadPath = path.join(__dirname, 'uploads')
/** =========常规变量 End ========== */

const server = express()

server.use(bodyParser.json({ limit: '200mb' }))
server.use(bodyParser.urlencoded({ extended: true }))

/** ====== 静态文件 ======*/
server.use('/assets', express.static(path.join(__dirname, 'src', 'assets')))

server.get('', function (req, res) {
  res.sendFile(path.resolve('src', './index.html'))
})

server.post('/hashCheck', function (req, res) {
  // 校验文件 hash 值，返回 type
  // 返回数据中 res.data.type == 2(文件已上传过) 1(断点续传) 0(从未上传)
  const { body: { md5, chunkTotal, chunkSize } } = req
  const fileFragmentPath = path.join(uploadPath, `${md5}-${chunkSize}`, '/')
  if (fs.existsSync(fileFragmentPath)) {
    // 目录已存在，判断目录中的文件是否已经上传完
    const chunks = fs.readdirSync(fileFragmentPath)
    if (chunks.length === chunkTotal && chunkTotal !== 0) {
      // 目录中的文件数目与需要的一致，则说明已经上传完毕
      res.status(200).send({
        data: {
          type: 2
        }
      })
    } else {
      // 分片文件尚未完全上传完
      const index = []
      chunks.forEach(item => {
        const reg = new RegExp(`${md5}-${chunkSize}` + '-(\\d*)\\.tmpfile')
        const i = item.match(reg)
        i && index.push(+i[1])
      })
      res.status(200).send({
        data: {
          type: 1,
          index
        }
      })
    }
  } else {
    // 目录未存在
    res.status(200).send({
      data: {
        type: 0
      }
    })
  }
})

server.post('/upload', function (req, res) {
  // TODO: 上传接口，将分片文件保存在服务器
  res.sendStatus(201)
})

server.post('/mergeChunks', async function (req, res) {
  // 等所有上传完毕后进行合并
  const { body: { md5, fileName, chunkSize } } = req
  const fileFragmentPath = path.join(uploadPath, `${md5}-${chunkSize}`, '/')
  const chunks = fs.readdirSync(fileFragmentPath)
  const chunksPathList = chunks.map(chunkName => path.join(fileFragmentPath, chunkName))
  const mergeFilePath = path.join(uploadPath, fileName)
  // fs.openSync(mergeFilePath, 'w') // 创建一个空文件
  await streamMerge(chunksPathList, mergeFilePath)
  res.sendStatus(200)
})

/**
 * 基于流将多个文件合并到一个文件中
 * 参考：https://zhuanlan.zhihu.com/p/131627741
 * @param {Array<string>} chunksPathList 
 * @param {string} mergeFilePath 
 */
async function streamMerge (chunksPathList, mergeFilePath) {
  const fileWriteStream = fs.createWriteStream(mergeFilePath)
  const chunksLen = chunksPathList.length
  for (let i = 0; i < chunksLen; i++) {
    const currentReadStream = fs.createReadStream(chunksPathList[i])
    await new Promise((resolve, reject) => {
      currentReadStream.pipe(fileWriteStream, { end: false })
      currentReadStream.on('end', () => {
        resolve()
      })
      currentReadStream.on('error', (err) => {
        fileWriteStream.close()
        reject(err)
      })
    })
  }
  return
}

const client = server.listen(3000, function () {
  console.log(`Listening on port ${client.address().port}`)
})
