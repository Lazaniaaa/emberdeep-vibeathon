import {
  FIELD_EXTRACT_SHARE, FIELD_GOLD_PER_RF, FIELD_ROLLS_PER_RF, FIELD_WEEK_SPEND, FRIEND_ASK_RF, LOT_MAX, LOT_MIN,
  PASSES, POOL_SHARE, RAFFLE_SHARE, TICKET_DROP_CHANCE, type PassId,
} from "./config";
import { int, type Rng, createRng } from "./rng";

export type LotFriend = {
  serial: number;
  family: number;
};

export type LotPrize = {
  friend: LotFriend;
  /** Burned by the game, won by you, or won by the simulated field. */
  fate: "burned" | "you" | "field";
};

export type DrawResult = {
  bought: number;
  spent: number;
  leftover: number;
  prizes: LotPrize[];
  yourTickets: number;
  fieldTickets: number;
};

export function ticketChance(pass: PassId | null) {
  return pass ? PASSES[pass].chance : TICKET_DROP_CHANCE;
}

/** What a new pass costs. Null means the player already holds a higher one. Zero means it is already active. */
export function passCost(next: PassId, current: PassId | null) {
  if (current === next) return 0;
  if (current === "pro") return null;
  if (current === "plus" && next === "pro") return PASSES.pro.price - PASSES.plus.price;
  return PASSES[next].price;
}

/** Tickets found in the dark only count if you carry them out. */
export function ticketsKept(extracted: boolean, found: number) {
  return extracted ? found : 0;
}

/** How many Friends the treasury can buy this week. Zero means hold the RF until next week. */
export function lotSize(treasury: number) {
  const affordable = Math.floor(treasury / FRIEND_ASK_RF);
  if (affordable < LOT_MIN) return 0;
  return Math.min(LOT_MAX, affordable);
}

export function fieldWeek() {
  const tickets = Math.round(FIELD_WEEK_SPEND * FIELD_EXTRACT_SHARE * FIELD_ROLLS_PER_RF * TICKET_DROP_CHANCE);
  return {
    spent: FIELD_WEEK_SPEND,
    treasury: round(FIELD_WEEK_SPEND * RAFFLE_SHARE),
    /** The crowd's share of the pool and the gold it banked, so its slice of the round grows with its spend. */
    pooled: round(FIELD_WEEK_SPEND * POOL_SHARE),
    gold: Math.round(FIELD_WEEK_SPEND * FIELD_GOLD_PER_RF),
    tickets,
  };
}

/**
 * Buy the lot, send exactly one Friend to the fire, draw the rest weighted by tickets.
 * Returns null when the treasury cannot buy two Friends or nobody holds a ticket.
 */
export function drawWeek(input: {
  treasury: number;
  yourTickets: number;
  fieldTickets: number;
  seed: number;
  nextSerial: number;
}): DrawResult | null {
  const bought = lotSize(input.treasury);
  const total = input.yourTickets + input.fieldTickets;
  if (bought < LOT_MIN || total <= 0) return null;
  const rng = createRng(input.seed);
  const friends: LotFriend[] = Array.from({ length: bought }, (_, i) => ({
    serial: input.nextSerial + i,
    family: int(rng, 0, 8),
  }));
  const burnAt = int(rng, 0, bought - 1);
  const prizes = friends.map((friend, i) => ({
    friend,
    fate: i === burnAt ? "burned" as const : winner(rng, input.yourTickets, total),
  }));
  const spent = bought * FRIEND_ASK_RF;
  return {
    bought, spent, leftover: round(input.treasury - spent), prizes,
    yourTickets: input.yourTickets, fieldTickets: input.fieldTickets,
  };
}

function winner(rng: Rng, yourTickets: number, total: number): "you" | "field" {
  return int(rng, 1, total) <= yourTickets ? "you" : "field";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
