<template>
  <div class="shell">
    <div class="frame">
      <header class="topbar" v-if="state.phase === 'playing' || state.phase === 'paused'">
        <div class="stat">
          <span class="label">SCORE</span>
          <strong>{{ state.score }}</strong>
        </div>
        <div class="stat center">
          <span class="label">LV {{ state.level }}</span>
          <strong class="power" v-if="state.power !== 'normal'">{{ powerLabel }}</strong>
        </div>
        <div class="stat right">
          <span class="label">LIFE</span>
          <strong class="hearts">{{ '♥'.repeat(state.lives) }}</strong>
        </div>
      </header>

      <GameCanvas
        ref="canvasRef"
        @state="onState"
      />

      <div class="overlay" v-if="state.phase === 'idle'">
        <p class="brand">SKY RAID</p>
        <h1>飞机大战</h1>
        <p class="sub">Vue 3 · 经典竖版射击</p>
        <button class="cta" @click="start">开始游戏</button>
        <p class="hint">方向键 / WASD 移动 · 自动射击 · 鼠标/触控拖拽</p>
        <p class="hi" v-if="state.highScore">最高分 {{ state.highScore }}</p>
      </div>

      <div class="overlay dim" v-else-if="state.phase === 'paused'">
        <h2>已暂停</h2>
        <button class="cta" @click="togglePause">继续</button>
        <button class="ghost" @click="toMenu">返回标题</button>
      </div>

      <div class="overlay dim" v-else-if="state.phase === 'over'">
        <h2>任务失败</h2>
        <p class="sub">得分 {{ state.score }}</p>
        <p class="hi" v-if="state.score >= state.highScore && state.score > 0">新纪录！</p>
        <button class="cta" @click="start">再来一局</button>
        <button class="ghost" @click="toMenu">返回标题</button>
      </div>

      <button
        v-if="state.phase === 'playing'"
        class="pause-btn"
        @click="togglePause"
        aria-label="暂停"
      >
        ❚❚
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import GameCanvas from './components/GameCanvas.vue'

const canvasRef = ref(null)
const state = ref({
  phase: 'idle',
  score: 0,
  lives: 3,
  level: 1,
  highScore: Number(localStorage.getItem('plane-war-high') || 0),
  power: 'normal',
})

const powerLabel = computed(() => {
  if (state.value.power === 'double') return '双发'
  if (state.value.power === 'spread') return '散射'
  return ''
})

function onState(s) {
  state.value = { ...s }
}

function start() {
  canvasRef.value?.start()
}

function togglePause() {
  canvasRef.value?.pause()
}

function toMenu() {
  canvasRef.value?.toMenu()
}
</script>

<style scoped>
.shell {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26, 95, 122, 0.45), transparent 55%),
    radial-gradient(ellipse 70% 50% at 80% 100%, rgba(255, 107, 53, 0.12), transparent 50%),
    #050a12;
  padding: 12px;
}

.frame {
  position: relative;
  width: min(100%, 420px);
  height: min(100%, 720px);
  aspect-ratio: 420 / 720;
  max-height: 100%;
  border-radius: 18px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(200, 230, 255, 0.12),
    0 24px 60px rgba(0, 0, 0, 0.55);
}

.topbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 14px 16px 10px;
  background: linear-gradient(to bottom, rgba(5, 10, 18, 0.75), transparent);
  font-family: 'Orbitron', sans-serif;
  pointer-events: none;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat.center {
  align-items: center;
}

.stat.right {
  align-items: flex-end;
}

.label {
  font-size: 10px;
  letter-spacing: 0.12em;
  opacity: 0.65;
}

.stat strong {
  font-size: 18px;
  font-weight: 700;
}

.power {
  color: #ffd166;
  font-size: 13px !important;
}

.hearts {
  color: #ff3b5c;
  letter-spacing: 2px;
}

.overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(7, 16, 24, 0.35), rgba(7, 16, 24, 0.72)),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  animation: fadeIn 0.35s ease;
}

.overlay.dim {
  background: rgba(5, 10, 18, 0.72);
  backdrop-filter: blur(4px);
}

.brand {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(42px, 12vw, 56px);
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1;
  background: linear-gradient(120deg, #e8f4ff 10%, #4cc9f0 45%, #ff6b35 90%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 0 40px rgba(76, 201, 240, 0.25);
  animation: brandPulse 3.2s ease-in-out infinite;
}

h1 {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.35em;
  text-indent: 0.35em;
}

h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 28px;
  margin-bottom: 8px;
}

.sub {
  margin-top: 10px;
  opacity: 0.72;
  font-size: 14px;
}

.cta {
  margin-top: 28px;
  padding: 14px 36px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff9f1c);
  color: #1a0f08;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.08em;
  box-shadow: 0 10px 28px rgba(255, 107, 53, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(255, 107, 53, 0.45);
}

.cta:active {
  transform: translateY(0);
}

.ghost {
  margin-top: 12px;
  padding: 10px 20px;
  background: transparent;
  color: #cfe8ff;
  opacity: 0.8;
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.hint {
  margin-top: 22px;
  font-size: 12px;
  opacity: 0.55;
  max-width: 260px;
  line-height: 1.6;
}

.hi {
  margin-top: 14px;
  font-family: 'Orbitron', sans-serif;
  color: #ffd166;
  font-size: 13px;
}

.pause-btn {
  position: absolute;
  top: 52px;
  right: 12px;
  z-index: 5;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(8, 18, 28, 0.65);
  color: #e8f4ff;
  border: 1px solid rgba(200, 230, 255, 0.2);
  font-size: 12px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes brandPulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12);
  }
}
</style>
