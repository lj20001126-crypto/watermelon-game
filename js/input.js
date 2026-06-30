/* ========================================
   输入模块
   统一处理鼠标和触摸事件，控制水果预览和掉落
   ======================================== */

const Input = (function () {
    var canvas = null;
    var containerWidth = 0;
    var containerHeight = 0;
    var renderer = null;

    var isDragging = false;
    var previewBody = null;
    var debugCount = 0;

    function init(canvasEl, contW, contH, rend) {
        canvas = canvasEl;
        containerWidth = contW;
        containerHeight = contH;
        renderer = rend;

        // 鼠标事件
        canvas.addEventListener('mousedown', onPointerDown);
        canvas.addEventListener('mousemove', onPointerMove);
        canvas.addEventListener('mouseup', onPointerUp);
        canvas.addEventListener('mouseleave', onPointerUp);

        // 触摸事件
        canvas.addEventListener('touchstart', onPointerDown, { passive: false });
        canvas.addEventListener('touchmove', onPointerMove, { passive: false });
        canvas.addEventListener('touchend', onPointerUp);
        canvas.addEventListener('touchcancel', onPointerUp);

        console.log('📱 Input 初始化完成，Canvas:', canvas.width + 'x' + canvas.height);
    }

    function screenToWorld(screenX, screenY) {
        var rect = canvas.getBoundingClientRect();

        // Canvas 显示尺寸 vs 内在尺寸的缩放
        var ratioX = canvas.width / (rect.width || canvas.width);
        var ratioY = canvas.height / (rect.height || canvas.height);

        // Canvas 坐标（考虑 CSS 缩放）
        var canvasX = (screenX - rect.left) * ratioX;
        var canvasY = (screenY - rect.top) * ratioY;

        // 转换为容器内的逻辑坐标
        var ox = renderer.getOffsetX();
        var oy = renderer.getOffsetY();
        var sf = renderer.getScale();

        return {
            x: (canvasX - ox) / (sf || 1),
            y: (canvasY - oy) / (sf || 1),
        };
    }

    function getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
        // 每 10 次输出调试信息
        debugCount++;
        var shouldLog = (debugCount <= 5 || debugCount % 20 === 0);

        if (Game.getState() !== 'playing') {
            if (shouldLog) console.log('⚠️ mousedown 忽略: state=' + Game.getState());
            return;
        }
        if (!Game.canDrop()) {
            if (shouldLog) console.log('⚠️ mousedown 忽略: 冷却中');
            return;
        }
        if (!Game.hasDropsLeft()) {
            if (shouldLog) console.log('⚠️ mousedown 忽略: 已用完投放次数');
            return;
        }
        if (isDragging) {
            if (shouldLog) console.log('⚠️ mousedown 忽略: 已经在拖拽');
            return;
        }

        e.preventDefault();

        var pos = getEventPos(e);
        var worldPos = screenToWorld(pos.x, pos.y);

        if (shouldLog) {
            console.log('🖱️ mousedown: screen=(' + pos.x.toFixed(0) + ',' + pos.y.toFixed(0) +
                ') world=(' + worldPos.x.toFixed(0) + ',' + worldPos.y.toFixed(0) +
                ') offset=(' + renderer.getOffsetX().toFixed(0) + ',' + renderer.getOffsetY().toFixed(0) +
                ') scale=' + renderer.getScale().toFixed(3));
        }

        // 放宽判断：只要点在容器范围内即可（不限制 Y，统一从顶部掉落）
        if (worldPos.x < -30 || worldPos.x > containerWidth + 30) {
            if (shouldLog) console.log('⚠️ mousedown 忽略: X 超出容器范围 (' + worldPos.x.toFixed(0) + ')');
            return;
        }
        if (worldPos.y < -80 || worldPos.y > containerHeight + 30) {
            if (shouldLog) console.log('⚠️ mousedown 忽略: Y 超出容器范围 (' + worldPos.y.toFixed(0) + ')');
            return;
        }

        // 创建预览水果（固定在顶部 Y=30）
        var level = Game.getNextFruitLevel();
        var clampedX = Math.max(FRUITS[level].radius + 4, Math.min(containerWidth - FRUITS[level].radius - 4, worldPos.x));
        previewBody = Fruit.create(level, clampedX, 30, true);
        previewBody.collisionFilter = { group: -1, category: 0x0002, mask: 0 };
        Physics.addBody(previewBody);
        Game.setCurrentFruit(previewBody);
        isDragging = true;

        console.log('✅ 预览水果创建: ' + FRUITS[level].name + ' x=' + clampedX.toFixed(0));
    }

    function onPointerMove(e) {
        if (!isDragging || !previewBody || previewBody.isPendingRemove) return;

        e.preventDefault();

        var pos = getEventPos(e);
        var worldPos = screenToWorld(pos.x, pos.y);

        var clampedX = Math.max(FRUITS[0].radius + 4, Math.min(containerWidth - FRUITS[0].radius - 4, worldPos.x));
        try {
            Matter.Body.setPosition(previewBody, { x: clampedX, y: 30 });
            Matter.Body.setVelocity(previewBody, { x: 0, y: 0 });
            Matter.Body.setAngularVelocity(previewBody, 0);
        } catch (err) {
            // 刚体已被移除
            previewBody = null;
            isDragging = false;
        }
    }

    function onPointerUp(e) {
        if (!isDragging || !previewBody) {
            if (isDragging) console.log('⚠️ mouseup: 没有预览体');
            return;
        }

        e.preventDefault();

        var level = previewBody.fruitLevel;
        var x = previewBody.position.x;
        var y = previewBody.position.y;

        // 安全移除预览体
        try {
            if (!previewBody.isPendingRemove) {
                previewBody.isPendingRemove = true;
                Physics.removeBody(previewBody);
            }
        } catch (err) {
            // 已移除
        }

        previewBody = null;
        isDragging = false;

        // 创建真正掉落的水果
        var dropFruit = Fruit.create(level, x, y, false);
        Physics.addBody(dropFruit);
        Game.setCurrentFruit(null);
        Game.recordDrop();
        Game.useDrop();
        Game.generateNextFruit();
        AudioFX.playDrop();

        console.log('🫳 掉落: ' + FRUITS[level].name + ' @(' + x.toFixed(0) + ',' + y.toFixed(0) + ')');
    }

    function isDraggingFruit() { return isDragging; }
    function getPreviewBody() { return previewBody; }

    return { init: init, isDraggingFruit: isDraggingFruit, getPreviewBody: getPreviewBody };
})();
