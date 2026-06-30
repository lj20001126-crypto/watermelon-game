/* ========================================
   特效模块
   粒子爆炸、得分飘字、屏幕震动
   ======================================== */

const Effects = (function () {
    // 粒子列表
    var particles = [];
    // 得分飘字列表
    var scorePopups = [];
    // 屏幕震动
    var shakeAmount = 0;
    var shakeDuration = 0;
    var shakeStartTime = 0;

    /**
     * 在指定位置生成爆炸粒子
     * @param {number} x      逻辑 X
     * @param {number} y      逻辑 Y
     * @param {string} color  粒子颜色
     * @param {number} count  粒子数量
     * @param {number} level  水果等级（越大粒子越多）
     */
    function spawnParticles(x, y, color, count, level) {
        var actualCount = Math.min(count + level * 3, 40);
        for (var i = 0; i < actualCount; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = 1.5 + Math.random() * 4 + level * 0.5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // 稍微向上
                radius: 2 + Math.random() * 4,
                color: color,
                life: 0.4 + Math.random() * 0.6,   // 生命周期（秒）
                age: 0,
                gravity: 3 + Math.random() * 2,
            });
        }
    }

    /**
     * 生成得分飘字
     */
    function spawnScorePopup(x, y, score) {
        scorePopups.push({
            x: x,
            y: y,
            score: score,
            life: 1.0,
            age: 0,
        });
    }

    /**
     * 触发屏幕震动
     * @param {number} amount 震动强度（像素）
     */
    function triggerShake(amount) {
        if (amount > shakeAmount) {
            shakeAmount = amount;
            shakeDuration = 0.2 + amount * 0.02;
            shakeStartTime = performance.now();
        }
    }

    /**
     * 更新所有特效
     * @param {number} dt 时间步长（秒）
     */
    function update(dt) {
        // 更新粒子
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                particles.splice(i, 1);
                continue;
            }
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.vx *= 0.98; // 空气阻力
            p.radius *= 0.995;
        }

        // 更新得分飘字
        for (var j = scorePopups.length - 1; j >= 0; j--) {
            var sp = scorePopups[j];
            sp.age += dt;
            if (sp.age >= sp.life) {
                scorePopups.splice(j, 1);
                continue;
            }
            sp.y -= 40 * dt; // 向上飘
        }

        // 更新震动
        if (shakeAmount > 0) {
            var elapsed = (performance.now() - shakeStartTime) / 1000;
            if (elapsed >= shakeDuration) {
                shakeAmount = 0;
            } else {
                // 衰减
                shakeAmount *= 0.9;
            }
        }
    }

    /** 获取当前屏幕震动偏移 */
    function getShakeOffset() {
        if (shakeAmount <= 0.1) return { x: 0, y: 0 };
        return {
            x: (Math.random() - 0.5) * shakeAmount * 2,
            y: (Math.random() - 0.5) * shakeAmount * 2,
        };
    }

    function getParticles() { return particles; }
    function getScorePopups() { return scorePopups; }

    return {
        spawnParticles: spawnParticles,
        spawnScorePopup: spawnScorePopup,
        triggerShake: triggerShake,
        update: update,
        getShakeOffset: getShakeOffset,
        getParticles: getParticles,
        getScorePopups: getScorePopups,
    };
})();
