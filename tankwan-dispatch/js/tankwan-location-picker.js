// ทันควัน DISPATCH — Location Picker (Leaflet + OpenStreetMap)
// แผนที่ฟรี ไม่ต้องใช้ Google Maps API Key
// ผูกกับช่องที่อยู่ (data-picker-input) + แผนที่ (.map-picker[data-picker]) + ป้ายพิกัด (data-picker-coords)
// ที่มี data-picker="<key>" ตรงกันในหน้าเดียวกัน
//
// ค้นหาที่อยู่ผ่าน Nominatim (บริการค้นหาของ OpenStreetMap) — พิมพ์แล้วกด Enter
// หรือคลิก/ลากหมุดบนแผนที่โดยตรงก็ได้ (ระบบจะค้นชื่อที่อยู่ให้อัตโนมัติ)

window.tankwanMapPins = window.tankwanMapPins || {};

var DEFAULT_CENTER = [18.7883, 98.9853]; // เชียงใหม่
var DEFAULT_ZOOM = 12;

function twUpdateCoordsLabel(key, lat, lng) {
  var coordsEl = document.querySelector('[data-picker-coords="' + key + '"]');
  if (coordsEl) coordsEl.innerText = lat.toFixed(5) + ', ' + lng.toFixed(5);
  window.tankwanMapPins[key] = { lat: lat, lng: lng };
}

function twNotify(message, type) {
  if (window.Tankwan && window.Tankwan.showToast) {
    window.Tankwan.showToast(message, type);
  } else {
    window.alert(message);
  }
}

function twGeocode(query) {
  var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=th&q=' + encodeURIComponent(query);
  return fetch(url, { headers: { 'Accept-Language': 'th' } })
    .then(function (res) { if (!res.ok) throw new Error('geocode failed'); return res.json(); })
    .then(function (results) { return results[0] || null; });
}

function twReverseGeocode(lat, lng) {
  var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng;
  return fetch(url, { headers: { 'Accept-Language': 'th' } })
    .then(function (res) { if (!res.ok) throw new Error('reverse geocode failed'); return res.json(); });
}

/** แสดงข้อความสำรองแทนแผนที่ทุกจุดที่มี class="map-picker" (กรณีโหลด Leaflet ไม่สำเร็จ) */
function showMapFallback() {
  document.querySelectorAll('.map-picker').forEach(function (el) {
    if (el.dataset.twFallbackApplied) return;
    el.dataset.twFallbackApplied = '1';
    el.outerHTML =
      '<div class="map-fallback"><i class="fa-solid fa-map-location-dot" style="margin-right:6px;"></i>' +
      'แผนที่โหลดไม่สำเร็จ (ไม่มีอินเทอร์เน็ต หรือโหลด Leaflet ไม่ได้) กรอกที่อยู่ในช่องข้อความแทนได้เลย</div>';
  });
}

function initTankwanLocationPickers() {
  var mapDivs = document.querySelectorAll('.map-picker[data-picker]');
  if (!mapDivs.length) return; // หน้านี้ไม่มีตัวเลือกแผนที่ ไม่ต้องทำอะไรต่อ

  if (typeof L === 'undefined') {
    console.warn('Tankwan location picker: โหลด Leaflet ไม่สำเร็จ — ใช้ข้อความสำรองแทน');
    showMapFallback();
    return;
  }

  mapDivs.forEach(function (mapDiv) {
    var key = mapDiv.getAttribute('data-picker');
    var inputEl = document.querySelector('[data-picker-input="' + key + '"]');
    if (!inputEl) return;

    var map = L.map(mapDiv).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    var marker = L.marker(DEFAULT_CENTER, { draggable: true }).addTo(map);
    twUpdateCoordsLabel(key, DEFAULT_CENTER[0], DEFAULT_CENTER[1]);

    function onMarkerMoved() {
      var pos = marker.getLatLng();
      twUpdateCoordsLabel(key, pos.lat, pos.lng);
      twReverseGeocode(pos.lat, pos.lng).then(function (place) {
        if (place && place.display_name) inputEl.value = place.display_name;
      }).catch(function (err) {
        console.warn('Tankwan location picker: reverse geocode failed', err);
      });
    }
    marker.on('dragend', onMarkerMoved);

    // คลิกบนแผนที่เพื่อย้ายหมุดไปยังจุดนั้นได้เลย
    map.on('click', function (e) {
      marker.setLatLng(e.latlng);
      onMarkerMoved();
    });

    // พิมพ์ที่อยู่แล้วกด Enter เพื่อค้นหาบนแผนที่
    inputEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var query = inputEl.value.trim();
      if (!query) return;
      twGeocode(query).then(function (place) {
        if (!place) {
          twNotify('ไม่พบตำแหน่งสำหรับ: "' + query + '"', 'error');
          return;
        }
        var lat = parseFloat(place.lat), lng = parseFloat(place.lon);
        map.setView([lat, lng], 16);
        marker.setLatLng([lat, lng]);
        twUpdateCoordsLabel(key, lat, lng);
      }).catch(function (err) {
        console.warn('Tankwan location picker: geocode failed', err);
        twNotify('ค้นหาตำแหน่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', initTankwanLocationPickers);
