# Goblin Scrap Rig - Arena Factory Roguelite (Prototype)

A fast, casual roguelite where you survive arena waves while a tiny "junk factory" runs in real time, producing Ammo from Scrap and managing Heat. Between waves, you reconfigure a grid-based rig, salvaging and swapping modular machines.

**Pitch:** "Build a janky goblin war-rig factory that powers your turrets mid-fight. Every run is a new machine."

## How to Play

### Core Loop
1. **Build Phase (20s)**: Place modules on your 5×5 rig grid
   - Drag modules from inventory to grid
   - Click modules on grid to remove them back to inventory
   - Salvage unwanted modules for scrap
2. **Combat Phase (60s)**: Defend your base from waves of enemies
   - Your factory runs automatically
   - Turrets fire at enemies if you have ammo
   - Manage heat to avoid jams
3. **Reward Phase**: Choose 1 of 3 rewards after each wave
4. **Repeat**: Build → Combat → Reward for 9 waves total

### Resources
- **Scrap**: Raw material. Produced by input modules, consumed by converters.
- **Ammo**: Spent by turrets to fire. Produced from scrap.
- **Heat**: Rises when producing/spending. Causes jams when ≥80.
- **Base HP**: Enemies damage your base when they reach it. Game over at 0.

### Module Types

**Inputs** (Generate Scrap)
- Junk Rake: Steady scrap production
- Loot Vacuum: Slower production, bonus on kills

**Converters** (Transform Resources)
- Ammo Press: Converts scrap → ammo, generates heat
- Coolant Still: Reduces heat, light scrap consumption

**Spenders** (Turrets)
- Pea Shooter: Fast, low damage (good for OnHit affixes)
- Scrap Cannon: Slow, high damage, high heat
- Shrapnel Mortar: AoE burst damage

**Stabilizers** (Cooling)
- Bellows Vent: Active cooling
- Leaky Barrel: High cooling
- Grease Goblin: Cooling + jam resistance aura

**Wildcards** (Special Effects)
- Ricochet Plate: Chance to bounce hits
- Jam Engine: Gains buffs when jams happen

### Heat & Jams
- Heat ≥ 80: Jam risk starts
- Heat ≥ 90: High jam chance
- Jammed modules pause for 2.5 seconds
- Cool down with stabilizer modules

### Enemy Types
- **Swarmers**: Low HP, many, fast (tests OnHit builds)
- **Brutes**: High HP, slow (tests burst damage)
- **Sappers**: Steals ammo on hit
- **Heat Leeches**: Increase heat while alive

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Canvas 2D** for combat arena
- Fixed tick simulation (0.25s for economy, 0.1s for combat)

## Installation & Running

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Game Design

- **Run length**: 8 waves + 1 boss, ~10-15 minutes
- **Grid**: 5×5, 1×1 modules
- **Affixes**: Modules drop with 0-2 affixes that trigger on events
- **Rarity**: Common / Uncommon / Rare (affects stats & affix count)

## Controls

- **Mouse**: Drag and drop modules
- **Click**: Remove modules from grid
- **Salvage button**: Convert module to scrap

## Prototype Status

### Implemented ✅
- Core game loop (Build → Combat → Reward → Repeat)
- 5×5 rig grid with drag-and-drop
- Resource economy (Scrap/Ammo/Heat simulation)
- 12 base module types
- Canvas arena with enemy spawning and movement
- Turret firing and projectile system
- 9 wave progression
- Reward system with module drops
- Heat and jam mechanics
- Goblin scrap-punk UI theme

### Not Yet Implemented
- Event bus and affix trigger system (affixes are rolled but not functional)
- Visual effects (particles, floating text, screen shake)
- Sound effects
- Module fusion (Mk II upgrades)
- Lever ability
- Detailed tooltips
- Adjacency auras (defined but not processed)

## Architecture

- `/src/types.ts` - TypeScript type definitions
- `/src/data/` - Module, affix, and enemy definitions
- `/src/simulation/` - Game tick engines (economy + combat)
- `/src/components/` - React components (UI + Arena)

## License

MIT
