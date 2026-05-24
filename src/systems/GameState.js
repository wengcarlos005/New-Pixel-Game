// Singleton-style state container shared between scenes.
// Holds inventory, hotbar, day/time, energy progression, NPC list.
import Phaser from 'phaser';
import { ITEMS } from '../data/items.js';
import { HUNGER_MAX, HEALTH_MAX, STAMINA_MAX, DAY_LENGTH_MS } from '../config/GameConfig.js';

export const Events = new Phaser.Events.EventEmitter();

if (typeof window !== 'undefined') {
  window.__State = null; // assigned below
}

export const State = {
  player: {
    hp: HEALTH_MAX,
    hunger: HUNGER_MAX,
    stamina: STAMINA_MAX,
  },
  inventory: makeInv(24),         // 24 grid slots
  hotbar:    makeInv(6),          // 6 hotbar slots
  hotbarIndex: 0,
  // Starting kit
  storedChests: [],               // dynamic chest contents (id → grid)
  npcs: [],                       // populated by WorldScene
  energyOnline: false,
  dayMs: 0,
  dayCount: 1,
  // Research system
  research: {
    completed: [],                // array of tech IDs already done
    inProgress: null,             // { id, daysLeft, totalDays }
    labBuilt: false,
  },
  meta: {
    toasts: [],
  },
};

export function makeInv(size) { return new Array(size).fill(null); }

if (typeof window !== 'undefined') {
  window.__State = State;
  window.__Events = Events;
}

// Stack-aware add. Returns leftover count (0 if all fit).
export function addItem(grid, itemId, qty = 1) {
  const def = ITEMS[itemId];
  if (!def) return qty;
  let left = qty;

  // 1) Top up existing stacks
  for (let i = 0; i < grid.length && left > 0; i++) {
    const s = grid[i];
    if (s && s.id === itemId && s.qty < def.stack) {
      const can = Math.min(def.stack - s.qty, left);
      s.qty += can; left -= can;
    }
  }
  // 2) New stacks in empty slots
  for (let i = 0; i < grid.length && left > 0; i++) {
    if (!grid[i]) {
      const can = Math.min(def.stack, left);
      grid[i] = { id: itemId, qty: can };
      left -= can;
    }
  }
  Events.emit('inv:changed');
  return left;
}

// Remove qty across slots. Returns true if successful (all removed), false otherwise (and no-op).
export function removeItem(grid, itemId, qty = 1) {
  if (countItem(grid, itemId) < qty) return false;
  let left = qty;
  for (let i = 0; i < grid.length && left > 0; i++) {
    const s = grid[i];
    if (s && s.id === itemId) {
      const take = Math.min(s.qty, left);
      s.qty -= take; left -= take;
      if (s.qty <= 0) grid[i] = null;
    }
  }
  Events.emit('inv:changed');
  return true;
}

export function countItem(grid, itemId) {
  let n = 0;
  for (const s of grid) if (s && s.id === itemId) n += s.qty;
  return n;
}

// Inventory + hotbar combined (read-only) for crafting checks
export function totalCount(itemId) {
  return countItem(State.inventory, itemId) + countItem(State.hotbar, itemId);
}

// Remove across inv + hotbar — useful for crafting cost payment
export function removeAcross(itemId, qty) {
  if (totalCount(itemId) < qty) return false;
  let left = qty;
  // hotbar first
  for (let i = 0; i < State.hotbar.length && left > 0; i++) {
    const s = State.hotbar[i];
    if (s && s.id === itemId) {
      const take = Math.min(s.qty, left);
      s.qty -= take; left -= take;
      if (s.qty <= 0) State.hotbar[i] = null;
    }
  }
  for (let i = 0; i < State.inventory.length && left > 0; i++) {
    const s = State.inventory[i];
    if (s && s.id === itemId) {
      const take = Math.min(s.qty, left);
      s.qty -= take; left -= take;
      if (s.qty <= 0) State.inventory[i] = null;
    }
  }
  Events.emit('inv:changed');
  return true;
}

// Add to hotbar first, then inventory
export function pickup(itemId, qty = 1) {
  const left = addItem(State.hotbar, itemId, qty);
  if (left > 0) addItem(State.inventory, itemId, left);
  toast(`+${qty} ${ITEMS[itemId].name}`);
}

export function activeTool() {
  const slot = State.hotbar[State.hotbarIndex];
  if (!slot) return null;
  const def = ITEMS[slot.id];
  if (!def || def.kind !== 'tool') return null;
  return def.tool; // 'axe', 'pickaxe', 'hoe', 'water', 'scythe'
}

export function activeSlot() {
  return State.hotbar[State.hotbarIndex];
}

// Toast notifications
export function toast(text, color = '#e6c98a') {
  Events.emit('toast', { text, color, time: Date.now() });
}

// Time of day: 0 = sunrise, 0.25 = noon, 0.5 = sunset, 0.75 = night
export function timeOfDay() {
  return (State.dayMs % DAY_LENGTH_MS) / DAY_LENGTH_MS;
}

export function startingInventory() {
  // Wipe + setup
  for (let i = 0; i < State.hotbar.length; i++) State.hotbar[i] = null;
  for (let i = 0; i < State.inventory.length; i++) State.inventory[i] = null;
  // The player begins with a single hand-me-down axe, a few fibers and 2 sementes
  addItem(State.hotbar,    'axe', 1);
  addItem(State.hotbar,    'pickaxe', 1);
  addItem(State.hotbar,    'hoe', 1);
  addItem(State.hotbar,    'watering_can', 1);
  addItem(State.inventory, 'fiber', 3);
  addItem(State.inventory, 'wood', 2);
  addItem(State.inventory, 'seed_potato', 3);
  addItem(State.inventory, 'seed_wheat',  3);
  addItem(State.inventory, 'research_data', 1); // starting research data
  State.player.hp = HEALTH_MAX;
  State.player.hunger = HUNGER_MAX;
  State.player.stamina = STAMINA_MAX;
  State.dayMs = DAY_LENGTH_MS * 0.18; // start at morning
  State.dayCount = 1;
  State.energyOnline = false;
  State.npcs = [];
  State.research = { completed: [], inProgress: null, labBuilt: false };
}

// Called once per in-game day to tick research progress
export function researchDayTick() {
  const r = State.research;
  if (!r.inProgress) return;
  r.inProgress.daysLeft -= 1;
  if (r.inProgress.daysLeft <= 0) {
    r.completed.push(r.inProgress.id);
    const techId = r.inProgress.id;
    r.inProgress = null;
    Events.emit('research:complete', techId);
    toast(`Pesquisa concluída: ${techId}`, '#80e0ff');
  }
}

// Check if a tech is available (requires met, not already done)
export function canResearch(tech) {
  const r = State.research;
  if (r.completed.includes(tech.id)) return false;
  if (r.inProgress) return false;
  if (!r.labBuilt) return false;
  for (const req of tech.requires) {
    if (!r.completed.includes(req)) return false;
  }
  return true;
}

// Start researching a tech (cost already paid by caller)
export function startResearch(tech) {
  State.research.inProgress = { id: tech.id, daysLeft: tech.timeDays, totalDays: tech.timeDays };
  Events.emit('research:started', tech.id);
  toast(`Pesquisando: ${tech.name}`, '#80e0ff');
}
