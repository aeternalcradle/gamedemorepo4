/**
 * 无尽冬日（极简版）- Endless Winter (Minimal Edition)
 * 2D 模拟经营生存游戏
 * Phaser 3 + Arcade Physics
 */

// ==================== 资源管理器 ====================
class ResourceManager {
    constructor(scene) {
        this.scene = scene;
        this.wood = 50;
        this.coal = 30;
        this.survivors = 10;
        this.idleWorkers = 10;
        this.woodWorkers = 0;
        this.coalWorkers = 0;
    }

    addWood(amount) {
        this.wood += amount;
    }

    addCoal(amount) {
        this.coal += amount;
    }

    consumeCoal(amount) {
        if (this.coal >= amount) {
            this.coal -= amount;
            return true;
        }
        this.coal = 0;
        return false;
    }

    assignWorker(type) {
        if (this.idleWorkers <= 0) {
            return false;
        }
        this.idleWorkers--;
        if (type === 'wood') {
            this.woodWorkers++;
        } else if (type === 'coal') {
            this.coalWorkers++;
        }
        return true;
    }

    removeWorker(type) {
        if (type === 'wood' && this.woodWorkers > 0) {
            this.woodWorkers--;
            this.idleWorkers++;
            return true;
        } else if (type === 'coal' && this.coalWorkers > 0) {
            this.coalWorkers--;
            this.idleWorkers++;
            return true;
        }
        return false;
    }

    killSurvivor() {
        if (this.survivors <= 0) return false;
        this.survivors--;
        
        if (this.woodWorkers > 0) {
            this.woodWorkers--;
        } else if (this.coalWorkers > 0) {
            this.coalWorkers--;
        } else if (this.idleWorkers > 0) {
            this.idleWorkers--;
        }
        
        return this.survivors > 0;
    }

    getTotalWorkers() {
        return this.woodWorkers + this.coalWorkers + this.idleWorkers;
    }
}

// ==================== 火炉类 ====================
class Furnace {
    constructor(scene) {
        this.scene = scene;
        this.level = 1;
        this.maxLevel = 5;
        this.coalConsumption = 2;
        this.isWorking = true;
        this.upgradeCost = 20;
    }

    getHeatOutput() {
        return this.level * 15;
    }

    consumeCoal(resourceManager) {
        const consumption = this.coalConsumption * this.level;
        this.isWorking = resourceManager.consumeCoal(consumption);
        return this.isWorking;
    }

    upgrade(resourceManager) {
        if (this.level >= this.maxLevel) return false;
        const cost = this.getUpgradeCost();
        if (resourceManager.coal >= cost) {
            resourceManager.coal -= cost;
            this.level++;
            return true;
        }
        return false;
    }

    getUpgradeCost() {
        return this.upgradeCost * this.level;
    }
}

// ==================== 工作站基类 ====================
class WorkStation {
    constructor(scene, type) {
        this.scene = scene;
        this.type = type;
        this.level = 1;
        this.maxLevel = 5;
        this.baseEfficiency = 1;
        this.upgradeCost = 15;
    }

    getProduction(workers) {
        return workers * this.baseEfficiency * (1 + 0.2 * this.level);
    }

    upgrade(resourceManager) {
        if (this.level >= this.maxLevel) return false;
        const cost = this.getUpgradeCost();
        if (resourceManager.wood >= cost) {
            resourceManager.wood -= cost;
            this.level++;
            return true;
        }
        return false;
    }

    getUpgradeCost() {
        return this.upgradeCost * this.level;
    }
}

// ==================== 伐木营地 ====================
class LumberCamp extends WorkStation {
    constructor(scene) {
        super(scene, 'wood');
    }

    produce(resourceManager) {
        const production = this.getProduction(resourceManager.woodWorkers);
        resourceManager.addWood(Math.floor(production));
        return Math.floor(production);
    }
}

// ==================== 煤矿 ====================
class CoalMine extends WorkStation {
    constructor(scene) {
        super(scene, 'coal');
    }

