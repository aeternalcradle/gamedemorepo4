class ResourceManager {
  constructor() {
    this.wood = 30;
    this.coal = 20;
    this.survivors = 8;
    this.idleWorkers = 8;
  }

  canAfford(cost) {
    return this.wood >= cost.wood && this.coal >= cost.coal;
  }

  spend(cost) {
    this.wood -= cost.wood;
    this.coal -= cost.coal;
  }

  addResource(type, amount) {
    if (type === "wood") {
      this.wood += amount;
    } else if (type === "coal") {
      this.coal += amount;
    }
  }

  assignWorker() {
    if (this.idleWorkers <= 0) return false;
    this.idleWorkers -= 1;
    return true;
  }

  unassignWorker() {
    this.idleWorkers += 1;
  }

  loseSurvivor(stations) {
    if (this.survivors <= 0) return;
    this.survivors -= 1;
    if (this.idleWorkers > 0) {
      this.idleWorkers -= 1;
      return;
    }
    for (const station of stations) {
      if (station.assignedWorkers > 0) {
        station.assignedWorkers -= 1;
        return;
      }
    }
  }
}

class Furnace {
  constructor(scene, x, y) {
    this.scene = scene;
    this.level = 1;
    this.radius = 55;
    this.core = scene.add.circle(x, y, this.radius, 0xffa200, 0.95);
    this.glow = scene.add.circle(x, y, this.radius + 10, 0xffd27d, 0.35);
    this.container = scene.add.container(0, 0, [this.glow, this.core]);
    scene.physics.add.existing(this.core, true);

    this.consumeTimer = scene.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => this.consumeCoal()
    });
  }

  consumeCoal() {
    if (this.scene.resourceManager.coal > 0) {
      this.scene.resourceManager.coal -= 1;
    }
  }

  upgrade() {
    this.level += 1;
    this.radius = 55 + this.level * 6;
    this.core.setRadius(this.radius);
    this.glow.setRadius(this.radius + 10);
  }

  getTemperatureBonus() {
    return this.level * 15;
  }
}

