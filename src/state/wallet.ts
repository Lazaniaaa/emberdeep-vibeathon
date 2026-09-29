import type { Address } from "viem";
import { create } from "zustand";
import type { OwnedFriend } from "@/chain/friends";
import type { FriendSprite } from "@/chain/friend-sprite";
import { friendSprite, ownedFriends, walletAccount } from "./wallet-chain";

type BrowserProvider = { on?: (event: string, cb: (...args: unknown[]) => void) => void };
const injectedProvider = () => (globalThis as { ethereum?: BrowserProvider }).ethereum ?? null;

type WalletState = {
  status: "idle" | "connecting" | "loading" | "ready" | "error";
  account: Address | null;
  watchOnly: boolean;
  friends: OwnedFriend[];
  hidden: number;
  selected: bigint | null;
  sprite: FriendSprite | null;
  spriteStatus: "idle" | "loading" | "ready" | "error";
  error: string | null;
  connect: () => Promise<void>;
  watch: (account: Address) => Promise<void>;
  select: (id: bigint) => Promise<void>;
  /** Reads the Friends again, keeping how the wallet was connected. */
  retry: () => Promise<void>;
  disconnect: () => void;
};

export const useWallet = create<WalletState>()((set, get) => {
  let revision = 0;

  async function load(account: Address, watchOnly: boolean) {
    const request = ++revision;
    set({ status: "loading", account, watchOnly, error: null, friends: [], hidden: 0,
      selected: null, sprite: null, spriteStatus: "idle" });
    try {
      const { friends, hidden } = await ownedFriends(account);
      if (request !== revision) return;
      set({ status: "ready", friends, hidden });
      if (friends[0]) await get().select(friends[0].id);
    } catch (e) {
      if (request === revision) set({ status: "error", error: e instanceof Error ? e.message.split("\n")[0] : "Could not read Rare Friends" });
    }
  }

  const provider = injectedProvider();
  provider?.on?.("accountsChanged", (...args: unknown[]) => {
    const accounts = args[0] as string[];
    if (get().watchOnly || get().status === "idle") return;
    if (!accounts?.length) get().disconnect();
    else void load(accounts[0] as Address, false);
  });

  return {
    status: "idle", account: null, watchOnly: false, friends: [], hidden: 0, selected: null,
    sprite: null, spriteStatus: "idle", error: null,

    connect: async () => {
      const request = ++revision;
      set({ status: "connecting", error: null });
      try {
        const account = await walletAccount();
        if (request !== revision) return;
        await load(account, false);
      } catch (e) {
        if (request === revision) set({ status: "error", error: e instanceof Error ? e.message.split("\n")[0] : "Wallet connection failed" });
      }
    },

    watch: account => load(account, true),

    retry: async () => {
      const { account, watchOnly } = get();
      if (account) await load(account, watchOnly);
      else await get().connect();
    },

    select: async id => {
      const request = revision;
      set({ selected: id, sprite: null, spriteStatus: "loading" });
      try {
        const sprite = await friendSprite(id);
        if (request === revision && get().selected === id) set({ sprite, spriteStatus: "ready" });
      } catch {
        if (request === revision && get().selected === id) set({ spriteStatus: "error" });
      }
    },

    disconnect: () => {
      revision++;
      set({ status: "idle", account: null, watchOnly: false, friends: [], hidden: 0,
        selected: null, sprite: null, spriteStatus: "idle", error: null });
    },
  };
});

/** Watch mode is a dev-only testing aid; it never grants the Friend blessing in production builds. */
export function useFriendContext() {
  const { friends, sprite, watchOnly } = useWallet();
  const eligible = friends.length > 0 && (!watchOnly || import.meta.env.DEV);
  return { hasFriend: eligible, family: eligible && sprite ? sprite.family : null };
}
