/**
 * ทันควัน DISPATCH — เพลงพื้นหลัง (Background Music)
 * เล่นวนซ้ำต่อเนื่องทุกหน้า โดยจำตำแหน่งเวลาเพลง + สถานะเปิด/ปิดเสียงไว้ใน localStorage
 * เพื่อให้เหมือนเพลงเล่น "ต่อ" กันไปเรื่อยๆ แม้จะเปลี่ยนหน้า (เว็บนี้เป็นแบบหลายหน้า ไม่ใช่ SPA
 * จึงไม่สามารถเล่นเพลงข้ามหน้าแบบไม่สะดุดจริงๆ ได้ แต่จะคำนวณตำแหน่งเวลาให้ใกล้เคียงต่อเนื่องที่สุด)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'twBgmState';
  var AUDIO_SRC = 'assets/audio/bgm.mp3';
  var DEFAULT_VOLUME = 0.35;

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ไม่มี localStorage ก็ปล่อยผ่าน ไม่ทำให้เว็บพัง */ }
  }

  var audio = document.createElement('audio');
  audio.id = 'twBgm';
  audio.src = AUDIO_SRC;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = DEFAULT_VOLUME;
  audio.style.display = 'none';
  document.body.appendChild(audio);

  var prevState = loadState();
  var mutedByUser = prevState ? !!prevState.muted : false;
  audio.muted = mutedByUser;

  // ---- คำนวณตำแหน่งเวลาที่ควรเล่นต่อ โดยบวกเวลาที่ผ่านไประหว่างเปลี่ยนหน้า ----
  function resumePosition() {
    if (!prevState || typeof prevState.time !== 'number') return;
    var elapsedSec = (Date.now() - (prevState.savedAt || Date.now())) / 1000;
    var target = prevState.time + Math.max(0, elapsedSec);
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      target = target % audio.duration;
    }
    try { audio.currentTime = target; } catch (e) { /* ยังโหลดไม่พอ ข้ามไปก่อน */ }
  }
  audio.addEventListener('loadedmetadata', resumePosition, { once: true });

  // ---- พยายามเล่นอัตโนมัติ ----
  function tryPlay() {
    var playAttempt = audio.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(function () {
        // เบราว์เซอร์บล็อก autoplay แบบมีเสียง → ลองเล่นแบบปิดเสียงก่อน แล้วรอผู้ใช้กดอะไรสักอย่างค่อยเปิดเสียง
        audio.muted = true;
        audio.play().catch(function () { /* เดี๋ยวจะลองใหม่ตอนมี interaction */ });
        var resumeOnInteract = function () {
          audio.muted = mutedByUser; // กลับไปตามที่ผู้ใช้เคยตั้งไว้
          audio.play().catch(function () {});
          updateToggleIcon();
          document.removeEventListener('click', resumeOnInteract);
          document.removeEventListener('keydown', resumeOnInteract);
          document.removeEventListener('touchstart', resumeOnInteract);
        };
        document.addEventListener('click', resumeOnInteract, { once: true });
        document.addEventListener('keydown', resumeOnInteract, { once: true });
        document.addEventListener('touchstart', resumeOnInteract, { once: true });
      });
    }
  }
  tryPlay();

  // ---- บันทึกตำแหน่งเพลง + สถานะเสียงเรื่อยๆ และก่อนออกจากหน้า ----
  function persist() {
    saveState({ time: audio.currentTime || 0, savedAt: Date.now(), muted: audio.muted });
  }
  window.addEventListener('beforeunload', persist);
  window.addEventListener('pagehide', persist);
  setInterval(persist, 4000);

  // ---- ปุ่มลอยมุมจอ สำหรับเปิด/ปิดเสียง ----
  var toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'tw-bgm-toggle';
  toggleBtn.setAttribute('aria-label', 'เปิด/ปิดเสียงเพลงพื้นหลัง');

  function updateToggleIcon() {
    toggleBtn.innerHTML = audio.muted
      ? '<i class="fa-solid fa-volume-xmark"></i>'
      : '<i class="fa-solid fa-volume-high"></i>';
    toggleBtn.classList.toggle('is-muted', audio.muted);
  }
  updateToggleIcon();

  toggleBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    mutedByUser = audio.muted;
    if (!audio.muted) { audio.play().catch(function () {}); }
    updateToggleIcon();
    persist();
  });

  document.body.appendChild(toggleBtn);
})();
