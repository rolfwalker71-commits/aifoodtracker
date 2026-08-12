import OpenAI from "openai";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { toMealType } from "@/lib/nutrition";
import { localizeGermanLabel } from "@/lib/de-labels";
import { normalizeIngredients } from "@/lib/meal-ingredients";
import { scaleNutrients } from "@/lib/portion";
import type { NutrientValues, PortionAwareAnalysis } from "@/types/nutrition";

const nutrientsSchema = z.object({
  calories: z.coerce.number().nonnegative().default(0),
  protein: z.coerce.number().nonnegative().default(0),
  carbs: z.coerce.number().nonnegative().default(0),
  fat: z.coerce.number().nonnegative().default(0),
  fiber: z.coerce.number().nonnegative().default(0),
  sugar: z.coerce.number().nonnegative().default(0),
  saturatedFat: z.coerce.number().nonnegative().default(0),
  sodium: z.coerce.number().nonnegative().default(0),
  potassium: z.coerce.number().nonnegative().default(0),
  vitaminA: z.coerce.number().nonnegative().default(0),
  vitaminC: z.coerce.number().nonnegative().default(0),
  vitaminD: z.coerce.number().nonnegative().default(0),
  calcium: z.coerce.number().nonnegative().default(0),
  iron: z.coerce.number().nonnegative().default(0),
});

const ingredientSchema = z.object({
  name: z.string().min(1),
  portionSize: z.string().optional().default(""),
  grams: z.coerce.number().positive().nullable().optional(),
});

export const mealAnalysisSchema = z.object({
  name: z.string(),
  portionSize: z.string().optional().default(""),
  mealType: z
    .enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])
    .or(z.string())
    .transform((value) => toMealType(String(value))),
  estimatedPortionGrams: z.coerce.number().positive().nullable().optional(),
  portionConfidence: z.coerce.number().min(0).max(1).default(0.5),
  needsPortionInput: z.boolean().optional(),
  nutrientsPer100g: nutrientsSchema.optional(),
  ingredients: z.array(ingredientSchema).optional().default([]),
  calories: z.coerce.number().nonnegative().default(0),
  protein: z.coerce.number().nonnegative().default(0),
  carbs: z.coerce.number().nonnegative().default(0),
  fat: z.coerce.number().nonnegative().default(0),
  fiber: z.coerce.number().nonnegative().default(0),
  sugar: z.coerce.number().nonnegative().default(0),
  saturatedFat: z.coerce.number().nonnegative().default(0),
  sodium: z.coerce.number().nonnegative().default(0),
  potassium: z.coerce.number().nonnegative().default(0),
  vitaminA: z.coerce.number().nonnegative().default(0),
  vitaminC: z.coerce.number().nonnegative().default(0),
  vitaminD: z.coerce.number().nonnegative().default(0),
  calcium: z.coerce.number().nonnegative().default(0),
  iron: z.coerce.number().nonnegative().default(0),
  confidence: z.coerce.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type MealAnalysisResult = z.infer<typeof mealAnalysisSchema>;

const textFoodSchema = z.object({
  name: z.string(),
  brand: z.string().optional().nullable(),
  mealType: z
    .enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])
    .or(z.string())
    .transform((value) => toMealType(String(value))),
  suggestedServingGrams: z.coerce.number().positive().default(200),
  servingSizeLabel: z.string().optional().default(""),
  portionConfidence: z.coerce.number().min(0).max(1).default(0.6),
  needsPortionInput: z.boolean().optional().default(true),
  nutrientsPer100g: nutrientsSchema,
  ingredients: z.array(ingredientSchema).optional().default([]),
  notes: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
});

const LANGUAGE_RULES = `SPRACHE (verbindlich) – Schweizer Hochdeutsch:
- Alle Freitexte AUSSCHLIESSLICH auf Deutsch (Schweiz): name, portionSize, ingredients[].name, ingredients[].portionSize, notes, servingSizeLabel.
- NIEMALS den Buchstaben ß verwenden – immer "ss" (z. B. Klösse, Grösse, heiss, Strasse, süss).
- Schreibe "gross/Grösse" statt "groß/Größe".
- Kein Englisch für Lebensmittel oder Einheiten (nicht Apple/Bar/piece/slice/serving).
- Richtig: Apfel, Riegel, Stück, Scheibe, Portion, Tasse, EL, TL, Teller, ca., mittel, gross, klein.
- Markennamen unverändert lassen (z. B. Toblerone), aber Gattung/Einheit deutsch: "Toblerone-Riegel", "1 Riegel (35 g)".
- Beispiele: name="Apfel", portionSize="1 mittelgrosser Apfel (ca. 180 g)"; name="Toblerone", portionSize="1 Riegel (35 g)".
- Bei Tellergerichten: estimatedPortionGrams = geschätztes GESAMTGEWICHT aller Speisen auf dem Teller (essbarer Anteil, ohne Teller selbst).
- portionSize dann z. B. "Gesamtgewicht auf dem Teller ca. 500 g" oder "1 Teller, Gesamtgewicht ca. 500 g" – nie mehrdeutig.`;

