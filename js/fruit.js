/* ========================================
   水果模块
   负责水果刚体的创建、合并队列管理
   ======================================== */

const Fruit = (() => {
    // 待合并队列（避免在碰撞回调中直接移除刚体）
    let mergeQueue = [];

    /**
     * 创建一个水果刚体（等级 0-10）
     * @param {number} level  水果等级
     * @param {number} x      初始 X 位置
     * @param {number} y      初始 Y 位置
     * @param {boolean} isStatic  初始是否静止（用于预览/拖拽中的水果）
     */
    function create(level, x, y, isStatic = false) {
        const data = FRUITS[level];
        const body = Matter.Bodies.circle(x, y, data.radius, {
            restitution: CONFIG.PHYSICS.FRUIT_RESTITUTION,
            friction: CONFIG.PHYSICS.FRUIT_FRICTION,
            frictionAir: CONFIG.PHYSICS.FRUIT_FRICTION_AIR,
            density: CONFIG.PHYSICS.FRUIT_DENSITY,
            label: 'fruit',
            isStatic: isStatic,
        });

        // 挂载自定义属性
        body.fruitLevel = level;
        body.fruitRadius = data.radius;
        body.isPendingRemove = false;
        body.mergeAnimation = null;  // { scale, duration } 合并动画

        return body;
    }

    /**
     * 随机生成一个可掉落的水果等级
     */
    function randomLevel() {
        const min = CONFIG.RULES.SPAWN_MIN_LEVEL;
        const max = CONFIG.RULES.SPAWN_MAX_LEVEL;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 将合并请求加入队列（在物理更新后再处理）
     * @param {Matter.Body} bodyA
     * @param {Matter.Body} bodyB
     */
    function queueMerge(bodyA, bodyB) {
        // 去重：同一个合并对可能被多次检测
        const alreadyQueued = mergeQueue.some(
            pair => (pair.a === bodyA && pair.b === bodyB) || (pair.a === bodyB && pair.b === bodyA)
        );
        if (!alreadyQueued) {
            mergeQueue.push({ a: bodyA, b: bodyB });
        }
    }

    /**
     * 处理合并队列，返回本次合并产生的新水果列表
     * 应在每帧物理更新后调用
     */
    function processMergeQueue() {
        const newFruits = [];
        if (mergeQueue.length === 0) return newFruits;

        // 去重 + 按等级分组
        const validPairs = [];
        const seen = new Set();

        for (const pair of mergeQueue) {
            const a = pair.a;
            const b = pair.b;

            // 两个刚体可能已被之前的合并移除
            if (a.isPendingRemove || b.isPendingRemove) continue;

            const key = [a.id, b.id].sort().join('-');
            if (seen.has(key)) continue;
            seen.add(key);

            // 再次确认等级相同
            if (a.fruitLevel === b.fruitLevel && a.fruitLevel < MAX_LEVEL) {
                validPairs.push(pair);
            }
        }

        // 防止链式合并导致无限循环——每帧每个水果只能参与一次合并
        const mergedThisFrame = new Set();

        for (const pair of validPairs) {
            const a = pair.a;
            const b = pair.b;

            if (mergedThisFrame.has(a.id) || mergedThisFrame.has(b.id)) continue;
            if (a.isPendingRemove || b.isPendingRemove) continue;

            mergedThisFrame.add(a.id);
            mergedThisFrame.add(b.id);

            // 合并位置：两个水果的中点
            const midX = (a.position.x + b.position.x) / 2;
            const midY = (a.position.y + b.position.y) / 2;

            // 标记旧水果为待移除
            a.isPendingRemove = true;
            b.isPendingRemove = true;
            Physics.removeBody(a);
            Physics.removeBody(b);

            // 创建新水果（高一级）
            const newLevel = a.fruitLevel + 1;
            const newFruit = create(newLevel, midX, midY, false);

            // 添加合并动画标记
            newFruit.mergeAnimation = { scale: 1.3, duration: 200, startTime: performance.now() };

            Physics.addBody(newFruit);
            newFruits.push({ body: newFruit, level: newLevel, score: FRUITS[newLevel].score });
        }

        mergeQueue = [];
        return newFruits;
    }

    /**
     * 获取场上所有活跃的水果数量
     */
    function getActiveCount() {
        const bodies = Matter.Composite.allBodies(Physics.getWorld());
        return bodies.filter(b => b.label === 'fruit' && !b.isStatic && !b.isPendingRemove).length;
    }

    /**
     * 获取场上所有水果刚体（用于溢出检查）
     */
    function getAllFruits() {
        return Matter.Composite.allBodies(Physics.getWorld())
            .filter(b => b.label === 'fruit' && !b.isPendingRemove);
    }

    return { create, randomLevel, queueMerge, processMergeQueue, getActiveCount, getAllFruits };
})();
