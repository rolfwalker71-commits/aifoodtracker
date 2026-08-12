import OpenAI from "openai";
import { z } from "zod";
import { decryptSecret } from "@/lib/crypto";
import { toMealType } from "@/lib/nutrition";

export const mealAnalysisSchema = z.object({
  name: z.string(),
  portionSize: z.string().optional().default(""),
  mealType: z
    .enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])
    .or(z.string())
    .transform((value) => toMealType(String(value))),
  calories: z.coerce.number().nonnegative(),
  protein: z.coerce.number().nonnegative(),
  carbs: z.coerce.number().nonnegative(),
  fat: z.coerce.number().nonnegative(),
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

const ANALYSIS_PROMPT = `Du bist ein Ernährungsexperte. Analysiere das Essen auf dem Foto.
Schätze realistische Nährwerte für die sichtbare Portion.
Antworte AUSSCHLIESSLICH mit gültigem JSON ohne Markdown und ohne Erklärung.
Schema:
{
  "name": string,
  "portionSize": string,
  "mealType": "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "saturatedFat": number,
  "sodium": number,
  "potassium": number,
  "vitaminA": number,
  "vitaminC": number,
  "vitaminD": number,
  "calcium": number,
  "iron": number,
  "confidence": number,
  "notes": string
}
Einheiten: Makros und Ballaststoffe/Zucker/gesättigte Fette in Gramm,
Natrium/Kalium/Calcium/Eisen in mg, Vitamin A in µg RAE, Vitamin C/D in mg.
Wenn unsicher, schätze konservativ und setze confidence entsprechend.`;

function resolveApiKey(encryptedUserKey?: string | null) {
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

export async function analyzeMealImage(params: {
  imageBase64: string;
  mimeType: string;
  encryptedUserKey?: string | null;
}) {
  const apiKey = resolveApiKey(params.encryptedUserKey);
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: ANALYSIS_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analysiere dieses Mahlzeitenfoto und gib nur JSON zurück.",
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

  const parsed = JSON.parse(extractJson(content));
  return mealAnalysisSchema.parse(parsed);
}
