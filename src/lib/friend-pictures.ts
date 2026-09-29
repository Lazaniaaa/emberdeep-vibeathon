// Rare Friends pictures dropped into src/assets/friends are picked up here with no code change.
export const FRIEND_PICTURES: string[] = Object.entries(
  import.meta.glob("../assets/friends/*.{png,webp,jpg,jpeg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>,
)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url);
