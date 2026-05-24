// Item catalogue. icon = index into icons spritesheet (matches gen.cjs ICON_KEYS).
export const ICON_KEYS = [
  'wood','scrap','stone','fiber','water',
  'seed_potato','seed_wheat','seed_mushroom',
  'crop_potato','crop_wheat','crop_mushroom',
  'axe','pickaxe','hoe','watering_can','scythe',
  'meal','energy_cell'
];
const iconIdx = (k) => ICON_KEYS.indexOf(k);

export const ITEMS = {
  wood:    { id:'wood',    name:'Madeira',         icon: iconIdx('wood'),    stack: 99, kind:'resource' },
  scrap:   { id:'scrap',   name:'Sucata',          icon: iconIdx('scrap'),   stack: 99, kind:'resource' },
  stone:   { id:'stone',   name:'Pedra',           icon: iconIdx('stone'),   stack: 99, kind:'resource' },
  fiber:   { id:'fiber',   name:'Fibra Vegetal',   icon: iconIdx('fiber'),   stack: 99, kind:'resource' },
  water:   { id:'water',   name:'Água Filtrada',   icon: iconIdx('water'),   stack: 20, kind:'resource' },

  seed_potato:   { id:'seed_potato',   name:'Semente de Batata',   icon: iconIdx('seed_potato'),   stack: 50, kind:'seed', crop: 'potato' },
  seed_wheat:    { id:'seed_wheat',    name:'Semente de Trigo',    icon: iconIdx('seed_wheat'),    stack: 50, kind:'seed', crop: 'wheat' },
  seed_mushroom: { id:'seed_mushroom', name:'Esporo de Cogumelo',  icon: iconIdx('seed_mushroom'), stack: 50, kind:'seed', crop: 'mushroom' },

  crop_potato:   { id:'crop_potato',   name:'Batata',     icon: iconIdx('crop_potato'),   stack: 99, kind:'food', hunger: 22 },
  crop_wheat:    { id:'crop_wheat',    name:'Trigo',      icon: iconIdx('crop_wheat'),    stack: 99, kind:'food', hunger: 14 },
  crop_mushroom: { id:'crop_mushroom', name:'Cogumelo',   icon: iconIdx('crop_mushroom'), stack: 99, kind:'food', hunger: 18 },

  axe:           { id:'axe',          name:'Machado',         icon: iconIdx('axe'),           stack: 1, kind:'tool', tool:'axe' },
  pickaxe:       { id:'pickaxe',      name:'Picareta',        icon: iconIdx('pickaxe'),       stack: 1, kind:'tool', tool:'pickaxe' },
  hoe:           { id:'hoe',          name:'Enxada',          icon: iconIdx('hoe'),           stack: 1, kind:'tool', tool:'hoe' },
  watering_can:  { id:'watering_can', name:'Regador',         icon: iconIdx('watering_can'),  stack: 1, kind:'tool', tool:'water' },
  scythe:        { id:'scythe',       name:'Foice',           icon: iconIdx('scythe'),        stack: 1, kind:'tool', tool:'scythe' },

  meal:          { id:'meal',         name:'Refeição',        icon: iconIdx('meal'),          stack: 20, kind:'food', hunger: 45 },
  energy_cell:   { id:'energy_cell',  name:'Célula de Energia', icon: iconIdx('energy_cell'), stack: 20, kind:'tech' },
};
