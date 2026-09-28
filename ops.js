// ops.js：登记、合并、查询、撤销（坏事件在改动前抛错，原状态不动）
import { rootOf } from "./sets.js";

const NAME_RE = /^[a-z]+$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function validName(name) {
  return typeof name === "string" && NAME_RE.test(name);
}

function cloneState(state) {
  const src = state || {};
  const parent = {};
  for (const key of Object.keys(src.parent || {})) { parent[key] = src.parent[key]; }
  const size = {};
  for (const key of Object.keys(src.size || {})) { size[key] = src.size[key]; }
  return {
    elems: (src.elems || []).slice(),
    parent: parent,
    size: size,
    groups: src.groups || 0,
    merges: (src.merges || []).map(function (row) { return row.slice(); }),
    undos: (src.undos || []).map(function (row) { return row.slice(); }),
    queries: (src.queries || []).map(function (row) { return row.slice(); }),
    stack: (src.stack || []).map(function (row) { return row.slice(); }),
    added: src.added || 0,
    unions: src.unions || 0,
    undone: src.undone || 0
  };
}

export function addElem(state, name) {
  if (!validName(name)) { fail("E_BAD_NAME"); }
  if ((state.elems || []).indexOf(name) >= 0) { fail("E_DUP_ELEM"); }
  const next = cloneState(state);
  next.elems.push(name);
  next.elems.sort();
  next.parent[name] = name;
  next.size[name] = 1;
  next.groups += 1;
  next.added += 1;
  return next;
}

export function mergeEq(state, a, b) {
  if (!validName(a) || !validName(b)) { fail("E_BAD_NAME"); }
  const elems = state.elems || [];
  if (elems.indexOf(a) < 0 || elems.indexOf(b) < 0) { fail("E_UNKNOWN_ELEM"); }
  const rootA = rootOf(state.parent, a);
  const rootB = rootOf(state.parent, b);
  if (rootA === rootB) { fail("E_SAME"); }
  const next = cloneState(state);

  // 大根当新根；一样大时名字小的当新根。
  const sizeA = state.size[rootA];
  const sizeB = state.size[rootB];
  let newRoot = rootA;
  let hungRoot = rootB;
  if (sizeB > sizeA || (sizeB === sizeA && rootB < rootA)) {
    newRoot = rootB;
    hungRoot = rootA;
  }
  const hungSize = next.size[hungRoot];
  const oldNewSize = next.size[newRoot];

  next.parent[hungRoot] = newRoot;
  next.size[newRoot] = oldNewSize + hungSize;
  next.groups -= 1;
  next.merges.push([a, b, newRoot, next.size[newRoot]]);
  next.stack.push([hungRoot, newRoot, hungSize, oldNewSize]);
  next.unions += 1;
  return next;
}

export function queryEq(state, a, b) {
  if (!validName(a) || !validName(b)) { fail("E_BAD_NAME"); }
  const elems = state.elems || [];
  if (elems.indexOf(a) < 0 || elems.indexOf(b) < 0) { fail("E_UNKNOWN_ELEM"); }
  const next = cloneState(state);
  next.queries.push([a, b, rootOf(next.parent, a) === rootOf(next.parent, b)]);
  return next;
}

export function undoMerge(state, count) {
  if (!Number.isInteger(count) || count <= 0) { fail("E_BAD_COUNT"); }
  const stack = state.stack || [];
  if (count > stack.length) { fail("E_UNDO_RANGE"); }
  const next = cloneState(state);
  for (let i = 0; i < count; i += 1) {
    const entry = next.stack.pop();
    const hungRoot = entry[0];
    const newRoot = entry[1];
    const oldNewSize = entry[3];
    next.parent[hungRoot] = hungRoot;
    next.size[newRoot] = oldNewSize;
    next.groups += 1;
    next.undos.push([hungRoot, newRoot]);
    next.undone += 1;
  }
  return next;
}
