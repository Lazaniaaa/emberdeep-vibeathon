import { ENEMIES, type EnemySpecies } from "@/game/enemies";

const images = new Map<EnemySpecies, HTMLImageElement>();

/**
 * The picture of a creature, or null while it is still loading. Each is a 256px WebP with a transparent background,
 * made from the large illustrations by scripts/optimize-enemies.mjs; they are fetched once and reused for every frame.
 */
export function enemyImage(species: EnemySpecies): HTMLImageElement | null {
  let image = images.get(species);
  if (!image) {
    image = new Image();
    image.decoding = "async";
    image.src = `${import.meta.env.BASE_URL}enemies/${species}.webp`;
    images.set(species, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

/** Starts loading every creature, so the first fight does not wait for its picture. */
export function preloadEnemies() {
  for (const e of ENEMIES) enemyImage(e.id);
}
