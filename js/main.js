/* ========================================
   主入口模块
   初始化所有子系统，运行游戏循环
   ======================================== */

(function () {
    'use strict';

    // --- 早期检测：Matter.js 是否加载 ---
    if (typeof Matter === 'undefined') {
        console.error('❌ Matter.js 未加载！请检查网络连接。');
        return;
    }

    var mainCanvas = document.getElementById('game-canvas');
    var previewCanvas = document.getElementById('preview-canvas');
    var startScreen = document.getElementById('start-screen');
    var gameoverScreen = document.getElementById('gameover-screen');
    var winScreen = document.getElementById('win-screen');
    var hintText = document.getElementById('hint-text');
    var startBtn = document.getElementById('start-btn');
    var restartBtn = document.getElementById('restart-btn');
    var nextLevelBtn = document.getElementById('next-level-btn');
    var muteBtn = document.getElementById('mute-btn');

    var lastTime = 0;
    var animFrameId = null;
    var containerWidth, containerHeight, wallThick;

    // 胜利检测计时器
    var winCheckStart = 0;
    var winChecking = false;

    // --- 初始化 ---
    function init() {
        try {
            console.log('🚀 初始化游戏...');

            containerWidth = CONFIG.CONTAINER.WIDTH;
            containerHeight = CONFIG.CONTAINER.HEIGHT;
            wallThick = CONFIG.CONTAINER.WALL_THICKNESS;

            // 1. 渲染器
            Renderer.init(mainCanvas, previewCanvas, containerWidth, containerHeight, wallThick);
            console.log('  ✅ Renderer 初始化完成');

            // 2. Canvas 尺寸
            resizeCanvas();
            console.log('  ✅ Canvas 尺寸: ' + mainCanvas.width + 'x' + mainCanvas.height);

            // 3. 音效系统
            AudioFX.init();
            console.log('  ✅ AudioFX 初始化完成');

            // 4. 物理引擎
            Physics.init(containerWidth, containerHeight, wallThick);
            console.log('  ✅ Physics 初始化完成');

            // 5. 合并回调（触发音效 + 粒子 + 震动）
            // 初始水果有2秒宽限期，期间不合并，避免开局自动合成
            Physics.onMerge(function (bodyA, bodyB) {
                var now = performance.now();
                if ((bodyA.isInitial && now - bodyA.isInitial < 2000) ||
                    (bodyB.isInitial && now - bodyB.isInitial < 2000)) {
                    return; // 宽限期内跳过合并
                }
                Fruit.queueMerge(bodyA, bodyB);
                bodyA._lastMergePos = {
                    x: (bodyA.position.x + bodyB.position.x) / 2,
                    y: (bodyA.position.y + bodyB.position.y) / 2,
                };
            });
            console.log('  ✅ Merge 回调注册完成');

            // 6. 输入
            Input.init(mainCanvas, containerWidth, containerHeight, Renderer);
            console.log('  ✅ Input 初始化完成');

            // 7. 按钮事件
            startBtn.addEventListener('click', startGame);
            restartBtn.addEventListener('click', startGame);
            startBtn.addEventListener('touchend', function (e) { e.preventDefault(); startGame(); });
            restartBtn.addEventListener('touchend', function (e) { e.preventDefault(); startGame(); });

            // 下一关 / 重新开始按钮
            nextLevelBtn.addEventListener('click', startNextLevel);
            nextLevelBtn.addEventListener('touchend', function (e) { e.preventDefault(); startNextLevel(); });

            // 静音切换
            muteBtn.addEventListener('click', toggleMute);
            muteBtn.addEventListener('touchend', function (e) { e.preventDefault(); toggleMute(); });
            console.log('  ✅ 按钮事件绑定完成');

            // 8. 窗口大小变化
            window.addEventListener('resize', resizeCanvas);

            // 9. 初始状态
            showStartScreen();
            console.log('✅ 初始化完成！');

            // 10. 开始游戏循环
            lastTime = performance.now();
            animFrameId = requestAnimationFrame(gameLoop);

        } catch (err) {
            console.error('❌ 初始化失败:', err.message, err.stack);
            alert('游戏初始化失败: ' + err.message + '\n请刷新页面重试。');
        }
    }

    function resizeCanvas() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        Renderer.resize(w || 800, h || 600);
    }

    // --- 游戏循环 ---
    function gameLoop(timestamp) {
        animFrameId = requestAnimationFrame(gameLoop);

        if (timestamp === undefined) timestamp = performance.now();
        var delta = Math.min(timestamp - lastTime, 33);
        var dt = delta / 1000;
        lastTime = timestamp;

        try {
            Effects.update(dt);

            if (Game.getState() === 'playing') {
                // 步骤1：物理更新
                Physics.update(delta);

                // 步骤2：处理合并队列 + 特效
                var mergedFruits = Fruit.processMergeQueue();
                for (var i = 0; i < mergedFruits.length; i++) {
                    var m = mergedFruits[i];
                    Game.addScore(m.score);

                    var level = m.level;
                    if (level >= 9) {
                        AudioFX.playBigMerge();
                    } else {
                        AudioFX.playMerge(level);
                    }

                    var data = FRUITS[level];
                    var pos = m.body.position;
                    Effects.spawnParticles(pos.x, pos.y, data.colorLight, 10, level);
                    Effects.spawnScorePopup(pos.x, pos.y - data.radius, m.score);

                    if (level >= 6) {
                        Effects.triggerShake(level * 1.5);
                    }
                }

                // 步骤3：检查溢出
                checkOverflow();

                // 步骤4：胜利检测
                checkWinCondition(dt);

                // 步骤5：渲染
                var fruits = Fruit.getAllFruits();
                Renderer.draw(fruits);

                // 步骤6：更新预览
                Renderer.drawPreview(Game.getNextFruitLevel());

                // 步骤7：提示文字
                if (fruits.length === 0 && !Input.isDraggingFruit()) {
                    hintText.style.opacity = '1';
                } else {
                    hintText.style.opacity = '0';
                }

            } else if (Game.getState() === 'start') {
                Renderer.draw([]);
                Renderer.drawPreview(Fruit.randomLevel());
                hintText.style.opacity = '0';
            } else if (Game.getState() === 'gameover' || Game.getState() === 'win' || Game.getState() === 'allclear') {
                var fruits = Fruit.getAllFruits();
                Renderer.draw(fruits);
                hintText.style.opacity = '0';
            }
        } catch (err) {
            console.error('❌ 游戏循环错误:', err.message);
        }
    }

    // --- 胜利条件检测 ---
    function checkWinCondition(dt) {
        // 还有剩余投放次数，不需要检测
        if (Game.hasDropsLeft()) {
            winChecking = false;
            winCheckStart = 0;
            return;
        }

        // 正在拖拽水果，不检测
        if (Input.isDraggingFruit()) {
            winChecking = false;
            winCheckStart = 0;
            return;
        }

        // 检查所有非静态水果是否已稳定
        var allFruits = Fruit.getAllFruits();
        var activeFruits = allFruits.filter(function (f) {
            return !f.isStatic && !f.isPendingRemove;
        });

        var allSettled = true;
        for (var i = 0; i < activeFruits.length; i++) {
            var speed = Math.sqrt(
                activeFruits[i].velocity.x * activeFruits[i].velocity.x +
                activeFruits[i].velocity.y * activeFruits[i].velocity.y
            );
            if (speed > 0.3) {
                allSettled = false;
                break;
            }
        }

        if (allSettled) {
            if (!winChecking) {
                winChecking = true;
                winCheckStart = performance.now();
                // 更新提示
                hintText.textContent = '✅ 水果已稳定，即将过关...';
                hintText.style.opacity = '1';
            } else if (performance.now() - winCheckStart >= CONFIG.RULES.WIN_SETTLE_TIME) {
                // 最终确认：没有溢出
                if (!isOverflowing()) {
                    console.log('🎉 关卡' + Game.getLevel() + ' 通过！');
                    hintText.style.opacity = '0';
                    endLevel(true);
                } else {
                    winChecking = false;
                    winCheckStart = 0;
                    hintText.textContent = '👆 点击上方区域投下水果';
                }
            }
        } else {
            winChecking = false;
            winCheckStart = 0;
        }
    }

    function isOverflowing() {
        var warningY = CONFIG.CONTAINER.WARNING_LINE_Y;
        var allFruits = Fruit.getAllFruits();
        var activeFruits = allFruits.filter(function (f) {
            return !f.isStatic && !f.isPendingRemove;
        });

        var highFruitCount = 0;
        for (var i = 0; i < activeFruits.length; i++) {
            var fruit = activeFruits[i];
            if (fruit.position.y < warningY) {
                var speed = Math.sqrt(
                    fruit.velocity.x * fruit.velocity.x +
                    fruit.velocity.y * fruit.velocity.y
                );
                if (speed < 0.3) {
                    highFruitCount++;
                }
            }
        }
        return highFruitCount >= 6;
    }

    // --- 溢出检测 ---
    function checkOverflow() {
        if (isOverflowing()) {
            console.log('💥 游戏结束：水果溢出警戒线');
            endLevel(false);
            return;
        }

        var activeFruits = Fruit.getAllFruits().filter(function (f) {
            return !f.isStatic && !f.isPendingRemove;
        });
        if (activeFruits.length >= CONFIG.PHYSICS.MAX_FRUIT_COUNT) {
            console.log('💥 游戏结束：水果数量超限 (' + activeFruits.length + ')');
            endLevel(false);
        }
    }

    // --- 游戏流程 ---
    function startGame() {
        console.log('🎮 开始游戏...');
        AudioFX.resume();
        try {
            Game.reset();
            hideAllScreens();
            Game.startGame();
            spawnInitialFruits();
            updatePreviewDisplay();
            hintText.textContent = '👆 点击上方区域投下水果';
            hintText.style.opacity = '1';
            winChecking = false;
            winCheckStart = 0;
            console.log('  ✅ 第' + Game.getLevel() + '关, 预置' +
                Game.getLevelConfig().initialFruits + '个水果, ' +
                Game.getLevelConfig().drops + '次投放, ' +
                '下一个水果等级: ' + Game.getNextFruitLevel());
        } catch (err) {
            console.error('❌ 开始游戏失败:', err.message, err.stack);
            alert('开始游戏失败: ' + err.message);
        }
    }

    function endLevel(won) {
        if (won) {
            AudioFX.playBigMerge();
            Effects.triggerShake(8);
            Game.levelComplete();
        } else {
            AudioFX.playGameOver();
            Effects.triggerShake(12);
            Game.endGame();
        }
    }

    function startNextLevel() {
        console.log('▶️ 进入下一关...');
        AudioFX.resume();
        try {
            // 全部通关后点"重新开始"→从第1关重来
            if (Game.getState() === 'allclear') {
                startGame();
                return;
            }

            hideAllScreens();
            winChecking = false;
            winCheckStart = 0;

            // 检查是否有下一关（最大10关）
            if (Game.getLevel() >= 10) {
                Game.allClear();
                return;
            }

            Game.nextLevel();
            spawnInitialFruits();
            updatePreviewDisplay();
            hintText.textContent = '👆 点击上方区域投下水果';
            hintText.style.opacity = '1';
            console.log('  ✅ 第' + Game.getLevel() + '关, 预置' +
                Game.getLevelConfig().initialFruits + '个水果, ' +
                Game.getLevelConfig().drops + '次投放');
        } catch (err) {
            console.error('❌ 下一关失败:', err.message, err.stack);
            alert('进入下一关失败: ' + err.message);
        }
    }

    function showStartScreen() {
        startScreen.classList.remove('hidden');
        gameoverScreen.classList.add('hidden');
        winScreen.classList.add('hidden');
        hintText.style.opacity = '0';
    }

    function showWinScreen() {
        winScreen.classList.remove('hidden');
        gameoverScreen.classList.add('hidden');
        startScreen.classList.add('hidden');
    }

    function hideAllScreens() {
        startScreen.classList.add('hidden');
        gameoverScreen.classList.add('hidden');
        winScreen.classList.add('hidden');
    }

    function updatePreviewDisplay() {
        Renderer.drawPreview(Game.getNextFruitLevel());
    }

    /**
     * 开局网格化摆放水果：每种等级一个放一列，同等级分在不同列
     * 确保同等级水果间隔足够远，永远不会自动合成
     */
    function spawnInitialFruits() {
        var cfg = Game.getLevelConfig();
        if (!cfg) return;
        var totalCount = cfg.initialFruits;
        var levels = cfg.initialLevels;
        if (!levels || levels.length === 0) return;

        var numLevels = levels.length;
        // 每种等级出现次数 = 总数 / 等级种类数
        var perLevel = Math.floor(totalCount / numLevels);
        var numCols = perLevel;  // 列数 = 每种等级的数量

        // 构建每列的水果等级列表：每列包含所有等级，打乱纵向顺序
        var columns = [];
        for (var col = 0; col < numCols; col++) {
            var colLevels = levels.slice(); // 复制等级数组
            // 随机打乱该列的纵向顺序
            for (var s = colLevels.length - 1; s > 0; s--) {
                var j = Math.floor(Math.random() * (s + 1));
                var tmp = colLevels[s];
                colLevels[s] = colLevels[j];
                colLevels[j] = tmp;
            }
            columns.push(colLevels);
        }

        // 列间距
        var colWidth = (containerWidth - 20) / numCols;
        var startX = 10 + colWidth / 2;

        for (var col = 0; col < numCols; col++) {
            var colLevels = columns[col];
            var cx = startX + col * colWidth;

            for (var row = 0; row < colLevels.length; row++) {
                var level = colLevels[row];
                var radius = FRUITS[level].radius;

                // X: 列中心 ± 微小随机偏移
                var maxXJitter = Math.max(0, colWidth / 2 - radius - 4);
                var x = cx + (Math.random() - 0.5) * maxXJitter * 0.6;

                // Y: 在容器中下部均匀分布（30%~80%）
                var rowSpacing = 0.5 / colLevels.length;
                var y = containerHeight * (0.3 + row * rowSpacing + Math.random() * rowSpacing * 0.5);

                // 确保不超出容器边界
                x = Math.max(radius + 4, Math.min(containerWidth - radius - 4, x));
                y = Math.max(radius + 4, y);

                var fruit = Fruit.create(level, x, y, false);
                fruit.isInitial = performance.now(); // 2秒宽限期标记
                Physics.addBody(fruit);

                // 不给初速度，让水果在重力下自然下落排列
            }
        }

        console.log('🎯 开局网格摆放 ' + totalCount + ' 个水果 (' + numCols + '列×' + numLevels + '种等级: ' + levels.join(',') + ', 同等级永远在不同列)');
    }

    function toggleMute() {
        if (AudioFX.isEnabled()) {
            AudioFX.setEnabled(false);
            muteBtn.textContent = '🔇';
        } else {
            AudioFX.setEnabled(true);
            muteBtn.textContent = '🔊';
        }
    }

    // --- 启动 ---
    init();

    console.log('🍉 合成大西瓜 v2.0 - 关卡模式');
    console.log('   - 水果种类: ' + FRUITS.length + ' 种（樱桃 → 大西瓜）');
    console.log('   - 引擎: Matter.js ' + (Matter.version || ''));
    console.log('   - 音效: Web Audio API 合成');
    console.log('   - 特效: 粒子爆炸 + 得分飘字 + 屏幕震动');
    console.log('   - 关卡系统: 有限投放，通关晋级');
})();
