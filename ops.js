// ops.js：登记、合并、查询、撤销（先校验后克隆，坏事件整条不生效）
import { rootOf } from "./sets.js";

const NAME_RE = /^[a-z]+$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function cloneState(state) {
  const src = state || {};
  return {
    elems: (src.elems || []).slice(),
    parent: Object.assign({}, src.parent || {}),
    size: Object.assign({}, src.size || {}),
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
  if (typeof name !== "string" || !NAME_RE.test(name)) { fail("E_BAD_NAME"); }
  const src = state || {};
  if ((src.elems || []).indexOf(name) >= 0) { fail("E_DUP_ELEM"); }
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
  const src = state || {};
  const elems = src.elems || [];
  if (elems.indexOf(a) < 0 || elems.indexOf(b) < 0) { fail("E_UNKNOWN_ELEM"); }
  const rootA = rootOf(src.parent, a);
  const rootB = rootOf(src.parent, b);
  if (rootA === rootB) { fail("E_SAME"); }

  const next = cloneState(state);
  let winner;
  let loser;
  const sizeA = next.size[rootA];
  const sizeB = next.size[rootB];
  if (sizeA > sizeB) { winner = rootA; loser = rootB; }
  else if (sizeB > sizeA) { winner = rootB; loser = rootA; }
  else if (rootA < rootB) { winner = rootA; loser = rootB; }
  else { winner = rootB; loser = rootA; }

  const oldWinnerSize = next.size[winner];
  const loserSize = next.size[loser];
  next.parent[loser] = winner;
  next.size[winner] = oldWinnerSize + loserSize;
  next.groups -= 1;
  next.unions += 1;
  next.merges.push([a, b, winner, next.size[winner]]);
  next.stack.push([loser, winner, loserSize, oldWinnerSize]);
  return next;
}

export function queryEq(state, a, b) {
  const src = state || {};
  const elems = src.elems || [];
  if (elems.indexOf(a) < 0 || elems.indexOf(b) < 0) { fail("E_UNKNOWN_ELEM"); }
  const same = rootOf(src.parent, a) === rootOf(src.parent, b);
  const next = cloneState(state);
  next.queries.push([a, b, same]);
  return next;
}

export function undoMerge(state, count) {
  if (typeof count !== "number" || !Number.isInteger(count) || count <= 0) {
    fail("E_BAD_COUNT");
  }
  const src = state || {};
  if (count > (src.stack || []).length) { fail("E_UNDO_RANGE"); }

  const next = cloneState(state);
  for (let i = 0; i < count; i += 1) {
    const entry = next.stack.pop();
    const hungRoot = entry[0];
    const newRoot = entry[1];
    const hungSize = entry[2];
    const oldNewRootSize = entry[3];
    next.parent[hungRoot] = hungRoot;
    next.size[hungRoot] = hungSize;
    next.size[newRoot] = oldNewRootSize;
    next.groups += 1;
    next.undone += 1;
    next.undos.push([hungRoot, newRoot]);
  }
  return next;
}
