        // ===== WILAYAH NUSANTARA: [provinsi, prefix kode, [[kota, lat, lon, jumlah SPBU]]] =====
        const WILAYAH = [
          ['Jawa Timur','JT',[['Malang',-7.9797,112.6304,6],['Kediri',-7.848,112.0178,5],['Jember',-8.1845,113.6681,5],['Madiun',-7.6298,111.5239,4],['Mojokerto',-7.4726,112.4338,4],['Lamongan',-7.1167,112.4167,4],['Blitar',-8.0983,112.1681,4],['Pamekasan',-7.1568,113.4825,4]]],
          ['Jawa Tengah','JG',[['Semarang',-6.9667,110.4167,7],['Surakarta (Solo)',-7.5666,110.8283,6],['Magelang',-7.4797,110.2177,4],['Pekalongan',-6.8886,109.6753,4],['Tegal',-6.8694,109.1402,4],['Purwokerto',-7.4242,109.2396,5],['Kudus',-6.8048,110.8405,4],['Cilacap',-7.7188,109.0154,4]]],
          ['Jawa Barat','JB',[['Bandung',-6.9175,107.6191,7],['Cirebon',-6.7063,108.5571,5],['Tasikmalaya',-7.3274,108.2207,4],['Sukabumi',-6.9277,106.93,4],['Karawang',-6.3015,107.302,5],['Subang',-6.5715,107.7587,4],['Garut',-7.2279,107.9087,4]]],
          ['Jakarta & Jabodetabek','JK',[['Jakarta Pusat',-6.1865,106.8341,6],['Jakarta Utara',-6.1384,106.8632,6],['Jakarta Barat',-6.1683,106.7588,6],['Jakarta Selatan',-6.2615,106.8106,6],['Jakarta Timur',-6.225,106.9004,6],['Bogor',-6.5971,106.806,5],['Depok',-6.4025,106.7942,5],['Tangerang',-6.1783,106.6319,6],['Tangerang Selatan',-6.2885,106.718,5],['Bekasi',-6.2383,106.9756,6]]],
          ['Bali','BL',[['Denpasar',-8.6705,115.2126,6],['Badung (Kuta)',-8.722,115.1694,5],['Gianyar',-8.5449,115.3255,4],['Singaraja',-8.112,115.0882,4],['Tabanan',-8.5386,115.125,4],['Karangasem',-8.45,115.61,3]]],
          ['Sulawesi Utara','SU',[['Manado',1.4748,124.8421,6],['Bitung',1.4404,125.1917,4],['Tomohon',1.33,124.8333,3],['Kotamobagu',0.7333,124.3167,3]]],
          ['Sulawesi Tengah','ST',[['Palu',-0.8917,119.8707,5],['Poso',-1.395,120.752,3],['Luwuk',-0.95,122.787,3],['Donggala',-0.681,119.742,3]]],
          ['Sulawesi Barat','SB',[['Mamuju',-2.674,118.888,4],['Majene',-3.54,118.97,3],['Polewali Mandar',-3.432,119.343,3]]],
['Sulawesi Selatan','SS',[['Makassar',-5.1477,119.4327,7],['Gowa',-5.2159,119.4497,4],['Maros',-4.9887,119.5713,3],['Parepare',-4.0135,119.6255,3]]],
          ['Kalimantan','KL',[['Balikpapan (Kaltim)',-1.2379,116.8529,6],['Samarinda (Kaltim)',-0.5022,117.1536,5],['Bontang (Kaltim)',0.1333,117.5,3],['Banjarmasin (Kalsel)',-3.3186,114.5944,5],['Banjarbaru (Kalsel)',-3.442,114.83,3],['Pontianak (Kalbar)',-0.0263,109.3425,5],['Singkawang (Kalbar)',0.906,108.987,3],['Palangka Raya (Kalteng)',-2.2161,113.9135,4],['Sampit (Kalteng)',-2.533,112.95,3],['Tarakan (Kaltara)',3.3,117.6333,3]]],
          ['Jawa Timur','JT',[['Probolinggo',-7.7543,113.2159,4],['Lumajang',-8.1335,113.2246,4],['Bondowoso',-7.9135,113.8219,3]]]
        ];
        const JALAN = ['Jl. Jend. Sudirman','Jl. A. Yani','Jl. Diponegoro','Jl. Gatot Subroto','Jl. Raya Utara','Jl. Pahlawan','Jl. Imam Bonjol','Jl. Veteran','Jl. Merdeka','Jl. Pemuda','Jl. Hasanuddin','Jl. Ahmad Dahlan','Jl. Lingkar Kota','Jl. Trans Regional'];
        (function buildWilayah() {
            let ci = 300;
            WILAYAH.forEach(([prov, pfx, cities]) => cities.forEach(([kota, lat, lon, n]) => {
                let seed = ci * 7919 + 13; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                const jl = JALAN.slice().sort(() => rand() - 0.5);
                const list = [];
                for (let k = 0; k < n; k++) list.push({ kode: `${pfx}-${ci}-${String(k + 1).padStart(2, '0')}`, nama: `SPBU ${jl[k % jl.length]} ${kota.replace(/ \(.*\)/, '')}`, lat: +(lat + (rand() - 0.5) * 0.09).toFixed(6), lon: +(lon + (rand() - 0.5) * 0.09).toFixed(6), tipe: rand() < 0.45 ? 'COCO' : 'DODO' });
                rawSpbuData.push({ kabupaten_kota: kota, provinsi: prov, total_spbu: n, list_spbu: list });
                ci++;
            }));
        })();

        // Depo/TBBM regional (dibeli pemain, jadi titik berangkat truk terdekat)
        refineryData.push(...[['TBBM Plumpang Jakarta',-6.1216,106.8967,25e9,'JKb'],['TBBM Tanjung Emas Semarang',-6.949,110.426,18e9,'SMb'],['TBBM Padalarang Bandung',-6.84,107.48,15e9,null],['TBBM Manggis Bali',-8.5,115.52,18e9,'MGb'],['TBBM Bitung Sulut',1.45,125.19,16e9,'BTb'],['TBBM Donggala Sulteng',-0.66,119.74,15e9,'DGb'],['Depo Mamuju Sulbar',-2.67,118.89,12e9,'MMb'],['TBBM Balikpapan Kaltim',-1.27,116.8,22e9,'BPb'],['TBBM Banjarmasin Kalsel',-3.29,114.57,15e9,'BJb'],['TBBM Pontianak Kalbar',-0.04,109.32,15e9,'PTb'],['Depo Palangka Raya Kalteng',-2.25,113.9,12e9,null],['Depo Tarakan Kaltara',3.31,117.62,14e9,'TKb'],['TBBM Makassar Sulsel',-5.14,119.43,20e9,'MKb'],['TBBM Ketapang Banyuwangi',-8.14,114.39,20e9,'KTb']]
            .map((d, i) => ({ id: 'KILANG-' + String(4 + i).padStart(2, '0'), nama: d[0], tipe: 'Depo Cabang BBM', lat: d[1], lon: d[2], berth: d[4], is_unlocked: false, stok_current: 0, stok_max: 100000, unit: 'Bbl', harga_beli: d[3] * 2, mekanikId: null })));

        // TBBM Ketapang Banyuwangi (KILANG-17) melayani BBM sekaligus LPG (unit gauge tetap Bbl untuk BBL mentah).
        refineryData.forEach(k => { if (k.nama === 'TBBM Ketapang Banyuwangi') k.tipe = 'Depo Cabang BBM & LPG'; });

        // Tangki BBL mentah depo cabang BBM = 50% dari Kilang Utama Tuban (5.000.000 Bbl -> 2.500.000 Bbl). Depo LPG murni (Gresik) tidak memakai tangki ini.
        const DEPO_BBL_RATIO = 0.5, DEPO_BBL_MAX0 = Math.round(refineryData[0].stok_max * DEPO_BBL_RATIO);
        refineryData.forEach((k, i) => { if (i > 0 && String(k.tipe).includes('BBM')) k.stok_max = DEPO_BBL_MAX0; });

        // ===== KAPASITAS DEPO PER JENIS PRODUK (Pusat & Cabang) =====
        // Setiap Kilang/Depo kini punya tangki terpisah per jenis BBM & LPG, masing-masing bisa di-upgrade sendiri.
        // refineRatio = jumlah Bbl bahan mentah yang dibutuhkan untuk mengolah 1 unit produk ini (BBM pakai rasio Bbl->KL yang sama dengan ECO.bblPerKl, LPG disamakan 1:1 seperti konvensi transfer kapal/darat).
        // refineRate  = sisa dari desain lama, tidak dipakai lagi untuk kecepatan; BBL->BBM sekarang diproses manual lewat tombol Konversi (lihat convertBblKeProduk & BBL_CONVERT_STEP).
        const PRODUCT_META = {
            pertalite:      { label: 'Pertalite',      unit: 'KL',  icon: 'fa-gas-pump',       color: '#22c55e', step: 3000, baseCost: 900e6,  refineRatio: ECO.bblPerKl, refineRate: 40 },
            pertamax:       { label: 'Pertamax',       unit: 'KL',  icon: 'fa-gas-pump',       color: '#3b82f6', step: 2500, baseCost: 950e6,  refineRatio: ECO.bblPerKl, refineRate: 30 },
            pertamax_turbo: { label: 'Pertamax Turbo', unit: 'KL',  icon: 'fa-bolt',           color: '#a855f7', step: 1500, baseCost: 1100e6, refineRatio: ECO.bblPerKl, refineRate: 18 },
            solar:          { label: 'Solar',          unit: 'KL',  icon: 'fa-oil-can',        color: '#f59e0b', step: 3000, baseCost: 850e6,  refineRatio: ECO.bblPerKl, refineRate: 40 },
            dexlite:        { label: 'Dexlite',        unit: 'KL',  icon: 'fa-oil-can',        color: '#06b6d4', step: 2000, baseCost: 1000e6, refineRatio: ECO.bblPerKl, refineRate: 22 },
            lpg_curah:      { label: 'LPG Curah',      unit: 'Ton', icon: 'fa-truck-ramp-box', color: '#f97316', step: 1500, baseCost: 1200e6 },   // harga beli LPG Curah dinamis: lpgCurahPrice() di 04a-pasar-harga.js
            lpg_tabung:     { label: 'LPG Tabung',     unit: 'Ton', icon: 'fa-dolly',          color: '#ef4444', step: 1200, baseCost: 1050e6 }
        };
        // Ukuran sekali klik tombol "Konversi BBL -> BBM" (BBL diolah manual lewat tombol, bukan otomatis lagi).
        const BBL_CONVERT_STEP = { pertalite: 5000, pertamax: 4000, pertamax_turbo: 2000, solar: 5000, dexlite: 3000 };
        const REFINE_TICK_MS = 2000; // dipakai untuk durasi kedip animasi "Diolah" saat tombol konversi diklik
        const KAP_GROUP = {
            'Pusat Utama': Object.keys(PRODUCT_META),
            'Depo Cabang BBM': ['pertalite', 'pertamax', 'pertamax_turbo', 'solar', 'dexlite'],
            'Depo Cabang LPG': ['lpg_curah', 'lpg_tabung'],
            'Depo Cabang BBM & LPG': ['pertalite', 'pertamax', 'pertamax_turbo', 'solar', 'dexlite', 'lpg_curah', 'lpg_tabung']
        };
        // Tangki LPG (curah & tabung): Tuban 200.000 Ton, depo cabang = 50% Tuban (100.000 Ton). Stok awal Tuban: LPG Curah 100.000 Ton, LPG Tabung 6.000 Ton (bukan penuh).
        const LPG_TUBAN_MAX0 = 200000, LPG_DEPO_MAX0 = Math.round(LPG_TUBAN_MAX0 * DEPO_BBL_RATIO), LPG_TUBAN_START_STOK = 6000, LPG_CURAH_START_STOK = 100000, BBM_TUBAN_START_STOK = 5000; // BBM_TUBAN_START_STOK = stok awal tiap jenis BBM jadi di Tuban (KL); kapasitas tangki tetap 40.000
        function initKapasitasDepo() {
            refineryData.forEach(k => {
                if (k.kap) return;
                const keys = KAP_GROUP[k.tipe] || [];
                k.kap = {};
                keys.forEach(key => {
                    const isLpg = key.startsWith('lpg');
                    const startMax = k.tipe === 'Pusat Utama' ? (isLpg ? LPG_TUBAN_MAX0 : 40000) : (isLpg ? LPG_DEPO_MAX0 : 15000);
                    k.kap[key] = { max: startMax, cur: 0, level: 0 };
                });
                if (k.id === 'KILANG-01') {
                    // Awal main: BBM jadi Tuban 5.000 KL per jenis, LPG curah 100.000 Ton, LPG tabung 6.000 Ton (bukan penuh).
                    Object.entries(k.kap).forEach(([key, s]) => { s.cur = key === 'lpg_curah' ? Math.min(s.max, LPG_CURAH_START_STOK) : key.startsWith('lpg') ? Math.min(s.max, LPG_TUBAN_START_STOK) : Math.min(s.max, BBM_TUBAN_START_STOK); });
                }
            });
        }
        initKapasitasDepo();

        // ===== KOTAK NOTIFIKASI (sistem + klaim top up) =====
        let notifs = [], notifUnread = 0, pendingTopups = [];
        // ===== EFEK SUARA (Web Audio API, nada sintetis - tanpa file audio eksternal, ringan & offline) =====
        let audioCtx = null, soundEnabled = true;
        try { const sv = localStorage.getItem('pmid_sound'); if (sv !== null) soundEnabled = sv === '1'; } catch (e) { /* localStorage tidak tersedia, default nyala */ }
        function getAudioCtx() {
            if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            return audioCtx;
        }
        // Buka/kunci AudioContext sedini mungkin lewat interaksi pertama pengguna (kebijakan autoplay browser).
        document.addEventListener('click', () => getAudioCtx(), { once: true });
        function beep(freq, durMs, type, startDelay, vol) {
            if (!soundEnabled) return;
            const ctx = getAudioCtx();
            if (!ctx) return;
            const t0 = ctx.currentTime + (startDelay || 0);
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0); osc.stop(t0 + durMs / 1000 + 0.03);
        }
        // Notifikasi/alert: nada lembut naik utk info, nada dua-ketuk lebih tegas utk peringatan (warn).
        function playSoundNotif(level) {
            if (level === 'warn') { beep(660, 150, 'square', 0, 0.12); beep(440, 220, 'square', 0.16, 0.12); }
            else { beep(880, 130, 'sine', 0, 0.11); beep(1180, 150, 'sine', 0.08, 0.11); }
        }
        // Truk/kapal berangkat: nada rendah naik pendek. Truk/kapal tiba: nada tiga-ketuk naik (lebih ceria).
        function playSoundDepart() { beep(392, 90, 'triangle', 0, 0.13); beep(523, 140, 'triangle', 0.08, 0.13); }
        function playSoundArrive() { beep(659, 100, 'sine', 0, 0.13); beep(784, 100, 'sine', 0.09, 0.13); beep(988, 180, 'sine', 0.18, 0.13); }
        function renderSoundBtn() {
            const b = document.getElementById('sound-toggle-btn');
            if (b) b.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        }
        function toggleSound() {
            soundEnabled = !soundEnabled;
            try { localStorage.setItem('pmid_sound', soundEnabled ? '1' : '0'); } catch (e) { /* abaikan kalau localStorage diblokir */ }
            renderSoundBtn();
            if (soundEnabled) playSoundNotif('info');
        }
        renderSoundBtn();

        function notify(text, level) {
            playSoundNotif(level);
            notifs.unshift({ text, level: level || 'info', t: gameStamp() });
            if (notifs.length > 30) notifs.pop();
            notifUnread++; renderNotif();
        }
        function clearNotif() { notifs = []; notifUnread = 0; renderNotif(); }
        function toggleNotif() {
            const pn = document.getElementById('notif-panel'); pn.classList.toggle('hidden');
            if (!pn.classList.contains('hidden')) { notifUnread = 0; renderNotif(); positionNotifPanel(); }
        }
        // FIX BUG panel lonceng di HP: hitung ulang posisi top panel = tepat di bawah header
        // (bukan cuma di bawah ikon), supaya tidak menimpa/kepotong saat header pecah 2 baris.
        function positionNotifPanel() {
            const header = document.querySelector('header');
            const btn = document.querySelector('#notif-wrap > button');
            const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
            const top = (!isMobile && btn) ? btn.getBoundingClientRect().bottom + 8 : (header ? header.getBoundingClientRect().bottom + 6 : 64);
            document.documentElement.style.setProperty('--notif-panel-top', top + 'px');
        }
        window.addEventListener('resize', () => {
            const pn = document.getElementById('notif-panel');
            if (pn && !pn.classList.contains('hidden')) positionNotifPanel();
        });
        document.addEventListener('click', e => { if (!e.target.closest('#notif-wrap')) document.getElementById('notif-panel').classList.add('hidden'); });
        function renderNotif() {
            const n = pendingTopups.length + notifUnread, bd = document.getElementById('notif-badge');
            bd.textContent = n > 99 ? '99+' : n; bd.classList.toggle('hidden', !n);
            document.getElementById('notif-sys').innerHTML = notifs.length ? notifs.map(x => `<div class="rounded-lg border px-2.5 py-1.5 ${x.level === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-gray-950 border-gray-800 text-gray-300'}"><div class="text-[9px] text-gray-500">${esc(x.t)}</div>${esc(x.text)}</div>`).join('') : '<div class="text-gray-600 px-1">Tidak ada notifikasi sistem.</div>';
        }
        // ===== TAB LOG: pisahkan log Aktivitas umum dari log Truk & Perjalanan =====
        let activeLogTab = 'general', truckLogUnread = 0;
        function switchLogTab(tab) {
            activeLogTab = tab;
            document.getElementById('activity-log').classList.toggle('hidden', tab !== 'general');
            document.getElementById('truck-log').classList.toggle('hidden', tab !== 'truck');
            document.getElementById('logtab-btn-general').className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition ' + (tab === 'general' ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300');
            document.getElementById('logtab-btn-truck').className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition relative ' + (tab === 'truck' ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300');
            if (tab === 'truck') { truckLogUnread = 0; }
            renderTruckBadge();
        }
        function renderTruckBadge() {
            const bd = document.getElementById('truck-log-badge');
            bd.textContent = truckLogUnread > 99 ? '99+' : truckLogUnread;
            bd.classList.toggle('hidden', !truckLogUnread || activeLogTab === 'truck');
        }
        // cat: 'general' (default, semua aktivitas non-truk) atau 'truck' (khusus log berangkat/tiba/bongkar muatan)
        function addLog(msg, type = 'info', cat = 'general') {
            if (type === 'warning' || /^(PERINGATAN|PAJAK|CLOUD|PEMBELIAN BBM)/.test(msg)) notify(msg, type === 'warning' ? 'warn' : 'info');
            if (cat === 'truck') {
                if (/^BERANGKAT/.test(msg)) playSoundDepart();
                else if (/^(TIBA:|TIBA DI DEPOT|SANDAR)/.test(msg)) playSoundArrive();
            }
            const container = document.getElementById(cat === 'truck' ? 'truck-log' : 'activity-log');
            const div = document.createElement('div');
            const now = gameStamp();
            div.innerText = `[${now}] ${msg}`;
            if (type === 'success') div.className = 'text-green-400';
            else if (type === 'purple') div.className = 'text-purple-400';
            else if (type === 'warning') div.className = 'text-amber-400';
            else div.className = 'text-gray-300';
            container.prepend(div);
            if (cat === 'truck' && activeLogTab !== 'truck') { truckLogUnread++; renderTruckBadge(); }
        }

        // Toast singkat mengambang di atas layar (mis. konfirmasi "UID berhasil disalin"), hilang otomatis
        function showToast(text, ok = true) {
            const wrap = document.getElementById('toast-wrap');
            const el = document.createElement('div');
            el.className = 'toast-item ' + (ok ? 'ok' : 'err');
            el.innerHTML = `<i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${esc(text)}</span>`;
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }
        async function copyAcctUid() {
            const uid = currentAccount ? currentAccount.id : '';
            if (!uid) return;
            try {
                if (navigator.clipboard) await navigator.clipboard.writeText(uid);
                else throw new Error('no-clipboard');
                showToast('UID berhasil disalin.');
            } catch (e) { showToast('Gagal menyalin UID, salin manual ya.', false); }
        }

        // Isi pesan modal secara aman: hanya <b>...</b>, <br>, dan baris baru (\n) yang dirender sebagai format.
        // Semua teks lain (termasuk nama/plat dari pemain) tetap dimasukkan sebagai teks biasa, jadi tidak bisa menyisipkan HTML.
        function setModalMessage(el, message) {
            el.textContent = '';
            let bold = null;
            String(message).split(/(<\/?b>|<br\s*\/?>|\n)/i).forEach(part => {
                if (!part) return;
                const tag = part.toLowerCase();
                if (tag === '<b>') { bold = document.createElement('b'); el.appendChild(bold); }
                else if (tag === '</b>') { bold = null; }
                else if (tag === '\n' || /^<br/.test(tag)) (bold || el).appendChild(document.createElement('br'));
                else (bold || el).appendChild(document.createTextNode(part));
            });
        }

        function showModal(title, message, iconClass = 'fa-handshake', theme = 'purple') {
            document.getElementById('modal-title').innerText = title;
            setModalMessage(document.getElementById('modal-message'), message);
            
            const iconEl = document.getElementById('modal-icon');
            iconEl.className = `fa-solid ${iconClass}`;

            const iconBg = document.getElementById('modal-icon-bg');
            if (theme === 'blue') {
                iconBg.className = "w-14 h-14 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-blue-500/30";
            } else if (theme === 'red') {
                iconBg.className = "w-14 h-14 bg-red-600/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-red-500/30";
            } else {
                iconBg.className = "w-14 h-14 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-purple-500/30";
            }

            document.getElementById('custom-modal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('custom-modal').classList.add('hidden');
        }

        // ===== Konfirmasi kustom (pengganti confirm() bawaan browser) =====
        const CONFIRM_THEMES = {
            amber: { bg: 'w-14 h-14 bg-amber-600/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-amber-500/30', btn: 'bg-amber-600 hover:bg-amber-700' },
            red: { bg: 'w-14 h-14 bg-red-600/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-red-500/30', btn: 'bg-red-600 hover:bg-red-700' },
            blue: { bg: 'w-14 h-14 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-blue-500/30', btn: 'bg-blue-600 hover:bg-blue-700' }
        };
        let _confirmResolve = null;
        function showConfirm(message, opts = {}) {
            const { title = 'Konfirmasi', iconClass = 'fa-triangle-exclamation', theme = 'amber', okLabel = 'OK', cancelLabel = 'Batal' } = opts;
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            document.getElementById('confirm-ok-btn').textContent = okLabel;
            document.getElementById('confirm-cancel-btn').textContent = cancelLabel;
            document.getElementById('confirm-icon').className = `fa-solid ${iconClass}`;
            const t = CONFIRM_THEMES[theme] || CONFIRM_THEMES.amber;
            document.getElementById('confirm-icon-bg').className = t.bg;
            document.getElementById('confirm-ok-btn').className = 'flex-1 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-lg ' + t.btn;
            document.getElementById('confirm-modal').classList.remove('hidden');
            return new Promise(resolve => { _confirmResolve = resolve; });
        }
        function _confirmDone(v) {
            document.getElementById('confirm-modal').classList.add('hidden');
            if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(v); }
        }

