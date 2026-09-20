import { WIDGET_SOURCE } from "@/lib/scriptable/widget-source";

/** What the medium and large widgets put next to the calorie ring. */
export type WidgetFocus = "makros" | "mahlzeiten" | "ring";

export const WIDGET_FOCUS_LABELS: Record<WidgetFocus, string> = {
  makros: "Makro-Balken",
  mahlzeiten: "Mahlzeiten von heute",
  ring: "Nur der Ring",
};

export type WidgetFamily =
  | "small"
  | "medium"
  | "large"
  | "extraLarge"
  | "accessoryCircular"
  | "accessoryRectangular"
  | "accessoryInline";

export const WIDGET_FAMILIES: {
  id: WidgetFamily;
  label: string;
  hint: string;
  place: "home" | "lock";
}[] = [
  {
    id: "small",
    label: "Klein",
    hint: "Ring mit Restkalorien und Makro-Kurzwerten.",
    place: "home",
  },
  {
    id: "medium",
    label: "Mittel",
    hint: "Ring plus Makro-Balken oder die Mahlzeiten von heute.",
    place: "home",
  },
  {
    id: "large",
    label: "Gross",
    hint: "Tageskopf, Ring, alle Makros und die Mahlzeitenliste.",
    place: "home",
  },
  {
    id: "extraLarge",
    label: "Extragross (iPad)",
    hint: "Zweispaltig: Tagesübersicht links, 7-Tage-Verlauf rechts.",
    place: "home",
  },
  {
    id: "accessoryCircular",
    label: "Sperrbildschirm rund",
    hint: "Ring mit den verbleibenden Kalorien.",
    place: "lock",
  },
  {
    id: "accessoryRectangular",
    label: "Sperrbildschirm Zeile",
    hint: "Restkalorien und die drei Makros als Text.",
    place: "lock",
  },
  {
    id: "accessoryInline",
    label: "Sperrbildschirm über der Uhr",
    hint: "Eine Zeile mit den verbleibenden Kalorien.",
    place: "lock",
  },
];

export interface WidgetScriptOptions {
  /** Origin of the NutriSight instance the widget reads from. */
  baseUrl: string;
  /** Personal API access key (`ns_…`). Empty renders a setup hint instead. */
  token: string;
  focus: WidgetFocus;
}

/** The script with the instance URL, key and default focus baked in. */
export function buildWidgetScript({
  baseUrl,
  token,
  focus,
}: WidgetScriptOptions): string {
  const config = {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    appUrl: baseUrl.replace(/\/+$/, ""),
    token,
    focus,
  };
  return WIDGET_SOURCE.replace('"__CONFIG__"', () =>
    JSON.stringify(config, null, 2),
  );
}

export const WIDGET_SCRIPT_NAME = "NutriSight";
