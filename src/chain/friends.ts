// Read-only Rare Friends access, adapted from FriendSDK v0.1.2 (Apache-2.0).
// Nothing here signs, spends or requests a transaction.
import {
  createPublicClient, defineChain, http, isAddress, parseAbi, parseAbiItem, type Address,
} from "viem";
import type { FriendSprite } from "./friend-sprite";
export type { FriendSprite } from "./friend-sprite";

export const ROBINHOOD = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.chain.robinhood.com"] } },
});

export const GENERATIONS = "0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D" as Address;
export const REGISTRY = "0x246E3E9730A7Eade94c79be0Fd78d210f89AEb8D" as Address;

const GENERATIONS_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function generation(uint256 tokenId) view returns (uint8)",
]);
const REGISTRY_ABI = parseAbi([
  "function familyOf(uint256 tokenId) pure returns (uint8)",
  "function seedOf(uint256 tokenId) pure returns (uint32)",
  "function frames(uint8 id, uint32 seed) view returns (uint256[64])",
]);
const TRANSFER = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");

export const publicClient = createPublicClient({ chain: ROBINHOOD, transport: http() });

export type OwnedFriend = { id: bigint; generation: number };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Owner-filtered Transfer history, then fresh ownerOf/generation reads. Never scans the collection. */
export async function readOwnedFriends(account: Address) {
  if (!isAddress(account)) throw new TypeError("Invalid account");
  const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
  const balance = await publicClient.readContract({
    address: GENERATIONS, abi: GENERATIONS_ABI, functionName: "balanceOf", args: [account], blockNumber,
  });
  if (balance === 0n) return { friends: [] as OwnedFriend[], hidden: 0 };
  const query = { address: GENERATIONS, event: TRANSFER, fromBlock: 0n, toBlock: blockNumber, strict: true } as const;
  const [received, sent] = await Promise.all([
    publicClient.getLogs({ ...query, args: { to: account } }),
    publicClient.getLogs({ ...query, args: { from: account } }),
  ]);
  const events = new Map<string, (typeof received)[number]>();
  for (const log of [...received, ...sent]) events.set(`${log.blockNumber}:${log.logIndex}`, log);
  const ordered = [...events.values()].sort((a, b) =>
    a.blockNumber === b.blockNumber ? a.logIndex! - b.logIndex! : a.blockNumber! < b.blockNumber! ? -1 : 1);
  const held = new Set<bigint>();
  for (const log of ordered) {
    if (same(log.args.to, account)) held.add(log.args.tokenId);
    else held.delete(log.args.tokenId);
  }
  const ids = [...held].sort((a, b) => (a < b ? -1 : 1));
  const friends: OwnedFriend[] = [];
  let hidden = 0;
  for (let i = 0; i < ids.length; i += 8) {
    const group = await Promise.all(ids.slice(i, i + 8).map(async id => {
      const [owner, generation] = await Promise.all([
        publicClient.readContract({ address: GENERATIONS, abi: GENERATIONS_ABI, functionName: "ownerOf", args: [id], blockNumber }),
        publicClient.readContract({ address: GENERATIONS, abi: GENERATIONS_ABI, functionName: "generation", args: [id], blockNumber }),
      ]);
      return same(owner, account) ? { id, generation: Number(generation) } : null;
    }));
    for (const f of group) {
      if (!f) continue;
      if (f.generation >= 1) friends.push(f); else hidden++;
    }
  }
  return { friends, hidden };
}

export function decodeBitmap(bitmap: bigint) {
  return Array.from({ length: 16 }, (_, y) =>
    Array.from({ length: 16 }, (_, x) => (bitmap & (1n << BigInt(y * 16 + x)) ? "#" : ".")).join(""));
}

const spriteCache = new Map<string, Promise<FriendSprite>>();

export function readFriendSprite(tokenId: bigint) {
  const key = tokenId.toString();
  let hit = spriteCache.get(key);
  if (!hit) {
    hit = (async () => {
      const [family, seed] = await Promise.all([
        publicClient.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "familyOf", args: [tokenId] }),
        publicClient.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "seedOf", args: [tokenId] }),
      ]);
      const frames = await publicClient.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "frames", args: [family, seed] });
      return { tokenId, family: Number(family), frames: frames.map(decodeBitmap) };
    })();
    spriteCache.set(key, hit);
    hit.catch(() => spriteCache.delete(key));
  }
  return hit;
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function injectedProvider(): Eip1193 | null {
  return (globalThis as { ethereum?: Eip1193 }).ethereum ?? null;
}

export async function requestAccount(): Promise<Address> {
  const provider = injectedProvider();
  if (!provider) throw new Error("No browser wallet found. Install MetaMask, Rabby or another EVM wallet.");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  const account = accounts?.[0];
  if (!account || !isAddress(account)) throw new Error("The wallet did not share an account.");
  return account;
}
