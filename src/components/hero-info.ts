import { friendFrame, type FriendSprite } from "@/chain/friend-sprite";
import { CLASSES, FAMILY_PERKS, RARITY_INFO, heroPerkText, type HeroNft } from "@/game/catalog";
import { heroMask, type Mask } from "@/render/sprites";
import type { Portrait } from "./art";
import type { HeroChoice, PrizeFriend } from "@/state/store";

export type HeroVisual = {
  name: string;
  subtitle: string;
  perk: string;
  color: string;
  /** Canonical Rare Friend art has real left/right frames; our Delver masks are mirrored instead. */
  mirrored: boolean;
  /** Set for Delvers and the Wanderer: the picture shown on cards. Friends use their own sprite. */
  portrait?: Portrait;
  mask: (facing: "left" | "right" | "up" | "down", walking?: boolean, frame?: number) => Mask;
};

export const WANDERER: HeroVisual = {
  name: "Wanderer",
  subtitle: "Free starter",
  perk: "No perk. Mint a character for a real edge.",
  color: "#d4d4d4",
  mirrored: true,
  portrait: { kind: "wanderer", rarity: "common" },
  mask: (_f, walking = false, frame = 0) => heroMask("wanderer", walking ? frame : 0),
};

export function nftVisual(hero: HeroNft): HeroVisual {
  const info = RARITY_INFO[hero.rarity];
  return {
    name: `${CLASSES[hero.classId].name} #${hero.serial}`,
    subtitle: `${info.label}${hero.source === "sigil" ? " · Soul Sigil" : ""}`,
    perk: heroPerkText(hero),
    color: info.color,
    mirrored: true,
    portrait: { kind: hero.classId, rarity: hero.rarity, edition: hero.edition },
    mask: (_f, walking = false, frame = 0) => heroMask(hero.classId, walking ? frame : 0),
  };
}

export function prizeVisual(prize: PrizeFriend): HeroVisual {
  const family = FAMILY_PERKS[prize.family];
  return {
    name: `${family?.name ?? "Friend"} #${prize.serial}`,
    subtitle: "Weekly raffle",
    perk: family?.text ?? "Family perk",
    color: "#FF4FD8",
    mirrored: true,
    mask: (_f, walking = false, frame = 0) => heroMask("wanderer", walking ? frame : 0),
  };
}

export function friendVisual(id: bigint, sprite: FriendSprite | null): HeroVisual {
  const family = sprite ? FAMILY_PERKS[sprite.family] : null;
  return {
    name: `Rare Friend #${id}`,
    subtitle: family ? `${family.name} family` : "Loading artwork…",
    perk: family?.text ?? "Reading on-chain artwork…",
    color: "#CCFF00",
    mirrored: false,
    mask: (facing, walking = false, frame = 0) =>
      sprite ? friendFrame(sprite, facing, walking, frame) : heroMask("wanderer", walking ? frame : 0),
  };
}

export function resolveHero(choice: HeroChoice, heroes: HeroNft[], friendId: bigint | null, sprite: FriendSprite | null, prizes: PrizeFriend[] = []): HeroVisual {
  if (choice.kind === "nft") {
    const hero = heroes.find(h => h.id === choice.id);
    if (hero) return nftVisual(hero);
  }
  if (choice.kind === "prize") {
    const prize = prizes.find(p => p.serial === choice.serial);
    if (prize) return prizeVisual(prize);
  }
  if (choice.kind === "friend" && friendId !== null) return friendVisual(friendId, sprite);
  return WANDERER;
}
