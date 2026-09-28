import fs from "node:fs";
import { render } from "./app.js";
import { addElem, mergeEq, queryEq, undoMerge } from "./ops.js";

const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/scene.json", "utf8"));
const view = render(spec);
const __lines = [];
function emit(label, value) {
  __lines.push([String(label), value]);
}

emit("父表", view.parents);
emit("大小表", view.sizes);
emit("分量表", view.table);
emit("分量数", view.groups);
emit("合并记录", view.merges);
emit("撤销记录", view.undos);
emit("撤销栈", view.stack);
emit("查询记录", view.queries);
emit("登记成功数", view.added);
emit("合并成功数", view.unions);
emit("撤销成功数", view.undone);
emit("父表自洽", view.consistent);
emit("分量数对得上", view.count_ok);
emit("大小与分量一致", view.sizes_ok);
emit("撤销栈自洽", view.stack_ok);
emit("树高受限", view.height_bound);
emit("重放不新增", view.replay_new);
emit("拆两轮中间态不同", view.mid_differs);
emit("拆两轮收尾态一致", view.split_equal);
emit("失败不改变状态", view.steady);
emit("异常事件数", view.failed_events);

// ---- 异常路径探针：真调用实现，看它报出什么码 ----
const clean = JSON.parse(JSON.stringify(spec.state));
const held = { elems: [], parent: {}, size: {}, groups: 0, merges: [], undos: [], queries: [],
               stack: [], added: 0, unions: 0, undone: 0 };
let pair = addElem(held, "a");
pair = addElem(pair, "b");
pair = mergeEq(pair, "a", "b");

try {
  addElem(clean, "A1");
  emit("名字不合法报码", "没有报错");
} catch (error) {
  emit("名字不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  let twice = addElem(clean, "a");
  addElem(twice, "a");
  emit("重复登记报码", "没有报错");
} catch (error) {
  emit("重复登记报码", error && error.code ? error.code : String(error.message));
}

try {
  mergeEq(clean, "a", "b");
  emit("未登记报码", "没有报错");
} catch (error) {
  emit("未登记报码", error && error.code ? error.code : String(error.message));
}

try {
  mergeEq(pair, "a", "b");
  emit("同分量合并报码", "没有报错");
} catch (error) {
  emit("同分量合并报码", error && error.code ? error.code : String(error.message));
}

try {
  undoMerge(pair, 0);
  emit("撤销次数不合法报码", "没有报错");
} catch (error) {
  emit("撤销次数不合法报码", error && error.code ? error.code : String(error.message));
}

try {
  undoMerge(pair, 5);
  emit("撤销超额报码", "没有报错");
} catch (error) {
  emit("撤销超额报码", error && error.code ? error.code : String(error.message));
}

const EXPECTED = {
  "父表": [
    [
      "a",
      "a"
    ],
    [
      "b",
      "a"
    ],
    [
      "c",
      "c"
    ],
    [
      "d",
      "c"
    ],
    [
      "e",
      "c"
    ],
    [
      "f",
      "a"
    ]
  ],
  "大小表": [
    [
      "a",
      3
    ],
    [
      "b",
      1
    ],
    [
      "c",
      3
    ],
    [
      "d",
      1
    ],
    [
      "e",
      1
    ],
    [
      "f",
      1
    ]
  ],
  "分量表": [
    [
      "a",
      [
        "a",
        "b",
        "f"
      ]
    ],
    [
      "c",
      [
        "c",
        "d",
        "e"
      ]
    ]
  ],
  "分量数": 2,
  "合并记录": [
    [
      "a",
      "b",
      "a",
      2
    ],
    [
      "c",
      "d",
      "c",
      2
    ],
    [
      "b",
      "c",
      "a",
      4
    ],
    [
      "d",
      "e",
      "c",
      3
    ],
    [
      "f",
      "b",
      "a",
      3
    ]
  ],
  "撤销记录": [
    [
      "c",
      "a"
    ]
  ],
  "撤销栈": [
    [
      "b",
      "a"
    ],
    [
      "d",
      "c"
    ],
    [
      "e",
      "c"
    ],
    [
      "f",
      "a"
    ]
  ],
  "查询记录": [
    [
      "a",
      "d",
      true
    ],
    [
      "e",
      "b",
      false
    ]
  ],
  "登记成功数": 6,
  "合并成功数": 5,
  "撤销成功数": 1,
  "父表自洽": true,
  "分量数对得上": true,
  "大小与分量一致": true,
  "撤销栈自洽": true,
  "树高受限": true,
  "重放不新增": 0,
  "拆两轮中间态不同": true,
  "拆两轮收尾态一致": true,
  "失败不改变状态": true,
  "异常事件数": 1,
  "名字不合法报码": "E_BAD_NAME",
  "重复登记报码": "E_DUP_ELEM",
  "未登记报码": "E_UNKNOWN_ELEM",
  "同分量合并报码": "E_SAME",
  "撤销次数不合法报码": "E_BAD_COUNT",
  "撤销超额报码": "E_UNDO_RANGE"
};
function __same(got, want) {
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find(function (pair) { return pair[0] === label; });
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  if (__same(found[1], want)) { console.log("一致 " + label + " = " + JSON.stringify(found[1])); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(found[1])); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
