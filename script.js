document.getElementById('y').textContent = new Date().getFullYear();

// Purely cosmetic: makes the waybill mock feel alive by counting the ETA down.
(function tickEta(){
  const el = document.getElementById('eta');
  if(!el) return;
  let minutes = 14;
  setInterval(() => {
    minutes = minutes > 1 ? minutes - 1 : 14;
    el.textContent = minutes + ' menit';
  }, 4000);
})();
