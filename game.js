// 游戏配置
const config = {
  width: 800,
  height: 600,
  tileSize: 32,
  playerSpeed: 2,
  chunkSize: 10, // 每个区块包含10x10个tile
  viewDistance: 3 // 加载玩家周围3个区块
};

// 游戏状态
let gameState = {
  player: {
    x: config.width / 2,
    y: config.height / 2,
    health: 100,
    level: 1,
    inventory: [],
    selectedItem: null,
    attackCooldown: 0,
    buildMode: false,
    previewStructure: null,
    completedQuests: [],
    achievements: []
  },
  resources: [],
  enemies: [],
  structures: [],
  quests: [
    {
      id: 'first_quest',
      title: '初入世界',
      description: '收集5个木材',
      type: 'collect',
      target: 'wood',
      amount: 5,
      reward: { xp: 100, items: ['stone_pickaxe'] },
      completed: false
    },
    {
      id: 'first_build',
      title: '建造第一堵墙',
      description: '建造一堵墙',
      type: 'build',
      target: 'wall',
      amount: 1,
      reward: { xp: 200 },
      completed: false
    }
  ],
  lastUpdate: Date.now(),
  mouse: {
    x: 0,
    y: 0,
    left: false,
    right: false
  }
};

// 全局变量
let canvasOffsetX = 0;
let canvasOffsetY = 0;

// 初始化游戏
function init() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = config.width;
  canvas.height = config.height;
  const ctx = canvas.getContext('2d');
  
  // 初始化区块管理器
  initChunkManager();
  
  // 设置游戏循环
  setInterval(() => gameLoop(ctx), 1000/60);
  
  // 设置控制
  setupControls();
}

// 更新HUD
function updateHUD() {
  // 更新生命值和等级
  document.getElementById('health').textContent = Math.floor(gameState.player.health);
  document.getElementById('level').textContent = Math.floor(gameState.player.level);

  // 更新任务列表
  const questList = document.getElementById('quest-list');
  questList.innerHTML = '';
  gameState.quests.forEach(quest => {
    const li = document.createElement('li');
    li.textContent = `${quest.title}: ${quest.description}`;
    if (quest.completed) {
      li.style.textDecoration = 'line-through';
      li.style.color = '#888';
    }
    questList.appendChild(li);
  });

  // 更新背包
  const inventory = document.getElementById('inventory');
  inventory.innerHTML = '';
  const itemCounts = {};
  gameState.player.inventory.forEach(item => {
    itemCounts[item] = (itemCounts[item] || 0) + 1;
  });
  Object.entries(itemCounts).forEach(([item, count]) => {
    const li = document.createElement('li');
    li.textContent = `${item} x${count}`;
    inventory.appendChild(li);
  });
}

// 游戏主循环
function gameLoop(ctx) {
  const now = Date.now();
  const delta = now - gameState.lastUpdate;
  gameState.lastUpdate = now;
  
  // 清空画布
  ctx.clearRect(0, 0, config.width, config.height);
  
  // 更新游戏状态
  updateGameState(delta);
  
  // 绘制资源
  drawResources(ctx);
  
  // 绘制玩家
  drawPlayer(ctx);
  
  // 绘制敌人
  drawEnemies(ctx);
  
  // 绘制建筑
  drawStructures(ctx);
  
  // 绘制建造预览
  drawPreviewStructure(ctx);
  
  // 更新HUD
  updateHUD();
  
  // 检查任务完成状态
  checkQuestCompletion();
}

// 检查任务完成状态
function checkQuestCompletion() {
  gameState.quests.forEach(quest => {
    if (quest.completed) return;
    
    let current = 0;
    if (quest.type === 'collect') {
      current = gameState.player.inventory.filter(item => item === quest.target).length;
    } else if (quest.type === 'build') {
      current = gameState.structures.filter(s => s.type === quest.target).length;
    }
    
    if (current >= quest.amount) {
      quest.completed = true;
      completeQuest(quest);
    }
  });
}

// 完成任务
function completeQuest(quest) {
  // 给予奖励
  gameState.player.level += quest.reward.xp / 100;
  if (quest.reward.items) {
    gameState.player.inventory.push(...quest.reward.items);
  }
  
  // 添加到已完成任务列表
  gameState.player.completedQuests.push(quest.id);
  
  // 更新HUD
  updateHUD();
  
  // 检查是否有新任务
  checkForNewQuests();
}

// 检查是否有新任务
function checkForNewQuests() {
  // 示例：完成第一个任务后解锁新任务
  if (gameState.player.completedQuests.includes('first_quest')) {
    if (!gameState.quests.some(q => q.id === 'explore_quest')) {
      gameState.quests.push({
        id: 'explore_quest',
        title: '探索世界',
        description: '探索3个新区块',
        type: 'explore',
        target: 'chunks',
        amount: 3,
        reward: { xp: 300 },
        completed: false
      });
    }
  }
}

