/**
 * ทันควัน DISPATCH — Shared utilities
 * แหล่งข้อมูลกลาง (single source of truth) สำหรับตารางราคา, โซนพื้นที่บริการ,
 * การคำนวณน้ำหนักตามปริมาตร, การตรวจสอบข้อมูลฟอร์ม และฟังก์ชันช่วยเหลือทั่วไป
 * ให้ทุกหน้า (จองส่งพัสดุ / เช็คราคา / ติดตามพัสดุ / อัปโหลดล็อตใหญ่) เรียกใช้ร่วมกัน
 * เพื่อไม่ให้ตัวเลขราคาเพี้ยนไปคนละหน้าเหมือนเวอร์ชันก่อนหน้า
 */
(function (global) {
  'use strict';

  // ----- ตารางราคาอ้างอิงจากหน้าตารางค่าบริการ (tankwan-rates.html) -----
  const RATE_TABLE = {
    express:  { label: 'ส่งด่วนในเมือง (Express)',      tiers: [ {max:1,price:40}, {max:3,price:60}, {max:5,price:80}, {max:10,price:120} ], overflowPerKg: 18 },
    cold:     { label: 'คุมอุณหภูมิ (Cold Chain)',       tiers: [ {max:1,price:80}, {max:3,price:100}, {max:5,price:130}, {max:10,price:180} ], overflowPerKg: 22 },
    dropoff:  { label: 'ฝากตู้ล็อกเกอร์ (Drop-off)',     tiers: [ {max:1,price:25}, {max:3,price:35}, {max:5,price:50}, {max:10,price:80} ], overflowPerKg: 14 },
  };

  // ----- โซนพื้นที่บริการ อ้างอิงจากหน้า tankwan-coverage.html -----
  const ZONES = [
    { zone: 'A', label: 'โซน A: ไข่แดงเมืองเชียงใหม่', eta: 'ส่งถึงภายใน 1-2 ชั่วโมง', areas: ['คูเมือง','นิมมาน','นิมมานเหมินท์','ช้างคลาน','สันติธรรม','ช้างเผือก','แม่เหียะ'] },
    { zone: 'B', label: 'โซน B: รอบนอกเมือง',           eta: 'ส่งถึงภายใน 3-4 ชั่วโมง', areas: ['สันทราย','หางดง','สารภี','แม่ริม'] },
    { zone: 'C', label: 'โซน C: ต่างอำเภอ & ข้ามจังหวัด', eta: 'ส่งถึงวันถัดไป (Next Day)', areas: ['ฝาง','จอมทอง','ลำพูน','ลำปาง','เชียงราย'] },
  ];

  /** น้ำหนักตามปริมาตร (สูตรมาตรฐานสากล หน่วย ซม. หารด้วย 5000) */
  function calcVolumetricWeight(widthCm, lengthCm, heightCm) {
    const w = Number(widthCm) || 0, l = Number(lengthCm) || 0, h = Number(heightCm) || 0;
    return (w * l * h) / 5000;
  }

  /** น้ำหนักที่ใช้คิดค่าบริการ = ค่าที่มากกว่าระหว่างน้ำหนักจริงกับน้ำหนักตามปริมาตร */
  function getChargeWeight(actualWeightKg, dims) {
    const actual = Number(actualWeightKg) || 0;
    if (dims && dims.w && dims.l && dims.h) {
      return Math.max(actual, calcVolumetricWeight(dims.w, dims.l, dims.h));
    }
    return actual;
  }

  /** หาราคาจากตารางตามช่วงน้ำหนัก พร้อมคิดราคาส่วนเกินถ้าหนักกว่า 10 กก. */
  function getPriceForWeight(serviceKey, chargeWeightKg) {
    const table = RATE_TABLE[serviceKey];
    if (!table) return null;
    const w = Math.max(0.1, Number(chargeWeightKg) || 0);
    const tier = table.tiers.find(t => w <= t.max);
    if (tier) return tier.price;
    const lastTier = table.tiers[table.tiers.length - 1];
    const extraKg = Math.ceil(w - lastTier.max);
    return lastTier.price + extraKg * table.overflowPerKg;
  }

  /** คำนวณค่าจัดส่งแบบเต็ม: คืนทั้งน้ำหนักที่ใช้คิดราคาและราคาสุทธิ */
  function calculateShippingFee(serviceKey, actualWeightKg, dims) {
    const chargeWeight = getChargeWeight(actualWeightKg, dims);
    const price = getPriceForWeight(serviceKey, chargeWeight);
    return { chargeWeight: Number(chargeWeight.toFixed(2)), price };
  }

  /** ค้นหาโซนพื้นที่บริการจากชื่อตำบล/อำเภอที่พิมพ์เข้ามา (ค้นแบบ substring, ไม่สนตัวพิมพ์/วรรค) */
  function findZoneByArea(query) {
    if (!query) return null;
    const q = query.trim().toLowerCase();
    if (!q) return null;
    for (const z of ZONES) {
      if (z.areas.some(a => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()))) {
        return z;
      }
    }
    return null;
  }

  /** ตรวจสอบเบอร์โทรศัพท์มือถือไทยแบบคร่าวๆ (ยอมรับขีดคั่นและช่องว่าง) */
  function validateThaiPhone(phone) {
    const digits = String(phone || '').replace(/[^\d]/g, '');
    return /^0\d{9}$/.test(digits);
  }

  /** จัดรูปแบบตัวเลขเป็นสกุลเงินบาท */
  function formatTHB(amount) {
    const n = Number(amount) || 0;
    return '฿' + n.toLocaleString('th-TH');
  }

  /** สร้างเลขพัสดุจำลอง */
  function generateTrackingId(prefix) {
    prefix = prefix || 'TKW';
    return prefix + '-' + Math.floor(100000 + Math.random() * 900000);
  }

  /**
   * สร้างไทม์ไลน์สถานะพัสดุจำลองแบบ deterministic จากรหัสพัสดุ
   * (รหัสเดียวกันจะได้สถานะเดิมเสมอ ทำให้กดรีเฟรช/แชร์ลิงก์แล้วเห็นสถานะเดิม)
   */
  function buildMockTimeline(trackId) {
    const seed = String(trackId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const stageCount = 1 + (seed % 4); // 1..4 ขั้นตอนที่ทำเสร็จแล้ว
    const steps = [
      { title: 'สร้างรายการพัสดุเรียบร้อย', offsetMin: 0 },
      { title: 'ไรเดอร์เข้ารับพัสดุจากผู้ส่ง', offsetMin: 18 },
      { title: 'พัสดุกำลังเดินทางไปหาผู้รับ', offsetMin: 55 },
      { title: 'จัดส่งสำเร็จ', offsetMin: 78 },
    ];
    const base = new Date();
    base.setMinutes(base.getMinutes() - 90);
    const withTimes = steps.map((s, i) => {
      const t = new Date(base.getTime() + s.offsetMin * 60000);
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return {
        title: s.title,
        time: i < stageCount ? `${hh}:${mm} น.` : '--:--',
        state: i < stageCount - 1 ? 'done' : (i === stageCount - 1 ? 'active' : 'pending'),
      };
    });
    const statusLabel = stageCount >= 4 ? 'จัดส่งสำเร็จ' : (stageCount === 1 ? 'รับพัสดุแล้ว' : 'กำลังจัดส่ง');
    return { steps: withTimes, statusLabel, done: stageCount >= 4 };
  }

  /** แสดงข้อความแจ้งเตือนแบบลอย (toast) แทนการใช้ window.alert ที่ขัดจังหวะผู้ใช้ */
  function showToast(message, type) {
    let el = document.querySelector('.tw-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'tw-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = 'tw-toast show' + (type ? ' tw-toast-' + type : '');
    clearTimeout(el._twTimer);
    el._twTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  global.Tankwan = {
    RATE_TABLE,
    ZONES,
    calcVolumetricWeight,
    getChargeWeight,
    getPriceForWeight,
    calculateShippingFee,
    findZoneByArea,
    validateThaiPhone,
    formatTHB,
    generateTrackingId,
    buildMockTimeline,
    showToast,
  };
})(window);