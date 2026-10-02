        // ===== TUTORIAL v2: SPOTLIGHT (MASKING + HIGHLIGHT UI) =====
        // Menggantikan tutorial lama (modal teks biasa). Cara kerja:
        //   - 4 panel gelap membentuk "lubang" tepat di elemen yang dijelaskan; sisanya redup & tidak bisa diklik.
        //   - Cincin cahaya di tepi lubang + kartu penjelasan pendek yang menempel di dekat elemen.
        //   - Tiap langkah bisa pindah tab otomatis (tab:), menunggu tombol diklik pemain (act:), atau membiarkan area
        //     tetap bisa dipakai langsung (free:). Elemen dicari ulang tiap frame karena panel game sering dirender ulang.
        //   - Modal game (Dealer, Surat Jalan, pesan sistem) yang muncul di tengah tutorial otomatis jadi sorotan,
        //     jadi pemain tidak pernah "terkunci".
        // 6 bab berjenjang: Pemula -> Pengelola -> Juragan -> Saudagar -> Sultan. Progres tersimpan per akun (pml_tut2_<id>).
        // Buka lewat tombol Tutorial di header (menu bab) atau otomatis untuk pemain baru (bab 1).
        (function () {
            'use strict';
            const byId = id => document.getElementById(id);
            const q = s => { try { return document.querySelector(s); } catch (e) { return null; } };
            const par = id => () => { const e = byId(id); return e ? e.parentElement : null; };
            const near = (id, sel) => () => { const e = byId(id); return e ? e.closest(sel) : null; };
            const firstOf = (sel, up) => () => { const e = q(sel); return e ? (up ? (e.closest(up) || e) : e) : null; };
            const nav = k => '#btn-tab-' + k;

            // Modal game yang boleh "mengambil alih" sorotan kapan pun muncul (dan langsung bisa dipakai).
            const OVERRIDE = ['#custom-modal:not(.hidden) > div', '#dealer-modal:not(.hidden) > div', '#surat-jalan-modal:not(.hidden) > div', '#sell-modal:not(.hidden) > div', '#surat-kendaraan-modal:not(.hidden) > div'];

            // ---------- Checklist hidup untuk akhir Bab 2 ----------
            function misiHtml() {
                let truk = false, kru = false, stok = false;
                try { truk = companyFleet.some(t => t.type === 'BBM' && (typeof isSpbuTruck !== 'function' || isSpbuTruck(t))); } catch (e) { }
                try { kru = companyCrew.some(c => c.role === 'Supir') && companyCrew.some(c => c.role === 'Kernet'); } catch (e) { }
                try { const k = refineryData[0]; stok = Object.values(FUEL_KAP_KEY).some(key => k.kap && k.kap[key] && k.kap[key].cur > 0); } catch (e) { }
                const row = (ok, t) => `<div class="tut-chk ${ok ? 'ok' : ''}"><i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle'}"></i><span>${t}</span></div>`;
                return `Centang ketiganya, lalu pesanan SPBU akan muncul:<div class="tut-mission">${row(stok, 'Olah BBL jadi BBM di Kilang Tuban')}${row(truk, 'Beli 1 truk BBM di Dealer')}${row(kru, 'Rekrut 1 Supir + 1 Kernet')}</div>Setelah itu tekan <b>Kirim</b> di tab Pesanan SPBU.`;
            }

            // Tampilan sub-tab Hulu (Tender Blok) dipaksa saat langkahnya aktif, dikembalikan saat selesai.
            function huluView_(v) {
                try { if (typeof huluView !== 'undefined') huluView = v; } catch (e) { }
                try { if (currentTabId === 'tab-hulu' && typeof huluRender === 'function') huluRender(); } catch (e) { }
            }

            // ---------- DATA BAB ----------
            // Field langkah: i=ikon, t=judul, d=teks (string / fungsi), sel=target (selector / fungsi / array kandidat),
            // tab=tab yang dibuka dulu, act=tunggu klik target, free=area tetap bisa dipakai, tip, miss=catatan bila target tak ada,
            // enter/leave=hook, live=perbarui teks tiap ~0,6 dtk.
            const CHAPTERS = [
                {
                    id: 'b1', rank: 'Pemula', color: '#34d399', icon: 'fa-seedling', title: 'Kenali Layarmu', sum: 'Kas, jam, peta, dan menu utama.',
                    steps: [
                        { i: 'fa-hand-peace', t: 'Selamat datang, Bos!', tab: 'tab-map-view', d: 'Kamu memimpin perusahaan distribusi <b>BBM &amp; LPG</b>. Modal <b>Rp 650 juta</b> dan <b>Kilang Tuban</b> (tangki minyak mentah &amp; LPG Curah terisi 80%) sudah jadi milikmu. Yuk kenali layarnya dulu.' },
                        { i: 'fa-wallet', t: 'Kas Perusahaan', sel: par('kpis-cash'), d: 'Ini uangmu. Beli truk, gaji kru, dan pajak <b>mengurangi</b> kas. Pesanan yang selesai <b>menambah</b> kas.' },
                        { i: 'fa-ranking-star', t: 'Reputasi (0-200)', sel: '#kpi-rep', d: 'Naik bila pesanan tuntas dan pajak tepat waktu, turun bila gagal atau telat. Makin tinggi, makin banyak <b>kontrak</b> yang terbuka.', tip: 'Tekan kotak ini untuk membuka Kontrak &amp; PSO.' },
                        { i: 'fa-chart-simple', t: 'Armada, SDM, SPBU', sel: '#header-kpi-row', d: 'Ringkasan jumlah <b>truk</b>, <b>kru</b> (supir, kernet, mekanik), dan <b>SPBU</b> aktif yang kamu layani.' },
                        { i: 'fa-clock', t: 'Jam Game', sel: near('game-time', '.rounded-xl'), d: 'Waktu jalan sendiri: <b>1 jam game = 5 menit nyata</b>, 1 hari game = 2 jam nyata. Pajak, tagihan, dan kontrak mengikuti jam ini.' },
                        { i: 'fa-pause', t: 'Tombol Jeda', d: 'Jeda menghentikan jam, perjalanan truk, dan batas waktu pesanan. Pakai kapan saja kamu perlu istirahat atau mau belajar santai.' },
                        { i: 'fa-map-location-dot', t: 'Peta Nusantara', tab: 'tab-map-view', sel: '#map-view-wrap', d: 'Kilang, depo, dan SPBU tersebar di peta. Truk yang sedang jalan terlihat bergerak di sini.' },
                        { i: 'fa-bars', t: 'Menu Utama', sel: '#sidebar-tab-nav', d: 'Semua fitur dibuka lewat menu ini. Tab akan <b>menggantikan peta</b>; tekan <b>Peta</b> untuk kembali.' },
                        { i: 'fa-user-gear', t: 'Tombol Atas', sel: '#header-actions-row', d: '<b>Tutorial</b> bisa dibuka lagi kapan saja. <b>Peringkat</b> membandingkanmu dengan pemain lain. <b>Akun</b> untuk save/muat progres dan keluar.' }
                    ]
                },
                {
                    id: 'b2', rank: 'Pemula', color: '#38bdf8', icon: 'fa-truck-fast', title: 'Bisnis Pertama: Kirim BBM', sum: 'Olah minyak, beli truk, rekrut kru, kirim pesanan.',
                    steps: [
                        { i: 'fa-route', t: 'Alur Uangmu', tab: 'tab-map-view', d: '<b>1.</b> Olah minyak &rarr; <b>2.</b> Beli truk &rarr; <b>3.</b> Rekrut kru &rarr; <b>4.</b> Kirim pesanan SPBU &rarr; kas bertambah. Kita jalani satu per satu.' },
                        { i: 'fa-oil-well', t: 'Buka Kilang & Depo', sel: nav('kilang'), act: true, d: 'Tekan <b>Kilang &amp; Depo</b> di menu.' },
                        { i: 'fa-oil-can', t: 'Stok Minyak Mentah', tab: 'tab-kilang', sel: '#kilang-list-container > div', d: 'Kilang Tuban menyimpan <b>BBL</b> (minyak mentah). SPBU memesan <b>BBM jadi</b> (Pertalite, Solar, dst), jadi BBL harus diolah dulu.' },
                        { i: 'fa-industry', t: 'Olah Jadi BBM', tab: 'tab-kilang', sel: ['[onclick^="convertBblSemuaJenis"]', '#kilang-list-container > div'], d: '<b>Konversi BBL &rarr; Semua Jenis</b> mengolah minyak mentah jadi BBM. Prosesnya makan waktu game, jadi mulai lebih awal. Konversi tanpa biaya olah, hanya kena <b>Pajak Pengolahan</b> 3% dari nilai jual (LPG 1%).', tip: 'Tanpa stok BBM jadi, pesanan tidak bisa dikirim.' },
                        { i: 'fa-cart-shopping', t: 'Beli BBL', tab: 'tab-kilang', sel: [firstOf('[onclick^="buyFuel"]', 'div'), '#kilang-list-container > div'], d: 'Stok mentah menipis? Beli <b>BBL</b> di sini. Harganya <b>berubah mengikuti pasar</b>, jadi beli saat murah.' },
                        { i: 'fa-store', t: 'Buka Dealer', sel: nav('dealer'), act: true, d: 'Tekan <b>Dealer</b> di menu.' },
                        { i: 'fa-list', t: 'Kategori Armada', tab: 'tab-dealer', sel: '#dealer-cat-switch', d: 'Dealer menjual <b>Truk BBM</b>, LPG, truk antar depo, dan kapal. Kita mulai dari <b>Truk BBM</b>.' },
                        { i: 'fa-truck-droplet', t: 'Beli Truk Pertama', tab: 'tab-dealer', free: true, sel: ['#dealer-modal:not(.hidden) > div', '#dealer-bbm-list > *:first-child', '#dealer-bbm-list'], d: 'Pilih satu truk lalu konfirmasi. Harga sudah termasuk <b>KIR, STNK &amp; plat</b>. Pangkalannya depo (Tuban sudah siap).', tip: 'Pesanan kecil kurang cocok dengan truk yang terlalu besar.' },
                        { i: 'fa-user-shield', t: 'Buka SDM Driver', sel: nav('drivers'), act: true, d: 'Tekan <b>SDM Driver</b> di menu.' },
                        { i: 'fa-user-plus', t: 'Butuh Kru', tab: 'tab-drivers', sel: '#tab-drivers [onclick^="openRecruitModal"]', d: 'Tiap truk butuh <b>1 Supir + 1 Kernet</b> untuk berangkat. Tombol ini membuka bursa kerja.' },
                        { i: 'fa-id-card', t: 'Rekrut Kandidat', tab: 'tab-drivers', free: true, sel: '#recruit-modal > div', d: 'Lihat <b>reputasi</b> (rendah = sering melanggar) dan gaji. Rekrut satu <b>Supir</b>, lalu pindah ke tab <b>Kernet</b>.', enter() { try { openRecruitModal('Supir'); } catch (e) { } }, leave() { try { closeRecruitModal(); } catch (e) { } } },
                        { i: 'fa-bell', t: 'Buka Pesanan SPBU', sel: nav('orders'), act: true, d: 'Setelah truk &amp; kru siap, SPBU mulai memesan. Tekan <b>Pesanan SPBU</b>.' },
                        { i: 'fa-truck', t: 'Status Armada', tab: 'tab-orders', sel: '#ord-fleet', d: 'Pantau berapa truk <b>idle</b> (siap) dan yang sedang jalan, plus kru yang masih bebas.' },
                        { i: 'fa-clipboard-list', t: 'Daftar Pesanan', tab: 'tab-orders', sel: ['#ord-list > *:first-child', '#ord-list'], d: 'Tiap kartu = 1 pesanan SPBU. Lewat <b>10 menit nyata</b> tanpa dikirim, pesanan <b>batal</b> dan SPBU pindah ke pesaing.', miss: 'Belum ada pesanan. Beli truk &amp; rekrut kru dulu; pesanan pertama muncul setelah itu.' },
                        { i: 'fa-paper-plane', t: 'Kirim Pesanan', tab: 'tab-orders', sel: ['#ord-list [onclick^="kirimPesanan"]', '#ord-list'], d: 'Tekan <b>Kirim</b> &rarr; cek rencana otomatis (truk, kru, rute) &rarr; <b>Dispatch</b> &rarr; tanda tangani <b>Surat Jalan</b>. Uang masuk setelah truk tiba dan selesai bongkar.', miss: 'Tombol Kirim muncul di kartu pesanan begitu ada pesanan.' },
                        { i: 'fa-list-check', t: 'Misi Pertamamu', tab: 'tab-map-view', live: true, d: misiHtml }
                    ]
                },
                {
                    id: 'b3', rank: 'Pengelola', color: '#a78bfa', icon: 'fa-clipboard-check', title: 'Rawat & Awasi Bisnis', sum: 'Dokumen truk, kru, pajak, dan laporan.',
                    steps: [
                        { i: 'fa-truck-front', t: 'Buka Armada', sel: nav('fleet'), act: true, d: 'Tekan <b>Armada</b> di menu.' },
                        { i: 'fa-file-shield', t: 'Dokumen Truk', tab: 'tab-fleet', sel: ['#fleet-list-container > *:first-child', '#fleet-list-container'], d: 'Tiap truk punya <b>KIR, STNK, dan Plat</b> dengan masa berlaku. Kalau habis, truk <b>tidak bisa dikirim</b>. Perpanjang lewat tombol surat di kartunya.', miss: 'Belum ada truk. Kartu truk akan muncul di sini.' },
                        { i: 'fa-users', t: 'Kondisi Kru', tab: 'tab-drivers', sel: ['#driver-list-container > *:first-child', '#driver-list-container'], d: 'Reputasi kru turun bila melanggar dan naik tiap tugas bersih. Kru digaji; biayanya tercatat di Laporan.', miss: 'Belum ada kru. Rekrut dulu di tombol Rekrut Kru Baru.' },
                        { i: 'fa-receipt', t: 'Laporan Keuangan', tab: 'tab-finance', sel: ['#fin-report', '#tab-finance > div'], d: 'Laporan laba-rugi: bandingkan pemasukan dengan pengeluaran. Rugi terus? Periksa biaya truk dan gaji kru.' },
                        { i: 'fa-file-invoice-dollar', t: 'Pajak PPh Badan', tab: 'tab-finance', sel: par('pph-pay'), d: '<b>PPh Badan</b> ditagih tiap 2 minggu game. Telat = denda, dan pembelian, ekspansi, serta pengiriman <b>diblokir</b> sampai lunas.', tip: 'Bayar lewat tombol di kotak ini sebelum jatuh tempo.' },
                        { i: 'fa-scroll', t: 'Log Aktivitas', tab: 'tab-map-view', sel: par('activity-log'), d: 'Log mencatat pesanan masuk, truk tiba, denda, dan kejadian lain. Cek di sini kalau ada yang janggal.' },
                        { i: 'fa-robot', t: 'Dispatcher Otomatis', tab: 'tab-orders', sel: '#auto-dispatch-bar', d: '<b>Dispatcher Otomatis</b> mengirim pesanan tanpa kamu tekan satu per satu. Fitur ini butuh <b>Pass</b> aktif.' },
                        { i: 'fa-cloud-arrow-up', t: 'Simpan Progres', sel: '[onclick^="openAccountModal"]', d: 'Lewat <b>Akun</b> kamu bisa Save/Muat progres ke cloud. Rajin simpan sebelum menutup game.' }
                    ]
                },
                {
                    id: 'b4', rank: 'Juragan', color: '#f59e0b', icon: 'fa-chart-line', title: 'Ekspansi Bisnis', sum: 'Mitra SPBU, depo cabang, LPG, dan kontrak.',
                    steps: [
                        { i: 'fa-handshake', t: 'Buka Mitra', sel: nav('partnership'), act: true, d: 'Tekan <b>Mitra</b> di menu.' },
                        { i: 'fa-gas-pump', t: 'Izin SPBU Baru', tab: 'tab-partnership', sel: ['#investor-spbu-list', '#tab-partnership > div'], d: 'Tiap kota mulai dengan 3 SPBU. Setujui <b>izin SPBU mitra</b> (DODO) supaya pesanan makin banyak. Biaya izin <b>Rp 35 jt</b> (BBM) atau <b>Rp 60 jt</b> (BBM+LPG).' },
                        { i: 'fa-file-invoice', t: 'Tagihan Mitra', tab: 'tab-partnership', sel: [par('mitra-kpi'), '#mitra-active-list'], d: 'Pantau <b>tagihan bulanan</b> mitra. Mitra yang telat bayar diblokir otomatis, dan SPBU-nya bisa kamu <b>ambil alih</b> jadi milik sendiri (COCO).' },
                        { i: 'fa-warehouse', t: 'Buka Depo Cabang', tab: 'tab-kilang', sel: [firstOf('#kilang-list-container [onclick^="buyRefinery"]', '.bg-gray-900'), '#kilang-filter-tabs'], d: 'Satu depo melayani beberapa kota. Kota yang depo-nya belum dibuka <b>tidak terjangkau</b>. Buka depo cabang (<b>puluhan miliar</b>) untuk wilayah baru.', tip: 'Tiap depo butuh <b>1 Mekanik</b> dan stok produknya sendiri.' },
                        { i: 'fa-truck-ramp-box', t: 'Truk Antar Depo', tab: 'tab-dealer', sel: '[data-dcat="depo-bbl"]', d: '<b>Truk BBL Antar Depo</b> mengangkut stok dari Kilang Tuban ke depo cabang, bukan ke SPBU. Depo cabang perlu stok agar bisa melayani wilayahnya.' },
                        { i: 'fa-right-left', t: 'Kirim BBL', sel: nav('kapal-bbm'), d: '<b>Kirim BBL</b> memindahkan stok antar kilang/depo. Pilih tujuan, lalu angkut lewat <b>darat</b> (truk depo) atau <b>laut</b> (kapal).' },
                        { i: 'fa-fire-flame-simple', t: 'Bisnis LPG', tab: 'tab-kilang', sel: [firstOf('[onclick^="buyLpgCurah"]', 'div'), '#kilang-list-container > div'], d: 'Beli <b>LPG Curah</b> di Kilang Tuban, olah jadi tabung, lalu kirim dengan truk LPG. Pesanannya ada di filter <b>LPG</b> pada tab Pesanan.' },
                        { i: 'fa-file-contract', t: 'Kontrak & PSO', tab: 'tab-kontrak', sel: '#kp-root', d: '<b>Kontrak</b>: pembeli swasta minta volume sebelum tenggat. Selesai = premi, gagal = jaminan hangus. <b>PSO</b>: tugas kuota dari negara, capai kuota minimal agar lulus.', tip: 'Pemula baru bisa Kontrak Lokal 1 slot. Naikkan reputasi untuk membuka lebih banyak.' }
                    ]
                },
                {
                    id: 'b5', rank: 'Saudagar', color: '#fb7185', icon: 'fa-scale-balanced', title: 'Pasar & Bursa', sum: 'Harga dinamis, jual-beli truk, peringkat.',
                    steps: [
                        { i: 'fa-chart-area', t: 'Harga Pasar Dinamis', tab: 'tab-kilang', sel: '#kilang-list-container > div', d: 'Harga BBL dan LPG curah <b>naik-turun</b> mengikuti jam game dan <b>berita pasar</b> (OPEC+, kurs, dll). Beli banyak saat murah, tahan saat mahal.', tip: 'Panel harga ada di kartu Kilang Tuban.' },
                        { i: 'fa-right-left', t: 'Buka Bursa P2P', sel: nav('bursa'), act: true, d: 'Tekan <b>Bursa P2P</b> di menu.' },
                        { i: 'fa-tag', t: 'Jual Truk', tab: 'tab-bursa', sel: [near('bursa-sell-truck', '.bg-gray-950'), '#tab-bursa > div'], d: 'Truk nganggur? <b>Jual ke pemain lain</b>: pilih unit, tentukan harga, lalu pasang iklan.', miss: 'Bursa butuh koneksi internet.' },
                        { i: 'fa-basket-shopping', t: 'Beli Truk Bekas', tab: 'tab-bursa', sel: ['#bursa-other-list', '#tab-bursa > div'], d: 'Atau <b>beli truk bekas</b> pemain lain, biasanya lebih murah dari Dealer. Lakukan <b>Balik Nama</b> di tab Armada sebelum dijual lagi.' },
                        { i: 'fa-trophy', t: 'Peringkat', tab: 'tab-leaderboard', sel: ['#lb-sorts', '#tab-leaderboard > div'], d: '<b>Peringkat</b> membandingkan kas, armada, dan kilangmu dengan pemain lain. Kejar posisi #1!' }
                    ]
                },
                {
                    id: 'b6', rank: 'Sultan', color: '#facc15', icon: 'fa-crown', title: 'Sultan: Laut & Hulu', sum: 'Kapal tanker, anjungan, dan tender blok migas.',
                    steps: [
                        { i: 'fa-crown', t: 'Level Sultan', tab: 'tab-map-view', d: 'Saatnya menguasai rantai <b>hulu &rarr; hilir</b>: kapal tanker dan sumber minyak milikmu sendiri.' },
                        { i: 'fa-ship', t: 'Kapal Tanker', tab: 'tab-dealer', sel: '[data-dcat="kapal-bbm"]', d: 'Kapal mengangkut BBL/LPG antar depo lewat laut dalam jumlah besar. Butuh <b>Nahkoda + ABK</b> (rekrut di SDM) dan pangkalan di depo yang punya <b>dermaga</b>.' },
                        { i: 'fa-anchor', t: 'Pelayaran', sel: nav('kapal-bbm'), d: 'Kapal butuh <b>bahan bakar</b>, mesinnya bisa <b>aus</b>, dan harus <b>antre labuh</b> di dermaga. Cuaca buruk di zona laut juga menghentikan pelayaran.' },
                        { i: 'fa-oil-well', t: 'Anjungan Hulu', tab: 'tab-hulu', sel: '#hulu-root', d: '<b>Anjungan</b> adalah sumber minyak &amp; gas milikmu. Bangun anjungan, lalu salurkan hasilnya ke kilang/depo lewat <b>pipa</b> bawah laut atau <b>kapal</b>.' },
                        { i: 'fa-magnifying-glass-location', t: 'Tender Blok Migas', tab: 'tab-hulu', sel: '#hulu-root', d: 'Ikut <b>lelang</b> &rarr; menang &rarr; <b>survei seismik</b> &rarr; <b>bor eksplorasi</b>. Sukses = anjungan baru dengan biaya produksi lebih murah. <b>Dry hole</b> = uang habis.', tip: 'Berisiko, tapi untungnya besar.', enter() { huluView_('tender'); }, leave() { huluView_('site'); } },
                        { i: 'fa-crown', t: 'Kamu Siap Jadi Sultan!', tab: 'tab-map-view', d: 'Semua fitur utama sudah kamu kenal. Kuasai hulu sampai hilir, jaga reputasi dan pajak, lalu kejar <b>peringkat #1</b>. Selamat berbisnis!' }
                    ]
                }
            ];

            // ---------- STATE ----------
            const S = { on: false, mode: '', ci: 0, si: 0, el: null, lastRect: null, lastSeen: 0, raf: 0, liveAt: 0, liveHtml: '', key: {}, animT: 0, actT: 0 };
            const cur = () => CHAPTERS[S.ci].steps[S.si];
            const chap = () => CHAPTERS[S.ci];

            // ---------- PROGRES (per akun) ----------
            const pKey = () => 'pml_tut2_' + (typeof currentAccount !== 'undefined' && currentAccount ? currentAccount.id : 'guest');
            function getProg() { const p = store.get(pKey(), null); return p && Array.isArray(p.done) ? p : { seen: true, done: [] }; }
            function markDone(id) { const p = getProg(); if (!p.done.includes(id)) p.done.push(id); p.seen = true; store.set(pKey(), p); }

            // ---------- DOM ----------
            let root, masks, shield, ring, card;
            function ensureDom() {
                if (root) return;
                root = document.createElement('div');
                root.id = 'tut-root'; root.className = 'hidden';
                root.innerHTML = '<div class="tut-mask" data-m="t"></div><div class="tut-mask" data-m="b"></div><div class="tut-mask" data-m="l"></div><div class="tut-mask" data-m="r"></div><div class="tut-shield"></div><div class="tut-ring"></div><div id="tut-card" role="dialog" aria-live="polite"></div>';
                document.body.appendChild(root);
                masks = {}; root.querySelectorAll('.tut-mask').forEach(m => masks[m.dataset.m] = m);
                shield = root.querySelector('.tut-shield'); ring = root.querySelector('.tut-ring'); card = byId('tut-card');
                card.addEventListener('click', e => {
                    const b = e.target.closest('[data-a]'); if (!b) return;
                    const a = b.dataset.a;
                    if (a === 'next') next(); else if (a === 'back') back(); else if (a === 'close') close();
                    else if (a === 'menu') showMenu(); else if (a === 'ch') startChapter(+b.dataset.i);
                });
            }

            // ---------- UTIL TATA LETAK ----------
            const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
            // Area elemen yang benar-benar terlihat (dipotong oleh kontainer scroll di atasnya).
            function visRect(el) {
                const r = el.getBoundingClientRect();
                let l = r.left, t = r.top, rr = r.right, b = r.bottom;
                for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
                    const cs = getComputedStyle(p);
                    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                        const pr = p.getBoundingClientRect();
                        l = Math.max(l, pr.left); t = Math.max(t, pr.top); rr = Math.min(rr, pr.right); b = Math.min(b, pr.bottom);
                    }
                }
                l = Math.max(l, 0); t = Math.max(t, 0); rr = Math.min(rr, innerWidth); b = Math.min(b, innerHeight);
                return { l, t, r: rr, b, w: rr - l, h: b - t, fw: r.width, fh: r.height };
            }
            function resolve(st) {
                const list = [].concat(st.sel || []);
                for (const s of list) {
                    let e = null;
                    try { e = typeof s === 'function' ? s() : document.querySelector(s); } catch (x) { e = null; }
                    if (e && vis(e)) return e;
                }
                return null;
            }
            function toHole(v) {
                if (!v || v.w < 6 || v.h < 6) return null;
                const pad = 6;
                const x = Math.max(0, v.l - pad), y = Math.max(0, v.t - pad);
                return { x, y, w: Math.min(innerWidth, v.r + pad) - x, h: Math.min(innerHeight, v.b + pad) - y };
            }
            const px = n => Math.round(n) + 'px';
            function setBox(el, x, y, w, h, key) {
                const k = px(x) + px(y) + px(w) + px(h);
                if (S.key[key] === k) return; S.key[key] = k;
                el.style.left = px(x); el.style.top = px(y); el.style.width = px(Math.max(0, w)); el.style.height = px(Math.max(0, h));
            }
            function placeCard(hole) {
                const vw = innerWidth, vh = innerHeight, m = 12, gap = 14, minSide = 270;
                const wFull = Math.min(340, vw - 2 * m);
                if (S.cwNow !== wFull) { S.cwNow = wFull; card.style.width = px(wFull); }
                let cw = wFull, ch = card.offsetHeight, x, y;
                const clampY = v => Math.min(Math.max(v, m), vh - ch - m);
                if (!hole) { x = (vw - cw) / 2; y = Math.max(m, (vh - ch) / 2); }
                else {
                    const below = vh - (hole.y + hole.h) - m, above = hole.y - m;
                    x = Math.min(Math.max(hole.x + hole.w / 2 - cw / 2, m), vw - cw - m);
                    if (below >= ch + gap) y = hole.y + hole.h + gap;
                    else if (above >= ch + gap) y = hole.y - ch - gap;
                    else {
                        // Target besar (mis. modal): coba di samping, kartu boleh menyempit sampai minSide.
                        const right = vw - (hole.x + hole.w) - m - gap, left = hole.x - m - gap;
                        let side = 0;
                        if (right >= minSide) { side = 1; cw = Math.min(wFull, right); x = hole.x + hole.w + gap; }
                        else if (left >= minSide) { side = 1; cw = Math.min(wFull, left); x = hole.x - cw - gap; }
                        if (side) {
                            if (cw !== wFull) { S.cwNow = cw; card.style.width = px(cw); ch = card.offsetHeight; }
                            y = clampY(hole.y + hole.h / 2 - ch / 2);
                        } else if (hole.y + hole.h / 2 < vh / 2) { y = vh - ch - m; hole.h = Math.max(44, Math.min(hole.h, y - gap - hole.y)); }
                        else { y = m; const bt = hole.y + hole.h; hole.y = Math.max(hole.y, y + ch + gap); hole.h = Math.max(44, bt - hole.y); }
                    }
                }
                const k = px(x) + px(y) + px(cw);
                if (S.key.card !== k) { S.key.card = k; card.style.left = px(x); card.style.top = px(y); }
            }
            function layout(hole, passthrough) {
                const vw = innerWidth, vh = innerHeight;
                placeCard(hole);
                if (!hole) {
                    setBox(masks.t, 0, 0, vw, vh, 't'); setBox(masks.b, 0, vh, vw, 0, 'b'); setBox(masks.l, 0, 0, 0, 0, 'l'); setBox(masks.r, 0, 0, 0, 0, 'r');
                    ring.style.display = 'none'; shield.style.display = 'none'; S.key.ring = ''; S.key.sh = ''; return;
                }
                const x2 = hole.x + hole.w, y2 = hole.y + hole.h;
                setBox(masks.t, 0, 0, vw, hole.y, 't'); setBox(masks.b, 0, y2, vw, vh - y2, 'b');
                setBox(masks.l, 0, hole.y, hole.x, hole.h, 'l'); setBox(masks.r, x2, hole.y, vw - x2, hole.h, 'r');
                ring.style.display = 'block'; setBox(ring, hole.x, hole.y, hole.w, hole.h, 'ring');
                if (passthrough) { shield.style.display = 'none'; S.key.sh = ''; }
                else { shield.style.display = 'block'; setBox(shield, hole.x, hole.y, hole.w, hole.h, 'sh'); }
            }

            // ---------- RENDER KARTU ----------
            function tint() { const c = S.mode === 'menu' ? '#2dd4bf' : chap().color; root.style.setProperty('--tc', c); }
            const stepText = st => typeof st.d === 'function' ? st.d() : st.d;
            function renderStep() {
                const c = chap(), st = cur(), n = c.steps.length, last = S.si === n - 1;
                tint();
                const missing = !S.el;
                let extra = '';
                if (missing && st.miss) extra += `<div class="tut-tip"><i class="fa-solid fa-circle-info mr-1"></i>${st.miss}</div>`;
                else if (st.tip) extra += `<div class="tut-tip"><i class="fa-solid fa-lightbulb mr-1"></i>${st.tip}</div>`;
                if (st.act && S.el) extra += '<div class="tut-hint"><i class="fa-solid fa-hand-pointer mr-1"></i>Tekan tombol yang menyala</div>';
                else if (st.free && S.el) extra += '<div class="tut-hint"><i class="fa-solid fa-hand-pointer mr-1"></i>Boleh dicoba langsung, lalu tekan Lanjut</div>';
                card.className = '';
                card.innerHTML = `<div class="tut-top"><span class="tut-chip"><i class="fa-solid ${c.icon}"></i>Bab ${S.ci + 1} &middot; ${c.rank}</span><button class="tut-x" data-a="close" title="Tutup tutorial"><i class="fa-solid fa-xmark"></i></button></div>
                    <div class="tut-body"><div class="tut-ico"><i class="fa-solid ${st.i || 'fa-circle-info'}"></i></div><div class="tut-txt"><h3>${st.t}</h3><p id="tut-p">${stepText(st)}</p>${extra}</div></div>
                    <div class="tut-bar"><span style="width:${Math.round(((S.si + 1) / n) * 100)}%"></span></div>
                    <div class="tut-foot"><span class="tut-count">${S.si + 1}/${n}</span><div class="tut-btns">${S.si > 0 ? '<button class="tut-btn ghost" data-a="back">Kembali</button>' : '<button class="tut-btn ghost" data-a="menu">Daftar Bab</button>'}<button class="tut-btn pri" data-a="next">${last ? 'Selesai <i class="fa-solid fa-check"></i>' : 'Lanjut <i class="fa-solid fa-arrow-right"></i>'}</button></div></div>`;
                S.renderedMissing = missing; S.renderedAct = !!(st.act && S.el); S.key.card = '';
            }
            function showMenu() {
                leaveStep();
                S.mode = 'menu'; S.el = null; tint();
                const prog = getProg(), rec = CHAPTERS.findIndex(c => !prog.done.includes(c.id));
                const items = CHAPTERS.map((c, i) => {
                    const done = prog.done.includes(c.id), isRec = i === rec;
                    return `<button class="tut-ch ${isRec ? 'rec' : ''}" style="--c:${c.color}" data-a="ch" data-i="${i}"><span class="tut-ch-ico"><i class="fa-solid ${c.icon}"></i></span><span class="tut-ch-t"><b>Bab ${i + 1} &middot; ${c.title}</b><small>${c.rank} &middot; ${c.steps.length} langkah &middot; ${c.sum}</small></span><span class="tut-ch-st ${done ? 'done' : isRec ? 'rec' : ''}">${done ? '<i class="fa-solid fa-circle-check"></i> Selesai' : isRec ? 'Mulai <i class="fa-solid fa-arrow-right"></i>' : ''}</span></button>`;
                }).join('');
                card.className = '';
                card.innerHTML = `<div class="tut-top"><span class="tut-chip"><i class="fa-solid fa-graduation-cap"></i>Tutorial</span><button class="tut-x" data-a="close" title="Tutup"><i class="fa-solid fa-xmark"></i></button></div>
                    <h3 style="margin:0 0 3px;font-size:14px;font-weight:800;color:#f1f5f9">Dari Pemula sampai Sultan</h3>
                    <p class="tut-menu-sub">Pilih bab. Tiap bab singkat dan menyorot langsung tombol aslinya di game.</p>
                    <div class="tut-list">${items}</div>
                    <div class="tut-foot"><span class="tut-count">${prog.done.length}/${CHAPTERS.length} bab</span><div class="tut-btns"><button class="tut-btn ghost" data-a="close">Tutup</button></div></div>`;
                S.key.card = ''; animate();
            }
            function showDone() {
                const c = chap(), hasNext = S.ci < CHAPTERS.length - 1;
                markDone(c.id); S.mode = 'done'; S.el = null; tint();
                const nx = hasNext ? CHAPTERS[S.ci + 1] : null;
                card.className = 'tut-center';
                card.innerHTML = `<div class="tut-body"><div class="tut-ico"><i class="fa-solid ${hasNext ? 'fa-circle-check' : 'fa-crown'}"></i></div><div class="tut-txt"><h3>${hasNext ? 'Bab ' + (S.ci + 1) + ' selesai!' : 'Tamat! Gelar Sultan milikmu'}</h3><p>${hasNext ? `Berikutnya: <b>${nx.title}</b> (${nx.rank}). Boleh langsung lanjut atau main dulu.` : 'Semua bab sudah kamu selesaikan. Buka lagi tutorial kapan saja lewat tombol di atas.'}</p></div></div>
                    <div class="tut-bar"><span style="width:100%"></span></div>
                    <div class="tut-foot" style="justify-content:center"><div class="tut-btns"><button class="tut-btn ghost" data-a="menu">Daftar Bab</button>${hasNext ? `<button class="tut-btn pri" data-a="ch" data-i="${S.ci + 1}">Bab ${S.ci + 2} <i class="fa-solid fa-arrow-right"></i></button>` : ''}<button class="tut-btn ${hasNext ? 'ghost' : 'pri'}" data-a="close">${hasNext ? 'Main Dulu' : 'Mulai Main'}</button></div></div>`;
                S.key.card = ''; animate();
            }
            function animate() {
                root.classList.add('tut-anim'); clearTimeout(S.animT);
                S.animT = setTimeout(() => root && root.classList.remove('tut-anim'), 340);
            }

            // ---------- ALUR LANGKAH ----------
            function gotoTab(id) { if (id && typeof switchTab === 'function' && typeof currentTabId !== 'undefined' && currentTabId !== id) { try { switchTab(id); } catch (e) { } } }
            function leaveStep() {
                if (S.mode !== 'step') return;
                const st = cur(); if (st && st.leave) { try { st.leave(); } catch (e) { } }
            }
            function enterStep() {
                S.mode = 'step'; S.el = null; S.lastRect = null; S.liveAt = 0; S.key = {}; S.scrolled = null; S.liveHtml = '';
                const st = cur();
                gotoTab(st.tab);
                if (st.enter) { try { st.enter(); } catch (e) { } }
                renderStep(); animate();
            }
            function startChapter(i) {
                leaveStep(); S.ci = Math.max(0, Math.min(CHAPTERS.length - 1, i)); S.si = 0; enterStep();
            }
            function next() {
                if (S.mode !== 'step') return;
                leaveStep();
                if (S.si >= chap().steps.length - 1) { showDone(); return; }
                S.si++; enterStep();
            }
            function back() {
                if (S.mode !== 'step' || S.si === 0) return;
                leaveStep(); S.si--; enterStep();
            }

            // ---------- LOOP PELACAK ----------
            function frame() {
                if (!S.on) return;
                S.raf = requestAnimationFrame(frame);
                if (S.mode !== 'step') { layout(null, false); return; }
                const st = cur(), now = performance.now();
                let el = null, over = false;
                for (const s of OVERRIDE) { const e = q(s); if (e && vis(e)) { el = e; over = true; break; } }
                if (!over) el = resolve(st);
                let v = el ? visRect(el) : null;
                if (el && !over && (v.w < 6 || v.h < 6 || (v.w * v.h) < 0.85 * v.fw * v.fh) && el !== S.scrolled) {
                    S.scrolled = el;
                    try { el.scrollIntoView({ block: v.fh > innerHeight * 0.55 ? 'start' : 'nearest', inline: 'center' }); } catch (e) { }
                    v = visRect(el);
                }
                if (el) { S.lastRect = v; S.lastSeen = now; }
                else if (S.lastRect && now - S.lastSeen < 350) v = S.lastRect;   // toleransi saat panel dirender ulang
                else v = null;
                if (!!el !== !!S.el || S.renderedMissing !== !el || S.renderedAct !== !!(st.act && el)) { S.el = el; renderStep(); }
                else S.el = el;
                if (st.live && now - S.liveAt > 600) {
                    S.liveAt = now; const html = stepText(st), p = byId('tut-p');
                    if (p && html !== S.liveHtml) { S.liveHtml = html; p.innerHTML = html; }
                }
                layout(toHole(v), !!(st.act || st.free || over));
            }

            // ---------- KLIK TARGET (langkah act) & KEYBOARD ----------
            function onDocClick(e) {
                if (!S.on || S.mode !== 'step') return;
                const st = cur(); if (!st.act) return;
                const el = resolve(st);
                if (el && el.contains(e.target)) { clearTimeout(S.actT); S.actT = setTimeout(() => { if (S.on && S.mode === 'step' && cur() === st) next(); }, 280); }
            }
            function onKey(e) {
                if (!S.on) return;
                if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return;
                if (e.key === 'Escape') { e.preventDefault(); close(); }
                else if (S.mode === 'step' && (e.key === 'ArrowRight' || e.key === 'Enter')) { e.preventDefault(); next(); }
                else if (S.mode === 'step' && e.key === 'ArrowLeft') { e.preventDefault(); back(); }
            }

            // ---------- BUKA / TUTUP ----------
            function begin() {
                ensureDom();
                if (S.on) return;
                S.on = true; S.scrolled = null; S.key = {};
                root.classList.remove('hidden'); document.body.classList.add('tut-on');
                document.addEventListener('click', onDocClick, true); document.addEventListener('keydown', onKey, true);
                S.raf = requestAnimationFrame(frame);
            }
            function close() {
                if (!S.on) return;
                leaveStep();
                S.on = false; S.mode = ''; cancelAnimationFrame(S.raf); clearTimeout(S.actT);
                document.removeEventListener('click', onDocClick, true); document.removeEventListener('keydown', onKey, true);
                root.classList.add('hidden'); document.body.classList.remove('tut-on');
                if (typeof currentAccount !== 'undefined' && currentAccount) { const p = getProg(); store.set(pKey(), p); }
            }

            // ---------- API GLOBAL ----------
            // openTutorial(true) = langsung mulai Bab 1 (pemain baru); openTutorial(false) = menu pilih bab (tombol Tutorial).
            window.openTutorial = function (startFirst) {
                if (typeof currentAccount === 'undefined' || !currentAccount) return;
                const cm = byId('custom-modal'); if (cm) cm.classList.add('hidden');
                begin();
                if (startFirst) startChapter(0); else showMenu();
            };
            window.closeTutorial = close;
            window.TUTORIAL_CHAPTERS = CHAPTERS;
        })();
