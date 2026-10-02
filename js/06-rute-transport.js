        // ===== SURAT JALAN: NOMOR DOKUMEN, MODAL & TANDA TANGAN DIGITAL =====
        let suratJalanCounter = { BBM: 0, LPG: 0, KLG: 0 };
        let suratJalanHistory = [];
        let pendingDispatch = null;
        let sigCanvas, sigCtx, isDrawing = false, hasSignature = false;

        // Konfigurasi tampilan Surat Jalan per jenis: BBM (SPBU), LPG (SPBU), KLG (transfer kilang -> depo)
        const SJ_MODE = {
            BBM: { judul: 'Surat Jalan Pengiriman BBM', sub: 'Terminal BBM Nusantara', lTujuan: 'Tujuan SPBU', lKode: 'Kode SPBU', lJenis: 'Jenis BBM', sig: 'Tanda Tangan Digital Supir', confirm: 'Konfirmasi Keberangkatan Truk', icon: 'fa-truck-fast',
                   cek: 'Supir menyatakan kendaraan, muatan, dan dokumen telah diperiksa serta <b>laik jalan</b> untuk berangkat.', errSig: 'Supir wajib membubuhkan tanda tangan digital pada Surat Jalan sebelum truk dapat berangkat.' },
            LPG: { judul: 'Surat Jalan Pengiriman LPG', sub: 'Terminal LPG Nusantara', lTujuan: 'Tujuan SPBU/Agen', lKode: 'Kode SPBU', lJenis: 'Jenis LPG', sig: 'Tanda Tangan Digital Supir', confirm: 'Konfirmasi Keberangkatan Truk LPG', icon: 'fa-truck-fast',
                   cek: 'Supir menyatakan kendaraan, tabung/tangki LPG, segel, dan dokumen telah diperiksa serta <b>laik jalan</b> untuk berangkat.', errSig: 'Supir wajib membubuhkan tanda tangan digital pada Surat Jalan sebelum truk LPG dapat berangkat.' },
            KLG: { judul: 'Surat Jalan Transfer Kilang', sub: 'Kilang Pusat Tuban - Distribusi Antar Depo', lTujuan: 'Depo Tujuan', lKode: 'Kode Depo', lJenis: 'Jenis Muatan', sig: 'Tanda Tangan Digital Petugas Transfer', confirm: 'Konfirmasi Transfer Pasokan', icon: 'fa-truck-arrow-right',
                   cek: 'Petugas menyatakan volume, segel, dan dokumen transfer telah diperiksa serta <b>sesuai</b> untuk dikirim.', errSig: 'Petugas wajib membubuhkan tanda tangan digital pada Surat Jalan sebelum transfer dilakukan.' }
        };

        function formatNomorSuratJalan(urut, mode = 'BBM') {
            const romawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
            const now = new Date(gameNow());
            // Pakai kode perusahaan pemain sendiri (diisi saat daftar akun, lihat companyCodes/{code}) -
            // sebelumnya di sini hardcode teks 'NUSA' untuk SEMUA pemain, jadi Surat Jalan tidak pernah
            // benar-benar menampilkan kode perusahaan masing-masing pemain.
            const kodePerusahaan = (currentAccount && currentAccount.code) || 'NUSA';
            return `SJ/${mode}-${kodePerusahaan}/${String(urut).padStart(3, '0')}/${romawi[now.getMonth()]}/${now.getFullYear()}`;
        }

        // Nomor final (mengunci counter) - dipakai saat Surat Jalan benar-benar dikonfirmasi
        function generateNomorSuratJalan(mode = 'BBM') {
            suratJalanCounter[mode] += 1;
            return formatNomorSuratJalan(suratJalanCounter[mode], mode);
        }

        // data: { mode, tujuanNama, tujuanKode, jenisMuatan, volumeText, truck?, driver?, kernet?, execute(nomorSJ) }
        function openSuratJalanModal(data) {
            pendingDispatch = data;
            const cfg = SJ_MODE[data.mode];
            const now = new Date(gameNow());
            const set = (id, v) => { document.getElementById(id).textContent = v; };

            set('sj-perusahaan', currentAccount ? `${currentAccount.company} (${currentAccount.code || '-'})` : 'NAMA PERUSAHAAN ANDA');
            set('sj-judul', cfg.judul);
            set('sj-sub', cfg.sub);
            set('sj-l-tujuan', cfg.lTujuan);
            set('sj-l-kode', cfg.lKode);
            set('sj-l-jenis', cfg.lJenis);
            set('sj-sig-label', cfg.sig);
            set('sj-confirm-text', cfg.confirm);
            document.getElementById('sj-confirm-icon').className = `fa-solid ${cfg.icon} mr-2`;
            document.getElementById('sj-check-text').innerHTML = cfg.cek;

            set('sj-nomor', 'No: ' + formatNomorSuratJalan(suratJalanCounter[data.mode] + 1, data.mode) + ' (draft)');
            set('sj-tanggal', 'Tanggal: ' + now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' }));
            set('sj-spbu', data.tujuanNama);
            set('sj-kode-spbu', data.tujuanKode);
            set('sj-fuel', data.jenisMuatan);
            set('sj-volume', data.volumeText);

            // Transfer kilang darat (instan, tanpa armada) tidak memakai truk/kru, jadi kolom itu disembunyikan
            const adaKru = !!data.truck;
            document.querySelectorAll('#surat-jalan-modal .sj-truck-cell').forEach(el => el.classList.toggle('hidden', !adaKru));
            if (adaKru) {
                const lb = data.labels || {};
                set('sj-l-truk', lb.truk || 'Armada Truk');
                set('sj-l-plat', lb.plat || 'No. Polisi');
                set('sj-l-driver', lb.driver || 'Supir Bertugas');
                set('sj-l-kernet', lb.kernet || 'Kernet Pendamping');
                set('sj-truk', `${data.truck.id} - ${data.truck.name}`);
                set('sj-plat', data.truck.plat);
                set('sj-driver', `${data.driver.name} (${data.driver.id})`);
                set('sj-kernet', `${data.kernet.name} (${data.kernet.id})`);
            }
            document.getElementById('sj-checklist').checked = false;

            document.getElementById('surat-jalan-modal').classList.remove('hidden');
            document.getElementById('surat-jalan-modal').classList.add('flex');

            // Inisialisasi canvas tanda tangan setelah modal tampil agar dimensinya benar
            setTimeout(initSignaturePad, 50);
        }

        function cancelSuratJalan() {
            pendingDispatch = null;
            document.getElementById('surat-jalan-modal').classList.add('hidden');
            document.getElementById('surat-jalan-modal').classList.remove('flex');
        }

        function initSignaturePad() {
            sigCanvas = document.getElementById('signature-pad');
            sigCanvas.width = sigCanvas.offsetWidth;
            sigCtx = sigCanvas.getContext('2d');
            sigCtx.fillStyle = '#f3f4f6';
            sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
            sigCtx.strokeStyle = '#111827';
            sigCtx.lineWidth = 2.2;
            sigCtx.lineCap = 'round';
            hasSignature = false;

            const getPos = (e) => {
                const rect = sigCanvas.getBoundingClientRect();
                const point = e.touches ? e.touches[0] : e;
                return { x: point.clientX - rect.left, y: point.clientY - rect.top };
            };
            const start = (e) => { e.preventDefault(); isDrawing = true; const p = getPos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); };
            const move = (e) => {
                if (!isDrawing) return;
                e.preventDefault();
                const p = getPos(e);
                sigCtx.lineTo(p.x, p.y);
                sigCtx.stroke();
                hasSignature = true;
            };
            const end = () => { isDrawing = false; };

            sigCanvas.onmousedown = start;
            sigCanvas.onmousemove = move;
            sigCanvas.onmouseup = end;
            sigCanvas.onmouseleave = end;
            sigCanvas.ontouchstart = start;
            sigCanvas.ontouchmove = move;
            sigCanvas.ontouchend = end;
        }

        function clearSignature() {
            if (!sigCtx) return;
            sigCtx.fillStyle = '#f3f4f6';
            sigCtx.fillRect(0, 0, sigCanvas.width, sigCanvas.height);
            hasSignature = false;
        }

        // Tahap 2 (BBM/LPG/Kilang): dieksekusi hanya setelah Surat Jalan ditandatangani & dikonfirmasi
        function confirmKeberangkatan() {
            if (!pendingDispatch) return;
            const data = pendingDispatch;
            const cfg = SJ_MODE[data.mode];

            if (!hasSignature) {
                showModal('Tanda Tangan Diperlukan', cfg.errSig, 'fa-signature', 'red');
                return;
            }
            if (!document.getElementById('sj-checklist').checked) {
                showModal('Checklist Belum Diisi', 'Centang pernyataan pemeriksaan terlebih dahulu sebelum konfirmasi.', 'fa-clipboard-check', 'red');
                return;
            }

            const nomorSJ = generateNomorSuratJalan(data.mode);
            const signatureDataUrl = sigCanvas.toDataURL('image/png');
            suratJalanHistory.push({ nomorSJ, mode: data.mode, waktu: new Date(gameNow()), tujuan: data.tujuanNama, jenisMuatan: data.jenisMuatan, signatureDataUrl });

            cancelSuratJalan();
            data.execute(nomorSJ);
        }

        // ID jenis BBM/LPG (sama dengan field `fuel` di objek pesanan) dari sebuah truk + label muatannya -
        // dipakai untuk mencocokkan truk yang sedang jalan dengan pesanan SPBU terkait (lihat settleTruckDelivery,
        // animateDelivery, fulfilOrder).
        function orderFuelIdFor(truck, jenisMuatan) {
            if (truck.type === 'LPG') { const f = FUELS.find(x => x.lpg); return f ? f.id : null; }
            const f = FUELS.find(x => x.label === jenisMuatan);
            return f ? f.id : null;
        }
        // Perbarui fase perjalanan ('muat'|'berangkat'|'tiba'|'bongkar') pada pesanan SPBU terkait sebuah pengiriman,
        // kalau pesanannya masih ada & masih terbuka. Dipanggil dari animateDelivery saat truk tiba & mulai bongkar.
        function updateOrderTahap(spbu, truck, jenisMuatan, tahap) {
            const tr = activeTrips.get(truck.id); if (tr) tr.ph = tahap; // ikut disimpan supaya perjalanan bisa dipulihkan setelah refresh
            truckFase.set(truck.id, tahap); // dipakai bar status armada & penanda unit di tab Pesanan SPBU
            const fuelId = orderFuelIdFor(truck, jenisMuatan);
            const o = fuelId ? orders.find(x => x.kode === spbu.kode && x.fuel === fuelId && x.status === 'open') : null;
            if (o) { o.tahap = tahap; renderOrders(); }
        }
        // Keberangkatan truk (BBM & LPG): muat kargo (ambil stok kilang / beli LPG), lalu berangkat.
        // Pendapatan TIDAK cair di sini lagi - baru cair setelah truk tiba & selesai masa bongkar muatan (lihat completeUnloading).
        function settleTruckDelivery(nomorSJ, d) {
            const { spbu, truck, driver, jenisMuatan } = d;
            d.nomorSJ = nomorSJ; // dibawa sampai proses bongkar selesai untuk keperluan catatan

            if (truck.type === 'BBM' && d.origin) {
                // Kurangi tangki JENIS BBM yang benar-benar dipesan (kap[kapKey]), bukan stok BBL mentah (stok_current).
                const slot = d.kapKey && d.origin.kap && d.origin.kap[d.kapKey];
                if (slot) slot.cur = Math.max(0, Math.round((slot.cur - truck.cap) * 100) / 100);
                else d.origin.stok_current = Math.max(0, d.origin.stok_current - stokNeed(d.origin, truck.cap)); // fallback lama, jaga-jaga kalau kapKey tidak ada
                renderRefineries();
            }
            else if (truck.type === 'LPG' && d.origin) {
                // Pesanan LPG SPBU mengambil dari tangki LPG TABUNG kilang/depo asal (bukan beli dari pemasok lagi).
                const slot = d.origin.kap && d.origin.kap.lpg_tabung;
                if (slot) slot.cur = Math.max(0, Math.round((slot.cur - truck.cap) * 100) / 100);
                renderRefineries();
            }

            // BUG FIX: pesanan SPBU terkait (kalau ada) langsung ditandai "Proses - Berangkat" begitu truk resmi
            // dikirim, supaya SEKETIKA hilang dari daftar Pesanan terbuka (bukan nyangkut di sana sampai truk
            // tiba/bongkar) dan langsung muncul di Riwayat Pesanan dengan status berjalan. inTransit dipakai
            // buat progress bar "Proses" berjalan.
            // KUNCI PESANAN BERTAHAP: kalau kapasitas truk ini belum cukup melunasi SELURUH sisa pesanan sekali
            // jalan, pesanan langsung dikunci ke truk ini (lockedTruckId) - truk lain dilarang membantu
            // (lihat orderLockBlock) dan pesanan tetap tersembunyi dari daftar terbuka (lihat isOrderDispatchable)
            // sampai truk yang sama ini selesai bolak-balik melunasi semuanya.
            const fuelIdForOrder = orderFuelIdFor(truck, jenisMuatan);
            const orderTerkait = fuelIdForOrder ? orders.find(x => x.kode === spbu.kode && x.fuel === fuelIdForOrder && x.status === 'open') : null;
            if (orderTerkait) {
                const sisaSebelumKirim = orderTerkait.kl - orderTerkait.terkirim - (orderTerkait.inTransit || 0);
                orderTerkait.inTransit = (orderTerkait.inTransit || 0) + truck.cap;
                orderTerkait.tahap = 'muat';
                if (!orderTerkait.lockedTruckId && truck.cap < sisaSebelumKirim) orderTerkait.lockedTruckId = truck.id;
            }

            animateDelivery(d);
            renderOrders();
            addLog(`SURAT JALAN ${nomorSJ}: Armada ${truck.id} [Supir: ${driver.name}] DITANDATANGANI. Kru mulai memuat ${jenisMuatan} untuk ${spbu.nama} (±${LOAD_SECONDS} detik) sebelum berangkat.`, 'info', 'truck');
            if (!d.silent) showModal('Proses Muat Dimulai', `Surat Jalan ${nomorSJ} telah ditandatangani. Kru memuat ${jenisMuatan} ke truk ${truck.id} (±${LOAD_SECONDS} detik), lalu truk berangkat ke ${spbu.nama}.\nPendapatan akan cair otomatis setelah truk tiba di tujuan dan kru selesai bongkar muatan (±${UNLOAD_SECONDS} detik setelah tiba).`, 'fa-truck-ramp-box', 'blue');
        }

        // DISPATCH LPG
        function dispatchLPGToSpbu() {
            if (pphBlokir()) return;
            // Semua pilihan ditentukan otomatis (lihat planDispatchAuto). Hitung ulang saat tombol ditekan supaya data selalu segar.
            const plan = refreshDispatchAuto('LPG');
            if (!plan.ok) return showModal('Belum Bisa Dispatch', plan.reason + (plan.tip ? ' ' + plan.tip : ''), 'fa-circle-info', 'amber');
            const kodeSpbu = document.getElementById('lpg-spbu-select').value;
            const truckId = document.getElementById('lpg-truck-select').value;
            const driverId = document.getElementById('lpg-driver-select').value;
            const kernetId = document.getElementById('lpg-kernet-select').value;
            const lpgType = document.getElementById('lpg-type-select').value;

            const spbu = loadedSpbuList.find(s => s.kode === kodeSpbu);
            if (spbu && spbu.blocked) return showModal('SPBU Diblokir', 'Lisensi SPBU ini dicabut. Operasional dihentikan.', 'fa-ban', 'red');
            const truck = companyFleet.find(t => t.id === truckId);
            const driver = companyCrew.find(c => c.id === driverId);
            const kernet = companyCrew.find(c => c.id === kernetId);

            if (!spbu || !truck || !driver || !kernet) {
                showModal('Peringatan', 'Lengkapi pilihan SPBU, Armada LPG, Supir & Kernet!', 'fa-circle-exclamation', 'red');
                return;
            }
            if (busyCheck(truck, driver, kernet)) return;
            if (docBlock(truck)) return;
            if (truck.type !== 'LPG') return showModal('Armada Salah', 'Pilih truk LPG untuk pengiriman LPG.', 'fa-circle-exclamation', 'red');
            const lockMsgLpg = orderLockBlock(spbu, 'lpg', truck);
            if (lockMsgLpg) return showModal('Pesanan Terkunci', lockMsgLpg, 'fa-lock', 'red');
            const sizeMsg = truckSizeBlock(spbu, 'lpg', truck, 'LPG');
            if (sizeMsg) return showModal('Pakai Armada yang Lebih Pas', sizeMsg, 'fa-truck-ramp-box', 'red');
            { const wb = truckWilayahBlock(truck, spbu, 'LPG'); if (wb) return showModal('Beda Wilayah Depo', wb, 'fa-map-location-dot', 'red'); }
            const origin = pickOrigin('LPG', spbu, truck.cap, truck, 'lpg_tabung');
            if (!origin) return showModal('Stok LPG Tabung Kurang', `Depo pangkalan ${truck.id} (${depoNamaOf(truckDepoId(truck))}) tidak punya stok LPG Tabung cukup untuk ${truck.cap} Ton. Konversi LPG Curah jadi LPG Tabung di tab Kilang (tombol Konversi), atau transfer stok LPG ke depo.`, 'fa-fire-flame-simple', 'red');

            notifyAsalBeda(truck, origin, lpgType);
            const d = { spbu, truck, driver, kernet, origin, jenisMuatan: lpgType, kapKey: 'lpg_tabung', hargaPerUnit: ECO.jualTon };
            openSuratJalanModal({ mode: 'LPG', tujuanNama: spbu.nama, tujuanKode: spbu.kode, jenisMuatan: lpgType, volumeText: `${truck.cap} Ton`, truck, driver, kernet,
                execute: (no) => {
                    // Stok bisa berubah selama surat jalan dibuka: cek ulang sebelum berangkat.
                    const sl = origin.kap && origin.kap.lpg_tabung;
                    if (!sl || sl.cur < truck.cap) return showModal('Stok LPG Tabung Kurang', `Stok LPG Tabung ${origin.nama} tidak cukup untuk ${truck.cap} Ton.`, 'fa-triangle-exclamation', 'red');
                    settleTruckDelivery(no, d);
                    // Setelah truk berangkat, kembali ke daftar Pesanan SPBU (pesanan yang baru dikirim pindah ke daftar Proses di Riwayat).
                    dispatchFocus.LPG = null;
                    switchTab('tab-orders');
                } });
        }

        const ctx = document.getElementById('chartSupply').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'Penyaluran BBM Nasional (KL)',
                    data: [1200, 1900, 3000, 5400, 4200, 2100],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af', font: { size: 9 } } },
                    y: { grid: { color: '#1f2937' }, ticks: { color: '#9ca3af', font: { size: 9 } } }
                }
            }
        });

        // ===== ANIMASI KENDARAAN DI PETA (mengikuti jalan sebenarnya) =====
        const routeCache = new Map();
        let activeAnims = 0;
        const TRUCK_COLOR = { BBM: '#10b981', LPG: '#f59e0b' };
        const AVG_TRUCK_SPEED_KMH = 45; // estimasi kecepatan rata-rata truk tangki di jalan (termasuk berhenti/istirahat), mendekati perkiraan Google Maps utk kendaraan besar
        const LOAD_SECONDS = 25; // waktu nyata (detik) kru memuat kargo di kilang/depo asal setelah surat jalan ditandatangani, sebelum truk berangkat (pasangan dari fase bongkar muat)
        const UNLOAD_SECONDS = 35; // waktu nyata (detik) kru bongkar muatan setelah truk tiba, sebelum pendapatan cair - dinaikkan dari 20 detik biar fase "Bongkar Muat" terasa (tidak sekejap saja)
        // Catatan: GAME_SPEED dideklarasikan lebih bawah di file ini; dipakai di dalam fungsi (bukan di top-level) agar sudah terisi saat dipanggil.

        // ===== BIAYA BBM TRUK & KECEPATAN JALAN NYATA (fitur Rute Tol/Non-Tol sudah dihapus) =====
        // Semua pengiriman sekarang lewat SATU jalur nyata (hasil OSRM apa adanya, tanpa pilihan/kunci tol),
        // jadi kecepatan & waktu tempuh murni mengikuti kondisi ASLI jalur yang benar-benar dilalui (lihat
        // roadSpeedKmh & sinuosityOf) - bukan lagi diasumsikan lancar konstan seperti gaya jalan tol.
        // Harga Solar non-subsidi/industri (acuan Dexlite/Dex per medio 2026) - truk perusahaan tidak pakai Biosolar subsidi.
        const HARGA_SOLAR_TRUK = 21000; // Rp/liter
        // Konsumsi BBM truk tangki: makin besar kapasitas & makin berat muatan, makin boros per km.
        // Varian Heavy Duty (mesin 330 PS Euro 4) dibanding tipe Standar: solar 20% lebih hemat, ban aus 2x lebih lambat, laju jalan +10%.
        const HD_EFEK = { pakaiSolar: 0.80, ausBan: 0.50, laju: 1.10 };
        const isHeavyDuty = t => !!(t && /Heavy Duty/i.test(t.name || ''));
        // Efek unit: Limited Edition (LIMITED_CATALOG di 03) atau Heavy Duty. Kuncinya sama: pakaiSolar, ausBan, laju.
        const unitPerk = t => { if (!t) return null; if (t.limited) { const m = limitedModel(t.limited); if (m) return m.perk; } return isHeavyDuty(t) ? HD_EFEK : null; };
        const unitLaju = t => { const p = unitPerk(t); return p ? p.laju : 0; };   // 0 = tanpa bonus, selain itu pengali kecepatan
        const tireWearMult = t => { const p = unitPerk(t); return p ? p.ausBan : 1; };
        function kmPerLiterTruk(truck) {
            const cap = (truck && truck.cap) ? (isDepoTruck(truck) ? depoKlEq(truck) : truck.cap) : 0; // truk depo kapasitasnya Bbl -> setara KL untuk tabel konsumsi
            const base = cap <= 8 ? 4.2 : cap <= 16 ? 3.4 : cap <= 24 ? 2.8 : 2.3; // trailer 32 KL / LPG trailer 20 Ton ke atas
            const p = unitPerk(truck); return p ? base / p.pakaiSolar : base;
        }
        // Rasio panjang jalur riil terhadap jarak garis lurus (haversine) antar 2 titik - makin besar rasionya,
        // makin berkelok-kelok jalannya (banyak tikungan/rintangan), makin kecil (mendekati 1) makin lurus & renggang.
        function sinuosityOf(pts, straightKm) {
            let total = 0;
            for (let i = 1; i < pts.length; i++) total += distKm({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] });
            return { total, sinuosity: total / (straightKm > 0.05 ? straightKm : total || 1) };
        }
        // Kecepatan truk mengikuti karakter/rintangan jalur sesungguhnya yang dilalui (sinuosity = rasio panjang
        // jalur riil vs garis lurus - makin besar makin banyak tikungan/rintangan di sepanjang rute), BUKAN lagi
        // angka tetap ala jalan bebas hambatan. Rentang kecepatan jalan nasional/arteri Indonesia: 55-80 km/j.
        // Dipakai juga sebagai batas clamp fluktuasi kecepatan "hidup" real-time di popup info truk - lihat
        // liveSpeedKmh() di 07-animasi-kapal.js.
        const SPEED_RANGE = [55, 80];
        function roadSpeedKmh(sinuosity, real, hd) {
            let speed;
            if (!real) speed = 55; // rute perkiraan (OSRM gagal dimuat) sengaja dibuat berkelok, anggap jalan kecil
            else if (sinuosity >= 1.35) speed = 55;      // sangat berkelok-kelok / banyak rintangan
            else if (sinuosity >= 1.22) speed = 60;      // cukup berkelok
            else if (sinuosity >= 1.12) speed = 68;      // sedikit berkelok
            else if (sinuosity >= 1.05) speed = 74;      // relatif lurus
            else speed = 80;                              // nyaris lurus & renggang, jarang ada belokan
            if (hd) { const lj = hd === true ? HD_EFEK.laju : hd; return Math.max(SPEED_RANGE[0], Math.min(SPEED_RANGE[1] * lj, speed * lj)); }
            return Math.max(SPEED_RANGE[0], Math.min(SPEED_RANGE[1], speed));
        }
        // Estimasi biaya sekali jalan (one-way) untuk preview sebelum truk berangkat.
        function estimasiBiayaRute(kmEfektif, speedKmh, truck) {
            const biayaBbm = Math.round((kmEfektif / kmPerLiterTruk(truck)) * HARGA_SOLAR_TRUK);
            const jamTempuh = kmEfektif / speedKmh;
            return { kmEfektif, biayaBbm, jamTempuh };
        }

        // Tampilkan estimasi jarak, kecepatan & biaya BBM secara live begitu SPBU/armada dipilih, dengan
        // mengambil rute jalan sesungguhnya (sama persis seperti yang dipakai animasi, lihat driveLeg di
        // 07-animasi-kapal.js) supaya preview akurat & benar-benar mencerminkan rintangan/kelokan jalur asli
        // yang akan dilalui truk (fitur pilihan Rute Tol/Non-Tol sudah dihapus - hanya ada satu jalur nyata).
        const routeEstimateSeq = { delivery: 0, lpg: 0 }; // terpisah per panel supaya estimasi BBM & LPG tidak saling membuang hasil
        // Format durasi jam-game -> "1h 4j 20m" (hari, jam, menit) dan detik nyata -> "m:ss".
        function fmtDurGame(h) {
            const tot = Math.max(0, Math.round(h * 60)), d = Math.floor(tot / 1440), j = Math.floor((tot % 1440) / 60), m = tot % 60;
            return (d ? `${d}h ` : '') + (j || d ? `${j}j ` : '') + `${m}m`;
        }
        function fmtRealSec(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
        // Jam dinding in-game setelah `h` jam-game dari sekarang, mis. "14:35" atau "03:10 (H+1)".
        function etaClock(h) {
            const now = new Date(gameNow()), t = new Date(gameNow() + h * 3600000);
            const diff = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
            return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0') + (diff > 0 ? ` (H+${diff})` : '');
        }
        async function updateRouteEstimate(prefix) {
            const box = document.getElementById(prefix + '-route-estimate');
            if (!box) return;
            const spbuSel = document.getElementById(prefix + '-spbu-select');
            const truckSel = document.getElementById(prefix + '-truck-select');
            const spbu = spbuSel && loadedSpbuList.find(s => s.kode === spbuSel.value);
            const truck = truckSel && companyFleet.find(t => t.id === truckSel.value);
            if (!spbu || !truck) {
                routeEstimateSeq[prefix]++; box.innerHTML = prefix === 'lpg' ? 'Menunggu rencana pengiriman LPG otomatis.' : 'Menunggu rencana pengiriman BBM otomatis.';
                return;
            }
            // Preview juga ikut jenis BBM yang dipilih (kalau ada), supaya kilang/depo asal yang ditampilkan
            // sama dengan yang benar-benar dipakai saat dispatch (lihat FUEL_KAP_KEY di dispatchToSpbu).
            const fuelSel = document.getElementById(prefix + '-fuel-type');
            const fBBMPrev = fuelSel && FUELS.find(x => x.label === fuelSel.value);
            const kapKeyPrev = fBBMPrev && FUEL_KAP_KEY[fBBMPrev.id];
            const origin = pickOrigin(truck.type, spbu, truck.cap, truck, truck.type === 'LPG' ? 'lpg_tabung' : kapKeyPrev);
            if (!origin) {
                const wb = truckWilayahBlock(truck, spbu, truck.type);
                box.innerHTML = `<span class="text-amber-400">${wb ? esc(wb) : 'Depo pangkalan truk tidak punya stok yang cukup untuk kombinasi ini.'}</span>`;
                return;
            }

            const mySeq = ++routeEstimateSeq[prefix];
            box.innerHTML = '<span class="text-gray-500">Menghitung rute...</span>';

            // ---- 1) Susun ruas perjalanan persis seperti journey(): darat, atau darat -> ferry -> darat bila beda pulau ----
            const legs = [];
            let allReal = true, depPort = null, arrPort = null;
            try {
                const addLand = async (a, b) => {
                    const { pts, real } = await fetchRoute(a, b);
                    const s = sinuosityOf(pts, distKm(a, b));
                    legs.push({ tipe: 'darat', dari: a.nama || a.name, ke: b.nama || b.name, km: s.total, speed: roadSpeedKmh(s.sinuosity, real, unitLaju(truck)), real, sin: s.sinuosity });
                    if (!real) allReal = false;
                };
                const oIsl = islandOf(origin), dIsl = islandOf(spbu);
                if (oIsl === dIsl) await addLand(origin, spbu);
                else {
                    depPort = getPort(oIsl, dIsl); arrPort = getPort(dIsl, oIsl);
                    await addLand(origin, depPort);
                    legs.push({ tipe: 'ferry', dari: depPort.name, ke: arrPort.name, km: distKm(depPort, arrPort), speed: AVG_FERRY_SPEED_KMH, real: true });
                    await addLand(arrPort, spbu);
                }
            } catch (err) {
                if (mySeq === routeEstimateSeq[prefix]) box.innerHTML = '<span class="text-amber-400">Gagal menghitung rute, coba pilih ulang armada/SPBU.</span>';
                return;
            }
            if (mySeq !== routeEstimateSeq[prefix]) return; // sudah ada permintaan estimasi lain yang lebih baru, buang hasil ini

            // ---- 2) Waktu (jam-game). Detik nyata -> jam-game: detik x GAME_SPEED / 3600 ----
            const GS = GAME_SPEED, rH = sec => sec * GS / 3600, realSecOf = h => h * 3600 / GS;
            const landLegs = legs.filter(l => l.tipe === 'darat'), ferryLegs = legs.filter(l => l.tipe === 'ferry');
            const kmTotal = legs.reduce((a, l) => a + l.km, 0), landKm = landLegs.reduce((a, l) => a + l.km, 0), ferryKm = ferryLegs.reduce((a, l) => a + l.km, 0);
            const landH = landLegs.reduce((a, l) => a + l.km / l.speed, 0), ferryH = ferryLegs.reduce((a, l) => a + l.km / l.speed, 0);
            const antreH = depPort ? rH(FERRY_QUEUE_SEC * 2) : 0;                 // antre naik + antre turun kapal
            const pergiH = landH + ferryH + antreH, pulangH = pergiH;
            const muatH = rH(LOAD_SECONDS), bongkarH = rH(UNLOAD_SECONDS);
            const siklusH = muatH + pergiH + bongkarH + pulangH;
            const speedRata = pergiH > 0 ? kmTotal / pergiH : 0;
            const sinMax = landLegs.reduce((a, l) => Math.max(a, l.sin || 0), 0);
            const karakterJalan = !allReal ? 'rute perkiraan (server rute tidak merespons)' : sinMax >= 1.22 ? 'berkelok-kelok / banyak rintangan' : sinMax >= 1.12 ? 'sedikit berkelok' : 'renggang & relatif lurus';

            // ---- 3) Skenario kecepatan (kecepatan darat berfluktuasi di rentang SPEED_RANGE saat jalan) ----
            const skenario = [
                { nm: 'Optimis', ic: 'fa-gauge-high', cls: 'text-emerald-400', sp: SPEED_RANGE[1] },
                { nm: 'Realistis', ic: 'fa-gauge', cls: 'text-gray-200', sp: null },
                { nm: 'Pesimis', ic: 'fa-gauge-simple', cls: 'text-amber-400', sp: SPEED_RANGE[0] }
            ].map(sc => {
                const oneWay = (sc.sp ? landKm / sc.sp : landH) + ferryH + antreH;
                return { ...sc, oneWay, tiba: muatH + oneWay, balik: muatH + oneWay * 2 + bongkarH, spTxt: sc.sp ? sc.sp + ' km/j' : Math.round(landKm / (landH || 1)) + ' km/j' };
            });

            // ---- 4) Keuangan: rumus sama dengan completeUnloading() ----
            const hargaPerUnit = truck.type === 'LPG' ? ECO.jualTon : hargaJualKl(fBBMPrev && fBBMPrev.id);
            const unitLabel = truck.type === 'LPG' ? 'Ton' : 'KL';
            const revenueDasar = truck.cap * hargaPerUnit;
            const jarakBonusKm = Math.max(0, Math.min(kmTotal, ECO.jarakBonusCapKm) - ECO.jarakBonusMinKm);
            const bonusJarak = Math.round(revenueDasar * ECO.bonusJarakPerKm * jarakBonusKm);
            const revenueKotor = revenueDasar + bonusJarak;
            const bonusPesananEst = Math.round(revenueDasar * ECO.bonusPesanan);
            const biayaKirimDasar = Math.round(truck.cap * (truck.type === 'LPG' ? ECO.biayaKirimTon : ECO.biayaKirimKl));
            const kmPP = kmTotal * 2;
            const literPP = kmPP / kmPerLiterTruk(truck);
            const totalPP = Math.round(literPP * HARGA_SOLAR_TRUK);
            const biayaAsuransi = Math.round(revenueDasar * ECO.asuransiPersen);
            const totalBiaya = biayaKirimDasar + totalPP + biayaAsuransi;
            const bersih = revenueKotor - totalBiaya;
            const bersihPlus = bersih + bonusPesananEst;
            const margin = revenueKotor > 0 ? bersih / revenueKotor * 100 : 0;
            const perJam = siklusH > 0 ? bersih / siklusH : 0;
            const perKm = kmPP > 0 ? bersih / kmPP : 0;

            // ---- 5) Pemeriksaan kelayakan ----
            const cek = []; // { s: 'ok'|'warn'|'bad', t }
            const siklusMs = siklusH * 3600000;
            const docs = [['KIR', truck.kirTs], ['STNK', truck.stnkTs], ['Plat', truck.platTs]].filter(d => d[1]);
            const docBad = docs.filter(d => d[1] - gameNow() <= 0), docMid = docs.filter(d => d[1] - gameNow() > 0 && d[1] - gameNow() <= siklusMs), docSoon = docs.filter(d => d[1] - gameNow() > siklusMs && d[1] - gameNow() < 30 * 86400000);
            if (docBad.length) cek.push({ s: 'bad', t: `${docBad.map(d => d[0]).join('/')} sudah kedaluwarsa - truk tidak bisa jalan.` });
            else if (docMid.length) cek.push({ s: 'warn', t: `${docMid.map(d => d[0]).join('/')} habis masa berlaku sebelum truk kembali (berisiko denda).` });
            else if (docSoon.length) cek.push({ s: 'warn', t: `${docSoon.map(d => d[0]).join('/')} akan habis <30 hari - segera perpanjang.` });
            else if (docs.length) cek.push({ s: 'ok', t: 'Dokumen KIR, STNK & Plat aman sampai truk kembali.' });
            const ban0 = truck.banPct != null ? truck.banPct : 100, wear = kmPP * TIRE_WEAR_PER_KM * tireWearMult(truck), ban1 = Math.max(0, ban0 - wear);
            cek.push({ s: ban1 <= TIRE_REPLACE_THRESHOLD ? 'warn' : 'ok', t: `Ban ${Math.round(ban0)}% &rarr; ±${Math.round(ban1)}% setelah PP (aus ±${wear.toFixed(1)}%)${ban1 <= TIRE_REPLACE_THRESHOLD ? ' - diganti otomatis di depo' : ''}.` });
            const ord = orders.find(o => o.kode === spbu.kode && isOrderDispatchable(o) && (prefix === 'lpg' ? o.fuel === 'lpg' : o.fuel !== 'lpg') && (!fBBMPrev || o.fuel === fBBMPrev.id))
                || orders.find(o => o.kode === spbu.kode && isOrderDispatchable(o) && (prefix === 'lpg' ? o.fuel === 'lpg' : o.fuel !== 'lpg'));
            if (ord) {
                const sisa = Math.max(0, Math.round((ord.kl - ord.terkirim - (ord.inTransit || 0)) * 10) / 10);
                const tutup = sisa > 0 ? Math.min(100, Math.round(truck.cap / sisa * 100)) : 100;
                cek.push({ s: 'ok', t: `Pesanan #${ord.id}: sisa ${sisa} ${unitLabel}, truk ini menutup ±${tutup}%${tutup < 100 ? ' (butuh unit tambahan)' : ' (tuntas)'}.` });
                const leftMs = ORDER_TTL - (Date.now() - ord.t), tibaRealMs = (muatH + pergiH) * 3600000 / GS;
                if (leftMs <= tibaRealMs) cek.push({ s: 'bad', t: `Pesanan hangus dalam ${fmtDurGame(leftMs * GS / 3600000)}, truk baru tiba ${fmtDurGame(muatH + pergiH)} lagi.` });
                else cek.push({ s: leftMs - tibaRealMs < leftMs * 0.2 ? 'warn' : 'ok', t: `Batas pesanan ${fmtDurGame(leftMs * GS / 3600000)} lagi, truk tiba dalam ${fmtDurGame(muatH + pergiH)} (sisa waktu ${fmtDurGame((leftMs - tibaRealMs) * GS / 3600000)}).` });
            }
            if (depPort) cek.push({ s: 'ok', t: `Antar pulau (${islandOf(origin)} &rarr; ${islandOf(spbu)}): wajib lewat ferry ${esc(depPort.name)} &rarr; ${esc(arrPort.name)}, antre ±${FERRY_QUEUE_SEC * 2} dtk nyata.` });
            const ico = { ok: 'fa-circle-check text-emerald-400', warn: 'fa-triangle-exclamation text-amber-400', bad: 'fa-circle-xmark text-red-400' };

            // ---- 6) Render ----
            const row = (l, v, c) => `<div class="flex justify-between gap-2"><span>${l}</span><span class="${c || 'text-gray-300'} font-mono text-right">${v}</span></div>`;
            const head = t => `<div class="mt-1.5 pt-1 border-t border-gray-800 text-[9px] font-bold uppercase tracking-wide text-gray-500">${t}</div>`;
            const segs = [
                { nm: 'Muat', h: muatH, c: 'bg-amber-500' }, { nm: 'Pergi', h: pergiH, c: 'bg-emerald-500' },
                { nm: 'Bongkar', h: bongkarH, c: 'bg-violet-500' }, { nm: 'Pulang', h: pulangH, c: 'bg-sky-500' }
            ];
            const bar = `<div class="flex h-2 rounded overflow-hidden mt-1 mb-1">${segs.map(x => `<div class="${x.c}" style="width:${Math.max(3, x.h / siklusH * 100).toFixed(1)}%" title="${x.nm}: ${fmtDurGame(x.h)}"></div>`).join('')}</div>`;
            const legRows = legs.map(l => `<div class="flex justify-between gap-2 pl-2"><span class="truncate"><i class="fa-solid ${l.tipe === 'ferry' ? 'fa-ship text-cyan-400' : 'fa-road text-gray-500'} mr-1"></i>${esc(l.dari)} &rarr; ${esc(l.ke)}</span><span class="text-gray-300 font-mono shrink-0">${Math.round(l.km)} km &middot; ${Math.round(l.speed)} km/j &middot; ${fmtDurGame(l.km / l.speed)}</span></div>`).join('');

            box.innerHTML = `
                <div class="flex justify-between gap-2"><span>Asal &rarr; Tujuan</span><span class="text-gray-300 font-semibold text-right">${esc(origin.nama)} &rarr; ${esc(spbu.nama)}</span></div>
                <div class="flex flex-wrap gap-1 mt-1">
                    <span class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">${truck.id} &middot; ${truck.cap} ${unitLabel}</span>
                    <span class="px-1.5 py-0.5 rounded ${depPort ? 'bg-cyan-900/60 text-cyan-300' : 'bg-gray-800 text-gray-300'}">${depPort ? 'Antar pulau (ferry)' : 'Satu pulau'}</span>
                    <span class="px-1.5 py-0.5 rounded ${allReal ? 'bg-emerald-900/50 text-emerald-300' : 'bg-amber-900/50 text-amber-300'}">${allReal ? 'Rute jalan nyata' : 'Rute perkiraan'}</span>
                </div>
                ${head('Rute &amp; Jarak')}
                ${legRows}
                ${row('Jarak 1 arah / PP', `&plusmn;${Math.round(kmTotal)} km / &plusmn;${Math.round(kmPP)} km${ferryKm ? ` (ferry ${Math.round(ferryKm)} km)` : ''}`)}
                ${row('Kondisi jalan', `${karakterJalan} &middot; rata-rata ${Math.round(speedRata)} km/j`)}
                ${head('Linimasa Siklus (waktu game &middot; ≈ waktu nyata)')}
                ${bar}
                ${row('<span class="text-amber-400">&#9632;</span> Muat di depo', `${fmtDurGame(muatH)} &middot; ${fmtRealSec(LOAD_SECONDS)}`)}
                ${row('<span class="text-emerald-400">&#9632;</span> Perjalanan pergi', `${fmtDurGame(pergiH)} &middot; ${fmtRealSec(realSecOf(pergiH))}`)}
                ${row('<span class="text-violet-400">&#9632;</span> Bongkar di tujuan', `${fmtDurGame(bongkarH)} &middot; ${fmtRealSec(UNLOAD_SECONDS)}`)}
                ${row('<span class="text-sky-400">&#9632;</span> Perjalanan pulang', `${fmtDurGame(pulangH)} &middot; ${fmtRealSec(realSecOf(pulangH))}`)}
                ${row('<b>Total satu siklus</b>', `<b>${fmtDurGame(siklusH)} &middot; ${fmtRealSec(realSecOf(siklusH))}</b>`, 'text-white')}
                ${row('Perkiraan tiba di SPBU', etaClock(muatH + pergiH), 'text-emerald-300')}
                ${row('Perkiraan truk kembali ke depo', etaClock(siklusH), 'text-sky-300')}
                ${head('Skenario Kecepatan Darat')}
                ${skenario.map(sc => row(`<i class="fa-solid ${sc.ic} mr-1 ${sc.cls}"></i>${sc.nm} (${sc.spTxt})`, `tiba ${fmtDurGame(sc.tiba)} (${etaClock(sc.tiba)}) &middot; balik ${etaClock(sc.balik)}`, sc.cls)).join('')}
                ${head('Keuangan (per pengiriman)')}
                ${row(`Pendapatan dasar (${truck.cap} ${unitLabel})`, formatRupiah(revenueDasar), 'text-emerald-400')}
                ${row(`Bonus jarak${jarakBonusKm > 0 ? ` (+${Math.round(jarakBonusKm)} km di atas ${ECO.jarakBonusMinKm} km)` : ` (di bawah ${ECO.jarakBonusMinKm} km)`}`, '+' + formatRupiah(bonusJarak), 'text-emerald-400')}
                ${row('Pendapatan kotor', formatRupiah(revenueKotor), 'text-emerald-400')}
                ${row('Biaya kirim dasar', '-' + formatRupiah(biayaKirimDasar), 'text-red-400')}
                ${row(`Solar PP est. (±${Math.round(literPP).toLocaleString('id-ID')} L &times; ${formatRupiah(HARGA_SOLAR_TRUK)}, dibayar di pom bensin &middot; tangki ${truckTankL(truck)} L)`, '-' + formatRupiah(totalPP), 'text-red-400')}
                ${row(`Asuransi (${(ECO.asuransiPersen * 100).toLocaleString('id-ID')}% nilai muatan)`, '-' + formatRupiah(biayaAsuransi), 'text-red-400')}
                <div class="flex justify-between border-t border-gray-800 mt-1 pt-1"><span class="font-bold text-gray-300">Estimasi pendapatan bersih</span><span class="font-bold ${bersih >= 0 ? 'text-emerald-300' : 'text-red-400'} font-mono">${formatRupiah(bersih)}</span></div>
                ${row('Jika pesanan tuntas (bonus +' + Math.round(ECO.bonusPesanan * 100) + '%)', formatRupiah(bersihPlus), 'text-emerald-300')}
                ${row('Margin bersih / kotor', margin.toFixed(1) + '%', margin >= 0 ? 'text-gray-300' : 'text-red-400')}
                ${row('Laba per jam game / per km PP', `${formatRupiah(perJam)} / ${formatRupiah(perKm)}`)}
                ${head('Pemeriksaan Kelayakan')}
                ${cek.map(c => `<div class="flex gap-1.5 items-start"><i class="fa-solid ${ico[c.s]} mt-0.5"></i><span class="text-gray-300">${c.t}</span></div>`).join('')}
                <div class="text-[9px] text-gray-500 pt-1">*Perkiraan: kecepatan darat sebenarnya naik-turun di rentang ${SPEED_RANGE[0]}-${SPEED_RANGE[1]} km/j; bonus pesanan hanya cair bila pesanan tuntas, dan denda dokumen/pelanggaran kru (bisa mengurangi) baru pasti setelah bongkar muatan.</div>`;
        }

        function distKm(a, b) {
            const rad = x => x * Math.PI / 180;
            const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
            return 12742 * Math.asin(Math.sqrt(h));
        }

        // ===== AKSES PELABUHAN: SATU SUMBER KEBENARAN = field `berth` =====
        // Tiap Kilang/Depo/Anjungan punya field `berth` = id node dermaga di SEA_NODES (07a-rute-laut.js),
        // atau null kalau tidak punya dermaga (hanya bisa dilayani jalur darat). Tidak ada lagi deteksi
        // otomatis lewat jarak ke kota pesisir atau pencocokan nama - dua cara itu pernah saling bertentangan.
        function isCoastal(entity) {
            return !!(entity && entity.berth);
        }

        // ===== PENYEBERANGAN FERRY ANTAR PULAU =====
        // Deteksi pulau dari nama/provinsi (kilang, depo, maupun SPBU) - dipakai untuk menentukan apakah
        // sebuah pengiriman perlu naik kapal ferry (Jawa <-> Bali/Kalimantan/Sulawesi).
        function islandOfName(txt) {
            const t = String(txt || '').toLowerCase();
            if (/\bbali\b/.test(t)) return 'Bali';
            if (/sulawesi|sul(ut|teng|bar|sel|tra)|manado|bitung|palu|mamuju|makassar|kendari|parepare|gowa|maros/.test(t)) return 'Sulawesi';
            if (/kalimantan|kal(tim|sel|bar|teng|tara)|balikpapan|samarinda|banjarmasin|banjarbaru|pontianak|singkawang|palangka|sampit|bontang|tarakan/.test(t)) return 'Kalimantan';
            return 'Jawa';
        }
        const islandOf = e => islandOfName(`${e.provinsi || ''} ${e.nama || ''} ${e.region || ''}`);
        // Pelabuhan penyeberangan (nama & koordinat mengikuti OpenStreetMap) - satu entri per rute tujuan pulau.
        const PORTS = {
            Jawa: [
                { name: 'Pelabuhan ASDP Ketapang, Banyuwangi', lat: -8.1247, lon: 114.3903, ke: 'Bali' },
                { name: 'Pelabuhan Tanjung Perak, Surabaya', lat: -7.1978, lon: 112.7378, ke: 'Kalimantan' },
                { name: 'Pelabuhan Tanjung Perak, Surabaya', lat: -7.1978, lon: 112.7378, ke: 'Sulawesi' }
            ],
            Bali: [{ name: 'Pelabuhan ASDP Gilimanuk, Bali', lat: -8.1594, lon: 114.4364, ke: 'Jawa' }],
            Kalimantan: [{ name: 'Pelabuhan Trisakti, Banjarmasin', lat: -3.3208, lon: 114.5875, ke: 'Jawa' }],
            Sulawesi: [{ name: 'Pelabuhan Soekarno-Hatta, Makassar', lat: -5.1289, lon: 119.4022, ke: 'Jawa' }]
        };
        function getPort(island, towardIsland) {
            const list = PORTS[island] || PORTS.Jawa;
            return list.find(p => p.ke === towardIsland) || list[0];
        }

        const AVG_FERRY_SPEED_KMH = 25; // kecepatan rata-rata kapal ferry RoRo
        const FERRY_QUEUE_SEC = 15; // waktu nyata (detik) antre naik/turun kapal di pelabuhan
        const AVG_SHIP_SPEED_KMH = 22; // kecepatan rata-rata kapal tanker niaga (kargo curah) - lebih pelan dari ferry RoRo
        const UNLOAD_SECONDS_KAPAL = 90; // waktu nyata (detik) bongkar-muat curah kapal tanker di pelabuhan, lebih lama dari truk

        // ===== JEDA OTOMATIS SEMUA PERJALANAN SAAT TAB/WINDOW TIDAK AKTIF =====
        // vNow() adalah "jam virtual" yang dipakai khusus untuk animasi jalan truk/kapal (posisi di peta).
        // Berhenti bertambah selagi tab disembunyikan, lalu lanjut normal (bukan mengejar) saat tab aktif lagi.
        let hiddenAccum = 0, hideStartedAt = document.hidden ? Date.now() : null;
        function vNow() { return (hideStartedAt || Date.now()) - hiddenAccum; }
        // travelTimers: daftar timer "antre pelabuhan" & "bongkar-muat" yang sedang berjalan, supaya ikut
        // dijeda/dilanjutkan manual (setTimeout biasa tidak otomatis berhenti saat tab disembunyikan).
        const travelTimers = new Set();
        // Sinkronkan jam virtual & timer perjalanan dengan status berhenti (tab tersembunyi ATAU jeda manual).
        function syncTravelSuspend() {
            if (isSuspended()) {
                if (!hideStartedAt) hideStartedAt = Date.now();
                travelTimers.forEach(tm => tm.pause());
            } else if (hideStartedAt) {
                hiddenAccum += Date.now() - hideStartedAt;
                hideStartedAt = null;
                travelTimers.forEach(tm => tm.resume());
            }
        }
        document.addEventListener('visibilitychange', syncTravelSuspend);
        // Pengganti setTimeout yang bisa dijeda - dipakai untuk antre pelabuhan & waktu bongkar-muat.
        function pausableDelay(ms) {
            return new Promise(resolve => {
                let remaining = ms, handle = null, lastStart = null;
                const timer = {
                    pause() { if (handle) { clearTimeout(handle); remaining -= Date.now() - lastStart; handle = null; } },
                    resume() { if (!handle) { lastStart = Date.now(); handle = setTimeout(() => { travelTimers.delete(timer); resolve(); }, Math.max(0, remaining)); } }
                };
                travelTimers.add(timer);
                if (!isSuspended()) timer.resume();
            });
        }
        const sleep = ms => pausableDelay(ms);

        // Truk berangkat dari kilang/depo aktif terdekat yang cocok dengan jenis muatan
        const stokNeed = (k, cap) => k.unit === 'Bbl' ? Math.ceil(cap * ECO.bblPerKl) : cap;
        // ===== ATURAN WILAYAH: truk hanya boleh melayani SPBU yang wilayahnya dilayani depo PANGKALAN truk itu =====
        // (mis. truk pangkalan Semarang TIDAK boleh mengambil pesanan wilayah Tuban, dan sebaliknya). Pemetaan wilayah -> depo
        // tetap (COVER_BBM/COVER_LPG di 04-produksi-logistik.js, hasilnya di spbu.wilayahBbmId / wilayahLpgId).
        const truckDepoId = t => (t && t.depotId) || 'KILANG-01';
        const spbuDepoId = (spbu, type) => spbu ? (type === 'LPG' ? spbu.wilayahLpgId : spbu.wilayahBbmId) : null;
        const depoNamaOf = id => { const k = refineryData.find(x => x.id === id); return k ? k.nama : (id || '-'); };
        function truckWilayahBlock(truck, spbu, type) {
            if (!truck || !spbu || !isSpbuTruck(truck)) return null;
            const wid = spbuDepoId(spbu, type || truck.type), tid = truckDepoId(truck);
            if (!wid) return `${spbu.nama} belum masuk jangkauan depo aktif untuk jenis ini.`;
            if (wid === tid) return null;
            return `${truck.id} berpangkalan di ${depoNamaOf(tid)}, sedangkan ${spbu.nama} (${spbu.region}) masuk wilayah ${depoNamaOf(wid)}. Truk hanya boleh melayani pesanan di wilayah depo pangkalannya - pindahkan pangkalan truk ke ${depoNamaOf(wid)} atau pakai truk yang berpangkalan di sana.`;
        }
        function pickOrigin(type, spbu, cap, truck, kapKey) {
            // Untuk BBM: kalau kapKey (jenis BBM yang dipesan) diketahui, kilang/depo baru dianggap "cukup stok"
            // jika tangki produk jadi jenis ITU (kap[kapKey].cur) mencukupi - bukan stok BBL mentah (stok_current),
            // karena BBL mentah & BBM jadi per-jenis adalah dua pool stok yang berbeda.
            const cukupBBM = k => !kapKey ? k.stok_current >= stokNeed(k, cap) : !!(k.kap && k.kap[kapKey] && k.kap[kapKey].cur >= cap);
            const ok = refineryData.filter(k => k.is_unlocked && (k.tipe.includes('Pusat') || k.tipe.includes(type)) && (!cap || (type === 'BBM' ? cukupBBM(k) : (type === 'LPG' && kapKey) ? !!(k.kap && k.kap[kapKey] && k.kap[kapKey].cur >= cap) : true)));
            // URUTAN PRIORITAS ASAL BERANGKAT:
            //  1) Depo PANGKALAN truk itu sendiri (truck.depotId) - unit yang sudah ada di depo/cabang berangkat dari sana,
            //     BUKAN dari kilang wilayah SPBU (dulu wilayah didahulukan, sehingga truk cabang malah berangkat dari Tuban).
            //  2) Kalau depo pangkalan tidak memenuhi syarat (stok jenis produk kurang / tidak melayani jenis ini),
            //     baru pakai depo wilayah SPBU untuk jenis produk ini (lihat recomputeWilayah()).
            //  3) Terakhir, depo terdekat yang memenuhi syarat.
            // Truk SPBU: WAJIB berangkat dari depo pangkalannya dan hanya untuk SPBU di wilayah depo itu (tidak ada lagi jatuh ke depo lain).
            if (truck && isSpbuTruck(truck)) { if (truckWilayahBlock(truck, spbu, type)) return null; return ok.find(k => k.id === truckDepoId(truck)) || null; }
            if (truck && truck.depotId) { const home = ok.find(k => k.id === truck.depotId); if (home) return home; }
            const wilayahId = type === 'LPG' ? spbu.wilayahLpgId : spbu.wilayahBbmId;
            if (wilayahId) { const near = ok.find(k => k.id === wilayahId); if (near) return near; }
            return ok.reduce((best, k) => (!best || distKm(k, spbu) < distKm(best, spbu)) ? k : best, null);
        }

        // Beri tahu pemain kalau truk TIDAK berangkat dari depo pangkalannya (mis. stok produk di depo itu kurang).
        function notifyAsalBeda(truck, origin, jenis) {
            if (!truck || !origin || !truck.depotId || truck.depotId === origin.id) return;
            const home = refineryData.find(k => k.id === truck.depotId);
            const msg = `${truck.id} berpangkalan di ${home ? home.nama : '-'}, tapi stok ${jenis} di sana kurang, jadi muatan diambil dari ${origin.nama}.`;
            addLog('ASAL BERANGKAT: ' + msg, 'warning', 'truck'); notify(msg, 'warn');
        }

        // Cadangan bila layanan rute tidak terjangkau: jalur berkelok perkiraan (bukan garis lurus)
        function windingPath(o, d) {
            const n = 90, dx = d.lon - o.lon, dy = d.lat - o.lat, len = Math.hypot(dx, dy) || 1e-4;
            const px = -dy / len, py = dx / len, amp = len * 0.07, ph = Math.random() * 6, out = [];
            for (let i = 0; i <= n; i++) {
                const t = i / n, off = Math.sin(t * Math.PI) * amp * (Math.sin(t * 14 + ph) + 0.5 * Math.sin(t * 31 + ph * 2));
                out.push([o.lat + dy * t + py * off, o.lon + dx * t + px * off]);
            }
            return out;
        }

        // Ambil satu jalur nyata apa adanya dari OSRM (tanpa opsi tol/non-tol - fitur itu sudah dihapus),
        // supaya jalur yang digambar/dianimasikan di peta selalu konsisten dengan yang dipakai untuk
        // menghitung jarak, kecepatan & durasi (lihat sinuosityOf/roadSpeedKmh) - benar-benar mengikuti
        // rintangan/kelokan jalur asli yang dilalui, bukan direkayasa jadi 2 gaya rute berbeda.
        //
        // FIX BUG "makin banyak unit, rute makin ngawur": server OSRM publik membatasi jumlah request per detik.
        // Sebelumnya tiap truk yang berangkat langsung menembak request sendiri-sendiri (dan kalau 1x gagal/timeout
        // langsung jatuh ke rute perkiraan yang berkelok palsu menembus hutan/laut). Makin banyak unit berangkat
        // bersamaan -> makin banyak yang kena batas -> makin banyak rute palsu. Rute PULANG normal karena baru
        // diminta belasan detik kemudian saat "hujan request" sudah reda. Sekarang:
        //  1) request diantre & dijarangkan (min. jeda antar request),
        //  2) request rute yang sama yang sedang berjalan digabung (tidak dobel),
        //  3) gagal -> coba lagi beberapa kali dengan jeda bertahap, selang-seling ke server cadangan,
        //  4) rute pergi otomatis juga disimpan untuk rute pulang (dibalik) -> menghemat request,
        //  5) rute perkiraan palsu hanya dipakai kalau SEMUA percobaan gagal.
        const routeInflight = new Map();
        const ROUTE_HOSTS = [
            (o, d) => `https://router.project-osrm.org/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=geojson`,
            (o, d) => `https://routing.openstreetmap.de/routed-car/route/v1/driving/${o.lon},${o.lat};${d.lon},${d.lat}?overview=full&geometries=geojson`
        ];
        const ROUTE_MIN_GAP_MS = 450, ROUTE_MAX_TRY = 5;
        let routeSlotTail = Promise.resolve(), routeLastStart = 0;
        function nextRouteSlot() {
            routeSlotTail = routeSlotTail.then(async () => {
                const wait = routeLastStart + ROUTE_MIN_GAP_MS - Date.now();
                if (wait > 0) await new Promise(r => setTimeout(r, wait));
                routeLastStart = Date.now();
            });
            return routeSlotTail;
        }
        // ===== CACHE RUTE PERMANEN (IndexedDB) =====
        // routeCache hanya di memori -> hilang tiap refresh, dan saat WiFi mati semua rute yang belum di-cache jadi "rute perkiraan".
        // Sekarang tiap rute jalan NYATA (hasil server rute) juga disimpan di IndexedDB browser, lalu dimuat lagi saat game dibuka.
        // Rute pulang (dibalik) diturunkan otomatis saat dimuat, jadi tidak perlu disimpan dua kali. Maks ROUTE_DB_MAX rute (yang terlama dibuang).
        const ROUTE_DB_MAX = 600;
        let routeDbPuts = 0;
        const routeDbOpen = () => new Promise(res => {
            try {
                const rq = indexedDB.open('pmid_routes', 1);
                rq.onupgradeneeded = () => { const st = rq.result.createObjectStore('r', { keyPath: 'k' }); st.createIndex('ts', 'ts'); };
                rq.onsuccess = () => res(rq.result);
                rq.onerror = rq.onblocked = () => res(null);
            } catch (e) { res(null); }
        });
        const routeDbReady = (async () => {
            const db = await routeDbOpen(); if (!db) return 0;
            return await new Promise(res => {
                try {
                    const rq = db.transaction('r').objectStore('r').getAll();
                    rq.onsuccess = () => {
                        let n = 0;
                        (rq.result || []).forEach(r => {
                            if (!r || !r.k || !Array.isArray(r.pts) || r.pts.length < 2) return;
                            if (!routeCache.has(r.k)) { routeCache.set(r.k, { pts: r.pts, real: true }); n++; }
                            const [a, b] = r.k.split('|'), rk = b + '|' + a;
                            if (!routeCache.has(rk)) routeCache.set(rk, { pts: r.pts.slice().reverse(), real: true });
                        });
                        res(n);
                    };
                    rq.onerror = () => res(0);
                } catch (e) { res(0); }
            });
        })();
        function routeDbPut(key, res) {
            if (!res || !res.real) return;
            routeDbOpen().then(db => {
                if (!db) return;
                try {
                    const pts = res.pts.map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5]);
                    const st = db.transaction('r', 'readwrite').objectStore('r');
                    st.put({ k: key, pts, ts: Date.now() });
                    if (++routeDbPuts % 25 === 0) {   // pangkas berkala: buang rute terlama bila melebihi batas
                        st.count().onsuccess = e => {
                            let extra = e.target.result - ROUTE_DB_MAX; if (extra <= 0) return;
                            st.index('ts').openCursor().onsuccess = ev => { const c = ev.target.result; if (c && extra-- > 0) { c.delete(); c.continue(); } };
                        };
                    }
                } catch (err) { /* IndexedDB diblokir/penuh: abaikan, cache memori tetap jalan */ }
            });
        }
        routeDbReady.then(n => { if (n > 0) console.info('[rute] ' + n + ' rute jalan dimuat dari penyimpanan browser.'); });

        async function fetchRoute(o, d) {
            const key = `${o.lat},${o.lon}|${d.lat},${d.lon}`;
            if (routeCache.has(key)) return routeCache.get(key);
            if (routeInflight.has(key)) return routeInflight.get(key);
            const job = (async () => {
                await Promise.race([routeDbReady, new Promise(r => setTimeout(r, 1500))]);   // beri kesempatan cache permanen terbaca dulu
                if (routeCache.has(key)) return routeCache.get(key);
                for (let attempt = 0; attempt < ROUTE_MAX_TRY; attempt++) {
                    // Sedang offline: jangan buang ~10 detik mencoba server rute yang pasti gagal - langsung pakai rute perkiraan.
                    if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
                    await nextRouteSlot();
                    try {
                        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
                        const r = await fetch(ROUTE_HOSTS[attempt % ROUTE_HOSTS.length](o, d), { signal: ctl.signal });
                        clearTimeout(t);
                        const j = await r.json().catch(() => null);
                        if (j && j.code === 'Ok' && j.routes && j.routes[0]) {
                            const pts = j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                            const res = { pts, real: true };
                            routeCache.set(key, res);
                            routeDbPut(key, res);
                            const rkey = `${d.lat},${d.lon}|${o.lat},${o.lon}`;
                            if (!routeCache.has(rkey)) routeCache.set(rkey, { pts: pts.slice().reverse(), real: true });
                            return res;
                        }
                        if (j && j.code === 'NoRoute') break; // memang tidak ada jalan, tidak perlu diulang
                    } catch (e) { /* coba lagi */ }
                    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
                }
                return { pts: windingPath(o, d), real: false }; // benar-benar gagal semua -> rute perkiraan (tidak di-cache)
            })();
            routeInflight.set(key, job);
            try { return await job; } finally { routeInflight.delete(key); }
        }

        function posAt(pts, cum, sd) {
            let lo = 0, hi = cum.length - 1;
            while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= sd) lo = m; else hi = m; }
            const f = Math.min(1, Math.max(0, (sd - cum[lo]) / ((cum[hi] - cum[lo]) || 1e-9)));
            return { i: lo, ll: [pts[lo][0] + (pts[hi][0] - pts[lo][0]) * f, pts[lo][1] + (pts[hi][1] - pts[lo][1]) * f] };
        }

        function busyCheck(truck, driver, kernet) {
            const x = [[truck, 'Truk ' + truck.id], [driver, 'Supir ' + driver.name], [kernet, 'Kernet ' + kernet.name]].find(([o]) => busyIds.has(o.id));
            if (!x) return false;
            showModal('Masih Bertugas', `${x[1]} masih dalam perjalanan atau sedang bongkar muatan. Tunggu sampai selesai atau pilih yang lain.`, 'fa-truck-fast', 'red');
            return true;
        }

