import assert from "node:assert";
import { rootOf, depthOf, membersOf, heightOf } from "../sets.js";
import { addElem, mergeEq, queryEq, undoMerge } from "../ops.js";
import { render } from "../app.js";

const base = {
  elems: [], parent: {}, size: {}, groups: 0, merges: [], undos: [], queries: [],
  stack: [], added: 0, unions: 0, undone: 0
};
const spec = {
  state: base,
  events: [{ kind: "add", name: "a" }, { kind: "union", a: "a", b: "a" }]
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("rootOf returns a string", () => {
  assert.strictEqual(typeof rootOf({ a: "a" }, "a"), "string");
});

check("depthOf returns a number", () => {
  assert.strictEqual(typeof depthOf({ a: "a" }, "a"), "number");
});

check("membersOf returns a list", () => {
  assert.ok(Array.isArray(membersOf({ a: "a" }, ["a"], "a")));
});

check("heightOf returns a number", () => {
  assert.strictEqual(typeof heightOf({ a: "a" }, ["a"]), "number");
});

check("addElem returns a state", () => {
  assert.ok(Array.isArray(addElem(base, "a").elems));
});

check("mergeEq returns a state", () => {
  assert.strictEqual(typeof mergeEq(addElem(addElem(base, "a"), "b"), "a", "b").parent, "object");
});

check("queryEq returns a state", () => {
  assert.ok(Array.isArray(queryEq(addElem(addElem(base, "a"), "b"), "a", "b").queries));
});

check("undoMerge returns a state", () => {
  const held = mergeEq(addElem(addElem(base, "a"), "b"), "a", "b");
  assert.strictEqual(typeof undoMerge(held, 1).stack, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(spec).count_events, "number");
});

console.log("9 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
