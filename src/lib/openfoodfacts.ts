import type { FoodLookupItem, NutrientValues } from "@/types/nutrition";
import { EMPTY_NUTRIENTS, roundNutrient } from "@/lib/portion";

const USER_AGENT =
  "NutriSight/1.0 (https://github.com/rolfwalker71-commits/aifoodtracker; food-tracker)";

type OffNutriments = Record<string, number | string | undefined>;

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  product_name_en?: string;
  brands?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  image_url?: string;
  image_small_url?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  quantity?: string;
  nutriments?: OffNutriments;
};

function num(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapNutrientsPer100g(n: OffNutriments = {}): NutrientValues {
  const salt = num(n.salt_100g);
  const sodiumFromSalt = salt > 0 ? salt * 400 : 0;
  const sodiumRaw = num(n.sodium_100g);
  const sodium =
    sodiumRaw > 0 ? (sodiumRaw < 1 ? sodiumRaw * 1000 : sodiumRaw) : sodiumFromSalt;

  return {
    calories: roundNutrient(
      num(n["energy-kcal_100g"]) ||
        num(n.energy_kcal_100g) ||
        num(n["energy-kcal"]) ||
        0,
      0,
    ),
    protein: roundNutrient(num(n.proteins_100g)),
    carbs: roundNutrient(num(n.carbohydrates_100g)),
    fat: roundNutrient(num(n.fat_100g)),
    fiber: roundNutrient(num(n.fiber_100g)),
    sugar: roundNutrient(num(n.sugars_100g)),
    saturatedFat: roundNutrient(num(n["saturated-fat_100g"])),
    sodium: roundNutrient(sodium, 0),
    potassium: roundNutrient(num(n.potassium_100g), 0),
    vitaminA: roundNutrient(num(n["vitamin-a_100g"]), 0),
    vitaminC: roundNutrient(num(n["vitamin-c_100g"])),
    vitaminD: roundNutrient(num(n["vitamin-d_100g"]), 2),
    calcium: roundNutrient(num(n.calcium_100g), 0),
    iron: roundNutrient(num(n.iron_100g), 2),
  };
}

function productName(product: OffProduct) {
  return (
    product.product_name_de ||
    product.product_name ||
    product.product_name_en ||
    "Unbenanntes Produkt"
  );
}

function toLookupItem(product: OffProduct): FoodLookupItem | null {
  const nutrients = mapNutrientsPer100g(product.nutriments);
  const hasMacros =
    nutrients.calories > 0 ||
    nutrients.protein > 0 ||
    nutrients.carbs > 0 ||
    nutrients.fat > 0;
  if (!hasMacros) return null;

  const servingGrams = num(product.serving_quantity) || null;

  return {
    id: product.code || `${productName(product)}-${Math.random()}`,
    source: "openfoodfacts",
    name: productName(product),
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    barcode: product.code,
    imageUrl:
      product.image_front_url ||
      product.image_url ||
      product.image_front_small_url ||
      product.image_small_url,
    servingSizeLabel: product.serving_size,
    servingGrams: servingGrams && servingGrams > 0 ? servingGrams : null,
    nutrientsPer100g: nutrients,
    quantityLabel: product.quantity,
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("json")) {
    throw new Error("Non-JSON response");
  }
  return response.json();
}

async function searchCgi(domain: string, query: string, pageSize: number) {
  const url = new URL(`https://${domain}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(pageSize));
  const data = (await fetchJson(url.toString())) as { products?: OffProduct[] };
  return data.products ?? [];
}

async function searchAlicious(query: string, pageSize: number) {
  const url = new URL("https://search.openfoodfacts.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set("langs", "de");
  const data = (await fetchJson(url.toString())) as {
    hits?: Array<{ code?: string; product_name?: string; brands?: string[] | string }>;
  };
  const codes = (data.hits || [])
    .map((hit) => hit.code)
    .filter((code): code is string => Boolean(code))
    .slice(0, pageSize);

  const products: OffProduct[] = [];
  for (const code of codes) {
    try {
      const productUrl = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,product_name_de,brands,image_front_url,image_front_small_url,image_url,serving_size,serving_quantity,quantity,nutriments`;
      const detail = (await fetchJson(productUrl)) as {
        status?: number;
        product?: OffProduct;
      };
      if (detail.product) products.push({ ...detail.product, code });
    } catch {
      // ignore single product failures
    }
  }
  return products;
}

export async function searchOpenFoodFacts(
  query: string,
  limit = 8,
): Promise<FoodLookupItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const domains = [
    "world.openfoodfacts.org",
    "ch.openfoodfacts.org",
    "de.openfoodfacts.org",
    "world.openfoodfacts.net", // staging fallback if prod is unavailable
  ];

  const seen = new Set<string>();
  const results: FoodLookupItem[] = [];

  const pushProducts = (products: OffProduct[]) => {
    for (const product of products) {
      const item = toLookupItem(product);
      if (!item) continue;
      const key = item.barcode || `${item.brand}-${item.name}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(item);
      if (results.length >= limit) return true;
    }
    return false;
  };

  for (const domain of domains) {
    try {
      const products = await searchCgi(domain, q, limit);
      if (pushProducts(products)) return results;
      if (results.length >= 3) return results;
    } catch {
      // try next source
    }
  }

  if (results.length === 0) {
    try {
      const products = await searchAlicious(q, limit);
      pushProducts(products);
    } catch {
      // ignore
    }
  }

  return results;
}

export function emptyNutrients(): NutrientValues {
  return { ...EMPTY_NUTRIENTS };
}