// 更新游戏状态
function updateGameState(delta) {
  // 更新攻击冷却
  if (gameState.player.attackCooldown > 0) {
    gameState.player.attackCooldown -= delta;
  }
  
  // 处理攻击
  if (gameState.mouse.left && gameState.player.attackCooldown <= 0) {
    attack();
    gameState.player.attackCooldown = 500; // 0.5秒冷却
  }
  
  // 更新敌人
  updateEnemies(delta);
}

// 攻击
function attack() {
  const player = gameState.player;
  const attackRange = config.tileSize * 2;
  
  gameState.enemies = gameState.enemies.filter(enemy => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < attackRange) {
      enemy.health -= 10;
      if (enemy.health <= 0) {
        player.inventory.push('monster_meat');
        updateInventory();
        return false; // 移除死亡的敌人
      }
    }
    return true;
  });
}

  // 生成敌人
  function generateEnemies() {
    for (let i = 0; i < 2; i++) {  // 减少敌人数量
      gameState.enemies.push({
        x: Math.random() * config.width,
        y: Math.random() * config.height,
        health: 50,
        speed: 1,
        detectionRange: config.tileSize * 5  // 添加索敌范围
      });
    }
  }

// 更新敌人
function updateEnemies(delta) {
  const player = gameState.player;
  
  gameState.enemies.forEach(enemy => {
    // 移动向玩家
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > config.tileSize) {
      enemy.x += (dx / distance) * enemy.speed;
      enemy.y += (dy / distance) * enemy.speed;
    }
    
    // 攻击玩家
    if (distance < config.tileSize) {
      player.health -= 0.1;
    }
  });
}

// 绘制玩家
function drawPlayer(ctx) {
  ctx.fillStyle = '#00FF00';
  ctx.fillRect(
    config.width/2 - config.tileSize/2,
    config.height/2 - config.tileSize/2,
    config.tileSize,
    config.tileSize
  );
}

// 绘制资源
function drawResources(ctx) {
  gameState.resources.forEach(resource => {
    ctx.fillStyle = resource.type === 'wood' ? '#8B4513' : '#808080';
    ctx.fillRect(
      resource.x - gameState.player.x + config.width/2,
      resource.y - gameState.player.y + config.height/2,
      config.tileSize,
      config.tileSize
    );
  });
}

// 绘制敌人
function drawEnemies(ctx) {
  gameState.enemies.forEach(enemy => {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      enemy.x - gameState.player.x + config.width/2 - config.tileSize/2,
      enemy.y - gameState.player.y + config.height/2 - config.tileSize/2,
      config.tileSize,
      config.tileSize
    );
    
    // 绘制血条
    ctx.fillStyle = '#330000';
    ctx.fillRect(
      enemy.x - gameState.player.x + config.width/2 - config.tileSize/2,
      enemy.y - gameState.player.y + config.height/2 - config.tileSize/2 - 10,
      config.tileSize,
      5
    );
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(
      enemy.x - gameState.player.x + config.width/2 - config.tileSize/2,
      enemy.y - gameState.player.y + config.height/2 - config.tileSize/2 - 10,
      config.tileSize * (enemy.health / 50),
      5
    );
  });
}

// 区块管理
const chunkManager = {
  loadedChunks: new Set(),
  resources: new Map(),
  enemies: new Map(),
  
  getChunkKey(x, y) {
    return `${x},${y}`;
  },
  
  loadChunk(x, y) {
    const key = this.getChunkKey(x, y);
    if (!this.loadedChunks.has(key)) {
      this.loadedChunks.add(key);
      this.generateChunkResources(x, y);
      this.generateChunkEnemies(x, y);
    }
  },
  
  unloadChunk(x, y) {
    const key = this.getChunkKey(x, y);
    if (this.loadedChunks.has(key)) {
      this.loadedChunks.delete(key);
      this.resources.delete(key);
      this.enemies.delete(key);
    }
  },
  
  generateChunkResources(x, y) {
    const key = this.getChunkKey(x, y);
    const resources = [];
    const count = Math.floor(Math.random() * 10) + 5; // 每个区块5-15个资源
    
    for (let i = 0; i < count; i++) {
      resources.push({
        type: Math.random() > 0.5 ? 'wood' : 'stone',
        x: x * config.chunkSize * config.tileSize + Math.random() * config.chunkSize * config.tileSize,
        y: y * config.chunkSize * config.tileSize + Math.random() * config.chunkSize * config.tileSize
      });
    }
    
    this.resources.set(key, resources);
    gameState.resources.push(...resources);
  },
  
  generateChunkEnemies(x, y) {
    const key = this.getChunkKey(x, y);
    const enemies = [];
    const count = Math.floor(Math.random() * 3) + 1; // 每个区块1-4个敌人
    
    for (let i = 0; i < count; i++) {
      enemies.push({
        x: x * config.chunkSize * config.tileSize + Math.random() * config.chunkSize * config.tileSize,
        y: y * config.chunkSize * config.tileSize + Math.random() * config.chunkSize * config.tileSize,
        health: 50,
        speed: 1
      });
    }
    
    this.enemies.set(key, enemies);
    gameState.enemies.push(...enemies);
  }
};

