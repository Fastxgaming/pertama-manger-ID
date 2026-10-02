        // ===== LAYAR LOADING & PLAY GAME (sebelum Daftar/Masuk) =====
        // Satu-satunya tempat untuk update nomor versi - otomatis tampil di layar loading & layar "Main Sekarang".
        const APP_VERSION = '1.9.0';
        (function showAppVersion() {
            const label = 'v' + APP_VERSION;
            const a = document.getElementById('app-version-loading'); if (a) a.textContent = label;
            const b = document.getElementById('app-version-splash'); if (b) b.textContent = label;
        })();
        // ===== STATUS JEDA PERMAINAN (tombol "Jeda" di header) =====
        // gamePaused = jeda manual dari pemain. isSuspended() = game berhenti, entah karena jeda manual
        // ATAU karena tab/window tidak aktif (perilaku lama). Dipakai jam game, animasi truk/kapal, dst.
        let gamePaused = false;
        const isSuspended = () => document.hidden || gamePaused;
        let loadingAnimDone = false, authChecked = false, loadingHidden = false;
        function hideLoadingOverlay() {
            if (loadingHidden) return;
            loadingHidden = true;
            const lo = document.getElementById('loading-overlay');
            if (lo) {
                lo.style.opacity = '0';
                lo.style.pointerEvents = 'none';
                setTimeout(() => lo.classList.add('hidden'), 450);
            }
        }
        function finishLoadingIfReady() {
            hideLoadingOverlay();
            // Selalu tampilkan layar "Main Sekarang" dulu, walau sesi login lama sudah otomatis dipulihkan Firebase.
            // Catatan: layar ini langsung tampil solid (TIDAK ikut di-fade transparan) supaya saat loading-overlay
            // memudar di atasnya, yang kelihatan di baliknya adalah layar "Main Sekarang" yang sudah utuh -
            // bukan sekilas tampilan in-game yang ada di lapisan paling bawah.
            const sp = document.getElementById('splash-overlay');
            if (sp) {
                sp.style.opacity = '1';
                sp.classList.remove('hidden');
                if (typeof renderSplashAccount === 'function') renderSplashAccount();
            }
        }
        function maybeFinish() { if (loadingAnimDone && authChecked) finishLoadingIfReady(); }
        // Fallback: kalau Firebase gagal merespons (mis. offline), jangan biarkan pemain terjebak di layar loading
        setTimeout(() => { if (!authChecked) { authChecked = true; maybeFinish(); } }, 8000);
        (function loadingSequence() {
            // Bar mengisi TERUS-MENERUS lewat requestAnimationFrame (bukan loncat per tahap seperti sebelumnya) -
            // label & persen di bawahnya cuma "menumpang" progres asli, jadi visualnya selalu mulus walau
            // teksnya berubah bertahap. Total durasi sengaja dibuat agak lama (±10 detik) biar tidak terburu-buru.
            const steps = [[15, 'Menyiapkan aset game'], [35, 'Memuat peta Nusantara'], [55, 'Menyiapkan armada & kilang'], [75, 'Menyinkronkan data SPBU'], [90, 'Menghubungkan ke server'], [100, 'Siap main!']];
            const bar = document.getElementById('loading-bar'), txt = document.getElementById('loading-text');
            const truck = document.getElementById('loading-truck'), pct = document.getElementById('loading-pct');
            const TOTAL_MS = 10000;
            const easeInOutQuad = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            let start = null, shownIdx = -1;
            function setLabel(idx) {
                if (idx === shownIdx) return;
                shownIdx = idx;
                const [, label] = steps[idx];
                txt.innerHTML = label + (idx < steps.length - 1 ? '<span class="loading-dot">.</span><span class="loading-dot">.</span><span class="loading-dot">.</span>' : '');
            }
            function frame(now) {
                if (start === null) start = now;
                const t = Math.min((now - start) / TOTAL_MS, 1);
                const p = easeInOutQuad(t) * 100;
                bar.style.width = p + '%';
                if (truck) truck.style.left = 'calc(' + p + '% - ' + (p >= 99.5 ? 16 : 8) + 'px)';
                if (pct) pct.textContent = Math.round(p) + '%';
                let idx = 0;
                for (let i = 0; i < steps.length; i++) { if (p + 0.5 >= steps[i][0]) idx = i; }
                setLabel(idx);
                if (t < 1) requestAnimationFrame(frame);
                else { loadingAnimDone = true; setTimeout(maybeFinish, 400); }
            }
            requestAnimationFrame(frame);
        })();
        // Overlay transisi halus (fade) supaya perpindahan layar tidak terasa "tiba-tiba"
        function coverScreen(afterCovered) {
            const t = document.getElementById('transition-overlay');
            t.classList.remove('hidden');
            void t.offsetWidth; // paksa reflow biar transisi opacity kepakai
            t.style.opacity = '1';
            setTimeout(afterCovered, 280);
        }
        function uncoverScreen() {
            setTimeout(() => {
                const t = document.getElementById('transition-overlay');
                t.style.opacity = '0';
                setTimeout(() => t.classList.add('hidden'), 300);
            }, 220);
        }
        // Ditekan dari tombol "Main Sekarang". Kalau sesi login lama sudah siap di latar belakang, langsung masuk game;
        // kalau belum ada sesi, baru tampilkan form Daftar Akun / Masuk.
        function handlePlayClick() {
            if (currentAccount) {
                // Sesi sudah siap: fade dulu sebelum masuk ke in-game, biar mulus
                coverScreen(() => {
                    document.getElementById('splash-overlay').classList.add('hidden');
                    document.getElementById('auth-overlay').classList.add('hidden');
                    maybeShowTutorial(false);
                    uncoverScreen();
                });
            } else {
                document.getElementById('splash-overlay').classList.add('hidden');
                document.getElementById('auth-overlay').classList.remove('hidden');
            }
        }
        function backToSplash() {
            if (typeof pendingCloudLoad !== 'undefined') pendingCloudLoad = false;
            if (typeof renderSplashAccount === 'function') renderSplashAccount();
            document.getElementById('auth-overlay').classList.add('hidden');
            document.getElementById('splash-overlay').classList.remove('hidden');
        }

        let companyCash = 650000000;
        // ===== EKONOMI (sesuaikan di sini) =====
        const ECO = { bblPerKl: 6.2898, jualKl: 4500000, jualTon: 4500000, hppTon: 2900000, bonusPesanan: 0.10, bonusJarakPerKm: 0.0025, asuransiPersen: 0.025, jarakBonusMinKm: 50, jarakBonusCapKm: 300, gajiSupir: [4500000, 30000], gajiKernet: [3500000, 20000], gajiMekanik: [4000000, 25000], gajiNahkoda: [6000000, 45000], gajiABK: [3800000, 22000], biayaKirimKl: 440000, biayaKirimTon: 625000, pajakOlahBbm: 0.03, pajakOlahLpg: 0.01, biayaTransferDaratBbl: 37500, jualKlPerJenis: { solar: 4500000, pertalite: 4700000, pertamax: 5600000, dex: 5400000, turbo: 6600000 } };
        // Harga jual BBM per KL menurut id jenis di FUELS (solar/pertalite/pertamax/dex/turbo). Id tak dikenal jatuh ke ECO.jualKl.
        const hargaJualKl = id => (ECO.jualKlPerJenis && ECO.jualKlPerJenis[id]) || ECO.jualKl;
        let totalIncome = 0;
        let totalExpense = 0;

        let loadedSpbuList = [];
        const isOp = s => s.is_approved && !s.blocked;
        let mapMarkers = [];
        let kilangMarkers = [];
        let pendingTruckPurchase = null;

        // DATA KILANG & DEPO
        let refineryData = [
            {
                id: 'KILANG-01',
                nama: 'Kilang Tuban',
                berth: 'TBb', // id node dermaga di SEA_NODES (07a-rute-laut.js). null = tidak punya dermaga
                tipe: 'Pusat Utama',
                lat: -6.812400,
                lon: 111.962100,
                is_unlocked: true,
                stok_current: 4000000, // pemain baru mulai dengan 80% tangki Tuban = 4 juta Bbl mentah dari kapasitas 5 juta (save lama memakai nilainya sendiri)
                stok_max: 5000000,
                unit: 'Bbl',
                harga_beli: 0,
                mekanikId: 'BUILTIN'
            },
            {
                id: 'KILANG-02',
                nama: 'TBBM Perak Surabaya',
                berth: 'SBb', // id node dermaga di SEA_NODES (07a-rute-laut.js). null = tidak punya dermaga
                tipe: 'Depo Cabang BBM',
                lat: -7.201400,
                lon: 112.728100,
                is_unlocked: false,
                stok_current: 0,
                stok_max: 100000,
                unit: 'Bbl',
                harga_beli: 30000000000,
                mekanikId: null
            },
            {
                id: 'KILANG-03',
                nama: 'Depo LPG Gresik',
                berth: 'SBb', // id node dermaga di SEA_NODES (07a-rute-laut.js). null = tidak punya dermaga
                tipe: 'Depo Cabang LPG',
                lat: -7.151200,
                lon: 112.651200,
                is_unlocked: false,
                stok_current: 0,
                stok_max: 20000,
                unit: 'Ton',
                harga_beli: 40000000000,
                mekanikId: null
            }
        ];

        // POOL 1: ARMADA (FISIK TRUK KENDARAAN)
        let companyFleet = [];

        // POOL 2: SDM PERSONEL DRIVER & KERNET (LENGKAP RATING & PELANGGARAN)
        let companyCrew = [];

        const rawSpbuData = [
          {
            "kabupaten_kota": "Ngawi (Perbatasan Barat)",
            "total_spbu": 5,
            "list_spbu": [
              {"kode": "JT-632-01", "nama": "SPBU Mantingan (Jalan Raya Solo-Ngawi)", "lat": -7.362145, "lon": 111.161042, "tipe": "DODO"},
              {"kode": "JT-632-22", "nama": "SPBU Rest Area KM 575 A Tol Solo-Ngawi", "lat": -7.429500, "lon": 111.309500, "tipe": "COCO"},
              {"kode": "JT-632-23", "nama": "SPBU Rest Area KM 575 B Tol Solo-Ngawi", "lat": -7.429100, "lon": 111.310300, "tipe": "COCO"},
              {"kode": "JT-632-05", "nama": "SPBU Ngawi Kota / Ringroad Timur", "lat": -7.402100, "lon": 111.452100, "tipe": "DODO"},
              {"kode": "JT-632-09", "nama": "SPBU Geneng Ngawi", "lat": -7.489120, "lon": 111.441020, "tipe": "DODO"}
            ]
          },
          {
            "kabupaten_kota": "Tuban & Bojonegoro (Area Kilang Utama)",
            "total_spbu": 4,
            "list_spbu": [
              {"kode": "JT-623-01", "nama": "SPBU Jenu (Dekat Kilang Tuban)", "lat": -6.812400, "lon": 111.962100, "tipe": "COCO"},
              {"kode": "JT-623-08", "nama": "SPBU Tuban Kota Pantura", "lat": -6.894120, "lon": 112.054120, "tipe": "DODO"},
              {"kode": "JT-621-02", "nama": "SPBU Veteran Bojonegoro", "lat": -7.158210, "lon": 111.881200, "tipe": "DODO"},
              {"kode": "JT-621-11", "nama": "SPBU Kalitidu Bojonegoro", "lat": -7.124100, "lon": 111.751200, "tipe": "DODO"}
            ]
          },
          {
            "kabupaten_kota": "Surabaya & Sidoarjo (Hub Perak)",
            "total_spbu": 5,
            "list_spbu": [
              {"kode": "JT-601-65", "nama": "SPBU COCO Dr. Soetomo Surabaya", "lat": -7.281400, "lon": 112.738100, "tipe": "COCO"},
              {"kode": "JT-601-80", "nama": "SPBU A. Yani Gayungan Surabaya", "lat": -7.318250, "lon": 112.732100, "tipe": "COCO"},
              {"kode": "JT-601-12", "nama": "SPBU Margomulyo Industri", "lat": -7.241200, "lon": 112.671200, "tipe": "DODO"},
              {"kode": "JT-612-09", "nama": "SPBU Bungurasih Sidoarjo", "lat": -7.351020, "lon": 112.724120, "tipe": "COCO"},
              {"kode": "JT-612-15", "nama": "SPBU Jenggolo Sidoarjo", "lat": -7.441200, "lon": 112.718200, "tipe": "DODO"}
            ]
          },
          {
            "kabupaten_kota": "Situbondo & Banyuwangi",
            "total_spbu": 5,
            "list_spbu": [
              {"kode": "JT-683-05", "nama": "SPBU Karangasem Situbondo Kota", "lat": -7.708210, "lon": 113.992140, "tipe": "DODO"},
              {"kode": "JT-683-12", "nama": "SPBU Panji Situbondo", "lat": -7.714200, "lon": 114.021400, "tipe": "DODO"},
              {"kode": "JT-684-02", "nama": "SPBU Ketapang Pelabuhan", "lat": -8.141200, "lon": 114.394120, "tipe": "COCO"},
              {"kode": "JT-684-10", "nama": "SPBU Kota Banyuwangi", "lat": -8.219210, "lon": 114.368140, "tipe": "DODO"},
              {"kode": "JT-684-18", "nama": "SPBU Genteng Banyuwangi", "lat": -8.361200, "lon": 114.152100, "tipe": "DODO"}
            ]
          }
        ];

        const newLocations = [
            { nama: "SPBU Krikilan Driyorejo", region: "Gresik & Mojokerto", lat: -7.3482, lon: 112.6051 },
            { nama: "SPBU Purwosari Pasuruan", region: "Pasuruan & Malang", lat: -7.7651, lon: 112.7214 },
            { nama: "SPBU Saradan Madiun", region: "Madiun & Nganjuk", lat: -7.5512, lon: 111.6210 },
            { nama: "SPBU Jatiroto Lumajang", region: "Probolinggo & Lumajang", lat: -8.1124, lon: 113.3421 },
            { nama: "SPBU Babat Lamongan", region: "Lamongan & Tuban", lat: -7.1102, lon: 112.2415 }
        ];


