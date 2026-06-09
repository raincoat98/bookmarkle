import type { Collection } from "../types";

export const buildCollectionPath = (
  id: string | null | undefined,
  collections: Collection[]
): Collection[] => {
  const path: Collection[] = [];
  let current = collections.find((collection) => collection.id === id);

  while (current) {
    path.unshift(current);
    current = current.parentId
      ? collections.find((collection) => collection.id === current?.parentId)
      : undefined;
  }

  return path;
};
