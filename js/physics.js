/* ========================================
   物理引擎模块
   负责 Matter.js 引擎的创建、墙体设置、碰撞检测
   ======================================== */

const Physics = (() => {
    let engine, world;
    let leftWall, rightWall, ground;
    let wallThickness;

    // 合并回调（由 game.js 注册）
    let onCollisionCallback = null;

    /**
     * 初始化 Matter.js 引擎和物理世界
     * @param {number} containerWidth  容器宽度（逻辑像素）
     * @param {number} containerHeight 容器高度（逻辑像素）
     * @param {number} wallThick       墙体厚度（逻辑像素）
     */
    function init(containerWidth, containerHeight, wallThick) {
        wallThickness = wallThick;

        // 创建引擎
        engine = Matter.Engine.create({
            gravity: {
                x: 0,
                y: CONFIG.PHYSICS.GRAVITY_Y,
                scale: 0.001,
            },
        });

        world = engine.world;

        // 容器边界（U 形：左墙、右墙、底）
        // 容器原点在左上角
        const halfWall = wallThickness / 2;
        const containerCenterX = containerWidth / 2;   // 容器中心 X
        const totalHeight = containerHeight;

        // 左墙
        leftWall = Matter.Bodies.rectangle(
            -halfWall,                    // x（容器左侧外面）
            totalHeight / 2,              // y
            wallThickness,                // 宽度
            totalHeight * 2,              // 高度（拉长防止溢出）
            { isStatic: true, friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_RESTITUTION, label: 'wall' }
        );

        // 右墙
        rightWall = Matter.Bodies.rectangle(
            containerWidth + halfWall,    // x（容器右侧外面）
            totalHeight / 2,
            wallThickness,
            totalHeight * 2,
            { isStatic: true, friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_RESTITUTION, label: 'wall' }
        );

        // 底部
        ground = Matter.Bodies.rectangle(
            containerWidth / 2,
            totalHeight + halfWall,
            containerWidth + wallThickness * 2,
            wallThickness,
            { isStatic: true, friction: CONFIG.PHYSICS.WALL_FRICTION, restitution: CONFIG.PHYSICS.WALL_RESTITUTION, label: 'wall' }
        );

        Matter.Composite.add(world, [leftWall, rightWall, ground]);

        // --- 碰撞检测 ---
        Matter.Events.on(engine, 'collisionStart', (event) => {
            for (const pair of event.pairs) {
                const a = pair.bodyA;
                const b = pair.bodyB;

                // 只处理水果之间的碰撞（排除墙体）
                if (a.label === 'wall' || b.label === 'wall') continue;
                // 忽略已经标记为待删除的
                if (a.isPendingRemove || b.isPendingRemove) continue;

                // 检查是否同等级
                if (a.fruitLevel !== undefined && a.fruitLevel === b.fruitLevel) {
                    if (onCollisionCallback) {
                        onCollisionCallback(a, b);
                    }
                }
            }
        });
    }

    /**
     * 注册碰撞回调（两个同等级水果碰撞时触发）
     */
    function onMerge(callback) {
        onCollisionCallback = callback;
    }

    /**
     * 添加水果刚体到世界
     */
    function addBody(body) {
        Matter.Composite.add(world, body);
    }

    /**
     * 从世界移除水果刚体
     */
    function removeBody(body) {
        Matter.Composite.remove(world, body);
    }

    /**
     * 推进物理模拟一步
     * @param {number} delta 时间步长（毫秒）
     */
    function update(delta) {
        Matter.Engine.update(engine, delta);
    }

    /**
     * 判断某个位置是否在容器范围内
     */
    function isInsideContainer(x, containerWidth) {
        const margin = CONFIG.FRUITS[CONFIG.RULES.SPAWN_MAX_LEVEL].radius + 4;
        return x >= margin && x <= containerWidth - margin;
    }

    /**
     * 限制 X 坐标在容器内
     */
    function clampToContainer(x, containerWidth) {
        const margin = CONFIG.FRUITS[CONFIG.RULES.SPAWN_MAX_LEVEL].radius + 4;
        return Math.max(margin, Math.min(containerWidth - margin, x));
    }

    function getEngine() { return engine; }
    function getWorld() { return world; }

    return { init, onMerge, addBody, removeBody, update, isInsideContainer, clampToContainer, getEngine, getWorld };
})();
