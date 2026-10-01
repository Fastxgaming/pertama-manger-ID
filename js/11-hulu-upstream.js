        // ===== TAHAP 4: TUJUAN PIPA & KAPAL = SEMUA KILANG/DEPO YANG PUNYA DERMAGA =====
        // Dulu pipa & kapal anjungan hanya menuju Kilang Tuban. Kini tiap anjungan bisa punya SATU PIPA PER TUJUAN dan kapal bisa dikirim ke tujuan
        // (batas panjang pipa: HULU_PIPE.maxKm; kapal dibatasi jangkauan tangkinya; cuaca buruk berlaku per ZONA laut, lihat HULU_ZONES)
        // yang dipilih: setiap Kilang/Depo yang sudah dibeli, punya dermaga (field `berth`) dan menerima jenis produknya
        // (minyak mentah -> Kilang Tuban & depo BBM, tangki Bbl; gas bumi -> semua yang punya tangki LPG Curah). Tuban tetap tujuan bawaan.
        // Data pipa: hulu.pipes[kodeAnjungan][idKilang] = status pipa. Save lama (satu pipa per anjungan) otomatis dibaca sebagai pipa ke Tuban.
        // ===== SEKTOR HULU (UPSTREAM) - TAHAP 3: PIPA BAWAH LAUT + KEJADIAN ACAK (KEBOCORAN, CUACA BURUK) =====
        // Tahap 3 menambah: (1) pipa bawah laut per anjungan ke kilang/depo tujuan (bawaan Kilang Tuban) yang mengalirkan hasil otomatis tanpa kapal/kru,
        // (2) kebocoran pipa acak (aliran berhenti, biaya bersih-bersih, harus diperbaiki), (3) cuaca buruk acak PER ZONA laut (Laut Madura, Bali, Laut Jawa, Selat Makassar, dst.)
        // (gelombang tinggi: kapal yang rutenya melewati zona itu dilarang berlayar; badai: sama + produksi anjungan DI ZONA itu turun 50%). Pipa kebal cuaca.
        // Tahap 2: 3 LOKASI ANJUNGAN (MINYAK + GAS), UPGRADE PRODUKSI.
        // Pemain membangun anjungan lepas pantai di Laut Madura. Anjungan minyak menghasilkan minyak mentah (Bbl) yang
        // diangkut Kapal Tanker BBM ke stok mentah kilang/depo tujuan (bawaan Tuban). Anjungan gas menghasilkan gas bumi yang masuk
        // sebagai LPG Curah (Ton) ke kilang/depo tujuan lewat Kapal Tanker LPG. Semua TAMBAHAN: tombol beli di tab Kilang tetap ada.
        //
        // Hitungan waktu memakai gameNow() (jam game), BUKAN Date.now(), jadi produksi ikut berhenti saat game dijeda /
        // tab tersembunyi / pemain offline - tidak perlu logika jeda tambahan.

        // Kapasitas tangki anjungan 10 juta (Bbl / Ton). Produksi/hari diset supaya tangki kosong -> penuh dalam ±3-4 HARI GAME (1 hari game = 2 jam nyata).
        // Upgrade menaikkan rate & cap dengan persentase yang sama, jadi waktu penuh tetap. Aliran pipa dibatasi ruang tangki tujuan sampai target stok pipa (lihat HULU_PIPE_TARGET).
        const HULU_SITES = {
            alpha: { nama: 'Anjungan Madura Alpha', berth: 'AN_alpha', fuel: 'oil', unit: 'Bbl', jenis: 'minyak mentah', shipType: 'BBM', icon: 'fa-oil-well', tone: 'teal',
                     lat: -7.39984902546815, lon: 114.02713911013367, buildCost: 48e9, buildHours: 12, rate: 2500000, cap: 10000000, opexWeek: 9e9, minLoad: 500, hpp: 215000 },
            bravo: { nama: 'Anjungan Madura Bravo', berth: 'AN_bravo', fuel: 'oil', unit: 'Bbl', jenis: 'minyak mentah', shipType: 'BBM', icon: 'fa-oil-well', tone: 'amber',
                     lat: -7.47, lon: 114.10, buildCost: 88e9, buildHours: 18, rate: 3400000, cap: 10000000, opexWeek: 17e9, minLoad: 500, hpp: 190000 },
            gamma: { nama: 'Anjungan Gas Madura Gamma', berth: 'AN_gamma', fuel: 'gas', unit: 'Ton', jenis: 'gas bumi (LPG Curah)', shipType: 'LPG', icon: 'fa-fire-flame-simple', tone: 'orange',
                     lat: -7.34, lon: 113.96, buildCost: 36e9, buildHours: 12, rate: 2500000, cap: 10000000, opexWeek: 4.8e9, minLoad: 50, hpp: 1450000 }
        };
        const HULU_KEYS = Object.keys(HULU_SITES);
        // HPP (harga pokok produksi) per Bbl/Ton: dibayar tiap kali hasil anjungan MASUK ke kilang/depo tujuan (lewat pipa atau kapal),
        // jadi biayanya mengikuti pemakaian nyata, bukan produksi yang menganggur di tangki anjungan. Lebih murah dari beli di pasar
        // (harga dasar Bbl Rp 430 rb, LPG curah Rp 2,9 jt/Ton; harga pasar sebenarnya dinamis, lihat 04a-pasar-harga.js). HPP anjungan TETAP, jadi anjungan kebal fluktuasi.
        const HULU_HPP_RESERVE = 2e9;   // sisa kas minimum: HPP tidak boleh menghabiskan kas (gaji/opex/bunker tetap harus terbayar); dinaikkan ke Rp 2 M karena tangki LPG kilang/depo kini besar dan pipa gas bisa menyedot kas untuk mengisinya
        // Target stok tujuan untuk aliran PIPA (persen dari kapasitas tangki). Pipa hanya mengisi ulang sampai target ini,
        // bukan sampai penuh, supaya begitu pipa jadi kas tidak tersedot habis jadi stok mentah (HPP dibayar per unit yang masuk).
        // Bawaan dibedakan: Kilang Tuban (tangki besar) memakai HULU_PIPE_TARGET, depo cabang (tangki lebih kecil) memakai HULU_PIPE_TARGET_DEPO.
        // Pemain bisa mengubah target tiap pipa dari pilihan HULU_TARGET_CHOICES (disimpan di pipa: field `target`; 0 = pakai bawaan).
        // Kapal tetap bisa mengisi sampai tangki penuh.
        const HULU_PIPE_TARGET = { oil: 0.30, gas: 0.50 };
        const HULU_PIPE_TARGET_DEPO = { oil: 0.50, gas: 0.70 };
        const HULU_TARGET_CHOICES = [0.2, 0.3, 0.5, 0.7, 0.9];
        const huluTargetDefault = (k, did) => (did === HULU_HOME ? HULU_PIPE_TARGET : HULU_PIPE_TARGET_DEPO)[HULU_SITES[k].fuel];
        const huluHppAfford = k => Math.max(0, companyCash - HULU_HPP_RESERVE) / HULU_SITES[k].hpp;
        const huluHppAcc = {}; let huluHppFlushAt = 0;
        function huluHppFlush(force) {
            if (!force && Date.now() - huluHppFlushAt < 60000) return;
            huluHppFlushAt = Date.now();
            HULU_KEYS.forEach(k => { const a = huluHppAcc[k]; if (a && a.cost > 0) { addFinanceLog(`HPP ${HULU_SITES[k].jenis} ${HULU_SITES[k].nama} via pipa (${fmtN(a.qty)} ${HULU_SITES[k].unit})`, -Math.round(a.cost)); delete huluHppAcc[k]; } });
        }
        function huluHppPipe(k, q) {
            const cost = q * HULU_SITES[k].hpp;
            companyCash -= cost; totalExpense += cost;
            const a = huluHppAcc[k] || (huluHppAcc[k] = { qty: 0, cost: 0 }); a.qty += q; a.cost += cost;
            huluHppFlush(false); updateCashDisplay();
        }
        seaValidateBerths(Object.values(HULU_SITES));
        // Koordinat di atas format Google Maps / Leaflet: lat, lon. Untuk OSRM urutannya dibalik: lon,lat
        // (Alpha = 114.02713911013367,-7.39984902546815). Bravo & Gamma ditaruh beberapa km di sekitar Alpha.
        // Titik-titik perantara di Laut Madura: kapal & pipa TIDAK boleh memotong daratan Jawa/Madura, jadi jalurnya
        // dari Kilang Tuban dibelokkan lewat perairan utara Madura, ujung timur Madura, lalu turun ke selatan. Ubah kalau perlu.
        const HULU_LANE = [[-6.62, 112.60], [-6.60, 113.45], [-6.72, 114.12], [-7.03, 114.08]];   // urutan: dari Tuban menuju anjungan
        const HULU_HOME = 'KILANG-01';   // Kilang Tuban: tujuan bawaan (save lama & pilihan awal)
        const huluRefById = did => refineryData.find(r => r.id === did) || null;
        // Tujuan sah untuk produk anjungan k: punya dermaga + tangki yang cocok (minyak -> tangki Bbl Tuban/depo BBM, gas -> tangki LPG Curah)
        const huluAccepts = (k, r) => !!(r && r.berth && (HULU_SITES[k].fuel === 'gas' ? (r.kap && r.kap.lpg_curah) : (r === refineryData[0] || String(r.tipe).includes('BBM'))));
        const huluDestList = k => refineryData.filter(r => r.is_unlocked && huluAccepts(k, r));
        const huluPath = (k, did) => {   // kilang/depo tujuan -> anjungan
            const c = HULU_SITES[k], ref = huluRefById(did || HULU_HOME) || refineryData[0], tb = [ref.lat, ref.lon];
            // Tuban + anjungan bawaan: lajur tangan HULU_LANE (tampilan lama tidak berubah).
            if (ref === refineryData[0] && !c.dyn) return [tb, ...HULU_LANE, [c.lat, c.lon]];
            // Tujuan lain & anjungan hasil tender blok: pipa mengikuti lajur laut dermaga tujuan -> dermaga anjungan (aman dari daratan, hasil di-cache di seaRoute)
            const r = seaRoute(ref, c); return r ? [tb, ...r.pts] : [tb, [c.lat, c.lon]];
        };
        const huluPathKm = (k, did) => { const pt = huluPath(k, did); let t = 0; for (let i = 1; i < pt.length; i++) t += distKm({ lat: pt[i - 1][0], lon: pt[i - 1][1] }, { lat: pt[i][0], lon: pt[i][1] }); return t; };
        const huluPathMid = (k, did) => { const pt = huluPath(k, did), half = huluPathKm(k, did) / 2; let t = 0;
            for (let i = 1; i < pt.length; i++) { const seg = distKm({ lat: pt[i - 1][0], lon: pt[i - 1][1] }, { lat: pt[i][0], lon: pt[i][1] }); if (t + seg >= half) { const f = (half - t) / seg; return [pt[i - 1][0] + (pt[i][0] - pt[i - 1][0]) * f, pt[i - 1][1] + (pt[i][1] - pt[i - 1][1]) * f]; } t += seg; }
            return pt[pt.length - 1]; };
        const HULU_DAY = 86400000, HULU_WEEK = 7 * 86400000, HULU_MAX_LVL = 3, HULU_UP = { rate: 0.30, opex: 0.20, cost: 0.5, growth: 1.6 };
        // Pipa bawah laut & kejadian acak. Biaya/tagihan dihitung dari panjang lajur anjungan -> kilang/depo tujuan.
        const HULU_PIPE = { costKm: { oil: 0.13e9, gas: 0.12e9 }, opexKm: 12e6, hoursPerKm: 0.06, capMult: 2,
                            maxKm: 800,   // pipa baru hanya boleh ke tujuan dalam jarak ini (km lajur laut); pipa antarpulau jauh (Sulawesi/Kalimantan) tidak realistis

                            repairPct: 0.06, cleanPct: 0.025, inspectPct: 0.015, finePct: 0.01, repairHours: 6,
                            leakBase: 0.03, leakAge: 0.012, leakMax: 0.18 };   // peluang bocor/hari = dasar + umur sejak inspeksi terakhir
        // Zona cuaca: satu kejadian aktif pada satu waktu, di SATU zona (lingkaran pusat lat/lon, radius r km). Kapal hanya dilarang bila
        // rutenya melewati zona itu, dan hanya anjungan di dalam zona yang produksinya turun saat badai. Dipilih acak dari zona yang relevan
        // bagi pemain (berisi anjungan terbangun atau depo aktif). w = bobot peluang.
        const HULU_ZONES = {
            madura:   { label: 'Laut Madura',     lat: -6.95, lon: 113.30, r: 170, w: 3 },
            bali:     { label: 'Selat Bali',      lat: -8.20, lon: 115.30, r: 150, w: 2 },
            jawabrt:  { label: 'Laut Jawa Barat', lat: -6.10, lon: 108.80, r: 330, w: 2 },
            jawatim:  { label: 'Laut Jawa Timur', lat: -6.20, lon: 116.00, r: 250, w: 2 },
            makassar: { label: 'Selat Makassar',  lat: -3.00, lon: 118.40, r: 380, w: 2 },
            kalbar:   { label: 'Laut Natuna',     lat: 0.50,  lon: 109.50, r: 300, w: 1 }
        };
        const HULU_STORM = { badai: { label: 'Badai', prodMult: 0.5, color: '#a855f7' }, gelombang: { label: 'Gelombang tinggi', prodMult: 1, color: '#f59e0b' } };
        const huluPipeDefault = () => ({ target: 0, built: false, ready: false, readyGt: 0, lastGt: 0, opexDueGt: 0, unpaid: false, leak: false, leakGt: 0, repairDoneGt: 0, inspectGt: 0, fineDueGt: 0, flowed: 0, leaks: 0 });
        const huluSiteDefault = () => ({ built: false, ready: false, readyGt: 0, lastGt: 0, opexDueGt: 0, stok: 0, transit: 0, produced: 0, shutIn: false, lvl: 0 });
        const huluDefault = () => { const s = {}, p = {}; HULU_KEYS.forEach(k => { s[k] = huluSiteDefault(); p[k] = {}; }); return { sites: s, pipes: p, storm: { kind: '', zone: 'madura', untilGt: 0, nextGt: 0 }, blok: tenderBlokDefault() }; };
        let hulu = huluDefault();
        let huluEpoch = 0;   // naik tiap progres dimuat ulang; kapal "sesi lama" tidak menambah stok lagi
        let huluSel = 'alpha';
        const hs = k => hulu.sites[k];
        const huluPipeKeys = k => Object.keys((hulu.pipes && hulu.pipes[k]) || {});   // id kilang/depo yang sudah punya pipa dari anjungan k
        const hp = (k, did) => { const m = hulu.pipes[k]; return (m && m[did]) || huluPipeDefault(); };   // pipa belum ada -> status kosong (tidak disimpan)
        const pipeName = (k, did) => 'Pipa ' + HULU_SITES[k].nama + ' ke ' + ((huluRefById(did) || {}).nama || did);
        const pipeKm = (k, did) => huluPathKm(k, did);
        const pipeTooFar = (k, did) => pipeKm(k, did) > HULU_PIPE.maxKm;
        const pipeCost = (k, did) => Math.round(pipeKm(k, did) * HULU_PIPE.costKm[HULU_SITES[k].fuel] / 1e8) * 1e8;
        const pipeOpex = (k, did) => Math.round(pipeKm(k, did) * HULU_PIPE.opexKm / 1e6) * 1e6;
        const pipeHours = (k, did) => Math.ceil(pipeKm(k, did) * HULU_PIPE.hoursPerKm);
        const pipeCap = k => Math.round(HULU_SITES[k].rate * HULU_PIPE.capMult);   // kapasitas alir per pipa per hari game
        const pipeRepairCost = (k, did) => Math.round(pipeCost(k, did) * HULU_PIPE.repairPct);
        const pipeInspectCost = (k, did) => Math.round(pipeCost(k, did) * HULU_PIPE.inspectPct);
        const pipeLeakRate = (k, did) => Math.min(HULU_PIPE.leakMax, HULU_PIPE.leakBase + HULU_PIPE.leakAge * Math.max(0, (gameNow() - hp(k, did).inspectGt) / HULU_DAY));
        const huluZoneOf = () => HULU_ZONES[hulu.storm.zone] || HULU_ZONES.madura;
        const huluInStorm = (lat, lon) => !!hulu.storm.kind && distKm({ lat, lon }, huluZoneOf()) <= huluZoneOf().r;
        // Rute laut a -> b (entitas ber-lat/lon, idealnya ber-berth) melewati zona cuaca buruk yang sedang aktif?
        function huluRouteStorm(a, b) {
            if (!hulu.storm.kind) return false;
            const r = typeof seaRoute === 'function' ? seaRoute(a, b) : null, pts = r ? r.pts : [[a.lat, a.lon], [b.lat, b.lon]];
            return pts.some(q => huluInStorm(q[0], q[1]));
        }
        // Rute misi penuh kapal (pangkalan -> tempat muat -> tujuan -> pangkalan) melewati zona cuaca buruk? Kapal tanpa data -> hanya ruas muat -> tujuan.
        function huluTripStorm(ship, from, to) {
            if (!hulu.storm.kind) return false;
            const base = ship ? shipBaseOf(ship) : null, legs = [[from, to]];
            if (base && base.berth !== from.berth) legs.push([base, from]);
            if (base && base.berth !== to.berth) legs.push([to, base]);
            return legs.some(([a, b]) => huluRouteStorm(a, b));
        }
        const huluStormMult = k => (hulu.storm.kind && HULU_SITES[k] && huluInStorm(HULU_SITES[k].lat, HULU_SITES[k].lon) ? HULU_STORM[hulu.storm.kind].prodMult : 1);
        const huluStormLeftMs = () => (hulu.storm.kind ? Math.max(0, hulu.storm.untilGt - gameNow()) : 0);
        const hRate = k => HULU_SITES[k].rate * (1 + HULU_UP.rate * hs(k).lvl);
        const hCap = k => Math.round(HULU_SITES[k].cap * (1 + HULU_UP.rate * hs(k).lvl));
        const hOpex = k => Math.round(HULU_SITES[k].opexWeek * (1 + HULU_UP.opex * hs(k).lvl));
        const hUpCost = k => Math.round(HULU_SITES[k].buildCost * HULU_UP.cost * Math.pow(HULU_UP.growth, hs(k).lvl));
        const fmtN = v => Math.floor(v).toLocaleString('id-ID');

        // Dipanggil applySave(). Aman untuk save lama: tanpa data hulu, atau format Tahap 1 (satu anjungan = alpha).
        function huluNormalize(raw) {
            const num = (v, def) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : def);
            const blokSaved = tenderBlokLoad(raw && typeof raw === 'object' ? raw.blok : null);   // daftarkan anjungan dinamis (tender blok) SEBELUM state anjungan dibuat
            const src = raw && typeof raw === 'object' ? (raw.sites || ('built' in raw ? { alpha: raw } : {})) : {};
            const out = huluDefault(); out.blok = blokSaved;
            HULU_KEYS.forEach(k => {
                const r = src[k], d = out.sites[k];
                if (!r || typeof r !== 'object') return;
                d.built = r.built === true; d.ready = r.ready === true && d.built;
                d.readyGt = num(r.readyGt, 0); d.lastGt = num(r.lastGt, 0); d.opexDueGt = num(r.opexDueGt, 0);
                d.stok = num(r.stok, 0); d.transit = num(r.transit, 0); d.produced = num(r.produced, 0); d.shutIn = r.shutIn === true;
                d.lvl = Math.min(HULU_MAX_LVL, Math.floor(num(r.lvl, 0)));
                // Kapal tidak ikut tersimpan: muatan yang masih di laut saat save dikembalikan ke tangki anjungan.
                d.stok += d.transit; d.transit = 0;
            });
            // Tahap 3: pipa & cuaca. Save Tahap 1-2 tidak punya field ini -> default (aman).
            const pr = raw && typeof raw === 'object' && raw.pipes && typeof raw.pipes === 'object' ? raw.pipes : {};
            const pipeFrom = (r, d) => {
                d.built = r.built === true; d.ready = r.ready === true && d.built;
                d.readyGt = num(r.readyGt, 0); d.lastGt = num(r.lastGt, 0); d.opexDueGt = num(r.opexDueGt, 0);
                d.unpaid = r.unpaid === true; d.leak = r.leak === true && d.ready;
                d.leakGt = num(r.leakGt, 0); d.repairDoneGt = d.leak ? num(r.repairDoneGt, 0) : 0;
                d.inspectGt = num(r.inspectGt, 0); d.fineDueGt = num(r.fineDueGt, 0);
                d.flowed = num(r.flowed, 0); d.leaks = Math.floor(num(r.leaks, 0));
                d.target = typeof r.target === 'number' && r.target >= 0.05 && r.target <= 1 ? r.target : 0;   // save lama: 0 = target bawaan
            };
            HULU_KEYS.forEach(k => {
                const r = pr[k]; if (!r || typeof r !== 'object') return;
                const legacy = 'built' in r || 'ready' in r;   // format Tahap 3: satu pipa per anjungan = pipa ke Tuban
                const byDest = legacy ? { [HULU_HOME]: r } : r;
                Object.keys(byDest).forEach(did => {
                    const ref = huluRefById(did), m = byDest[did];
                    if (!ref || !huluAccepts(k, ref) || !m || typeof m !== 'object') return;
                    const d = huluPipeDefault(); pipeFrom(m, d);
                    if (d.built) out.pipes[k][did] = d;
                });
            });
            const st = raw && typeof raw === 'object' && raw.storm && typeof raw.storm === 'object' ? raw.storm : null;
            if (st) {
                out.storm.kind = HULU_STORM[st.kind] ? st.kind : '';
                out.storm.zone = HULU_ZONES[st.zone] ? st.zone : 'madura';   // save lama (cuaca hanya Laut Madura) tidak punya zone
                out.storm.untilGt = num(st.untilGt, 0); out.storm.nextGt = num(st.nextGt, 0);
                if (!out.storm.kind) out.storm.untilGt = 0;
            }
            huluEpoch++; huluLockWarned = {};
            if (!HULU_SITES[huluSel]) huluSel = 'alpha';
            hulu = out;
            huluPipeSig = {};
            huluMarkerSig = {}; huluUiSig = '';
            huluSyncMarkers();
            return out;
        }

        // ---------- Produksi & biaya operasional ----------
        function huluTickSite(k) {
            const s = hs(k), c = HULU_SITES[k], now = gameNow();
            if (!s.built) return;
            if (!s.ready) {
                if (now < s.readyGt) return;
                s.ready = true; s.lastGt = s.readyGt; s.opexDueGt = s.readyGt + HULU_WEEK;
                addLog(`HULU: ${c.nama} selesai dibangun dan mulai berproduksi ±${fmtN(hRate(k))} ${c.unit}/hari.`, 'success');
                notify(`${c.nama} selesai dibangun & mulai berproduksi!`, 'ok');
            }
            if (now < s.lastGt) { s.lastGt = now; return; } // jam game lebih mundur dari catatan (mis. muat progres lama)
            let guard = 0;
            while (now >= s.opexDueGt && guard++ < 5) {
                const opex = hOpex(k);
                if (companyCash >= opex) {
                    companyCash -= opex; totalExpense += opex;
                    addFinanceLog(`Biaya operasional ${c.nama} (1 minggu)`, -opex);
                    s.opexDueGt += HULU_WEEK; updateCashDisplay();
                    if (s.shutIn) { s.shutIn = false; addLog(`HULU: ${c.nama} beroperasi lagi setelah tagihan operasional dilunasi.`, 'success'); notify(`${c.nama} beroperasi lagi.`, 'ok'); }
                } else {
                    if (!s.shutIn) {
                        s.shutIn = true;
                        addLog(`HULU: ${c.nama} BERHENTI PRODUKSI karena kas tidak cukup membayar operasional ${formatRupiah(opex)}/minggu.`, 'warning');
                        notify(`${c.nama} berhenti: kas tidak cukup untuk biaya operasional.`, 'warn');
                    }
                    break;
                }
            }
            if (guard >= 5 && now >= s.opexDueGt) s.opexDueGt = now + 1; // lompatan waktu sangat jauh: hindari tagihan menumpuk
            const cap = hCap(k);
            if (!s.shutIn && s.stok < cap) {
                const add = Math.min(cap - s.stok, hRate(k) * huluStormMult(k) * (now - s.lastGt) / HULU_DAY);
                s.stok += add; s.produced += add;
            }
            s.lastGt = now;
        }
        function huluTick() {
            if (!currentAccount) return;
            huluStormTick(); HULU_KEYS.forEach(huluTickSite);
            Object.keys(huluFlowReq).forEach(x => delete huluFlowReq[x]);
            HULU_KEYS.forEach(k => huluPipeKeys(k).forEach(d => huluTickPipe(k, d)));   // kebocoran/biaya/status + kumpulkan permintaan aliran
            HULU_KEYS.forEach(huluFlowShare);                                           // bagi stok anjungan secara merata antar pipa
            tenderTick();
        }

        // ---------- Penanda di peta ----------
        const huluMarkers = {}; let huluMarkerSig = {};
        function huluStatusInfo(k) {
            const s = hs(k);
            if (!s.built) return { key: 'n', label: 'Belum dibangun', color: '#64748b' };
            if (!s.ready) return { key: 'b', label: 'Sedang dibangun', color: '#f59e0b' };
            if (s.shutIn) return { key: 's', label: 'Berhenti (kas kurang)', color: '#ef4444' };
            if (s.stok >= hCap(k)) return { key: 'f', label: 'Tangki penuh', color: '#eab308' };
            return { key: 'r', label: 'Berproduksi', color: '#14b8a6' };
        }
        function huluSyncMarkers() {
            if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
            HULU_KEYS.forEach(k => {
                const c = HULU_SITES[k], s = hs(k), st = huluStatusInfo(k), sig = st.key + s.lvl;
                if (huluMarkers[k] && huluMarkerSig[k] === sig) return;
                if (huluMarkers[k]) { map.removeLayer(huluMarkers[k]); huluMarkers[k] = null; }
                huluMarkerSig[k] = sig;
                huluMarkers[k] = L.marker([c.lat, c.lon], {
                    icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
                        html: `<div style="width:30px;height:30px;border-radius:9px;background:${st.color};border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.5);${s.built ? '' : 'opacity:.6;border-style:dashed'}"><i class="fa-solid ${c.icon}"></i></div>` }),
                    zIndexOffset: 700
                }).addTo(map);
                huluMarkers[k].bindPopup(() => {
                    const s2 = hs(k), st2 = huluStatusInfo(k);
                    return `<div class="text-gray-900 font-sans p-1 min-w-[170px]">
                        <strong class="text-xs font-bold block text-blue-700 mb-1">${esc(c.nama)}${s2.lvl ? ' &middot; Lv ' + s2.lvl : ''}</strong>
                        <div class="text-[10px] text-gray-600 leading-4">Status: <b>${st2.label}</b></div>
                        ${s2.ready ? `<div class="text-[10px] text-gray-600 leading-4">Tangki: <b>${fmtN(s2.stok)} / ${fmtN(hCap(k))} ${c.unit}</b></div>` : ''}
                        <button onclick="huluOpen('${k}')" style="margin-top:6px;background:#0d9488;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer">Buka Anjungan</button>
                    </div>`;
                }, { maxWidth: 220 });
            });
            huluSyncPipes(); huluSyncWeather();
        }
        function huluOpen(k) { if (HULU_SITES[k]) huluSel = k; huluView = 'site'; switchTab('tab-hulu'); }
        function huluPick(k) { if (HULU_SITES[k]) { huluSel = k; huluView = 'site'; huluRender(); } }
        // Hapus penanda/pipa peta & akumulator HPP sebuah anjungan dinamis (dipanggil saat muat save lain).
        function huluPurgeKey(k) {
            const pre = k + '|';
            if (typeof map !== 'undefined' && map) {
                if (huluMarkers[k]) map.removeLayer(huluMarkers[k]);
                [huluPipeLines, huluPipeLeakMk].forEach(o => Object.keys(o).forEach(pk => { if (pk.indexOf(pre) === 0 && o[pk]) map.removeLayer(o[pk]); }));
            }
            delete huluMarkers[k]; delete huluMarkerSig[k]; delete huluHppAcc[k];
            [huluPipeLines, huluPipeLeakMk, huluPipeSig].forEach(o => Object.keys(o).forEach(pk => { if (pk.indexOf(pre) === 0) delete o[pk]; }));
        }

        // ---------- Bangun & upgrade ----------
        async function huluBuild(k) {
            if (pphBlokir()) return;
            const c = HULU_SITES[k];
            if (!currentAccount || !c || hs(k).built) return;
            if (companyCash < c.buildCost) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(c.buildCost)} untuk membangun ${c.nama}.`, 'fa-triangle-exclamation', 'red');
            const ok = await showConfirm(`Bangun ${c.nama} di ${c.area || 'Laut Madura'} seharga ${formatRupiah(c.buildCost)}? Pembangunan memakan ${c.buildHours} jam waktu game, setelah itu anjungan berproduksi ±${fmtN(c.rate)} ${c.unit}/hari ${c.jenis} dengan biaya operasional ${formatRupiah(c.opexWeek)}/minggu.`,
                { title: 'Bangun Anjungan', iconClass: c.icon, theme: 'blue', okLabel: 'Bangun' });
            if (!ok || hs(k).built || companyCash < c.buildCost) return;
            companyCash -= c.buildCost; totalExpense += c.buildCost;
            addFinanceLog(`Pembangunan ${c.nama}`, -c.buildCost);
            hulu.sites[k] = Object.assign(huluSiteDefault(), { built: true, readyGt: gameNow() + c.buildHours * 3600000 });
            updateCashDisplay();
            addLog(`HULU: Pembangunan ${c.nama} dimulai (estimasi ${c.buildHours} jam game).`, 'info');
            huluSyncMarkers(); huluRender();
        }
        async function huluUpgrade(k) {
            if (pphBlokir()) return;
            const c = HULU_SITES[k], s = hs(k);
            if (!currentAccount || !c || !s.ready || s.lvl >= HULU_MAX_LVL) return;
            const cost = hUpCost(k);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Upgrade ${c.nama} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            const r2 = HULU_SITES[k].rate * (1 + HULU_UP.rate * (s.lvl + 1)), o2 = c.opexWeek * (1 + HULU_UP.opex * (s.lvl + 1));
            const ok = await showConfirm(`Upgrade ${c.nama} ke Level ${s.lvl + 1} seharga ${formatRupiah(cost)}? Produksi jadi ±${fmtN(r2)} ${c.unit}/hari, tangki ${fmtN(Math.round(c.cap * (1 + HULU_UP.rate * (s.lvl + 1))))} ${c.unit}, operasional ${formatRupiah(Math.round(o2))}/minggu.`,
                { title: 'Upgrade Anjungan', iconClass: 'fa-arrow-up-right-dots', theme: 'blue', okLabel: 'Upgrade' });
            if (!ok || !s.ready || s.lvl >= HULU_MAX_LVL || companyCash < hUpCost(k)) return;
            huluTickSite(k); // catat produksi sampai detik ini dengan tarif lama
            const pay = hUpCost(k);
            companyCash -= pay; totalExpense += pay; s.lvl++;
            addFinanceLog(`Upgrade ${c.nama} ke Level ${s.lvl}`, -pay);
            updateCashDisplay();
            addLog(`HULU: ${c.nama} di-upgrade ke Level ${s.lvl} (produksi ±${fmtN(hRate(k))} ${c.unit}/hari, tangki ${fmtN(hCap(k))} ${c.unit}).`, 'success');
            huluSyncMarkers(); huluRender();
        }

        // ---------- Pengiriman ke kilang/depo tujuan (bawaan Kilang Tuban) ----------
        const huluShips = k => companyFleet.filter(t => t.kelas === 'kapal' && t.type === HULU_SITES[k].shipType && !busyIds.has(t.id));
        // Ruang kosong & fungsi kredit di kilang/depo tujuan: minyak -> stok mentah (Bbl); gas -> slot LPG Curah (Ton)
        function huluDest(k, did) {
            const ref = huluRefById(did || HULU_HOME) || refineryData[0], tg = huluTargetOf(k, ref.id);
            if (HULU_SITES[k].fuel === 'gas') {
                const slot = ref.kap && ref.kap.lpg_curah;
                return { ref, did: ref.id, room: slot ? Math.max(0, slot.max - slot.cur) : 0, pipeRoom: slot ? Math.max(0, Math.min(slot.max - slot.cur, slot.max * tg - slot.cur)) : 0, label: 'LPG Curah',
                         credit: q => { if (!slot) return { cur: 0, max: 0 }; slot.cur = Math.round((slot.cur + q) * 100) / 100; return { cur: slot.cur, max: slot.max }; } };
            }
            return { ref, did: ref.id, room: Math.max(0, ref.stok_max - ref.stok_current), pipeRoom: Math.max(0, Math.min(ref.stok_max - ref.stok_current, ref.stok_max * tg - ref.stok_current)), label: 'stok mentah',
                     credit: q => { ref.stok_current = Math.round((ref.stok_current + q) * 100) / 100; return { cur: ref.stok_current, max: ref.stok_max }; } };
        }
        // Target stok pipa k -> did (pecahan 0-1): pilihan pemain, atau bawaan (Tuban vs depo cabang).
        function huluTargetOf(k, did) { const m = hulu.pipes && hulu.pipes[k], p = m && m[did]; return p && p.target > 0 ? p.target : huluTargetDefault(k, did); }
        function huluSetTarget(k, did, v) {
            const p = hulu.pipes[k] && hulu.pipes[k][did], t = parseFloat(v);
            if (!p || !HULU_TARGET_CHOICES.some(x => Math.abs(x - t) < 1e-9)) return;
            p.target = t; addLog(`HULU: Target stok ${pipeName(k, did)} diubah ke ${Math.round(t * 100)}% kapasitas tangki tujuan.`, 'info');
            huluRender();
        }
        // Jangkauan kapal ke tujuan r: null = pemain belum punya kapal jenis itu (tak bisa dinilai); {ok, err}. Dinilai dari kapal yang dimiliki (bukan hanya yang menganggur).
        function huluRangeInfo(k, r) {
            const c = HULU_SITES[k], ships = companyFleet.filter(t => t.kelas === 'kapal' && t.type === c.shipType);
            if (!ships.length) return null;
            let err = '';
            for (const t of ships) { const pl = shipPlan(t, c, r); if (!pl.err) return { ok: true }; err = err || pl.err; }
            return { ok: false, err };
        }
        // Tujuan terpilih per anjungan (dipakai kartu pipa & kartu kapal). Tujuan yang sudah tidak sah -> kembali ke Tuban.
        const huluDestSel = {};
        function huluSelDest(k) { const d = huluDestSel[k]; return d && (huluDestList(k).some(r => r.id === d) || huluPipeKeys(k).indexOf(d) >= 0) ? d : HULU_HOME; }   // depo yang terkunci lagi tetap bisa dipilih bila sudah ada pipanya
        function huluSetDest(did) { if (!HULU_SITES[huluSel] || !huluRefById(did)) return; huluDestSel[huluSel] = did; huluRender(); }
        const huluShipCap = (k, kapal) => kapal.cap;   // kapal BBM sudah dalam Bbl, kapal LPG dalam Ton
        function huluPopulateShip() {
            const k = huluSel, sSel = document.getElementById('hulu-ship'), nSel = document.getElementById('hulu-nahkoda'), aSel = document.getElementById('hulu-abk');
            if (!sSel || !nSel || !aSel) return;
            const prev = [sSel.value, nSel.value, aSel.value], unitKap = HULU_SITES[k].fuel === 'gas' ? 'Ton' : 'Bbl';
            sSel.innerHTML = ''; nSel.innerHTML = ''; aSel.innerHTML = '';
            huluShips(k).forEach(t => { const o = document.createElement('option'); o.value = t.id; o.textContent = `${t.id} [${t.plat}]${unitJulukan(t)} - ${t.cap.toLocaleString('id-ID')} ${unitKap} · pangkalan ${shipBaseOf(t).nama}`; sSel.appendChild(o); });
            companyCrew.forEach(c => {
                if (busyIds.has(c.id)) return;
                const o = document.createElement('option'); o.value = c.id;
                o.textContent = `${c.name} (${'★'.repeat(repToStars(c.reputation))} Rep ${Math.round(c.reputation)} - Viol: ${c.violations})`;
                if (c.role === 'Nahkoda') nSel.appendChild(o); else if (c.role === 'ABK') aSel.appendChild(o);
            });
            [sSel, nSel, aSel].forEach((el, i) => { if (prev[i] && el.querySelector(`option[value="${prev[i]}"]`)) el.value = prev[i]; else if (el.options.length) el.selectedIndex = 0; });
            huluUpdateEstimate();
        }
        function huluUpdateEstimate() {
            const el = document.getElementById('hulu-estimate'); if (!el) return;
            const k = huluSel, c = HULU_SITES[k], s = hs(k), dest = huluDest(k, huluSelDest(k)), ref = dest.ref, km = seaKm(c, ref);
            const kapal = companyFleet.find(t => t.id === (document.getElementById('hulu-ship') || {}).value);
            const capU = kapal ? huluShipCap(k, kapal) : 0, load = kapal ? Math.floor(Math.min(capU, s.stok, dest.room)) : 0;
            const plan = kapal ? shipPlan(kapal, c, ref) : null;
            el.innerHTML = `Jarak ke ${esc(ref.nama)}: <b>±${Math.round(km)} km laut</b> &middot; estimasi <b>${fmtJam(km / (kapal ? shipSpeedKmh(kapal) : AVG_SHIP_SPEED_KMH))}</b> sekali jalan.` +
                (plan && !plan.err ? `<br>Pangkalan kapal: <b>${esc(plan.base.nama)}</b>${plan.outKm > 0 ? ` &middot; ke anjungan ±${Math.round(plan.outKm)} km` : ' (sama dengan titik muat)'}${plan.backKm > 0 ? ` &middot; pulang dari tujuan ±${Math.round(plan.backKm)} km` : ''}.` : '') +
                (plan && !plan.err ? `<br>Bahan bakar pangkalan-muat-bongkar-pangkalan: <b class="text-amber-300">${fmtN(plan.needL)} L</b> &middot; ${shipPlanText(plan)} (tangki kini ${fmtN(kapal.fuelL)} L, mesin ${shipCond(kapal)}%).` : (plan ? `<br><span class="text-red-300">${esc(plan.err)}</span>` : '')) +
                (huluTripStorm(kapal, c, ref) ? `<br><span class="text-amber-300">⛈ ${HULU_STORM[hulu.storm.kind].label} di ${huluZoneOf().label} menghalangi rute ini sampai ±${fmtJam(huluStormLeftMs() / 3600000)} game.</span>` : '') +
                (kapal ? `<br>Muatan kali ini: <b class="text-amber-300">${fmtN(load)} ${c.unit}</b> (kapal muat ${fmtN(capU)}, tangki anjungan ${fmtN(s.stok)}, sisa ruang ${dest.label} ${esc(ref.nama)} ${fmtN(dest.room)}).` : '');
        }
        async function huluKirim() {
            if (pphBlokir()) return;
            const k = huluSel, c = HULU_SITES[k], s = hs(k);
            if (!currentAccount || !s.ready) return;
            const did = huluSelDest(k);
            const kapal = companyFleet.find(t => t.id === document.getElementById('hulu-ship').value);
            const nahkoda = companyCrew.find(x => x.id === document.getElementById('hulu-nahkoda').value);
            const abk = companyCrew.find(x => x.id === document.getElementById('hulu-abk').value);
            if (!kapal || !nahkoda || !abk) return showModal('Peringatan', `Lengkapi pilihan Kapal Tanker ${c.shipType}, Nahkoda & ABK! Beli kapal di tab Dealer dan rekrut kru di tab SDM Driver.`, 'fa-circle-exclamation', 'red');
            if (busyIds.has(kapal.id) || busyIds.has(nahkoda.id) || busyIds.has(abk.id)) return showModal('Masih Bertugas', 'Kapal atau kru yang dipilih masih bertugas. Tunggu sampai selesai atau pilih yang lain.', 'fa-ship', 'red');
            if (docBlock(kapal)) return;
            const calc = () => { const d = huluDest(k, did); return Math.floor(Math.min(huluShipCap(k, kapal), s.stok, d.room)); };
            const d0 = huluDest(k, did), ref = d0.ref;
            if (!ref.is_unlocked || !huluAccepts(k, ref)) return showModal('Tujuan Tidak Tersedia', `${ref.nama} belum dibeli atau tidak menerima ${c.jenis}.`, 'fa-circle-info', 'red');
            if (huluTripStorm(kapal, c, ref)) return showModal('Pelayaran Ditunda', `${HULU_STORM[hulu.storm.kind].label} di ${huluZoneOf().label} menghalangi rute ${kapal.id} (pangkalan ${shipBaseOf(kapal).nama} - ${c.nama} - ${ref.nama}). Kapal dilarang berangkat selama ±${fmtJam(huluStormLeftMs() / 3600000)} waktu game lagi. Pipa bawah laut tidak terpengaruh cuaca, dan tujuan di luar zona itu tetap bisa dilayani.`, 'fa-cloud-bolt', 'amber');
            { const p0 = shipPlan(kapal, c, ref);
              if (p0.err) return showModal('Pelayaran Ditolak', p0.err, 'fa-gas-pump', 'red');
              if (companyCash < p0.cost) return showModal('Kas Tidak Cukup', `${kapal.id} butuh ${shipPlanText(p0)} sebelum berlayar, kas Anda ${formatRupiah(companyCash)}.`, 'fa-sack-dollar', 'red'); }
            if (d0.room < c.minLoad) return showModal('Tangki Tujuan Penuh', `Tangki ${d0.label} ${ref.nama} hampir penuh, tidak ada ruang untuk muatan baru.`, 'fa-circle-info', 'blue');
            let amount = calc();
            if (amount < c.minLoad) return showModal('Muatan Kurang', `Stok anjungan baru ${fmtN(s.stok)} ${c.unit}. Minimal ${fmtN(c.minLoad)} ${c.unit} agar kapal berangkat.`, 'fa-circle-info', 'amber');
            if (companyCash - HULU_HPP_RESERVE < Math.round(amount * c.hpp)) return showModal('Kas Tidak Cukup', `HPP ${fmtN(amount)} ${c.unit} ${c.jenis} adalah ${formatRupiah(Math.round(amount * c.hpp))} (dibayar saat muatan tiba di ${ref.nama}). Kas Anda ${formatRupiah(companyCash)}.`, 'fa-sack-dollar', 'red');
            const ok = await showConfirm(`Kirim ${fmtN(amount)} ${c.unit} ${c.jenis} dari ${c.nama} ke ${ref.nama} memakai ${kapal.id} (Nahkoda ${nahkoda.name})? HPP ${formatRupiah(Math.round(amount * c.hpp))} dibayar saat muatan tiba.`,
                { title: 'Kirim Muatan', iconClass: 'fa-ship', theme: 'blue', okLabel: 'Berangkat' });
            if (!ok) return;
            if (busyIds.has(kapal.id) || busyIds.has(nahkoda.id) || busyIds.has(abk.id)) return showModal('Masih Bertugas', 'Kapal atau kru sudah dipakai tugas lain.', 'fa-ship', 'red');
            amount = calc();
            if (amount < c.minLoad) return showModal('Muatan Kurang', `Stok anjungan atau ruang tangki ${ref.nama} berubah, muatan kini terlalu sedikit.`, 'fa-circle-info', 'amber');
            { const p1 = shipPlan(kapal, c, ref);
              if (p1.err || !shipBunker(kapal, p1)) return showModal('Kas Tidak Cukup', p1.err || `${kapal.id} butuh ${shipPlanText(p1)} sebelum berlayar.`, 'fa-sack-dollar', 'red'); }
            s.stok -= amount; s.transit += amount;
            animateHuluTransfer({ site: k, dest: did, truck: kapal, driver: nahkoda, kernet: abk, amount, epoch: huluEpoch });
            addLog(`HULU: ${kapal.id} [Nahkoda: ${nahkoda.name}] berlayar dari ${c.nama} membawa ${fmtN(amount)} ${c.unit} ${c.jenis} ke ${ref.nama}.`, 'purple');
            notify(`${kapal.id} berangkat membawa ${fmtN(amount)} ${c.unit} dari anjungan.`, 'info');
            huluPopulateShip(); huluRefreshUi();
        }
        async function animateHuluTransfer(d) {
            const { truck, driver, kernet, site } = d, c = HULU_SITES[site], ref = huluRefById(d.dest) || refineryData[0];
            const origin = { nama: c.nama, lat: c.lat, lon: c.lon, berth: c.berth };   // tempat muat (dermaga anjungan)
            const base = shipBaseOf(truck);                                              // pangkalan kapal = titik berangkat & pulang
            const ids = [truck.id, driver.id, kernet.id];
            ids.forEach(i => busyIds.add(i));
            populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
            ownAnims++;
            const meta = { id: truck.id, plat: truck.plat, type: truck.type, owner: currentAccount ? currentAccount.company : 'Pemain',
                           depoNama: base.nama, dariNama: origin.nama, tujuanNama: ref.nama, nomorSJ: c.fuel === 'gas' ? 'GAS BUMI' : 'MINYAK MENTAH' };
            const metaBalik = { ...meta, fase: 'kembali', dariNama: ref.nama, tujuanNama: base.nama };
            const fit = ownAnims === 1;
            const release = () => { ids.forEach(x => busyIds.delete(x)); populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard(); huluPopulateShip(); };
            // Kapal berlayar di lajur pelayaran sendiri (07a-rute-laut.js) - TIDAK mengikuti garis pipa (huluPath dipakai khusus pipa).
            // Misi: pangkalan kapal -> dermaga anjungan (muat) -> dermaga kilang/depo tujuan (bongkar) -> pangkalan kapal.
            // Pangkalan = depo ber-dermaga atau anjungan (lihat shipBaseOf di 07b-kapal-dermaga.js); bila sama dengan anjungan ini, ruas pangkalan -> anjungan dilewati.
            let arrived = false;
            try {
                await shipMissionOut(truck, base, origin, meta, fit);  // [ke anjungan] -> [antre] -> muat di anjungan -> lepas sandar
                const leg = await shipSail(truck, origin, ref, meta, fit);
                arrived = true;
                ownAnims = Math.max(0, ownAnims - 1);
                await shipCallAt(truck, ref, UNLOAD_SECONDS_KAPAL, () => completeHuluTransfer(d), {
                    onBerthed: () => {
                        addLog(`SANDAR: Kapal ${truck.id} tiba di ${ref.nama} (±${Math.round(leg.km)} km laut), kru bongkar ${c.jenis} (±${UNLOAD_SECONDS_KAPAL} detik)...`, 'info', 'truck');
                        notify(`${truck.id} sandar di ${ref.nama}, bongkar ${c.jenis}...`, 'info');
                    }
                });
                try {
                    await shipMissionHome(truck, ref, base, metaBalik);
                    addLog(`Kapal ${truck.id} [Nahkoda: ${driver.name}] kembali berlabuh di pangkalan ${base.nama}. BBM ${fmtN(truck.fuelL)} L, mesin ${shipCond(truck)}%.`, 'info', 'truck');
                } catch (e) { /* animasi pulang gagal, tidak mempengaruhi stok yang sudah masuk */ shipAbort(truck); }
                release();
            } catch (err) {
                // Pelayaran gagal di tengah jalan: kembalikan muatan ke tangki anjungan agar tidak hilang.
                shipAbort(truck);
                if (d.epoch === huluEpoch && !d.done) { const s = hs(site); s.transit = Math.max(0, s.transit - d.amount); s.stok += d.amount; }
                if (!arrived) ownAnims = Math.max(0, ownAnims - 1);
                release();
            }
        }
        function completeHuluTransfer(d) {
            const { truck, driver, kernet, amount, site } = d, c = HULU_SITES[site], s = hs(site);
            d.done = true;
            const result = settleCrewResult(driver, kernet);
            if (result.fine) {
                companyCash -= result.fine; totalExpense += result.fine;
                addFinanceLog(`Denda pelanggaran pelayaran kapal ${truck.id} (${c.jenis} ${c.nama})`, -result.fine);
            }
            if (d.epoch !== huluEpoch) { updateCashDisplay(); return; } // progres sudah dimuat ulang: muatan lama sudah dikembalikan
            s.transit = Math.max(0, s.transit - amount);
            const dest = huluDest(site, d.dest), afford = Math.floor(huluHppAfford(site)), masuk = Math.min(amount, dest.room, afford), sisa = amount - masuk, kasKurang = masuk < Math.min(amount, dest.room);
            const hppBayar = Math.round(masuk * c.hpp);
            if (hppBayar > 0) { companyCash -= hppBayar; totalExpense += hppBayar; addFinanceLog(`HPP ${c.jenis} ${c.nama} (${fmtN(masuk)} ${c.unit} via ${truck.id})`, -hppBayar); }
            const now = masuk > 0 ? dest.credit(masuk) : { cur: 0, max: 0 };
            if (sisa > 0) s.stok += sisa; // tangki tujuan keburu penuh: sisa dibawa balik ke anjungan, tidak hilang
            addLog(`HULU: ${fmtN(masuk)} ${c.unit} ${c.jenis} masuk ${dest.ref.nama} (${dest.label}).${masuk > 0 ? ` Stok kini ${fmtN(now.cur)}/${fmtN(now.max)} ${c.unit}.` : ''}${masuk > 0 ? ` HPP ${formatRupiah(hppBayar)} dibayar.` : ''}${sisa > 0 ? (kasKurang ? ` Kas tidak cukup membayar HPP, ${fmtN(sisa)} ${c.unit} dikembalikan ke anjungan.` : ` Tangki penuh, ${fmtN(sisa)} ${c.unit} dikembalikan ke anjungan.`) : ''}`, kasKurang ? 'warning' : 'success');
            notify(`${fmtN(masuk)} ${c.unit} ${c.jenis} masuk ${dest.ref.nama}.`, 'ok');
            updateCashDisplay(); renderRefineries();
        }

        // ---------- Kejadian acak: cuaca buruk (per zona laut) ----------
        // Zona yang relevan = berisi anjungan terbangun atau depo/kilang aktif ber-dermaga (supaya peringatan cuaca selalu ada artinya).
        function huluRelevantZones() {
            const pts = [];
            HULU_KEYS.forEach(k => { if (hs(k).built || huluPipeKeys(k).length) pts.push(HULU_SITES[k]); });
            refineryData.forEach(r => { if (r.is_unlocked && r.berth) pts.push(r); });
            return Object.keys(HULU_ZONES).filter(z => pts.some(q => distKm(q, HULU_ZONES[z]) <= HULU_ZONES[z].r));
        }
        function huluStormTick() {
            const st = hulu.storm, now = gameNow(), rnd = (a, b) => a + Math.random() * (b - a);
            if (st.kind) {
                if (now < st.untilGt) return;
                const lbl = HULU_STORM[st.kind].label, zl = huluZoneOf().label;
                st.kind = ''; st.untilGt = 0; st.nextGt = now + rnd(2, 6) * HULU_DAY;
                addLog(`CUACA: ${lbl} di ${zl} mereda. Pelayaran dan produksi anjungan di zona itu kembali normal.`, 'success');
                notify(`Cuaca ${zl} membaik, kapal boleh berlayar lagi.`, 'ok');
                return;
            }
            if (!st.nextGt) st.nextGt = now + rnd(2, 5) * HULU_DAY;
            if (now < st.nextGt) return;
            // Cuaca buruk hanya relevan kalau pemain sudah punya sesuatu di hulu; kalau belum, tunda saja.
            if (!HULU_KEYS.some(k => hs(k).built || huluPipeKeys(k).length)) { st.nextGt = now + HULU_DAY; return; }
            const zs = huluRelevantZones(); if (!zs.length) { st.nextGt = now + HULU_DAY; return; }
            let pick = Math.random() * zs.reduce((t, z) => t + HULU_ZONES[z].w, 0), zone = zs[zs.length - 1];
            for (const z of zs) { pick -= HULU_ZONES[z].w; if (pick <= 0) { zone = z; break; } }
            st.zone = zone; st.kind = Math.random() < 0.65 ? 'gelombang' : 'badai';
            st.untilGt = now + rnd(4, 10) * 3600000;
            const zl = HULU_ZONES[zone].label;
            if (st.kind === 'badai') {
                addLog(`CUACA: BADAI di ${zl} selama ±${fmtJam((st.untilGt - now) / 3600000)} game. Kapal yang rutenya melewati zona itu dilarang berlayar dan produksi anjungan di zona itu turun 50%. Pipa bawah laut tetap mengalir.`, 'warning');
                notify(`Badai di ${zl}! Kapal di zona itu dilarang berlayar, produksi anjungan di sana turun 50%.`, 'warn');
            } else {
                addLog(`CUACA: Gelombang tinggi di ${zl} selama ±${fmtJam((st.untilGt - now) / 3600000)} game. Kapal yang rutenya melewati zona itu dilarang berlayar. Pipa bawah laut tetap mengalir.`, 'warning');
                notify(`Gelombang tinggi di ${zl}! Kapal di zona itu dilarang berlayar sementara.`, 'warn');
            }
        }

        // ---------- Pipa bawah laut: aliran otomatis, biaya operasional, kebocoran (satu pipa = satu anjungan -> satu kilang/depo tujuan) ----------
        let huluFlowDirty = false, huluLastRefRender = 0, huluLockWarned = {};
        const huluFlowReq = {};   // kodeAnjungan -> [{did, p, cap}] permintaan aliran tick ini; dibagi merata oleh huluFlowShare
        function huluTickPipe(k, did) {
            const p = hulu.pipes[k] && hulu.pipes[k][did], s = hs(k), c = HULU_SITES[k], now = gameNow();
            if (!p || !p.built) return;
            const nama = pipeName(k, did), refNm = (huluRefById(did) || {}).nama || did;
            if (!p.ready) {
                if (now < p.readyGt) return;
                p.ready = true; p.lastGt = p.readyGt; p.opexDueGt = p.readyGt + HULU_WEEK; p.inspectGt = p.readyGt;
                addLog(`HULU: ${nama} selesai dibangun dan mulai mengalirkan ${c.jenis} ke ${refNm} (maks ±${fmtN(pipeCap(k))} ${c.unit}/hari).`, 'success');
                notify(`${nama} selesai dan mulai mengalir!`, 'ok');
            }
            if (now < p.lastGt) { p.lastGt = now; return; }
            const dtDay = (now - p.lastGt) / HULU_DAY;
            // pipa siaga karena depo tujuan terkunci lagi (mis. reset progres): beri tahu pemain sekali, biaya perawatan tetap berjalan
            { const rf = huluRefById(did), lk = k + '|' + did;
              if (rf && !rf.is_unlocked) {
                  if (!huluLockWarned[lk]) {
                      huluLockWarned[lk] = true;
                      addLog(`HULU: ${nama} SIAGA karena ${refNm} belum aktif (terkunci/direset). Aliran berhenti, perawatan ${formatRupiah(pipeOpex(k, did))}/minggu tetap ditagih. Beli kembali ${refNm} di tab Kilang agar pipa mengalir lagi.`, 'warning');
                      notify(`${nama} siaga: ${refNm} belum aktif. Beli ulang depo itu agar pipa mengalir.`, 'warn');
                  }
              } else delete huluLockWarned[lk]; }
            // perbaikan selesai
            if (p.leak && p.repairDoneGt && now >= p.repairDoneGt) {
                p.leak = false; p.repairDoneGt = 0; p.inspectGt = now;
                addLog(`HULU: ${nama} selesai diperbaiki, aliran dilanjutkan.`, 'success');
                notify(`${nama} sudah diperbaiki, mengalir lagi.`, 'ok');
            }
            // biaya operasional/perawatan pipa
            let guard = 0;
            while (now >= p.opexDueGt && guard++ < 5) {
                const opex = pipeOpex(k, did);
                if (companyCash >= opex) {
                    companyCash -= opex; totalExpense += opex;
                    addFinanceLog(`Perawatan ${nama} (1 minggu)`, -opex);
                    p.opexDueGt += HULU_WEEK; updateCashDisplay();
                    if (p.unpaid) { p.unpaid = false; addLog(`HULU: ${nama} mengalir lagi setelah biaya perawatan dilunasi.`, 'success'); notify(`${nama} mengalir lagi.`, 'ok'); }
                } else {
                    if (!p.unpaid) {
                        p.unpaid = true;
                        addLog(`HULU: ${nama} DIHENTIKAN karena kas tidak cukup membayar perawatan ${formatRupiah(opex)}/minggu.`, 'warning');
                        notify(`${nama} berhenti: kas tidak cukup untuk perawatan.`, 'warn');
                    }
                    break;
                }
            }
            if (guard >= 5 && now >= p.opexDueGt) p.opexDueGt = now + 1;
            // kebocoran acak (peluang naik seiring umur sejak inspeksi terakhir)
            if (!p.leak && !p.unpaid && dtDay > 0 && Math.random() < 1 - Math.exp(-pipeLeakRate(k, did) * Math.min(dtDay, 3))) {
                p.leak = true; p.leakGt = now; p.repairDoneGt = 0; p.fineDueGt = now + HULU_DAY; p.leaks++;
                const clean = Math.round(pipeCost(k, did) * HULU_PIPE.cleanPct);
                companyCash -= clean; totalExpense += clean;
                addFinanceLog(`Bersih-bersih tumpahan akibat kebocoran ${nama}`, -clean);
                updateCashDisplay();
                addLog(`KEBOCORAN: ${nama} BOCOR! Aliran otomatis berhenti. Biaya bersih-bersih ${formatRupiah(clean)}. Segera perbaiki di tab Anjungan Hulu; makin lama dibiarkan, denda lingkungan harian berjalan.`, 'warning');
                notify(`${nama} bocor! Aliran berhenti, segera perbaiki.`, 'warn');
                huluSyncPipes();
            }
            // denda lingkungan harian selama bocor dan belum diperbaiki
            if (p.leak && !p.repairDoneGt) {
                let g2 = 0;
                while (now >= p.fineDueGt && g2++ < 5) {
                    const fine = Math.round(pipeCost(k, did) * HULU_PIPE.finePct);
                    if (companyCash < fine) break;
                    companyCash -= fine; totalExpense += fine;
                    addFinanceLog(`Denda lingkungan kebocoran ${nama} (1 hari)`, -fine);
                    p.fineDueGt += HULU_DAY; updateCashDisplay();
                    addLog(`DENDA: kebocoran ${nama} belum diperbaiki, denda lingkungan ${formatRupiah(fine)}.`, 'warning');
                }
                if (g2 >= 5 && now >= p.fineDueGt) p.fineDueGt = now + 1;
            }
            // aliran: hanya dicatat sebagai permintaan; pembagian stok antar pipa satu anjungan dilakukan huluFlowShare (hanya bila depo tujuan aktif)
            if (!p.leak && !p.unpaid && s.ready && s.stok > 0 && huluRefById(did) && huluRefById(did).is_unlocked) (huluFlowReq[k] || (huluFlowReq[k] = [])).push({ did, p, cap: pipeCap(k) * dtDay });
            p.lastGt = now;
        }
        // Pembagian stok anjungan antar pipa paralel (max-min fairness): tiap pipa meminta min(kapasitas alir, ruang sampai target tujuan);
        // bila stok/kas tidak cukup untuk semua, jatah dibagi MERATA, dan pipa yang permintaannya kecil tidak menyisakan jatah terbuang.
        // Ruang tujuan dihitung ulang saat memberi, jadi dua pipa ke depo yang sama (atau dari dua anjungan) tidak melampaui target.
        function huluFlowShare(k) {
            const reqs = huluFlowReq[k], s = hs(k); if (!reqs || !reqs.length) return;
            let left = Math.min(s.stok, huluHppAfford(k)); if (left <= 0.01) return;
            reqs.forEach(r => { r.want = Math.min(r.cap, huluDest(k, r.did).pipeRoom); r.give = 0; });
            let pend = reqs.filter(r => r.want > 0.01).sort((a, b) => a.want - b.want);
            while (pend.length && left > 0.01) {
                const share = left / pend.length, r = pend[0];
                if (r.want <= share) { r.give = r.want; left -= r.want; pend.shift(); }
                else { pend.forEach(x => { x.give = share; }); left = 0; pend = []; }
            }
            reqs.forEach(r => {
                const d = huluDest(k, r.did), q = Math.min(r.give, d.pipeRoom, s.stok);
                if (q > 0.01) { s.stok -= q; d.credit(q); r.p.flowed += q; huluFlowDirty = true; huluHppPipe(k, q); }
            });
        }
        // Kartu depo di tab Kilang: daftar pipa anjungan yang memasok kilang/depo ini (status, target, total dialirkan).
        function huluSupplyHtml(kilang) {
            const rows = [];
            HULU_KEYS.forEach(k => huluPipeKeys(k).forEach(d => {
                if (d !== kilang.id || !hp(k, d).built) return;
                const i = huluPipeInfo(k, d), c = HULU_SITES[k], p = hp(k, d);
                rows.push(`<div class="flex items-center gap-1.5"><span class="inline-block w-1.5 h-1.5 rounded-full shrink-0" style="background:${i.color}"></span><span class="min-w-0"><b class="text-gray-200">${esc(c.nama)}</b> &middot; <span style="color:${i.color}">${esc(i.label)}</span>${p.ready ? ` &middot; target ${Math.round(huluTargetOf(k, d) * 100)}% &middot; total ${fmtN(p.flowed)} ${c.unit}` : ''}</span></div>`);
            }));
            if (!rows.length) return '';
            return `<div class="pt-1 border-t border-gray-800 space-y-0.5 text-[10px] text-gray-400"><div><i class="fa-solid fa-grip-lines mr-1 text-sky-400"></i>Dipasok pipa dari anjungan:</div>${rows.join('')}</div>`;
        }
        // Status pipa. 'key' dipakai penanda perubahan besar (bangun ulang tampilan); 'label' boleh berubah-ubah.
        function huluPipeInfo(k, did) {
            const p = hp(k, did), s = hs(k), ref = huluRefById(did), nm = ref ? ref.nama : did;
            if (!p.built) return { key: 'n', label: 'Belum dibangun', color: '#64748b' };
            if (!p.ready) return { key: 'b', label: 'Sedang dibangun', color: '#f59e0b' };
            if (p.leak) return p.repairDoneGt ? { key: 'x', label: 'Sedang diperbaiki', color: '#f59e0b' } : { key: 'l', label: 'BOCOR - aliran berhenti', color: '#ef4444' };
            if (p.unpaid) return { key: 'u', label: 'Berhenti (kas kurang)', color: '#ef4444' };
            if (ref && !ref.is_unlocked) return { key: 'd', label: 'Siaga (' + nm + ' belum aktif, beli ulang agar mengalir)', color: '#64748b' };
            const room = s.ready ? huluDest(k, did).pipeRoom : 0;
            if (s.stok > 0.5 && room > 0.5) return { key: 'r', label: 'Mengalir ke ' + nm, color: '#14b8a6' };
            return { key: 'r', label: room <= 0.5 ? 'Siaga (stok ' + nm + ' sudah capai target ' + Math.round(huluTargetOf(k, did) * 100) + '%)' : 'Siaga (tangki anjungan kosong)', color: '#64748b' };
        }
        // Garis pipa di peta (merah putus-putus saat bocor + ikon tetesan di tengah pipa). Kunci = kodeAnjungan|idTujuan
        const huluPipeLines = {}, huluPipeLeakMk = {}; let huluPipeSig = {};
        function huluSyncPipes() {
            if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
            const live = {};
            HULU_KEYS.forEach(k => huluPipeKeys(k).forEach(d => { live[k + '|' + d] = [k, d]; }));
            [huluPipeLines, huluPipeLeakMk].forEach(o => Object.keys(o).forEach(pk => { if (!live[pk] && o[pk]) { map.removeLayer(o[pk]); o[pk] = null; } }));
            Object.keys(huluPipeSig).forEach(pk => { if (!live[pk]) delete huluPipeSig[pk]; });
            Object.keys(live).forEach(pk => {
                const k = live[pk][0], did = live[pk][1], c = HULU_SITES[k], info = huluPipeInfo(k, did), sig = info.key;
                if (huluPipeSig[pk] === sig && huluPipeLines[pk]) return;
                if (huluPipeLines[pk]) { map.removeLayer(huluPipeLines[pk]); huluPipeLines[pk] = null; }
                if (huluPipeLeakMk[pk]) { map.removeLayer(huluPipeLeakMk[pk]); huluPipeLeakMk[pk] = null; }
                huluPipeSig[pk] = sig;
                const col = info.key === 'l' ? '#ef4444' : info.key === 'x' || info.key === 'b' ? '#f59e0b' : info.key === 'u' ? '#94a3b8' : (c.fuel === 'gas' ? '#fb923c' : '#2dd4bf');
                huluPipeLines[pk] = L.polyline(huluPath(k, did), { color: col, weight: 3, opacity: 0.9, dashArray: info.key === 'r' ? null : '6 6' }).addTo(map);
                huluPipeLines[pk].bindTooltip(`${pipeName(k, did)} - ${info.label}`, { sticky: true });
                if (info.key === 'l' || info.key === 'x') {
                    huluPipeLeakMk[pk] = L.marker(huluPathMid(k, did), {
                        icon: L.divIcon({ className: '', iconSize: [24, 24], iconAnchor: [12, 12],
                            html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.5)"><i class="fa-solid fa-droplet"></i></div>` }),
                        zIndexOffset: 650 }).addTo(map);
                    huluPipeLeakMk[pk].bindTooltip('Titik kebocoran pipa', { sticky: true });
                }
            });
        }

        // ---------- Bangun, inspeksi & perbaiki pipa ----------
        async function huluPipeBuild(k, did) {
            if (pphBlokir()) return;
            const c = HULU_SITES[k], ref = huluRefById(did), p = hp(k, did);
            if (!currentAccount || !c || !ref || !hs(k).ready || p.built) return;
            if (!ref.is_unlocked || !huluAccepts(k, ref)) return showModal('Tujuan Tidak Tersedia', `${ref.nama} belum dibeli, tidak punya dermaga, atau tidak menerima ${c.jenis}.`, 'fa-circle-info', 'red');
            if (pipeTooFar(k, did)) return showModal('Pipa Terlalu Jauh', `Jalur ${c.nama} ke ${ref.nama} ±${Math.round(pipeKm(k, did))} km, melebihi batas pipa bawah laut ${fmtN(HULU_PIPE.maxKm)} km. Untuk tujuan sejauh itu gunakan kapal tanker.`, 'fa-ruler-horizontal', 'amber');
            const cost = pipeCost(k, did), hrs = pipeHours(k, did);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(cost)} untuk membangun pipa bawah laut dari ${c.nama} ke ${ref.nama}.`, 'fa-triangle-exclamation', 'red');
            const ok = await showConfirm(`Bangun pipa bawah laut ±${Math.round(pipeKm(k, did))} km dari ${c.nama} ke ${ref.nama} seharga ${formatRupiah(cost)}? Pembangunan ${hrs} jam waktu game. Setelah jadi, ${c.jenis} mengalir otomatis (maks ${fmtN(pipeCap(k))} ${c.unit}/hari) tanpa kapal & kru, kebal cuaca buruk, dengan perawatan ${formatRupiah(pipeOpex(k, did))}/minggu. Risiko: pipa bisa bocor secara acak.`,
                { title: 'Bangun Pipa Bawah Laut', iconClass: 'fa-grip-lines', theme: 'blue', okLabel: 'Bangun' });
            if (!ok || hp(k, did).built || !hs(k).ready || !ref.is_unlocked || companyCash < cost) return;
            companyCash -= cost; totalExpense += cost;
            addFinanceLog(`Pembangunan ${pipeName(k, did).toLowerCase()}`, -cost);
            if (!hulu.pipes[k]) hulu.pipes[k] = {};
            hulu.pipes[k][did] = Object.assign(huluPipeDefault(), { built: true, readyGt: gameNow() + hrs * 3600000 });
            updateCashDisplay();
            addLog(`HULU: Pembangunan ${pipeName(k, did)} dimulai (estimasi ${hrs} jam game).`, 'info');
            huluSyncPipes(); huluRender(); renderRefineries();
        }
        async function huluPipeInspect(k, did) {
            const c = HULU_SITES[k], p = hp(k, did);
            if (!currentAccount || !p.ready || p.leak) return;
            const cost = pipeInspectCost(k, did);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Inspeksi pipa butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            const ok = await showConfirm(`Inspeksi & perawatan menyeluruh ${pipeName(k, did)} seharga ${formatRupiah(cost)}? Risiko bocor kembali ke ${(HULU_PIPE.leakBase * 100).toFixed(1).replace('.', ',')}%/hari (sekarang ${(pipeLeakRate(k, did) * 100).toFixed(1).replace('.', ',')}%/hari).`,
                { title: 'Inspeksi Pipa', iconClass: 'fa-magnifying-glass', theme: 'blue', okLabel: 'Inspeksi' });
            const p2 = hp(k, did);
            if (!ok || !p2.ready || p2.leak || companyCash < cost) return;
            companyCash -= cost; totalExpense += cost; p2.inspectGt = gameNow();
            addFinanceLog(`Inspeksi ${pipeName(k, did).toLowerCase()}`, -cost); updateCashDisplay();
            addLog(`HULU: Inspeksi ${pipeName(k, did)} selesai, risiko kebocoran kembali ke level dasar.`, 'success');
            huluRefreshUi();
        }
        async function huluPipeRepair(k, did) {
            const c = HULU_SITES[k], p = hp(k, did);
            if (!currentAccount || !p.ready || !p.leak || p.repairDoneGt) return;
            const cost = pipeRepairCost(k, did);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Perbaikan pipa butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            const ok = await showConfirm(`Perbaiki kebocoran ${pipeName(k, did)} seharga ${formatRupiah(cost)}? Perbaikan memakan ${HULU_PIPE.repairHours} jam waktu game; denda lingkungan berhenti begitu perbaikan dimulai.`,
                { title: 'Perbaiki Pipa', iconClass: 'fa-screwdriver-wrench', theme: 'blue', okLabel: 'Perbaiki' });
            const p2 = hp(k, did);
            if (!ok || !p2.leak || p2.repairDoneGt || companyCash < cost) return;
            companyCash -= cost; totalExpense += cost; p2.repairDoneGt = gameNow() + HULU_PIPE.repairHours * 3600000;
            addFinanceLog(`Perbaikan kebocoran ${pipeName(k, did).toLowerCase()}`, -cost); updateCashDisplay();
            addLog(`HULU: Perbaikan ${pipeName(k, did)} dimulai (±${HULU_PIPE.repairHours} jam game).`, 'info');
            huluSyncPipes(); huluRender();
        }

        // ---------- Tampilan tab "Anjungan Hulu" ----------
        // Status cuaca Laut Madura tampil di PETA: badge kecil (kanan atas) + lingkaran warna di atas area terdampak saat cuaca buruk.
        let huluWeatherCtl = null, huluWeatherEl = null, huluWeatherCircle = null, huluWeatherHtmlLast = '', huluWeatherKindLast = null;
        function huluWeatherHtml() {
            const st = hulu.storm;
            if (!st.kind) return `<div style="font-weight:700;color:#34d399"><i class="fa-solid fa-sun" style="margin-right:6px"></i>Cuaca laut: cerah</div><div style="opacity:.75">Semua zona, kapal boleh berlayar</div>`;
            const w = HULU_STORM[st.kind], z = huluZoneOf();
            return `<div style="font-weight:700;color:${w.color}"><i class="fa-solid fa-cloud-bolt" style="margin-right:6px"></i>${w.label} di ${z.label}</div>
                <div>Reda ±${fmtJam(huluStormLeftMs() / 3600000)} game</div>
                <div style="opacity:.75">Kapal yang rutenya melewati zona ini dilarang berlayar${st.kind === 'badai' ? ' &middot; produksi anjungan di zona ini -50%' : ''}. Pipa aman, wilayah lain normal.</div>`;
        }
        function huluSyncWeather() {
            if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
            if (!huluWeatherCtl) {
                huluWeatherCtl = L.control({ position: 'topright' });
                huluWeatherCtl.onAdd = () => {
                    huluWeatherEl = L.DomUtil.create('div', '');
                    huluWeatherEl.style.cssText = 'background:rgba(17,24,39,.92);color:#e5e7eb;border:1px solid #374151;border-radius:10px;padding:6px 9px;font:11px/1.35 system-ui,sans-serif;max-width:190px;box-shadow:0 2px 8px rgba(0,0,0,.4)';
                    L.DomEvent.disableClickPropagation(huluWeatherEl);
                    return huluWeatherEl;
                };
                huluWeatherCtl.addTo(map);
            }
            const html = huluWeatherHtml();
            if (huluWeatherEl && html !== huluWeatherHtmlLast) { huluWeatherEl.innerHTML = html; huluWeatherHtmlLast = html; }
            const kind = hulu.storm.kind, kz = kind ? kind + '|' + hulu.storm.zone : '';
            if (kz !== huluWeatherKindLast) {
                huluWeatherKindLast = kz;
                if (huluWeatherCircle) { map.removeLayer(huluWeatherCircle); huluWeatherCircle = null; }
                if (kind) huluWeatherCircle = L.circle([huluZoneOf().lat, huluZoneOf().lon], { radius: huluZoneOf().r * 1000, color: HULU_STORM[kind].color, weight: 2, opacity: 1, fillColor: HULU_STORM[kind].color, fillOpacity: 0.38, interactive: false }).addTo(map);
            }
        }
        function huluPipeHtml(k, did) {
            const c = HULU_SITES[k], s = hs(k), p = hp(k, did), ref = huluRefById(did);
            if (!s.ready || !ref) return '';
            const nm = esc(ref.nama);
            const chip = (l, v, cls, id) => `<div class="stat-chip"><div class="stat-chip-label">${l}</div><div ${id ? `id="${id}"` : ''} class="stat-chip-value ${cls}">${v}</div></div>`;
            const head = `<h3 class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center"><i class="fa-solid fa-grip-lines mr-2"></i> Pipa Bawah Laut ke ${nm}</h3>`;
            let body;
            if (!p.built) {
                body = `<p class="text-[11px] text-gray-400 mb-2.5">Mengalirkan ${c.jenis} otomatis dari tangki anjungan ke ${nm} tanpa kapal & kru, dan tidak terganggu cuaca buruk. Satu anjungan bisa punya pipa ke beberapa tujuan sekaligus (maks ${fmtN(HULU_PIPE.maxKm)} km per pipa). Risikonya: pipa bisa bocor acak dan harus diperbaiki.</p>
                    <div class="grid grid-cols-2 gap-2 text-[10px] mb-3">${chip('Panjang', '±' + Math.round(pipeKm(k, did)) + ' km', 'text-sky-400')}${chip('Biaya Bangun', formatRupiah(pipeCost(k, did)), 'text-amber-400')}
                        ${chip('Waktu Bangun', pipeHours(k, did) + ' jam game', 'text-sky-400')}${chip('Kapasitas Alir', fmtN(pipeCap(k)) + ' ' + c.unit + '/hari', 'text-emerald-400')}
                        ${chip('Perawatan', formatRupiah(pipeOpex(k, did)) + '/minggu', 'text-red-400')}${chip('Risiko Bocor Dasar', (HULU_PIPE.leakBase * 100).toFixed(1).replace('.', ',') + '%/hari', 'text-orange-400')}</div>
                    <div class="text-[9px] text-gray-500 mb-2">Target stok bawaan pipa ini: ${Math.round(huluTargetDefault(k, did) * 100)}% kapasitas tangki ${nm} (bisa diubah setelah pipa jadi).</div>
                    ${pipeTooFar(k, did)
                        ? `<div class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2"><i class="fa-solid fa-ruler-horizontal mr-1.5"></i>Terlalu jauh untuk pipa (±${Math.round(pipeKm(k, did))} km, batas ${fmtN(HULU_PIPE.maxKm)} km). Kirim lewat kapal tanker.</div>`
                        : `<button onclick="huluPipeBuild('${k}','${did}')" class="w-full bg-sky-700 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl text-xs transition"><i class="fa-solid fa-hammer mr-1.5"></i>Bangun Pipa ke ${nm}</button>`}`;
            } else if (!p.ready) {
                body = `<div class="text-[11px] text-gray-300 mb-1.5">Pemasangan pipa berlangsung...</div><div id="pipe-build-bar">${huluBar(0, 'bg-amber-500')}</div><div id="pipe-build-left" class="text-[10px] text-gray-400 mt-1.5"></div>`;
            } else {
                let act;
                if (p.leak && !p.repairDoneGt) act = `<button onclick="huluPipeRepair('${k}','${did}')" class="w-full mt-3 bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-screwdriver-wrench mr-1.5"></i>Perbaiki Pipa (${formatRupiah(pipeRepairCost(k, did))})</button>
                    <div class="text-[9px] text-red-300 mt-1">Aliran berhenti. Denda lingkungan ${formatRupiah(Math.round(pipeCost(k, did) * HULU_PIPE.finePct))}/hari berjalan sampai perbaikan dimulai.</div>`;
                else if (p.leak) act = `<div id="pipe-repair-left" class="text-[10px] text-amber-300 mt-3"></div>`;
                else act = `<button onclick="huluPipeInspect('${k}','${did}')" class="w-full mt-3 bg-sky-800 hover:bg-sky-700 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-magnifying-glass mr-1.5"></i>Inspeksi Pipa (${formatRupiah(pipeInspectCost(k, did))})</button>
                    <div class="text-[9px] text-gray-500 mt-1">Inspeksi mengembalikan risiko bocor ke level dasar. Makin lama tidak diinspeksi, makin besar risikonya.</div>`;
                const lockNote = ref.is_unlocked ? '' : `<div class="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-2"><i class="fa-solid fa-lock mr-1.5"></i><b>${nm} belum aktif</b> (terkunci lagi, misalnya setelah reset progres). Pipa siaga: ${c.jenis} tidak mengalir, tetapi perawatan ${formatRupiah(pipeOpex(k, did))}/minggu tetap ditagih. Beli kembali ${nm} di tab Kilang agar pipa mengalir lagi.</div>`;
                const tg = huluTargetOf(k, did), tgSel = `<div class="flex items-center gap-2 text-[10px] text-gray-400 mt-2"><span class="shrink-0">Target stok tujuan:</span><select onchange="huluSetTarget('${k}','${did}',this.value)" class="flex-1 bg-gray-900 border border-gray-800 rounded p-1 text-gray-200 font-semibold">${HULU_TARGET_CHOICES.map(x => `<option value="${x}"${Math.abs(x - tg) < 1e-9 ? ' selected' : ''}>${Math.round(x * 100)}%${Math.abs(x - huluTargetDefault(k, did)) < 1e-9 ? ' (bawaan)' : ''}</option>`).join('')}</select></div>
                    <div class="text-[9px] text-gray-500 mt-1">Pipa berhenti mengalir begitu stok ${nm} mencapai target ini (kapal tetap bisa mengisi sampai penuh). Naikkan untuk depo yang tangkinya kecil dan cepat terkuras.</div>`;
                body = `${lockNote}<div class="flex items-center gap-2 text-[11px] mb-2"><span id="pipe-status" class="font-bold text-gray-200"></span></div>
                    <div class="grid grid-cols-2 gap-2 text-[10px]">${chip('Kapasitas Alir', fmtN(pipeCap(k)) + ' ' + c.unit + '/hari', 'text-emerald-400')}${chip('Perawatan', formatRupiah(pipeOpex(k, did)) + '/minggu', 'text-red-400')}
                        ${chip('Total Dialirkan', '', 'text-sky-400', 'pipe-flowed')}${chip('Tagihan Berikut', '', 'text-amber-400', 'pipe-due')}
                        ${chip('Risiko Bocor', '', 'text-orange-400', 'pipe-risk')}${chip('Jumlah Kebocoran', '', 'text-gray-300', 'pipe-leaks')}</div>${tgSel}${act}`;
            }
            return `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-sky-500">${head}${body}</div>`;
        }
        function huluRefreshPipeUi(k, did) {
            const p = hp(k, did), c = HULU_SITES[k], set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
            if (p.built && !p.ready) {
                const left = Math.max(0, p.readyGt - gameNow()), total = pipeHours(k, did) * 3600000;
                set('pipe-build-bar', huluBar((1 - left / total) * 100, 'bg-amber-500'));
                set('pipe-build-left', `Sisa ±${fmtJam(left / 3600000)} waktu game`);
            } else if (p.ready) {
                const i = huluPipeInfo(k, did);
                set('pipe-status', `<span class="inline-block w-2 h-2 rounded-full mr-1.5" style="background:${i.color}"></span>${i.label}`);
                set('pipe-flowed', `${fmtN(p.flowed)} ${c.unit}`);
                set('pipe-due', dShort(p.opexDueGt));
                set('pipe-risk', p.leak ? '-' : (pipeLeakRate(k, did) * 100).toFixed(1).replace('.', ',') + '%/hari');
                set('pipe-leaks', String(p.leaks) + 'x');
                if (p.leak && p.repairDoneGt) set('pipe-repair-left', `<i class="fa-solid fa-screwdriver-wrench mr-1"></i>Perbaikan berlangsung, sisa ±${fmtJam(Math.max(0, p.repairDoneGt - gameNow()) / 3600000)} waktu game`);
            }
        }
        // Kartu "Tujuan": pilih kilang/depo tujuan (dipakai kartu pipa & kartu kapal) + daftar pipa yang sudah dibangun dari anjungan ini.
        function huluPipeListItem(k, d) {
            const i = huluPipeInfo(k, d), r = huluRefById(d);
            return `<span class="inline-block w-1.5 h-1.5 rounded-full shrink-0" style="background:${i.color}"></span><span class="truncate"><b class="text-gray-200">${esc(r ? r.nama : d)}</b> &middot; ${i.label}</span>`;
        }
        function huluDestHtml(k) {
            const c = HULU_SITES[k], cur = huluSelDest(k), list = huluDestList(k), has = huluPipeKeys(k);
            const all = list.concat(has.filter(d => !list.some(r => r.id === d)).map(huluRefById).filter(Boolean));   // + depo terkunci lagi yang masih punya pipa
            const opts = all.map(r => {
                const km = Math.round(seaKm(c, r)), rg = r.is_unlocked ? huluRangeInfo(k, r) : null, tags = [];
                if (has.indexOf(r.id) >= 0) tags.push('ada pipa');
                if (!r.is_unlocked) tags.push('terkunci');
                if (rg && !rg.ok) tags.push('⛔ di luar jangkauan kapal');
                if (has.indexOf(r.id) < 0 && km > HULU_PIPE.maxKm) tags.push('pipa terlalu jauh');
                return `<option value="${r.id}"${r.id === cur ? ' selected' : ''}>${esc(r.nama)} (±${fmtN(km)} km${tags.length ? ', ' + tags.join(', ') : ''})</option>`;
            }).join('');
            const pipes = has.map(d => `<button id="pl-${d}" onclick="huluSetDest('${d}')" class="w-full text-left flex items-center gap-1.5 text-[10px] text-gray-400 rounded-lg border px-2 py-1 transition ${d === cur ? 'border-sky-500 bg-sky-500/10' : 'border-gray-800 hover:border-gray-600'}">${huluPipeListItem(k, d)}</button>`).join('');
            const sel = 'w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-gray-200 font-semibold text-xs';
            const noShip = !companyFleet.some(t => t.kelas === 'kapal' && t.type === c.shipType);
            return `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-sky-500">
                <h3 class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center"><i class="fa-solid fa-location-dot mr-2"></i> Tujuan Pipa &amp; Pengiriman</h3>
                <select id="hulu-dest" onchange="huluSetDest(this.value)" class="${sel}">${opts}</select>
                <div class="text-[9px] text-gray-500 mt-1.5">Tujuan: kilang/depo yang sudah dibeli, punya dermaga, dan menerima ${c.jenis}. Pilihan ini berlaku untuk kartu pipa dan kartu kapal di bawah. Satu anjungan boleh punya pipa ke banyak tujuan.
                    <b class="text-gray-400">⛔ di luar jangkauan kapal</b> = pelayaran pergi-pulang melebihi tangki semua kapal ${c.shipType} Anda (pipa tetap bisa jika &le; ${fmtN(HULU_PIPE.maxKm)} km).${noShip ? ' Anda belum punya kapal ' + c.shipType + ', jadi jangkauan belum bisa dinilai.' : ''}</div>
                ${pipes ? `<div class="space-y-1 mt-2"><div class="text-[10px] font-bold text-gray-400">Pipa terpasang (${has.length})</div>${pipes}</div>` : ''}</div>`;
        }
        let huluUiSig = '';
        const huluBar = (pct, cls) => `<div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden"><div class="${cls} h-full transition-all" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;
        const huluSigNow = () => huluSel + '|' + huluSelDest(huluSel) + '|' + huluDestList(huluSel).length + '|' + HULU_KEYS.map(k => huluStatusInfo(k).key + hs(k).lvl + huluPipeKeys(k).map(d => d + huluPipeInfo(k, d).key).join('')).join(',') + '|' + (hulu.storm.kind ? hulu.storm.kind + hulu.storm.zone : '-') + '|' + huluView + tenderSig();
        function huluRender() {
            const root = document.getElementById('hulu-root'); if (!root) return;
            if (huluView === 'tender') { root.innerHTML = `<div class="space-y-4">${huluTabsHtml()}${tenderHtml()}</div>`; huluUiSig = huluSigNow(); tenderRefresh(); return; }
            const k = huluSel, c = HULU_SITES[k], s = hs(k), st = huluStatusInfo(k), did = huluSelDest(k), ref = huluRefById(did) || refineryData[0];
            const cards = HULU_KEYS.map(x => {
                const cx = HULU_SITES[x], sx = huluStatusInfo(x), on = x === k;
                return `<button onclick="huluPick('${x}')" class="text-left rounded-xl border p-2 transition ${on ? 'border-teal-500 bg-teal-500/10' : 'border-gray-800 bg-gray-950 hover:border-gray-600'}">
                    <div class="flex items-center gap-1.5 text-[11px] font-bold text-gray-200"><i class="fa-solid ${cx.icon} text-${cx.tone}-400"></i><span class="truncate">${cx.short || ((cx.fuel === 'gas' ? 'Gas' : 'Minyak') + ' ' + x.charAt(0).toUpperCase() + x.slice(1))}${hs(x).lvl ? ' · Lv' + hs(x).lvl : ''}</span></div>
                    <div class="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5"><span class="inline-block w-1.5 h-1.5 rounded-full" style="background:${sx.color}"></span>${sx.label}</div></button>`;
            }).join('');
            const chip = (l, v, cls, id) => `<div class="stat-chip"><div class="stat-chip-label">${l}</div><div ${id ? `id="${id}"` : ''} class="stat-chip-value ${cls}">${v}</div></div>`;
            let body = '';
            if (!s.built) {
                body = `<div class="grid grid-cols-2 gap-2 text-[10px] mb-3">${chip('Biaya Bangun', formatRupiah(c.buildCost), 'text-amber-400')}${chip('Waktu Bangun', c.buildHours + ' jam game', 'text-sky-400')}
                        ${chip('Produksi', fmtN(c.rate) + ' ' + c.unit + '/hari', 'text-emerald-400')}${chip('Operasional', formatRupiah(c.opexWeek) + '/minggu', 'text-red-400')}</div>
                    <button onclick="huluBuild('${k}')" class="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 rounded-xl text-xs transition"><i class="fa-solid fa-hammer mr-1.5"></i>Bangun Anjungan</button>
                    <div class="text-[9px] text-gray-500 mt-2"><i class="fa-solid fa-circle-info mr-1"></i>1 hari game = 2 jam nyata, 1 minggu game = ±14 jam nyata (operasional ditagih tiap minggu game). ${c.fuel === 'gas' ? `Gas diangkut kapal Tanker LPG dan masuk sebagai LPG Curah kilang/depo tujuan (harga pasar kini ${formatRupiah(lpgCurahPrice())}/Ton, HPP anjungan ${formatRupiah(c.hpp)}/Ton = hemat ${Math.round((1 - c.hpp / lpgCurahPrice()) * 100)}%).` : `Biaya pokok minyak sendiri (HPP ${formatRupiah(c.hpp)}/Bbl) jauh di bawah harga pasar kini (${formatRupiah(bblPrice())}/Bbl, hemat ${Math.round((1 - c.hpp / bblPrice()) * 100)}%), tapi modalnya besar dan butuh kapal tanker.`}</div>`;
            } else if (!s.ready) {
                body = `<div class="text-[11px] text-gray-300 mb-1.5">Pembangunan berlangsung...</div><div id="hulu-build-bar">${huluBar(0, 'bg-amber-500')}</div><div id="hulu-build-left" class="text-[10px] text-gray-400 mt-1.5"></div>`;
            } else {
                const up = s.lvl >= HULU_MAX_LVL
                    ? `<div class="text-[10px] text-emerald-300 mt-3"><i class="fa-solid fa-circle-check mr-1"></i>Upgrade sudah level maksimum (Lv ${HULU_MAX_LVL}).</div>`
                    : `<button onclick="huluUpgrade('${k}')" class="w-full mt-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs transition"><i class="fa-solid fa-arrow-up-right-dots mr-1.5"></i>Upgrade ke Lv ${s.lvl + 1} (${formatRupiah(hUpCost(k))})</button>
                       <div class="text-[9px] text-gray-500 mt-1">Tiap level: produksi &amp; tangki +${Math.round(HULU_UP.rate * 100)}%, operasional +${Math.round(HULU_UP.opex * 100)}% dari nilai dasar.</div>`;
                body = `<div class="flex justify-between text-[11px] mb-1"><span class="text-gray-400">Tangki penampung anjungan</span><b id="hulu-stok-txt" class="text-gray-200 font-mono"></b></div>
                    <div id="hulu-stok-bar">${huluBar(0, 'bg-teal-500')}</div>
                    <div class="grid grid-cols-2 gap-2 text-[10px] mt-3">${chip('Produksi', fmtN(hRate(k)) + ' ' + c.unit + '/hari', 'text-emerald-400')}${chip('Operasional', formatRupiah(hOpex(k)) + '/minggu', 'text-red-400')}${chip('HPP', formatRupiah(c.hpp) + '/' + c.unit, 'text-amber-400')}
                        ${chip('Total Diproduksi', '', 'text-sky-400', 'hulu-produced')}${chip('Tagihan Berikut', '', 'text-amber-400', 'hulu-due')}</div>${up}`;
            }
            let ship = '';
            if (s.ready) {
                const sel = 'w-full bg-gray-900 border border-gray-800 rounded p-1.5 text-gray-200 font-semibold';
                ship = `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-cyan-500">
                    <h3 class="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center"><i class="fa-solid fa-ship mr-2"></i> Angkut ke ${esc(ref.nama)}</h3>
                    <div class="space-y-2 text-xs">
                        <div><label class="text-gray-400 block mb-1">Kapal Tanker ${c.shipType}:</label><select id="hulu-ship" onchange="huluUpdateEstimate()" class="${sel}"></select></div>
                        <div><label class="text-gray-400 block mb-1">Nahkoda:</label><select id="hulu-nahkoda" class="${sel}"></select></div>
                        <div><label class="text-gray-400 block mb-1">ABK:</label><select id="hulu-abk" class="${sel}"></select></div>
                        <div id="hulu-estimate" class="text-[10px] text-cyan-300/80 leading-snug"></div>
                        <button onclick="huluKirim()" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs transition"><i class="fa-solid fa-ship mr-1.5"></i>Kirim ke ${esc(ref.nama)}</button>
                        <div id="hulu-ship-empty" class="text-[10px] text-amber-300 hidden"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Belum ada Kapal Tanker ${c.shipType} yang menganggur. Beli di tab Dealer dan rekrut Nahkoda &amp; ABK di tab SDM Driver.</div>
                    </div></div>`;
            }
            root.innerHTML = `<div class="space-y-4">
                ${huluTabsHtml()}<div class="grid grid-cols-3 gap-2">${cards}</div>
                <div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-t-2 border-t-${c.tone}-500">
                    <h3 class="text-xs font-bold text-${c.tone}-400 uppercase tracking-wider mb-1 flex items-center"><i class="fa-solid ${c.icon} mr-2"></i> ${esc(c.nama)}</h3>
                    <p class="text-[11px] text-gray-400 mb-2.5">${c.fuel === 'gas' ? 'Anjungan gas bumi lepas pantai. Hasilnya diangkut Kapal Tanker LPG atau dialirkan lewat pipa, dan masuk sebagai LPG Curah di kilang/depo tujuan.' : 'Anjungan minyak lepas pantai. Hasilnya diangkut Kapal Tanker BBM atau dialirkan lewat pipa, dan masuk ke stok minyak mentah kilang/depo tujuan.'} Tujuan bisa Kilang Tuban atau depo lain yang punya dermaga. Ini tambahan: tombol beli di tab Kilang tetap bisa dipakai.</p>
                    <div class="flex items-center gap-2 text-[11px] mb-2"><span class="inline-block w-2 h-2 rounded-full" style="background:${st.color}"></span><span class="font-bold text-gray-200" id="hulu-status">${st.label}</span></div>
                    ${body}</div>${s.ready ? huluDestHtml(k) : ''}${huluPipeHtml(k, did)}${ship}</div>`;
            huluUiSig = huluSigNow();
            if (s.ready) huluPopulateShip();
            huluRefreshUi();
        }
        // Update angka/bar saja (tanpa membangun ulang HTML) supaya dropdown yang sedang dipilih tidak ke-reset.
        function huluRefreshUi() {
            const root = document.getElementById('hulu-root');
            if (!root || typeof currentTabId === 'undefined' || currentTabId !== 'tab-hulu') return;
            if (huluUiSig !== huluSigNow()) return huluRender();
            if (huluView === 'tender') return tenderRefresh();
            const k = huluSel, c = HULU_SITES[k], s = hs(k), set = (id, v) => { const e = document.getElementById(id); if (e) e.innerHTML = v; };
            set('hulu-status', huluStatusInfo(k).label);
            huluPipeKeys(k).forEach(d => set('pl-' + d, huluPipeListItem(k, d)));
            huluRefreshPipeUi(k, huluSelDest(k));
            if (s.built && !s.ready) {
                const left = Math.max(0, s.readyGt - gameNow()), total = c.buildHours * 3600000;
                set('hulu-build-bar', huluBar((1 - left / total) * 100, 'bg-amber-500'));
                set('hulu-build-left', `Sisa ±${fmtJam(left / 3600000)} waktu game`);
            } else if (s.ready) {
                set('hulu-stok-txt', `${fmtN(s.stok)} / ${fmtN(hCap(k))} ${c.unit}`);
                set('hulu-stok-bar', huluBar(s.stok / hCap(k) * 100, s.stok >= hCap(k) ? 'bg-yellow-500' : 'bg-teal-500'));
                set('hulu-produced', `${fmtN(s.produced)} ${c.unit}`);
                set('hulu-due', dShort(s.opexDueGt));
                const empty = document.getElementById('hulu-ship-empty');
                if (empty) empty.classList.toggle('hidden', huluShips(k).length > 0);
                huluUpdateEstimate();
            }
        }

        // Produksi jalan tiap 3 detik nyata (nilai sebenarnya dihitung dari selisih jam game, bukan jumlah tick).
        setInterval(() => {
            try {
                huluTick(); huluSyncMarkers(); tenderSyncMarkers(); huluRefreshUi();
                // Stok kilang/depo tujuan naik terus selama pipa mengalir; renderRefineries() berat, jadi dibatasi tiap ±20 detik nyata.
                if (huluFlowDirty && Date.now() - huluLastRefRender > 20000) { huluFlowDirty = false; huluLastRefRender = Date.now(); renderRefineries(); }
            } catch (e) { console.warn('Hulu tick error:', e); }
        }, 3000);
