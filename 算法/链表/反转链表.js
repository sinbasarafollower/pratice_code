function ListNode(val) {
  this.val = val
  this.next = null
}

function createNodeChainByList (arr) {
  if (!arr[0] && arr[0] !== 0) return
  let firstNode = new ListNode(arr[0])
  let tmpNode = firstNode
  arr.slice(1).forEach(value => {
    var nextNode = new ListNode(value)
    tmpNode.next = nextNode
    tmpNode = nextNode
  })
  return firstNode
}

var firstNode = createNodeChainByList([1, 2, 3, 4, 5])
// while (firstNode) {
  // console.log(firstNode.val)
  // firstNode = firstNode.next
// }

/**
  反转链表
**/
function reverseChain (node) {
  let lastNode
  function dfs (node) {
    let tmp = node
    if (tmp.next) {
      dfs(tmp.next) // 递归进入下一个节点
      // 出栈时 tmp 为倒数第二个结点，tmp.next 为尾结点
      tmp.next.next = tmp // 进行反转，将倒数第一个节点的 next 指针指向倒数第二个
    } else {
      // 尾结点
      lastNode = tmp
    }
  }
  dfs(node)
  node.next = null // 原来的头结点现在是尾结点，指针需要指向 null
  return lastNode
}

var reverseFirstNode = reverseChain(firstNode)

while (reverseFirstNode) {
  console.log(reverseFirstNode.val)
  reverseFirstNode = reverseFirstNode.next
}

/**
  非递归反转链表
**/
function traverseReverseChain (node) {
  const stack = []
  let tmp = node
  while (!!tmp) {
    stack.push(tmp)
    tmp = tmp.next
  }
  const newFirstNode = stack[stack.length - 1]
  while (stack.length > 0) {
    const lastNode = stack.pop()
    lastNode.next = stack[stack.length - 1]
  }
  node.next = null
  return newFirstNode
}
