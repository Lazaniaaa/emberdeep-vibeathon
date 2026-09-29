# Notice and credits

Emberdeep was built for the Rare Friends Vibeathon with AI assistance (Claude, via Claude Code).

## Third-party code

- **FriendSDK v0.1.2** ([spokesz/friendsdk](https://github.com/spokesz/friendsdk), Apache-2.0): the read-only Generations ownership and sprite-reading helpers in `src/chain/` are adapted from it. Nothing there signs, spends or requests a transaction.
- **Libraries:** React, Vite, Tailwind CSS, shadcn/ui on Base UI, lucide-react, sonner, zustand, viem, next-themes, Vitest, oxlint and Playwright, each under its own open-source licence (see `package.json` and `package-lock.json`).
- **Fonts:** Geist Variable and Silkscreen, via Fontsource (SIL Open Font License 1.1).

## Artwork

- **Rare Friends artwork belongs to Rare Friends.** Friend sprites are read live from the Generations sprite registry on Robinhood Chain. The six Friend pictures in `src/assets/friends/` are shown only to showcase the collection in the weekly raffle banner and lot.
- **Dungeon floor illustrations** (`public/maps/`, originals in `art-src/maps/`): supplied by the builder for this project (add the artist or tool here if it should be credited).
- **Everything else** (the camp scene, monsters, Cerberus, items, armor, potions, Delver portraits and the interface sprites) is pixel art drawn in code for this project. Sound cues are generated with the Web Audio API.

## Economy

All balances, purchases, burns, payouts, raffles and mints are simulated in the browser. No real tokens move and no transaction is signed.