const ANALYSIS_PROMPT = `Du bist ein Ernährungsexperte und schreibst in Schweizer Hochdeutsch (kein ß, immer ss).
Analysiere das Essen auf dem Foto.
Liefere Nährwerte möglichst als Werte pro 100g UND IMMER eine Schätzung der Portionsgrösse in Gramm.
Bei Tellergerichten / Mittagessen ohne Packungsangabe die sichtbare Menge bestmöglich schätzen:
estimatedPortionGrams ist das Gesamtgewicht ALLER Speisen auf dem Teller (z. B. Fleisch + Beilagen zusammen).
portionSize klar formulieren, z. B. "Gesamtgewicht auf dem Teller ca. 500 g".
Zerlege zusammengesetzte Gerichte in sichtbare/typische Hauptbestandteile mit geschätzter Portionsgrösse
(z. B. Spaghetti Bolognese → Spaghetti, Rindfleisch, Tomatensauce, Reibkäse – nur was erkennbar oder sehr wahrscheinlich ist).
Wenn die Portionsgrösse unsicher ist (z. B. Nudeln, Reis, unklarer Teller), setze needsPortionInput=true und portionConfidence niedrig (<0.55) – schätze trotzdem estimatedPortionGrams.
${LANGUAGE_RULES}
Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown.
Schema:
{
  "name": string,
  "portionSize": string,
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "estimatedPortionGrams": number | null,
  "portionConfidence": number,
  "needsPortionInput": boolean,
  "ingredients": [
    { "name": string, "portionSize": string, "grams": number | null }
  ],
  "nutrientsPer100g": {
    "calories": number, "protein": number, "carbs": number, "fat": number,
    "fiber": number, "sugar": number, "saturatedFat": number,
    "sodium": number, "potassium": number,
    "vitaminA": number, "vitaminC": number, "vitaminD": number,
    "calcium": number, "iron": number
  },
  "calories": number, "protein": number, "carbs": number, "fat": number,
  "fiber": number, "sugar": number, "saturatedFat": number,
  "sodium": number, "potassium": number,
  "vitaminA": number, "vitaminC": number, "vitaminD": number,
  "calcium": number, "iron": number,
  "confidence": number,
  "notes": string
}
Einheiten: Makros/Ballaststoffe/Zucker/gesättigte Fette in g; Natrium/Kalium/Calcium/Eisen in mg;
Vitamin A in µg RAE; Vitamin C/D in mg.
Die Top-Level-Nährwerte beziehen sich auf die geschätzte Portion.
ingredients: 2–8 Hauptzutaten; portionSize lesbar auf Schweizer Deutsch (z. B. "180 g", "2 EL"); grams wenn sinnvoll schätzbar.`;

const TEXT_FOOD_PROMPT = `Du bist ein Ernährungsexperte und schreibst in Schweizer Hochdeutsch (kein ß, immer ss).
Schätze realistische Nährwerte pro 100g für das genannte Gericht/Lebensmittel.
Liste typische Hauptbestandteile mit Portionsgrössen für eine übliche Portion.
Wenn die Menge unklar ist, setze needsPortionInput=true und portionConfidence niedriger (<0.6).
${LANGUAGE_RULES}
Antworte AUSSCHLIESSLICH mit gültigem JSON.
Schema:
{
  "name": string,
  "brand": string | null,
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "suggestedServingGrams": number,
  "servingSizeLabel": string,
  "portionConfidence": number,
  "needsPortionInput": boolean,
  "confidence": number,
  "ingredients": [
    { "name": string, "portionSize": string, "grams": number | null }
  ],
  "nutrientsPer100g": {
    "calories": number, "protein": number, "carbs": number, "fat": number,
    "fiber": number, "sugar": number, "saturatedFat": number,
    "sodium": number, "potassium": number,
    "vitaminA": number, "vitaminC": number, "vitaminD": number,
    "calcium": number, "iron": number
  },
  "notes": string
}
Einheiten: Makros in g; Natrium/Kalium/Calcium/Eisen in mg; Vitamin A µg; Vitamin C/D mg.`;

export function resolveApiKey(encryptedUserKey?: string | null) {
  if (encryptedUserKey) {
    try {
      return decryptSecret(encryptedUserKey);
    } catch {
      throw new Error("Gespeicherter OpenAI API Key konnte nicht entschlüsselt werden.");
    }
  }
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }
  throw new Error(
    "Kein OpenAI API Key hinterlegt. Bitte unter Einstellungen hinterlegen.",
  );
}

function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  throw new Error("OpenAI hat kein gültiges JSON zurückgegeben.");
}

function asNutrients(value: NutrientValues): NutrientValues {
  return { ...value };
}

