/**
 * Lokalisiert typische englische Lebensmittel-/Portionsbegriffe für die UI.
 * Markennamen bleiben unangetastet, sofern sie nicht selbst ersetzt werden.
 */

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bchocolate\s+bar\b/gi, "Schokoriegel"],
  [/\benergy\s+bar\b/gi, "Energieriegel"],
  [/\bprotein\s+bar\b/gi, "Proteinriegel"],
  [/\bcandy\s+bar\b/gi, "Schokoriegel"],
  [/\bmedium[- ]sized\b/gi, "mittelgrosser"],
  [/\blarge[- ]sized\b/gi, "grosser"],
  [/\bsmall[- ]sized\b/gi, "kleiner"],
  [/\bper\s+serving\b/gi, "pro Portion"],
  [/\bserving\s+size\b/gi, "Portionsgrösse"],
];

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bapples\b/gi, "Äpfel"],
  [/\bapple\b/gi, "Apfel"],
  [/\bbananas\b/gi, "Bananen"],
  [/\bbanana\b/gi, "Banane"],
  [/\boranges\b/gi, "Orangen"],
  [/\borange\b/gi, "Orange"],
  [/\bstrawberries\b/gi, "Erdbeeren"],
  [/\bstrawberry\b/gi, "Erdbeere"],
  [/\bblueberries\b/gi, "Heidelbeeren"],
  [/\bblueberry\b/gi, "Heidelbeere"],
  [/\bgrapes\b/gi, "Trauben"],
  [/\bgrape\b/gi, "Traube"],
  [/\btomatoes\b/gi, "Tomaten"],
  [/\btomato\b/gi, "Tomate"],
  [/\bpotatoes\b/gi, "Kartoffeln"],
  [/\bpotato\b/gi, "Kartoffel"],
  [/\bcarrots\b/gi, "Karotten"],
  [/\bcarrot\b/gi, "Karotte"],
  [/\bonions\b/gi, "Zwiebeln"],
  [/\bonion\b/gi, "Zwiebel"],
  [/\bchicken\b/gi, "Hähnchen"],
  [/\bbeef\b/gi, "Rindfleisch"],
  [/\bpork\b/gi, "Schweinefleisch"],
  [/\bsalmon\b/gi, "Lachs"],
  [/\btuna\b/gi, "Thunfisch"],
  [/\beggs\b/gi, "Eier"],
  [/\begg\b/gi, "Ei"],
  [/\bbread\b/gi, "Brot"],
  [/\bcheese\b/gi, "Käse"],
  [/\bbutter\b/gi, "Butter"],
  [/\byogurt\b/gi, "Joghurt"],
  [/\byoghurt\b/gi, "Joghurt"],
  [/\bmilk\b/gi, "Milch"],
  [/\brice\b/gi, "Reis"],
  [/\bpasta\b/gi, "Pasta"],
  [/\bspaghetti\b/gi, "Spaghetti"],
  [/\bsalad\b/gi, "Salat"],
  [/\bsoup\b/gi, "Suppe"],
  [/\bpizza\b/gi, "Pizza"],
  [/\bburger\b/gi, "Burger"],
  [/\bfries\b/gi, "Pommes"],
  [/\bchocolate\b/gi, "Schokolade"],
  [/\bcookies?\b/gi, "Keks"],
  [/\bcake\b/gi, "Kuchen"],
  [/\bcoffee\b/gi, "Kaffee"],
  [/\btea\b/gi, "Tee"],
  [/\bwater\b/gi, "Wasser"],
  [/\bjuice\b/gi, "Saft"],
  [/\bsugar\b/gi, "Zucker"],
  [/\bsalt\b/gi, "Salz"],
  [/\boil\b/gi, "Öl"],
  [/\bbars?\b/gi, "Riegel"],
  [/\bpieces?\b/gi, "Stück"],
  [/\bslices?\b/gi, "Scheibe"],
  [/\bservings?\b/gi, "Portion"],
  [/\bportion\b/gi, "Portion"],
  [/\bcups?\b/gi, "Tasse"],
  [/\bbowls?\b/gi, "Schüssel"],
  [/\bplates?\b/gi, "Teller"],
  [/\btbsp\b/gi, "EL"],
  [/\btablespoons?\b/gi, "EL"],
  [/\btsp\b/gi, "TL"],
  [/\bteaspoons?\b/gi, "TL"],
  [/\bounces?\b/gi, "Unzen"],
  [/\boz\b/gi, "Unzen"],
  [/\bpounds?\b/gi, "Pfund"],
  [/\blb\b/gi, "Pfund"],
  [/\bgrams?\b/gi, "g"],
  [/\bmilliliters?\b/gi, "ml"],
  [/\bmedium\b/gi, "mittel"],
  [/\blarge\b/gi, "gross"],
  [/\bsmall\b/gi, "klein"],
  [/\bwhole\b/gi, "ganz"],
  [/\bhalf\b/gi, "halb"],
  [/\bapprox\.?\b/gi, "ca."],
  [/\bapproximately\b/gi, "ca."],
  [/\babout\b/gi, "ca."],
  [/\bwith\b/gi, "mit"],
  [/\band\b/gi, "und"],
];

function toSwissSpelling(text: string): string {
  return text
    .replaceAll("ß", "ss")
    .replaceAll("Größe", "Grösse")
    .replaceAll("größe", "grösse")
    .replaceAll("groß", "gross")
    .replaceAll("Groß", "Gross");
}

function applyReplacements(input: string): string {
  let text = input;
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  for (const [pattern, replacement] of WORD_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  // "35g" → "35 g", "1x" bleibt
  text = text.replace(/(\d)\s*g\b/gi, "$1 g");
  text = text.replace(/(\d)\s*ml\b/gi, "$1 ml");
  text = text.replace(/\s{2,}/g, " ").trim();
  return toSwissSpelling(text);
}

/** Preserve brand-like tokens (Toblerone) while translating surrounding English. */
export function localizeGermanLabel(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Keep all-caps brand codes / short brand tokens as-is when alone
  if (/^[A-Z0-9][A-Z0-9\-&.]{1,}$/.test(trimmed) && trimmed === trimmed.toUpperCase()) {
    return trimmed;
  }

  return applyReplacements(trimmed);
}

export function localizeGermanLabels<T extends Record<string, unknown>>(
  values: T,
  keys: Array<keyof T>,
): T {
  const next = { ...values };
  for (const key of keys) {
    const current = next[key];
    if (typeof current === "string") {
      next[key] = localizeGermanLabel(current) as T[keyof T];
    }
  }
  return next;
}
