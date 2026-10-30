// 효과음 · 배경음 (원작 소리 m4a). 원작 소리 번호(playSound) → 파일 이름
import { load, save } from './save.js?v=0.94.1';

// 원작 번호: 0 로고 · 1~9 맞는 소리 · 10~20 기타 · 21~29 공격 목소리 · 30 칼춤 적중
const NAME = ['sfx_snlogo', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `sfx_att_${i}`), ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => `sfx_etc_${i}`), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `sfx_voice_${i}`), 'sfx_spebladehit'];
export const SFX = NAME;
export const BGM = ['bgm_1', 'bgm_2', 'bgm_3'];
export const S = { CLEAR: 10, OVER: 11, LEAK: 12, LEVELUP: 13, TAP: 14, BACK: 15, SPECIAL: 19, BLADE: 30 };

class AudioManager {
  constructor() { this.game = null; this.current = null; this.currentKey = null; this.last = {}; }
  attach(game) { this.game = game; }
  id(n, opts = {}) { this.play(NAME[n], opts); }
  play(key, opts = {}) {
    if (!this.game || !load().sfx || !key) return;
    const now = performance.now(), gap = opts.gap ?? 60;
    if (this.last[key] && now - this.last[key] < gap) return;
    this.last[key] = now;
    try { this.game.sound.play(key, { volume: opts.volume ?? 0.6, rate: opts.rate ?? 1 }); } catch { /* 디코딩 실패 무시 */ }
  }
  buzz(p) { if (!load().sfx) return; try { navigator.vibrate && navigator.vibrate(p); } catch { /* */ } }
  music(key, scene = null) {
    if (!this.game) return;
    if (this.currentKey === key && this.current) return;
    this.stopMusic(); this.currentKey = key;
    if (!load().music) return;
    if (!this.game.cache.audio.exists(key)) {
      const sc = scene || this.game.scene.getScenes(true).slice(-1)[0]; if (!sc) return;
      sc.load.audio(key, [`assets/audio/${key}.m4a`]);
      sc.load.once('complete', () => { if (this.currentKey === key && !this.current) { this.currentKey = null; this.music(key, sc); } });
      sc.load.start(); return;
    }
    try { this.current = this.game.sound.add(key, { loop: true, volume: 0.35 }); this.current.play(); } catch { this.current = null; }
  }
  stopMusic() { if (this.current) { this.current.stop(); this.current.destroy(); this.current = null; } }
  toggleSfx() { const d = load(); d.sfx = !d.sfx; save(); return d.sfx; }
  toggleMusic() {
    const d = load(); d.music = !d.music; save();
    if (!d.music) this.stopMusic(); else if (this.currentKey) { const k = this.currentKey; this.currentKey = null; this.music(k); }
    return d.music;
  }
}
export const audio = new AudioManager();
