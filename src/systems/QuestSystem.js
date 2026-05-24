// Linear quest / objective system.
// Each quest has a check() that reads from State.
import { State, totalCount, Events } from './GameState.js';

export const QUEST_LIST = [
  {
    id: 'q_wood',
    title: 'Primeiro Recurso',
    desc: 'Tenha 10 madeiras (corte árvores com o machado — tecla E)',
    icon: '🌲',
    check: () => totalCount('wood') >= 10,
  },
  {
    id: 'q_campfire',
    title: 'Acender o Fogo',
    desc: 'Construa uma fogueira (tecla B → Construção)',
    icon: '🔥',
    check: () => State.quests.campfireBuilt,
  },
  {
    id: 'q_farm',
    title: 'Primeira Colheita',
    desc: 'Colha 3 culturas — arar, plantar semente, aguardar, tecla E para colher',
    icon: '🌱',
    check: () => (State.quests.cropsHarvested || 0) >= 3,
  },
  {
    id: 'q_chest',
    title: 'Armazenar Suprimentos',
    desc: 'Construa uma caixa de armazenamento (tecla B)',
    icon: '📦',
    check: () => State.quests.chestBuilt,
  },
  {
    id: 'q_npc',
    title: 'Cuidar da Colônia',
    desc: 'Alimente um sobrevivente — fale com eles (tecla E perto deles)',
    icon: '🤝',
    check: () => State.quests.fedNPC,
  },
  {
    id: 'q_tools',
    title: 'Delegar Trabalho',
    desc: 'Dê uma ferramenta a um NPC (diálogo → Dar Ferramenta)',
    icon: '🔧',
    check: () => (State.quests.toolsGiven || 0) >= 1,
  },
  {
    id: 'q_research',
    title: 'Avançar a Ciência',
    desc: 'Complete uma pesquisa (construa bancada, tecla R)',
    icon: '🔬',
    check: () => State.research.completed.length >= 1,
  },
  {
    id: 'q_generator',
    title: 'Ligar a Energia',
    desc: 'Ative o gerador com uma célula de energia (tecla E no gerador)',
    icon: '⚡',
    check: () => State.energyOnline,
  },
];

// Returns the first incomplete quest, or null if all done.
export function getActiveQuest() {
  if (!State.quests.completed) State.quests.completed = [];
  for (const q of QUEST_LIST) {
    if (!State.quests.completed.includes(q.id)) return q;
  }
  return null;
}

// Call every few seconds — completes any newly-met quest and returns it.
export function checkQuests() {
  if (!State.quests.completed) State.quests.completed = [];
  for (const q of QUEST_LIST) {
    if (State.quests.completed.includes(q.id)) continue;
    if (q.check()) {
      State.quests.completed.push(q.id);
      Events.emit('quest:complete', q);
      return q;
    }
  }
  return null;
}
