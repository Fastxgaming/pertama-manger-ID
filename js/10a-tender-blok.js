        // ===== TENDER BLOK MIGAS & EKSPLORASI (HULU TAHAP 4) =====
        // Alur: blok terbuka -> ikut LELANG (bisa kalah, dana kembali sebagian) -> menang -> SURVEI SEISMIK (membuka peluang sukses
        // yang sebenarnya) -> BOR EKSPLORASI -> SUKSES (anjungan baru, HPP lebih murah dari Alpha/Bravo/Gamma) atau DRY HOLE (uang habis).
        // Blok sukses didaftarkan sebagai anjungan DINAMIS ke HULU_SITES / HULU_KEYS (file 11-hulu-upstream.js), jadi bangun, upgrade, pipa,
        // kapal, cuaca, HPP, dan peta memakai kode hulu yang sama. Anjungan baru masih harus dibangun (biaya pengembangan lebih kecil dari lelang).
        //
        // Dimuat SEBELUM 11-hulu-upstream.js: file ini hanya berisi konstanta & fungsi. Semua rujukan ke HULU_* / hulu hanya dipakai
        // saat fungsi dipanggil (setelah semua file termuat), jadi aman.
        //
        // Hasil sudah "ditentukan" saat blok dibuat (b.roll untuk bor, b.auRoll untuk lelang, disimpan di save), jadi reload/save ulang
        // tidak bisa dipakai untuk mengulang undian.

        const TENDER = {
            hours: { lelang: 8, seismik: 10, bor: 20 },   // jam game (1 hari game = 2 jam nyata)
            openMin: 4, openMax: 6, listMax: 14,          // jumlah blok terbuka minimum/maksimum yang dijaga sistem
            refund: 0.92,                                 // kalah lelang: dana kembali 92% (sisanya biaya administrasi)
            seisPct: 0.05, borPct: 0.11,                  // biaya seismik & bor = persen dari nilai lelang dasar
            newEveryMs: 3 * 86400000,                     // blok baru muncul tiap 3 hari game (selama blok terbuka < openMax)
            bidMode: { std: { mult: 1.0, win: 0.60, label: 'Penawaran Standar' }, agr: { mult: 1.3, win: 0.90, label: 'Penawaran Agresif' } },
            base: { oil: 430000, gas: 2900000 },          // sama dengan harga dasar di 04a-pasar-harga.js (pembanding HPP)
            // Kelas blok. bid = nilai lelang (Rp), rate = produksi/hari, dev = biaya bangun anjungan, hppF = HPP sebagai pecahan harga dasar pasar,
            // p = peluang sukses rata-rata. Alpha/Bravo/Gamma punya HPP ±44-50% dari harga dasar, jadi blok baru jauh lebih murah.
            tiers: {
                1: { label: 'Blok Kecil',     bid: [150e9, 400e9],   rate: [2.8e6, 3.4e6], dev: [60e9, 95e9],   hours: 16, hppF: 0.46, p: 0.55 },
                2: { label: 'Blok Menengah',  bid: [600e9, 1.2e12],  rate: [3.8e6, 4.8e6], dev: [120e9, 180e9], hours: 20, hppF: 0.38, p: 0.40 },
                3: { label: 'Blok Raksasa',   bid: [1.5e12, 3e12],   rate: [5.2e6, 6.5e6], dev: [220e9, 320e9], hours: 24, hppF: 0.30, p: 0.30 }
            },
            opexPer25: { oil: 9e9, gas: 4.8e9 }          // opex/minggu untuk produksi 2,5 juta/hari (acuan Alpha & Gamma), dikali 1,1 untuk blok baru
        };
        // Perairan tempat blok muncul. node = titik lajur laut terdekat (SEA_NODES, 07a-rute-laut.js) tempat dermaga blok disambungkan.
        // off = [lat min, lat maks, lon min, lon maks] jarak acak dari titik itu (derajat); diatur supaya blok tetap di air.
        const TENDER_AREAS = [
            { n: 'Madura Timur',          node: 'K2',  lat: -6.62, lon: 114.85 },
            { n: 'Laut Bali Utara',       node: 'K3',  lat: -7.35, lon: 114.80 },
            { n: 'Laut Jawa Timur',       node: 'E1',  lat: -6.30, lon: 115.20 },
            { n: 'Paparan Sunda',         node: 'E2',  lat: -6.30, lon: 117.00 },
            { n: 'Laut Jawa Tengah',      node: 'J3',  lat: -6.30, lon: 110.00, off: [0, 0.3, -0.25, 0.25] },
            { n: 'Laut Jawa Barat',       node: 'J2',  lat: -6.10, lon: 109.00, off: [0, 0.3, -0.25, 0.25] },
            { n: 'Selat Makassar Selatan', node: 'MS1', lat: -4.20, lon: 117.90 },
            { n: 'Selat Makassar Tengah', node: 'MS2', lat: -2.60, lon: 118.05 },
            { n: 'Barito Lepas Pantai',   node: 'BJ1', lat: -4.90, lon: 114.90 }
        ];
        // Pesaing AI. Lelang = bandingkan penawaran Anda dengan penawaran tertinggi pesaing (diturunkan dari b.auRoll, jadi tidak bisa diulang lewat reload).
        // Peluang menang tetap 60% (standar, x1,0) dan 90% (agresif, x1,3). Gaya hanya untuk tampilan.
        const TENDER_RIVALS = [
            { n: 'Nusantara Energi Lepas Pantai', style: 'agresif' }, { n: 'Samudra Petroleum', style: 'hati-hati' },
            { n: 'Garuda Eksplorasi', style: 'oportunis' },           { n: 'Borneo Offshore Partners', style: 'konservatif' },
            { n: 'Cakra Migas Internasional', style: 'agresif' }
        ];
        // Blok Nasional: blok yang SAMA untuk semua pemain, dibangkitkan deterministik dari jam nyata (tanpa server). Pemain nyata yang lebih dulu
        // mengajukan penawaran merebut hak lelangnya (transaksi atomik Firestore, koleksi blok_claims). Pesaing AI juga bisa merebutnya (snipeAt).
        const TENDER_NAT = { epochMs: 6 * 3600000, slots: 2, life: 2 };
        const TENDER_STAGES = ['open', 'tender', 'won', 'seismic', 'surveyed', 'drilling'];
        const TENDER_STAGE_UI = {
            open:     { label: 'Terbuka',            color: '#64748b' },
            tender:   { label: 'Lelang berlangsung', color: '#f59e0b' },
            won:      { label: 'Blok dimenangkan',   color: '#22c55e' },
            seismic:  { label: 'Survei seismik',     color: '#38bdf8' },
            surveyed: { label: 'Siap dibor',         color: '#14b8a6' },
            drilling: { label: 'Pengeboran',         color: '#a855f7' }
        };
        let huluView = 'site';   // 'site' = anjungan, 'tender' = tender blok (tab Hulu)

        const tRnd = (a, b) => a + Math.random() * (b - a);
        const tRound = (v, step) => Math.round(v / step) * step;
        const tenderBlokDefault = () => ({ seq: 0, list: [], hist: [], sites: {}, spent: 0, hits: 0, dry: 0, nextGt: 0 });
        let tenderNat = {}, tenderClaims = {}, tenderClaimsReady = false, tenderClaimUnsub = null, tenderNatPrev = '';
        const tenderFind = id => (hulu.blok && (hulu.blok.list.find(b => b.id === id) || tenderNat[id])) || null;
        const tenderName = b => 'Blok ' + TENDER_AREAS[b.ai].n + ' ' + (b.nat ? 'N' + (b.seq % 1000) : b.seq);
        const tenderSeis = b => tRound(b.bid * TENDER.seisPct, 1e9);
        const tenderBor = b => tRound(b.bid * TENDER.borPct, 1e9);
        const tenderOpenCount = () => hulu.blok.list.filter(b => b.stage === 'open').length;
        const tenderUnit = fuel => (fuel === 'gas' ? 'Ton' : 'Bbl');

        // ---------- Pembuatan blok & parameter anjungan ----------
        function tenderDev(tier, fuel, rate, rr) {
            rr = rr || tRnd;
            const T = TENDER.tiers[tier];
            return {
                rate, cap: tRound(rate * 4, 1e5),   // tangki = ±4 hari produksi, sama seperti anjungan lama
                buildCost: tRound(rr(T.dev[0], T.dev[1]), 1e9), buildHours: T.hours,
                opexWeek: tRound(rate / 2.5e6 * TENDER.opexPer25[fuel] * 1.1, 1e8),
                hpp: tRound(TENDER.base[fuel] * T.hppF * rr(0.94, 1.06), fuel === 'oil' ? 500 : 5000)
            };
        }
        // R = pembangkit acak (Math.random untuk blok pribadi, PRNG berbenih untuk Blok Nasional supaya semua pemain melihat blok yang sama).
        function tenderBuild(R, seq, id) {
            const rr = (a, b) => a + R() * (b - a);
            const ai = Math.floor(R() * TENDER_AREAS.length), a = TENDER_AREAS[ai], off = a.off || [-0.2, 0.2, -0.25, 0.25];
            const w = R(), tier = w < 0.5 ? 1 : w < 0.85 ? 2 : 3, T = TENDER.tiers[tier];
            const fuel = R() < 0.7 ? 'oil' : 'gas';
            const rate = tRound(rr(T.rate[0], T.rate[1]), 1e5);
            return {
                id, seq, ai, tier, fuel,
                lat: +(a.lat + rr(off[0], off[1])).toFixed(4), lon: +(a.lon + rr(off[2], off[3])).toFixed(4),
                bid: tRound(rr(T.bid[0], T.bid[1]), 10e9),
                p: Math.min(0.85, Math.max(0.08, T.p + rr(-0.18, 0.18))), roll: R(), auRoll: R(),
                stage: 'open', stageGt: 0, mode: '', sunk: 0, nat: false, nk: '', snipeAt: 0, dev: tenderDev(tier, fuel, rate, rr)
            };
        }
        function tenderNewBlock() {
            const bk = hulu.blok, seq = ++bk.seq, b = tenderBuild(Math.random, seq, 'b' + seq);
            bk.list.push(b);
            return b;
        }
        // Pesaing AI untuk blok ini (murni fungsi dari auRoll): penawaran tertinggi pesaing (kelipatan nilai lelang) + daftar pesaing yang tertarik.
        function tenderRivalsOf(b) {
            const u = b.auRoll, f = k => (u * k) % 1;
            const top = u < 0.6 ? 0.80 + (u / 0.6) * 0.20 : u < 0.9 ? 1.0 + ((u - 0.6) / 0.3) * 0.30 : 1.30 + ((u - 0.9) / 0.1) * 0.25;
            const lead = Math.floor(f(7919) * TENDER_RIVALS.length), n = Math.min(3, 1 + (b.tier >= 2 ? 1 : 0) + (f(104729) < 0.4 ? 1 : 0));
            const names = []; for (let i = 0; i < n; i++) names.push(TENDER_RIVALS[(lead + i) % TENDER_RIVALS.length].n);
            return { top, bid: Math.floor(b.bid * top / 1e9 + 1e-9) * 1e9, lead: names[0], names };
        }
        function tenderEnsureOpen() {
            const bk = hulu.blok; let n = 0;
            while (tenderOpenCount() < TENDER.openMin && bk.list.length < TENDER.listMax && n++ < 10) tenderNewBlock();
        }

        // ---------- Anjungan dinamis (hasil blok sukses) ----------
        function tenderMakeSite(s) {
            const a = TENDER_AREAS[s.ai], gas = s.fuel === 'gas', d = s.dev;
            return {
                nama: 'Anjungan ' + (gas ? 'Gas ' : '') + a.n + ' ' + s.seq, short: (gas ? 'Gas ' : 'Minyak ') + a.n.split(' ').pop() + '-' + s.seq, area: a.n,
                berth: 'AN_' + s.id, fuel: s.fuel, unit: tenderUnit(s.fuel), jenis: gas ? 'gas bumi (LPG Curah)' : 'minyak mentah', shipType: gas ? 'LPG' : 'BBM',
                icon: gas ? 'fa-fire-flame-simple' : 'fa-oil-well', tone: ['sky', 'emerald', 'rose', 'violet', 'amber', 'teal'][s.seq % 6],
                lat: s.lat, lon: s.lon, buildCost: d.buildCost, buildHours: d.buildHours, rate: d.rate, cap: d.cap, opexWeek: d.opexWeek,
                minLoad: gas ? 50 : 500, hpp: d.hpp, dyn: true, blokId: s.id
            };
        }
        // live = true saat penemuan baru di tengah permainan (state anjungan & pipa dibuat sekarang). Saat muat save, state dibaca huluNormalize.
        function tenderRegisterSite(s, live) {
            const key = s.id, cfg = tenderMakeSite(s);
            seaAddNode(cfg.berth, s.lat, s.lon, TENDER_AREAS[s.ai].node);
            HULU_SITES[key] = cfg;
            if (HULU_KEYS.indexOf(key) < 0) HULU_KEYS.push(key);
            if (live) { hulu.sites[key] = huluSiteDefault(); hulu.pipes[key] = {}; }
            return cfg;
        }
        function tenderPurgeDynamic() {
            Object.keys(HULU_SITES).forEach(k => {
                if (!HULU_SITES[k].dyn) return;
                huluPurgeKey(k); delete HULU_SITES[k];
                const i = HULU_KEYS.indexOf(k); if (i >= 0) HULU_KEYS.splice(i, 1);
            });
        }

        // ---------- Muat save (dipanggil huluNormalize SEBELUM state anjungan dibuat) ----------
        function tenderCleanBlock(r) {
            if (!r || typeof r !== 'object') return null;
            const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
            const seq = Math.floor(num(r.seq, 0, 0, 1e6)), ai = Math.floor(num(r.ai, -1, -1, TENDER_AREAS.length - 1));
            if (!seq || ai < 0) return null;
            const d = r.dev && typeof r.dev === 'object' ? r.dev : {}, fuel = r.fuel === 'gas' ? 'gas' : 'oil', tier = Math.floor(num(r.tier, 1, 1, 3));
            const dev = { rate: num(d.rate, 2.5e6, 1e5, 2e7), cap: num(d.cap, 1e7, 1e5, 1e8), buildCost: num(d.buildCost, 80e9, 1e9, 1e13),
                          buildHours: num(d.buildHours, 16, 1, 200), opexWeek: num(d.opexWeek, 9e9, 0, 1e12), hpp: num(d.hpp, 200000, 1, 1e8) };
            return { id: 'b' + seq, seq, ai, tier, fuel, lat: num(r.lat, TENDER_AREAS[ai].lat, -12, 6), lon: num(r.lon, TENDER_AREAS[ai].lon, 95, 130), dev,
                     bid: num(r.bid, 200e9, 1e9, 1e13), p: num(r.p, 0.4, 0, 1), roll: num(r.roll, Math.random(), 0, 1), auRoll: num(r.auRoll, Math.random(), 0, 1),
                     stage: TENDER_STAGES.indexOf(r.stage) >= 0 ? r.stage : 'open', stageGt: num(r.stageGt, 0, 0, 1e18), mode: TENDER.bidMode[r.mode] ? r.mode : '',
                     sunk: num(r.sunk, 0, 0, 1e14), nat: false, snipeAt: num(r.snipeAt, 0, 0, 1e18),
                     nk: typeof r.nk === 'string' && /^n\d{3,7}_\d$/.test(r.nk) ? r.nk : '' };
        }
        function tenderBlokLoad(raw) {
            tenderPurgeDynamic();   // buang anjungan dinamis dari akun/save sebelumnya
            const bk = tenderBlokDefault();
            if (raw && typeof raw === 'object') {
                const n = (v, mx) => (typeof v === 'number' && isFinite(v) && v >= 0 ? Math.min(v, mx) : 0);
                bk.seq = Math.floor(n(raw.seq, 1e6)); bk.spent = n(raw.spent, 1e15); bk.hits = Math.floor(n(raw.hits, 1e6)); bk.dry = Math.floor(n(raw.dry, 1e6)); bk.nextGt = n(raw.nextGt, 1e18);
                (Array.isArray(raw.list) ? raw.list : []).slice(0, TENDER.listMax).forEach(r => { const b = tenderCleanBlock(r); if (b && !bk.list.some(x => x.id === b.id)) { if (b.stage === 'tender' && !b.mode) { b.stage = 'open'; } bk.list.push(b); bk.seq = Math.max(bk.seq, b.seq); } });
                (Array.isArray(raw.hist) ? raw.hist : []).slice(-12).forEach(h => {
                    if (h && typeof h === 'object' && typeof h.n === 'string' && ['hit', 'dry', 'drop', 'snipe'].indexOf(h.r) >= 0)
                        bk.hist.push({ n: h.n.replace(/[^\w\s\-]/g, '').slice(0, 60), r: h.r, gt: n(h.gt, 1e18), sunk: n(h.sunk, 1e15) });
                });
                Object.keys(raw.sites && typeof raw.sites === 'object' ? raw.sites : {}).forEach(k => {
                    const s = tenderCleanBlock(raw.sites[k]); if (!s) return;
                    s.stage = 'open'; bk.seq = Math.max(bk.seq, s.seq);
                    bk.sites[s.id] = { id: s.id, seq: s.seq, ai: s.ai, fuel: s.fuel, tier: s.tier, lat: s.lat, lon: s.lon, dev: s.dev };
                });
                Object.values(bk.sites).sort((a, b) => a.seq - b.seq).forEach(s => tenderRegisterSite(s, false));
            }
            return bk;
        }

        // ---------- Tahapan: lelang -> seismik -> bor ----------
        const tenderHist = (b, r) => { const bk = hulu.blok; bk.hist.push({ n: tenderName(b), r, gt: gameNow(), sunk: Math.round(b.sunk) }); if (bk.hist.length > 12) bk.hist.shift(); };
        const tenderPay = (b, amount, desc) => {
            companyCash -= amount; totalExpense += amount; b.sunk += amount; hulu.blok.spent += amount;
            addFinanceLog(desc, -amount); updateCashDisplay();
        };
        const tenderNoCash = (what, cost) => showModal('Kas Tidak Cukup', `${what} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');

        async function tenderBid(id, mode) {
            if (pphBlokir()) return;
            let b = tenderFind(id); const M = TENDER.bidMode[mode];
            if (!currentAccount || !b || !M || b.stage !== 'open') return;
            const cost = Math.round(b.bid * M.mult), nat = b.nat, rv = tenderRivalsOf(b);
            if (companyCash < cost) return tenderNoCash('Lelang ' + tenderName(b), cost);
            if (nat && hulu.blok.list.length >= TENDER.listMax) return showModal('Daftar Blok Penuh', 'Selesaikan atau lepas salah satu blok dulu sebelum mengambil Blok Nasional.', 'fa-triangle-exclamation', 'amber');
            const ok = await showConfirm(`Ikut lelang ${tenderName(b)} dengan ${M.label.toLowerCase()} ${formatRupiah(cost)}? ${nat ? 'Ini BLOK NASIONAL: pemain lain juga mengincarnya, yang pertama mengajukan penawaran merebut hak lelang. ' : ''}Pesaing AI yang tertarik: ${rv.names.join(', ')}. Peluang menang ${tenderWin(mode)}%, hasil diumumkan ±${TENDER.hours.lelang} jam game. Kalah lelang: dana kembali ${Math.round(tenderRefund() * 100)}% (sisanya biaya administrasi). Menang: hak blok jadi milik Anda dan uang lelang tidak kembali.`,
                { title: 'Lelang Blok Migas', iconClass: 'fa-gavel', theme: 'blue', okLabel: 'Ajukan Penawaran' });
            if (!ok || b.stage !== 'open' || companyCash < cost) return;
            if (nat) {   // rebut hak lelang dari pemain nyata lain (atomik) lalu pindahkan ke daftar blok pribadi
                let r; try { r = await window.fb.claimBlok(b.id, currentAccount.id, currentAccount.company); } catch (e) { r = null; console.warn('claimBlok:', e); }
                if (!r) return showModal('Tidak Terhubung', 'Gagal menghubungi server untuk merebut Blok Nasional. Periksa koneksi dan coba lagi.', 'fa-wifi', 'red');
                tenderClaims[b.id] = { uid: r.mine ? currentAccount.id : '', company: r.by || currentAccount.company };
                if (!r.ok) { huluRender(); tenderSyncMarkers(); return showModal('Blok Sudah Direbut', r.mine ? 'Blok ini sudah pernah Anda ambil.' : `${esc(tenderName(b))} baru saja direbut <b>${esc(r.by)}</b> (pemain nyata). Coba blok lain.`, 'fa-user-group', 'amber'); }
                const bk = hulu.blok, seq = ++bk.seq, nb = Object.assign({}, b, { id: 'b' + seq, seq, nat: false, nk: b.id, dev: Object.assign({}, b.dev) });
                bk.list.push(nb); b = nb;
                if (companyCash < cost) { addLog(`TENDER: Blok Nasional ${tenderName(b)} berhasil direbut, tetapi kas tidak cukup untuk menawar. Blok tersimpan di daftar Anda.`, 'warning'); tenderSyncMarkers(); return huluRender(); }
            }
            tenderPay(b, cost, `Lelang ${tenderName(b)} (${M.label})`);
            b.mode = mode; b.stage = 'tender'; b.stageGt = gameNow() + TENDER.hours.lelang * 3600000;
            addLog(`TENDER: Penawaran ${formatRupiah(cost)} untuk ${tenderName(b)} diajukan. Hasil lelang ±${TENDER.hours.lelang} jam game.`, 'info');
            tenderSyncMarkers(); huluRender();
        }
        async function tenderSurvey(id) {
            if (pphBlokir()) return;
            const b = tenderFind(id); if (!currentAccount || !b || b.stage !== 'won') return;
            const cost = tenderSeis(b);
            if (companyCash < cost) return tenderNoCash('Survei seismik', cost);
            const ok = await showConfirm(`Survei seismik ${tenderName(b)} seharga ${formatRupiah(cost)} (±${TENDER.hours.seismik} jam game)? Hasilnya membuka peluang sukses bor yang sebenarnya dan potensi produksi. Kalau peluangnya buruk, Anda bisa melepas blok sebelum mengeluarkan biaya bor.`,
                { title: 'Survei Seismik', iconClass: 'fa-wave-square', theme: 'blue', okLabel: 'Mulai Survei' });
            if (!ok || b.stage !== 'won' || companyCash < cost) return;
            tenderPay(b, cost, `Survei seismik ${tenderName(b)}`);
            b.stage = 'seismic'; b.stageGt = gameNow() + TENDER.hours.seismik * 3600000;
            addLog(`TENDER: Survei seismik ${tenderName(b)} dimulai (±${TENDER.hours.seismik} jam game).`, 'info');
            tenderSyncMarkers(); huluRender();
        }
        async function tenderDrill(id) {
            if (pphBlokir()) return;
            const b = tenderFind(id); if (!currentAccount || !b || b.stage !== 'surveyed') return;
            const cost = tenderBor(b);
            if (companyCash < cost) return tenderNoCash('Bor eksplorasi', cost);
            const ok = await showConfirm(`Bor sumur eksplorasi ${tenderName(b)} seharga ${formatRupiah(cost)} (±${TENDER.hours.bor} jam game)? Peluang sukses ${Math.round(b.p * 100)}%. Kalau sumur kering (dry hole), seluruh uang lelang, seismik, dan bor hangus, dan blok ditutup.`,
                { title: 'Bor Eksplorasi', iconClass: 'fa-oil-well', theme: 'red', okLabel: 'Bor Sekarang' });
            if (!ok || b.stage !== 'surveyed' || companyCash < cost) return;
            tenderPay(b, cost, `Bor eksplorasi ${tenderName(b)}`);
            b.stage = 'drilling'; b.stageGt = gameNow() + TENDER.hours.bor * 3600000;
            addLog(`TENDER: Pengeboran eksplorasi ${tenderName(b)} dimulai (±${TENDER.hours.bor} jam game).`, 'info');
            tenderSyncMarkers(); huluRender();
        }
        async function tenderDrop(id) {
            const b = tenderFind(id); if (!currentAccount || !b || (b.stage !== 'won' && b.stage !== 'surveyed')) return;
            const ok = await showConfirm(`Lepas ${tenderName(b)}? Uang yang sudah keluar (${formatRupiah(Math.round(b.sunk))}) tidak dikembalikan dan blok tidak bisa diambil lagi.`,
                { title: 'Lepas Blok', iconClass: 'fa-right-from-bracket', theme: 'amber', okLabel: 'Lepas Blok' });
            if (!ok || (b.stage !== 'won' && b.stage !== 'surveyed')) return;
            tenderRemove(b); tenderHist(b, 'drop');
            addLog(`TENDER: ${tenderName(b)} dilepas. Investasi ${formatRupiah(Math.round(b.sunk))} hangus.`, 'warning');
            tenderEnsureOpen(); tenderSyncMarkers(); huluRender();
        }
        function tenderRemove(b) { const l = hulu.blok.list, i = l.indexOf(b); if (i >= 0) l.splice(i, 1); }

        // DAY_MS sudah dideklarasikan di 05-hr-kemitraan.js (dideklarasi ulang di sini = SyntaxError yang membuat seluruh file ini gagal termuat).
        // Peluang menang sesungguhnya = P(penawaran tertinggi pesaing < kekuatan tawar Anda), kekuatan = kelipatan x bonus reputasi (lihat tenderRivalsOf).
        const tenderWin = mode => {
            const m = TENDER.bidMode[mode].mult * corpBidPower();
            return Math.round((m <= 0.8 ? 0 : m < 1.0 ? (m - 0.8) / 0.2 * 0.6 : m < 1.3 ? 0.6 + (m - 1.0) / 0.3 * 0.3 : m < 1.55 ? 0.9 + (m - 1.3) / 0.25 * 0.1 : 1) * 100);
        };
        const tenderRefund = () => Math.min(0.98, Math.max(0.5, TENDER.refund + corpRefundBonus()));
        function tenderResolveBid(b) {
            const M = TENDER.bidMode[b.mode] || TENDER.bidMode.std, name = tenderName(b), rv = tenderRivalsOf(b), mine = Math.round(b.bid * M.mult);
            if (M.mult * corpBidPower() > rv.top) {
                b.stage = 'won'; b.stageGt = 0;
                addLog(`TENDER: Anda MEMENANGKAN lelang ${name} (${formatRupiah(mine)}) mengalahkan ${rv.lead} (${formatRupiah(rv.bid)})${rv.bid >= mine ? ', unggul berkat reputasi perusahaan' : ''}. Lanjutkan dengan survei seismik.`, 'success');
                notify(`Lelang ${name} dimenangkan atas ${rv.lead}!`, 'ok');
            } else {
                const back = Math.round(b.sunk * tenderRefund());
                companyCash += back; totalExpense -= back; b.sunk -= back; hulu.blok.spent -= back;
                addFinanceLog(`Pengembalian dana lelang ${name} (kalah)`, back); updateCashDisplay();
                b.stage = 'open'; b.mode = ''; b.stageGt = 0; b.auRoll = Math.random(); b.snipeAt = gameNow() + tRnd(2, 6) * DAY_MS;
                addLog(`TENDER: Kalah lelang ${name}. ${rv.lead} menawar ${formatRupiah(rv.bid)} (Anda ${formatRupiah(mine)}${rv.bid < mine ? ', kalah karena reputasi rendah' : ''}). Dana ${formatRupiah(back)} dikembalikan. Blok dibuka lagi, Anda bisa ikut lagi.`, 'warning');
                notify(`Kalah dari ${rv.lead} (${formatRupiah(rv.bid)}). Dana dikembalikan ${Math.round(tenderRefund() * 100)}%.`, 'warn');
            }
        }
        // Pesaing AI merebut blok terbuka yang terlalu lama dibiarkan.
        function tenderSnipe(b) {
            const rv = tenderRivalsOf(b); tenderRemove(b);
            const h = { n: (tenderName(b) + ' - ' + rv.lead).replace(/[^\w\s\-]/g, '').slice(0, 60), r: 'snipe', gt: gameNow(), sunk: 0 };
            hulu.blok.hist.push(h); if (hulu.blok.hist.length > 12) hulu.blok.hist.shift();
            addLog(`TENDER: ${rv.lead} merebut ${tenderName(b)} dengan penawaran ${formatRupiah(rv.bid)}. Blok tidak tersedia lagi.`, 'warning');
        }
        function tenderResolveSurvey(b) {
            b.stage = 'surveyed'; b.stageGt = 0;
            const q = b.p >= 0.55 ? 'BAGUS' : b.p >= 0.35 ? 'SEDANG' : 'BURUK';
            addLog(`TENDER: Survei seismik ${tenderName(b)} selesai. Prospek ${q}, peluang sukses bor ${Math.round(b.p * 100)}%.`, b.p >= 0.35 ? 'success' : 'warning');
            notify(`Survei ${tenderName(b)} selesai: peluang sukses ${Math.round(b.p * 100)}%.`, b.p >= 0.35 ? 'ok' : 'warn');
        }
        function tenderResolveDrill(b) {
            const name = tenderName(b), bk = hulu.blok, d = b.dev, unit = tenderUnit(b.fuel);
            tenderRemove(b);
            if (b.roll < b.p) {
                const s = { id: b.id, seq: b.seq, ai: b.ai, fuel: b.fuel, tier: b.tier, lat: b.lat, lon: b.lon, dev: d };
                bk.sites[b.id] = s; bk.hits++; tenderHist(b, 'hit'); corpRepAdd(3, 'Penemuan cadangan migas');
                const cfg = tenderRegisterSite(s, true); huluSel = b.id;
                addLog(`TENDER: PENEMUAN! ${name} berhasil. ${cfg.nama} siap dibangun (HPP ${formatRupiah(d.hpp)}/${unit}).`, 'success');
                notify(`Sumur ${name} sukses! Anjungan baru siap dibangun.`, 'ok');
                showModal('Sumur Eksplorasi Berhasil!', `<b>${esc(name)}</b> menemukan cadangan ${cfg.jenis}.<br><br>Anjungan baru: <b>${esc(cfg.nama)}</b><br>Produksi ±${fmtN(d.rate)} ${unit}/hari<br>HPP ${formatRupiah(d.hpp)}/${unit} (pasar rata-rata ${formatRupiah(TENDER.base[b.fuel])})<br>Biaya bangun ${formatRupiah(d.buildCost)}<br><br>Buka tab Hulu &gt; Anjungan untuk membangunnya.`, 'fa-oil-well', 'blue');
            } else {
                bk.dry++; tenderHist(b, 'dry');
                addLog(`TENDER: DRY HOLE di ${name}. Sumur kering, investasi ${formatRupiah(Math.round(b.sunk))} hangus dan blok ditutup.`, 'warning');
                notify(`Dry hole di ${name}. Investasi hangus.`, 'warn');
                showModal('Dry Hole', `Sumur eksplorasi <b>${esc(name)}</b> kering. Investasi <b>${formatRupiah(Math.round(b.sunk))}</b> (lelang, seismik, bor) hangus dan blok ditutup.<br><br>Coba blok lain, dan pakai survei seismik untuk memilih prospek terbaik.`, 'fa-droplet-slash', 'red');
            }
            tenderEnsureOpen();
        }
        // Dipanggil dari huluTick (tiap 3 detik nyata). Waktu memakai gameNow(), jadi ikut berhenti saat game dijeda.
        function tenderTick() {
            if (!currentAccount || !hulu.blok) return;
            const bk = hulu.blok, now = gameNow(); let changed = false;
            tenderClaimInit();
            const ns = tenderNatVisible().map(x => x.id).join(',');
            if (ns !== tenderNatPrev) { tenderNatPrev = ns; changed = true; }
            bk.list.slice().forEach(b => {
                if (b.stage === 'open') {
                    if (!b.snipeAt || b.snipeAt > now + 8 * DAY_MS) b.snipeAt = now + tRnd(2, 6) * DAY_MS;   // blok lama / jam game mundur
                    else if (now >= b.snipeAt) { tenderSnipe(b); changed = true; }
                } else if (b.stage === 'tender' && now >= b.stageGt) { tenderResolveBid(b); changed = true; }
                else if (b.stage === 'seismic' && now >= b.stageGt) { tenderResolveSurvey(b); changed = true; }
                else if (b.stage === 'drilling' && now >= b.stageGt) { tenderResolveDrill(b); changed = true; }
            });
            if (!bk.nextGt || now < bk.nextGt - TENDER.newEveryMs * 2) bk.nextGt = now + TENDER.newEveryMs;   // save baru / jam game mundur
            else if (now >= bk.nextGt) {
                if (tenderOpenCount() < TENDER.openMax && bk.list.length < TENDER.listMax) { const b = tenderNewBlock(); changed = true; addLog(`TENDER: Blok baru dibuka untuk lelang: ${tenderName(b)} (${TENDER.tiers[b.tier].label}).`, 'info'); }
                bk.nextGt = now + TENDER.newEveryMs;
            }
            const before = bk.list.length; tenderEnsureOpen(); if (bk.list.length !== before) changed = true;
            if (changed) { tenderSyncMarkers(); if (typeof currentTabId !== 'undefined' && currentTabId === 'tab-hulu') huluRender(); }
        }

        // ---------- Blok Nasional (pemain nyata) ----------
        function tenderRng(seed) {
            let a = seed >>> 0;
            return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        }
        // Daftar blok nasional yang masih terlihat: belum direbut siapa pun, belum direbut AI, dan hanya setelah pendengar Firestore aktif.
        function tenderNatVisible() {
            if (!tenderClaimsReady) return [];
            const E = TENDER_NAT, now = Date.now(), e0 = Math.floor(now / E.epochMs), out = [];
            for (let e = e0 - E.life + 1; e <= e0; e++) for (let sl = 0; sl < E.slots; sl++) {
                const key = 'n' + e + '_' + sl; let b = tenderNat[key];
                if (!b) {
                    const R = tenderRng(e * 131 + sl * 977 + 7);
                    b = tenderBuild(R, e * E.slots + sl, key); b.nat = true; b.snipeAt = e * E.epochMs + E.epochMs * (0.5 + R() * (E.life - 0.5));
                    tenderNat[key] = b;
                }
                if (now < b.snipeAt && !tenderClaims[key]) out.push(b);
            }
            Object.keys(tenderNat).forEach(k => { if (Number(k.slice(1).split('_')[0]) < e0 - E.life) delete tenderNat[k]; });
            return out;
        }
        const tenderAll = () => hulu.blok.list.concat(tenderNatVisible());
        function tenderClaimInit() {
            if (tenderClaimUnsub || !window.fb || !window.fb.listenBlokClaims) return;
            tenderClaimUnsub = window.fb.listenBlokClaims(list => {
                const first = !tenderClaimsReady, me = currentAccount ? currentAccount.id : '';
                list.forEach(c => {
                    const isNew = !tenderClaims[c.key];
                    tenderClaims[c.key] = { uid: c.uid, company: c.company || 'pemain lain' };
                    if (!first && isNew && c.uid !== me && tenderNat[c.key]) addLog(`TENDER: ${c.company || 'Pemain lain'} (pemain nyata) merebut ${tenderName(tenderNat[c.key])}.`, 'warning');
                });
                tenderClaimsReady = true; tenderNatPrev = '';
            }, () => { tenderClaimUnsub = null; tenderClaimsReady = false; });
        }

        // ---------- Penanda blok di peta ----------
        const tenderMarkers = {}, tenderMarkerSig = {};
        function tenderSyncMarkers() {
            if (typeof map === 'undefined' || !map || typeof L === 'undefined' || !hulu.blok) return;
            const all = tenderAll(), ids = new Set(all.map(b => b.id));
            Object.keys(tenderMarkers).forEach(id => { if (!ids.has(id)) { map.removeLayer(tenderMarkers[id]); delete tenderMarkers[id]; delete tenderMarkerSig[id]; } });
            all.forEach(b => {
                const sig = b.stage + (b.nat ? 'n' : ''); if (tenderMarkers[b.id] && tenderMarkerSig[b.id] === sig) return;
                if (tenderMarkers[b.id]) map.removeLayer(tenderMarkers[b.id]);
                tenderMarkerSig[b.id] = sig; const ui = TENDER_STAGE_UI[b.stage];
                const m = L.marker([b.lat, b.lon], {
                    icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12],
                        html: `<div style="width:24px;height:24px;border-radius:50%;background:${ui.color};border:2px dashed #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.5)"><i class="fa-solid fa-file-contract"></i></div>` }),
                    zIndexOffset: 600 }).addTo(map);
                m.bindPopup(() => {
                    const x = tenderFind(b.id); if (!x) return '';
                    return `<div class="text-gray-900 font-sans p-1 min-w-[170px]"><strong class="text-xs font-bold block text-blue-700 mb-1">${esc(tenderName(x))}</strong>
                        <div class="text-[10px] text-gray-600 leading-4">${TENDER.tiers[x.tier].label} &middot; ${x.fuel === 'gas' ? 'Gas' : 'Minyak'}</div>
                        <div class="text-[10px] text-gray-600 leading-4">Status: <b>${TENDER_STAGE_UI[x.stage].label}</b></div>
                        <button onclick="tenderOpen('${x.id}')" style="margin-top:6px;background:#0d9488;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer">Buka Tender</button></div>`;
                }, { maxWidth: 220 });
                tenderMarkers[b.id] = m;
            });
        }
        function tenderOpen() { huluView = 'tender'; switchTab('tab-hulu'); huluRender(); }
        function huluSetView(v) { huluView = v === 'tender' ? 'tender' : 'site'; huluRender(); }

        // ---------- Tampilan (tab Hulu > Tender Blok) ----------
        const tenderSig = () => (hulu.blok ? hulu.blok.list.map(b => b.id + b.stage).join(',') + '|' + hulu.blok.hist.length + '|' + tenderNatVisible().map(b => b.id).join(',') : '');
        const tChip = (l, v, cls, id) => `<div class="stat-chip"><div class="stat-chip-label">${l}</div><div ${id ? `id="${id}"` : ''} class="stat-chip-value ${cls}">${v}</div></div>`;
        function huluTabsHtml() {
            const n = hulu.blok ? hulu.blok.list.filter(b => b.stage !== 'open').length : 0, btn = (v, ic, t) =>
                `<button onclick="huluSetView('${v}')" class="flex-1 py-2 rounded-xl text-xs font-bold border transition ${huluView === v ? 'border-teal-500 bg-teal-500/10 text-teal-300' : 'border-gray-800 bg-gray-950 text-gray-400 hover:border-gray-600'}"><i class="fa-solid ${ic} mr-1.5"></i>${t}</button>`;
            return `<div class="flex gap-2">${btn('site', 'fa-oil-well', 'Anjungan')}${btn('tender', 'fa-gavel', 'Tender Blok' + (n ? ' (' + n + ')' : ''))}</div>`;
        }
        function tenderCardHtml(b) {
            const a = TENDER_AREAS[b.ai], T = TENDER.tiers[b.tier], gas = b.fuel === 'gas', unit = tenderUnit(b.fuel), ui = TENDER_STAGE_UI[b.stage];
            const known = b.stage === 'surveyed' || b.stage === 'drilling', base = TENDER.base[b.fuel];
            const pTxt = known ? `<b class="${b.p >= 0.55 ? 'text-emerald-400' : b.p >= 0.35 ? 'text-amber-400' : 'text-red-400'}">${Math.round(b.p * 100)}%</b> (hasil seismik)`
                : `±${Math.round((T.p - 0.15) * 100)}-${Math.round((T.p + 0.15) * 100)}% (perkiraan, pastikan dengan seismik)`;
            const pot = known
                ? `±${fmtN(b.dev.rate)} ${unit}/hari, HPP ${formatRupiah(b.dev.hpp)}/${unit}`
                : `±${fmtN(T.rate[0])}-${fmtN(T.rate[1])} ${unit}/hari, HPP ±${formatRupiah(Math.round(base * T.hppF / 1000) * 1000)}/${unit}`;
            let act = '';
            if (b.stage === 'open') {
                const std = TENDER.bidMode.std, agr = TENDER.bidMode.agr;
                const rv = tenderRivalsOf(b), soon = b.snipeAt && b.snipeAt - (b.nat ? Date.now() : gameNow()) < (b.nat ? 3 * 3600000 : DAY_MS);
                act = `<div class="text-[10px] text-gray-400 mb-2"><i class="fa-solid fa-user-tie text-sky-400 mr-1"></i>Pesaing tertarik: <b class="text-gray-300">${rv.names.map(esc).join(', ')}</b>${soon ? ' <b class="text-orange-400">&middot; segera direbut</b>' : ''}${b.nat ? `<div id="tb-nat-${b.id}" class="mt-0.5 text-sky-300"></div>` : ''}</div>
                    <div class="grid grid-cols-2 gap-2">
                    <button onclick="tenderBid('${b.id}','std')" class="bg-teal-700 hover:bg-teal-600 text-white font-bold py-2 rounded-xl text-[11px] transition leading-tight">Lelang Standar<br><span class="font-mono font-semibold">${formatRupiah(Math.round(b.bid * std.mult))}</span><br><span class="font-normal opacity-80">menang ${tenderWin('std')}%</span></button>
                    <button onclick="tenderBid('${b.id}','agr')" class="bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 rounded-xl text-[11px] transition leading-tight">Lelang Agresif<br><span class="font-mono font-semibold">${formatRupiah(Math.round(b.bid * agr.mult))}</span><br><span class="font-normal opacity-80">menang ${tenderWin('agr')}%</span></button></div>`;
            } else if (b.stage === 'won') {
                act = `<button onclick="tenderSurvey('${b.id}')" class="w-full bg-sky-700 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-wave-square mr-1.5"></i>Survei Seismik (${formatRupiah(tenderSeis(b))})</button>
                    <button onclick="tenderDrop('${b.id}')" class="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-1.5 rounded-xl text-[11px] transition">Lepas Blok</button>`;
            } else if (b.stage === 'surveyed') {
                act = `<button onclick="tenderDrill('${b.id}')" class="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-oil-well mr-1.5"></i>Bor Eksplorasi (${formatRupiah(tenderBor(b))})</button>
                    <button onclick="tenderDrop('${b.id}')" class="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-1.5 rounded-xl text-[11px] transition">Lepas Blok</button>`;
            } else {
                act = `<div id="tb-bar-${b.id}"></div><div id="tb-left-${b.id}" class="text-[10px] text-gray-400 mt-1.5"></div>`;
            }
            return `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-${gas ? 'orange' : 'teal'}-500">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                    <h4 class="text-xs font-bold text-gray-100 flex items-center"><i class="fa-solid ${gas ? 'fa-fire-flame-simple text-orange-400' : 'fa-oil-well text-teal-400'} mr-2"></i>${esc(tenderName(b))}${b.nat ? ' <span class="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">NASIONAL</span>' : ''}</h4>
                    <span class="flex items-center gap-1 text-[10px] text-gray-300 shrink-0"><span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${ui.color}"></span>${ui.label}</span></div>
                <div class="text-[10px] text-gray-400 mb-2">${T.label} &middot; prospek ${gas ? 'gas bumi' : 'minyak'} &middot; ${esc(a.n)}</div>
                <div class="grid grid-cols-2 gap-2 text-[10px] mb-2.5">${tChip('Nilai Lelang', formatRupiah(b.bid), 'text-amber-400')}${tChip('Biaya Seismik + Bor', formatRupiah(tenderSeis(b) + tenderBor(b)), 'text-orange-400')}
                    ${tChip('Peluang Sukses', pTxt, 'text-gray-200')}${tChip(known ? 'Cadangan' : 'Potensi', pot, 'text-emerald-400')}</div>
                ${b.stage !== 'open' ? `<div class="text-[10px] text-gray-500 mb-2">Sudah dikeluarkan: <b class="text-gray-300">${formatRupiah(Math.round(b.sunk))}</b>${known ? ` &middot; biaya bangun anjungan jika sukses ${formatRupiah(b.dev.buildCost)}` : ''}</div>` : ''}
                ${act}</div>`;
        }
        function tenderHtml() {
            const bk = hulu.blok, list = tenderAll().sort((a, b) => (a.stage === 'open') - (b.stage === 'open') || a.seq - b.seq);
            const resTxt = { hit: ['Penemuan', 'text-emerald-400'], dry: ['Dry hole', 'text-red-400'], drop: ['Dilepas', 'text-gray-400'], snipe: ['Direbut pesaing', 'text-orange-400'] };
            const hist = bk.hist.slice().reverse().slice(0, 6).map(h => `<div class="flex justify-between text-[10px] py-1 border-b border-gray-900"><span class="text-gray-300">${esc(h.n)}</span><span><b class="${resTxt[h.r][1]}">${resTxt[h.r][0]}</b> <span class="text-gray-500">${formatRupiah(h.sunk)}</span></span></div>`).join('');
            return `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-amber-500">
                    <h3 class="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center"><i class="fa-solid fa-gavel mr-2"></i> Tender Blok Migas &amp; Eksplorasi</h3>
                    <p class="text-[11px] text-gray-400 mb-2.5">Ikut lelang blok baru, survei seismik, lalu bor eksplorasi. Sumur kering membuat seluruh uang hangus. Sumur sukses memberi anjungan baru dengan HPP jauh lebih murah dari Alpha, Bravo, dan Gamma. Anjungan hasil tender bisa dihubungkan lewat pipa (batas ±${fmtN(HULU_PIPE.maxKm)} km) atau kapal tanker ke kilang/depo mana pun yang sudah dibeli dan punya dermaga, bukan hanya Tuban. Pesaing AI ikut menawar dan bisa merebut blok yang dibiarkan; <b class="text-sky-300">Blok Nasional</b> diperebutkan pemain nyata lain (yang pertama menawar menang). 1 hari game = 2 jam nyata.</p>
                    <div class="grid grid-cols-2 gap-2 text-[10px]">${tChip('Total Dikeluarkan', formatRupiah(Math.round(bk.spent)), 'text-red-400')}${tChip('Penemuan / Dry Hole', bk.hits + ' / ' + bk.dry, 'text-gray-200')}</div></div>
                ${list.map(tenderCardHtml).join('') || '<div class="text-[11px] text-gray-500 text-center py-4">Belum ada blok. Blok baru akan dibuka sebentar lagi.</div>'}
                ${hist ? `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800"><h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Riwayat Eksplorasi</h3>${hist}</div>` : ''}`;
        }
        // Update bar & sisa waktu tanpa membangun ulang HTML (tombol tidak berkedip).
        function tenderRefresh() {
            const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; }, now = gameNow();
            tenderNatVisible().forEach(b => set('tb-nat-' + b.id, `Blok Nasional: pesaing AI mengincar, tersisa ±${Math.max(1, Math.ceil((b.snipeAt - Date.now()) / 3600000))} jam nyata`));
            hulu.blok.list.forEach(b => {
                const tot = { tender: TENDER.hours.lelang, seismic: TENDER.hours.seismik, drilling: TENDER.hours.bor }[b.stage]; if (!tot) return;
                const left = Math.max(0, b.stageGt - now), total = tot * 3600000, lbl = { tender: 'Hasil lelang', seismic: 'Survei seismik', drilling: 'Pengeboran' }[b.stage];
                set('tb-bar-' + b.id, huluBar((1 - left / total) * 100, 'bg-amber-500'));
                set('tb-left-' + b.id, `${lbl}: sisa ±${fmtJam(left / 3600000)} waktu game`);
            });
        }
