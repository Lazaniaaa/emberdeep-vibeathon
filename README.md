# Emberdeep

A Rare Friends dungeon crawl where your lantern runs on burned **$RAREFRIENDS (RF)**.
**[Play the live preview](https://64-177-50-196.sslip.io)** · Vibeathon category: Economy Potential.
Built for the [Rare Friends Vibeathon](https://github.com/spokesz/rarefriends-vibeathon).

> **Everything economic is simulated.** Balances, burns, round payouts and character mints live in
> your browser's `localStorage`. No real RF moves and nothing is signed. The only live
> blockchain access is a read-only lookup of the Rare Friends you hold on Robinhood Chain.

## The camp

The lobby is a bright pixel hub that fills the whole screen; there is no website around it. Your balance,
burn and wallet sit in a HUD along the top. Your character walks around a camp with a fire, flagstone
plaza, ponds and lanterns, and seven buildings. Press **E** next to one, tap it, or use the icon rail on the left:

| Building | What it does |
| --- | --- |
| **Dungeon Gate** (big **PLAY** button) | Pick who descends, buy oil and entry keys, light the lantern and go down |
| **Ember Altar** | Burn RF to mint a Delver |
| **Armory** | Weapons, potions, crafting with crystals |
| **Friend Board** | The weekly Friend lot, tickets and passes |
| **Vault** | The reward round, where every RF goes, your session |
| **Welcome Board** | How a descent works in four steps |
| **Hall of Delvers** | Your own records (descents, deepest floor, bosses slain, best claim) |

The HUD shows your keys, crystals and tickets, and the current round with your share of the gold. Your selected
character (Wanderer, a Delver, a won Friend or your on-chain Rare Friend) is the one you see walking. Tap the ground
and your delver walks there by itself; tap a building and it walks up and opens it.

Other delvers wander the camp with name tags and chatter, and Old Ember by the gate hands out tips.
**They are simulated ambience, not other players.** They hold nothing and never touch the economy.

## The loop

1. **Get in.** A descent needs an **entry key** (50 RF). New saves start with three.
2. **Fill your lantern.** Buy oil flasks at camp (20 RF each, 80 light per flask).
3. **Descend.** The descent fills the whole screen like the camp. Floors 1-7 have hand-traced layouts with painted art
   (floors 1-3 are 60% larger than the rest), deeper floors are generated, and all of them sit under fog of war. Every step
   burns light, and less light means a smaller circle of vision.
4. **Push or pull out.** Deeper floors multiply loot (+40% per depth) but each step burns
   more light. Walk back to the rift you arrived through to extract.
5. **Lose the light, lose the loot.** If your light and Night Vision run out, you wake up at
   camp empty-handed. Your gold counts for nobody, so the pool is shared among those who got home.
6. **Extract.** Gold you carry out is banked for the current reward round. Crystals craft
   potions and weapons. Soul Sigils mint free characters.
7. **Close the round.** The round's pool is shared by gold: hold 1% of all the gold and you take
   1% of the pool, up to 160% of what you put into descents that round (keys and oil).
8. **Lock (optional).** Perks you only hold work at 60% strength. Lock a Delver, your Rare Friend or some
   RF at the Ember Altar and the perk grows with every round closed, and the lock farms a share of the
   lock pool. See [Locks](#locks).
9. **Expedition (optional).** Send a Delver away for about $1 (100 RF) plus an optional pack. It comes back with a
   random haul of keys, tickets and gold, or with nothing. See [Expeditions](#expeditions).

**Creatures.** Nine kinds of creature live in the deep (Wickgnaw, Snaretoad, Cinder Hound, Chaincoil,
Needle Wraith, Sootplate, Hollow Burrower, Fourfold Bell, Rift Leaper), with more of them the deeper you go:
six on depth 1, one more each depth. They hit back, but never without warning. A creature that reaches you
*winds up*: the tiles its blow will hit get a red ring (a line for some, a cross around it for others) for one or two
turns. Step off the rings and the blow lands on nothing, and the creature is left open for a turn. Stay on
them and the blow drinks your light. Bump into a creature to attack it; your weapon decides how many swings it
takes. Kills drop a little gold.

Depth 7 ends in an arena guarded by **Cerberus**, a three-headed hound four times the size of a creature
(2x2 tiles, 150 HP, where ordinary creatures have 12-70). It seals the stairs, drinks 8 light a turn when you
touch it, never winds up, and moves at half a creature's pace. When it falls it leaves a **Cerberus Hoard** chest where it stood: gold and
crystals, a Healing Draught, a Rage Potion and a 40% chance of a Soul Sigil. Walk over the chest to open it.
The stairs then open onto the endless floors below; you can also skip the fight and leave through the rift.
A Ward Charm makes Cerberus harmless for 15 steps, enough for a Rusty Dagger to take about ten swings.

## Economy

| Rule | Value |
| --- | --- |
| Share of every RF spent (oil, potions, weapons, mints) that is burned | **25%** |
| Share that buys the weekly Rare Friends lot | **8%** |
| Share that goes to the round pool (shared by descent gold) | **60%** |
| Share that goes to the lock pool (shared by locked Delvers, Friends and RF) | **7%** |
| Entry key (one per descent) | 50 RF |
| Share of the pool you take | your gold ÷ all gold banked in the round |
| Return cap | at most **160%** of what you put into descents that round (+60% at best) |
| Simulated reference price | 1 RF = $0.01 |

- **No fixed rate.** The game never says "1 gold = N RF". A round's pool is 60% of everything
  spent in it (another 7% goes to the lock pool, so 67% goes back to players in total), gold is only found by playing, and when the round closes each delver receives
  the same percentage of the pool as their percentage of the gold. What you get depends on how
  much everyone else brought home. Payouts are rounded down to the cent, so nothing is paid
  beyond the pool.
- **Return cap.** Nobody takes back more than 160% of what they put into descents in a round (entry keys
  plus oil, deaths included), so a top build earns +20% to +60% a round at best, not a multiple. What the
  cap holds back stays in the pool for the next round.
- There is no new token and no emissions. Payouts only come from what players already spent.
- Gold from a run that ends in the dark counts for nobody. That RF stays in the pool and raises
  the share of every delver who made it home.
- Crystals, weapons and characters can't be redeemed for RF, so they need no reserve.
- Vault: **Close round and claim** settles the round, **Add a simulated crowd** adds other
  delvers' spend and gold. Every new round opens with a simulated crowd already in it.
- `src/game/sim.ts` has two bots: one that sees the whole map and one that plays under fog of
  war. Both almost never die, so they are an **upper bound** on skilled play, not a forecast.
  A 2-flask delver with no perks banks about 1.8 gold per RF spent (key included). The
  simulated crowd banks 1.8, a bit below the average (about 2.1) of the 70/20/10 crowd of unperked, blessed and
  top-build bots that the simulation uses, so a lone delver in the demo is measured against a crowd with good gear.
  The bots step off every marked tile and almost never die; real players make mistakes and die, so the true figure is
  probably lower, and the cap covers that case.
- Because everything is shared out, the round pool never pays back more than its share (60%) of
  what was spent. Balance is therefore about who takes it. Against the demo's crowd an unperked
  delver gets about 61% of their spend back, and the strongest build (Legendary Pathfinder +
  Hoverer + Friend's Blessing, 3 flasks) about 132% (+32%) while merely held, 147% (+47%) once it has been
  locked for 10+ rounds and 157% (+57%) with a full stake, funded by the others. The 160% cap stops
  anything above that. The edge shrinks as more players use it (about 80% when half the crowd runs the locked build). `npm run economy` regenerates the tables, including how the
  results move with the crowd's skill and size and what locks farm:
  [docs/economy-report.md](docs/economy-report.md).
- Step discounts (Pathfinder, Hoverer) act like extra light, so their total is capped at 40%.
- `npm test` checks the settlement maths and simulates a mixed crowd.

### Weekly Friend raffle

Drop Rare Friends pictures into `src/assets/friends/` (png, webp or jpg) and the weekly lot, the draw
result and "Friends you won" show them automatically; without any, a tinted portrait stands in.

8% of every spend accumulates in a treasury. Once a week it buys floor Generations NFTs
at a simulated ask of 500 RF. The lot opens only when it can buy **two**, and it caps at
**five**. One Friend is burned. The rest are drawn. Leftover RF rolls to the next week.

Tickets are not sold. Gold, crystals, chests, vaults and creature kills drop one 3% of the
time. You only keep a ticket if you extract; dying leaves it in the dark. A weekly pass
raises that rate and is itself spent through the 25/8/67 split:

| Pass | Price | Ticket drop |
| --- | --- | --- |
| Free | — | 3% |
| Ember Pass | 500 RF ($5) for the week | 4.5% |
| Deep Pass | 1,000 RF ($10) for the week | 6.5% |

Upgrading from Ember to Deep costs the $5 difference. Won Friends are playable and grant
that family's perk. They are simulated prizes, not wallet NFTs, and they do not grant the
holder blessing.

The Raffle tab has **Add a simulated week of play** so the draw can be seen in one session.
Live, that button is a weekly job and the lot buys real listings.

### Characters (Delvers)

Mint at the **Ember Altar**. The class is random within the rarity you choose.

| Rarity | Price | ≈ USD | Supply (fixed) | Full-strength perk (Prospector example) |
| --- | --- | --- | --- | --- |
| Common | 100 RF | $1 | **999** | +15% gold |
| Rare | 250 RF | $2.50 | **111** | +25% gold |
| Epic | 600 RF | $6 | **69** | +40% gold |
| Legendary | 1,500 RF | $15 | **11** | +60% gold and +1 light radius |

These perks are the full-strength values. A Delver you only hold works at 60% of them (a Legendary
Prospector gives +36% gold, and its light radius bonus is not yet in effect); locking it brings the perk
back to 100% after four rounds and up to 130% (+78% gold) after ten.

Every Delver has a portrait (a bust in its class colors on a rarity-colored backdrop; epics wear a gem,
legendaries a crown) and an edition number such as `#39/69`. Supply is a hard cap. Part of it counts as
already minted by the simulated community (640 / 71 / 38 / 5), so the Altar shows how many are left.
Soul Sigils skip any rarity that is sold out.

The six classes are Prospector (gold), Crystal Seer (crystals), Lamplighter (starting light),
Pathfinder (cheaper steps), Duelist (damage) and Scavenger (more chests and vaults).

Sealed Vaults appear from depth 3. Each one holds a **Soul Sigil 30% of the time**. Carry it
home to mint a free character, rolled at 62% Common, 27% Rare, 9% Epic and 2% Legendary.

### Locks

Perks are weak when you just hold them and grow when you commit. Locks are **simulated**: nothing is
escrowed and nothing leaves your wallet. A lock is a commitment that ages by **closed rounds** (the
Vault's button in the demo, a schedule live). You can lock:

- **A Delver** (counts as its mint price: 100 / 250 / 600 / 1,500 RF).
- **Your on-chain Rare Friend** (counts as the 500 RF floor ask). We only read your wallet, so this is a
  simulated commitment; it pauses while the wallet holds no Friend. A real lock would escrow the NFT.
- **RF** (a stake of up to 5,000 RF in steps of 500). It leaves your balance but is yours to take back, is
  never spent, and adds up to +8% gold (before growth).

| Rule | Value |
| --- | --- |
| Perk strength when only held | 60% |
| Perk strength of a fresh lock | 80%, then +5% per closed round, to a cap of 130% (100% after 4 rounds) |
| Lock pool | 7% of every RF spent, shared by passive gold (value × 0.1 × strength), apart from the round pool |
| Mature | 4 closed rounds: farmed RF can be harvested and the lock released for free |
| Break a lock early | forfeit 50% of what it farmed (back to the lock pool) and burn 10% of its value |
| Raffle tickets | a quarter of a ticket per round for your first two NFT locks, nothing for a stake |

Locking never takes RF from someone who plays: descents share the round pool, locks share the lock pool,
and both are funded by spend, not by new tokens. In the demo's crowd a lock farms roughly 0.9% of its value
per round, and the cut falls as more lockers join (see the sensitivity tables in the economy report). The
crowd's 16,000 passive gold a round is an assumption, like its gold per RF.

### Expeditions

Instead of going down the cave, a Delver can be sent into unmapped land (Ember Altar, Expedition tab). It is
never lost: it either comes back with a haul or empty-handed. While it is away it cannot descend.

| Rule | Value |
| --- | --- |
| Cost | **100 RF** (about $1), plus an optional pack |
| Split of the price | **40% burned, 5% to the weekly Friend lot, 55% to the round pool** |
| Away for | **5 seconds in the preview** (a live version would be a few hours up to a day); the trip is decided when the Delver leaves, so reloading cannot re-roll it |
| Chance to come back with a haul | No pack 45%, Scout Pack (+30 RF) 58%, Ranger Pack (+60 RF) 70%, Vanguard Pack (+90 RF) 82% |
| The haul | ×0.6 to ×15 of a basic haul (1 key, 1 ticket, 120 gold); 84% Common (×0.6–1.2), 12% Uncommon, 3.2% Rare, 0.7% Epic, 0.1% Legendary (×10–15) |

Hauls are never RF. Keys and tickets go to your stock (up to 30 keys), and gold joins the round like gold from a
descent, so the 160% return cap applies to it. Trip spend does not count toward that cap. The average haul is worth
about half of what the trip costs at every pack tier, so an expedition is a sink with a lottery ticket attached
(numbers in [docs/economy-report.md](docs/economy-report.md), section F). Packs buy a steadier trip, not a better deal.

### Weapons, armor and potions

Every item has its own picture in the Armory, the gate and the potion bar.

| Item | Cost | Effect |
| --- | --- | --- |
| Rusty Dagger | 60 RF | 16 damage |
| Iron Sword | 150 RF + 20 crystals | 24 damage |
| Emberblade | 400 RF + 60 crystals | 40 damage, +4 light per kill |
| Leather Vest | 80 RF + 10 crystals | Creatures drain 15% less |
| Chain Mail | 220 RF + 30 crystals | Creatures drain 30% less |
| Emberplate | 520 RF + 70 crystals | Creatures drain 45% less |
| Night Vision | 30 RF or 12 crystals | Triggers automatically when your light dies: 25 more steps |
| Oil Vial | 15 RF or 6 crystals | +30 light |
| Flare | 25 RF or 10 crystals | Reveals the whole floor |
| Ward Charm | 25 RF or 10 crystals | Creatures' blows and Cerberus can't drain you for 15 steps |
| Rage Potion | 40 RF or 16 crystals | +80% damage on your next 5 blows |
| Regeneration | 10 RF or 4 crystals | +1 light on each of the next 5 turns |
| **Healing Draught** | **not sold** | +60 light at once. Drops only in chests, Sealed Vaults and the Cerberus Hoard, and is lost if you do not extract |

Armor stacks with class and Friend perks up to the shared 80% drain cap.

## Rare Friends: optional, but blessed

You don't need an NFT to play. Connecting a wallet is **read-only**: we ask for your address,
find your Generations NFTs through owner-filtered `Transfer` logs (the same approach
FriendSDK uses), and check `ownerOf` and `generation` live. Holding any hardwired Friend
(generation 1 or higher) gives:

- **Friend's Blessing** on every descent: +20% gold and +1 light radius at full strength. Holding a Friend gives 60% of that
  (+12% gold); locking it (Ember Altar, Lock tab) grows it to +26% gold and +1 radius.
- **Play as your Friend**, using its original on-chain artwork read from the Generations
  sprite registry, with a perk based on its family:

Family perks are shown at full strength; holding gives 60% of them and locking up to 130%.

| Family | Perk |
| --- | --- |
| Skeleton | Creatures drain 50% less |
| Mask | Creatures don't notice you until adjacent |
| Family | +25% gold |
| Cellular | Regrows 1 light every 8 steps |
| Asymmetry | 20% of steps are free |
| Hoverer | -25% light per step |
| Colossus | +16 damage |
| Sparkling | +2 light radius |
| Hollow | +40% crystals |

Contracts used (Robinhood Chain, 4663): Generations `0x14C49e6118F46525dE9ab41a51cBAA3c6EBF181D`
and sprite registry `0x246E3E9730A7Eade94c79be0Fd78d210f89AEb8D`.

## Run locally

Requires Node.js 22+.

```sh
npm install
npm run dev        # http://localhost:5741
```

Other scripts:

```sh
npm test           # economy, dungeon, run rules and balance sim
npm run typecheck
npm run lint
npm run build      # static site in dist/ (relative paths, host anywhere)
node scripts/optimize-maps.mjs  # rebuild public/maps/*.webp from the originals in art-src/maps (applies scripts/map-patches.mjs and redraws the floors on the tile grid with scripts/floor-regrid.mjs)
npm run economy    # regenerate docs/economy-report.md (about a minute, deterministic)
npm run smoke      # headless browser pass; needs `npx playwright install chromium` and a running dev server
```

`npm run smoke -- <url>` also works against a deployed build. To use an installed Edge or Chrome
instead of downloading Chromium, set `SMOKE_CHANNEL=msedge` (or `chrome`).

In dev builds only, `?watch=0xADDRESS` loads that address's Friends without a wallet, which
helps with testing the blessing. Production builds never grant the blessing in watch mode.

## Deploy

The build in `dist/` is a plain static site. `deploy/README.md` walks through hosting it on a small Vultr server
(one setup script, one upload command, free HTTPS).

## Controls

- **Camp:** WASD or arrows to walk, E / Enter / Space to open the building you face.
  Tap a building to open it, or tap the ground to step toward it.
- **Dungeon keyboard:** WASD or arrow keys to move, Space to wait, E or Enter to descend or extract,
  1–7 for potions.
- **Touch:** on-screen D-pad, or tap the side of your character you want to step toward.
- Mute and reduced-motion toggles are in the header. Reduced motion also follows your OS setting.

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), zustand, viem and Vitest.
The game is rendered on a canvas. The camp, items, portraits and the nine creatures are pixel art drawn in code; the seven dungeon floors use painted WebP art.

## Integration notes for an on-chain phase

- Keys, oil, potions, weapons and mints would become RF transfers split by a contract: 25% burned, 8% to the Friend lot, 60% to a
  reward-pool vault and 7% to a lock-pool vault.
- Expeditions would run on block timestamps with verifiable randomness for the roll; the trip is currently decided
  in the browser when the Delver leaves and stored, which a tampered client could edit.
- Locks would escrow the NFT or RF in a staking contract and age by scheduled rounds. Farmed RF is paid out of the
  lock-pool vault when a lock matures or is released; an early exit sends the forfeited half back to that vault and
  the fee to the burn address.
- Round settlement needs a trusted source for each delver's gold, because the dungeon runs client-side.
  One option is a server that replays the run log from its seed. Another is moving run
  resolution on-chain with verifiable randomness (the Rare Friends Dice).
- Delvers would be an ERC-721 minted by the altar contract. Sigil drops would need the
  same randomness source.

## Credits

Read-only Generations helpers are adapted from [FriendSDK](https://github.com/spokesz/friendsdk)
(Apache-2.0). Rare Friends artwork belongs to Rare Friends and is read live from its contracts.
