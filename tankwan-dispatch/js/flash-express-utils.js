/**
 * Flash Express-style shipping fee utility (ปรับปรุงจากไฟล์ต้นฉบับ)
 * คำนวณน้ำหนักตามปริมาตร (Volumetric Weight) และค่าบริการโดยประมาณ
 *
 * หมายเหตุ: ทันควัน DISPATCH ใช้ตารางราคาของตัวเองใน js/tankwan-utils.js
 * ไฟล์นี้เก็บไว้เป็นตัวอย่าง/อ้างอิงสูตรคำนวณน้ำหนักตามปริมาตรแบบทั่วไปเท่านั้น
 *
 * @param {number} widthCm  ความกว้าง (ซม.)
 * @param {number} lengthCm ความยาว (ซม.)
 * @param {number} heightCm ความสูง (ซม.)
 * @param {number} actualWeightKg น้ำหนักจริง (กก.)
 * @returns {{chargeWeight: string, finalPrice: number}}
 */
function calculateShippingFee(widthCm, lengthCm, heightCm, actualWeightKg) {
  const dims = [widthCm, lengthCm, heightCm, actualWeightKg];
  if (dims.some(v => typeof v !== 'number' || Number.isNaN(v) || v < 0)) {
    throw new TypeError('calculateShippingFee: ทุกพารามิเตอร์ต้องเป็นตัวเลขที่ไม่ติดลบ');
  }

  const volumetricWeight = (widthCm * lengthCm * heightCm) / 5000; // สูตรมาตรฐานสากล

  // คิดค่าบริการจากค่าน้ำหนักที่มากกว่า
  const chargeWeight = Math.max(volumetricWeight, actualWeightKg);

  let basePrice = 35; // ราคาเริ่มต้น
  if (chargeWeight > 1) {
    basePrice += Math.ceil(chargeWeight - 1) * 12; // บวกเพิ่ม กก. ละ 12 บาท
  }

  return {
    chargeWeight: chargeWeight.toFixed(2),
    finalPrice: basePrice,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateShippingFee };
}