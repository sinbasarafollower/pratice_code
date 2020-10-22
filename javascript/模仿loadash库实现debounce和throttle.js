
// 参考资料：
// - [手撕源码系列 —— lodash 的 debounce 与 throttle](https://juejin.im/post/6844903990639984654)
// - [lodash防抖节流源码理解](https://juejin.im/post/6844903982297513991)

/**
 * 一个完整的包含 throttle 功能的 debounce 函数分为几大方面：
 * 1. 由以下几个函数组成的基础模块：
 *   - debounced（返回函数，主调用）
 *   - formatArgs（负责校验入参）
 *   - startTimer（负责设置定时器）
 *   - timerExpired（负责定时器回调）
 *   - invokeFunc（负责调用函数，解决 this 指针问题）
 * 2. 由以下几个函数组成的增强模块：
 *   - shouldInvoke（根据上一次函数调用的时间来判断当前是否应该进行函数调用）
 *   - remainingWaiting（计算真正的延迟时间，比如说上一次触发时间的 lastCallTime 为 100，而 Date.now() 为 103，wait = 5，则下一次的延迟应该为 5 - （103 - 100) = 3）
 *   - trailingEdge（负责处理后置执行的情况）
 *   - leadingEdge（负责处理前置执行的情况，多用于节流）
 * 3. 以及一些简单优化的工具函数：
 *   - cancel（负责取消 debounce 效果）
 *   - flush（负责取消并立即执行一次 debounce 函数）
 */

const FUNC_ERROR_TEXT = 'Need A Function'

const isObject = (obj) => obj !== null && typeof obj === 'object'

const now = () => new Date().getTime()

/**
 * 
 * @param {Function} fn 待防抖函数
 * @param {number} [wait=0] 等待时间
 * @param {Object} [options={}] 选项
 * @param {boolean} [options.leading=false] 是否前置执行
 * @param {boolean} [options.trailing=true] 是否后置执行
 * @returns {Function} 防抖包装后函数
 */
function debounce (fn, wait = 0, options = {}) {
  let lastArgs,
      lastThis,
      maxWait,
      result, // 被防抖函数最终执行结果
      timerId,
      lastCallTime, // 最后一次触发事件时间
      lastInvokeTime = 0, // 最后一次调用时间
      leading = false,
      maxing = false,
      trailing = true
  formatArgs()
  /**
   * 触发的包装返回函数
   * @param  {...any} args 
   */
  function debounced (...args) {
    const time = now()
    const isInvoking = shouldInvoke(time) // 根据时间戳判断本次调用是否应该调用被防抖方法
    lastCallTime = time // 保存最后一次被触发时间（PS：这一步不能和上一步互换，因为 shouldInvoke 需要依据被覆盖前的 lastCallTime 工作）
    lastThis = this // 最后调用的函数的执行上下文，传给闭包变量以便其他方法调用。this 表示触发的事件对象，所有调用的执行上下文应该都基于这个对象
    lastArgs = args // 最后调用的函数的入参，传给闭包变量以便其他方法调用

    if (isInvoking) {
      if (timerId === undefined) {
        // 第一次调用
        return leadingEdge(lastCallTime)
      }
    }
    clearTimeout(timerId)
    timerId = startTimer(wait)
  }

  /**
   * 负责校验入参
   */
  function formatArgs () {
    if (typeof fn !== 'function') {
      throw new TypeError(FUNC_ERROR_TEXT)
    }
    wait = Number(wait) || 0
    if (isObject(options)) {
      leading = 'leading' in options ? !!options.leading : leading
      trailing = 'trailing' in options ? !!options.trailing : trailing
      maxing = 'maxWait' in options
      maxWait = maxing ? options.maxWait : 0
    }
  }
  /**
   * 负责设置定时器
   */
  function startTimer () {
    return setTimeout(timeExpired, wait)
  }

  /**
   * 负责定时器回调
   */
  function timeExpired () {
    return invokeFunc()
  }

  /**
   * 负责调用真正的函数
   * @param {Number} time 最后一次事件触发的时间
   */
  function invokeFunc (time) {
    let args = lastArgs,
        thisArgs = lastThis
    // 在调用之前将存储的公共变量置为空，以免在只点击一次的情况下 leadingEdge 和 trailingEdge 重复调用方法。同时方便垃圾回收无用的事件和变量
    lastArgs = lastThis = undefined
    // 刷新最后一次函数调用的时间
    lastInvokeTime = time
    result = fn.apply(thisArgs, args)
    return result
  }

  /**
   * 根据传入的时间戳，最后一次调用时间，最后一次触发时间来综合判断是否应该调用被防抖函数
   * 四种情况下，被防抖处理的函数应该被调用：
   * 1. 首次调用debouncedFunc
   * 2. 距离上一次debouncedFunc调用后已延迟wait毫秒
   * 3. func调用总延迟达到maxWait毫秒
   * 4. 系统时间倒退
   * @param {Number} time 
   */
  function shouldInvoke (time) {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    return lastCallTime === undefined || // 首次调用，此时 lastCallTime 没有值，允许调用
           timeSinceLastCall < 0 || // 本次触发时间比上次触发时间早（...）说明出现了时间倒流，允许调用
           timeSinceLastCall >= wait || // 本次触发时间与上次触发时间间隔超过设定防抖时间 wait，允许调用（正常防抖调用情况）
           maxing && timeSinceLastInvoke >= maxWait // 若设置了最大等待时间，则相当于在防抖之中加入了节流。距离上次调用若超过了最大等待时间，则也应该允许调用
  }

  /** 前置调用函数，判断函数：应该在定时器开始前调用（节流），抑或单纯的开始定时器（防抖）
   *  @param {Number} time 最后一次事件触发的时间
   */
  function leadingEdge (time) {
    timerId = startTimer()
    // 若是前置执行，则在定时器开始前先执行一次
    return leading ? invokeFunc(time) : result
  }
  return debounced
}
