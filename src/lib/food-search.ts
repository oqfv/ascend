import "server-only";
import type { Macros } from "@/lib/domain/nutrition";

// Food search across two free databases with measured values per 100 g:
// Open Food Facts (packaged products, including many from the Gulf) and USDA FoodData Central
// (basic foods like rice, chicken and eggs). Only the search words are sent, never who is searching.

export type FoodResult = { source: "off" | "usda"; sourceId: string; name: string; brand: string | null; per100: Macros };

const TIMEOUT_MS = 6000;
const USER_AGENT = "Ascend/1.0 (https://ascend-tracker.me)";
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const round1 = (v: number) => Math.round(v * 10) / 10;

type OffProduct = { code?: string; product_name?: string; brands?: string | string[]; nutriments?: Record<string, unknown> };

function fromOff(products: OffProduct[]): FoodResult[] {
  return products.flatMap((p) => {
    const n = p.nutriments ?? {};
    const calories = num(n["energy-kcal_100g"]);
    const name = p.product_name?.trim();
    if (!name || calories === null || !p.code) return [];
    const brand = (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0])?.trim().slice(0, 60) || null;
    return [{
      source: "off" as const,
      sourceId: p.code,
      name: name.slice(0, 120),
      brand,
      per100: { calories: Math.round(calories), protein: round1(num(n.proteins_100g) ?? 0), carbs: round1(num(n.carbohydrates_100g) ?? 0), fat: round1(num(n.fat_100g) ?? 0) },
    }];
  });
}

const FIELDS = "code,product_name,brands,nutriments";

/** Open Food Facts' current search service first; its older search as a fallback when that fails. */
async function openFoodFacts(q: string): Promise<FoodResult[]> {
  try {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.search = new URLSearchParams({ q, page_size: "12", fields: FIELDS }).toString();
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(9000), cache: "no-store" });
    if (!res.ok) throw new Error(`search ${res.status}`);
    const data = (await res.json()) as { hits?: OffProduct[] };
    return fromOff(data.hits ?? []).slice(0, 8);
  } catch {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.search = new URLSearchParams({ search_terms: q, search_simple: "1", action: "process", json: "1", page_size: "8", fields: FIELDS }).toString();
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    // Throwing marks the search as partial, so the page can say one database didn't answer.
    if (!res.ok) throw new Error(`Open Food Facts ${res.status}`);
    const data = (await res.json()) as { products?: OffProduct[] };
    return fromOff(data.products ?? []);
  }
}

async function usda(q: string): Promise<FoodResult[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.search = new URLSearchParams({ query: q, pageSize: "8", dataType: "Foundation,SR Legacy", api_key: process.env.USDA_API_KEY || "DEMO_KEY" }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = (await res.json()) as { foods?: { fdcId: number; description: string; foodNutrients?: { nutrientNumber?: string; value?: number; unitName?: string }[] }[] };
  return (data.foods ?? []).flatMap((f) => {
    const pick = (nums: string[]) => f.foodNutrients?.find((x) => nums.includes(String(x.nutrientNumber)) && (nums[0] !== "208" || x.unitName === "KCAL"))?.value;
    const calories = num(pick(["208", "957", "958"]));
    if (calories === null) return [];
    return [{
      source: "usda" as const,
      sourceId: String(f.fdcId),
      name: f.description.slice(0, 120),
      brand: null,
      per100: { calories: Math.round(calories), protein: round1(num(pick(["203"])) ?? 0), carbs: round1(num(pick(["205"])) ?? 0), fat: round1(num(pick(["204"])) ?? 0) },
    }];
  });
}

/** Both databases at once; one being slow or down doesn't block the other. Basic foods first. */
export async function searchFoods(q: string): Promise<{ results: FoodResult[]; partial: boolean }> {
  const settled = await Promise.allSettled([usda(q), openFoodFacts(q)]);
  const results = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const k = `${r.name.toLowerCase()}|${r.brand?.toLowerCase() ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { results: unique.slice(0, 14), partial: settled.some((s) => s.status === "rejected") };
}
