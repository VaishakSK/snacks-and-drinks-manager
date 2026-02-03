import { CatalogItem } from "./catalog.model.js";

const DEFAULT_DRINKS = [
  "Tea",
  "Coffee",
  "Green Tea",
  "Lemon Tea",
  "Black Coffee",
  "Plain Milk"
];

const DEFAULT_SNACKS = [
  "Maggie",
  "Sandwich",
  "Bun Maska"
];

export async function ensureDefaultCatalog() {
  const count = await CatalogItem.countDocuments();
  if (count > 0) return { seeded: false };

  const docs = [
    ...DEFAULT_DRINKS.map((name) => ({ type: "drink", name })),
    ...DEFAULT_SNACKS.map((name) => ({ type: "snack", name }))
  ];

  await CatalogItem.insertMany(docs, { ordered: false });
  return { seeded: true, created: docs.length };
}

