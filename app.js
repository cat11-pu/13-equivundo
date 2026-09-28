// app.js：把一段事件流跑成验收视图（父表、大小表、分量表、记录与不变量）
import { rootOf, depthOf, membersOf, heightOf } from "./sets.js";
import { addElem, mergeEq, queryEq, undoMerge } from "./ops.js";

function rows(list) {
  return (list || []).map(function (row) { return row.slice(); });
}

function copyState(state) {
  const src = state || {};
  const parent = {};
  const inParent = src.parent || {};
  for (const name of Object.keys(inParent)) { parent[name] = inParent[name]; }
  const size = {};
  const inSize = src.size || {};
  for (const name of Object.keys(inSize)) { size[name] = inSize[name]; }
  return {
    elems: (src.elems || []).slice(),
    parent: parent,
    size: size,
    groups: src.groups || 0,
    merges: rows(src.merges),
    undos: rows(src.undos),
    queries: rows(src.queries),
    stack: rows(src.stack),
    added: src.added || 0,
    unions: src.unions || 0,
    undone: src.undone || 0
  };
}

function step(state, event) {
  if (event.kind === "add") { return addElem(state, event.name); }
  if (event.kind === "union") { return mergeEq(state, event.a, event.b); }
  if (event.kind === "find") { return queryEq(state, event.a, event.b); }
  if (event.kind === "undo") { return undoMerge(state, event.count); }
  const error = new Error("E_BAD_EVENT");
  error.code = "E_BAD_EVENT";
  throw error;
}

function fingerprint(state) {
  return JSON.stringify({
    elems: state.elems, parent: state.parent, size: state.size, groups: state.groups,
    merges: state.merges, undos: state.undos, queries: state.queries, stack: state.stack,
    added: state.added, unions: state.unions, undone: state.undone
  });
}

function play(start, events) {
  let now = copyState(start);
  const rejected = [];
  let failed = 0;
  let steady = true;
  for (const event of events || []) {
    const before = fingerprint(now);
    try {
      now = step(now, event);
    } catch (error) {
      failed += 1;
      if (fingerprint(now) !== before) { steady = false; }
      const code = error && error.code ? error.code : "E_BAD_EVENT";
      let mark = String(event && event.kind);
      if (event && event.name !== undefined) { mark = String(event.name); }
      if (event && event.a !== undefined) { mark = String(event.a) + "-" + String(event.b); }
      rejected.push([mark, code]);
    }
  }
  return { state: now, rejected: rejected, failed: failed, steady: steady };
}

export function render(spec) {
  const played = play(spec.state, spec.events);
  const state = played.state;
  const elems = state.elems.slice().sort();
  const parents = elems.map(function (name) {
    return [name, state.parent[name] === undefined ? "" : state.parent[name]];
  });
  const sizes = elems.map(function (name) {
    return [name, state.size[name] === undefined ? 0 : state.size[name]];
  });
  const roots = elems.filter(function (name) { return state.parent[name] === name; }).sort();
  const table = roots.map(function (name) { return [name, membersOf(state.parent, elems, name)]; });
  let consistent = true;
  for (const name of elems) {
    if (state.parent[name] === undefined) { consistent = false; continue; }
    if (elems.indexOf(state.parent[name]) < 0) { consistent = false; }
    let now = name;
    let steps = 0;
    while (state.parent[now] !== undefined && state.parent[now] !== now) {
      now = state.parent[now];
      steps += 1;
      if (steps > elems.length) { consistent = false; break; }
    }
    if (rootOf(state.parent, name) !== now) { consistent = false; }
  }
  let sizesOK = true;
  for (const root of roots) {
    if (state.size[root] !== membersOf(state.parent, elems, root).length) { sizesOK = false; }
  }
  let countOK = state.groups === elems.length - state.unions + state.undone;
  let stackOK = true;
  for (const row of state.stack) {
    if (row.length !== 4 || row[0] === row[1] || state.parent[row[0]] !== row[1]) { stackOK = false; }
  }
  const height = heightOf(state.parent, elems);
  const limit = elems.length === 0 ? 0 : Math.floor(Math.log(elems.length) / Math.LN2) + 1;
  const once = play(spec.state, spec.events);
  const half = Math.ceil((spec.events || []).length / 2);
  const left = play(spec.state, (spec.events || []).slice(0, half));
  const right = play(left.state, (spec.events || []).slice(half));
  return {
    elems: elems,
    parents: parents,
    sizes: sizes,
    table: table,
    groups: state.groups,
    merges: state.merges.map(function (row) { return row.slice(); }),
    undos: state.undos.map(function (row) { return row.slice(); }),
    stack: state.stack.map(function (row) { return [row[0], row[1]]; }),
    queries: state.queries.map(function (row) { return [row[0], row[1], row[2] === true]; }),
    added: state.added,
    unions: state.unions,
    undone: state.undone,
    consistent: consistent,
    count_ok: countOK,
    sizes_ok: sizesOK,
    stack_ok: stackOK,
    height_bound: height <= limit,
    replay_new: fingerprint(once.state) === fingerprint(state) ? 0 : 1,
    mid_differs: fingerprint(left.state) !== fingerprint(state),
    split_equal: fingerprint(right.state) === fingerprint(once.state),
    steady: played.steady,
    failed_events: played.failed,
    failed_marks: played.rejected,
    count_events: (spec.events || []).length,
    tail: depthOf(state.parent, elems.length > 0 ? elems[0] : "") + membersOf(state.parent, elems, elems[0] || "").length
  };
}
