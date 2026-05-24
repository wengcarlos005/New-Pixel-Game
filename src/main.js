import Phaser from 'phaser';
import { GameConfig } from './config/GameConfig.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import WorldScene from './scenes/WorldScene.js';
import HudScene from './scenes/HudScene.js';
import InventoryScene from './scenes/InventoryScene.js';
import CraftingScene from './scenes/CraftingScene.js';
import BuildScene from './scenes/BuildScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import PauseScene from './scenes/PauseScene.js';
import ResearchScene from './scenes/ResearchScene.js';

const config = {
  ...GameConfig,
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    WorldScene,
    HudScene,
    InventoryScene,
    CraftingScene,
    BuildScene,
    DialogueScene,
    PauseScene,
    ResearchScene,
  ],
};

window.__game = new Phaser.Game(config);
