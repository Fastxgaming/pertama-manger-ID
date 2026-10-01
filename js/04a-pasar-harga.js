        // ===== PASAR BBL MENTAH & LPG CURAH (HARGA DINAMIS) =====
        // Harga beli di Kilang Utama tidak lagi tetap. Harga = harga dasar x indeks pasar, dan indeks bergerak mengikuti jam game:
        //   1) gelombang harga (cepat / sedang / lambat)  2) getaran kecil per jam game  3) BERITA PASAR acak (OPEC+, kurs, musim dingin, dst.)
        // Indeks dihitung DETERMINISTIK dari jam game (gameNow), jadi tidak perlu disimpan di save, tidak bisa "diputar ulang" dengan reload,
        // dan ikut berhenti saat game dijeda. Pembelian manual, pesanan otomatis Pass, dan tanda tangan semuanya memakai harga saat itu.
        //
        // Maksud desain: harga dasar (Rp 430 rb/Bbl, Rp 2,9 jt/Ton) tetap = rata-rata. Saat harga MURAH pemain bisa menimbun stok (butuh tangki
        // besar & kas), saat MAHAL margin menipis atau rugi bila beli mentah-mentah. HPP anjungan (Alpha 215 rb, Bravo 190 rb, Gamma 1,45 jt) TETAP,
        // jadi makin sering harga pasar mahal, makin terasa untungnya punya anjungan sendiri.
        //
        // Semua angka yang boleh diutak-atik ada di MARKET_CFG.
        const MARKET_CFG = {
            bbl: { base: 430000,  min: 0.72, max: 1.55, seed: 11, perMul: 1.00, phase: [0, 0, 3.142], round: 500,   label: 'BBL Mentah', unit: 'Bbl' },
            lpg: { base: 2900000, min: 0.78, max: 1.45, seed: 29, perMul: 1.17, phase: [3.665, 3.665, 1.571], round: 5000,  label: 'LPG Curah',  unit: 'Ton' },
            swing: [[30, 0.07], [110, 0.12], [340, 0.09]],   // [periode dalam JAM game, amplitudo]. 1 hari game = 24 jam = 2 jam nyata
            noise: 0.025,                                     // getaran acak halus per jam game
            eventEpochH: 96, eventChance: 0.50,               // tiap 4 hari game, peluang 50% ada berita pasar (berlangsung 1-3 hari game)
            eventMag: [0.14, 0.32], eventUpBias: 0.55         // besar dampak berita; 55% berita bikin harga naik
        };
        const MARKET_NEWS = {
            bbl_up:   ['OPEC+ sepakat memangkas kuota produksi minyak', 'Ketegangan Timur Tengah mengganggu jalur pasokan tanker', 'Rupiah melemah terhadap dolar AS, impor minyak lebih mahal', 'Beberapa kilang Asia berhenti untuk perawatan'],
            bbl_down: ['Stok minyak global melimpah', 'Permintaan minyak Tiongkok melemah', 'Rupiah menguat terhadap dolar AS', 'Produksi minyak Amerika mencetak rekor'],
            lpg_up:   ['Musim dingin di Asia mengerek permintaan LPG', 'Gangguan pengiriman di terminal ekspor LPG', 'Harga acuan LPG Aramco naik'],
            lpg_down: ['Pasokan LPG global membanjir', 'Musim panas, permintaan LPG turun', 'Terminal ekspor tambah kapasitas, pasokan LPG longgar'],
            both_up:  ['Krisis energi regional mendorong harga migas'],
            both_down:['Kekhawatiran resesi global menekan harga migas']
        };
        const mkHash = (a, b) => { let x = Math.imul((a | 0) + 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((b | 0) + 0x27D4EB2F, 0xC2B2AE35); x ^= x >>> 15; x = Math.imul(x, 0x2C1B3C6D); x ^= x >>> 12; x = Math.imul(x, 0x297A2D39); x ^= x >>> 15; return (x >>> 0) / 4294967296; };
        const mkNoise = (h, seed) => { const i = Math.floor(h), f = h - i, s = f * f * (3 - 2 * f); return (mkHash(i, seed) * 2 - 1) * (1 - s) + (mkHash(i + 1, seed) * 2 - 1) * s; };
        const marketHour = () => Math.max(0, (gameNow() - GAME_START) / 3600000);   // jam game sejak awal permainan

        // Berita pasar untuk "epoch" 4 hari game yang memuat jam h (null bila tidak ada / sedang tidak aktif).
        function marketEventAt(h) {
            const EH = MARKET_CFG.eventEpochH, ep = Math.floor(h / EH);
            if (mkHash(ep, 101) > MARKET_CFG.eventChance) return null;
            const off = mkHash(ep, 102) * 24, dur = 24 + mkHash(ep, 103) * 48;
            const [m0, m1] = MARKET_CFG.eventMag, mag = m0 + mkHash(ep, 104) * (m1 - m0);
            const up = mkHash(ep, 105) < MARKET_CFG.eventUpBias, tg = mkHash(ep, 106);
            const target = tg < 0.4 ? 'bbl' : tg < 0.7 ? 'lpg' : 'both';
            const list = MARKET_NEWS[target + (up ? '_up' : '_down')];
            const start = ep * EH + off, end = start + dur;
            if (h < start || h > end) return null;
            const p = (h - start) / dur, env = p < 0.25 ? p / 0.25 : p > 0.75 ? (1 - p) / 0.25 : 1;
            return { id: ep, target, up, mag, txt: list[Math.floor(mkHash(ep, 107) * list.length)], env, start, end };
        }
        function marketIdx(kind, h) {
            const c = MARKET_CFG[kind]; let v = 1;
            MARKET_CFG.swing.forEach(([per, amp], i) => { v += amp * Math.sin(2 * Math.PI * (h / (per * c.perMul)) + c.phase[i]); });   // fase dipilih supaya harga awal permainan mendekati normal (indeks ~1,0)
            v += MARKET_CFG.noise * mkNoise(h, c.seed);
            const ev = marketEventAt(h);
            if (ev && (ev.target === 'both' || ev.target === kind)) v += (ev.up ? 1 : -1) * ev.mag * ev.env * (ev.target === 'both' ? 0.8 : 1);
            return Math.min(c.max, Math.max(c.min, v));
        }
        const marketPriceAt = (kind, h) => { const c = MARKET_CFG[kind]; return Math.round(c.base * marketIdx(kind, h) / c.round) * c.round; };
        const marketPrice = kind => marketPriceAt(kind, marketHour());
        const bblPrice = () => marketPrice('bbl');
        const lpgCurahPrice = () => marketPrice('lpg');

        function marketStatus(idx) {
            if (idx < 0.90) return { txt: 'MURAH', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40', hint: 'Waktu yang bagus untuk menimbun stok.' };
            if (idx < 1.08) return { txt: 'WAJAR', cls: 'text-sky-300 bg-sky-500/15 border-sky-500/40', hint: 'Harga normal, beli seperlunya.' };
            if (idx < 1.25) return { txt: 'MAHAL', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/40', hint: 'Tahan pembelian kalau stok masih aman.' };
            return { txt: 'SANGAT MAHAL', cls: 'text-red-300 bg-red-500/15 border-red-500/40', hint: 'Margin terjepit; beli mentah sekarang bisa merugi.' };
        }
        function marketInfo(kind) {
            const c = MARKET_CFG[kind], h = marketHour(), price = marketPriceAt(kind, h), idx = price / c.base;
            const prev = marketPriceAt(kind, Math.max(0, h - 12)) / c.base;
            const series = []; for (let i = 24; i >= 0; i--) series.push(marketPriceAt(kind, Math.max(0, h - i * 3)) / c.base);   // 3 hari game terakhir
            const ev = marketEventAt(h), evKind = ev && (ev.target === 'both' || ev.target === kind) ? ev : null;
            return { kind, c, price, idx, delta: idx - prev, pct: (idx - 1) * 100, status: marketStatus(idx), series, ev: evKind };
        }
        function marketSpark(series, idx) {
            const W = 120, H = 26, lo = 0.7, hi = 1.6, y = v => (H - 2) - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (H - 4);
            const pts = series.map((v, i) => `${(i / (series.length - 1) * W).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
            const col = idx < 0.90 ? '#34d399' : idx < 1.08 ? '#38bdf8' : idx < 1.25 ? '#fbbf24' : '#f87171';
            return `<svg viewBox="0 0 ${W} ${H}" class="w-full h-7" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${y(1).toFixed(1)}" y2="${y(1).toFixed(1)}" stroke="#4b5563" stroke-width="0.6" stroke-dasharray="2 2"/><polyline fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" points="${pts}"/></svg>`;
        }
        // Panel harga pasar (dipakai di kartu BBL mentah & LPG Curah Kilang Utama). data-mkt dipakai untuk penyegaran otomatis.
        function marketPanelHtml(kind) {
            const m = marketInfo(kind), up = m.delta > 0.004, dn = m.delta < -0.004;
            const arrow = up ? '<i class="fa-solid fa-arrow-trend-up text-red-400"></i>' : dn ? '<i class="fa-solid fa-arrow-trend-down text-emerald-400"></i>' : '<i class="fa-solid fa-minus text-gray-400"></i>';
            const news = m.ev ? `<div class="text-[10px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 mt-1"><i class="fa-solid fa-newspaper mr-1"></i>${m.ev.txt}${m.ev.up ? ' (harga cenderung naik)' : ' (harga cenderung turun)'}</div>` : '';
            return `<div data-mkt="${kind}" class="rounded-lg border border-gray-800 bg-gray-900/60 px-2 py-1.5">
                <div class="flex items-center justify-between gap-2">
                    <div class="text-[10px] text-gray-400"><i class="fa-solid fa-chart-line mr-1"></i>Harga pasar ${m.c.label}</div>
                    <span class="text-[9px] font-bold border rounded px-1.5 py-0.5 ${m.status.cls}">${m.status.txt}</span>
                </div>
                <div class="flex items-end justify-between gap-2 mt-0.5">
                    <div class="text-sm font-bold text-white font-mono">${formatRupiah(m.price)}<span class="text-[10px] text-gray-400 font-normal">/${m.c.unit}</span></div>
                    <div class="text-[10px] font-mono ${m.pct > 0 ? 'text-red-300' : 'text-emerald-300'}">${arrow} ${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(1)}% <span class="text-gray-500">dari normal</span></div>
                </div>
                ${marketSpark(m.series, m.idx)}
                <div class="text-[9px] text-gray-500">Normal ${formatRupiah(m.c.base)}/${m.c.unit} &middot; grafik 3 hari game terakhir &middot; ${m.status.hint}</div>
                ${news}
            </div>`;
        }
        // Teks singkat untuk konfirmasi pembelian (dipakai supplyOrderFlow).
        function marketBuyNote(key) {
            const kind = key === 'bbl' ? 'bbl' : key === 'lpg_curah' ? 'lpg' : null; if (!kind) return '';
            const m = marketInfo(kind);
            return ` Harga pasar sedang ${m.status.txt} (${m.pct >= 0 ? '+' : ''}${m.pct.toFixed(0)}% dari normal).`;
        }
        // Penyegaran panel + pengumuman berita pasar (dipanggil tiap beberapa detik).
        let marketLastNewsId;   // undefined = belum diinisialisasi (jangan umumkan berita yang sudah berjalan saat load)
        function tickMarket() {
            document.querySelectorAll('[data-mkt]').forEach(el => { const k = el.getAttribute('data-mkt'); if (MARKET_CFG[k]) el.outerHTML = marketPanelHtml(k); });
            const ev = marketEventAt(marketHour());
            const id = ev ? ev.id : null;
            if (id !== marketLastNewsId) {
                if (ev && marketLastNewsId !== undefined) {
                    const tg = ev.target === 'both' ? 'BBL & LPG Curah' : ev.target === 'bbl' ? 'BBL Mentah' : 'LPG Curah';
                    addLog(`BERITA PASAR: ${ev.txt}. Harga ${tg} cenderung ${ev.up ? 'NAIK' : 'TURUN'} beberapa hari game ke depan.`, ev.up ? 'warning' : 'info');
                    notify(`Berita pasar: ${ev.txt}`, ev.up ? 'warn' : 'info');
                }
                marketLastNewsId = id;
            }
        }
        setInterval(() => { if (typeof currentAccount !== 'undefined' && currentAccount) { try { tickMarket(); } catch (e) {} } }, 5000);
