// 효과음 / 배경음 (전부 직접 합성한 소리 — pae/tools/audio.mjs). 배경음은 처음 틀 때 받아 옴 (첫 로딩을 가볍게)
import { load, save } from './save.js?v=0.92.7';

export const SFX = ['sfx_pick', 'sfx_unpick', 'sfx_click', 'sfx_deal', 'sfx_flip', 'sfx_play', ...Array.from({ length: 8 }, (_, i) => 'sfx_chip_' + i),
  'sfx_mult', 'sfx_xmult', 'sfx_total', 'sfx_big', 'sfx_clear', 'sfx_boss', 'sfx_bosswin', 'sfx_fail', 'sfx_wind', 'sfx_coin', 'sfx_buy', 'sfx_charm', 'sfx_err', 'sfx_season', 'sfx_open', 'sfx_petal'];
export const BGM = ['bgm_main', 'bgm_boss', 'bgm_shop'];

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.last = {}; this.urlFor = k => `assets/audio/${k}.m4a`; }
  attach(game) { this.game = game; }
  play(key, opts = {}) {
    if (!this.game || !load().sfx) return;
    const now = performance.now(), gap = opts.gap ?? 40;
    if (this.last[key] && now - this.last[key] < gap) return;
    this.last[key] = now;
    try { if (this.game.cache.audio.exists(key)) this.game.sound.play(key, { volume: opts.volume ?? 0.7, rate: opts.rate ?? 1, detune: opts.detune ?? 0 }); } catch { /* 디코딩 실패 무시 */ }
  }
  // 진동: 폰에서 손맛 (설정에서 끌 수 있음)
  buzz(p) { const d = load(); if (!d.sfx || d.vib === false) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  music(key, scene = null) {
    if (!this.game) return;
    if (this.currentKey === key && this.current) return;
    this.stopMusic();
    this.currentKey = key;
    if (!load().music) return;
    if (!this.game.cache.audio.exists(key)) {
      const sc = scene || this.game.scene.getScenes(true).slice(-1)[0];
      if (!sc) return;
      sc.load.audio(key, [this.urlFor(key)]);
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start();
      return;
    }
    try { this.current = this.game.sound.add(key, { loop: true, volume: 0.42 }); this.current.play(); } catch { this.current = null; }
  }
  prefetch(scene, keys) { const need = keys.filter(k => !this.game.cache.audio.exists(k)); if (!need.length) return; for (const k of need) scene.load.audio(k, [this.urlFor(k)]); scene.load.start(); }
  stopMusic() { if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; } }
  duck(v) { if (this.current) this.current.setVolume(v); }
  // 값을 '정하는' 함수 — 소리 한 버튼은 반드시 setAll 로 (토글 두 번 = 두 값이 다르면 엇갈림)
  setSfx(on) { const d = load(); d.sfx = !!on; save(); return d.sfx; }
  setMusic(on) {
    const d = load(), was = !!d.music; d.music = !!on; save();
    if (!d.music) this.stopMusic(); else if (!was && this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
  setAll(on) { this.setSfx(on); this.setMusic(on); return !!on; }
  isOn() { const d = load(); return !!(d.sfx || d.music); }
  toggleSfx() { return this.setSfx(!load().sfx); }
  toggleMusic() { return this.setMusic(!load().music); }
}
export const audio = new AudioManager();
