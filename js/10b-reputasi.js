        // ===== REPUTASI PERUSAHAAN (0 - 200) =====
        // Beda dari reputasi kru (0-100 per orang, 05-hr-kemitraan.js): ini nilai satu untuk seluruh perusahaan.
        // v91: pemain BARU mulai dari bawah (50, status "Pemula") lalu menanjak - bukan lagi 100. Save lama tetap memakai nilainya sendiri.
        // Naik lewat pesanan SPBU yang dipenuhi, pajak tepat waktu, penemuan cadangan, serta kontrak & PSO yang tuntas;
        // turun lewat pesanan gagal, pajak telat, serta kontrak & PSO yang gagal.
        // Naik makin pelan di dekat 200 dan turun makin sakit di atas 100 (sulit dicapai, mudah hilang). Kenaikan dibatasi per hari game
        // supaya tidak bisa di-farm (kecuali hadiah kontrak/PSO yang sudah dibatasi oleh jumlah slot & jaminannya).
        // Efeknya nyata: kekuatan tawar & pengembalian dana lelang blok (10a-tender-blok.js) dan akses/slot/jaminan Kontrak & PSO (10c-kontrak-pso.js).
        const CORP_REP = {
            min: 0, max: 200, start: 50, dayCap: 8, logMax: 12,
            bidSwing: 0.05,   // kekuatan tawar lelang berubah +/-5% di rentang 0..200 (100 = netral)
            tiers: [
                { min: 160, label: 'Mitra Strategis', color: '#a855f7', bonus: 'Dana lelang kalah kembali +4%, Kontrak Strategis terbuka' },
                { min: 120, label: 'Terpercaya',      color: '#22c55e', bonus: 'Dana lelang kalah kembali +2%, PSO LPG 3 kg terbuka' },
                { min: 80,  label: 'Standar',         color: '#38bdf8', bonus: 'Tanpa penalti lelang, PSO Solar/Pertalite & Kontrak Regional terbuka' },
                { min: 40,  label: 'Pemula',          color: '#f59e0b', bonus: 'Tawaran lelang sedikit lebih lemah, baru bisa Kontrak Lokal' },
                { min: 0,   label: 'Bermasalah',      color: '#ef4444', bonus: 'Dana lelang kalah kembali -4%, tawaran lebih lemah' }
            ]
        };
        const corpRepDefault = () => ({ v: CORP_REP.start, day: -1, gain: 0, log: [] });
        let corpRep = corpRepDefault();
        const corpRepTier = (v) => CORP_REP.tiers.find(t => (v == null ? corpRep.v : v) >= t.min);
        const corpBidPower = () => 1 + (corpRep.v - 100) / 100 * CORP_REP.bidSwing;
        const corpRefundBonus = () => (corpRep.v >= 160 ? 0.04 : corpRep.v >= 120 ? 0.02 : corpRep.v < 40 ? -0.04 : 0);

        function corpRepLoad(raw) {
            const r = corpRepDefault();
            if (raw && typeof raw === 'object') {
                const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
                r.v = num(raw.v, CORP_REP.start, CORP_REP.min, CORP_REP.max); r.day = num(raw.day, -1, -1, 1e9); r.gain = num(raw.gain, 0, 0, 1e3);
                (Array.isArray(raw.log) ? raw.log : []).slice(-CORP_REP.logMax).forEach(l => {
                    if (l && typeof l.why === 'string' && typeof l.d === 'number' && isFinite(l.d))
                        r.log.push({ why: l.why.replace(/[^\w\s\-.,()]/g, '').slice(0, 60), d: Math.max(-200, Math.min(200, l.d)), day: num(l.day, 0, 0, 1e9) });
                });
            }
            corpRep = r; corpRepRender();
        }
        // delta > 0 = nilai dasar kenaikan (diskalakan & dibatasi harian), delta < 0 = nilai dasar penurunan (diskalakan).
        // free = true: kenaikan tidak kena batas harian & tidak menghabiskan jatah harian (dipakai hadiah kontrak/PSO).
        function corpRepAdd(delta, why, free) {
            const day = Math.floor(gameNow() / 86400000), r = corpRep;
            if (r.day !== day) { r.day = day; r.gain = 0; }
            let d = delta > 0 ? delta * (CORP_REP.max - r.v) / 100 : delta * (0.5 + r.v / 200);
            if (d > 0 && !free) d = Math.min(d, CORP_REP.dayCap - r.gain);
            const nv = Math.min(CORP_REP.max, Math.max(CORP_REP.min, r.v + d)), real = Math.round((nv - r.v) * 100) / 100;
            if (Math.abs(real) < 0.01) return 0;
            if (real > 0 && !free) r.gain += real;
            const before = corpRepTier().label; r.v = Math.round(nv * 100) / 100;
            const last = r.log[r.log.length - 1];
            if (last && last.why === why && last.day === day) last.d = Math.round((last.d + real) * 100) / 100;
            else { r.log.push({ why, d: real, day }); if (r.log.length > CORP_REP.logMax) r.log.shift(); }
            const after = corpRepTier().label;
            if (Math.abs(real) >= 1) addLog(`REPUTASI: ${real > 0 ? '+' : ''}${real.toFixed(1)} (${why}). Reputasi perusahaan ${Math.round(r.v)}/${CORP_REP.max}.`, real > 0 ? 'success' : 'warning');
            if (after !== before) { addLog(`REPUTASI: Status perusahaan ${real > 0 ? 'naik' : 'turun'} menjadi ${after}.`, real > 0 ? 'success' : 'warning'); notify(`Reputasi ${real > 0 ? 'naik' : 'turun'}: ${after}`, real > 0 ? 'ok' : 'warn'); }
            corpRepRender();
            return real;
        }
        function corpRepRender() {
            const e = document.getElementById('kpis-rep'); if (!e) return;
            const t = corpRepTier(); e.textContent = Math.round(corpRep.v) + '/' + CORP_REP.max; e.style.color = t.color;
            const box = document.getElementById('kpi-rep'); if (box) box.title = 'Reputasi Perusahaan: ' + t.label;
        }
        // Panel reputasi dirender sebagai HTML di tab "Kontrak & PSO" (showModal() hanya merender <b> & <br>, jadi HTML kaya tidak bisa lewat modal).
        function corpRepOpen() { switchTab('tab-kontrak'); }
        function corpRepPanelHtml() {
            const t = corpRepTier(), pct = Math.round(corpRep.v / CORP_REP.max * 100);
            const nxt = CORP_REP.tiers.slice().reverse().find(x => x.min > corpRep.v);
            const hist = corpRep.log.slice().reverse().slice(0, 6).map(l => `<div class="flex justify-between text-[11px] py-0.5 border-b border-gray-800"><span class="text-gray-300">${esc(l.why)}</span><b style="color:${l.d > 0 ? '#22c55e' : '#ef4444'}">${l.d > 0 ? '+' : ''}${l.d.toFixed(1)}</b></div>`).join('') || '<div class="text-[11px] text-gray-500">Belum ada perubahan.</div>';
            const bonus = Math.round((corpBidPower() - 1) * 1000) / 10, ref = Math.round((TENDER.refund + corpRefundBonus()) * 100);
            const ticks = CORP_REP.tiers.filter(x => x.min > 0).map(x => `<div style="position:absolute;left:${x.min / CORP_REP.max * 100}%;top:0;bottom:0;width:1px;background:rgba(255,255,255,.35)"></div>`).join('');
            const ladder = CORP_REP.tiers.slice().reverse().map(x => {
                const cur = x.label === t.label;
                return `<div class="flex items-start gap-2 text-[10px] py-1 ${cur ? '' : 'opacity-70'}"><span class="w-12 shrink-0 font-mono text-gray-400">${x.min}+</span><span class="shrink-0 font-bold w-24" style="color:${x.color}">${cur ? '&#9654; ' : ''}${x.label}</span><span class="text-gray-400">${x.bonus}</span></div>`;
            }).join('');
            return `<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-l-4" style="border-left-color:${t.color}">
                <div class="flex items-end justify-between mb-1"><b style="font-size:26px;color:${t.color}">${Math.round(corpRep.v)}<span class="text-xs text-gray-500">/${CORP_REP.max}</span></b><b style="color:${t.color}">${t.label}</b></div>
                <div class="h-2 rounded bg-gray-800 overflow-hidden mb-1 relative"><div style="width:${pct}%;background:${t.color};height:100%"></div>${ticks}</div>
                <div class="text-[11px] text-gray-400 mb-2">${nxt ? `Status berikutnya <b class="text-gray-200">${nxt.label}</b> di ${nxt.min} (kurang ${Math.ceil(nxt.min - corpRep.v)} poin).` : 'Status tertinggi tercapai.'}</div>
                <div class="text-[11px] mb-2 text-gray-300"><b>Efek lelang blok:</b> kekuatan tawar ${bonus >= 0 ? '+' : ''}${bonus}% &middot; dana kembali saat kalah ${ref}%</div>
                <div class="text-[10px] text-gray-500 mb-2"><b class="text-gray-400">Naik:</b> pesanan SPBU dipenuhi, PPh tepat waktu, cadangan ditemukan, kontrak &amp; PSO tuntas. <b class="text-gray-400">Turun:</b> pesanan gagal, PPh telat, kontrak &amp; PSO gagal. Makin tinggi makin lambat naik dan makin sakit turunnya. Kenaikan harian maksimal ${CORP_REP.dayCap} poin (di luar hadiah kontrak/PSO).</div>
                <div class="rounded-lg bg-gray-900/70 border border-gray-800 p-2 mb-2"><div class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Tangga reputasi</div>${ladder}</div>
                <div class="text-[11px]"><b class="text-gray-300">Perubahan terakhir</b>${hist}</div></div>`;
        }
