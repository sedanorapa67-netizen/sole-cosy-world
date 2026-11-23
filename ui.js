import { BLOCK_TYPES } from './blocks.js';

export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.selectedIndex = 0;
    this.mode = 'creative';
    this.inventory = {};

    BLOCK_TYPES.forEach((b, idx) => {
      this.inventory[b.id] = idx < 4 ? 12 : 4;
    });

    this.bindElements();
    this.renderHotbar();
    this.setupTouchJoystick();
  }

  bindElements() {
    this.startScreen = document.getElementById('start-screen');
    this.hud = document.getElementById('hud');
    this.hotbarEl = document.getElementById('hotbar');
    this.hudModeEl = document.getElementById('hud-mode');
    this.survivalBarsEl = document.getElementById('survival-bars');
    this.healthFillEl = document.getElementById('health-fill');
    this.staminaFillEl = document.getElementById('stamina-fill');
    this.targetLabelEl = document.getElementById('target-label');
    this.settingsModal = document.getElementById('settings-modal');
    this.touchControls = document.getElementById('touch-controls');

    document.getElementById('btn-start-creative').onclick = () => this.startGame('creative');
    document.getElementById('btn-start-survival').onclick = () => this.startGame('survival');

    document.getElementById('btn-settings').onclick = () => {
      this.settingsModal.classList.remove('hidden');
      this.callbacks.onPauseChange(true);
    };

    document.getElementById('btn-close-settings').onclick = () => {
      this.settingsModal.classList.add('hidden');
      this.callbacks.onPauseChange(false);
    };

    document.getElementById('btn-fly').onclick = () => this.callbacks.onToggleFly();

    document.getElementById('opt-render-distance').onchange = (e) => {
      this.callbacks.onRenderDistanceChange(parseInt(e.target.value, 10));
    };

    document.getElementById('opt-quality').onchange = (e) => {
      this.callbacks.onQualityChange(e.target.value);
    };

    document.getElementById('opt-sensitivity').oninput = (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('sens-val').textContent = val.toFixed(1);
      this.callbacks.onSensitivityChange(val);
    };

    document.getElementById('opt-touch').onchange = (e) => {
      this.touchControls.classList.toggle('hidden', !e.target.checked);
    };

    document.getElementById('opt-audio').onchange = (e) => {
      this.callbacks.onAudioToggle(e.target.checked);
    };

    document.getElementById('btn-switch-mode').onclick = () => {
      const next = this.mode === 'creative' ? 'survival' : 'creative';
      this.setMode(next);
      this.settingsModal.classList.add('hidden');
      this.callbacks.onPauseChange(false);
    };

    document.getElementById('btn-new-world').onclick = () => {
      this.callbacks.onNewWorld();
      this.settingsModal.classList.add('hidden');
      this.callbacks.onPauseChange(false);
    };

    document.getElementById('btn-touch-jump').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.callbacks.onJump();
    });
    document.getElementById('btn-touch-place').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.callbacks.onPlace();
    });
    document.getElementById('btn-touch-break').addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.callbacks.onBreak();
    });
  }

  startGame(mode) {
    this.startScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.setMode(mode);
    this.callbacks.onGameStart(mode);
  }

  setMode(mode) {
    this.mode = mode;
    const isCreative = mode === 'creative';
    this.hudModeEl.textContent = isCreative ? '🌈 Creativa' : '🌿 Sopravvivenza';
    this.survivalBarsEl.classList.toggle('hidden', isCreative);
    document.getElementById('btn-fly').classList.toggle('hidden', !isCreative);
    this.renderHotbar();
    this.callbacks.onModeChange(mode);
  }

  updateSurvivalStats(health, stamina) {
    this.healthFillEl.style.width = `${Math.max(0, Math.min(100, health))}%`;
    this.staminaFillEl.style.width = `${Math.max(0, Math.min(100, stamina))}%`;
  }

  getSelectedBlock() {
    return BLOCK_TYPES[this.selectedIndex];
  }

  canPlaceSelected() {
    if (this.mode === 'creative') return true;
    const id = this.getSelectedBlock().id;
    return (this.inventory[id] || 0) > 0;
  }

  consumeSelected() {
    if (this.mode === 'creative') return;
    const id = this.getSelectedBlock().id;
    if (this.inventory[id] > 0) {
      this.inventory[id]--;
      this.renderHotbar();
    }
  }

  addItem(typeId, amount = 1) {
    if (this.mode === 'creative') return;
    this.inventory[typeId] = (this.inventory[typeId] || 0) + amount;
    this.renderHotbar();
  }

  renderHotbar() {
    this.hotbarEl.innerHTML = '';
    BLOCK_TYPES.forEach((item, index) => {
      const slot = document.createElement('div');
      slot.className = `slot ${index === this.selectedIndex ? 'active' : ''}`;
      const countText = this.mode === 'creative' ? '∞' : this.inventory[item.id] || 0;

      slot.innerHTML = `
        <span class="slot-count">${countText}</span>
        <span class="slot-icon">${item.icon}</span>
        <span class="slot-name">${item.name.split(' ')[0]}</span>
      `;
      slot.onclick = () => {
        this.selectedIndex = index;
        this.renderHotbar();
      };
      this.hotbarEl.appendChild(slot);
    });
  }

  setTargetLabel(text) {
    if (!text) {
      this.targetLabelEl.classList.add('hidden');
    } else {
      this.targetLabelEl.textContent = text;
      this.targetLabelEl.classList.remove('hidden');
    }
  }

  setupTouchJoystick() {
    const zone = document.getElementById('joystick-zone');
    const stick = document.getElementById('joystick-stick');
    let activeId = null;
    const maxDist = 42;

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      activeId = touch.identifier;
    });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === activeId) {
          const rect = zone.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = touch.clientX - cx;
          let dy = touch.clientY - cy;
          const dist = Math.hypot(dx, dy);

          if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
          }

          stick.style.transform = `translate(${dx}px, ${dy}px)`;
          this.callbacks.onJoystickMove(dx / maxDist, dy / maxDist);
        }
      }
    });

    const resetStick = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === activeId) {
          activeId = null;
          stick.style.transform = 'translate(0px, 0px)';
          this.callbacks.onJoystickMove(0, 0);
        }
      }
    };

    zone.addEventListener('touchend', resetStick);
    zone.addEventListener('touchcancel', resetStick);

    const camZone = document.getElementById('camera-touch-zone');
    let camTouchId = null;
    let lastX = 0;
    let lastY = 0;

    camZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      camTouchId = t.identifier;
      lastX = t.clientX;
      lastY = t.clientY;
    });

    camZone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === camTouchId) {
          const dx = t.clientX - lastX;
          const dy = t.clientY - lastY;
          lastX = t.clientX;
          lastY = t.clientY;
          this.callbacks.onCameraLook(dx * 0.006, dy * 0.005);
        }
      }
    });

    camZone.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === camTouchId) camTouchId = null;
      }
    });
  }
}
