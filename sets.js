// sets.js：父表上的根、层数与分量成员（只顺父表上溯，不做路径压缩）

// 顺父表一直走到 parent[x] === x 的根。
export function rootOf(parent, name) {
  if (!Object.prototype.hasOwnProperty.call(parent, name)) { return ""; }
  let cur = name;
  while (parent[cur] !== cur) {
    cur = parent[cur];
  }
  return cur;
}

// name 到根之间的边数。
export function depthOf(parent, name) {
  if (!Object.prototype.hasOwnProperty.call(parent, name)) { return 0; }
  let cur = name;
  let depth = 0;
  while (parent[cur] !== cur) {
    cur = parent[cur];
    depth += 1;
  }
  return depth;
}

// 与 name 同根的全部成员（升序）。
export function membersOf(parent, elems, name) {
  const root = rootOf(parent, name);
  if (root === "") { return []; }
  return elems
    .filter(function (member) { return rootOf(parent, member) === root; })
    .sort();
}

// 整棵森林里从节点到根的最大边数。
export function heightOf(parent, elems) {
  let best = 0;
  for (const name of elems) {
    const depth = depthOf(parent, name);
    if (depth > best) { best = depth; }
  }
  return best;
}