class WorkStation {
  constructor(scene, x, y, label, resourceType) {
    this.scene = scene;
    this.label = label;
    this.resourceType = resourceType;
    this.level = 1;
    this.assignedWorkers = 0;
    this.baseEfficiency = 1;

    this.panel = scene.add.rectangle(x, y, 300, 240, 0x23233a, 0.95).setStrokeStyle(2, 0x3b3b5e);
    this.titleText = scene.add.text(x, y - 90, label, { fontFamily: "Arial", fontSize: "26px", color: "#ffffff" }).setOrigin(0.5);
    this.workerText = scene.add.text(x, y - 40, "工人: 0", { fontFamily: "Arial", fontSize: "20px", color: "#cdd3ff" }).setOrigin(0.5);
    this.effText = scene.add.text(x, y, "效率: 1.0", { fontFamily: "Arial", fontSize: "18px", color: "#9fb4ff" }).setOrigin(0.5);

    this.minusButton = scene.add.rectangle(x - 70, y + 70, 60, 50, 0x2b2b44).setStrokeStyle(2, 0x5c5c84).setInteractive();
    this.plusButton = scene.add.rectangle(x + 70, y + 70, 60, 50, 0x2b2b44).setStrokeStyle(2, 0x5c5c84).setInteractive();
    this.minusText = scene.add.text(x - 70, y + 70, "-", { fontFamily: "Arial", fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);
    this.plusText = scene.add.text(x + 70, y + 70, "+", { fontFamily: "Arial", fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);

    this.bindButtons();
  }

  bindButtons() {
    this.plusButton.on("pointerdown", () => {
      const success = this.scene.resourceManager.assignWorker();
      if (!success) {
        this.scene.uiManager.flashButton(this.plusButton);
        this.scene.cameras.main.shake(120, 0.005);
        return;
      }
      this.assignedWorkers += 1;
      this.updateTexts();
    });

    this.minusButton.on("pointerdown", () => {
      if (this.assignedWorkers <= 0) return;
      this.assignedWorkers -= 1;
      this.scene.resourceManager.unassignWorker();
      this.updateTexts();
    });
  }

  updateTexts() {
    this.workerText.setText(`工人: ${this.assignedWorkers}`);
    this.effText.setText(`效率: ${this.getEfficiency().toFixed(1)}`);
  }

  getEfficiency() {
    return this.baseEfficiency * (1 + 0.2 * this.level);
  }

  produce() {
    return this.assignedWorkers * this.getEfficiency();
  }

  upgrade() {
    this.level += 1;
    this.updateTexts();
  }

  showProduction(amount) {
    if (amount <= 0) return;
    const text = this.scene.add.text(this.panel.x, this.panel.y - 130, `+${amount.toFixed(1)} ${this.resourceType === "wood" ? "木材" : "煤炭"}`,
      { fontFamily: "Arial", fontSize: "18px", color: "#e6f7ff" }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }
}

class LumberCamp extends WorkStation {
  constructor(scene, x, y) {
    super(scene, x, y, "伐木场", "wood");
  }
}

class CoalMine extends WorkStation {
  constructor(scene, x, y) {
    super(scene, x, y, "煤矿", "coal");
  }
}

class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.createTopBar();
    this.createUpgradeButtons();
    this.warningText = scene.add.text(360, 610, "", { fontFamily: "Arial", fontSize: "20px", color: "#ff7b7b" }).setOrigin(0.5);
  }

  createTopBar() {
    this.topBar = this.scene.add.rectangle(360, 75, 700, 140, 0x202036, 0.9).setStrokeStyle(2, 0x3b3b5e);
    const slotStyle = { fontFamily: "Arial", fontSize: "20px", color: "#e0e6ff" };
    this.tempText = this.scene.add.text(70, 45, "温度: --", slotStyle);
    this.woodText = this.scene.add.text(240, 45, "木材: --", slotStyle);
    this.coalText = this.scene.add.text(410, 45, "煤炭: --", slotStyle);
    this.popText = this.scene.add.text(580, 45, "人口: --", slotStyle);

    this.envText = this.scene.add.text(70, 95, "环境: --", { fontFamily: "Arial", fontSize: "18px", color: "#9fb4ff" });
    this.idleText = this.scene.add.text(240, 95, "空闲: --", { fontFamily: "Arial", fontSize: "18px", color: "#9fb4ff" });
  }

  createUpgradeButtons() {
    this.upgradeButtons = [];
    const buttonY = 1180;
    const buttonWidth = 210;
    const buttonHeight = 60;

    const furnaceButton = this.createButton(120, buttonY, buttonWidth, buttonHeight, "升级火炉");
    const lumberButton = this.createButton(360, buttonY, buttonWidth, buttonHeight, "升级伐木场");
    const coalButton = this.createButton(600, buttonY, buttonWidth, buttonHeight, "升级煤矿");

    this.upgradeButtons.push(furnaceButton, lumberButton, coalButton);

    furnaceButton.button.on("pointerdown", () => this.scene.tryUpgrade("furnace"));
    lumberButton.button.on("pointerdown", () => this.scene.tryUpgrade("lumber"));
    coalButton.button.on("pointerdown", () => this.scene.tryUpgrade("coal"));
  }

  createButton(x, y, width, height, label) {
    const button = this.scene.add.rectangle(x, y, width, height, 0x2b2b44).setStrokeStyle(2, 0x5c5c84).setInteractive();
    const text = this.scene.add.text(x, y, label, { fontFamily: "Arial", fontSize: "20px", color: "#ffffff" }).setOrigin(0.5);
    return { button, text };
  }

  flashButton(target) {
    target.setFillStyle(0x7d1f2a);
    this.scene.time.delayedCall(180, () => target.setFillStyle(0x2b2b44));
  }

  showWarning(message) {
    this.warningText.setText(message);
    this.warningText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.warningText,
      alpha: 0,
      duration: 1200
    });
  }

  updateTop(resourceManager, temps) {
    this.tempText.setText(`温度: ${temps.current.toFixed(1)}°C`);
    this.woodText.setText(`木材: ${resourceManager.wood.toFixed(1)}`);
    this.coalText.setText(`煤炭: ${resourceManager.coal.toFixed(1)}`);
    this.popText.setText(`人口: ${resourceManager.survivors}`);
    this.envText.setText(`环境: ${temps.env.toFixed(1)}°C`);
    this.idleText.setText(`空闲: ${resourceManager.idleWorkers}`);
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.registry.set("uiStyle", { fontFamily: "Arial", fontSize: "18px", color: "#ffffff" });
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.add.text(360, 640, "无尽冬日（极简版）", { fontFamily: "Arial", fontSize: "30px", color: "#ffffff" }).setOrigin(0.5);
    this.time.delayedCall(600, () => this.scene.start("MainScene"));
  }
}

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.resourceManager = new ResourceManager();
    this.uiManager = new UIManager(this);

    this.envTemperature = -10;
    this.currentTemperature = -10;
    this.isGameOver = false;

    this.furnace = new Furnace(this, 360, 400);
    this.lumberCamp = new LumberCamp(this, 200, 820);
    this.coalMine = new CoalMine(this, 520, 820);

    this.stationList = [this.lumberCamp, this.coalMine];

    this.tempEvent = this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => { this.envTemperature -= 1; }
    });

    this.productionEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.handleProduction()
    });

    this.deathEvent = this.time.addEvent({
      delay: 5000,
      loop: true,
      callback: () => this.handleDeaths()
    });

    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.updateTemperatures()
    });
  }

  updateTemperatures() {
    const furnaceActive = this.resourceManager.coal > 0;
    const bonus = furnaceActive ? this.furnace.getTemperatureBonus() : 0;
    this.currentTemperature = this.envTemperature + bonus;
    this.uiManager.updateTop(this.resourceManager, { env: this.envTemperature, current: this.currentTemperature });
  }

  handleProduction() {
    const woodGain = this.lumberCamp.produce();
    const coalGain = this.coalMine.produce();
    this.resourceManager.addResource("wood", woodGain);
    this.resourceManager.addResource("coal", coalGain);
    this.lumberCamp.showProduction(woodGain);
    this.coalMine.showProduction(coalGain);
  }

  handleDeaths() {
    if (this.currentTemperature >= -20) return;
    this.resourceManager.loseSurvivor(this.stationList);
    if (this.resourceManager.survivors <= 0) {
      this.triggerGameOver();
    }
  }

  getUpgradeCost(type) {
    if (type === "furnace") {
      return { wood: 20 + this.furnace.level * 15, coal: 10 + this.furnace.level * 10 };
    }
    if (type === "lumber") {
      return { wood: 15 + this.lumberCamp.level * 10, coal: 5 + this.lumberCamp.level * 6 };
    }
    return { wood: 15 + this.coalMine.level * 10, coal: 5 + this.coalMine.level * 6 };
  }

  tryUpgrade(type) {
    const cost = this.getUpgradeCost(type);
    if (!this.resourceManager.canAfford(cost)) {
      this.uiManager.showWarning("资源不足，无法升级");
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.resourceManager.spend(cost);
    if (type === "furnace") {
      this.furnace.upgrade();
    } else if (type === "lumber") {
      this.lumberCamp.upgrade();
    } else {
      this.coalMine.upgrade();
    }
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.scene.start("GameOverScene", {
      wood: this.resourceManager.wood,
      coal: this.resourceManager.coal,
      days: Math.floor(this.time.now / 10000)
    });
  }
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  init(data) {
    this.summary = data;
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.add.text(360, 420, "Game Over", { fontFamily: "Arial", fontSize: "48px", color: "#ffb4b4" }).setOrigin(0.5);
    this.add.text(360, 520, `木材: ${this.summary.wood.toFixed(1)}  煤炭: ${this.summary.coal.toFixed(1)}`,
      { fontFamily: "Arial", fontSize: "22px", color: "#ffffff" }).setOrigin(0.5);
    this.add.text(360, 560, `生存时长: ${this.summary.days} 天`, { fontFamily: "Arial", fontSize: "22px", color: "#ffffff" }).setOrigin(0.5);

    const restartButton = this.add.rectangle(360, 680, 220, 60, 0x2b2b44).setStrokeStyle(2, 0x5c5c84).setInteractive();
    this.add.text(360, 680, "重新开始", { fontFamily: "Arial", fontSize: "22px", color: "#ffffff" }).setOrigin(0.5);
    restartButton.on("pointerdown", () => this.scene.start("MainScene"));
  }
}

const config = {
  type: Phaser.AUTO,
  width: 720,
  height: 1280,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [BootScene, MainScene, GameOverScene]
};

new Phaser.Game(config);
