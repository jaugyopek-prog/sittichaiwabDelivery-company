/**
 * ทันควัน DISPATCH — Header behaviour ที่ใช้ร่วมกันทุกหน้า
 * 1) เปิด/ปิดเมนูแบบ hamburger บนจอมือถือ
 * 2) ไฮไลต์ลิงก์เมนูของหน้าปัจจุบันให้อัตโนมัติ (ไม่ต้องเติม class="active" เองทีละหน้า)
 */
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-header nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
    });

    // ปิดเมนูอัตโนมัติเมื่อกดลิงก์ (มือถือ)
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }

  const currentPage = (location.pathname.split('/').pop() || 'index.html');
  document.querySelectorAll('.site-header nav a').forEach(function (a) {
    const href = (a.getAttribute('href') || '').split('/').pop();
    if (href === currentPage) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
});