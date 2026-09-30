# Emberdeep

A pixel dungeon crawler where your lantern runs on burned $RAREFRIENDS, and everything you carry home from the deep is shared out of a reward pool by how much gold you brought back.

**Builder:** Lazaniaaa · https://github.com/Lazaniaaa · **Category:** Economy Potential · **Stack:** TypeScript, React 19, Vite, Canvas (no FriendSDK) · **Built with AI assistance** (Claude, via Claude Code)

[Play the live preview](https://64-177-50-196.sslip.io) · [Source code](https://github.com/Lazaniaaa/emberdeep-vibeathon) · [Economy report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md)

<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/01-camp.png" alt="The full-screen camp lobby with the building menu, the round pool and the weekly NFT raffle" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/06-descent.png" alt="A descent: lantern light, gold, a chest and a dimling in the dark cave" width="49%">
</p>
<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/02-gate.png" alt="Dungeon Gate: entry key and lantern oil with the 25/8/67 split explained" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/03-vault.png" alt="Vault: the reward round, the pool and the delver's share of all gold" width="49%">
</p>
<p>
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/04-friend-board.png" alt="Friend Board: the weekly Friend lot, tickets and passes" width="49%">
  <img src="https://raw.githubusercontent.com/Lazaniaaa/emberdeep-vibeathon/main/docs/screenshots/05-camp-phone.png" alt="The camp at phone size with the on-screen D-pad" width="24%">
</p>

## How it uses Rare Friends and $RAREFRIENDS

- **$RF is the fuel.** Every RF spent (entry key, lantern oil, potions, weapons, armor, Delver mints, weekly passes) is split the same way: **25% burned, 8% into the weekly Friend lot, 67% into the round's reward pool.** No new token and no emissions: rewards only come from what players already spent.
- **The weekly Friend lot.** The 8% buys floor Generations NFTs (simulated ask: 500 RF each). The lot opens when it can buy two and caps at five; one Friend is burned and the rest are drawn among players holding tickets found in the deep.
- **A pool shared by gold, not a fixed rate.** Gold is found only by playing and only counts if you carry it out alive. When a round closes, you receive the same percentage of the pool as your percentage of all gold banked in the round. There is no "1 gold = N RF" anywhere, so the pool cannot be drained.
- **Your Rare Friend as the character.** Connect a wallet (read-only). If it holds a hardwired Generations NFT (generation 1+) on Robinhood Chain (4663), you get the **Friend's Blessing** (+20% gold, +1 light radius) and can descend **as your Friend**, drawn with its original on-chain artwork read live from the Generations sprite registry, with a perk from its family (nine families, nine perks). Without an NFT, every mechanic still works.
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

- **Camp.** The lobby is a full-screen camp. Walk with WASD/arrows or tap the ground (your Friend walks there); press **E**/Enter, or tap a building, to open it: Dungeon Gate (PLAY), Ember Altar (mint Delvers), Armory (weapons, armor, potions), Friend Board (weekly lot, tickets, passes), Vault (the reward round), Welcome Board (how to play), Hall of Delvers (your records). Other delvers in camp are **simulated ambience, not players**.
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

| Chance | Value |
| --- | --- |
| Raffle ticket per gold pile, crystal, chest, vault or kill | 3% (Ember Pass 4.5%, Deep Pass 6.5%); kept only if you extract |
| Sealed Vault (floor 3+) holds a Soul Sigil (a free Delver) | 30%; rarity 62% Common, 27% Rare, 9% Epic, 2% Legendary |
| Cerberus Hoard holds a Soul Sigil | 40% (plus a guaranteed Healing Draught and Rage Potion) |
| Chest holds a potion | 25% |

**Expected reward.** A round pays out exactly the 67% that went into its pool, so the crowd's *average* return is 67% of spend; yours depends on your share of the gold. The other players in each round are a **simulated crowd** whose gold-per-RF (1.4) is an assumption, and the numbers below come from bots that rarely die, so read them as an upper bound for real players.

**Why 25 / 8 / 67.** The vibeathon rules leave the split open (purchases and rewards only need to be simulated and labelled), so this is our design: 25% is a permanent sink, 8% is the link to the Rare Friends market (it buys floor Generations NFTs), and the rest goes back to players. Every price goes through the same split, so there is one rule to explain. The percentages and every price are single constants in `src/game/config.ts`. At the simulated reference price of $0.01 per RF, a key is $0.50 and a two-flask descent about $0.90.

### Economy evidence

Everything is generated by `npm run economy` from the same code the game runs ([full report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md), deterministic seeds). Descent = one entry key plus lantern flasks; one-off gear and mints are extra spend that also pays the split.

| Strategy (80 seeded descents each) | Cost | Gold banked per RF | Died | Avg deepest floor |
| --- | --- | --- | --- | --- |
| Unperked, 1 / 2 / 3 flasks | 70 / 90 / 110 RF | 0.90 / 1.92 / 2.48 | 0-1% | 1.0 / 2.4 / 3.0 |
| Friend's Blessing, 2 flasks | 90 RF | 2.28 | 1% | 2.4 |
| Strongest build (Legendary Pathfinder + Hoverer + Blessing), 3 flasks | 110 RF | 5.83 | 4% | 4.5 |

Whole rounds with a mixed crowd, split by gold as the game does it (RF received / RF spent):

| Crowd: unperked / Blessing / strongest | Paid out / spent | Unperked | Blessing | Strongest |
| --- | --- | --- | --- | --- |
| 90 / 8 / 2 | 67.0% | 63% | 75% | 195% |
| 70 / 20 / 10 | 67.0% | 52% | 62% | 160% |
| 50 / 30 / 20 | 67.0% | 44% | 52% | 133% |
| 20 / 30 / 50 | 67.0% | 31% | 37% | 94% |
| 0 / 0 / 100 | 67.0% | n/a | n/a | 67% |

- **Is a 160% build a problem?** It is paid by the other delvers' gold, not by new tokens, so the round never pays more than 67% of spend. And the edge is self-limiting: the more delvers run the strongest build, the smaller each one's gold share, down to 67% for everyone when all have it. Buying an edge is a bet on being ahead of the crowd, not a printer. Equal players lose 33% to the burn and the Friend lot, which is the point of the sink.
- **What if the crowd assumption is wrong?** The 1.4 gold per RF only decides how the demo splits the pool, never how much it holds. Against a crowd of 20,000 RF a lone unperked two-flask delver gets back 171%, 91% or 47% of spend if the crowd banks 0.7, 1.4 or 2.8 gold per RF (the report also varies crowd size). Those cells use a plain crowd; the table above includes strong builds in the crowd, which is why unperked delvers get less there.
- **What the numbers do not show.** Bots are not players, nothing here is measured on people, and the returns leave out the RF spent once on Delvers, weapons and passes. Balance against real play is the main open question.

**Token Activity counters** ("You burned", "World burn") are simulated; the world counter starts from a simulated seed of 1,284,310 RF.

## If this went on-chain (a plan, nothing here is built)

The rules that matter already live in small pure functions (`splitSpend` and `settleRound` in `src/game/economy.ts`, covered by tests), so an on-chain version would port tested rules instead of redesigning them.

- **Round contract.** `enter(runId)` takes the price of a key or a flask in $RAREFRIENDS and splits it in the same transaction: 25% to a burn address (or the token's own burn function, if it has one), 8% to a lot treasury, 67% to the round pool. A `runId` is accepted once.
- **Results without trusting the browser.** The run engine is deterministic: a seed, the loadout and the list of inputs fully decide the outcome (the only `Math.random` call creates the seed). A verifier service would replay the inputs and sign `(round, player, runId, gold)`; the contract would only record signed results, so a tampered client cannot invent gold. Not built yet: the client does not record its input list, and the loadout would have to come from verified inventory.
- **Claim.** When a round closes, `claim(round)` pays `pool × your gold / all gold`, rounded down with the crumb carried forward, exactly like `settleRound`. Gold from a descent that ended in the dark is never recorded.
- **Friend lot.** Each week the treasury buys floor Generations listings (at least two, at most five), one is burned and the rest are drawn among ticket holders. The draw needs a verifiable random source, still to be chosen for Robinhood Chain.
- **Delvers.** A fixed-supply collection (999 / 111 / 69 / 11) minted through the same split, with Soul Sigils redeemable for a free mint.
- **Known risks to design for.** Replay cost, round timing, and many small wallets farming free ticket drops.

## Checks, credits and known issues

- **Checks run:** `npm test` (86 tests: economy and round settlement, fixed Delver supply, Cerberus 2×2 movement/combat/loot, potions, save recovery and multi-tab safety, wallet request ordering, camp and art validation), `npm run typecheck`, `npm run lint` (3 known Fast Refresh warnings in shadcn/ui files), `npm run build`. `npm run economy` regenerates the [economy report](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/docs/economy-report.md). The deployed production build was played end to end in a desktop browser (camp → descent → extraction → report), and the Playwright script `npm run smoke` passed against the live preview on 30 September 2026 (Microsoft Edge, desktop and a 390 px phone-size viewport: camp, mint, descent, report, no console errors). An independent code review was done and its findings fixed.
- **Not done:** there has been no real-wallet playthrough of the latest build, and the phone check is an emulated viewport, not a physical phone.
- **Known limitations:** game and economy state live in the browser and can be tampered with; a live version would need server-side or on-chain verification of each run before payouts. No live RF spending, real NFT purchases, on-chain payouts or automatic weekly draw (all deliberately simulated). Most players will not reach Cerberus on floor 7 without buying extra oil. On the floor 7 arena, one tile of shaded floor along the edges is treated as wall. Progress is stored per browser.
- **Credits:** see [NOTICE.md](https://github.com/Lazaniaaa/emberdeep-vibeathon/blob/main/NOTICE.md). Wallet reading adapts helpers from [FriendSDK](https://github.com/spokesz/friendsdk) (Apache-2.0). Rare Friends artwork belongs to Rare Friends. Production publication would need separate Rare Friends review.
