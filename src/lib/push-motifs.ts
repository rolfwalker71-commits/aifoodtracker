import type { MealType } from "@/generated/prisma/client";

export type PushKind =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "rest"
  | "weight";

export type PushPayload = {
  title: string;
  body: string;
  kind: PushKind;
  url: string;
  tag: string;
  icon: string;
  image: string;
  badge: string;
};

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/icon-192.png";

export const PUSH_MOTIFS: Record<
  PushKind,
  { image: string; label: string }
> = {
  breakfast: { image: "/motifs/breakfast.jpg", label: "Frühstück" },
  lunch: { image: "/motifs/lunch.jpg", label: "Mittagessen" },
  dinner: { image: "/motifs/dinner.jpg", label: "Abendessen" },
  snack: { image: "/motifs/snack.jpg", label: "Snack" },
  rest: { image: "/motifs/rest.jpg", label: "Abend-Coach" },
  weight: { image: "/motifs/weight.jpg", label: "Gewicht" },
};

export function mealTypeToPushKind(mealType: MealType): PushKind {
  if (mealType === "BREAKFAST") return "breakfast";
  if (mealType === "LUNCH") return "lunch";
  if (mealType === "DINNER") return "dinner";
  return "snack";
}

export function buildPushPayload(
  kind: PushKind,
  title: string,
  body: string,
  url: string,
  tag: string,
): PushPayload {
  const motif = PUSH_MOTIFS[kind];
  return {
    title,
    body,
    kind,
    url,
    tag,
    icon: ICON,
    badge: BADGE,
    image: motif.image,
  };
}

export function absoluteAssetUrl(path: string) {
  const base = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "")
    .replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