    produce(resourceManager) {
        const production = this.getProduction(resourceManager.coalWorkers);
        resourceManager.addCoal(Math.floor(production));
        return Math.floor(production);
    }
}

// ==================== UI管理器 ====================
class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.elements = {};
    }

    createInfoPanel(x, y, width, height) {
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x2a2a4e, 0.8);
        panel.fillRoundedRect(x, y, width, height, 10);
        return panel;
    }

    createButton(x, y, width, height, text, callback) {
        const container = this.scene.add.container(x, y);
        
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x4a4a6e, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 8);
        
        const border = this.scene.add.graphics();
        border.lineStyle(2, 0x6a6a8e, 1);
        border.strokeRoundedRect(-width/2, -height/2, width, height, 8);
        
        const label = this.scene.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        container.add([bg, border, label]);
        container.setSize(width, height);
        container.setInteractive();
        
        container.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x5a5a7e, 1);
            bg.fillRoundedRect(-width/2, -height/2, width, height, 8);
        });
        
        container.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x4a4a6e, 1);
            bg.fillRoundedRect(-width/2, -height/2, width, height, 8);
        });
        
        container.on('pointerdown', callback);
        
        container.bg = bg;
        container.label = label;
        
        return container;
    }

    createFloatingText(x, y, text, color = '#00ff00') {
        const floatText = this.scene.add.text(x, y, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: color,
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: floatText,
            y: y - 60,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => floatText.destroy()
        });
        
        return floatText;
    }

    flashButton(button) {
        this.scene.tweens.add({
            targets: button,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 3
        });
    }
}

// ==================== 启动场景 ====================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        const { width, height } = this.scale;
        
        this.add.rectangle(width/2, height/2, width, height, 0x1a1a2e);
        
        const title = this.add.text(width/2, height/2 - 200, '无尽冬日', {
            fontSize: '72px',
            fontFamily: 'Arial',
            color: '#87ceeb',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const subtitle = this.add.text(width/2, height/2 - 120, '极简版', {
            fontSize: '36px',
            fontFamily: 'Arial',
            color: '#aaaacc'
        }).setOrigin(0.5);
        
        this.drawSnowflakes();
        
        const startBtn = this.add.container(width/2, height/2 + 50);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x4a7a9e, 1);
        btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        const btnBorder = this.add.graphics();
        btnBorder.lineStyle(3, 0x6a9abe, 1);
        btnBorder.strokeRoundedRect(-120, -40, 240, 80, 15);
        const btnText = this.add.text(0, 0, '开始生存', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        startBtn.add([btnBg, btnBorder, btnText]);
        startBtn.setSize(240, 80);
        startBtn.setInteractive();
        
        startBtn.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x5a8aae, 1);
            btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        });
        
        startBtn.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x4a7a9e, 1);
            btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        });
        
        startBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('MainScene');
            });
        });
        
        const instructions = this.add.text(width/2, height/2 + 200, 
            '在严寒中生存下去\n分配幸存者采集资源\n保持火炉燃烧', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#8888aa',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    drawSnowflakes() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 0.3);
        
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, 720);
            const y = Phaser.Math.Between(0, 1280);
            const size = Phaser.Math.Between(2, 6);
            graphics.fillCircle(x, y, size);
        }
    }
}

