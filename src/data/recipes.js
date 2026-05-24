// Crafting recipes. cost = { itemId: qty }, result = { itemId, qty }.
// kind: 'item' goes to inventory; 'placeable' enters build mode.
export const RECIPES = [
  // Ferramentas básicas
  { id:'r_axe',         name:'Machado',         cost:{ wood:3, scrap:1 },        result:{ axe:1 },          kind:'item' },
  { id:'r_pickaxe',     name:'Picareta',        cost:{ wood:3, stone:2 },        result:{ pickaxe:1 },      kind:'item' },
  { id:'r_hoe',         name:'Enxada',          cost:{ wood:2, scrap:1 },        result:{ hoe:1 },          kind:'item' },
  { id:'r_watering',    name:'Regador',         cost:{ scrap:3 },                result:{ watering_can:1 }, kind:'item' },
  { id:'r_scythe',      name:'Foice',           cost:{ wood:2, scrap:2 },        result:{ scythe:1 },       kind:'item' },

  // Estruturas
  { id:'r_campfire',    name:'Fogueira',        cost:{ wood:5, stone:3 },        result:{ kind:'campfire' },  kind:'placeable' },
  { id:'r_chest',       name:'Caixa',           cost:{ wood:6, scrap:1 },        result:{ kind:'chest' },     kind:'placeable' },
  { id:'r_water_tank',  name:'Reservatório',    cost:{ scrap:6, stone:2 },       result:{ kind:'water_tank' },kind:'placeable' },
  { id:'r_small_gen',   name:'Gerador Pequeno', cost:{ scrap:8, energy_cell:1 }, result:{ kind:'small_gen' }, kind:'placeable' },
  { id:'r_planter',     name:'Canteiro',        cost:{ wood:4 },                 result:{ kind:'planter' },   kind:'placeable' },
  { id:'r_floor',       name:'Piso de Madeira', cost:{ wood:2 },                 result:{ kind:'floor_tile' },kind:'placeable' },
  { id:'r_wall',        name:'Parede',          cost:{ wood:4, stone:2 },        result:{ kind:'wall_tile' }, kind:'placeable' },

  // Cozinha / processamento
  { id:'r_meal_potato', name:'Refeição (batata)', cost:{ crop_potato:2, water:1 }, result:{ meal:1 }, kind:'item', needs:'campfire' },
  { id:'r_meal_wheat',  name:'Refeição (trigo)',  cost:{ crop_wheat:3, water:1 },  result:{ meal:1 }, kind:'item', needs:'campfire' },
  { id:'r_filter_water',name:'Filtrar Água',     cost:{ fiber:2, scrap:1 },        result:{ water:3 }, kind:'item' },
  { id:'r_seeds_potato',name:'Mais Sementes (batata)', cost:{ crop_potato:1 }, result:{ seed_potato:2 }, kind:'item' },
  { id:'r_seeds_wheat', name:'Mais Sementes (trigo)',  cost:{ crop_wheat:1 },  result:{ seed_wheat:2 },  kind:'item' },
];

export const CROPS = {
  potato:   { id:'potato',   name:'Batata',   stages:4, growMs: 90*1000,  produces:'crop_potato',   yield:2 },
  wheat:    { id:'wheat',    name:'Trigo',    stages:4, growMs: 60*1000,  produces:'crop_wheat',    yield:3 },
  mushroom: { id:'mushroom', name:'Cogumelo', stages:4, growMs: 110*1000, produces:'crop_mushroom', yield:1 },
};
