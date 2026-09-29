export type FriendSprite = {
  tokenId: bigint;
  family: number;
  /** 64 frames of 16 rows: idle down/up/left/right × 8, then walk down/up/left/right × 8. */
  frames: string[][];
};

export function friendFrame(sprite: FriendSprite, facing: "down" | "up" | "left" | "right", walking: boolean, frame: number) {
  const colossus = sprite.family === 6;
  const dir = colossus && (facing === "up" || facing === "down") ? "right" : facing;
  const d = ["down", "up", "left", "right"].indexOf(dir);
  return sprite.frames[(walking ? 32 : 0) + d * 8 + (frame % 8)];
}
