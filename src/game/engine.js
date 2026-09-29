/** @typedef {'idle' | 'playing' | 'paused' | 'over'} GamePhase */

export const W = 420
export const H = 720

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const rand = (a, b) => a + Math.random() * (b - a)
const hit = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function createGame(onChange) {
  /** @type {GamePhase} */
  let phase = 'idle'
  let score = 0
  let lives = 3
  let level = 1
  let highScore = Number(localStorage.getItem('plane-war-high') || 0)

  const player = {
    x: W / 2 - 22,
    y: H - 110,
    w: 44,
    h: 52,
    speed: 320,
    fireCd: 0,
    invuln: 0,
    flash: 0,
  }

  /** @type {Array<{x:number,y:number,w:number,h:number,vy:number,dmg:number}>} */
  let bullets = []
  /** @type {Array<{x:number,y:number,w:number,h:number,vy:number,hp:number,score:number,kind:number,swing:number,t:number}>} */
  let enemies = []
  /** @type {Array<{x:number,y:number,vx:number,vy:number,life:number,color:string,size:number}>} */
  let particles = []
  /** @type {Array<{x:number,y:number,vy:number,kind:string}>} */
  let powerups = []

  let spawnTimer = 0
  let stars = Array.from({ length: 60 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    s: rand(0.4, 2.2),
    v: rand(20, 90),
  }))

  const keys = new Set()
  let pointerX = null
  let pointerActive = false
  let last = 0
  let raf = 0
  let power = 'normal' // normal | double | spread
  let powerTimer = 0

  const emit = () =>
    onChange?.({
      phase,
      score,
      lives,
      level,
      highScore,
      power,
    })

  function resetRun() {
    score = 0
    lives = 3
    level = 1
    bullets = []
    enemies = []
    particles = []
    powerups = []
    spawnTimer = 0.6
    power = 'normal'
    powerTimer = 0
    player.x = W / 2 - player.w / 2
    player.y = H - 110
    player.fireCd = 0
    player.invuln = 1.2
    player.flash = 0
  }

  function boom(x, y, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const sp = rand(40, 220)
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.35, 0.9),
        color,
        size: rand(2, 5),
      })
    }
  }

  function spawnEnemy() {
    const roll = Math.random()
    let kind = 0
    if (level >= 3 && roll > 0.82) kind = 2
    else if (level >= 2 && roll > 0.55) kind = 1

    const sizes = [
      { w: 36, h: 36, hp: 1, score: 10, vy: rand(90, 140) },
      { w: 48, h: 44, hp: 3, score: 30, vy: rand(70, 110) },
      { w: 64, h: 54, hp: 8, score: 80, vy: rand(50, 80) },
    ]
    const s = sizes[kind]
    enemies.push({
      x: rand(8, W - s.w - 8),
      y: -s.h - 10,
      w: s.w,
      h: s.h,
      vy: s.vy + level * 8,
      hp: s.hp + Math.floor((level - 1) / 2),
      score: s.score,
      kind,
      swing: rand(-1, 1) * (40 + level * 5),
      t: Math.random() * Math.PI * 2,
    })
  }

  function fire() {
    const cx = player.x + player.w / 2
    const y = player.y - 4
    if (power === 'double') {
      bullets.push({ x: cx - 14, y, w: 4, h: 14, vy: -520, dmg: 1 })
      bullets.push({ x: cx + 10, y, w: 4, h: 14, vy: -520, dmg: 1 })
    } else if (power === 'spread') {
      bullets.push({ x: cx - 2, y, w: 4, h: 14, vy: -540, dmg: 1 })
      bullets.push({ x: cx - 16, y: y + 4, w: 4, h: 12, vy: -480, dmg: 1 })
      bullets.push({ x: cx + 12, y: y + 4, w: 4, h: 12, vy: -480, dmg: 1 })
    } else {
      bullets.push({ x: cx - 2, y, w: 4, h: 14, vy: -540, dmg: 1 })
    }
  }

  function hurtPlayer() {
    if (player.invuln > 0) return
    lives -= 1
    player.invuln = 1.6
    player.flash = 0.4
    boom(player.x + player.w / 2, player.y + player.h / 2, '#ff6b35', 20)
    power = 'normal'
    powerTimer = 0
    if (lives <= 0) {
      phase = 'over'
      if (score > highScore) {
        highScore = score
        localStorage.setItem('plane-war-high', String(highScore))
      }
    }
    emit()
  }

  function update(dt) {
    if (phase !== 'playing') return

    level = 1 + Math.floor(score / 400)
    if (powerTimer > 0) {
      powerTimer -= dt
      if (powerTimer <= 0) power = 'normal'
    }

    // stars
    for (const st of stars) {
      st.y += st.v * dt
      if (st.y > H) {
        st.y = 0
        st.x = Math.random() * W
      }
    }

    // player move
    let dx = 0
    let dy = 0
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) dx -= 1
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1
    if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) dy -= 1
    if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) dy += 1
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1
      player.x += (dx / len) * player.speed * dt
      player.y += (dy / len) * player.speed * dt
    }
    if (pointerActive && pointerX != null) {
      const target = pointerX - player.w / 2
      player.x += (target - player.x) * Math.min(1, 12 * dt)
    }
    player.x = clamp(player.x, 4, W - player.w - 4)
    player.y = clamp(player.y, 40, H - player.h - 8)

    if (player.invuln > 0) player.invuln -= dt
    if (player.flash > 0) player.flash -= dt

    player.fireCd -= dt
    if (player.fireCd <= 0) {
      fire()
      player.fireCd = power === 'spread' ? 0.14 : 0.18
    }

    // spawn
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawnEnemy()
      const base = Math.max(0.28, 1.05 - level * 0.08)
      spawnTimer = rand(base * 0.7, base * 1.2)
    }

    // bullets
    bullets = bullets.filter((b) => {
      b.y += b.vy * dt
      return b.y + b.h > -20
    })

    // enemies
    for (const e of enemies) {
      e.t += dt
      e.y += e.vy * dt
      e.x += Math.sin(e.t * 2) * e.swing * dt
      e.x = clamp(e.x, 0, W - e.w)
    }
    enemies = enemies.filter((e) => e.y < H + 40)

    // collisions bullet-enemy
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j]
        if (hit(b, e)) {
          bullets.splice(j, 1)
          e.hp -= b.dmg
          boom(b.x, b.y, '#ffe66d', 4)
          if (e.hp <= 0) {
            score += e.score
            boom(e.x + e.w / 2, e.y + e.h / 2, e.kind === 2 ? '#ff3b5c' : '#3ddc97', 12 + e.kind * 6)
            if (Math.random() < 0.12 + e.kind * 0.08) {
              const kinds = ['life', 'double', 'spread']
              powerups.push({
                x: e.x + e.w / 2 - 10,
                y: e.y + e.h / 2,
                vy: 80,
                kind: kinds[Math.floor(Math.random() * kinds.length)],
              })
            }
            enemies.splice(i, 1)
            emit()
            break
          }
        }
      }
    }

    // enemy-player
    if (player.invuln <= 0) {
      for (const e of enemies) {
        if (hit(player, { x: e.x + 4, y: e.y + 4, w: e.w - 8, h: e.h - 8 })) {
          hurtPlayer()
          e.hp = 0
          boom(e.x + e.w / 2, e.y + e.h / 2, '#ff3b5c', 16)
          enemies = enemies.filter((x) => x !== e)
          break
        }
      }
    }

    // powerups
    powerups = powerups.filter((p) => {
      p.y += p.vy * dt
      if (hit(player, { x: p.x, y: p.y, w: 20, h: 20 })) {
        if (p.kind === 'life') {
          lives = Math.min(5, lives + 1)
        } else {
          power = p.kind
          powerTimer = 8
        }
        boom(p.x + 10, p.y + 10, '#ffd166', 10)
        emit()
        return false
      }
      return p.y < H + 20
    })

    // particles
    particles = particles.filter((p) => {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.98
      p.vy *= 0.98
      return p.life > 0
    })
  }

  function drawPlane(ctx, x, y, w, h, color, enemy = false) {
    ctx.save()
    ctx.translate(x + w / 2, y + h / 2)
    if (enemy) ctx.rotate(Math.PI)
    ctx.fillStyle = color
    // body
    ctx.beginPath()
    ctx.moveTo(0, -h / 2)
    ctx.lineTo(w * 0.22, h * 0.15)
    ctx.lineTo(w * 0.12, h / 2)
    ctx.lineTo(-w * 0.12, h / 2)
    ctx.lineTo(-w * 0.22, h * 0.15)
    ctx.closePath()
    ctx.fill()
    // wings
    ctx.beginPath()
    ctx.moveTo(-w * 0.08, -h * 0.05)
    ctx.lineTo(-w * 0.55, h * 0.18)
    ctx.lineTo(-w * 0.1, h * 0.12)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w * 0.08, -h * 0.05)
    ctx.lineTo(w * 0.55, h * 0.18)
    ctx.lineTo(w * 0.1, h * 0.12)
    ctx.closePath()
    ctx.fill()
    // cockpit
    ctx.fillStyle = enemy ? '#ffd6a5' : '#7fdbff'
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.12, w * 0.1, h * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function draw(ctx) {
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#071018')
    g.addColorStop(0.45, '#0d2a40')
    g.addColorStop(1, '#134e5e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)

    // vignette-ish stars
    for (const st of stars) {
      ctx.globalAlpha = 0.35 + st.s * 0.25
      ctx.fillStyle = '#cfe8ff'
      ctx.fillRect(st.x, st.y, st.s, st.s)
    }
    ctx.globalAlpha = 1

    // ground haze
    const haze = ctx.createLinearGradient(0, H - 120, 0, H)
    haze.addColorStop(0, 'rgba(19,78,94,0)')
    haze.addColorStop(1, 'rgba(255,107,53,0.12)')
    ctx.fillStyle = haze
    ctx.fillRect(0, H - 120, W, 120)

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // powerups
    for (const p of powerups) {
      const colors = { life: '#3ddc97', double: '#ffd166', spread: '#7fdbff' }
      ctx.fillStyle = colors[p.kind] || '#fff'
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(p.x, p.y, 20, 20, 5)
      } else {
        ctx.rect(p.x, p.y, 20, 20)
      }
      ctx.fill()
      ctx.fillStyle = '#0a1628'
      ctx.font = 'bold 11px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.kind === 'life' ? '+' : p.kind === 'double' ? 'II' : '≪', p.x + 10, p.y + 14)
    }

    // enemies
    for (const e of enemies) {
      const colors = ['#e85d4c', '#c44536', '#8b1e3f']
      drawPlane(ctx, e.x, e.y, e.w, e.h, colors[e.kind] || colors[0], true)
      if (e.kind > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)'
        ctx.fillRect(e.x, e.y - 6, e.w, 3)
        ctx.fillStyle = '#ffd166'
        const maxHp = e.kind === 1 ? 3 : 8
        ctx.fillRect(e.x, e.y - 6, e.w * clamp(e.hp / (maxHp + Math.floor((level - 1) / 2)), 0, 1), 3)
      }
    }

    // bullets
    for (const b of bullets) {
      const bg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
      bg.addColorStop(0, '#fff6a5')
      bg.addColorStop(1, '#ff6b35')
      ctx.fillStyle = bg
      ctx.shadowColor = '#ff9f1c'
      ctx.shadowBlur = 8
      ctx.fillRect(b.x, b.y, b.w, b.h)
      ctx.shadowBlur = 0
    }

    // player
    if (phase !== 'idle') {
      const blink = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0
      if (!blink) {
        drawPlane(ctx, player.x, player.y, player.w, player.h, '#4cc9f0')
        // engine flame
        ctx.fillStyle = `rgba(255, 159, 28, ${0.5 + Math.random() * 0.5})`
        ctx.beginPath()
        ctx.moveTo(player.x + player.w * 0.35, player.y + player.h - 2)
        ctx.lineTo(player.x + player.w * 0.5, player.y + player.h + 10 + Math.random() * 8)
        ctx.lineTo(player.x + player.w * 0.65, player.y + player.h - 2)
        ctx.fill()
      }
    }
  }

  function loop(ts) {
    if (!last) last = ts
    const dt = Math.min(0.033, (ts - last) / 1000)
    last = ts
    update(dt)
    emit()
    raf = requestAnimationFrame(loop)
  }

  return {
    W,
    H,
    getState: () => ({ phase, score, lives, level, highScore, power }),
    start() {
      resetRun()
      phase = 'playing'
      emit()
    },
    pause() {
      if (phase === 'playing') {
        phase = 'paused'
        emit()
      } else if (phase === 'paused') {
        phase = 'playing'
        emit()
      }
    },
    toMenu() {
      phase = 'idle'
      emit()
    },
    setKey(code, down) {
      if (down) keys.add(code)
      else keys.delete(code)
    },
    setPointer(x, active) {
      pointerX = x
      pointerActive = active
    },
    draw,
    startLoop() {
      cancelAnimationFrame(raf)
      last = 0
      raf = requestAnimationFrame(loop)
    },
    stopLoop() {
      cancelAnimationFrame(raf)
    },
  }
}
