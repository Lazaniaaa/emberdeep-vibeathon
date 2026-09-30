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
Every RF spent is split 25% burned, 8% into a weekly Friend lot that buys and burns/draws Generations NFTs, and 67% back to players: 60% into the round's reward pool and 7% into a lock pool. There is no new token and no fixed payout rate: the round pool is divided by gold share, so it cannot be drained. Connecting a wallet (read-only) that holds a Generations NFT (generation 1+) on Robinhood Chain lets you play as your own Friend with its original on-chain artwork, a family perk and a +20% gold / +1 light blessing. Perks work at 60% strength while you only hold them; locking a Delver, your Friend or some RF (simulated) grows them up to 130% over rounds and farms a share of the lock pool. Without an NFT everything still works.

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
Everything is simulated and labelled. You start with 2,000 RF. Entry key 50 RF, oil 20 RF per flask, Delver mints 100 / 250 / 600 / 1,500 RF (fixed supply 999 / 111 / 69 / 11), weekly passes 500 / 1,000 RF. Raffle tickets drop 3% (4.5% / 6.5% with a pass) per find and count only if you extract; a Sealed Vault holds a Soul Sigil 30% of the time. Each round pays out at most the 60% that went into its pool: your share equals your share of the gold, up to 160% of what you put into descents that round, so even top builds earn +20% to +60% a round (in our simulation: +21% strongest build held, +41% locked, +51% locked and staked). Locks: a fresh lock starts at 80% perk strength and gains 5% per closed round up to 130%; it is mature after 4 rounds, and breaking it early forfeits half of what it farmed and burns 10% of its value; the lock pool (7%) is separate from the round pool. Full tables in the README.

**What have you tested?**
125 unit/integration tests, typecheck, lint (3 known warnings in UI library files) and the production build pass. The Playwright smoke script (`npm run smoke`) passed against the production build of this version in Microsoft Edge, at desktop size and a 390 px phone-size viewport (camp, mint, descent, report, no console errors), and locking, staking, maturing, harvesting and breaking a lock were driven end to end in the browser with the balance reconciled. `npm run economy` regenerates the economy tables: bots across strategies, lock strength, crowd skill, crowd size, player mix and what locks farm. An independent code review was done and its findings fixed. There has been no real-wallet playthrough of the latest build, and the phone check is an emulated viewport.

**Known limitations**
State is stored in the browser and can be tampered with; a live version needs server-side or on-chain verification of runs before payouts (the README sketches a replay verifier and a round contract, not built). No live spending, NFT purchases, on-chain payouts, real NFT/RF escrow for locks or automatic weekly draw (locks are simulated commitments and the demo lets you fast-forward rounds with a button). The other delvers in camp are simulated ambience, and the reward-round crowd (2.3 gold per RF, 16,000 passive gold from other lockers) is an assumption. Most players will not reach the floor 7 boss without extra oil.

**Credits**
Wallet reading adapted from FriendSDK v0.1.2 (Apache-2.0). Rare Friends artwork belongs to Rare Friends. Fonts Geist and Silkscreen (SIL OFL) via Fontsource. Built with AI assistance (Claude). Full list: [NOTICE.md](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/NOTICE.md).
