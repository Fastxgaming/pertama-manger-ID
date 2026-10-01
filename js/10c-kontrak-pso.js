        // ===== KONTRAK PASOKAN & PSO (v91) =====
        // Dua sistem yang memakai REPUTASI PERUSAHAAN (10b-reputasi.js) sebagai kunci. Pemain baru mulai dari reputasi 50 ("Pemula"), jadi
        // awalnya hanya bisa Kontrak Lokal dengan 1 slot dan jaminan mahal; makin naik reputasinya, makin banyak yang terbuka:
        //
        //  KONTRAK PASOKAN - penawaran dari pembeli swasta: kirim X volume satu jenis BBM/LPG sebelum tenggat. Setiap pengiriman yang
        //    memenuhi PESANAN SPBU (fulfilOrder) otomatis dihitung ke kontrak aktif yang cocok dan dibayar PREMI % di atas harga jual.
        //    Pemain menaruh JAMINAN (tahan kas). Tuntas = jaminan kembali + reputasi naik. Gagal = jaminan hangus + reputasi turun.
        //    Satu muatan hanya dihitung ke SATU kontrak (yang tenggatnya paling dekat), jadi kontrak tidak bisa ditumpuk untuk premi ganda.
        //  PSO (penugasan pemerintah) - program berulang tiap 7 hari game untuk Solar/Pertalite/LPG 3 kg bersubsidi. Ada kuota per periode;
        //    kuota terpenuhi = kompensasi pemerintah + bonus kinerja + reputasi naik; di bawah 70% = denda + reputasi turun,
        //    2 periode gagal beruntun = penugasan dicabut. Muatan juga boleh dihitung ke kontrak (PSO dan kontrak tidak saling mengambil).
        //
        // Ukuran kontrak & kuota mengikuti ARUS PENGIRIMAN nyata pemain (7 hari game terakhir), bukan angka tetap, jadi tetap masuk akal
        // untuk pemain kecil maupun besar. Kalau belum ada riwayat, dipakai perkiraan dari jumlah armada.
        //
        // Dimuat SETELAH 10-ui-final.js & 10b-reputasi.js; hanya berisi konstanta & fungsi (rujukan lintas file baru dipakai saat dipanggil).

        const KP = {
            offerMax: 6, offerEveryMs: DAY_MS, offerLifeMs: 4 * DAY_MS, flowDays: 7, histMax: 10,
            fuels: {
                solar:     { label: 'Solar',             type: 'BBM', unit: 'KL',  share: 0.35 },
                pertalite: { label: 'Pertalite',         type: 'BBM', unit: 'KL',  share: 0.35 },
                pertamax:  { label: 'Pertamax',          type: 'BBM', unit: 'KL',  share: 0.25 },
                bbm:       { label: 'BBM (semua jenis)', type: 'BBM', unit: 'KL',  share: 1 },
                lpg:       { label: 'LPG',               type: 'LPG', unit: 'Ton', share: 1 }
            },
            // min = reputasi minimum. stretch = target sebagai kelipatan arus pengiriman normal. prem = premi per muatan. dep = jaminan (% nilai kontrak).
            // win/loss = nilai dasar reputasi saat tuntas / gagal (diskalakan oleh corpRepAdd). w = bobot kemunculan penawaran.
            cls: {
                kecil:     { label: 'Kontrak Lokal',     min: 0,   days: 5,  stretch: 0.5, prem: 0.04, dep: 0.02, win: 2, loss: 3, w: 40, color: '#38bdf8' },
                sedang:    { label: 'Kontrak Regional',  min: 80,  days: 7,  stretch: 0.7, prem: 0.06, dep: 0.03, win: 3, loss: 4, w: 30, color: '#22c55e' },
                besar:     { label: 'Kontrak Korporasi', min: 120, days: 10, stretch: 0.9, prem: 0.08, dep: 0.04, win: 4, loss: 6, w: 20, color: '#a855f7' },
                strategis: { label: 'Kontrak Strategis', min: 160, days: 14, stretch: 1.1, prem: 0.11, dep: 0.05, win: 6, loss: 9, w: 10, color: '#f59e0b' }
            },
            // Per tingkat reputasi (dari tertinggi): slots = kontrak aktif maksimal, dep = pengali jaminan, pso = slot PSO,
            // quota = kuota PSO sebagai pecahan arus normal, comp = tambahan tarif kompensasi PSO.
            tier: [
                { min: 160, slots: 4, dep: 0.4, pso: 3, quota: 0.9,  comp: 0.010 },
                { min: 120, slots: 3, dep: 0.6, pso: 2, quota: 0.75, comp: 0.005 },
                { min: 80,  slots: 2, dep: 0.8, pso: 1, quota: 0.6,  comp: 0 },
                { min: 40,  slots: 1, dep: 1.0, pso: 0, quota: 0.6,  comp: 0 },
                { min: 0,   slots: 1, dep: 1.5, pso: 0, quota: 0.6,  comp: 0 }
            ],
            buyers: ['PT Nusa Logistik', 'CV Samudra Niaga', 'PT Kencana Transportasi', 'Koperasi Tani Makmur', 'PT Arta Bahari', 'PT Bumi Sarana Energi', 'CV Cipta Armada', 'PT Garda Industri', 'PT Lintas Pulau Mandiri', 'Perum Karya Tirta'],
            pso: {
                days: 7, pass: 0.7, over: 1.3, bonus: 0.25, finePct: 0.06, failMax: 2, cooldownDays: 14, leaveCoolDays: 7,
                rep: { win: 1.5, loss: 3, revoke: 4 },
                progs: {
                    solar:     { label: 'Solar Bersubsidi',     fuel: 'solar',     type: 'BBM', min: 80,  comp: 0.030, ic: 'fa-gas-pump' },
                    pertalite: { label: 'Pertalite Bersubsidi', fuel: 'pertalite', type: 'BBM', min: 80,  comp: 0.035, ic: 'fa-gas-pump' },
                    lpg:       { label: 'LPG 3 kg Bersubsidi',  fuel: 'lpg',       type: 'LPG', min: 120, comp: 0.050, ic: 'fa-fire' }
                }
            }
        };

        const kpDefault = () => ({ offers: [], seq: 1, nextOfferGt: 0, active: [], hist: [], pso: { solar: null, pertalite: null, lpg: null }, cool: {}, flow: [], since: 0, stat: { done: 0, fail: 0, prem: 0, comp: 0, fine: 0 } });
        let kp = kpDefault();
        let kpLastHtml = '';

        // ---------- helper ----------
        const kpTierOf = () => KP.tier.find(t => corpRep.v >= t.min);
        const kpMatch = (key, fid) => (key === 'bbm' ? fid !== 'lpg' : key === fid);
        const kpTrucks = type => companyFleet.filter(t => t.type === type && isSpbuTruck(t));
        const kpAvgCap = type => { const a = kpTrucks(type); return a.length ? a.reduce((x, t) => x + t.cap, 0) / a.length : 0; };
        const kpPrice = key => (key === 'lpg' ? ECO.jualTon : key === 'bbm' ? (hargaJualKl('solar') + hargaJualKl('pertalite') + hargaJualKl('pertamax')) / 3 : hargaJualKl(key));
        const kpVol = (v, key) => (Math.round(v * 10) / 10).toLocaleString('id-ID') + ' ' + KP.fuels[key].unit;
        const kpDeposit = o => Math.round(o.value * KP.cls[o.cls].dep * kpTierOf().dep);
        const kpDaysLeft = ms => Math.max(0, (ms - gameNow()) / DAY_MS);
        const kpCleanTxt = (v, n) => String(v == null ? '' : v).replace(/[<>&"'`]/g, '').slice(0, n || 80);

        // Arus pengiriman per hari game untuk satu jenis (rata-rata 7 hari terakhir; sebelum ada riwayat dipakai perkiraan dari armada).
        function kpFlowPerDay(key) {
            const now = gameNow(), cut = now - KP.flowDays * DAY_MS;
            kp.flow = kp.flow.filter(f => f.gt >= cut);
            const span = Math.min(KP.flowDays, Math.max(1, (now - (kp.since || now)) / DAY_MS));
            const meas = kp.flow.filter(f => kpMatch(key, f.fuel)).reduce((a, f) => a + f.vol, 0) / span;
            const type = KP.fuels[key].type, base = kpTrucks(type).length * kpAvgCap(type) * 0.4 * KP.fuels[key].share;
            return Math.max(meas, base * 0.5);
        }
        function kpSize(key, days, stretch) {
            const type = KP.fuels[key].type, minV = 2 * kpAvgCap(type);
            if (minV <= 0) return 0;
            return Math.max(Math.round(minV), Math.round(kpFlowPerDay(key) * days * stretch));
        }
        function kpHist(k, txt, d, r) {
            kp.hist.unshift({ k, txt: kpCleanTxt(txt, 90), d: Math.round(d) || 0, r, day: gameNow() });
            if (kp.hist.length > KP.histMax) kp.hist.length = KP.histMax;
        }
        // Kas: jaminan keluar-masuk hanya menggeser kas (bukan pendapatan/biaya); premi, kompensasi, denda & jaminan hangus ikut laporan keuangan.
        const kpCash = (amt, desc, kind) => {
            companyCash += amt;
            if (kind === 'inc') totalIncome += amt; else if (kind === 'exp') totalExpense += -amt;
            addFinanceLog(desc, amt); updateCashDisplay();
        };

        // ---------- simpan & muat (data cloud tidak dipercaya: semua divalidasi) ----------
        function kpLoad(raw) {
            const r = kpDefault();
            if (raw && typeof raw === 'object') {
                const num = (v, d, lo, hi) => (typeof v === 'number' && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
                const arr = a => (Array.isArray(a) ? a : []);
                r.seq = num(raw.seq, 1, 1, 1e9); r.nextOfferGt = num(raw.nextOfferGt, 0, 0, 1e15); r.since = num(raw.since, 0, 0, 1e15);
                arr(raw.offers).slice(0, KP.offerMax).forEach(o => {
                    if (!o || !KP.fuels[o.fuel] || !KP.cls[o.cls] || !(o.vol > 0)) return;
                    r.offers.push({ id: num(o.id, 0, 0, 1e9), fuel: o.fuel, cls: o.cls, buyer: kpCleanTxt(o.buyer, 40), vol: num(o.vol, 1, 1, 1e9), days: KP.cls[o.cls].days, prem: KP.cls[o.cls].prem,
                        value: num(o.value, 0, 0, 1e14), gt: num(o.gt, 0, 0, 1e15), exp: num(o.exp, 0, 0, 1e15) });
                });
                arr(raw.active).slice(0, 8).forEach(c => {
                    if (!c || !KP.fuels[c.fuel] || !KP.cls[c.cls] || !(c.vol > 0)) return;
                    r.active.push({ id: num(c.id, 0, 0, 1e9), fuel: c.fuel, cls: c.cls, buyer: kpCleanTxt(c.buyer, 40), vol: num(c.vol, 1, 1, 1e9), got: num(c.got, 0, 0, 1e9), days: KP.cls[c.cls].days,
                        prem: KP.cls[c.cls].prem, start: num(c.start, 0, 0, 1e15), due: num(c.due, 0, 0, 1e15), deposit: num(c.deposit, 0, 0, 1e13), earned: num(c.earned, 0, 0, 1e13) });
                });
                Object.keys(KP.pso.progs).forEach(k => {
                    const p = raw.pso && raw.pso[k]; if (!p || typeof p !== 'object') return;
                    r.pso[k] = { start: num(p.start, 0, 0, 1e15), end: num(p.end, 0, 0, 1e15), quota: num(p.quota, 1, 1, 1e9), got: num(p.got, 0, 0, 1e9), accrued: num(p.accrued, 0, 0, 1e13),
                        fails: num(p.fails, 0, 0, 9), periods: num(p.periods, 0, 0, 1e6), comp: num(p.comp, KP.pso.progs[k].comp, 0, 0.2) };
                });
                if (raw.cool && typeof raw.cool === 'object') Object.keys(KP.pso.progs).forEach(k => { r.cool[k] = num(raw.cool[k], 0, 0, 1e15); });
                arr(raw.hist).slice(0, KP.histMax).forEach(h => { if (h && typeof h.txt === 'string') r.hist.push({ k: h.k === 'p' ? 'p' : 'k', txt: kpCleanTxt(h.txt, 90), d: num(h.d, 0, -1e13, 1e13), r: ['ok', 'part', 'fail'].includes(h.r) ? h.r : 'ok', day: num(h.day, 0, 0, 1e15) }); });
                arr(raw.flow).slice(-400).forEach(f => { if (f && typeof f.fuel === 'string' && f.vol > 0) r.flow.push({ gt: num(f.gt, 0, 0, 1e15), fuel: kpCleanTxt(f.fuel, 20), vol: num(f.vol, 0, 0, 1e6) }); });
                if (raw.stat && typeof raw.stat === 'object') ['done', 'fail', 'prem', 'comp', 'fine'].forEach(k => { r.stat[k] = num(raw.stat[k], 0, 0, 1e15); });
            }
            kp = r; kpLastHtml = ''; kpRender(true);
        }

        // ---------- penawaran ----------
        function kpGenOffer() {
            const keys = Object.keys(KP.fuels).filter(k => kpTrucks(KP.fuels[k].type).length);
            if (!keys.length) return null;
            const classes = Object.keys(KP.cls);
            for (let tries = 0; tries < 6; tries++) {
                const key = keys[Math.floor(Math.random() * keys.length)];
                // kelas yang sudah terbuka bagi pemain diberi bobot 2x supaya pemain baru tidak hanya melihat penawaran terkunci
                const ws = classes.map(c => KP.cls[c].w * (corpRep.v >= KP.cls[c].min ? 2 : 1));
                let r = Math.random() * ws.reduce((a, b) => a + b, 0), ck = classes[classes.length - 1];
                for (let i = 0; i < classes.length; i++) { r -= ws[i]; if (r <= 0) { ck = classes[i]; break; } }
                if (tries < 5 && (kp.offers.some(o => o.fuel === key && o.cls === ck) || kp.active.some(c => c.fuel === key && c.cls === ck))) continue;
                const c = KP.cls[ck], vol = kpSize(key, c.days, c.stretch);
                if (!vol) continue;
                return { id: kp.seq++, fuel: key, cls: ck, buyer: KP.buyers[Math.floor(Math.random() * KP.buyers.length)], vol, days: c.days, prem: c.prem,
                    value: Math.round(vol * kpPrice(key)), gt: gameNow(), exp: gameNow() + KP.offerLifeMs };
            }
            return null;
        }

        async function kpAccept(id) {
            const o = kp.offers.find(x => x.id === id); if (!o) return;
            const c = KP.cls[o.cls], t = kpTierOf(), f = KP.fuels[o.fuel], dep = kpDeposit(o);
            if (corpRep.v < c.min) return showModal('Reputasi Belum Cukup', `${c.label} butuh reputasi minimal ${c.min}. Reputasi Anda ${Math.round(corpRep.v)}. Naikkan dulu lewat pesanan SPBU, PPh tepat waktu, dan Kontrak Lokal.`, 'fa-lock', 'red');
            if (kp.active.length >= t.slots) return showModal('Slot Kontrak Penuh', `Status ${corpRepTier().label} hanya boleh memegang ${t.slots} kontrak aktif. Tuntaskan satu dulu, atau naikkan reputasi untuk membuka slot baru.`, 'fa-triangle-exclamation', 'red');
            if (!kpTrucks(f.type).length) return showModal('Belum Punya Armada', `Anda belum punya truk ${f.type} untuk kontrak ini.`, 'fa-truck', 'red');
            if (companyCash < dep) return showModal('Kas Tidak Cukup', `Jaminan kontrak ${formatRupiah(dep)} belum tersedia di kas.`, 'fa-triangle-exclamation', 'red');
            if (!(await showConfirm(`Ambil ${c.label} dari ${o.buyer}?\nKirim ${kpVol(o.vol, o.fuel)} ${f.label} dalam ${c.days} hari game.\nPremi +${Math.round(c.prem * 100)}% tiap muatan yang dihitung.\nJaminan ${formatRupiah(dep)} ditahan: kembali bila tuntas, hangus bila gagal (reputasi juga turun).`, { title: 'Ambil Kontrak', iconClass: 'fa-file-contract', theme: 'blue', okLabel: 'Ambil Kontrak' }))) return;
            // cek ulang setelah konfirmasi (kas/slot/penawaran bisa berubah selagi dialog terbuka)
            if (!kp.offers.includes(o) || kp.active.length >= kpTierOf().slots || companyCash < dep) return;
            kp.offers = kp.offers.filter(x => x !== o);
            kpCash(-dep, `Jaminan kontrak ${f.label} ${o.buyer} (ditahan)`);
            kp.active.push({ id: o.id, fuel: o.fuel, cls: o.cls, buyer: o.buyer, vol: o.vol, got: 0, days: c.days, prem: c.prem, start: gameNow(), due: gameNow() + c.days * DAY_MS, deposit: dep, earned: 0 });
            addLog(`KONTRAK: ${c.label} ${o.buyer} diambil - ${kpVol(o.vol, o.fuel)} ${f.label} dalam ${c.days} hari game, jaminan ${formatRupiah(dep)}.`, 'purple');
            notify(`Kontrak diambil: ${kpVol(o.vol, o.fuel)} ${f.label}.`, 'ok');
            kpRender(true);
        }
        async function kpCancel(id) {
            const c = kp.active.find(x => x.id === id); if (!c) return;
            if (!(await showConfirm(`Batalkan kontrak ${KP.fuels[c.fuel].label} untuk ${c.buyer}?\nJaminan ${formatRupiah(c.deposit)} HANGUS dan reputasi turun.`, { title: 'Batalkan Kontrak', iconClass: 'fa-ban', theme: 'red', okLabel: 'Batalkan' }))) return;
            if (!kp.active.includes(c)) return;
            kpFinish(c, 0, KP.cls[c.cls].loss * 0.5, 'dibatalkan');
            kpRender(true);
        }

        // Penyelesaian kontrak (tuntas / lewat tenggat / dibatalkan). refundFrac = bagian jaminan yang kembali.
        function kpFinish(c, refundFrac, repDelta, how) {
            kp.active = kp.active.filter(x => x !== c);
            const f = KP.fuels[c.fuel], cl = KP.cls[c.cls], refund = Math.round(c.deposit * refundFrac), lost = c.deposit - refund, name = `${cl.label} ${f.label} (${c.buyer})`;
            if (refund > 0) kpCash(refund, `Jaminan kontrak dikembalikan: ${name}`);
            if (lost > 0) { totalExpense += lost; addFinanceLog(`Jaminan kontrak hangus: ${name}`, -lost); } // kas sudah dipotong saat jaminan ditaruh; sekarang tercatat sebagai biaya
            const ok = how === 'tuntas';
            if (ok) { kp.stat.done++; corpRepAdd(repDelta, 'Kontrak tuntas', true); }
            else { kp.stat.fail++; corpRepAdd(-repDelta, 'Kontrak ' + how); }
            kpHist('k', `${name}: ${how} (${Math.round(c.got / c.vol * 100)}%)`, c.earned - lost, ok ? 'ok' : (refundFrac > 0 ? 'part' : 'fail'));
            addLog(`KONTRAK ${ok ? 'TUNTAS' : how.toUpperCase()}: ${name} terkirim ${kpVol(c.got, c.fuel)} dari ${kpVol(c.vol, c.fuel)}. Premi diterima ${formatRupiah(c.earned)}${lost > 0 ? `, jaminan hangus ${formatRupiah(lost)}` : ', jaminan kembali penuh'}.`, ok ? 'success' : 'warning');
            notify(ok ? `Kontrak tuntas: ${name}` : `Kontrak ${how}: ${name}`, ok ? 'ok' : 'warn');
        }
        function kpExpire(c) {
            const p = c.got / c.vol;
            if (p >= 0.5) kpFinish(c, p, KP.cls[c.cls].loss * 0.5, 'tenggat lewat sebagian');
            else kpFinish(c, 0, KP.cls[c.cls].loss, 'gagal');
        }

        // ---------- PSO ----------
        const kpPsoSlotsUsed = () => Object.values(kp.pso).filter(Boolean).length;
        const kpPsoQuota = k => { const type = KP.pso.progs[k].type; return Math.max(Math.round(2 * kpAvgCap(type)) || 1, Math.round(kpFlowPerDay(k) * KP.pso.days * kpTierOf().quota)); };
        const kpPsoComp = k => KP.pso.progs[k].comp + kpTierOf().comp;

        async function kpPsoJoin(k) {
            const cfg = KP.pso.progs[k], t = kpTierOf(); if (kp.pso[k]) return;
            if (corpRep.v < cfg.min) return showModal('Reputasi Belum Cukup', `PSO ${cfg.label} butuh reputasi minimal ${cfg.min}. Reputasi Anda ${Math.round(corpRep.v)}.`, 'fa-lock', 'red');
            if (kpPsoSlotsUsed() >= t.pso) return showModal('Slot PSO Penuh', `Status ${corpRepTier().label} hanya boleh memegang ${t.pso} penugasan PSO. Naikkan reputasi untuk membuka slot baru, atau lepas penugasan lain.`, 'fa-triangle-exclamation', 'red');
            if ((kp.cool[k] || 0) > gameNow()) return showModal('Masa Tunggu', `Penugasan ini baru bisa diambil lagi dalam ${kpDaysLeft(kp.cool[k]).toFixed(1)} hari game.`, 'fa-hourglass-half', 'red');
            if (!kpTrucks(cfg.type).length) return showModal('Belum Punya Armada', `Anda belum punya truk ${cfg.type} untuk PSO ini.`, 'fa-truck', 'red');
            const q = kpPsoQuota(k), comp = kpPsoComp(k);
            if (!(await showConfirm(`Ambil penugasan PSO ${cfg.label}?\nKuota ${kpVol(q, k)} per ${KP.pso.days} hari game (diperbarui tiap periode).\nKompensasi +${(comp * 100).toFixed(1).replace('.', ',')}% per muatan, bonus kinerja +${Math.round(KP.pso.bonus * 100)}% bila kuota penuh.\nDi bawah ${Math.round(KP.pso.pass * 100)}% kuota: denda dan reputasi turun; ${KP.pso.failMax} periode gagal beruntun = penugasan dicabut.`, { title: 'Penugasan PSO', iconClass: 'fa-landmark', theme: 'blue', okLabel: 'Ambil Penugasan' }))) return;
            if (kp.pso[k] || kpPsoSlotsUsed() >= kpTierOf().pso) return;
            kp.pso[k] = { start: gameNow(), end: gameNow() + KP.pso.days * DAY_MS, quota: q, got: 0, accrued: 0, fails: 0, periods: 0, comp };
            addLog(`PSO: Penugasan ${cfg.label} dimulai. Kuota ${kpVol(q, k)} per ${KP.pso.days} hari game.`, 'purple');
            notify(`PSO ${cfg.label} dimulai.`, 'ok');
            kpRender(true);
        }
        async function kpPsoLeave(k) {
            const cfg = KP.pso.progs[k], p = kp.pso[k]; if (!p) return;
            if (!(await showConfirm(`Lepas penugasan PSO ${cfg.label}?\nKompensasi periode ini (${formatRupiah(p.accrued)}) hangus dan Anda tidak bisa mengambilnya lagi selama ${KP.pso.leaveCoolDays} hari game. Reputasi tidak berubah.`, { title: 'Lepas PSO', iconClass: 'fa-door-open', theme: 'red', okLabel: 'Lepas' }))) return;
            if (!kp.pso[k]) return;
            kp.pso[k] = null; kp.cool[k] = gameNow() + KP.pso.leaveCoolDays * DAY_MS;
            kpHist('p', `PSO ${cfg.label}: dilepas sukarela`, 0, 'part');
            addLog(`PSO: Penugasan ${cfg.label} dilepas.`, 'info');
            kpRender(true);
        }
        function kpPsoSettle(k) {
            const P = KP.pso, cfg = P.progs[k], p = kp.pso[k], price = kpPrice(k), pct = p.quota > 0 ? p.got / p.quota : 1, pctTxt = Math.round(pct * 100) + '%';
            if (pct >= 1) {
                const pay = Math.round(p.accrued * (1 + P.bonus));
                if (pay > 0) { kpCash(pay, `Kompensasi PSO ${cfg.label} (kuota ${pctTxt}, termasuk bonus kinerja)`, 'inc'); kp.stat.comp += pay; }
                corpRepAdd(P.rep.win, 'PSO terpenuhi', true); p.fails = 0;
                kpHist('p', `PSO ${cfg.label}: kuota terpenuhi ${pctTxt}`, pay, 'ok');
                addLog(`PSO TERPENUHI: ${cfg.label} ${kpVol(p.got, k)} dari kuota ${kpVol(p.quota, k)}. Kompensasi + bonus kinerja ${formatRupiah(pay)} cair.`, 'success');
                notify(`PSO ${cfg.label} terpenuhi: ${formatRupiah(pay)} cair.`, 'ok');
            } else if (pct >= P.pass) {
                const pay = Math.round(p.accrued);
                if (pay > 0) { kpCash(pay, `Kompensasi PSO ${cfg.label} (kuota ${pctTxt})`, 'inc'); kp.stat.comp += pay; }
                p.fails = 0;
                kpHist('p', `PSO ${cfg.label}: kuota ${pctTxt} (lolos tanpa bonus)`, pay, 'part');
                addLog(`PSO LOLOS: ${cfg.label} ${kpVol(p.got, k)} dari kuota ${kpVol(p.quota, k)} (${pctTxt}). Kompensasi ${formatRupiah(pay)} cair tanpa bonus kinerja.`, 'info');
            } else {
                const fine = Math.min(Math.max(0, Math.round((p.quota - p.got) * price * P.finePct)), Math.max(0, Math.floor(companyCash)));
                if (fine > 0) { kpCash(-fine, `Denda PSO ${cfg.label} (kuota hanya ${pctTxt})`, 'exp'); kp.stat.fine += fine; }
                corpRepAdd(-P.rep.loss, 'PSO gagal'); p.fails++; kp.stat.fail++;
                kpHist('p', `PSO ${cfg.label}: kuota hanya ${pctTxt}`, -fine, 'fail');
                addLog(`PSO GAGAL: ${cfg.label} hanya ${kpVol(p.got, k)} dari kuota ${kpVol(p.quota, k)} (${pctTxt}). Kompensasi hangus, denda ${formatRupiah(fine)}.`, 'warning');
                notify(`PSO ${cfg.label} gagal: denda ${formatRupiah(fine)}.`, 'warn');
                if (p.fails >= P.failMax) {
                    kp.pso[k] = null; kp.cool[k] = gameNow() + P.cooldownDays * DAY_MS;
                    corpRepAdd(-P.rep.revoke, 'PSO dicabut');
                    kpHist('p', `PSO ${cfg.label}: DICABUT (gagal ${P.failMax} periode)`, 0, 'fail');
                    addLog(`PSO DICABUT: penugasan ${cfg.label} dicabut karena gagal ${P.failMax} periode beruntun. Bisa diajukan lagi setelah ${P.cooldownDays} hari game.`, 'warning');
                    return;
                }
            }
            // periode berikutnya: kuota & tarif dihitung ulang sesuai reputasi dan arus pengiriman terbaru
            p.periods++; p.got = 0; p.accrued = 0; p.start = p.end; p.end = p.start + P.days * DAY_MS; p.quota = kpPsoQuota(k); p.comp = kpPsoComp(k);
        }

        // ---------- hook pengiriman: dipanggil fulfilOrder() tiap muatan yang memenuhi pesanan SPBU. Mengembalikan premi kontrak (Rp). ----------
        function kpOnDelivery(fuelId, vol) {
            if (!currentAccount || !(vol > 0)) return 0;
            const price = fuelId === 'lpg' ? ECO.jualTon : hargaJualKl(fuelId);
            if (!kp.since) kp.since = gameNow();
            kp.flow.push({ gt: gameNow(), fuel: fuelId, vol }); if (kp.flow.length > 400) kp.flow.shift();
            let left = vol, extra = 0;
            const cands = kp.active.filter(c => kpMatch(c.fuel, fuelId) && c.got < c.vol - 1e-6).sort((a, b) => (a.fuel === 'bbm') - (b.fuel === 'bbm') || a.due - b.due);
            const done = [];
            for (const c of cands) {
                if (left <= 1e-6) break;
                const take = Math.min(left, c.vol - c.got), prem = Math.round(take * price * c.prem);
                c.got = Math.round((c.got + take) * 10) / 10; c.earned += prem; extra += prem; left -= take;
                if (c.got >= c.vol - 1e-6) done.push(c);
            }
            if (extra > 0) { kp.stat.prem += extra; addLog(`KONTRAK: premi pengiriman ${formatRupiah(extra)} dari ${kpVol(vol, fuelId === 'lpg' ? 'lpg' : 'bbm')} ${fuelLabel(fuelId)} (masuk pendapatan kotor).`, 'success'); }
            done.forEach(c => kpFinish(c, 1, KP.cls[c.cls].win, 'tuntas'));
            const p = KP.pso.progs[fuelId] ? kp.pso[fuelId] : null;
            if (p) { const take = Math.min(vol, Math.max(0, p.quota * KP.pso.over - p.got)); p.got = Math.round((p.got + take) * 10) / 10; p.accrued += take * price * p.comp; }
            if (extra > 0 || p || done.length) kpRender();
            return extra;
        }

        // ---------- tick: dipanggil tickStock() (otomatis berhenti saat game dijeda) ----------
        function kpTick() {
            if (!currentAccount) return;
            const now = gameNow(); let dirty = false;
            if (!kp.since) kp.since = now;
            const n0 = kp.offers.length; kp.offers = kp.offers.filter(o => o.exp > now); if (kp.offers.length !== n0) dirty = true;
            if (kp.offers.length < KP.offerMax && now >= kp.nextOfferGt) {
                const o = kpGenOffer();
                if (o) { kp.offers.push(o); dirty = true; if (kp.offers.length === 1) notify('Ada penawaran kontrak pasokan baru. Buka tab Kontrak & PSO.', 'info'); }
                kp.nextOfferGt = now + (kp.offers.length < 3 ? DAY_MS / 4 : KP.offerEveryMs);
            }
            kp.active.slice().forEach(c => { if (now >= c.due) { kpExpire(c); dirty = true; } });
            Object.keys(KP.pso.progs).forEach(k => {
                let guard = 0;
                while (kp.pso[k] && now >= kp.pso[k].end && guard++ < 8) { kpPsoSettle(k); dirty = true; }
                if (kp.pso[k] && now >= kp.pso[k].end) { kp.pso[k].start = now; kp.pso[k].end = now + KP.pso.days * DAY_MS; } // tertinggal lebih dari 8 periode: mulai ulang dari sekarang
            });
            if (dirty) kpRender();
        }

        // ---------- tampilan ----------
        const kpBar = (pct, col) => `<div class="h-1.5 rounded bg-gray-800 overflow-hidden"><div style="width:${Math.min(100, Math.max(0, pct))}%;background:${col};height:100%"></div></div>`;
        const kpBtn = (label, onclick, enabled, col) => `<button ${enabled ? `onclick="${onclick}"` : 'disabled'} class="w-full py-1.5 rounded-lg text-[11px] font-bold border transition ${enabled ? 'text-white border-transparent hover:brightness-110' : 'text-gray-500 border-gray-800 bg-gray-900 cursor-not-allowed'}" ${enabled ? `style="background:${col}"` : ''}>${label}</button>`;
        function kpRender(force) {
            const root = document.getElementById('kp-root'); if (!root) return;
            if (!force && currentTabId !== 'tab-kontrak') return;
            if (!currentAccount) return;
            const t = kpTierOf(), rt = corpRepTier(), now = gameNow();
            const head = (ic, title, sub, col) => `<div class="flex items-center gap-2 mb-2"><span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white shrink-0" style="background:${col}"><i class="fa-solid ${ic}"></i></span><div class="min-w-0"><div class="text-xs font-black uppercase tracking-wider text-gray-200">${title}</div><div class="text-[10px] text-gray-500">${sub}</div></div></div>`;

            // --- kontrak aktif ---
            const act = kp.active.map(c => {
                const cl = KP.cls[c.cls], f = KP.fuels[c.fuel], pct = c.got / c.vol * 100, left = kpDaysLeft(c.due);
                return `<div class="rounded-lg bg-gray-900 border border-gray-800 p-2.5"><div class="flex justify-between items-start gap-2"><div class="min-w-0"><div class="text-xs font-bold text-gray-100 truncate">${esc(f.label)} &middot; ${esc(c.buyer)}</div><div class="text-[10px]" style="color:${cl.color}">${cl.label} &middot; premi +${Math.round(c.prem * 100)}%</div></div><div class="text-right shrink-0"><div class="text-[11px] font-mono font-bold ${left < 1 ? 'text-red-400' : 'text-gray-200'}">${left.toFixed(1)} hari</div><div class="text-[9px] text-gray-500">sisa waktu</div></div></div>
                    <div class="mt-1.5">${kpBar(pct, cl.color)}</div>
                    <div class="flex justify-between text-[10px] text-gray-400 mt-1"><span>${kpVol(c.got, c.fuel)} / ${kpVol(c.vol, c.fuel)} (${Math.round(pct)}%)</span><span>Premi ${fmtShort(c.earned)} &middot; Jaminan ${fmtShort(c.deposit)}</span></div>
                    <button onclick="kpCancel(${c.id})" class="mt-1.5 text-[10px] text-gray-500 hover:text-red-400 underline">Batalkan (jaminan hangus)</button></div>`;
            }).join('') || '<div class="text-[11px] text-gray-500 text-center py-3">Belum ada kontrak aktif. Ambil penawaran di bawah.</div>';

            // --- penawaran ---
            const offs = kp.offers.slice().sort((a, b) => KP.cls[a.cls].min - KP.cls[b.cls].min || a.exp - b.exp).map(o => {
                const cl = KP.cls[o.cls], f = KP.fuels[o.fuel], dep = kpDeposit(o), locked = corpRep.v < cl.min, full = kp.active.length >= t.slots, poor = companyCash < dep;
                const label = locked ? `<i class="fa-solid fa-lock mr-1"></i>Butuh reputasi ${cl.min}` : full ? 'Slot kontrak penuh' : poor ? 'Kas kurang untuk jaminan' : 'Ambil Kontrak';
                return `<div class="rounded-lg bg-gray-900 border border-gray-800 p-2.5 ${locked ? 'opacity-60' : ''}"><div class="flex justify-between items-start gap-2"><div class="min-w-0"><div class="text-xs font-bold text-gray-100 truncate">${esc(f.label)} &middot; ${esc(o.buyer)}</div><div class="text-[10px]" style="color:${cl.color}">${cl.label}</div></div><div class="text-right shrink-0"><div class="text-[11px] font-mono font-bold text-gray-200">${kpVol(o.vol, o.fuel)}</div><div class="text-[9px] text-gray-500">dalam ${o.days} hari</div></div></div>
                    <div class="grid grid-cols-3 gap-1.5 my-1.5 text-center text-[10px]"><div class="bg-gray-950/70 rounded p-1"><div class="text-gray-500">Premi</div><b class="text-emerald-400">+${Math.round(o.prem * 100)}%</b></div><div class="bg-gray-950/70 rounded p-1"><div class="text-gray-500">Jaminan</div><b class="${poor && !locked ? 'text-red-400' : 'text-gray-200'}">${fmtShort(dep)}</b></div><div class="bg-gray-950/70 rounded p-1"><div class="text-gray-500">Reputasi</div><b class="text-gray-200">+${cl.win} / -${cl.loss}</b></div></div>
                    ${kpBtn(label, `kpAccept(${o.id})`, !locked && !full && !poor, cl.color)}<div class="text-[9px] text-gray-600 mt-1 text-right">Penawaran berakhir ${kpDaysLeft(o.exp).toFixed(1)} hari lagi</div></div>`;
            }).join('') || '<div class="text-[11px] text-gray-500 text-center py-3">Belum ada penawaran. Punya truk BBM/LPG dulu; penawaran baru muncul tiap hari game.</div>';

            // --- PSO ---
            const used = kpPsoSlotsUsed();
            const pso = Object.keys(KP.pso.progs).map(k => {
                const cfg = KP.pso.progs[k], p = kp.pso[k];
                if (p) {
                    const pct = p.quota > 0 ? p.got / p.quota * 100 : 0, col = pct >= 100 ? '#22c55e' : pct >= KP.pso.pass * 100 ? '#f59e0b' : '#38bdf8';
                    return `<div class="rounded-lg bg-gray-900 border border-emerald-500/30 p-2.5"><div class="flex justify-between items-start gap-2"><div class="min-w-0 text-xs font-bold text-gray-100"><i class="fa-solid ${cfg.ic} mr-1 text-emerald-400"></i>${cfg.label}</div><div class="text-right shrink-0"><div class="text-[11px] font-mono font-bold ${kpDaysLeft(p.end) < 1 ? 'text-amber-400' : 'text-gray-200'}">${kpDaysLeft(p.end).toFixed(1)} hari</div><div class="text-[9px] text-gray-500">sisa periode</div></div></div>
                        <div class="mt-1.5">${kpBar(pct, col)}</div>
                        <div class="flex justify-between text-[10px] text-gray-400 mt-1"><span>${kpVol(p.got, k)} / ${kpVol(p.quota, k)} (${Math.round(pct)}%)</span><span>Kompensasi berjalan ${fmtShort(p.accrued)}</span></div>
                        <div class="text-[10px] text-gray-500 mt-1">Tarif +${(p.comp * 100).toFixed(1).replace('.', ',')}% &middot; periode ke-${p.periods + 1}${p.fails ? ` &middot; <span class="text-red-400">gagal beruntun ${p.fails}/${KP.pso.failMax}</span>` : ''} &middot; aman di &ge;${Math.round(KP.pso.pass * 100)}%, bonus di 100%</div>
                        <button onclick="kpPsoLeave('${k}')" class="mt-1.5 text-[10px] text-gray-500 hover:text-red-400 underline">Lepas penugasan</button></div>`;
                }
                const locked = corpRep.v < cfg.min, cool = (kp.cool[k] || 0) > now, noSlot = used >= t.pso, noTruck = !kpTrucks(cfg.type).length;
                const label = locked ? `<i class="fa-solid fa-lock mr-1"></i>Butuh reputasi ${cfg.min}` : cool ? `Masa tunggu ${kpDaysLeft(kp.cool[k]).toFixed(1)} hari` : noSlot ? 'Slot PSO penuh' : noTruck ? `Belum punya truk ${cfg.type}` : 'Ambil Penugasan';
                return `<div class="rounded-lg bg-gray-900 border border-gray-800 p-2.5 ${locked ? 'opacity-60' : ''}"><div class="flex justify-between items-center gap-2 mb-1.5"><div class="text-xs font-bold text-gray-100"><i class="fa-solid ${cfg.ic} mr-1 text-gray-400"></i>${cfg.label}</div><div class="text-[10px] text-gray-400">Kompensasi +${((cfg.comp + t.comp) * 100).toFixed(1).replace('.', ',')}%</div></div>
                    ${kpBtn(label, `kpPsoJoin('${k}')`, !locked && !cool && !noSlot && !noTruck, '#10b981')}</div>`;
            }).join('');

            // --- riwayat ---
            const RC = { ok: '#22c55e', part: '#f59e0b', fail: '#ef4444' };
            const hist = kp.hist.map(h => `<div class="flex justify-between gap-2 text-[10px] py-0.5 border-b border-gray-800"><span class="min-w-0 truncate" style="color:${RC[h.r]}">${h.k === 'p' ? '<i class="fa-solid fa-landmark mr-1"></i>' : '<i class="fa-solid fa-file-contract mr-1"></i>'}${esc(h.txt)}</span><b class="shrink-0 font-mono ${h.d >= 0 ? 'text-emerald-400' : 'text-red-400'}">${h.d >= 0 ? '+' : '-'}${fmtShort(Math.abs(h.d))}</b></div>`).join('') || '<div class="text-[10px] text-gray-500">Belum ada riwayat.</div>';

            const html = `${corpRepPanelHtml()}
                <div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-l-4" style="border-left-color:#a855f7">
                    ${head('fa-file-contract', 'Kontrak Pasokan', `Slot ${kp.active.length}/${t.slots} &middot; jaminan x${t.dep} (status ${rt.label})`, '#a855f7')}
                    <p class="text-[10px] text-gray-500 mb-2">Kirim volume tertentu sebelum tenggat lewat pesanan SPBU yang biasa. Tiap muatan yang dihitung dibayar premi di atas harga jual. Tuntas: jaminan kembali dan reputasi naik; gagal: jaminan hangus dan reputasi turun. Reputasi tinggi membuka kontrak lebih besar, slot lebih banyak, dan jaminan lebih murah.</p>
                    <div class="space-y-2">${act}</div>
                    <div class="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-3 mb-1.5">Penawaran tersedia</div>
                    <div class="space-y-2">${offs}</div>
                </div>
                <div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 shadow border-l-4" style="border-left-color:#10b981">
                    ${head('fa-landmark', 'Penugasan PSO', `Slot ${used}/${t.pso} &middot; periode ${KP.pso.days} hari game`, '#10b981')}
                    <p class="text-[10px] text-gray-500 mb-2">Penugasan pemerintah untuk BBM/LPG bersubsidi. Penuhi kuota tiap periode untuk kompensasi + bonus kinerja dan reputasi. Di bawah ${Math.round(KP.pso.pass * 100)}% kuota kena denda dan reputasi turun; ${KP.pso.failMax} periode gagal beruntun mencabut penugasan.${t.pso === 0 ? ' <b class="text-amber-400">PSO baru terbuka di reputasi 80 (Standar).</b>' : ''}</p>
                    <div class="space-y-2">${pso}</div>
                </div>
                <div class="bg-gray-950/60 border border-gray-800 rounded-xl p-3">
                    <div class="flex justify-between items-center mb-1.5"><h4 class="text-[11px] font-black text-gray-400 uppercase tracking-wider"><i class="fa-solid fa-clock-rotate-left mr-1.5 text-gray-600"></i>Riwayat</h4><span class="text-[9px] text-gray-500">Tuntas ${kp.stat.done} &middot; Gagal ${kp.stat.fail} &middot; Premi ${fmtShort(kp.stat.prem)} &middot; Kompensasi ${fmtShort(kp.stat.comp)} &middot; Denda ${fmtShort(kp.stat.fine)}</span></div>
                    ${hist}</div>`;
            if (html === kpLastHtml) return;
            kpLastHtml = html; root.innerHTML = html;
        }
        setInterval(() => { if (currentAccount && currentTabId === 'tab-kontrak') kpRender(); }, 3000);
