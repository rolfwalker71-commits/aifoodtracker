export const DEFAULT_ANALYSIS_MODEL = "gpt-4o";

export const ANALYSIS_MODELS = [
  {
    id: "gpt-4o",
    label: "GPT-4o",
    hint: "Aktueller Standard, stark bei Fotos",
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    hint: "Günstiger, etwas weniger präzise",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    hint: "Oft genauer bei Anweisungen und JSON",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    hint: "Gute Balance aus Preis und Qualität",
  },
  {
    id: "gpt-4.1-nano",
    label: "GPT-4.1 nano",
    hint: "Schnell und günstig",
  },
  {
    id: "gpt-5",
    label: "GPT-5",
    hint: "Aktuelle Generation, stärkere Bilderkennung",
  },
  {
    id: "gpt-5-mini",
    label: "GPT-5 mini",
    hint: "Günstigere GPT-5-Variante",
  },
  {
    id: "gpt-5-nano",
    label: "GPT-5 nano",
    hint: "Schnellste GPT-5-Variante",
  },
] as const;

export type AnalysisModelId = (typeof ANALYSIS_MODELS)[number]["id"];

const ANALYSIS_MODEL_IDS = new Set<string>(
  ANALYSIS_MODELS.map((model) => model.id),
);

export function isAnalysisModelId(value: string): value is AnalysisModelId {
  return ANALYSIS_MODEL_IDS.has(value);
}

export function resolveAnalysisModel(
  preferred?: string | null,
): AnalysisModelId {
  const candidates = [
    preferred,
    process.env.OPENAI_ANALYSIS_MODEL,
    DEFAULT_ANALYSIS_MODEL,
  ];

  for (const candidate of candidates) {
    const id = candidate?.trim();
    if (id && isAnalysisModelId(id)) return id;
  }

  return DEFAULT_ANALYSIS_MODEL;
}

/** Reasoning-style models reject sampling params like temperature. */
export function supportsChatTemperature(model: string): boolean {
  return !/^(gpt-5|o[1-9])/i.test(model.trim());
}

export function analysisModelLabel(id: string): string {
  return ANALYSIS_MODELS.find((model) => model.id === id)?.label ?? id;
}
