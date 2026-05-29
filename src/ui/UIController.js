/**
 * UIController — binds the DOM overlay to application callbacks and exposes
 * methods to update the live stats panel and show toasts (Phase G). Keeps all
 * DOM concerns out of main.js. Pure wiring; no simulation logic here.
 */
import { PLANET_ORDER, PLANETS } from '../planet/PlanetConfig.js';
import { QUALITY_PRESETS } from '../core/Settings.js';

export class UIController {
  /**
   * @param {object} cb  Callback hooks invoked on user interaction.
   */
  constructor(cb) {
    this.cb = cb;
    this._toastTimer = null;
    this._bind();
  }

  $(id) {
    return document.getElementById(id);
  }

  _bind() {
    const cb = this.cb;

    // Planet selector.
    const planetSel = this.$('planet-select');
    for (const id of PLANET_ORDER) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = PLANETS[id].name;
      planetSel.appendChild(opt);
    }
    planetSel.addEventListener('change', () => cb.onPlanetChange?.(planetSel.value));

    // Auto-rotate + speed.
    const autoRotate = this.$('autorotate');
    autoRotate.addEventListener('change', () => cb.onAutoRotate?.(autoRotate.checked));
    const rotSpeed = this.$('rotate-speed');
    rotSpeed.addEventListener('input', () => {
      this.$('rotate-speed-val').textContent = `${parseFloat(rotSpeed.value).toFixed(1)}×`;
      cb.onRotateSpeed?.(parseFloat(rotSpeed.value));
    });

    // Projectile type segmented control.
    this.projType = 'asteroid';
    const seg = this.$('proj-type');
    seg.querySelectorAll('.seg__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('.seg__btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.projType = btn.dataset.type;
        cb.onProjectileType?.(this.projType);
      });
    });

    // Launch speed.
    const launchSpeed = this.$('launch-speed');
    launchSpeed.addEventListener('input', () => {
      this.$('launch-speed-val').textContent = parseFloat(launchSpeed.value).toFixed(1);
      cb.onLaunchSpeed?.(parseFloat(launchSpeed.value));
    });

    // Pause + reset.
    this.$('pause-btn').addEventListener('click', () => cb.onTogglePause?.());
    this.$('reset-surface').addEventListener('click', () => cb.onResetSurface?.());

    // Sim speed + gravity.
    const simSpeed = this.$('sim-speed');
    simSpeed.addEventListener('input', () => {
      this.$('sim-speed-val').textContent = `${parseFloat(simSpeed.value).toFixed(1)}×`;
      cb.onSimSpeed?.(parseFloat(simSpeed.value));
    });
    const gravity = this.$('gravity');
    gravity.addEventListener('input', () => {
      this.$('gravity-val').textContent = `${parseFloat(gravity.value).toFixed(1)}×`;
      cb.onGravity?.(parseFloat(gravity.value));
    });

    // Quality.
    const quality = this.$('quality');
    quality.addEventListener('change', () => cb.onQuality?.(quality.value));

    // Save / load / export / import.
    this.$('save-btn').addEventListener('click', () => cb.onSave?.());
    this.$('load-btn').addEventListener('click', () => cb.onLoad?.());
    this.$('export-btn').addEventListener('click', () => cb.onExport?.());
    const importFile = this.$('import-file');
    this.$('import-btn').addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) cb.onImport?.(file);
      importFile.value = '';
    });

    // Collapse controls.
    const panel = this.$('control-panel');
    this.$('toggle-controls').addEventListener('click', () => {
      panel.classList.toggle('is-collapsed');
      this.$('toggle-controls').textContent = panel.classList.contains('is-collapsed') ? '⟩' : '⟨';
    });

    // Help modal.
    const helpModal = this.$('help-modal');
    this.$('help-btn').addEventListener('click', () => (helpModal.hidden = false));
    this.$('help-close').addEventListener('click', () => (helpModal.hidden = true));
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.hidden = true;
    });

    // Keyboard shortcuts.
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        cb.onDrop?.();
      } else if (e.key === 'p' || e.key === 'P') {
        cb.onTogglePause?.();
      } else if (e.key === '?') {
        helpModal.hidden = !helpModal.hidden;
      }
    });
  }

  /** Sync initial control values from settings/state. */
  syncInitial({ planetId, quality, autoRotate, rotationSpeed }) {
    this.$('planet-select').value = planetId;
    this.$('quality').value = quality;
    this.$('autorotate').checked = autoRotate;
    this.$('rotate-speed').value = rotationSpeed;
    this.$('rotate-speed-val').textContent = `${rotationSpeed.toFixed(1)}×`;
    // Validate quality preset names exist (defensive).
    if (!QUALITY_PRESETS[this.$('quality').value]) this.$('quality').value = 'medium';
  }

  setPauseLabel(paused) {
    this.$('pause-btn').textContent = paused ? '▶ Play' : '⏸ Pause';
  }

  /** Update the live statistics + planetary facts panel. */
  updateStats({ fps, objects, impacts }) {
    if (fps != null) this.$('stat-fps').textContent = Math.round(fps);
    if (objects != null) this.$('stat-objects').textContent = objects;
    if (impacts != null) this.$('stat-impacts').textContent = impacts;
  }

  setPlanetFacts(config) {
    const f = config.facts;
    this.$('stat-planet').textContent = config.name;
    this.$('stat-radius').textContent = `${f.meanRadiusKm.toLocaleString()} km`;
    this.$('stat-gravity').textContent = `${f.surfaceGravity} m/s²`;
    this.$('stat-day').textContent = `${f.lengthOfDayHours} h`;
    this.$('stat-source').textContent = f.source;
  }

  hideLoading() {
    const el = this.$('loading');
    el.classList.add('is-hidden');
    setTimeout(() => (el.style.display = 'none'), 650);
  }

  showLoading(text = 'Generating planet…') {
    const el = this.$('loading');
    el.style.display = 'flex';
    el.classList.remove('is-hidden');
    el.querySelector('.loading__text').textContent = text;
  }

  toast(message) {
    const el = this.$('toast');
    el.textContent = message;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add('is-visible'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      setTimeout(() => (el.hidden = true), 300);
    }, 2200);
  }
}
