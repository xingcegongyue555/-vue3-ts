<template>
  <canvas
    ref="el"
    class="board"
    :width="W"
    :height="H"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @pointerleave="onPointerUp"
  />
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createGame, W, H } from '../game/engine.js'

const emit = defineEmits(['state'])

const el = ref(null)
let game = null
let ctx = null
let drawRaf = 0

function paint() {
  if (ctx && game) game.draw(ctx)
  drawRaf = requestAnimationFrame(paint)
}

function onState(s) {
  emit('state', s)
}

function onKeyDown(e) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault()
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    game?.pause()
    return
  }
  game?.setKey(e.key, true)
}

function onKeyUp(e) {
  game?.setKey(e.key, false)
}

function canvasX(e) {
  const rect = el.value.getBoundingClientRect()
  return ((e.clientX - rect.left) / rect.width) * W
}

function onPointerDown(e) {
  el.value.setPointerCapture?.(e.pointerId)
  game?.setPointer(canvasX(e), true)
}

function onPointerMove(e) {
  if (e.buttons || e.pressure > 0) {
    game?.setPointer(canvasX(e), true)
  }
}

function onPointerUp() {
  game?.setPointer(null, false)
}

onMounted(() => {
  ctx = el.value.getContext('2d')
  game = createGame(onState)
  game.startLoop()
  paint()
  onState(game.getState())
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  game?.stopLoop()
  cancelAnimationFrame(drawRaf)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

defineExpose({
  start: () => game?.start(),
  pause: () => game?.pause(),
  toMenu: () => game?.toMenu(),
})
</script>

<style scoped>
.board {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
  background: #0a1628;
}
</style>
