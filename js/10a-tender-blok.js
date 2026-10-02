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
            gasScale: 0.4,                                // skala produksi/biaya blok gas (sama dengan Anjungan Gamma: 2,5 juta -> 1 juta Ton/hari)
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
        // Pesaing AI. Lelang = 8 putaran penawaran bertahap melawan pesaing (diturunkan dari b.auRoll, jadi tidak bisa diulang lewat reload).
        // Gaya tiap pesaing (agresif, hati-hati, oportunis, konservatif) menentukan cara mereka menawar di mesin lelang bertahap (TENDER_STYLE).
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
            // Blok GAS ikut skala anjungan Gamma: produksi, biaya bangun, dan opex 0,4x; tangki ±3,5 hari produksi (minyak tetap ±4 hari).
            const gs = fuel === 'gas' ? TENDER.gasScale : 1, rt = tRound(rate * gs, 1e5);
            return {
                rate: rt, cap: tRound(rt * (fuel === 'gas' ? 3.5 : 4), 1e5),   // tangki = ±4 hari produksi (gas ±3,5 hari)
                buildCost: tRound(rr(T.dev[0], T.dev[1]) * gs, 1e9), buildHours: T.hours,
                opexWeek: tRound(rt / 2.5e6 * TENDER.opexPer25[fuel] * 1.1, 1e8),
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
        // ---------- Mesin lelang bertahap (v96) ----------
        // 8 putaran (1 putaran = 1 jam game). Pemain memberi: penawaran awal, batas maksimum (harga cadangan: tidak akan menawar di atas ini)
        // dan kenaikan per putaran. Tiap kali ditawar lebih tinggi, sistem menaikkan penawaran otomatis (proxy) HANYA sebesar yang dibutuhkan,
        // sampai batas maksimum. Jadi pemenang membayar harga akhirnya, bukan batas maksimumnya; selisih dana jaminan dikembalikan.
        // Pesaing menawar sesuai gayanya (TENDER_STYLE). Semuanya deterministik dari auRoll, jadi reload/save ulang tidak bisa mengulang undian.
        const TENDER_AUC = { rounds: 8, unit: 1e9, floor: 0.80, openMax: 1.30, capMax: 1.60, steps: [0.01, 0.02, 0.04], hourMs: 3600000 };
        // entry = putaran pertama pesaing ikut, f = porsi selisih ke batas atasnya yang dinaikkan tiap tawaran, capF = pengali batas atasnya.
        // snipe = hanya menawar di putaran terakhir SETELAH sistem proxy Anda (tidak sempat dibalas), langsung lompat ke batasnya.
        const TENDER_STYLE = {
            agresif:     { entry: 0, f: 0.50, capF: 1.04 },                 // langsung masuk, naik besar, mau bayar paling tinggi
            oportunis:   { entry: 7, f: 1.00, capF: 1.00, snipe: true },    // menunggu, lalu menyergap di putaran penutup
            'hati-hati': { entry: 2, f: 0.25, capF: 0.97 },                 // masuk belakangan, naik pelan
            konservatif: { entry: 1, f: 0.20, capF: 0.93 }                  // naik pelan dan berhenti paling cepat
        };
        // Pesaing AI untuk blok ini: murni fungsi dari auRoll (u). top = batas atas pesaing terkuat (x nilai lelang), list = tiap pesaing + batasnya.
        function tenderRivalsOf(b, uo) {
            const u = typeof uo === 'number' ? uo : b.auRoll, f = k => (u * k) % 1;
            const top = u < 0.6 ? 0.80 + (u / 0.6) * 0.20 : u < 0.9 ? 1.0 + ((u - 0.6) / 0.3) * 0.30 : 1.30 + ((u - 0.9) / 0.1) * 0.25;
            const lead = Math.floor(f(7919) * TENDER_RIVALS.length), n = Math.min(3, 1 + (b.tier >= 2 ? 1 : 0) + (f(104729) < 0.4 ? 1 : 0));
            const list = [];
            for (let i = 0; i < n; i++) {
                const r = TENDER_RIVALS[(lead + i) % TENDER_RIVALS.length], st = TENDER_STYLE[r.style] || TENDER_STYLE.oportunis;
                const base = i === 0 ? top : top * (0.82 + f(1299709 + i * 7919) * 0.14);
                list.push({ n: r.n, style: r.style, cap: Math.max(TENDER_AUC.floor, base * st.capF) });
            }
            return { top, bid: Math.floor(b.bid * top / 1e9 + 1e-9) * 1e9, lead: list[0].n, names: list.map(x => x.n), list };
        }
        // Menjalankan lelang sampai putaran ke-upto. my = { open, step, log:[{r, max}] } (log = riwayat batas maksimum), w = kekuatan tawar reputasi.
        // Urutan tiap putaran: pesaing biasa menawar -> proxy Anda membalas -> (putaran terakhir saja) penyergap menawar tanpa bisa dibalas.
        // Hasil: lead ('me' / indeks pesaing), rank (nilai tertinggi), myPrice (harga tawar Anda saat ini), ev (riwayat penawaran).
        function tenderAucRun(V, rivals, my, w, upto) {
            const U = TENDER_AUC.unit, up = x => Math.ceil(x / U - 1e-9) * U, dn = x => Math.floor(x / U + 1e-9) * U;
            const stepOf = pct => Math.max(U, up(V * pct)), caps = rivals.map(x => dn(x.cap * V));
            const capAt = r => { let m = my.log[0].max; my.log.forEach(e => { if (e.r <= r) m = e.max; }); return m; };
            let lead = '', rank = 0, myPrice = 0; const ev = [];
            const rivalBid = (r, i) => {
                const st = TENDER_STYLE[rivals[i].style] || TENDER_STYLE.oportunis;
                if (r < st.entry || lead === i) return;
                const next = Math.min(caps[i], up(rank + Math.max(U, st.f * (caps[i] - rank))));
                if (next <= rank) return;
                ev.push({ r, who: i, price: next, from: lead, kind: 'bid' }); lead = i; rank = next;
            };
            for (let r = 0; r < upto; r++) {
                if (r === 0) { myPrice = my.open; lead = 'me'; rank = myPrice * w; ev.push({ r, who: -1, price: myPrice, from: '', kind: 'open' }); }
                rivals.forEach((rv, i) => { if (!(TENDER_STYLE[rv.style] || {}).snipe) rivalBid(r, i); });
                if (lead !== 'me') {
                    const np = Math.min(capAt(r), up((rank + stepOf(my.step)) / w));
                    if (np > myPrice && np * w > rank + 1) { ev.push({ r, who: -1, price: np, from: lead, kind: 'raise' }); myPrice = np; rank = np * w; lead = 'me'; }
                }
                if (r === TENDER_AUC.rounds - 1) rivals.forEach((rv, i) => { if ((TENDER_STYLE[rv.style] || {}).snipe) rivalBid(r, i); });
            }
            return { lead, rank, myPrice, ev };
        }
        // Perkiraan peluang menang & harga bayar untuk form penawaran (120 skenario pesaing merata, bukan hasil sebenarnya blok ini).
        function tenderAucEstimate(b, my, w) {
            const N = 120; let win = 0, paid = 0;
            for (let i = 0; i < N; i++) {
                const run = tenderAucRun(b.bid, tenderRivalsOf(b, (i + 0.5) / N).list, my, w, TENDER_AUC.rounds);
                if (run.lead === 'me') { win++; paid += run.myPrice; }
            }
            return { win: win / N, avg: win ? paid / win : 0 };
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
                     sunk: num(r.sunk, 0, 0, 1e14), auc: tenderCleanAuc(r.auc), nat: false, snipeAt: num(r.snipeAt, 0, 0, 1e18),
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

        const tenderHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
        // Data lelang berjalan disimpan di b.auc. Save lama (mode std/agr) dimigrasi: penawaran awal = batas = tawaran lama.
        function tenderAucOf(b) {
            if (b.auc) return b.auc;
            const M = TENDER.bidMode[b.mode] || TENDER.bidMode.std, p = Math.round(b.bid * M.mult);
            return (b.auc = { open: p, max: p, step: 0.02, esc: p, t0: b.stageGt - TENDER_AUC.rounds * TENDER_AUC.hourMs, seen: 0, w: corpBidPower(), log: [{ r: 0, max: p }] });
        }
        function tenderCleanAuc(a) {
            if (!a || typeof a !== 'object') return null;
            const n = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
            const log = (Array.isArray(a.log) ? a.log : []).slice(0, 16).map(e => ({ r: Math.floor(n(e && e.r, 0, 0, 7)), max: n(e && e.max, 0, 0, 1e14) })).filter(e => e.max > 0);
            if (!log.length) return null;
            const max = n(a.max, 0, 0, 1e14);
            return { open: n(a.open, 0, 0, 1e14), max, step: TENDER_AUC.steps.indexOf(a.step) >= 0 ? a.step : 0.02, esc: n(a.esc, max, 0, 1e14),
                     t0: n(a.t0, 0, 0, 1e18), seen: Math.floor(n(a.seen, 0, 0, 8)), w: n(a.w, 1, 0.5, 2), log };
        }
        const tenderAucRounds = (b, now) => Math.max(0, Math.min(TENDER_AUC.rounds, Math.floor((now - tenderAucOf(b).t0) / TENDER_AUC.hourMs) + 1));
        const tenderAucRunOf = (b, upto) => { const A = tenderAucOf(b); return tenderAucRun(b.bid, tenderRivalsOf(b).list, A, A.w || 1, upto); };
        // Dipanggil tiap tick: memunculkan log + notifikasi untuk putaran yang baru lewat (termasuk "ditawar lebih tinggi").
        function tenderAucProgress(b, now) {
            const A = tenderAucOf(b), played = tenderAucRounds(b, now);
            if (played <= A.seen) return false;
            const run = tenderAucRunOf(b, played), rv = tenderRivalsOf(b).list, name = tenderName(b);
            run.ev.filter(e => e.r >= A.seen).forEach(e => {
                if (e.who >= 0 && e.from === 'me') {
                    addLog(`TENDER: ${rv[e.who].n} menawar ${formatRupiah(Math.round(e.price))} untuk ${name}, melewati penawaran Anda.`, 'warning');
                    notify(`Ditawar lebih tinggi di ${name}: ${rv[e.who].n} (${formatRupiah(Math.round(e.price))}).`, 'warn');
                } else if (e.who < 0 && e.kind === 'raise') addLog(`TENDER: Penawaran Anda untuk ${name} otomatis naik ke ${formatRupiah(Math.round(e.price))}.`, 'info');
            });
            A.seen = played; return true;
        }
        function tenderAucHtml(b) {
            const A = tenderAucOf(b), played = Math.max(1, tenderAucRounds(b, gameNow())), rv = tenderRivalsOf(b).list, run = tenderAucRunOf(b, played);
            const pos = run.lead === 'me' ? `<b class="text-emerald-400">Anda memimpin</b> di ${formatRupiah(Math.round(run.myPrice))}`
                : `<b class="text-orange-400">${esc(rv[run.lead].n)}</b> memimpin di ${formatRupiah(Math.round(run.rank))}`;
            const rows = run.ev.slice(-6).reverse().map(e => `<div class="flex justify-between text-[10px] py-0.5 border-b border-gray-900"><span class="text-gray-400">Jam ${e.r} &middot; <span class="text-gray-300">${e.who < 0 ? (e.kind === 'open' ? 'Penawaran awal Anda' : 'Anda (otomatis)') : esc(rv[e.who].n)}</span></span><span class="font-mono text-gray-300">${formatRupiah(Math.round(e.price))}</span></div>`).join('');
            const late = played >= TENDER_AUC.rounds || A.max >= Math.round(TENDER_AUC.capMax * b.bid / TENDER_AUC.unit) * TENDER_AUC.unit;
            return `<div class="mt-2 text-[10px] text-gray-400">${pos}<br>Batas maksimum Anda <b class="text-gray-300">${formatRupiah(Math.round(A.max))}</b> &middot; dana terkunci ${formatRupiah(Math.round(A.esc))}</div>
                <div class="mt-1.5">${rows}</div>
                ${late ? '' : `<button onclick="tenderRaise('${b.id}')" class="w-full mt-2 bg-amber-700 hover:bg-amber-600 text-white font-bold py-1.5 rounded-xl text-[11px] transition"><i class="fa-solid fa-arrow-up mr-1"></i>Naikkan Batas Maksimum</button>`}`;
        }
        // Form penawaran: penawaran awal, batas maksimum (harga cadangan), kenaikan per putaran + perkiraan peluang menang.
        function tenderBidForm(b, o = {}) {
            return new Promise(resolve => {
                const V = b.bid, U = TENDER_AUC.unit, w = corpBidPower(), raise = !!o.raise, A = o.auc || null, rv = tenderRivalsOf(b).list;
                const px = m => Math.ceil(m * V / U - 1e-9) * U, clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
                const old = document.getElementById('tender-bid-modal'); if (old) old.remove();
                const el = document.createElement('div');
                el.id = 'tender-bid-modal'; el.className = 'fixed inset-0 bg-black/75 backdrop-blur-sm z-[10650] flex items-center justify-center p-4';
                const fld = 'w-full bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-teal-500';
                const lbl = 'block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1';
                const sn = rv.some(x => (TENDER_STYLE[x.style] || {}).snipe);
                el.innerHTML = `<div class="bg-gray-900 border border-gray-800 rounded-xl p-4 max-w-sm w-full shadow-2xl max-h-[92vh] overflow-y-auto">
                    <h3 class="text-sm font-bold text-gray-100 mb-0.5"><i class="fa-solid fa-gavel text-amber-400 mr-1.5"></i>${raise ? 'Naikkan Batas Maksimum' : 'Ikut Lelang'}</h3>
                    <p class="text-[11px] text-gray-400 mb-2">${esc(tenderName(b))} &middot; nilai dasar <b class="text-amber-400">${formatRupiah(V)}</b></p>
                    <div class="text-[10px] text-gray-400 mb-3 leading-relaxed">Pesaing: ${rv.map(x => `<b class="text-gray-300">${esc(x.n)}</b> <span class="text-gray-500">(${esc(x.style)})</span>`).join(', ')}${sn ? '<br><span class="text-orange-400">Ada penyergap: menawar di putaran terakhir dan tidak sempat Anda balas. Penawaran yang sudah tinggi di akhir memperkecil risikonya.</span>' : ''}</div>
                    ${raise ? '' : `<label class="${lbl}">Penawaran awal (&times; nilai dasar, 0,80 - 1,30)</label>
                    <input id="tb-f-open" type="number" inputmode="decimal" step="0.01" min="0.8" max="1.3" value="0.90" class="${fld}"><div id="tb-r-open" class="text-[10px] text-gray-500 mt-0.5 mb-2.5"></div>`}
                    <label class="${lbl}">Batas maksimum / harga cadangan (&times; nilai dasar, sampai 1,60)</label>
                    <input id="tb-f-max" type="number" inputmode="decimal" step="0.01" min="0.8" max="1.6" value="${raise ? ((A.max / V) + 0.2).toFixed(2) : '1.20'}" class="${fld}"><div id="tb-r-max" class="text-[10px] text-gray-500 mt-0.5 mb-2.5"></div>
                    ${raise ? '' : `<label class="${lbl}">Kenaikan otomatis per putaran</label>
                    <select id="tb-f-step" class="${fld} mb-2.5"><option value="0.01">1% (pelan, hemat)</option><option value="0.02" selected>2%</option><option value="0.04">4% (cepat, lebih mahal)</option></select>`}
                    <div id="tb-est" class="text-[10px] text-gray-300 bg-gray-950 border border-gray-800 rounded-lg p-2 mb-3 leading-relaxed"></div>
                    <div class="flex gap-2"><button id="tb-cancel" class="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold py-2.5 rounded-lg text-xs transition">Batal</button>
                    <button id="tb-ok" class="flex-1 bg-teal-700 hover:bg-teal-600 text-white font-bold py-2.5 rounded-lg text-xs transition">${raise ? 'Naikkan' : 'Ajukan Penawaran'}</button></div></div>`;
                document.body.appendChild(el);
                const q = id => el.querySelector('#' + id);
                const read = () => {
                    const op = raise ? A.open / V : clamp(parseFloat(q('tb-f-open').value) || 0.9, TENDER_AUC.floor, TENDER_AUC.openMax);
                    const lo = raise ? A.max / V + 0.01 : op, mx = clamp(parseFloat(q('tb-f-max').value) || lo, lo, TENDER_AUC.capMax);
                    return { open: raise ? A.open : px(op), max: raise ? Math.max(px(mx), A.max + U) : Math.max(px(mx), px(op)), step: raise ? A.step : (parseFloat(q('tb-f-step').value) || 0.02) };
                };
                const upd = () => {
                    const f = read();
                    if (q('tb-r-open')) q('tb-r-open').textContent = '= ' + formatRupiah(f.open);
                    q('tb-r-max').textContent = '= ' + formatRupiah(f.max);
                    const need = raise ? f.max - A.max : f.max, short = companyCash < need;
                    if (raise) q('tb-est').innerHTML = `Tambahan dana jaminan <b class="${short ? 'text-red-400' : 'text-gray-100'}">${formatRupiah(need)}</b>. Berlaku mulai putaran berikutnya.`;
                    else {
                        const e = tenderAucEstimate(b, { open: f.open, step: f.step, log: [{ r: 0, max: f.max }] }, w);
                        q('tb-est').innerHTML = `Dana jaminan dikunci <b class="${short ? 'text-red-400' : 'text-gray-100'}">${formatRupiah(need)}</b>. Menang: hanya harga akhir yang dibayar, sisanya kembali. Kalah: ${Math.round((1 - tenderRefund()) * 100)}% dari tawaran terakhir hangus.<br>Perkiraan peluang menang <b class="text-amber-400">${Math.round(e.win * 100)}%</b>${e.win ? `, harga bayar rata-rata <b class="text-amber-400">${formatRupiah(Math.round(e.avg / U) * U)}</b>` : ''}.`;
                    }
                };
                el.querySelectorAll('input,select').forEach(i => { i.addEventListener('input', upd); i.addEventListener('change', upd); });
                const done = v => { el.remove(); resolve(v); };
                q('tb-cancel').onclick = () => done(null);
                q('tb-ok').onclick = () => { const f = read(); if (raise && f.max <= A.max) return; done(f); };
                upd();
            });
        }
        async function tenderBid(id) {
            if (pphBlokir()) return;
            let b = tenderFind(id);
            if (!currentAccount || !b || b.stage !== 'open') return;
            const nat = b.nat;
            if (nat && hulu.blok.list.length >= TENDER.listMax) return showModal('Daftar Blok Penuh', 'Selesaikan atau lepas salah satu blok dulu sebelum mengambil Blok Nasional.', 'fa-triangle-exclamation', 'amber');
            const f = await tenderBidForm(b);
            if (!f || b.stage !== 'open') return;
            const cost = f.max;   // dana jaminan = batas maksimum; selisih dengan harga akhir dikembalikan saat lelang selesai
            if (companyCash < cost) return tenderNoCash('Dana jaminan lelang ' + tenderName(b), cost);
            if (nat) {   // rebut hak lelang dari pemain nyata lain (atomik) lalu pindahkan ke daftar blok pribadi
                let r; try { r = await window.fb.claimBlok(b.id, currentAccount.id, currentAccount.company); } catch (e) { r = null; console.warn('claimBlok:', e); }
                if (!r) return showModal('Tidak Terhubung', 'Gagal menghubungi server untuk merebut Blok Nasional. Periksa koneksi dan coba lagi.', 'fa-wifi', 'red');
                if (r.limit) return showModal('Jatah Klaim Habis', 'Anda sudah merebut satu Blok Nasional di periode ini. Tunggu periode berikutnya (±6 jam nyata) untuk merebut lagi.', 'fa-hourglass-half', 'amber');
                tenderClaims[b.id] = { uid: r.mine ? currentAccount.id : '', company: r.by || currentAccount.company };
                if (!r.ok) { huluRender(); tenderSyncMarkers(); return showModal('Blok Sudah Direbut', r.mine ? 'Blok ini sudah pernah Anda ambil.' : `${esc(tenderName(b))} baru saja direbut <b>${esc(r.by)}</b> (pemain nyata). Coba blok lain.`, 'fa-user-group', 'amber'); }
                const bk = hulu.blok, seq = ++bk.seq, nb = Object.assign({}, b, { id: 'b' + seq, seq, nat: false, nk: b.id, dev: Object.assign({}, b.dev) });
                // Hasil blok (peluang sukses, undian bor, undian pesaing) diundi ULANG dari jam server saat klaim, bukan dari seed yang terbaca di kode,
                // jadi pemain tidak bisa menghitung lebih dulu blok mana yang untung sebelum merebutnya.
                const R = tenderRng((Math.floor(r.at || Date.now()) ^ tenderHash(b.id)) >>> 0), T = TENDER.tiers[b.tier];
                nb.p = Math.min(0.85, Math.max(0.08, T.p + (R() * 0.36 - 0.18))); nb.roll = R(); nb.auRoll = R();
                bk.list.push(nb); b = nb;
                if (typeof saveGame === 'function') saveGame();   // klaim sudah tercatat di server: simpan segera supaya blok tidak hilang kalau tab ditutup
                if (companyCash < cost) { addLog(`TENDER: Blok Nasional ${tenderName(b)} berhasil direbut, tetapi kas tidak cukup untuk menawar. Blok tersimpan di daftar Anda.`, 'warning'); tenderSyncMarkers(); return huluRender(); }
            }
            tenderPay(b, cost, `Dana jaminan lelang ${tenderName(b)}`);
            b.stage = 'tender'; b.stageGt = gameNow() + TENDER.hours.lelang * 3600000;
            b.auc = { open: f.open, max: f.max, step: f.step, esc: cost, t0: gameNow(), seen: 0, w: corpBidPower(), log: [{ r: 0, max: f.max }] };
            addLog(`TENDER: Penawaran awal ${formatRupiah(f.open)} (batas ${formatRupiah(f.max)}) untuk ${tenderName(b)} diajukan. Lelang berjalan ${TENDER_AUC.rounds} putaran (±${TENDER.hours.lelang} jam game).`, 'info');
            tenderSyncMarkers(); huluRender();
        }
        async function tenderRaise(id) {
            if (pphBlokir()) return;
            const b = tenderFind(id); if (!currentAccount || !b || b.stage !== 'tender') return;
            const A = tenderAucOf(b), U = TENDER_AUC.unit, capRp = Math.round(TENDER_AUC.capMax * b.bid / U) * U;
            if (tenderAucRounds(b, gameNow()) >= TENDER_AUC.rounds) return showModal('Terlambat', 'Putaran terakhir sudah lewat, batas tidak bisa dinaikkan lagi.', 'fa-clock', 'amber');
            if (A.max >= capRp) return showModal('Batas Sudah Maksimal', 'Batas maksimum sudah di angka tertinggi yang diizinkan (1,60 x nilai dasar).', 'fa-ban', 'amber');
            const f = await tenderBidForm(b, { raise: true, auc: A });
            if (!f || b.stage !== 'tender') return;
            const extra = f.max - A.max, r = tenderAucRounds(b, gameNow());   // berlaku mulai putaran yang belum berjalan
            if (extra <= 0 || r >= TENDER_AUC.rounds) return showModal('Terlambat', 'Putaran terakhir sudah lewat, batas tidak bisa dinaikkan lagi.', 'fa-clock', 'amber');
            if (companyCash < extra) return tenderNoCash('Tambahan dana jaminan', extra);
            tenderPay(b, extra, `Tambahan dana jaminan lelang ${tenderName(b)}`);
            A.max = f.max; A.esc += extra; A.log.push({ r, max: f.max });
            addLog(`TENDER: Batas maksimum ${tenderName(b)} dinaikkan ke ${formatRupiah(f.max)} (berlaku putaran ${r + 1}).`, 'info');
            huluRender();
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
        const tenderRefund = () => Math.min(0.98, Math.max(0.5, TENDER.refund + corpRefundBonus()));
        function tenderResolveBid(b) {
            const A = tenderAucOf(b), name = tenderName(b), run = tenderAucRunOf(b, TENDER_AUC.rounds), rv = tenderRivalsOf(b).list;
            const back = (amt, desc) => { amt = Math.round(amt); if (amt <= 0) return; companyCash += amt; totalExpense -= amt; b.sunk -= amt; hulu.blok.spent -= amt; addFinanceLog(desc, amt); updateCashDisplay(); };
            const lastRival = run.ev.filter(e => e.who >= 0).pop();
            if (run.lead === 'me') {
                back(A.esc - run.myPrice, `Sisa dana jaminan lelang ${name}`);
                b.stage = 'won'; b.stageGt = 0; b.auc = null;
                addLog(`TENDER: Anda MEMENANGKAN lelang ${name} dengan harga ${formatRupiah(Math.round(run.myPrice))}${lastRival ? `, mengalahkan ${rv[lastRival.who].n} (${formatRupiah(Math.round(lastRival.price))})` : ''}. Sisa dana jaminan dikembalikan. Lanjutkan dengan survei seismik.`, 'success');
                notify(`Lelang ${name} dimenangkan di ${formatRupiah(Math.round(run.myPrice))}!`, 'ok');
            } else {
                const fee = Math.round(run.myPrice * (1 - tenderRefund()));
                back(A.esc - fee, `Pengembalian dana jaminan lelang ${name} (kalah)`);
                const w = rv[run.lead];
                b.stage = 'open'; b.mode = ''; b.auc = null; b.stageGt = 0; b.auRoll = Math.random(); b.snipeAt = gameNow() + tRnd(2, 6) * DAY_MS;
                addLog(`TENDER: Kalah lelang ${name}. ${w.n} menang di ${formatRupiah(Math.round(run.rank))} (tawaran terakhir Anda ${formatRupiah(Math.round(run.myPrice))}, batas ${formatRupiah(Math.round(A.max))}). Biaya administrasi ${formatRupiah(fee)}, sisa dana dikembalikan. Blok dibuka lagi.`, 'warning');
                notify(`Kalah dari ${w.n} (${formatRupiah(Math.round(run.rank))}). Dana jaminan dikembalikan.`, 'warn');
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
                } else if (b.stage === 'tender') { if (now >= b.stageGt) { tenderResolveBid(b); changed = true; } else if (tenderAucProgress(b, now)) changed = true; }
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
                const rv = tenderRivalsOf(b), soon = b.snipeAt && b.snipeAt - (b.nat ? Date.now() : gameNow()) < (b.nat ? 3 * 3600000 : DAY_MS);
                act = `<div class="text-[10px] text-gray-400 mb-2"><i class="fa-solid fa-user-tie text-sky-400 mr-1"></i>Pesaing tertarik: ${rv.list.map(x => `<b class="text-gray-300">${esc(x.n)}</b> <span class="text-gray-500">(${esc(x.style)})</span>`).join(', ')}${soon ? ' <b class="text-orange-400">&middot; segera direbut</b>' : ''}${b.nat ? `<div id="tb-nat-${b.id}" class="mt-0.5 text-sky-300"></div>` : ''}</div>
                    <button onclick="tenderBid('${b.id}')" class="w-full bg-teal-700 hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl text-[11px] transition leading-tight"><i class="fa-solid fa-gavel mr-1.5"></i>Ikut Lelang<br><span class="font-normal opacity-80">nilai dasar <span class="font-mono font-semibold">${formatRupiah(b.bid)}</span> &middot; tentukan penawaran sendiri</span></button>`;
            } else if (b.stage === 'won') {
                act = `<button onclick="tenderSurvey('${b.id}')" class="w-full bg-sky-700 hover:bg-sky-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-wave-square mr-1.5"></i>Survei Seismik (${formatRupiah(tenderSeis(b))})</button>
                    <button onclick="tenderDrop('${b.id}')" class="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-1.5 rounded-xl text-[11px] transition">Lepas Blok</button>`;
            } else if (b.stage === 'surveyed') {
                act = `<button onclick="tenderDrill('${b.id}')" class="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-oil-well mr-1.5"></i>Bor Eksplorasi (${formatRupiah(tenderBor(b))})</button>
                    <button onclick="tenderDrop('${b.id}')" class="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-1.5 rounded-xl text-[11px] transition">Lepas Blok</button>`;
            } else {
                act = `<div id="tb-bar-${b.id}"></div><div id="tb-left-${b.id}" class="text-[10px] text-gray-400 mt-1.5"></div>${b.stage === 'tender' ? tenderAucHtml(b) : ''}`;
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
