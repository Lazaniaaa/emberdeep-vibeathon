# Emberdeep

A pixel dungeon crawler where your lantern runs on burned $RAREFRIENDS, and everything you carry home from the deep is shared out of a reward pool by how much gold you brought back.

**Builder:** Lazaniaaa · https://github.com/Lazaniaaa · **Category:** Economy Potential · **Stack:** TypeScript, React 19, Vite, Canvas (no FriendSDK) · **Built with AI assistance** (Claude, via Claude Code)

[Play the live preview](https://64-177-50-196.sslip.io) · [Source code](https://github.com/Lazaniaaa/emberdeep-vibeathon) · [Economy report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md)

<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/01-camp.png" alt="The full-screen camp lobby with the building menu, the round pool and the weekly NFT raffle" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/06-descent.png" alt="A descent: lantern light, gold, a chest and a dimling in the dark cave" width="49%">
</p>
<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/02-gate.png" alt="Dungeon Gate: entry key and lantern oil with the split explained" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/03-vault.png" alt="Vault: the reward round, the lock pool and the delver's share of all gold" width="49%">
</p>
<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/07-lock.png" alt="Ember Altar, Lock tab: locked Delver and stake, strength, maturity and farmed RF" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/04-friend-board.png" alt="Friend Board: the weekly Friend lot, tickets and passes" width="49%">
</p>
<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/08-expedition.png" alt="Ember Altar, Expedition tab: pick a Delver and a pack, with the chance of coming back with a haul" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/05-camp-phone.png" alt="The camp at phone size with the on-screen D-pad" width="24%">
</p>

## How it uses Rare Friends and $RAREFRIENDS

- **$RF is the fuel.** Every RF spent (entry key, lantern oil, potions, weapons, armor, Delver mints, weekly passes) is split the same way: **25% burned, 8% into the weekly Friend lot, 67% back to players**, of which 60% is the round's reward pool and 7% the lock pool. No new token and no emissions: rewards only come from what players already spent.
- **The weekly Friend lot.** The 8% buys floor Generations NFTs (simulated ask: 500 RF each). The lot opens when it can buy two and caps at five; one Friend is burned and the rest are drawn among players holding tickets found in the deep.
- **A pool shared by gold, not a fixed rate.** Gold is found only by playing and only counts if you carry it out alive. When a round closes, you receive the same percentage of the 60% pool as your percentage of all gold banked in the round, up to 160% of what you put into descents that round (keys and oil), so even the best build earns at most +60% a round. There is no "1 gold = N RF" anywhere, so the pool cannot be drained.
- **Hold, or lock to grow.** Perks work at 60% strength while you only hold a Delver or a Friend. Lock a Delver, your Rare Friend or some RF (simulated, nothing is escrowed) and the perk starts at 80%, gains 5% for every round closed and tops out at 130%. Locks also farm the 7% lock pool by passive gold, kept apart from the round pool so locking never takes RF from someone who plays. That gives the token a reason to be committed, not only spent.
- **Send a Delver on an expedition.** About $1 (100 RF) plus an optional pack sends a Delver into unmapped land. It returns after a while with a random haul of keys, tickets and gold (×0.6 to ×15 of a basic haul, mostly small), or with nothing. That trip is split 40% burned, 5% to the weekly Friend lot and 55% to the round pool: an extra sink, heavier on the burn, for players who want a gamble instead of a descent.
- **Your Rare Friend as the character.** Connect a wallet (read-only). If it holds a hardwired Generations NFT (generation 1+) on Robinhood Chain (4663), you get the **Friend's Blessing** (+20% gold, +1 light radius at full strength; +12% gold while merely held) and can descend **as your Friend**, drawn with its original on-chain artwork read live from the Generations sprite registry, with a perk from its family (nine families, nine perks). Without an NFT, every mechanic still works.
- **Delvers.** Simulated character NFTs with a fixed supply: 999 Common, 111 Rare, 69 Epic, 11 Legendary.

## Run it

**Live:** open the preview link. No wallet is needed to play.

**Locally** (Node.js 22+):

```sh
git clone https://github.com/Lazaniaaa/emberdeep-vibeathon.git
cd emberdeep-vibeathon
npm ci
npm run dev        # http://localhost:5741
```

**Wallet (optional).** A browser wallet holding a hardwired Generations NFT (generation 1+) on Robinhood mainnet (4663). Connecting only reads ownership and sprites: no signature and no transaction is ever requested.

## How to play

- **Camp.** The lobby is a full-screen camp. Walk with WASD/arrows or tap the ground (your Friend walks there); press **E**/Enter, or tap a building, to open it: Dungeon Gate (PLAY), Ember Altar (mint Delvers; lock Delvers, your Friend and RF; send Delvers on expeditions), Armory (weapons, armor, potions), Friend Board (weekly lot, tickets, passes), Vault (the reward round), Welcome Board (how to play), Hall of Delvers (your records). Other delvers in camp are **simulated ambience, not players**.
- **Descent.** Spend an entry key and buy lantern oil at the Dungeon Gate. Each step burns light; less light means a smaller circle of vision. Collect gold and crystals, fight dimlings (walk into them), take stairs for richer floors, then walk back to the green rift to extract. If your light dies first, everything you carried is lost.
- **Floor 7** is guarded by **Cerberus**: a 2×2, three-headed hound with 150 HP. It seals the stairs and leaves a hoard chest when it falls.
- **Controls.** WASD/arrows to move, Space to wait, E/Enter to use stairs or the rift, keys 1-7 for potions. On touch: on-screen D-pad or tap. Mute and reduced-motion toggles are in the top bar.
- **Not an SDK game**, so the 960 × 640 container does not apply. The game is full-screen and responsive.

## Costs, probabilities and rewards

**Everything economic is simulated and labelled.** You start with 2,000 RF and a button adds 1,000 more.

| Item | Cost |
| --- | --- |
| Entry key (one per descent, 3 to start) | 50 RF |
| Lantern oil (80 light per flask, up to 5) | 20 RF |
| Night Vision / Oil Vial / Flare / Ward Charm | 30 / 15 / 25 / 25 RF (or 12 / 6 / 10 / 10 crystals) |
| Rage Potion (+80% damage for 5 blows) / Regeneration (+1 light for 5 turns) | 40 / 10 RF (or 16 / 4 crystals) |
| Healing Draught (+60 light) | **not sold**: drops in chests, vaults and Cerberus's hoard only |
| Rusty Dagger / Iron Sword / Emberblade | 60 RF / 150 RF + 20 crystals / 400 RF + 60 crystals |
| Leather Vest / Chain Mail / Emberplate (dimlings drain 15 / 30 / 45% less) | 80 + 10 / 220 + 30 / 520 + 70 (RF + crystals) |
| Delver: Common / Rare / Epic / Legendary | 100 / 250 / 600 / 1,500 RF |
| Weekly pass: Ember / Deep | 500 / 1,000 RF |
| Expedition (a Delver is away 5 s in the preview) | 100 RF, plus an optional Scout / Ranger / Vanguard Pack at 30 / 60 / 90 RF |

| Chance | Value |
| --- | --- |
| Raffle ticket per gold pile, crystal, chest, vault or kill | 3% (Ember Pass 4.5%, Deep Pass 6.5%); kept only if you extract |
| Sealed Vault (floor 3+) holds a Soul Sigil (a free Delver) | 30%; rarity 62% Common, 27% Rare, 9% Epic, 2% Legendary |
| Cerberus Hoard holds a Soul Sigil | 40% (plus a guaranteed Healing Draught and Rage Potion) |
| Chest holds a potion | 25% |
| Expedition returns with a haul (no pack / Scout / Ranger / Vanguard) | 45% / 58% / 70% / 82%; the haul is ×0.6 to ×15 of 1 key, 1 ticket and 120 gold, 84% of them Common (×0.6–1.2) |

**Expected reward.** The round pool pays out at most the 60% that went into it (another 7% goes to the lock pool), so the crowd's *average* return from descents is 60% of spend at best; yours depends on your share of the gold. **Return cap:** nobody takes back more than 160% of what they put into descents in a round (entry keys plus oil, deaths included), so a top build earns +20% to +60% a round, not a multiple; whatever the cap holds back stays in the pool for the next round. The other players in each round are a **simulated crowd** whose gold-per-RF (2.3, the average of the mixed crowd the simulation uses) is an assumption, and the numbers below come from bots that rarely die, so read them as an upper bound for real players.

**Why 25 / 8 / 67.** The vibeathon rules leave the split open (purchases and rewards only need to be simulated and labelled), so this is our design: 25% is a permanent sink, 8% is the link to the Rare Friends market (it buys floor Generations NFTs), and 67% goes back to players. Of that, 60% is shared by gold from descents and 7% by locks, which rewards commitment without taking anything from people who play. Every price goes through the same split, so there is one rule to explain. The percentages and every price are single constants in `src/game/config.ts`. At the simulated reference price of $0.01 per RF, a key is $0.50 and a two-flask descent about $0.90.

### Locks

| Rule | Value |
| --- | --- |
| Perk strength when only held | 60% |
| Perk strength of a fresh lock | 80%, then +5% per closed round, to a cap of 130% (100% after 4 rounds) |
| What can be locked | a Delver (counts as its mint price), your wallet's Rare Friend (counts as 500 RF, a simulated commitment: we only read the wallet), or up to 5,000 RF (never spent, yours to take back; up to +8% gold) |
| Lock pool | 7% of every RF spent, shared by passive gold (value × 0.1 × strength), separate from the round pool |
| Mature | 4 closed rounds: farmed RF can be harvested and the lock released for free |
| Break a lock early | forfeit 50% of what it farmed (back to the lock pool) and burn 10% of its value |
| Raffle tickets | a quarter of a ticket per round for your first two NFT locks, none for a stake |

The clock is closed rounds: the Vault's button in the demo, a schedule live.

### Expeditions

| Rule | Value |
| --- | --- |
| Cost | 100 RF plus an optional pack (Scout +30, Ranger +60, Vanguard +90) |
| Split of the price | 40% burned, 5% weekly Friend lot, 55% round pool |
| Away for | 5 seconds in the preview; a live version would be a few hours up to a day. The trip is decided when the Delver leaves, so reloading cannot re-roll it |
| Chance to return with a haul | 45% / 58% / 70% / 82% by pack; failure costs the price and nothing else, the Delver is never lost |
| The haul | ×0.6 to ×15 of a basic haul; Common 84%, Uncommon 12%, Rare 3.2%, Epic 0.7%, Legendary 0.1% |
| What it holds | keys and tickets (never RF) and gold, which joins the round and is subject to the return cap |

While a Delver is away it cannot descend. Trip spend does not count toward the return cap, so trips cannot be used to raise it.

### Economy evidence

Everything is generated by `npm run economy` from the same code the game runs ([full report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md), deterministic seeds). Descent = one entry key plus lantern flasks; one-off gear and mints are extra spend that also pays the split.

| Strategy (80 seeded descents each) | Cost | Gold banked per RF | vs unperked, 2 flasks |
| --- | --- | --- | --- |
| Unperked, 1 / 2 / 3 flasks | 70 / 90 / 110 RF | 0.90 / 1.92 / 2.48 | ×0.47 / ×1.00 / ×1.29 |
| Friend's Blessing, 2 flasks: held / locked 4 rounds / locked 10+ | 90 RF | 2.15 / 2.28 / 2.40 | ×1.12 / ×1.19 / ×1.25 |
| Strongest build (Legendary Pathfinder + Hoverer + Blessing), 3 flasks: held / locked 4 rounds / locked 10+ | 110 RF | 4.91 / 5.56 / 5.86 | ×2.55 / ×2.89 / ×3.04 |

Return on what you put into descents (keys and oil), one delver against a crowd that spent 20,000 RF, at the demo's crowd skill (2.3 gold per RF) and at a weaker and a stronger crowd. † = the 160% cap bound.

| Strategy | Weaker crowd (1.4) | Demo crowd (2.3) | Stronger crowd (4.0) |
| --- | --- | --- | --- |
| Unperked, 2 flasks | 81% | 51% | 30% |
| Friend's Blessing, held | 90% | 56% | 33% |
| Strongest build, held | 160% † | 121% | 73% |
| Strongest build, locked 10+ rounds | 160% † | 141% | 86% |
| Strongest build, locked 10+ rounds and 5,000 RF staked | 160% † | 151% | 92% |

Whole rounds with a mixed crowd, split by gold as the game does it (RF received from the round pool / RF spent):

| Crowd: unperked / Blessing held / strongest held / strongest locked | Paid out / spent | Unperked | Blessing held | Strongest held | Strongest locked |
| --- | --- | --- | --- | --- | --- |
| 70 / 20 / 10 / 0 | 60.0% | 50% | 55% | 128% | n/a |
| 70 / 20 / 0 / 10 | 60.0% | 47% | 53% | n/a | 146% |
| 50 / 30 / 0 / 20 | 60.0% | 39% | 44% | n/a | 122% |
| 20 / 30 / 0 / 50 | 60.0% | 27% | 31% | n/a | 85% |
| 0 / 0 / 0 / 100 | 60.0% | n/a | n/a | n/a | 60% |

What one lock farms from the lock pool, alone in the demo's crowd of lockers (RF):

| Lock | Round 1 | 10 rounds in total | Per round, % of value |
| --- | --- | --- | --- |
| Common Delver (100 RF) | 0.69 | 8.91 | 0.9% |
| Epic Delver (600 RF) | 4.18 | 53.56 | 0.9% |
| Legendary Delver (1,500 RF) | 10.42 | 133.18 | 0.9% |
| Rare Friend (500 RF) | 3.49 | 44.65 | 0.9% |
| Stake (5,000 RF) | 34.14 | 434.21 | 0.9% |

- **Do the top builds earn too much?** They land in the +20% to +60% band and cannot leave it. Against the demo's crowd the strongest build returns +21% while held, +41% locked for 10+ rounds and +51% with a full stake; the 160% cap catches everything above that. Held, it banks ×2.55 the gold of an unperked delver (it was ×3.05 before locks existed); locked for 10+ rounds it is back at ×3.04. Its edge is paid by the other delvers' gold, not by new tokens, and it is self-limiting: the more delvers run the locked build, the smaller each one's gold share, down to 60% for everyone when all have it.
- **What do locks pay?** A modest 0.9% of the locked value per round in the demo, so passive farming is a bonus, not a business: a minted Delver would take over 100 rounds to repay its mint from the lock pool alone. The pool is fixed by spend, so more lockers means a smaller cut for each (the report varies the crowd of lockers from 8,000 to 64,000 passive gold). Breaking a lock early costs about 14 times a round's yield, so hopping in and out does not pay.
- **What if the crowd assumptions are wrong?** The 2.3 gold per RF and the 16,000 passive gold of other lockers only decide how the demo splits the pools, never how much they hold. If the real crowd is weaker (1.4 gold per RF), the top builds hit the 160% cap instead of running to 240% and an unperked delver gets back 81% instead of 51%; if it is stronger (4.0), everyone gets less (the table above). The report also varies crowd size.
- **Are expeditions a faucet?** No. An average trip is worth about half of what it cost at every pack tier (51–53%, counting a key as 50 RF, a ticket as 20 RF and gold at what it is worth in the demo's pool), because packs are priced to buy a steadier trip, not a better deal. A successful ×1 haul is worth about the price of a trip with no pack, so a trip pays for itself only when it succeeds; a failure loses the whole price, 40% of which is burned. A ×5 haul (about 0.4–0.7% of trips) is worth roughly five prices. Keys are capped at 30 in stock.
- **What the numbers do not show.** Bots are not players, nothing here is measured on people, and the returns leave out the RF spent once on Delvers, weapons and passes. Because a round closes on a button in the demo, you can fast-forward weeks; each closed round opens with one simulated crowd week of spend, so that is simulated time, not free RF. Balance against real play is the main open question.

**Token Activity counters** ("You burned", "World burn") are simulated; the world counter starts from a simulated seed of 1,284,310 RF.

## If this went on-chain (a plan, nothing here is built)

The rules that matter already live in small pure functions (`splitSpend` and `settleRound` in `src/game/economy.ts`, `settleLocks` and `exitTerms` in `src/game/locks.ts`, all covered by tests), so an on-chain version would port tested rules instead of redesigning them.

- **Round contract.** `enter(runId)` takes the price of a key or a flask in $RAREFRIENDS and splits it in the same transaction: 25% to a burn address (or the token's own burn function, if it has one), 8% to a lot treasury, 60% to the round pool and 7% to the lock pool. A `runId` is accepted once.
- **Results without trusting the browser.** The run engine is deterministic: a seed, the loadout and the list of inputs fully decide the outcome (the only `Math.random` call creates the seed). A verifier service would replay the inputs and sign `(round, player, runId, gold)`; the contract would only record signed results, so a tampered client cannot invent gold. Not built yet: the client does not record its input list, and the loadout would have to come from verified inventory.
- **Claim.** When a round closes, `claim(round)` pays `pool × your gold / all gold`, rounded down with the crumb carried forward, exactly like `settleRound`. Gold from a descent that ended in the dark is never recorded.
- **Locks.** A staking contract would escrow the Delver, the Rare Friend or the RF (today they are simulated and the wallet is only read), age each lock by scheduled rounds instead of a button, and pay farmed RF out of the lock-pool vault when it matures or is released. An early exit sends the forfeited half back to that vault and the 10% fee to the burn address.
- **Expeditions.** The same contract would take the 100 RF plus pack and split it 40/5/55, record the send time, and let the Delver's owner collect after the delay. The roll needs verifiable randomness (today it is made in the browser when the Delver leaves and stored, so a tampered client could edit it), and the delay would use block timestamps.
- **Friend lot.** Each week the treasury buys floor Generations listings (at least two, at most five), one is burned and the rest are drawn among ticket holders. The draw needs a verifiable random source, still to be chosen for Robinhood Chain.
- **Delvers.** A fixed-supply collection (999 / 111 / 69 / 11) minted through the same split, with Soul Sigils redeemable for a free mint.
- **Known risks to design for.** Replay cost, round timing, many small wallets farming free ticket drops or splitting locks, and a lock pool that becomes the main reason to play if too many lockers chase too little.

## Checks, credits and known issues

- **Checks run:** `npm test` (148 tests: economy and round settlement, locks and the lock pool, expeditions, fixed Delver supply, Cerberus 2×2 movement/combat/loot, potions, save recovery and multi-tab safety, wallet request ordering, camp and art validation), `npm run typecheck`, `npm run lint` (3 known Fast Refresh warnings in shadcn/ui files), `npm run build`. `npm run economy` regenerates the [economy report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md). The production build was played end to end in a desktop browser (camp → descent → extraction → report), and the Playwright script `npm run smoke` passed against the production build of this version (Microsoft Edge, desktop and a 390 px phone-size viewport: camp, mint, descent, report, no console errors). Locking, staking, maturing, harvesting and breaking a lock were also driven end to end in the browser and the balance reconciled to the RF, and so was a full expedition (mint, send with a pack, countdown, Delver unavailable to descend, collect). An independent code review was done and its findings fixed.
- **Not done:** there has been no real-wallet playthrough of the latest build (so the Friend lock has only been exercised in tests), and the phone check is an emulated viewport, not a physical phone.
- **Known limitations:** game and economy state live in the browser and can be tampered with; a live version would need server-side or on-chain verification of each run before payouts. No live RF spending, real NFT purchases, on-chain payouts or automatic weekly draw (all deliberately simulated). Locks are simulated commitments, not escrow, and the demo lets you fast-forward rounds with a button. An expedition takes 5 seconds in the preview, uses the device clock, and its roll is stored in the browser. Most players will not reach Cerberus on floor 7 without buying extra oil. On the floor 7 arena, one tile of shaded floor along the edges is treated as wall. Progress is stored per browser.
- **Credits:** see [NOTICE.md](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/NOTICE.md). Wallet reading adapts helpers from [FriendSDK](https://github.com/spokesz/friendsdk) (Apache-2.0). Rare Friends artwork belongs to Rare Friends. Production publication would need separate Rare Friends review.
