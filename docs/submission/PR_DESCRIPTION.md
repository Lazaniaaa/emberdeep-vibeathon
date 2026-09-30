Title: Submission: Emberdeep

**Project name**
Emberdeep

**Builder / contact**
Lazaniaaa · https://github.com/Lazaniaaa · [@Lazaniaaa](https://github.com/Lazaniaaa)

**Category**
Economy Potential

**What did you build?**
A pixel dungeon crawler. You walk your character around a full-screen camp, spend $RAREFRIENDS on an entry key and lantern oil, descend into a dark cave where every step burns light, and try to carry gold back to the rift alive. Gold you bring home is shared out of the round's reward pool by your percentage of all gold, with a boss (Cerberus) on floor 7.

**How does it use Rare Friends / $RAREFRIENDS?**
Every RF spent is split 25% burned, 8% into a weekly Friend lot that buys and burns/draws Generations NFTs, and 67% into the reward pool. There is no new token and no fixed payout rate: the pool is divided by gold share, so it cannot be drained. Connecting a wallet (read-only) that holds a Generations NFT (generation 1+) on Robinhood Chain lets you play as your own Friend with its original on-chain artwork, a family perk and a +20% gold / +1 light blessing. Without an NFT everything still works.

**Source code**
https://github.com/Lazaniaaa/emberdeep-vibeathon · TypeScript, React 19, Vite, Canvas, zustand, viem (no FriendSDK; wallet helpers adapted from FriendSDK v0.1.2, Apache-2.0)

**Playable demo / how to run**
Live preview: https://64-177-50-196.sslip.io (no wallet needed).

```sh
git clone https://github.com/Lazaniaaa/emberdeep-vibeathon.git
cd emberdeep-vibeathon
npm ci
npm run dev
```

Node.js 22+. Optional: a browser wallet with a Generations NFT (generation 1+) on Robinhood mainnet (4663) for the blessing and to play as your Friend. Connecting only reads ownership and sprites; no signature or transaction is requested.

**How do you play?**
WASD/arrows or tap to walk; E/Enter or tap a building to open it. At the Dungeon Gate press PLAY (or walk there): pick who descends, buy oil, light the lantern. Collect gold and crystals, fight dimlings by walking into them, take stairs for richer floors and walk back to the green rift to extract. Keys 1-7 use potions. Mute and reduced motion are in the top bar.

**Costs and rewards**
Everything is simulated and labelled. You start with 2,000 RF. Entry key 50 RF, oil 20 RF per flask, Delver mints 100 / 250 / 600 / 1,500 RF (fixed supply 999 / 111 / 69 / 11), weekly passes 500 / 1,000 RF. Raffle tickets drop 3% (4.5% / 6.5% with a pass) per find and count only if you extract; a Sealed Vault holds a Soul Sigil 30% of the time. Each round pays out exactly the 67% that went into its pool: your share equals your share of the gold. Full tables in the README.

**What have you tested?**
86 unit/integration tests, typecheck, lint (3 known warnings in UI library files) and the production build pass. The Playwright smoke script (`npm run smoke`) passed against the live demo on 30 September 2026 in Microsoft Edge, at desktop size and a 390 px phone-size viewport (camp, mint, descent, report, no console errors). `npm run economy` regenerates the economy tables: bots across strategies, crowd skill, crowd size and player mix. An independent code review was done and its findings fixed. There has been no real-wallet playthrough of the latest build, and the phone check is an emulated viewport.

**Known limitations**
State is stored in the browser and can be tampered with; a live version needs server-side or on-chain verification of runs before payouts (the README sketches a replay verifier and a round contract, not built). No live spending, NFT purchases, on-chain payouts or automatic weekly draw. The other delvers in camp are simulated ambience, and the reward-round crowd (1.4 gold per RF) is an assumption. Most players will not reach the floor 7 boss without extra oil.

**Credits**
Wallet reading adapted from FriendSDK v0.1.2 (Apache-2.0). Rare Friends artwork belongs to Rare Friends. Fonts Geist and Silkscreen (SIL OFL) via Fontsource. Built with AI assistance (Claude). Full list: [NOTICE.md](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/NOTICE.md).