function initChunkManager() {
  const playerChunkX = Math.floor(gameState.player.x / (config.chunkSize * config.tileSize));
  const playerChunkY = Math.floor(gameState.player.y / (config.chunkSize * config.tileSize));
  updateChunks(playerChunkX, playerChunkY);
}

function updateChunks(currentChunkX, currentChunkY) {
  // 卸载超出视距的区块
  const chunksToUnload = [];
  chunkManager.loadedChunks.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    if (Math.abs(x - currentChunkX) > config.viewDistance || 
        Math.abs(y - currentChunkY) > config.viewDistance) {
      chunksToUnload.push({x, y});
    }
  });
  
  chunksToUnload.forEach(({x, y}) => chunkManager.unloadChunk(x, y));
  
  // 加载新区块
  for (let x = currentChunkX - config.viewDistance; x <= currentChunkX + config.viewDistance; x++) {
    for (let y = currentChunkY - config.viewDistance; y <= currentChunkY + config.viewDistance; y++) {
      chunkManager.loadChunk(x, y);
    }
  }
}

function generateResourcesAroundPlayer() {
  const playerChunkX = Math.floor(gameState.player.x / (config.chunkSize * config.tileSize));
  const playerChunkY = Math.floor(gameState.player.y / (config.chunkSize * config.tileSize));
  chunkManager.loadChunk(playerChunkX, playerChunkY);
}

function generateEnemiesAroundPlayer() {
  const playerChunkX = Math.floor(gameState.player.x / (config.chunkSize * config.tileSize));
  const playerChunkY = Math.floor(gameState.player.y / (config.chunkSize * config.tileSize));
  chunkManager.loadChunk(playerChunkX, playerChunkY);
}

// 设置控制
function setupControls() {
  const keys = { w: false, a: false, s: false, d: false, e: false, b: false };
  
  // 键盘控制
  window.addEventListener('keydown', (e) => {
    // ESC键切换说明页面
    if (e.key === 'Escape') {
      const instructions = document.getElementById('instructions');
      instructions.style.display = instructions.style.display === 'none' ? 'block' : 'none';
      return;
    }
    
    if (['w', 'a', 's', 'd', 'e', 'b'].includes(e.key)) {
      keys[e.key] = true;
      
      // 切换建造模式
      if (e.key === 'b') {
        gameState.player.buildMode = !gameState.player.buildMode;
        if (gameState.player.buildMode) {
          gameState.player.previewStructure = { type: 'wall', x: gameState.mouse.x, y: gameState.mouse.y };
        } else {
          gameState.player.previewStructure = null;
        }
        updateHUD();
      }
    }
  });
  
  window.addEventListener('keyup', (e) => {
    if (['w', 'a', 's', 'd', 'e', 'b'].includes(e.key)) {
      keys[e.key] = false;
    }
  });
  
  // 鼠标控制
  const canvas = document.getElementById('game-canvas');
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
    
    // 更新建造预览位置
    if (gameState.player.buildMode && gameState.player.previewStructure) {
      gameState.player.previewStructure.x = gameState.mouse.x;
      gameState.player.previewStructure.y = gameState.mouse.y;
    }
  });
  
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      gameState.mouse.left = true;
      
      // 建造模式下的建造
      if (gameState.player.buildMode) {
        tryBuildStructure();
      }
    }
    if (e.button === 2) gameState.mouse.right = true;
  });
  
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) gameState.mouse.left = false;
    if (e.button === 2) gameState.mouse.right = false;
  });
  
  // 更新玩家位置
  setInterval(() => {
    const prevChunkX = Math.floor(gameState.player.x / (config.chunkSize * config.tileSize));
    const prevChunkY = Math.floor(gameState.player.y / (config.chunkSize * config.tileSize));
    
    if (keys.w) gameState.player.y -= config.playerSpeed;
    if (keys.a) gameState.player.x -= config.playerSpeed;
    if (keys.s) gameState.player.y += config.playerSpeed;
    if (keys.d) gameState.player.x += config.playerSpeed;

    // 检查是否进入新区块
    const newChunkX = Math.floor(gameState.player.x / (config.chunkSize * config.tileSize));
    const newChunkY = Math.floor(gameState.player.y / (config.chunkSize * config.tileSize));
    
    if (newChunkX !== prevChunkX || newChunkY !== prevChunkY) {
      updateChunks(newChunkX, newChunkY);
    }
    
    // 收集资源
    if (keys.e) tryCollectResource();
  }, 1000/60);
}

// 尝试建造
