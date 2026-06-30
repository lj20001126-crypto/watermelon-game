/* ========================================
   渲染模块
   使用 Canvas 绘制容器、水果、UI 等
   ======================================== */

const Renderer = (function () {
    var canvas, ctx;
    var previewCanvas, previewCtx;
    var containerWidth, containerHeight, wallThick;
    var scaleFactor = 1;
    var offsetX = 0, offsetY = 0;

    function init(mainCanvas, prevCanvas, contW, contH, wallT) {
        canvas = mainCanvas;
        ctx = canvas.getContext('2d');
        previewCanvas = prevCanvas;
        previewCtx = prevCanvas.getContext('2d');
        containerWidth = contW;
        containerHeight = contH;
        wallThick = wallT;
    }

    /**
     * 设置 Canvas 尺寸和缩放
     */
    function resize(screenWidth, screenHeight) {
        canvas.width = screenWidth;
        canvas.height = screenHeight;

        // 计算缩放：容器适应屏幕
        var maxWidth = Math.min(screenWidth * 0.92, 420);
        var maxHeight = screenHeight * 0.72;

        var scaleX = maxWidth / containerWidth;
        var scaleY = maxHeight / containerHeight;
        scaleFactor = Math.min(scaleX, scaleY);

        // 居中偏移
        var displayWidth = containerWidth * scaleFactor;
        var displayHeight = containerHeight * scaleFactor;
        offsetX = (screenWidth - displayWidth) / 2;
        offsetY = (screenHeight - displayHeight) / 2 + 10;
    }

    function getScale() { return scaleFactor; }
    function getOffsetX() { return offsetX; }
    function getOffsetY() { return offsetY; }

    /**
     * 逻辑坐标 → Canvas 坐标
     */
    function toScreen(logicX, logicY) {
        return {
            x: logicX * scaleFactor + offsetX,
            y: logicY * scaleFactor + offsetY,
        };
    }

    /**
     * 逻辑长度 → Canvas 长度
     */
    function toScreenSize(logicSize) {
        return logicSize * scaleFactor;
    }

    /**
     * 每帧绘制
     */
    function draw(fruits) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 屏幕震动
        var shake = Effects.getShakeOffset();
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // 背景
        ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        ctx.fillRect(-5, -5, canvas.width + 10, canvas.height + 10);

        // 绘制容器
        drawContainer();

        // 绘制掉落区高亮
        drawDropZone();

        // 绘制警戒线
        drawWarningLine();

        // 绘制所有水果
        for (var i = 0; i < fruits.length; i++) {
            drawFruit(fruits[i]);
        }

        // 绘制拖拽引导线
        if (Input.isDraggingFruit() && Input.getPreviewBody()) {
            drawGuideLine(Input.getPreviewBody().position.x);
        }

        // 绘制粒子特效
        drawParticles();

        // 绘制得分飘字
        drawScorePopups();

        ctx.restore(); // 恢复震动偏移
    }

    /**
     * 绘制粒子
     */
    function drawParticles() {
        var particles = Effects.getParticles();
        for (var i = 0; i < particles.length; i++) {
            var p = particles[i];
            var alpha = 1 - p.age / p.life;
            var pos = toScreen(p.x, p.y);
            var r = toScreenSize(p.radius);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, Math.max(r, 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * 绘制得分飘字
     */
    function drawScorePopups() {
        var popups = Effects.getScorePopups();
        for (var i = 0; i < popups.length; i++) {
            var sp = popups[i];
            var alpha = 1 - sp.age / sp.life;
            var pos = toScreen(sp.x, sp.y);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold ' + Math.round(20 * scaleFactor) + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+' + sp.score, pos.x, pos.y);

            // 描边
            ctx.strokeStyle = 'rgba(0,0,0,' + alpha + ')';
            ctx.lineWidth = 2;
            ctx.strokeText('+' + sp.score, pos.x, pos.y);
        }
        ctx.globalAlpha = 1;
    }

    /**
     * 应用屏幕震动
     */
    function applyShake(ctx) {
        var shake = Effects.getShakeOffset();
        if (shake.x !== 0 || shake.y !== 0) {
            // 注意：这个由调用者在 draw 开头处理
        }
        return shake;
    }

    /**
     * 绘制容器
     */
    function drawContainer() {
        var x = offsetX;
        var y = offsetY;
        var w = containerWidth * scaleFactor;
        var h = containerHeight * scaleFactor;
        var t = wallThick * scaleFactor;

        // 容器外框阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x - t / 2 + 4, y - t / 2 + 4, w + t, h + t);

        // 容器内部填充
        var bgGrad = ctx.createLinearGradient(x, y, x, y + h);
        bgGrad.addColorStop(0, '#1a2744');
        bgGrad.addColorStop(1, '#16213e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(x - t / 2, y - t / 2, w + t, h + t);

        // 边框
        ctx.strokeStyle = CONFIG.COLORS.CONTAINER_STROKE;
        ctx.lineWidth = t;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x - t / 2, y - t / 2);
        ctx.lineTo(x - t / 2, y + h + t / 2);
        ctx.lineTo(x + w + t / 2, y + h + t / 2);
        ctx.lineTo(x + w + t / 2, y - t / 2);
        ctx.stroke();
    }

    /**
     * 绘制掉落区高亮指示
     */
    function drawDropZone() {
        var x = offsetX;
        var y = offsetY;
        var w = containerWidth * scaleFactor;
        var zoneH = containerHeight * 0.4 * scaleFactor;

        // 半透明高亮区域
        var grad = ctx.createLinearGradient(x, y, x, y + zoneH);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.01)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, zoneH);

        // 顶部边框提示
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y + zoneH);
        ctx.lineTo(x + w, y + zoneH);
        ctx.stroke();
        ctx.setLineDash([]);

        // 文字"在此投下水果"
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = Math.max(12, 14 * scaleFactor) + 'px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('在此投下水果 👆', x + w / 2, y + zoneH / 2);
    }

    /**
     * 绘制警戒线
     */
    function drawWarningLine() {
        var y = toScreen(0, CONFIG.CONTAINER.WARNING_LINE_Y).y;

        ctx.strokeStyle = CONFIG.COLORS.WARNING_LINE;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(offsetX, y);
        ctx.lineTo(offsetX + containerWidth * scaleFactor, y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * 绘制引导虚线
     */
    function drawGuideLine(logicX) {
        var sx = toScreen(logicX, 0).x;
        var startY = offsetY;
        var endY = offsetY + containerHeight * scaleFactor;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(sx, startY);
        ctx.lineTo(sx, endY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * 绘制单个水果（带渐变光泽）
     */
    function drawFruit(body) {
        if (body.isPendingRemove) return;

        var level = body.fruitLevel;
        if (level === undefined) return;

        var data = FRUITS[level];
        var pos = toScreen(body.position.x, body.position.y);
        var radius = toScreenSize(data.radius);

        // 合并动画缩放
        var animScale = 1;
        if (body.mergeAnimation) {
            var elapsed = performance.now() - body.mergeAnimation.startTime;
            var duration = body.mergeAnimation.duration;
            if (elapsed < duration) {
                var t = elapsed / duration;
                animScale = 1 + (body.mergeAnimation.scale - 1) * (1 - t) * (1 - t);
            } else {
                body.mergeAnimation = null;
            }
        }

        var r = radius * animScale;
        if (r < 1) return;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // 阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.arc(2, 2, r, 0, Math.PI * 2);
        ctx.fill();

        // 水果主体（径向渐变）
        var gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, 0, 0, r);
        gradient.addColorStop(0, data.colorLight);
        gradient.addColorStop(0.7, data.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.25, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        if (r > 8) {
            ctx.fillStyle = '#fff';
            ctx.font = Math.round(r * 0.85) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(data.emoji, 0, 1);
        }

        ctx.restore();
    }

    /**
     * 绘制下一个水果预览
     */
    function drawPreview(level) {
        if (!previewCtx) return;
        var data = FRUITS[level];
        var size = previewCanvas.width;
        var cx = size / 2;
        var cy = size / 2;
        var radius = Math.min(data.radius, size / 2 - 4);

        previewCtx.clearRect(0, 0, size, size);

        var gradient = previewCtx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.05, cx, cy, radius);
        gradient.addColorStop(0, data.colorLight);
        gradient.addColorStop(0.7, data.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0.3)');

        previewCtx.fillStyle = gradient;
        previewCtx.beginPath();
        previewCtx.arc(cx, cy, radius, 0, Math.PI * 2);
        previewCtx.fill();

        previewCtx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        previewCtx.beginPath();
        previewCtx.arc(cx - radius * 0.25, cy - radius * 0.25, radius * 0.18, 0, Math.PI * 2);
        previewCtx.fill();

        previewCtx.fillStyle = '#fff';
        previewCtx.font = Math.round(radius * 1.1) + 'px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
        previewCtx.textAlign = 'center';
        previewCtx.textBaseline = 'middle';
        previewCtx.fillText(data.emoji, cx, cy + 1);
    }

    return {
        init: init, resize: resize, draw: draw,
        drawPreview: drawPreview, drawFruit: drawFruit,
        toScreen: toScreen, toScreenSize: toScreenSize,
        getScale: getScale, getOffsetX: getOffsetX, getOffsetY: getOffsetY,
    };
})();