// ==================== 主游戏场景 ====================
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    create() {
        const { width, height } = this.scale;
        
        this.add.rectangle(width/2, height/2, width, height, 0x1a1a2e);
        
        this.resourceManager = new ResourceManager(this);
        this.furnace = new Furnace(this);
        this.lumberCamp = new LumberCamp(this);
        this.coalMine = new CoalMine(this);
        this.uiManager = new UIManager(this);
        
        this.envTemperature = -10;
        this.currentTemperature = 0;
        
        this.createSnowParticles();
        this.createTopInfoPanel();
        this.createFurnaceDisplay();
        this.createBottomPanel();
        
        this.time.addEvent({
            delay: 10000,
            callback: this.decreaseEnvTemperature,
            callbackScope: this,
            loop: true
        });
        
        this.time.addEvent({
            delay: 5000,
            callback: this.consumeFurnaceCoal,
            callbackScope: this,
            loop: true
        });
        
        this.time.addEvent({
            delay: 3000,
            callback: this.produceResources,
            callbackScope: this,
            loop: true
        });
        
        this.time.addEvent({
            delay: 5000,
            callback: this.checkSurvivorDeath,
            callbackScope: this,
            loop: true
        });
        
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }

    createSnowParticles() {
        this.snowGraphics = this.add.graphics();
        this.snowflakes = [];
        
        for (let i = 0; i < 30; i++) {
            this.snowflakes.push({
                x: Phaser.Math.Between(0, 720),
                y: Phaser.Math.Between(0, 1280),
                size: Phaser.Math.Between(2, 4),
                speed: Phaser.Math.Between(20, 50),
                wobble: Phaser.Math.FloatBetween(0, Math.PI * 2)
            });
        }
        
        this.time.addEvent({
            delay: 50,
            callback: this.updateSnow,
            callbackScope: this,
            loop: true
        });
    }

    updateSnow() {
        this.snowGraphics.clear();
        this.snowGraphics.fillStyle(0xffffff, 0.5);
        
        this.snowflakes.forEach(flake => {
            flake.y += flake.speed * 0.05;
            flake.wobble += 0.05;
            flake.x += Math.sin(flake.wobble) * 0.5;
            
            if (flake.y > 1280) {
                flake.y = -10;
                flake.x = Phaser.Math.Between(0, 720);
            }
            if (flake.x < 0) flake.x = 720;
            if (flake.x > 720) flake.x = 0;
            
            this.snowGraphics.fillCircle(flake.x, flake.y, flake.size);
        });
    }

    createTopInfoPanel() {
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x2a2a4e, 0.9);
        panelBg.fillRoundedRect(10, 10, 700, 130, 15);
        panelBg.lineStyle(2, 0x4a4a6e, 1);
        panelBg.strokeRoundedRect(10, 10, 700, 130, 15);
        
        const slotWidth = 160;
        const slotHeight = 50;
        const startX = 40;
        const startY = 30;
        
        this.createInfoSlot(startX, startY, '🌡️ 环境', () => `${this.envTemperature}°C`, 0x3a5a7e);
        this.createInfoSlot(startX + slotWidth + 10, startY, '🔥 室温', () => `${this.currentTemperature}°C`, 0x7a4a3e);
        this.createInfoSlot(startX, startY + slotHeight + 15, '👥 幸存者', () => `${this.resourceManager.survivors}`, 0x4a6a4e);
        this.createInfoSlot(startX + slotWidth + 10, startY + slotHeight + 15, '💤 空闲', () => `${this.resourceManager.idleWorkers}`, 0x5a5a6e);
        
        this.createInfoSlot(startX + (slotWidth + 10) * 2, startY, '🪵 木材', () => `${Math.floor(this.resourceManager.wood)}`, 0x6a5a3e);
        this.createInfoSlot(startX + (slotWidth + 10) * 2, startY + slotHeight + 15, '�ite 煤炭', () => `${Math.floor(this.resourceManager.coal)}`, 0x3a3a4e);
    }

    createInfoSlot(x, y, label, getValue, color) {
        const slot = this.add.graphics();
        slot.fillStyle(color, 0.8);
        slot.fillRoundedRect(x, y, 160, 50, 8);
        
        this.add.text(x + 10, y + 8, label, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaacc'
        });
        
        const valueText = this.add.text(x + 150, y + 28, getValue(), {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(1, 0.5);
        
        this.time.addEvent({
            delay: 100,
            callback: () => valueText.setText(getValue()),
            loop: true
        });
    }

    createFurnaceDisplay() {
        const centerX = 360;
        const centerY = 400;
        
        const furnaceBg = this.add.graphics();
        furnaceBg.fillStyle(0x2a2a4e, 0.8);
        furnaceBg.fillRoundedRect(centerX - 200, centerY - 180, 400, 360, 20);
        furnaceBg.lineStyle(3, 0x5a5a7e, 1);
        furnaceBg.strokeRoundedRect(centerX - 200, centerY - 180, 400, 360, 20);
        
        this.add.text(centerX, centerY - 150, '🔥 火炉', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffaa66',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.furnaceGraphics = this.add.graphics();
        this.drawFurnace(centerX, centerY);
        
        this.furnaceLevelText = this.add.text(centerX, centerY + 100, `等级: ${this.furnace.level}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        this.furnaceStatusText = this.add.text(centerX, centerY + 130, '状态: 正常运行', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#66ff66'
        }).setOrigin(0.5);
        
        this.time.addEvent({
            delay: 200,
            callback: () => this.updateFurnaceDisplay(centerX, centerY),
            loop: true
        });
    }

    drawFurnace(x, y) {
        this.furnaceGraphics.clear();
        
        this.furnaceGraphics.fillStyle(0x4a4a5e, 1);
        this.furnaceGraphics.fillRoundedRect(x - 80, y - 60, 160, 120, 10);
        
        this.furnaceGraphics.fillStyle(0x3a3a4e, 1);
        this.furnaceGraphics.fillRect(x - 60, y - 40, 120, 80);
        
        if (this.furnace.isWorking && this.resourceManager.coal > 0) {
            const fireColors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00];
            for (let i = 0; i < 8; i++) {
                const fx = x - 40 + Phaser.Math.Between(0, 80);
                const fy = y + 20 - Phaser.Math.Between(0, 60);
                const size = Phaser.Math.Between(8, 20);
                const color = fireColors[Phaser.Math.Between(0, 3)];
                this.furnaceGraphics.fillStyle(color, 0.8);
                this.furnaceGraphics.fillCircle(fx, fy, size);
            }
        } else {
            this.furnaceGraphics.fillStyle(0x2a2a3e, 1);
            this.furnaceGraphics.fillRect(x - 50, y - 30, 100, 60);
        }
        
        this.furnaceGraphics.fillStyle(0x5a5a6e, 1);
        this.furnaceGraphics.fillRect(x - 20, y - 100, 40, 50);
    }

    updateFurnaceDisplay(x, y) {
        this.drawFurnace(x, y);
        this.furnaceLevelText.setText(`等级: ${this.furnace.level}`);
        
        if (this.furnace.isWorking && this.resourceManager.coal > 0) {
            this.furnaceStatusText.setText('状态: 正常运行');
            this.furnaceStatusText.setColor('#66ff66');
        } else {
            this.furnaceStatusText.setText('状态: 燃料不足!');
            this.furnaceStatusText.setColor('#ff6666');
        }
    }

    createBottomPanel() {
        const panelY = 670;
        
        const bottomBg = this.add.graphics();
        bottomBg.fillStyle(0x2a2a4e, 0.9);
        bottomBg.fillRoundedRect(10, panelY, 700, 600, 15);
        bottomBg.lineStyle(2, 0x4a4a6e, 1);
        bottomBg.strokeRoundedRect(10, panelY, 700, 600, 15);
        
        this.createWorkStationPanel(30, panelY + 20, '🪵 伐木营地', 'wood', this.lumberCamp);
        this.createWorkStationPanel(370, panelY + 20, '⛏️ 煤矿', 'coal', this.coalMine);
        
        this.createUpgradeButtons(panelY + 400);
    }

    createWorkStationPanel(x, y, title, type, station) {
        const panelWidth = 320;
        const panelHeight = 180;
        
        const panel = this.add.graphics();
        panel.fillStyle(type === 'wood' ? 0x4a5a3e : 0x3a4a5e, 0.8);
        panel.fillRoundedRect(x, y, panelWidth, panelHeight, 12);
        panel.lineStyle(2, 0x6a6a8e, 1);
        panel.strokeRoundedRect(x, y, panelWidth, panelHeight, 12);
        
        this.add.text(x + panelWidth/2, y + 25, title, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const workerCount = type === 'wood' ? 
            () => this.resourceManager.woodWorkers : 
            () => this.resourceManager.coalWorkers;
        
        const workerText = this.add.text(x + panelWidth/2, y + 60, `工人: ${workerCount()}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#aaaacc'
        }).setOrigin(0.5);
        
        const levelText = this.add.text(x + panelWidth/2, y + 90, `等级: ${station.level}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#8888aa'
        }).setOrigin(0.5);
        
        this.time.addEvent({
            delay: 100,
            callback: () => {
                workerText.setText(`工人: ${workerCount()}`);
                levelText.setText(`等级: ${station.level}`);
            },
            loop: true
        });
        
        const addBtn = this.uiManager.createButton(x + 80, y + 145, 100, 40, '+1 工人', () => {
            if (this.resourceManager.assignWorker(type)) {
                this.uiManager.createFloatingText(x + panelWidth/2, y + 60, '+1', '#66ff66');
            } else {
                this.uiManager.flashButton(addBtn);
                this.cameras.main.shake(200, 0.005);
                this.uiManager.createFloatingText(x + panelWidth/2, y + 60, '无空闲工人!', '#ff6666');
            }
        });
        
        const removeBtn = this.uiManager.createButton(x + 240, y + 145, 100, 40, '-1 工人', () => {
            if (this.resourceManager.removeWorker(type)) {
                this.uiManager.createFloatingText(x + panelWidth/2, y + 60, '-1', '#ffaa66');
            }
        });
        
        if (type === 'wood') {
            this.woodStationX = x + panelWidth/2;
            this.woodStationY = y + 25;
        } else {
            this.coalStationX = x + panelWidth/2;
            this.coalStationY = y + 25;
        }
    }

    createUpgradeButtons(y) {
        const btnWidth = 200;
        const btnHeight = 50;
        const spacing = 20;
        const startX = 120;
        
        const furnaceUpgradeBtn = this.uiManager.createButton(startX, y, btnWidth, btnHeight, 
            `升级火炉 (${this.furnace.getUpgradeCost()}煤)`, () => {
            if (this.furnace.upgrade(this.resourceManager)) {
                this.uiManager.createFloatingText(360, 400, `火炉升级到 ${this.furnace.level} 级!`, '#ffff66');
                furnaceUpgradeBtn.label.setText(`升级火炉 (${this.furnace.getUpgradeCost()}煤)`);
            } else {
                this.uiManager.createFloatingText(360, 400, '资源不足!', '#ff6666');
            }
        });
        
        const woodUpgradeBtn = this.uiManager.createButton(startX + btnWidth + spacing, y, btnWidth, btnHeight,
            `升级伐木 (${this.lumberCamp.getUpgradeCost()}木)`, () => {
            if (this.lumberCamp.upgrade(this.resourceManager)) {
                this.uiManager.createFloatingText(this.woodStationX, this.woodStationY, 
                    `伐木营地升级到 ${this.lumberCamp.level} 级!`, '#66ff66');
                woodUpgradeBtn.label.setText(`升级伐木 (${this.lumberCamp.getUpgradeCost()}木)`);
            } else {
                this.uiManager.createFloatingText(this.woodStationX, this.woodStationY, '资源不足!', '#ff6666');
            }
        });
        
        const coalUpgradeBtn = this.uiManager.createButton(startX + (btnWidth + spacing) * 2, y, btnWidth, btnHeight,
            `升级煤矿 (${this.coalMine.getUpgradeCost()}木)`, () => {
            if (this.coalMine.upgrade(this.resourceManager)) {
                this.uiManager.createFloatingText(this.coalStationX, this.coalStationY,
                    `煤矿升级到 ${this.coalMine.level} 级!`, '#6666ff');
                coalUpgradeBtn.label.setText(`升级煤矿 (${this.coalMine.getUpgradeCost()}木)`);
            } else {
                this.uiManager.createFloatingText(this.coalStationX, this.coalStationY, '资源不足!', '#ff6666');
            }
        });
        
        this.time.addEvent({
            delay: 500,
            callback: () => {
                furnaceUpgradeBtn.label.setText(`升级火炉 (${this.furnace.getUpgradeCost()}煤)`);
                woodUpgradeBtn.label.setText(`升级伐木 (${this.lumberCamp.getUpgradeCost()}木)`);
                coalUpgradeBtn.label.setText(`升级煤矿 (${this.coalMine.getUpgradeCost()}木)`);
            },
            loop: true
        });
    }

    decreaseEnvTemperature() {
        this.envTemperature -= 1;
        this.updateCurrentTemperature();
    }

    consumeFurnaceCoal() {
        this.furnace.consumeCoal(this.resourceManager);
        this.updateCurrentTemperature();
    }

    updateCurrentTemperature() {
        if (this.furnace.isWorking && this.resourceManager.coal > 0) {
            this.currentTemperature = this.envTemperature + this.furnace.getHeatOutput();
        } else {
            this.currentTemperature = this.envTemperature;
        }
    }

    produceResources() {
        const woodProduced = this.lumberCamp.produce(this.resourceManager);
        const coalProduced = this.coalMine.produce(this.resourceManager);
        
        if (woodProduced > 0) {
            this.uiManager.createFloatingText(this.woodStationX, this.woodStationY - 30, 
                `+${woodProduced} 🪵`, '#88cc66');
        }
        
        if (coalProduced > 0) {
            this.uiManager.createFloatingText(this.coalStationX, this.coalStationY - 30,
                `+${coalProduced} ⛏️`, '#6688cc');
        }
    }

    checkSurvivorDeath() {
        this.updateCurrentTemperature();
        
        if (this.currentTemperature < -20) {
            const survived = this.resourceManager.killSurvivor();
            this.uiManager.createFloatingText(360, 200, '❄️ 有人冻死了!', '#ff4444');
            this.cameras.main.shake(300, 0.01);
            
            if (!survived || this.resourceManager.survivors <= 0) {
                this.gameOver();
            }
        }
    }

    gameOver() {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.time.delayedCall(1000, () => {
            this.scene.start('GameOverScene', {
                survivors: this.resourceManager.survivors,
                envTemp: this.envTemperature
            });
        });
    }
}

// ==================== 游戏结束场景 ====================
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalSurvivors = data.survivors || 0;
        this.finalTemp = data.envTemp || -10;
    }

    create() {
        const { width, height } = this.scale;
        
        this.add.rectangle(width/2, height/2, width, height, 0x0a0a1e);
        
        this.drawSnowStorm();
        
        const gameOverText = this.add.text(width/2, height/2 - 200, '游戏结束', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ff6666',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const deathText = this.add.text(width/2, height/2 - 100, '所有幸存者都冻死了...', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#aaaacc'
        }).setOrigin(0.5);
        
        const statsText = this.add.text(width/2, height/2, 
            `最终温度: ${this.finalTemp}°C\n坚持到了极寒的深处`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#8888aa',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        
        const restartBtn = this.add.container(width/2, height/2 + 150);
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x5a3a3e, 1);
        btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        const btnBorder = this.add.graphics();
        btnBorder.lineStyle(3, 0x8a5a5e, 1);
        btnBorder.strokeRoundedRect(-120, -40, 240, 80, 15);
        const btnText = this.add.text(0, 0, '重新开始', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        restartBtn.add([btnBg, btnBorder, btnText]);
        restartBtn.setSize(240, 80);
        restartBtn.setInteractive();
        
        restartBtn.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(0x6a4a4e, 1);
            btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        });
        
        restartBtn.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0x5a3a3e, 1);
            btnBg.fillRoundedRect(-120, -40, 240, 80, 15);
        });
        
        restartBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('BootScene');
            });
        });
        
        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    drawSnowStorm() {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 0.2);
        
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, 720);
            const y = Phaser.Math.Between(0, 1280);
            const size = Phaser.Math.Between(1, 4);
            graphics.fillCircle(x, y, size);
        }
    }
}

// ==================== 游戏配置与启动 ====================
const config = {
    type: Phaser.AUTO,
    width: 720,
    height: 1280,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, MainScene, GameOverScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
