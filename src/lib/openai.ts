import OpenAI from "openai";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { toMealType } from "@/lib/nutrition";
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
  nutrientsPer100g: nutrientsSchema,
  notes: z.string().optional(),
});

const ANALYSIS_PROMPT = `Du bist ein Ernährungsexperte. Analysiere das Essen auf dem Foto.
Liefere Nährwerte möglichst als Werte pro 100g UND eine Schätzung der Portionsgröße in Gramm.
Wenn die Portionsgröße unsicher ist (z. B. Nudeln, Reis, unklarer Teller), setze needsPortionInput=true und portionConfidence niedrig (<0.55).
Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown.
Schema:
{
  "name": string,
  "portionSize": string,
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "estimatedPortionGrams": number | null,
  "portionConfidence": number,
  "needsPortionInput": boolean,
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
Die Top-Level-Nährwerte beziehen sich auf die geschätzte Portion.`;

const TEXT_FOOD_PROMPT = `Du bist ein Ernährungsexperte. Schätze realistische Nährwerte pro 100g für das genannte Gericht/Lebensmittel.
Antworte AUSSCHLIESSLICH mit gültigem JSON.
Schema:
{
  "name": string,
  "brand": string | null,
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "suggestedServingGrams": number,
  "servingSizeLabel": string,
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

  return {
    name: analysis.name,
    mealType: analysis.mealType,
    portionSize: analysis.portionSize || "",
    estimatedPortionGrams,
    portionConfidence,
    needsPortionInput,
    nutrientsPer100g,
    nutrients,
    confidence: analysis.confidence,
    notes: analysis.notes,
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
            text: "Analysiere dieses Mahlzeitenfoto und gib nur JSON zurück. Wenn die Portionsgröße unsicher ist, markiere needsPortionInput=true.",
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
        content: `Schätze Nährwerte pro 100g für: "${params.query}"`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Leere Antwort von OpenAI erhalten.");
  }

  return textFoodSchema.parse(JSON.parse(extractJson(content)));
}