export function toPortionAwareAnalysis(
  analysis: MealAnalysisResult,
): PortionAwareAnalysis {
  const portionConfidence = analysis.portionConfidence ?? 0.5;
  const estimatedPortionGrams = analysis.estimatedPortionGrams ?? null;
  const nutrientsPer100g =
    analysis.nutrientsPer100g ??
    (estimatedPortionGrams
      ? {
          calories: (analysis.calories / estimatedPortionGrams) * 100,
          protein: (analysis.protein / estimatedPortionGrams) * 100,
          carbs: (analysis.carbs / estimatedPortionGrams) * 100,
          fat: (analysis.fat / estimatedPortionGrams) * 100,
          fiber: (analysis.fiber / estimatedPortionGrams) * 100,
          sugar: (analysis.sugar / estimatedPortionGrams) * 100,
          saturatedFat: (analysis.saturatedFat / estimatedPortionGrams) * 100,
          sodium: (analysis.sodium / estimatedPortionGrams) * 100,
          potassium: (analysis.potassium / estimatedPortionGrams) * 100,
          vitaminA: (analysis.vitaminA / estimatedPortionGrams) * 100,
          vitaminC: (analysis.vitaminC / estimatedPortionGrams) * 100,
          vitaminD: (analysis.vitaminD / estimatedPortionGrams) * 100,
          calcium: (analysis.calcium / estimatedPortionGrams) * 100,
          iron: (analysis.iron / estimatedPortionGrams) * 100,
        }
      : asNutrients({
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fat: analysis.fat,
          fiber: analysis.fiber,
          sugar: analysis.sugar,
          saturatedFat: analysis.saturatedFat,
          sodium: analysis.sodium,
          potassium: analysis.potassium,
          vitaminA: analysis.vitaminA,
          vitaminC: analysis.vitaminC,
          vitaminD: analysis.vitaminD,
          calcium: analysis.calcium,
          iron: analysis.iron,
        }));

  const needsPortionInput =
    analysis.needsPortionInput ??
    (portionConfidence < 0.55 || !estimatedPortionGrams);

  const nutrients =
    estimatedPortionGrams && analysis.nutrientsPer100g
      ? scaleNutrients(analysis.nutrientsPer100g, estimatedPortionGrams)
      : asNutrients({
          calories: analysis.calories,
          protein: analysis.protein,
          carbs: analysis.carbs,
          fat: analysis.fat,
          fiber: analysis.fiber,
          sugar: analysis.sugar,
          saturatedFat: analysis.saturatedFat,
          sodium: analysis.sodium,
          potassium: analysis.potassium,
          vitaminA: analysis.vitaminA,
          vitaminC: analysis.vitaminC,
          vitaminD: analysis.vitaminD,
          calcium: analysis.calcium,
          iron: analysis.iron,
        });

  const ingredients = normalizeIngredients(analysis.ingredients).map((item) => ({
    ...item,
    name: localizeGermanLabel(item.name),
    portionSize: localizeGermanLabel(item.portionSize),
  }));

  return {
    name: localizeGermanLabel(analysis.name),
    mealType: analysis.mealType,
    portionSize: localizeGermanLabel(analysis.portionSize || ""),
    estimatedPortionGrams,
    portionConfidence,
    needsPortionInput,
    nutrientsPer100g,
    nutrients,
    ingredients,
    confidence: analysis.confidence,
    notes: analysis.notes
      ? localizeGermanLabel(analysis.notes)
      : analysis.notes,
  };
}

export async function analyzeMealImage(params: {
  imageBase64: string;
  mimeType: string;
  encryptedUserKey?: string | null;
}): Promise<PortionAwareAnalysis> {
  const apiKey = resolveApiKey(params.encryptedUserKey);
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: ANALYSIS_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analysiere dieses Mahlzeitenfoto und gib nur JSON zurück. Schweizer Schreibweise ohne ß (ss statt ß). Bei Tellern: estimatedPortionGrams = Gesamtgewicht aller Speisen auf dem Teller. Wenn die Portionsgrösse unsicher ist, markiere needsPortionInput=true.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${params.mimeType};base64,${params.imageBase64}`,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Leere Antwort von OpenAI erhalten.");
  }

  const parsed = mealAnalysisSchema.parse(JSON.parse(extractJson(content)));
  return toPortionAwareAnalysis(parsed);
}

export async function estimateFoodByName(params: {
  query: string;
  encryptedUserKey?: string | null;
}) {
  const apiKey = resolveApiKey(params.encryptedUserKey);
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: TEXT_FOOD_PROMPT },
      {
        role: "user",
        content: `Schätze Nährwerte pro 100g für: "${params.query}". Antworte in Schweizer Hochdeutsch ohne ß (ss statt ß), mit deutschen Bezeichnungen und Einheiten.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Leere Antwort von OpenAI erhalten.");
  }

  const parsed = textFoodSchema.parse(JSON.parse(extractJson(content)));
  return {
    ...parsed,
    name: localizeGermanLabel(parsed.name),
    servingSizeLabel: localizeGermanLabel(parsed.servingSizeLabel),
    notes: parsed.notes ? localizeGermanLabel(parsed.notes) : parsed.notes,
    ingredients: normalizeIngredients(parsed.ingredients).map((item) => ({
      ...item,
      name: localizeGermanLabel(item.name),
      portionSize: localizeGermanLabel(item.portionSize),
    })),
  };
}
