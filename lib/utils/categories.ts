// Category helpers shared by the admin console and the categories API
// route (Phase 5 Step 5). Icons are lucide names: the public tile renderer
// (components/home/FeaturedCategories.tsx) keeps its own name→component
// map — this list is the whitelist the CRUD form offers and the route
// accepts. Any unknown icon falls back to the first entry.

export const CATEGORY_ICONS = ["Leaf", "UtensilsCrossed", "Brush", "Sprout", "Flower"] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIcon = CATEGORY_ICONS[0];

// DB constraint (0001_init.sql): slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and
// unique — both sides of the stack validate, the database has the final
// word.
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
