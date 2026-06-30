/* ========================================
   音效模块
   使用 Web Audio API 合成音效，无需外部文件
   ======================================== */

const AudioFX = (function () {
    var ctx = null;
    var enabled = true;
    var masterGain = null;

    function init() {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            ctx = new AudioContext();
            masterGain = ctx.createGain();
            masterGain.gain.value = 0.3; // 主音量
            masterGain.connect(ctx.destination);
            console.log('🔊 音效系统初始化完成');
        } catch (e) {
            console.warn('⚠️ 音效系统不可用:', e.message);
            enabled = false;
        }
    }

    /** 确保 AudioContext 被唤醒（浏览器策略要求用户交互后启动） */
    function resume() {
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
    }

    /**
     * 播放掉落音效（短促的"咻"声）
     */
    function playDrop() {
        if (!enabled || !ctx) return;
        resume();

        var osc = ctx.createOscillator();
        var gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }

    /**
     * 播放合并音效（根据等级不同，音高递增的"叮"声）
     * @param {number} level 合并后的水果等级
     */
    function playMerge(level) {
        if (!enabled || !ctx) return;
        resume();

        // 等级越高，音调越高
        var baseFreq = 400 + level * 80;

        // 双层音色：正弦波 + 三角波
        for (var i = 0; i < 2; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(baseFreq * (i === 0 ? 1 : 1.5), ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * (i === 0 ? 1.2 : 1.8), ctx.currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 2, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.35);
        }
    }

    /**
     * 播放大合并音效（合成大西瓜级别，更华丽的音效）
     */
    function playBigMerge() {
        if (!enabled || !ctx) return;
        resume();

        // 和弦音效
        var freqs = [523, 659, 784, 1047]; // C5 E5 G5 C6

        for (var i = 0; i < freqs.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = i < 2 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + i * 0.05);

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.05 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + i * 0.05);
            osc.stop(ctx.currentTime + 0.6);
        }
    }

    /**
     * 播放游戏结束音效（下行旋律）
     */
    function playGameOver() {
        if (!enabled || !ctx) return;
        resume();

        var notes = [400, 350, 300, 200];
        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(notes[i], ctx.currentTime + i * 0.2);

            gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.3);

            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.3);
        }
    }

    /** 静音/取消静音 */
    function setEnabled(val) { enabled = val; }
    function isEnabled() { return enabled; }

    return {
        init: init, resume: resume,
        playDrop: playDrop, playMerge: playMerge,
        playBigMerge: playBigMerge, playGameOver: playGameOver,
        setEnabled: setEnabled, isEnabled: isEnabled,
    };
})();
