import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
} as const;

/** Freigestelltes Leaf-Eye-Logo für App-Header und Auth. */
export function BrandMark({ size = "md", className }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/logo-leaf-eye.png"
      alt="NutriSight"
      className={cn("shrink-0 object-contain", sizes[size], className)}
    />
  );
}
