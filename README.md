# Ressurgir — Colônia Pós-Apocalipse

Jogo sandbox 2D pixel art inspirado visualmente em Stardew Valley, com temática **sci-fi pós-apocalíptica**: sobrevivência, agricultura, reconstrução tecnológica e crescimento de uma colônia.

A humanidade perdeu a tecnologia em um colapso global. A natureza tomou conta das ruínas futuristas. Poucos sobreviventes restam. Cabe a você: **plantar, construir, alimentar os seus, restaurar a energia e reacender o mundo**.

> Construído em **Phaser 3.90 + Vite**. Todos os sprites são gerados via Node puro (`gen.cjs`) — sem dependências nativas.

---

## Como rodar

```bash
npm install
npm run gen      # gera todos os PNGs em public/assets (já versionado, mas é só rodar de novo)
npm run dev      # sobe vite em http://localhost:8090
```

No Windows pode usar `start-dev.cmd` no lugar do `npm run dev`.

---

## Controles

| Tecla / botão | Ação |
|---|---|
| **WASD / setas** | Mover em 8 direções |
| **Shift** | Correr (gasta stamina) |
| **E** | Interagir (NPCs, recursos, gerador, plantas) |
| **1–6** | Selecionar slot da hotbar |
| **I** | Inventário |
| **C** | Crafting |
| **B** | Construção |
| **Botão direito** | Comer item selecionado no hotbar |
| **ESC** | Pausar |

---

## Loop principal

> Explorar → Coletar recursos → Plantar alimentos → Alimentar sobreviventes → Recuperar tecnologia → Produzir energia → Expandir base → Reconstruir o mundo

### Sistemas implementados

- **Player** — 8 direções, corrida com stamina, animações idle/walk por direção
- **Sobrevivência** — HP, Fome e Energia com decay, regeneração condicional e dano por fome zero
- **Inventário** — hotbar (6) + bolsa (24) + stack de itens
- **Recursos** — madeira, sucata, pedra, fibra vegetal, água; nodes de árvore/pedra/sucata/fibra/ruína com gating de ferramenta
- **Agricultura** — preparo de terra (enxada), plantio (semente), rega (regador), crescimento por tempo em 4 estágios, colheita; 3 cultivos: **batata**, **trigo**, **cogumelo**
- **Crafting** — 17 receitas (ferramentas, fogueira, caixa, reservatório, gerador, canteiro, refeições, filtro de água, mais sementes)
- **Construção** — modo *placement* com preview e snap em grid; pisos, paredes, caixas, reservatório, gerador pequeno, fogueira, canteiro
- **NPCs** — 3 sobreviventes iniciais (Lia agricultora, Bram mecânico, Nyra exploradora) com **fome, moral, IA wander, diálogo e consumo diário**; pouca comida → moral baixa → produtividade baixa
- **Energia / progressão do mundo** — o gerador antigo da estação elétrica precisa de **3 reparos** (sucata, madeira, células de energia). Quando ligado: a grama seca floresce, a água contaminada limpa, o piso metálico volta a brilhar, árvores mortas viram vivas e **novos sobreviventes aparecem**
- **Ciclo dia/noite** — 8 minutos por dia, com tinta de escuridão que diminui quando a energia está restaurada
- **HUD** — barras de status, relógio, contador de dia, status da energia, tamanho da colônia, hotbar com slot ativo destacado, toasts

### Mapa inicial

- **Centro** — clareira de cascalho, base inicial
- **Nordeste** — fazenda abandonada (terra)
- **Sudeste** — estação elétrica (piso metálico, gerador antigo)
- **Sudoeste** — lago contaminado
- **Oeste** — ruínas exploráveis (sucata, ruínas, fibra)

---

## Estrutura do código

```
src/
  main.js                  # entry point Phaser
  config/GameConfig.js     # constantes do mundo
  scenes/
    BootScene.js           # boot mínimo
    PreloadScene.js        # loader + animações
    MainMenuScene.js       # título
    WorldScene.js          # mundo, input, interação, placement
    HudScene.js            # HUD overlay
    InventoryScene.js      # painel de inventário (+ caixa quando aplicável)
    CraftingScene.js       # menu de craft
    BuildScene.js          # menu de construção
    DialogueScene.js       # diálogo com NPC
    PauseScene.js          # pausa
  systems/GameState.js     # state singleton + inventário + Events
  entities/
    Player.js              # físcia, stats, anim
    NPC.js                 # IA + dialog + feed
    ResourceNode.js        # árvore/pedra/sucata/fibra/ruína
    Crop.js                # planta com 4 estágios
    Placeable.js           # estruturas colocáveis
    Generator.js           # keystone broken→online
  data/
    items.js               # catálogo de itens
    recipes.js             # receitas + crops
    tiles.js               # índices da tilesheet
    map.js                 # mapa procedural + spawn list

public/assets/             # PNGs gerados por gen.cjs (versionados)
gen.cjs                    # gerador de pixel art puro Node
```

---

## Tech

- **Phaser** 3.90.0
- **Vite** 5.x
- Sem dependências nativas, sem build steps além do `vite`

---

## Roadmap (próximas iterações)

- Save/load em localStorage
- Sistema de combate / criaturas hostis à noite
- Mais cultivos e refeições com efeitos (energia extra, recuperar HP rápido)
- Sistema de pesquisa tecnológica (energia desbloqueia tier 2 de receitas)
- Expansão do mapa: mais regiões pós-restauração
- Sons ambientes e SFX

---

## Licença

Código pessoal — use à vontade pra estudar e modificar.
