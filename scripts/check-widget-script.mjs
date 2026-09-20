/**
 * Smoke test for the Scriptable widget in src/lib/scriptable/widget-source.ts.
 *
 * That script only ever runs inside Scriptable on iOS, so nothing else in the
 * project type-checks or executes it. This harness stands in for the Scriptable
 * runtime — just enough of ListWidget, Color, DrawContext, Request and friends
 * to build every widget family under every parameter and data scenario, with
 * the stubs asserting on the argument types the real API requires.
 *
 * Run with: npm run check:widget
 */
import fs from "node:fs";
import vm from "node:vm";

const SAMPLE = {
  generatedAt: new Date().toISOString(),
  timezone: "Europe/Zurich",
  user: { name: "Beispiel Nutzer" },
  goalMode: "MAINTAIN",
  today: {
    date: "2026-01-01",
    label: "Donnerstag, 1. Januar",
    mealCount: 3,
    totals: { calories: 1480, protein: 92, carbs: 148, fat: 54, fiber: 21 },
    remaining: { calories: 720, protein: 38, carbs: 92, fat: 16, fiber: 9 },
    meals: [
      { id: "3", name: "Linsensalat", mealType: "LUNCH", time: "12:40", calories: 520, protein: 26 },
      { id: "2", name: "Kaffee & Gipfeli", mealType: "SNACK", time: "10:05", calories: 310, protein: 7 },
      { id: "1", name: "Haferbrei", mealType: "BREAKFAST", time: "07:20", calories: 650, protein: 59 },
    ],
  },
  goals: { calories: 2200, protein: 130, carbs: 240, fat: 70, fiber: 30 },
  week: [
    { date: "2025-12-26", label: "Fr", calories: 2050, isToday: false },
    { date: "2025-12-27", label: "Sa", calories: 2480, isToday: false },
    { date: "2025-12-28", label: "So", calories: 1890, isToday: false },
    { date: "2025-12-29", label: "Mo", calories: 2140, isToday: false },
    { date: "2025-12-30", label: "Di", calories: 1720, isToday: false },
    { date: "2025-12-31", label: "Mi", calories: 2260, isToday: false },
    { date: "2026-01-01", label: "Do", calories: 1480, isToday: true },
  ],
  streak: 6,
  weight: { kg: 78.4, recordedOn: "2026-01-01", trendKg: -0.6 },
};

/** An empty day and an over-budget day exercise the other rendering branches. */
const EMPTY = {
  ...SAMPLE,
  today: { ...SAMPLE.today, mealCount: 0, totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }, meals: [] },
  week: SAMPLE.week.map((day) => ({ ...day, calories: 0 })),
  streak: 0,
  weight: null,
};
const OVER = {
  ...SAMPLE,
  today: { ...SAMPLE.today, totals: { calories: 2960, protein: 180, carbs: 320, fat: 110, fiber: 41 } },
};

const FAMILIES = [
  "small",
  "medium",
  "large",
  "extraLarge",
  "accessoryCircular",
  "accessoryRectangular",
  "accessoryInline",
];
const PARAMS = ["", "mahlzeiten", "ring, dunkel", "hell", "quatsch"];
const SCENARIOS = [
  { name: "live", payload: SAMPLE, mode: "ok", token: "ns_test" },
  { name: "leerer Tag", payload: EMPTY, mode: "ok", token: "ns_test" },
  { name: "über dem Ziel", payload: OVER, mode: "ok", token: "ns_test" },
  { name: "offline mit Cache", payload: SAMPLE, mode: "offline", token: "ns_test" },
  { name: "offline ohne Cache", payload: SAMPLE, mode: "nocache", token: "ns_test" },
  { name: "Key widerrufen", payload: SAMPLE, mode: "auth", token: "ns_test" },
  { name: "ohne Key", payload: SAMPLE, mode: "ok", token: "" },
];

