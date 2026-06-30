/* ========================================
   游戏状态管理模块
   负责分数、游戏阶段、关卡进度、掉落冷却等逻辑
   ======================================== */

const Game = (() => {
    let score = 0;
    let gameState = 'start';    // 'start' | 'playing' | 'gameover' | 'win' | 'allclear'
    let nextFruitLevel = 0;     // 预览中的下一个水果等级
    let currentFruit = null;    // 当前正在拖拽/等待掉落的水果刚体
    let lastDropTime = 0;       // 上次掉落的时间戳

    // --- 关卡状态 ---
    let currentLevel = 1;
    let remainingDrops = 0;
    let levelConfig = null;

    // --- 分数 ---
    function getScore() { return score; }

    function addScore(points) {
        score += points;
        document.getElementById('score').textContent = score;
    }

    function resetScore() {
        score = 0;
        document.getElementById('score').textContent = '0';
    }

    // --- 游戏状态 ---
    function getState() { return gameState; }

    function setState(state) {
        gameState = state;
    }

    // --- 关卡 ---
    function getLevel() { return currentLevel; }

    function getLevelConfig() { return levelConfig; }

    function getRemainingDrops() { return remainingDrops; }

    function hasDropsLeft() { return remainingDrops > 0; }

    function useDrop() {
        if (remainingDrops > 0) {
            remainingDrops--;
            updateDropsUI();
        }
    }

    function updateDropsUI() {
        var el = document.getElementById('drops-count');
        if (el) el.textContent = remainingDrops;
    }

    function updateLevelUI() {
        var el = document.getElementById('level-num');
        if (el) el.textContent = currentLevel;
    }

    /**
     * 初始化一个关卡
     * @param {number} level 关卡号 (1-based)
     */
    function startLevel(level) {
        currentLevel = level;
        levelConfig = CONFIG.getLevelConfig(level);
        remainingDrops = levelConfig.drops;
        updateLevelUI();
        updateDropsUI();
        resetScore();
        generateNextFruit();
        setState('playing');
        lastDropTime = 0;
    }

    /**
     * 关卡通过 → 显示胜利界面
     */
    function levelComplete() {
        if (gameState !== 'playing') return;
        setState('win');
        document.getElementById('win-level').textContent = currentLevel;
        document.getElementById('win-score').textContent = score;
        document.getElementById('win-screen').classList.remove('hidden');
    }

    /**
     * 进入下一关
     */
    function nextLevel() {
        currentLevel++;
        // 清除场上所有水果
        const fruits = Fruit.getAllFruits();
        for (const f of fruits) {
            Physics.removeBody(f);
        }
        clearCurrentFruit();
        startLevel(currentLevel);
    }

    /**
     * 全部通关
     */
    function allClear() {
        setState('allclear');
        document.getElementById('win-level').textContent = '全部';
        document.getElementById('win-screen').classList.remove('hidden');
        // 把按钮文字改成"重新开始"
        var btn = document.getElementById('next-level-btn');
        if (btn) btn.textContent = '重新开始';
    }

    /**
     * 生成下一个水果等级（使用当前关卡配置）
     */
    function generateNextFruit() {
        var min = levelConfig ? levelConfig.spawnMin : CONFIG.RULES.SPAWN_MIN_LEVEL;
        var max = levelConfig ? levelConfig.spawnMax : CONFIG.RULES.SPAWN_MAX_LEVEL;
        nextFruitLevel = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- 下一个水果 ---
    function getNextFruitLevel() { return nextFruitLevel; }

    // --- 当前正在操作的水果 ---
    function getCurrentFruit() { return currentFruit; }

    function setCurrentFruit(fruit) { currentFruit = fruit; }

    function clearCurrentFruit() {
        if (currentFruit && !currentFruit.isPendingRemove) {
            currentFruit.isPendingRemove = true;
            Physics.removeBody(currentFruit);
        }
        currentFruit = null;
    }

    // --- 掉落冷却 ---
    function canDrop() {
        return performance.now() - lastDropTime >= CONFIG.PHYSICS.MERGE_COOLDOWN;
    }

    function recordDrop() {
        lastDropTime = performance.now();
    }

    // --- 开始 / 结束 ---
    function startGame() {
        clearAllFruits();
        currentLevel = 1;
        score = 0;
        startLevel(1);
    }

    function endGame() {
        setState('gameover');
        document.getElementById('final-score').textContent = score;
        document.getElementById('gameover-screen').classList.remove('hidden');
    }

    function clearAllFruits() {
        const fruits = Fruit.getAllFruits();
        for (const f of fruits) {
            Physics.removeBody(f);
        }
        clearCurrentFruit();
    }

    function reset() {
        clearAllFruits();
        score = 0;
        currentLevel = 1;
        remainingDrops = 0;
        levelConfig = null;
        nextFruitLevel = 0;
        currentFruit = null;
        lastDropTime = 0;
        updateLevelUI();
        updateDropsUI();
    }

    return {
        getScore, addScore, resetScore,
        getState, setState,
        getLevel, getLevelConfig,
        getRemainingDrops, hasDropsLeft, useDrop,
        getNextFruitLevel, generateNextFruit,
        getCurrentFruit, setCurrentFruit, clearCurrentFruit,
        canDrop, recordDrop,
        startGame, endGame, reset,
        startLevel, levelComplete, nextLevel, allClear,
    };
})();
