export const colorChoices = [
  { body: '#d9d9ff', wand: '#7c4dff' },
  { body: '#9be7ff', wand: '#008cff' },
  { body: '#ffd8b8', wand: '#ff7a1a' },
  { body: '#b8ffcb', wand: '#10c45c' },
  { body: '#ffc1e3', wand: '#d43186' },
  { body: '#fff0a8', wand: '#c89b00' },
];

export const storeItems = [
  { id: 'potionBoost', type: 'upgrade', name: 'Potion Boost', cost: 3, description: '+5 extra heal from potions', apply: (p) => p.store.potionBoost = true },
  { id: 'cooldownCharm', type: 'upgrade', name: 'Cooldown Charm', cost: 5, description: 'Slightly faster hook cooldown', apply: (p) => p.store.cooldownCharm = true },
  { id: 'musicPack', type: 'upgrade', name: 'Music Pack', cost: 2, description: 'Just for flavor.', apply: (p) => p.store.musicPack = true },
  { id: 'wizardHat', type: 'hat', name: 'Wizard Hat', cost: 4, description: 'Classic pointy mage hat', apply: (p) => p.store.wizardHat = true },
  { id: 'beanie', type: 'hat', name: 'Beanie', cost: 3, description: 'Soft round cap', apply: (p) => p.store.beanie = true },
  { id: 'crown', type: 'hat', name: 'Crown', cost: 7, description: 'Royal shiny crown', apply: (p) => p.store.crown = true },
  { id: 'strawHat', type: 'hat', name: 'Straw Hat', cost: 5, description: 'Wide brim straw hat', apply: (p) => p.store.strawHat = true },
  { id: 'sweater', type: 'sweater', name: 'Sweater', cost: 4, description: 'Cozy warlock sweater', apply: (p) => p.store.sweater = true },
  { id: 'boots', type: 'boots', name: 'Boots', cost: 4, description: 'Adventurer boots', apply: (p) => p.store.boots = true },
];

export const defaultBinds = { up: 'w', down: 's', left: 'a', right: 'd', hook: 'e', teleport: 'space', shield: 'q', reset: 'r', menu: 'escape' };
export const bindLabels = { up: 'Move Up', down: 'Move Down', left: 'Move Left', right: 'Move Right', hook: 'Hook', teleport: 'Teleport', shield: 'Shield', reset: 'Reset Round', menu: 'Menu' };
