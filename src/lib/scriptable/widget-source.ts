/**
 * Source of the Scriptable widget, verbatim.
 *
 * It is stored as a `String.raw` literal rather than a separate `.js` file so
 * it bundles into both the server and the browser without a raw-import loader,
 * which means the settings page can build the ready-to-paste script offline.
 *
 * Because of that the widget code must never use a backtick or `${`. It runs
 * inside Scriptable, not here, so it also cannot import anything from the app.
 */
export const WIDGET_SOURCE = String.raw`// NutriSight — Widgets für Scriptable (https://scriptable.app)
// Erzeugt in der App unter Einstellungen › Widgets für iPhone & iPad.
//
// Das Skript holt die Tageswerte über den persönlichen API-Key aus deiner
// NutriSight-Instanz. Der Key steckt unten in CONFIG — teile das Skript nicht.
//
// Widget-Parameter (Widget lange drücken › Widget bearbeiten › Parameter),
// mehrere durch Komma getrennt:
//   hell | dunkel       – Farbschema festnageln statt System folgen
//   makros | mahlzeiten – was das mittlere/grosse Widget rechts zeigt
//   ring                – nur der Kalorienring, ohne Zusatzspalte
//
// Antippen öffnet die App; der Erfassen-Chip springt direkt in die Kamera.

const CONFIG = "__CONFIG__";

// ---------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------

function parseParam(raw) {
  const out = { theme: "auto", focus: CONFIG.focus || "makros" };
  const tokens = String(raw || "")
    .split(/[,;]/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  for (const token of tokens) {
    if (token === "hell" || token === "light") out.theme = "hell";
    else if (token === "dunkel" || token === "dark") out.theme = "dunkel";
    else if (token === "makros" || token === "macros") out.focus = "makros";
    else if (token === "mahlzeiten" || token === "meals") out.focus = "mahlzeiten";
    else if (token === "ring") out.focus = "ring";
  }
  return out;
}

const PARAM = parseParam(args.widgetParameter);

// ---------------------------------------------------------------------------
// Palette
// Light and dark values mirror the app's tokens. With no theme parameter the
// widget follows the system via Color.dynamic.
// ---------------------------------------------------------------------------

function dyn(lightHex, darkHex, alpha) {
  const a = alpha === undefined ? 1 : alpha;
  const light = new Color(lightHex, a);
  const dark = new Color(darkHex, a);
  if (PARAM.theme === "hell") return light;
  if (PARAM.theme === "dunkel") return dark;
  return Color.dynamic(light, dark);
}

const C = {
  ink: dyn("#10231c", "#e8f7f1"),
  inkSoft: dyn("#5b736a", "#9db7ae"),
  inkFaint: dyn("#10231c", "#e8f7f1", 0.45),
  accent: dyn("#0f766e", "#2dd4bf"),
  track: dyn("#0f766e", "#2dd4bf", 0.16),
  warn: dyn("#b45309", "#fbbf24"),
  protein: dyn("#0f766e", "#2dd4bf"),
  carbs: dyn("#0e7490", "#38bdf8"),
  fat: dyn("#c2410c", "#fb923c"),
  glass: dyn("#ffffff", "#ffffff", 0.16),
  glassEdge: dyn("#ffffff", "#ffffff", 0.3),
  bgTop: dyn("#f2fbf7", "#081915"),
  bgBottom: dyn("#d8f0e7", "#0d2b24"),
};

function backgroundGradient() {
  const gradient = new LinearGradient();
  gradient.colors = [C.bgTop, C.bgBottom];
  gradient.locations = [0, 1];
  gradient.startPoint = new Point(0.15, 0);
  gradient.endPoint = new Point(0.85, 1);
  return gradient;
}

// ---------------------------------------------------------------------------
// Formatierung
// ---------------------------------------------------------------------------

/** Swiss thousands separator, the same apostrophe the app uses. */
function nf(value) {
  const rounded = Math.round(Number(value) || 0);
  let digits = String(Math.abs(rounded));
  let grouped = "";
  while (digits.length > 3) {
    grouped = "'" + digits.slice(-3) + grouped;
    digits = digits.slice(0, -3);
  }
  return (rounded < 0 ? "-" : "") + digits + grouped;
}

function grams(value) {
  return nf(value) + " g";
}

const MEAL_LABELS = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittag",
  DINNER: "Abend",
  SNACK: "Snack",
};

function font(size, weight) {
  if (weight === "heavy") return Font.heavySystemFont(size);
  if (weight === "bold") return Font.boldSystemFont(size);
  if (weight === "semibold") return Font.semiboldSystemFont(size);
  if (weight === "medium") return Font.mediumSystemFont(size);
  return Font.systemFont(size);
}

function text(parent, value, size, color, options) {
  const opts = options || {};
  const element = parent.addText(String(value === null || value === undefined ? "" : value));
  element.font = font(size, opts.weight);
  element.textColor = color;
  element.lineLimit = opts.lines || 1;
  element.minimumScaleFactor = opts.scale || 0.7;
  if (opts.align === "center") element.centerAlignText();
  if (opts.align === "right") element.rightAlignText();
  return element;
}

function hstack(parent, spacing) {
  const stack = parent.addStack();
  stack.layoutHorizontally();
  stack.spacing = spacing || 0;
  return stack;
}

function vstack(parent, spacing) {
  const stack = parent.addStack();
  stack.layoutVertically();
  stack.spacing = spacing || 0;
  return stack;
}

/** Inner translucent panel — the widget's stand-in for the app's glass cards. */
function panel(parent, radius) {
  const stack = parent.addStack();
  stack.layoutVertically();
  stack.backgroundColor = C.glass;
  stack.cornerRadius = radius === undefined ? 14 : radius;
  stack.borderWidth = 1;
  stack.borderColor = C.glassEdge;
  stack.setPadding(9, 10, 9, 10);
  return stack;
}

// ---------------------------------------------------------------------------
// Ring
// DrawContext has no arc primitive and no line caps, so the arc is a dense
// polyline with a filled circle at each end standing in for round caps.
// ---------------------------------------------------------------------------

function strokeArc(ctx, cx, cy, radius, from, to, color, lineWidth) {
  const span = to - from;
  if (span <= 0) return;
  const steps = Math.max(6, Math.round(span * 180));
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = from + span * (i / steps);
    const angle = -Math.PI / 2 + t * Math.PI * 2;
    points.push(new Point(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius));
  }
  const path = new Path();
  path.addLines(points);
  ctx.addPath(path);
  ctx.setStrokeColor(color);
  ctx.setLineWidth(lineWidth);
  ctx.strokePath();
  ctx.setFillColor(color);
  for (const point of [points[0], points[points.length - 1]]) {
    ctx.fillEllipse(
      new Rect(point.x - lineWidth / 2, point.y - lineWidth / 2, lineWidth, lineWidth),
    );
  }
}

/**
 * Progress ring. Past 100 % the full ring stays accent-coloured and the excess
 * is drawn over it in the warning colour, so going over budget is visible
 * without the ring silently wrapping around.
 */
function ringImage(size, progress, lineWidth) {
  const ctx = new DrawContext();
  ctx.size = new Size(size, size);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  const radius = (size - lineWidth) / 2;
  const center = size / 2;
  strokeArc(ctx, center, center, radius, 0, 1, C.track, lineWidth);
  const filled = Math.max(0, Math.min(progress, 1));
  if (filled > 0) strokeArc(ctx, center, center, radius, 0, filled, C.accent, lineWidth);
  if (progress > 1) {
    strokeArc(ctx, center, center, radius, 0, Math.min(progress - 1, 1), C.warn, lineWidth);
  }
  return ctx.getImage();
}

/** Ring with the remaining calories stacked in the middle. */
function calorieRing(parent, data, size, lineWidth, options) {
  const opts = options || {};
  const goal = Math.max(1, data.goals.calories);
  const eaten = data.today.totals.calories;
  const left = Math.round(goal - eaten);
  const wrapper = parent.addStack();
  wrapper.size = new Size(size, size);
  wrapper.backgroundImage = ringImage(size, eaten / goal, lineWidth);
  wrapper.layoutVertically();
  wrapper.centerAlignContent();

  const inner = vstack(wrapper, 0);
  inner.size = new Size(size, size);
  inner.layoutVertically();
  inner.addSpacer();
  const valueRow = hstack(inner, 0);
  valueRow.addSpacer();
  text(valueRow, nf(Math.abs(left)), opts.valueSize || Math.round(size * 0.27), left < 0 ? C.warn : C.ink, {
    weight: "bold",
    align: "center",
  });
  valueRow.addSpacer();
  const labelRow = hstack(inner, 0);
  labelRow.addSpacer();
  text(
    labelRow,
    left < 0 ? "kcal drüber" : "kcal übrig",
    opts.labelSize || Math.max(8, Math.round(size * 0.1)),
    C.inkSoft,
    { weight: "medium", align: "center" },
  );
  labelRow.addSpacer();
  inner.addSpacer();
  return wrapper;
}

// ---------------------------------------------------------------------------
// Balken
// ---------------------------------------------------------------------------

function bar(parent, width, height, ratio, color) {
  const track = parent.addStack();
  track.size = new Size(width, height);
  track.backgroundColor = C.track;
  track.cornerRadius = height / 2;
  track.layoutHorizontally();
  const filled = Math.max(0, Math.min(ratio, 1));
  if (filled > 0) {
    const fill = track.addStack();
    fill.size = new Size(Math.max(height, width * filled), height);
    fill.backgroundColor = ratio > 1.05 ? C.warn : color;
    fill.cornerRadius = height / 2;
  }
  track.addSpacer();
  return track;
}

function macroRow(parent, label, value, goal, color, width, options) {
  const opts = options || {};
  const row = vstack(parent, 3);
  const head = hstack(row, 4);
  text(head, label, opts.labelSize || 11, C.inkSoft, { weight: "medium" });
  head.addSpacer();
  text(head, grams(value) + " / " + grams(goal), opts.valueSize || 11, C.ink, {
    weight: "semibold",
  });
  bar(row, width, opts.barHeight || 6, value / Math.max(1, goal), color);
  return row;
}

function macroBlock(parent, data, width, options) {
  const opts = options || {};
  const block = vstack(parent, opts.gap || 8);
  const totals = data.today.totals;
  const goals = data.goals;
  macroRow(block, "Protein", totals.protein, goals.protein, C.protein, width, opts);
  macroRow(block, "Kohlenhydrate", totals.carbs, goals.carbs, C.carbs, width, opts);
  macroRow(block, "Fett", totals.fat, goals.fat, C.fat, width, opts);
  if (opts.withFiber) {
    macroRow(block, "Ballaststoffe", totals.fiber, goals.fiber, C.accent, width, opts);
  }
  return block;
}

// ---------------------------------------------------------------------------
// Mahlzeiten und Wochenstreifen
// ---------------------------------------------------------------------------

function mealRows(parent, data, limit, options) {
  const opts = options || {};
  const meals = data.today.meals.slice(0, limit);
  const list = vstack(parent, opts.gap || 6);
  if (meals.length === 0) {
    text(list, "Noch nichts erfasst", opts.size || 12, C.inkSoft, { weight: "medium" });
    return list;
  }
  for (const meal of meals) {
    const row = hstack(list, 6);
    row.centerAlignContent();
    text(row, meal.time, opts.size || 12, C.inkFaint, { weight: "medium" });
    text(row, meal.name, opts.size || 12, C.ink, {
      weight: "semibold",
      lines: 1,
      scale: 0.6,
    });
    row.addSpacer();
    text(row, nf(meal.calories), opts.size || 12, C.inkSoft, { weight: "semibold" });
  }
  return list;
}

function weekChart(parent, data, width, height) {
  const goal = Math.max(1, data.goals.calories);
  const peak = Math.max(goal, ...data.week.map((day) => day.calories)) * 1.05;
  const columns = data.week.length;
  const gap = 6;
  const barWidth = Math.max(6, (width - gap * (columns - 1)) / columns);
  const chart = hstack(parent, gap);
  chart.bottomAlignContent();
  for (const day of data.week) {
    const column = vstack(chart, 4);
    column.bottomAlignContent();
    const filled = Math.max(3, Math.round((day.calories / peak) * height));
    const spacerHeight = Math.max(0, height - filled);
    const columnInner = vstack(column, 0);
    columnInner.addSpacer(spacerHeight);
    const column_bar = columnInner.addStack();
    column_bar.size = new Size(barWidth, filled);
    column_bar.cornerRadius = Math.min(4, barWidth / 2);
    column_bar.backgroundColor =
      day.calories > goal * 1.05 ? C.warn : day.isToday ? C.accent : C.track;
    const labelRow = hstack(column, 0);
    labelRow.addSpacer();
    text(labelRow, day.label, 9, day.isToday ? C.ink : C.inkFaint, {
      weight: day.isToday ? "bold" : "medium",
      align: "center",
    });
    labelRow.addSpacer();
  }
  return chart;
}

// ---------------------------------------------------------------------------
// Kopfzeile
// ---------------------------------------------------------------------------

function header(parent, data, stale, options) {
  const opts = options || {};
  const row = hstack(parent, 6);
  row.centerAlignContent();
  const dot = row.addStack();
  dot.size = new Size(7, 7);
  dot.cornerRadius = 3.5;
  dot.backgroundColor = stale ? C.warn : C.accent;
  text(row, opts.title || "NutriSight", opts.size || 12, C.inkSoft, {
    weight: "semibold",
  });
  row.addSpacer();
  if (opts.trailing) {
    text(row, opts.trailing, opts.size || 12, C.inkSoft, { weight: "medium" });
  }
  return row;
}

/** Tappable chip that deep-links into the capture screen. */
function captureChip(parent, label) {
  const chip = parent.addStack();
  chip.layoutHorizontally();
  chip.centerAlignContent();
  chip.backgroundColor = C.accent;
  chip.cornerRadius = 13;
  chip.setPadding(5, 10, 5, 10);
  chip.url = CONFIG.appUrl + "/meals/new";
  const symbol = SFSymbol.named("camera.fill");
  if (symbol) {
    symbol.applyFont(Font.boldSystemFont(10));
    const image = chip.addImage(symbol.image);
    image.imageSize = new Size(12, 12);
    image.tintColor = dyn("#f0fdfa", "#042f2e");
    chip.spacing = 5;
  }
  text(chip, label, 11, dyn("#f0fdfa", "#042f2e"), { weight: "bold" });
  return chip;
}

// ---------------------------------------------------------------------------
// Daten
// ---------------------------------------------------------------------------

const fm = FileManager.local();
const cacheDir = fm.joinPath(fm.cacheDirectory(), "nutrisight-widget");
if (!fm.fileExists(cacheDir)) fm.createDirectory(cacheDir, true);
const cacheFile = fm.joinPath(cacheDir, "day.json");

async function loadData() {
  if (!CONFIG.token) return { error: "setup" };
  try {
    const request = new Request(CONFIG.baseUrl + "/api/v1/widget");
    request.headers = {
      Authorization: "Bearer " + CONFIG.token,
      Accept: "application/json",
    };
    request.timeoutInterval = 12;
    const json = await request.loadJSON();
    if (json && json.error === "Unauthorized") return { error: "auth" };
    if (!json || !json.today) throw new Error("Unerwartete Antwort");
    fm.writeString(cacheFile, JSON.stringify({ at: Date.now(), json: json }));
    return { data: json, stale: false };
  } catch (e) {
    // Widgets often run without network. Last known day beats an empty widget.
    if (fm.fileExists(cacheFile)) {
      try {
        const cached = JSON.parse(fm.readString(cacheFile));
        if (cached && cached.json) return { data: cached.json, stale: true };
      } catch (parseError) {
        // fall through to the error widget
      }
    }
    return { error: "offline" };
  }
}

function errorWidget(kind) {
  const widget = new ListWidget();
  widget.backgroundGradient = backgroundGradient();
  widget.setPadding(14, 14, 14, 14);
  widget.url = CONFIG.appUrl + "/settings";
  const messages = {
    setup: ["Kein API-Key", "In NutriSight › Einstellungen › Widgets ein Skript mit Key erzeugen."],
    auth: ["Key ungültig", "Der API-Key wurde widerrufen. In den Einstellungen ein neues Skript erzeugen."],
    offline: ["Keine Verbindung", "NutriSight ist gerade nicht erreichbar."],
  };
  const message = messages[kind] || messages.offline;
  text(widget, "NutriSight", 12, C.inkSoft, { weight: "semibold" });
  widget.addSpacer(6);
  text(widget, message[0], 16, C.ink, { weight: "bold", lines: 2 });
  widget.addSpacer(4);
  text(widget, message[1], 11, C.inkSoft, { weight: "medium", lines: 4 });
  return widget;
}

// ---------------------------------------------------------------------------
// Layouts: Sperrbildschirm
// ---------------------------------------------------------------------------

function accessoryCircular(widget, data) {
  const goal = Math.max(1, data.goals.calories);
  const eaten = data.today.totals.calories;
  const left = Math.round(goal - eaten);
  const size = 58;
  const wrapper = widget.addStack();
  wrapper.size = new Size(size, size);
  wrapper.backgroundImage = ringImage(size, eaten / goal, 7);
  wrapper.layoutVertically();
  wrapper.addSpacer();
  const row = hstack(wrapper, 0);
  row.addSpacer();
  text(row, nf(Math.abs(left)), 15, Color.white(), { weight: "bold", align: "center" });
  row.addSpacer();
  const unit = hstack(wrapper, 0);
  unit.addSpacer();
  text(unit, "kcal", 9, new Color("#ffffff", 0.75), { weight: "medium", align: "center" });
  unit.addSpacer();
  wrapper.addSpacer();
}

function accessoryRectangular(widget, data) {
  const totals = data.today.totals;
  const goals = data.goals;
  const left = Math.round(goals.calories - totals.calories);
  const column = vstack(widget, 3);
  text(column, "NutriSight", 11, new Color("#ffffff", 0.7), { weight: "semibold" });
  text(
    column,
    nf(Math.abs(left)) + (left < 0 ? " kcal drüber" : " kcal übrig"),
    16,
    Color.white(),
    { weight: "bold" },
  );
  text(
    column,
    "P " + nf(totals.protein) + " · KH " + nf(totals.carbs) + " · F " + nf(totals.fat),
    11,
    new Color("#ffffff", 0.75),
    { weight: "medium" },
  );
}

function accessoryInline(widget, data) {
  const left = Math.round(data.goals.calories - data.today.totals.calories);
  const symbol = SFSymbol.named("fork.knife");
  if (symbol) widget.addImage(symbol.image);
  text(
    widget,
    nf(Math.abs(left)) + (left < 0 ? " kcal drüber" : " kcal übrig"),
    12,
    Color.white(),
    { weight: "medium" },
  );
}

// ---------------------------------------------------------------------------
// Layouts: Homescreen
// ---------------------------------------------------------------------------

function smallWidget(widget, data, stale) {
  widget.setPadding(13, 13, 13, 13);
  header(widget, data, stale, { size: 11, trailing: nf(data.today.totals.calories) + " kcal" });
  widget.addSpacer(6);
  const row = hstack(widget, 0);
  row.addSpacer();
  calorieRing(row, data, 92, 9, { valueSize: 25, labelSize: 9 });
  row.addSpacer();
  widget.addSpacer(7);
  const macros = hstack(widget, 0);
  const parts = [
    ["P", data.today.totals.protein, C.protein],
    ["KH", data.today.totals.carbs, C.carbs],
    ["F", data.today.totals.fat, C.fat],
  ];
  for (let i = 0; i < parts.length; i += 1) {
    if (i > 0) macros.addSpacer();
    const cell = vstack(macros, 1);
    const dotRow = hstack(cell, 3);
    dotRow.centerAlignContent();
    const dot = dotRow.addStack();
    dot.size = new Size(6, 6);
    dot.cornerRadius = 3;
    dot.backgroundColor = parts[i][2];
    text(dotRow, parts[i][0], 9, C.inkSoft, { weight: "medium" });
    text(cell, grams(parts[i][1]), 11, C.ink, { weight: "semibold" });
  }
}

function mediumWidget(widget, data, stale) {
  widget.setPadding(14, 15, 14, 15);
  header(widget, data, stale, {
    trailing: data.today.mealCount + (data.today.mealCount === 1 ? " Mahlzeit" : " Mahlzeiten"),
  });
  widget.addSpacer(8);
  const body = hstack(widget, 14);
  body.centerAlignContent();
  calorieRing(body, data, 96, 9, { valueSize: 26, labelSize: 9 });

  const right = vstack(body, 0);
  if (PARAM.focus === "mahlzeiten") {
    text(right, "Heute", 11, C.inkSoft, { weight: "semibold" });
    right.addSpacer(5);
    mealRows(right, data, 4, { size: 12, gap: 5 });
    right.addSpacer();
  } else if (PARAM.focus === "ring") {
    right.addSpacer();
    text(right, data.today.label, 13, C.ink, { weight: "semibold", lines: 2 });
    right.addSpacer(4);
    text(
      right,
      nf(data.today.totals.calories) + " von " + nf(data.goals.calories) + " kcal",
      12,
      C.inkSoft,
      { weight: "medium" },
    );
    right.addSpacer();
  } else {
    macroBlock(right, data, 156, { gap: 8, labelSize: 10, valueSize: 10, barHeight: 6 });
  }
  body.addSpacer();
}

function largeWidget(widget, data, stale) {
  widget.setPadding(16, 16, 16, 16);
  const top = hstack(widget, 8);
  top.centerAlignContent();
  const titleBlock = vstack(top, 2);
  text(titleBlock, data.today.label, 15, C.ink, { weight: "bold", lines: 1 });
  text(
    titleBlock,
    nf(data.today.totals.calories) + " von " + nf(data.goals.calories) + " kcal" +
      (stale ? " · zuletzt bekannt" : ""),
    11,
    C.inkSoft,
    { weight: "medium" },
  );
  top.addSpacer();
  captureChip(top, "Erfassen");

  widget.addSpacer(12);
  const body = hstack(widget, 16);
  body.centerAlignContent();
  calorieRing(body, data, 118, 11, { valueSize: 31, labelSize: 10 });
  macroBlock(body, data, 150, {
    gap: 9,
    labelSize: 11,
    valueSize: 11,
    barHeight: 7,
    withFiber: true,
  });
  body.addSpacer();

  widget.addSpacer(12);
  const list = panel(widget, 16);
  const listHead = hstack(list, 6);
  text(listHead, "Heute", 11, C.inkSoft, { weight: "semibold" });
  listHead.addSpacer();
  if (data.streak > 1) {
    text(listHead, data.streak + " Tage in Folge", 11, C.accent, { weight: "semibold" });
  }
  list.addSpacer(6);
  mealRows(list, data, 5, { size: 12, gap: 6 });
  widget.addSpacer();
}

function extraLargeWidget(widget, data, stale) {
  widget.setPadding(18, 18, 18, 18);
  const top = hstack(widget, 8);
  top.centerAlignContent();
  const titleBlock = vstack(top, 2);
  text(
    titleBlock,
    "Hallo " + ((data.user.name || "").split(" ")[0] || "du"),
    17,
    C.ink,
    { weight: "bold" },
  );
  text(titleBlock, data.today.label + (stale ? " · zuletzt bekannt" : ""), 12, C.inkSoft, {
    weight: "medium",
  });
  top.addSpacer();
  captureChip(top, "Mahlzeit erfassen");

  widget.addSpacer(14);
  const columns = hstack(widget, 18);

  const left = vstack(columns, 0);
  const ringRow = hstack(left, 16);
  ringRow.centerAlignContent();
  calorieRing(ringRow, data, 128, 12, { valueSize: 33, labelSize: 11 });
  macroBlock(ringRow, data, 170, {
    gap: 10,
    labelSize: 11,
    valueSize: 11,
    barHeight: 7,
    withFiber: true,
  });
  left.addSpacer(14);
  const list = panel(left, 16);
  text(list, "Heute", 11, C.inkSoft, { weight: "semibold" });
  list.addSpacer(7);
  mealRows(list, data, 6, { size: 12, gap: 7 });
  left.addSpacer();

  const right = vstack(columns, 0);
  const chartPanel = panel(right, 16);
  const chartHead = hstack(chartPanel, 6);
  text(chartHead, "7 Tage", 11, C.inkSoft, { weight: "semibold" });
  chartHead.addSpacer();
  const average = Math.round(
    data.week.reduce((total, day) => total + day.calories, 0) / Math.max(1, data.week.length),
  );
  text(chartHead, "Ø " + nf(average) + " kcal", 11, C.ink, { weight: "semibold" });
  chartPanel.addSpacer(10);
  weekChart(chartPanel, data, 230, 74);

  right.addSpacer(12);
  const facts = panel(right, 16);
  const streakRow = hstack(facts, 6);
  text(streakRow, "Serie", 11, C.inkSoft, { weight: "medium" });
  streakRow.addSpacer();
  text(streakRow, data.streak + (data.streak === 1 ? " Tag" : " Tage"), 11, C.ink, {
    weight: "semibold",
  });
  if (data.weight) {
    facts.addSpacer(6);
    const weightRow = hstack(facts, 6);
    text(weightRow, "Gewicht", 11, C.inkSoft, { weight: "medium" });
    weightRow.addSpacer();
    const trend =
      data.weight.trendKg === null || data.weight.trendKg === undefined
        ? ""
        : " (" + (data.weight.trendKg > 0 ? "+" : "") + data.weight.trendKg + ")";
    text(weightRow, data.weight.kg + " kg" + trend, 11, C.ink, { weight: "semibold" });
  }
  facts.addSpacer(6);
  const fiberRow = hstack(facts, 6);
  text(fiberRow, "Ballaststoffe", 11, C.inkSoft, { weight: "medium" });
  fiberRow.addSpacer();
  text(
    fiberRow,
    grams(data.today.totals.fiber) + " / " + grams(data.goals.fiber),
    11,
    C.ink,
    { weight: "semibold" },
  );
  right.addSpacer();
}

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------

async function build(family) {
  const result = await loadData();
  if (result.error) return errorWidget(result.error);

  const data = result.data;
  const widget = new ListWidget();
  widget.url = CONFIG.appUrl + "/dashboard";
  // iOS decides when to reload; 15 minutes is the shortest interval that is
  // reliably honoured without the widget being throttled.
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  const accessory = String(family || "").indexOf("accessory") === 0;
  if (!accessory) widget.backgroundGradient = backgroundGradient();

  if (family === "accessoryCircular") accessoryCircular(widget, data);
  else if (family === "accessoryRectangular") accessoryRectangular(widget, data);
  else if (family === "accessoryInline") accessoryInline(widget, data);
  else if (family === "small") smallWidget(widget, data, result.stale);
  else if (family === "large") largeWidget(widget, data, result.stale);
  else if (family === "extraLarge") extraLargeWidget(widget, data, result.stale);
  else mediumWidget(widget, data, result.stale);

  return widget;
}

if (config.runsInWidget) {
  Script.setWidget(await build(config.widgetFamily || "medium"));
} else {
  // Running from the Scriptable app: pick a size to preview.
  const options = [
    ["Klein", "small"],
    ["Mittel", "medium"],
    ["Gross", "large"],
    ["Extragross (iPad)", "extraLarge"],
    ["Sperrbildschirm rund", "accessoryCircular"],
    ["Sperrbildschirm Zeile", "accessoryRectangular"],
  ];
  const alert = new Alert();
  alert.title = "NutriSight Widget";
  alert.message = "Welche Grösse möchtest du ansehen?";
  for (const option of options) alert.addAction(option[0]);
  alert.addCancelAction("Abbrechen");
  const choice = await alert.presentSheet();
  if (choice >= 0) {
    const family = options[choice][1];
    const widget = await build(family);
    if (family === "small") await widget.presentSmall();
    else if (family === "large" || family === "extraLarge") await widget.presentLarge();
    else await widget.presentMedium();
  }
}

Script.complete();
`;
