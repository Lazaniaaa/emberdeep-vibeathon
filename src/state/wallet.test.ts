import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";

const chain = vi.hoisted(() => ({
  readOwnedFriends: vi.fn(), readFriendSprite: vi.fn(), requestAccount: vi.fn(),
}));
vi.mock("./wallet-chain", () => ({
  ownedFriends: chain.readOwnedFriends,
  friendSprite: chain.readFriendSprite,
  walletAccount: chain.requestAccount,
}));

import { useWallet } from "./wallet";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

const first = "0x0000000000000000000000000000000000000001" as Address;
const second = "0x0000000000000000000000000000000000000002" as Address;

describe("wallet request ordering", () => {
  beforeEach(() => {
    useWallet.getState().disconnect();
    vi.clearAllMocks();
  });

  it("ignores a failed old account read after a newer account succeeds", async () => {
    const oldRead = deferred<{ friends: []; hidden: number }>();
    const newRead = deferred<{ friends: []; hidden: number }>();
    chain.readOwnedFriends.mockImplementation((account: Address) => account === first ? oldRead.promise : newRead.promise);
    const a = useWallet.getState().watch(first);
    const b = useWallet.getState().watch(second);
    newRead.resolve({ friends: [], hidden: 0 });
    await b;
    oldRead.reject(new Error("old RPC failure"));
    await a;
    expect(useWallet.getState()).toMatchObject({ account: second, status: "ready", error: null });
  });

  it("does not restore a sprite after disconnect", async () => {
    const sprite = deferred<{ tokenId: bigint; family: number; frames: string[][] }>();
    chain.readOwnedFriends.mockResolvedValue({ friends: [{ id: 1n, generation: 1 }], hidden: 0 });
    chain.readFriendSprite.mockReturnValue(sprite.promise);
    const loading = useWallet.getState().watch(first);
    await vi.waitFor(() => expect(useWallet.getState().spriteStatus).toBe("loading"));
    useWallet.getState().disconnect();
    sprite.resolve({ tokenId: 1n, family: 0, frames: [] });
    await loading;
    expect(useWallet.getState()).toMatchObject({ status: "idle", account: null, sprite: null });
  });

  it("retries a failed read in the same mode, so a connected wallet keeps its blessing", async () => {
    chain.requestAccount.mockResolvedValue(first);
    chain.readOwnedFriends.mockRejectedValueOnce(new Error("RPC down"));
    await useWallet.getState().connect();
    expect(useWallet.getState()).toMatchObject({ status: "error", account: first, watchOnly: false });

    chain.readOwnedFriends.mockResolvedValue({ friends: [{ id: 1n, generation: 1 }], hidden: 0 });
    chain.readFriendSprite.mockResolvedValue({ tokenId: 1n, family: 0, frames: [] });
    await useWallet.getState().retry();
    expect(useWallet.getState()).toMatchObject({ status: "ready", account: first, watchOnly: false });
  });
});