function makeSandbox({ payload, mode, token, family, param }) {
  class WidgetText {
    constructor(value) { this.value = value; }
    centerAlignText() {}
    rightAlignText() {}
  }
  class WidgetImage { constructor(image) { this.image = image; } }
  class WidgetStack {
    constructor() { this.children = []; }
    addStack() { const stack = new WidgetStack(); this.children.push(stack); return stack; }
    addText(value) { const node = new WidgetText(value); this.children.push(node); return node; }
    addImage(image) { const node = new WidgetImage(image); this.children.push(node); return node; }
    addSpacer(amount) { this.children.push({ spacer: amount }); }
    layoutHorizontally() {}
    layoutVertically() {}
    centerAlignContent() {}
    bottomAlignContent() {}
    topAlignContent() {}
    setPadding() {}
  }
  class ListWidget extends WidgetStack {
    async presentSmall() {}
    async presentMedium() {}
    async presentLarge() {}
  }
  class Color {
    constructor(hex, alpha) {
      if (typeof hex !== "string" || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
        throw new Error(`Color: invalid hex ${hex}`);
      }
      this.hex = hex;
      this.alpha = alpha;
    }
    static dynamic(light, dark) {
      if (!(light instanceof Color) || !(dark instanceof Color)) {
        throw new Error("Color.dynamic expects two Colors");
      }
      return light;
    }
    static white() { return new Color("#ffffff"); }
  }
  class Point {
    constructor(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Point: not finite (${x}, ${y})`);
      this.x = x;
      this.y = y;
    }
  }
  class Size {
    constructor(width, height) {
      if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
        throw new Error(`Size: invalid ${width}x${height}`);
      }
      this.width = width;
      this.height = height;
    }
  }
  class Rect {
    constructor(...values) {
      if (values.some((value) => !Number.isFinite(value))) throw new Error("Rect: not finite");
    }
  }
  class Path {
    addLines(points) {
      if (!Array.isArray(points) || points.length < 2) throw new Error("addLines: needs at least two points");
      for (const point of points) {
        if (!(point instanceof Point)) throw new Error("addLines: expects Points");
      }
    }
  }
  class DrawContext {
    addPath() {}
    strokePath() {}
    fillEllipse() {}
    setStrokeColor(color) { if (!(color instanceof Color)) throw new Error("setStrokeColor: expects a Color"); }
    setFillColor(color) { if (!(color instanceof Color)) throw new Error("setFillColor: expects a Color"); }
    setLineWidth(width) { if (!Number.isFinite(width)) throw new Error("setLineWidth: not finite"); }
    getImage() { return { kind: "image" }; }
  }
  const Font = {};
  for (const name of ["systemFont", "boldSystemFont", "semiboldSystemFont", "mediumSystemFont", "heavySystemFont", "lightSystemFont", "thinSystemFont"]) {
    Font[name] = (size) => {
      if (!Number.isFinite(size)) throw new Error(`${name}: size not finite`);
      return { name, size };
    };
  }

  const files = new Map();
  if (mode === "offline") {
    files.set("/cache/nutrisight-widget/day.json", JSON.stringify({ at: Date.now(), json: payload }));
  }

  return {
    ListWidget,
    Color,
    Point,
    Size,
    Rect,
    Path,
    LinearGradient: class {},
    DrawContext,
    Font,
    SFSymbol: { named: () => ({ image: { kind: "sfsymbol" }, applyFont() {} }) },
    Request: class {
      constructor(url) { this.url = url; this.headers = {}; }
      async loadJSON() {
        if (mode === "offline" || mode === "nocache") throw new Error("network unavailable");
        if (mode === "auth") return { error: "Unauthorized" };
        return payload;
      }
    },
    FileManager: {
      local: () => ({
        joinPath: (base, name) => `${base}/${name}`,
        cacheDirectory: () => "/cache",
        fileExists: (path) => path.startsWith("/cache") && (!path.endsWith(".json") || files.has(path)),
        createDirectory: () => {},
        readString: (path) => files.get(path),
        writeString: (path, value) => files.set(path, value),
      }),
    },
    Alert: class {
      addAction() {}
      addCancelAction() {}
      async presentSheet() { return -1; }
    },
    args: { widgetParameter: param },
    config: { runsInWidget: true, widgetFamily: family },
    Script: {
      setWidget(widget) { if (!(widget instanceof ListWidget)) throw new Error("setWidget: not a ListWidget"); },
      complete() {},
    },
    console,
  };
}

const MARKER = "export const WIDGET_SOURCE = String.raw`";
const source = fs.readFileSync(new URL("../src/lib/scriptable/widget-source.ts", import.meta.url), "utf8");
const body = source.slice(source.indexOf(MARKER) + MARKER.length, source.lastIndexOf("`;"));

if (body.includes("`") || body.includes("${")) {
  console.error("widget-source.ts: the widget code must not contain a backtick or ${ — it lives in a String.raw literal.");
  process.exit(1);
}
if ((body.match(/"__CONFIG__"/g) ?? []).length !== 1) {
  console.error('widget-source.ts: expected exactly one "__CONFIG__" placeholder.');
  process.exit(1);
}

let failures = 0;
let runs = 0;
for (const scenario of SCENARIOS) {
  const script = body.replace('"__CONFIG__"', () =>
    JSON.stringify(
      {
        baseUrl: "https://nutrisight.example.ch",
        appUrl: "https://nutrisight.example.ch",
        token: scenario.token,
        focus: "makros",
      },
      null,
      2,
    ),
  );
  for (const family of FAMILIES) {
    for (const param of PARAMS) {
      runs += 1;
      const sandbox = makeSandbox({ ...scenario, family, param });
      try {
        // The script uses top-level await, so wrap it and await the result —
        // a rejected promise would otherwise slip past the catch.
        await vm.runInNewContext(
          `(async () => {${script.replace(/\nScript\.complete\(\);\s*$/, "")}\n})()`,
          sandbox,
          { timeout: 5000 },
        );
      } catch (error) {
        failures += 1;
        console.error(`FAIL  ${scenario.name} · ${family} · "${param}" → ${error.message}`);
      }
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} of ${runs} widget builds failed.`);
  process.exit(1);
}
console.log(`Widget-Skript ok: ${runs} Kombinationen aus Grösse, Parameter und Datenlage gebaut.`);
