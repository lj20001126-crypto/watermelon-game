/* ========================================
   游戏配置文件
   所有常量、水果定义集中管理
   ======================================== */

const CONFIG = {
    // --- 容器参数（逻辑像素，会按屏幕缩放） ---
    CONTAINER: {
        WIDTH: 390,          // 容器内宽
        HEIGHT: 650,         // 容器内高
        WALL_THICKNESS: 20,  // 墙体厚度
        WARNING_LINE_Y: 80,  // 警戒线（距顶部）
        BORDER_RADIUS: 10,   // 容器底部圆角
    },

    // --- 物理参数 ---
    PHYSICS: {
        GRAVITY_Y: 1.5,        // 重力加速度（Matter.js 默认 1，稍大一点）
        FRUIT_RESTITUTION: 0.3, // 弹性（0=完全非弹性, 1=完全弹性）
        FRUIT_FRICTION: 0.5,    // 摩擦力
        FRUIT_FRICTION_AIR: 0.01, // 空气阻力
        FRUIT_DENSITY: 0.002,   // 密度
        WALL_RESTITUTION: 0.2,
        WALL_FRICTION: 0.6,
        MAX_FRUIT_COUNT: 130,   // 场上最多水果数（超过则游戏结束也算）
        MERGE_COOLDOWN: 300,    // 两次掉落冷却时间（毫秒）
    },

    // --- 游戏规则 ---
    RULES: {
        // 生成的水果等级范围：[最小, 最大]，每次随机取一个等级
        SPAWN_MIN_LEVEL: 0,     // 樱桃
        SPAWN_MAX_LEVEL: 4,     // 苹果（不会一上来就掉大水果）
        // 下落延迟：松开手指后到真正掉落的帧数
        DROP_DELAY_FRAMES: 2,
        // 胜利条件：最后一个水果掉落后等待几秒判断胜利
        WIN_SETTLE_TIME: 2000,
    },

    /**
     * 根据关卡号获取关卡配置（1-based）
     * @param {number} level 关卡号
     * @returns {{ initialFruits: number, initialMin: number, initialMax: number, drops: number, spawnMin: number, spawnMax: number }}
     */
    getLevelConfig: function (level) {
        var baseLevels;
        switch (level) {
            case 1:  baseLevels = [2, 3, 5, 6]; break;                // 葡萄 橘子 苹果 桃子
            case 2:  baseLevels = [2, 3, 5, 6, 7]; break;             // +菠萝
            case 3:  baseLevels = [2, 4, 5, 6, 7]; break;             // 引入梨(去掉橘子)
            case 4:  baseLevels = [3, 4, 5, 6, 7, 8]; break;          // +蜜瓜
            default: baseLevels = [3, 4, 5, 6, 7, 8, 9]; break;       // 5关+ 全高级
        }

        return {
            // 预置水果数量：第1关24个，每关+3，上限36（温和增长）
            initialFruits: Math.min(24 + (level - 1) * 3, 36),
            // 预置水果等级池
            initialLevels: baseLevels,
            // 玩家可投放次数
            drops: Math.max(8, 15 - Math.floor((level - 1) / 2)),
            // 投放水果等级
            spawnMin: 1,
            spawnMax: Math.min(3 + Math.floor((level - 1) / 3), 5),
        };
    },

    // --- 颜色主题 ---
    COLORS: {
        BACKGROUND: '#1a1a2e',
        CONTAINER_FILL: '#16213e',
        CONTAINER_STROKE: '#0f3460',
        WARNING_LINE: 'rgba(255, 69, 0, 0.5)',
        TEXT: '#ffffff',
        TEXT_DIM: 'rgba(255, 255, 255, 0.5)',
        SCORE: '#FFD700',
    },
};

// --- 水果链定义 ---
// 每个水果有 11 个等级，从小到大
const FRUITS = [
    { name: '樱桃', emoji: '🍒', radius: 12, color: '#DC143C', colorLight: '#FF6B6B', score: 1 },
    { name: '草莓', emoji: '🍓', radius: 17, color: '#FF4757', colorLight: '#FF6B81', score: 3 },
    { name: '葡萄', emoji: '🍇', radius: 22, color: '#8B4513', colorLight: '#A0522D', score: 6 },
    { name: '橘子', emoji: '🍊', radius: 28, color: '#FF7F00', colorLight: '#FFA940', score: 10 },
    { name: '苹果', emoji: '🍎', radius: 35, color: '#FF0000', colorLight: '#FF4040', score: 15 },
    { name: '梨',    emoji: '🍐', radius: 42, color: '#9ACD32', colorLight: '#B5E550', score: 21 },
    { name: '桃子', emoji: '🍑', radius: 50, color: '#FFB6C1', colorLight: '#FFD0D8', score: 28 },
    { name: '菠萝', emoji: '🍍', radius: 58, color: '#FFD700', colorLight: '#FFE44D', score: 36 },
    { name: '蜜瓜', emoji: '🍈', radius: 67, color: '#90EE90', colorLight: '#B8F5B8', score: 45 },
    { name: '西瓜', emoji: '🍉', radius: 77, color: '#2E8B57', colorLight: '#3CB371', score: 55 },
    { name: '大西瓜', emoji: '🎉', radius: 88, color: '#006400', colorLight: '#228B22', score: 66 },
];

// 最高等级
const MAX_LEVEL = FRUITS.length - 1;
