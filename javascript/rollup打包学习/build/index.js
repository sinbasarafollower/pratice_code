const rollup = require('rollup')
const { dependencies, name: packageName } = require('../package.json')

const buildOptionRecords = []

const getFileSize = (code) => (code.length / 1024).toFixed(2) + 'KB' // 计算文件大小

/**
 * @param {Object} [options={}]
 * { inputPath: '', plugins: [], outputPath: '' }
 * @param {string} [options.inputPath] 入口路径
 * @param {Array<object>} [options.plugins] 拓展
 * @param {string} [options.outputPath] 生成路径
 * @returns {Array<object>}
 */
const build = async ({ inputPath = '', plugins = [], outputPath = '' } = {}) => {
  const inputOptions = {
    input: inputPath,
    plugins,
    // 告诉 rollup 不要将此 lodash 打包，而作为外部依赖
    external: (id) => new RegExp(`^(${Object.keys(dependencies).join('|')})`).test(id) || id === 'vue'
  }
  const outputOptions = {
    file: outputPath,
    format: 'es'
  }
  const bundle = await rollup.rollup(inputOptions)
  const { output } = await bundle.write(outputOptions)
  // 带 --watch 参数启动命令时，记录 input/output 用于给 watch 模式监听文件修改
  process.env.npm_config_watch &&
    buildOptionRecords.push([inputOptions, outputOptions])
  return [outputPath, getFileSize(output[0].code)]
}

build({
  
})
