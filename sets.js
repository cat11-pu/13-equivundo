// sets.js：父表上的根、层数与分量成员（只读，不做路径压缩）
export function rootOf(parent, name) {
  if (!parent || !Object.prototype.hasOwnProperty.call(parent, name)) { return ""; }
  let cur = name;
  const bound = Object.keys(parent).length + 1;
  let steps = 0;
  while (parent[cur] !== cur) {
    cur = parent[cur];
    steps += 1;
    if (cur === undefined || steps > bound) { return ""; }
  }
  return cur;
}

export function depthOf(parent, name) {
  if (!parent || !Object.prototype.hasOwnProperty.call(parent, name)) { return 0; }
  let cur = name;
  let depth = 0;
  const bound = Object.keys(parent).length + 1;
  while (parent[cur] !== cur) {
    cur = parent[cur];
    depth += 1;
    if (cur === undefined || depth > bound) { return 0; }
  }
  return depth;
}

export function membersOf(parent, elems, name) {
  const root = rootOf(parent, name);
  return (elems || [])
    .filter(function (member) { return rootOf(parent, member) === root; })
    .sort();
}

export function heightOf(parent, elems) {
  let height = 0;
  for (const name of elems || []) {
    const depth = depthOf(parent, name);
    if (depth > height) { height = depth; }
  }
  return height;
}
