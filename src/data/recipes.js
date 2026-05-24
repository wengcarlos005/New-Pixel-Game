// Crafting recipes. cost = { itemId: qty }, result = { itemId, qty }.
// kind: 'item' goes to inventory; 'placeable' enters build mode.
// tech: if present, recipe is locked until that tech is researched.
export const RECIPES = [
  // Ferramentas básicas
  { id:'r_axe',         name:'Machado',         cost:{ wood:3, scrap:1 },        result:{ axe:1 },          kind:'item' },
  { id:'r_pickaxe',     name:'Picareta',        cost:{ wood:3, stone:2 },        result:{ pickaxe:1 },      kind:'item' },
  { id:'r_hoe',         name:'Enxada',          cost:{ wood:2, scrap:1 },        result:{ hoe:1 },          kind:'item' },
  { id:'r_watering',    name:'Regador',         cost:{ scrap:3 },                result:{ watering_can:1 }, kind:'item' },
  { id:'r_scythe',      name:'Foice',           cost:{ wood:2, scrap:2 },        result:{ scythe:1 },       kind:'item' },

  // Estruturas
  { id:'r_campfire',    name:'Fogueira',        cost:{ wood:5, stone:3 },        result:{ kind:'campfire' },   kind:'placeable' },
  { id:'r_chest',       name:'Caixa',           cost:{ wood:6, scrap:1 },        result:{ kind:'chest' },      kind:'placeable' },
  { id:'r_water_tank',  name:'Reservatório',    cost:{ scrap:6, stone:2 },       result:{ kind:'water_tank' }, kind:'placeable' },
  { id:'r_small_gen',   name:'Gerador Pequeno', cost:{ scrap:8, energy_cell:1 }, result:{ kind:'small_gen' },  kind:'placeable' },
  { id:'r_planter',     name:'Canteiro',        cost:{ wood:4 },                 result:{ kind:'planter' },    kind:'placeable' },
  { id:'r_floor',       name:'Piso de Madeira', cost:{ wood:2 },                 result:{ kind:'floor_tile' }, kind:'placeable' },
  { id:'r_wall',        name:'Parede',          cost:{ wood:4, stone:2 },        result:{ kind:'wall_tile' },  kind:'placeable' },
  { id:'r_lab',         name:'Bancada Lab.',    cost:{ scrap:8, circuit:3, wood:4 }, result:{ kind:'lab_bench' }, kind:'placeable', tech:'eletronica' },

  // Cozinha / processamento
  { id:'r_meal_potato', name:'Refeição (batata)', cost:{ crop_potato:2, water:1 }, result:{ meal:1 }, kind:'item', needs:'campfire' },
  { id:'r_meal_wheat',  name:'Refeição (trigo)',  cost:{ crop_wheat:3, water:1 },  result:{ meal:1 }, kind:'item', needs:'campfire' },
  { id:'r_meal_corn',   name:'Refeição (milho)',  cost:{ crop_corn:2, water:1 },   result:{ meal:2 }, kind:'item', needs:'campfire', tech:'agro' },
  { id:'r_filter_water',name:'Filtrar Água',      cost:{ fiber:2, scrap:1 },       result:{ water:3 }, kind:'item' },
  { id:'r_seeds_potato',name:'Mais Sementes (batata)', cost:{ crop_potato:1 }, result:{ seed_potato:2 }, kind:'item' },
  { id:'r_seeds_wheat', name:'Mais Sementes (trigo)',  cost:{ crop_wheat:1 },  result:{ seed_wheat:2 },  kind:'item' },
  { id:'r_seeds_corn',  name:'Mais Sementes (milho)',  cost:{ crop_corn:1 },   result:{ seed_corn:2 },   kind:'item', tech:'agro' },

  // Medicina
  { id:'r_medicine',    name:'Medicamento',      cost:{ crop_herb:2, water:1 }, result:{ medicine:1 }, kind:'item', needs:'campfire', tech:'medicina' },
  { id:'r_herb_tea',    name:'Chá Curativo',     cost:{ crop_herb:1, water:1 }, result:{ medicine:1 }, kind:'item', needs:'campfire', tech:'medicina' },

  // Eletrônica
  { id:'r_circuit',     name:'Circuito',         cost:{ scrap:4, energy_cell:1 }, result:{ circuit:2 }, kind:'item', tech:'eletronica' },
  { id:'r_energy_cell', name:'Célula de Energia (recarga)', cost:{ scrap:6, circuit:1 }, result:{ energy_cell:1 }, kind:'item', tech:'energia' },
];

export const CROPS = {
  potato:   { id:'potato',   name:'Batata',   stages:4, growMs: 90*1000,  produces:'crop_potato',   yield:2 },
  wheat:    { id:'wheat',    name:'Trigo',    stages:4, growMs: 60*1000,  produces:'crop_wheat',    yield:3 },
  mushroom: { id:'mushroom', name:'Cogumelo', stages:4, growMs: 110*1000, produces:'crop_mushroom', yield:1 },
  corn:     { id:'corn',     name:'Milho',    stages:4, growMs: 120*1000, produces:'crop_corn',     yield:3 },
  herb:     { id:'herb',     name:'Erva',     stages:4, growMs:  80*1000, produces:'crop_herb',     yield:2 },
};

// Research Tech Tree
// cost = items, timeDays = real in-game days to complete
export const TECH_TREE = [
  {
    id: 'botanica',
    name: 'Botânica Básica',
    desc: 'Melhora técnicas de cultivo. Sementes rendem mais.',
    icon: '🌱',
    cost: { wood:5, fiber:8, research_data:2 },
    timeDays: 2,
    unlocks: ['Colheita +50%', 'Mais sementes por colheita'],
    requires: [],
  },
  {
    id: 'agro',
    name: 'Agrocultura',
    desc: 'Plante milho. Receitas de milho desbloqueadas.',
    icon: '🌽',
    cost: { crop_potato:5, crop_wheat:5, research_data:3 },
    timeDays: 3,
    unlocks: ['Semente de Milho', 'Refeição de Milho', 'Mais Sementes de Milho'],
    requires: ['botanica'],
  },
  {
    id: 'medicina',
    name: 'Medicina Herbal',
    desc: 'Cultive ervas medicinais e fabrique medicamentos.',
    icon: '💊',
    cost: { fiber:10, water:5, research_data:3 },
    timeDays: 3,
    unlocks: ['Semente de Erva', 'Medicamento', 'Chá Curativo'],
    requires: ['botanica'],
  },
  {
    id: 'metalurgia',
    name: 'Metalurgia',
    desc: 'Técnicas avançadas de trabalho com metal.',
    icon: '⚙️',
    cost: { scrap:15, stone:10, research_data:4 },
    timeDays: 4,
    unlocks: ['Ferramentas duráveis', 'Construções reforçadas'],
    requires: [],
  },
  {
    id: 'eletronica',
    name: 'Eletrônica',
    desc: 'Construa circuitos e equipamentos avançados.',
    icon: '🔌',
    cost: { scrap:10, energy_cell:2, research_data:5 },
    timeDays: 5,
    unlocks: ['Circuito', 'Bancada de Laboratório'],
    requires: ['metalurgia'],
  },
  {
    id: 'energia',
    name: 'Engenharia de Energia',
    desc: 'Recarregue células de energia. Domine o poder.',
    icon: '⚡',
    cost: { circuit:4, energy_cell:3, research_data:6 },
    timeDays: 6,
    unlocks: ['Recarregar Célula de Energia', 'Potência do Gerador +2x'],
    requires: ['eletronica'],
  },
];
