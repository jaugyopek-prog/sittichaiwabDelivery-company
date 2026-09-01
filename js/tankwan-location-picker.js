// ทันควัน DISPATCH — Location Picker
// ใช้ Google Maps Extended Component Library (gmpx-api-loader, gmp-map, gmp-advanced-marker)
// ผูกกับช่องที่อยู่ (data-picker-input) + แผนที่ (gmp-map[data-picker]) + ป้ายพิกัด (data-picker-coords)
// ที่มี data-picker="<key>" ตรงกันในหน้าเดียวกัน
//
// หน้าไหนไม่มี Google Maps API Key จะเห็นข้อความสำรองแทนแผนที่โดยอัตโนมัติ
// (ผู้ใช้ยังกรอกที่อยู่เป็นข้อความในช่อง input ได้ตามปกติ)

import { APILoader } from 'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.15/index.min.js';

window.tankwanMapPins = window.tankwanMapPins || {};

/** แสดงข้อความสำรองแทนแผนที่ทุกจุดที่มี class="map-picker" */
function showMapFallback() {
  document.querySelectorAll('.map-picker').forEach((el) => {
    if (el.dataset.twFallbackApplied) return;
    el.dataset.twFallbackApplied = '1';
    el.outerHTML =
      '<div class="map-fallback"><i class="fa-solid fa-map-location-dot" style="margin-right:6px;"></i>' +
      'แผนที่ยังไม่พร้อมใช้งาน (ต้องใส่ Google Maps API Key ของคุณเอง) กรอกที่อยู่ในช่องข้อความแทนได้เลย</div>';
  });
}

async function initTankwanLocationPickers() {
  const pickers = document.querySelectorAll('gmp-map[data-picker]');
  if (!pickers.length) return; // หน้านี้ไม่มีตัวเลือกแผนที่ ไม่ต้องทำอะไรต่อ

  try {
    await customElements.whenDefined('gmp-map');
    const { Autocomplete } = await APILoader.importLibrary('places');

    pickers.forEach((mapEl) => {
      const key = mapEl.getAttribute('data-picker');
      const inputEl = document.querySelector(`[data-picker-input="${key}"]`);
      const coordsEl = document.querySelector(`[data-picker-coords="${key}"]`);
      const markerEl = mapEl.querySelector('gmp-advanced-marker');
      if (!inputEl) return;

      const autocomplete = new Autocomplete(inputEl, {
        fields: ['geometry', 'formatted_address'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          if (window.Tankwan && window.Tankwan.showToast) {
            window.Tankwan.showToast(`ไม่พบรายละเอียดสำหรับ: "${inputEl.value}"`, 'error');
          } else {
            window.alert(`ไม่พบรายละเอียดสำหรับ: "${inputEl.value}"`);
          }
          return;
        }
        mapEl.center = place.geometry.location;
        mapEl.zoom = 15;
        if (markerEl) markerEl.position = place.geometry.location;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        window.tankwanMapPins[key] = { lat, lng };
        if (coordsEl) coordsEl.innerText = lat.toFixed(5) + ', ' + lng.toFixed(5);
      });
    });
  } catch (err) {
    // ไม่มี Google Maps API Key หรือโหลดไลบรารีไม่สำเร็จ — ใช้ข้อความสำรองแทน
    console.warn('Tankwan location picker: falling back to text-only address input.', err);
    showMapFallback();
  }
}

initTankwanLocationPickers();

// เผื่อกรณีที่ gmp-map ไม่ถูกลงทะเบียนเป็น custom element เลย (ยังไม่ได้ใส่ API Key)
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!customElements.get('gmp-map')) showMapFallback();
  }, 3000);
});