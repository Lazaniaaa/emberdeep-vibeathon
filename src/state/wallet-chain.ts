import type { Address } from "viem";

export async function ownedFriends(account: Address) {
  const { readOwnedFriends } = await import("@/chain/friends");
  return readOwnedFriends(account);
}

export async function friendSprite(id: bigint) {
  const { readFriendSprite } = await import("@/chain/friends");
  return readFriendSprite(id);
}

export async function walletAccount() {
  const { requestAccount } = await import("@/chain/friends");
  return requestAccount();
}
