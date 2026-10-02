        // ===== KEMITRAAN: izin, tagihan bulanan, blokir otomatis =====
        const DAY_MS = 86400000;
        const MITRA_CFG = { cycleDays: 30, graceDays: 10, izin: { BBM: 35e6, LPG: 60e6 }, ambil: { BBM: 17.5e6, LPG: 30e6 }, /* izin & ambil = BIAYA yang dibayar perusahaan */ bulanan: { BBM: 6e6, LPG: 10e6 }, setorCoco: { BBM: 1.5e6, LPG: 2.5e6 }, maxIzinBulan: 20 };
        let izinLog = { mi: -1, n: 0 };
        const miNow = () => Math.floor((gameNow() - GAME_START) / (MITRA_CFG.cycleDays * DAY_MS));
        let lastSetor = 0;
        const NAMA_MITRA = ['Maju Jaya', 'Berkah Energi', 'Sumber Rejeki', 'Karya Mandiri', 'Nusa Petro', 'Cahaya Utama', 'Mitra Sejahtera', 'Bumi Lestari', 'Sinar Timur', 'Tirta Abadi', 'Artha Prima', 'Gemilang Karya'];
        const dShort = ms => new Date(ms).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const jenisKey = s => s.has_lpg ? 'LPG' : 'BBM';
        function newMitra(s) {
            const k = jenisKey(s);
            return { nama: (Math.random() < 0.6 ? 'PT ' : 'CV ') + NAMA_MITRA[Math.floor(Math.random() * NAMA_MITRA.length)], bulanan: MITRA_CFG.bulanan[k], rel: 0.6 + Math.random() * 0.37, due: gameNow() + MITRA_CFG.cycleDays * DAY_MS, telat: false, telatSejak: 0, lastDay: -1, lastTagih: -1, sejak: gameNow(), total: 0 };
        }
        function renderInvestorTab() { renderMitraSearch(); renderMitraActive(); }
        // Tab wilayah di menu Mitra: 'ALL' = semua, selain itu = nama kota/region persis (field region SPBU).
        let mitraRegion = 'ALL';
        const regShort = r => String(r).replace(/\s*\(.*\)\s*$/, '');
        function setMitraRegion(r) { mitraRegion = r; renderMitraSearch(); }
        function renderMitraSearch() {
            const c = document.getElementById('investor-spbu-list'); if (!c) return;
            const tabs = document.getElementById('mitra-region-tabs');
            const q = (document.getElementById('mitra-q').value || '').toLowerCase().trim(), jf = document.getElementById('mitra-lpg').value;
            const match = x => !x.is_approved && x.tipe === 'DODO' && (jf === 'ALL' || jenisKey(x) === jf) && (!q || `${x.region} ${x.provinsi} ${x.nama} ${x.kode}`.toLowerCase().includes(q));
            // Hitung per wilayah: total SPBU, yang sudah aktif, dan yang masih menunggu izin (sesuai filter di atas).
            const stat = new Map();
            loadedSpbuList.forEach(x => {
                let st = stat.get(x.region); if (!st) { st = { total: 0, aktif: 0, tersedia: 0 }; stat.set(x.region, st); }
                st.total++; if (x.is_approved) st.aktif++; if (match(x)) st.tersedia++;
            });
            if (mitraRegion !== 'ALL' && !stat.has(mitraRegion)) mitraRegion = 'ALL';
            const totalTersedia = [...stat.values()].reduce((n, st) => n + st.tersedia, 0);
            const chip = (key, label, n, dim) => `<button onclick="setMitraRegion(decodeURIComponent('${encodeURIComponent(key)}'))" title="${esc(key)}" class="shrink-0 px-2 py-1 rounded-md border text-[10px] font-bold ${mitraRegion === key ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-pink-500/60'} ${dim && mitraRegion !== key ? 'opacity-50' : ''}">${esc(label)} <span class="${mitraRegion === key ? 'text-pink-100' : 'text-pink-400'}">${n}</span></button>`;
            if (tabs) tabs.innerHTML = chip('ALL', 'Semua', totalTersedia, false) + [...stat].map(([r, st]) => chip(r, regShort(r), st.tersedia, st.tersedia === 0)).join('');
            const all = loadedSpbuList.filter(x => match(x) && (mitraRegion === 'ALL' || x.region === mitraRegion));
            const list = mitraRegion === 'ALL' ? all.slice(0, q ? 30 : 10) : all;
            const kuota = `<div class="text-[10px] text-pink-300 bg-pink-500/10 border border-pink-500/30 rounded px-2 py-1">Kuota izin bulan ini: ${izinLog.mi === miNow() ? izinLog.n : 0}/${MITRA_CFG.maxIzinBulan}</div>`;
            let info = '';
            if (mitraRegion !== 'ALL') {
                const st = stat.get(mitraRegion), dB = depoOfRegion(mitraRegion, 'BBM'), dL = depoOfRegion(mitraRegion, 'LPG');
                const depoTxt = d => d ? `${esc(d.nama)} ${d.is_unlocked ? '<span class="text-emerald-400">(aktif)</span>' : '<span class="text-red-400">(belum dibuka)</span>'}` : '<span class="text-red-400">tidak ada depo</span>';
                info = `<div class="text-[10px] text-gray-300 bg-gray-900 border border-gray-800 rounded px-2 py-1.5"><b class="text-pink-300">${esc(regShort(mitraRegion))}</b>: ${st.total} SPBU &middot; ${st.aktif} aktif &middot; ${st.tersedia} menunggu izin<br>Depo BBM: ${depoTxt(dB)} &middot; Depo LPG: ${depoTxt(dL)}</div>`;
            }
            if (!list.length) { c.innerHTML = kuota + info + '<div class="empty-state"><i class="fa-solid fa-magnifying-glass"></i>Tidak ada lokasi tersedia untuk pilihan ini.</div>'; return; }
            c.innerHTML = kuota + info + list.map(x => { const k = jenisKey(x); return `<div class="p-2.5 bg-gray-900 rounded-lg border border-gray-800 flex justify-between items-center gap-2">
                <div class="min-w-0"><div class="text-[10px] text-purple-400 font-bold">${x.kode} <span class="${x.has_lpg ? 'text-amber-400' : 'text-gray-400'}">&middot; ${x.jenis === 'SPPBE' ? 'SPPBE (LPG)' : x.has_lpg ? 'SPBU + LPG' : 'SPBU tanpa LPG'}</span></div>
                <div class="font-bold text-gray-200 text-xs truncate">${esc(x.nama)}</div><div class="text-[10px] text-gray-400">${esc(x.region)} &middot; ${esc(x.provinsi || '')}</div>
                <div class="text-[10px] text-amber-400">Biaya izin ${formatRupiah(MITRA_CFG.izin[k])} &middot; Iuran ${formatRupiah(MITRA_CFG.bulanan[k])}/bln</div></div>
                <button onclick="approveMitra('${x.kode}')" class="shrink-0 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-[10px] font-bold shadow">Setujui</button></div>`; }).join('')
                + (all.length > list.length ? `<div class="text-[10px] text-gray-500 text-center">Menampilkan ${list.length} dari ${all.length}. Pilih tab wilayah untuk melihat semuanya.</div>` : '');
        }
        function approveMitra(kode) {
            if (pphBlokir()) return;
            const x = loadedSpbuList.find(v => v.kode === kode); if (!x || x.is_approved) return;
            const k = jenisKey(x), fee = MITRA_CFG.izin[k];
            if (izinLog.mi !== miNow()) izinLog = { mi: miNow(), n: 0 };
            if (izinLog.n >= MITRA_CFG.maxIzinBulan) return showModal('Kuota Izin Habis', `Maksimal ${MITRA_CFG.maxIzinBulan} izin mitra baru per bulan game. Coba lagi bulan depan.`, 'fa-ban', 'red');
            if (companyCash < fee) return showModal('Kas Tidak Cukup', `Biaya izin mitra ${x.nama} adalah ${formatRupiah(fee)}. Kas perusahaan tidak mencukupi.`, 'fa-triangle-exclamation', 'red');
            izinLog.n++;
            x.is_approved = true; x.blocked = false; x.mitra = newMitra(x); x.mitra.total = 0;
            companyCash -= fee; totalExpense += fee; addFinanceLog(`Biaya izin mitra ${x.mitra.nama} - ${x.nama}`, -fee); updateCashDisplay();
            renderSpbuOnMap(); populateSpbuDropdowns(); renderInvestorTab();
            map.flyTo([x.lat, x.lon], 11);
            addLog(`PERIZINAN DISETUJUI: ${x.nama} (${x.mitra.nama}) aktif di peta. Biaya izin ${formatRupiah(fee)} dibayar.`, 'purple');
            showModal('Kemitraan Disetujui', `${x.nama} (${x.mitra.nama}) kini aktif${x.has_lpg ? ' dengan outlet LPG' : ''}. Biaya izin ${formatRupiah(fee)} dibayar; iuran ${formatRupiah(x.mitra.bulanan)}/bulan jatuh tempo ${dShort(x.mitra.due)}.`, 'fa-circle-check', 'purple');
        }
        function revokeMitra(x) {
            x.blocked = true; x.blockedAt = gameNow();
            orders.filter(o => o.kode === x.kode).forEach(o => closeOrder(o, 'Batal'));
            addLog(`LISENSI DICABUT: ${x.nama} (${x.mitra.nama}) menunggak lebih dari ${MITRA_CFG.graceDays} hari. SPBU diblokir, operasional OFF.`, 'warning');
            notify(`Lisensi ${x.nama} dicabut & diblokir (tunggakan > ${MITRA_CFG.graceDays} hari). Bisa diambil alih di tab Mitra.`, 'warn');
            renderSpbuOnMap(); populateSpbuDropdowns(); renderInvestorTab();
        }
        function tagihMitra(kode) {
            const x = loadedSpbuList.find(v => v.kode === kode), m = x && x.mitra; if (!m || !m.telat || x.blocked) return;
            const day = Math.floor(gameNow() / DAY_MS); if (m.lastTagih === day) return showModal('Sudah Ditagih', 'Penagihan hanya bisa 1x per hari game.', 'fa-clock', 'purple');
            m.lastTagih = day;
            if (Math.random() < 0.5) { payMitra(x, true); showModal('Tagihan Dibayar', `${m.nama} melunasi tunggakan setelah ditagih.`, 'fa-circle-check', 'purple'); }
            else showModal('Belum Dibayar', `${m.nama} berjanji membayar, tetapi belum ada pembayaran.`, 'fa-hourglass-half', 'purple');
            renderMitraActive();
        }
        function payMitra(x, late) {
            const m = x.mitra; companyCash += m.bulanan; totalIncome += m.bulanan; m.total += m.bulanan;
            addFinanceLog(`Iuran bulanan ${m.nama} - ${x.nama}${late ? ' (terlambat)' : ''}`, m.bulanan);
            m.telat = false; m.due = (late ? gameNow() : m.due) + MITRA_CFG.cycleDays * DAY_MS; updateCashDisplay();
        }
        async function takeOverSpbu(kode) {
            if (pphBlokir()) return;
            const x = loadedSpbuList.find(v => v.kode === kode); if (!x || !x.blocked) return;
            const fee = MITRA_CFG.ambil[jenisKey(x)];
            if (companyCash < fee) return showModal('Kas Tidak Cukup', `Biaya ambil alih ${x.nama} adalah ${formatRupiah(fee)}. Kas perusahaan tidak mencukupi.`, 'fa-triangle-exclamation', 'red');
            if (!(await showConfirm(`Ambil alih ${x.nama} seharga ${formatRupiah(fee)}? Tunggakan mitra dihapus, SPBU menjadi milik perusahaan dan dikelola swasta.`, { title: 'Ambil Alih SPBU', iconClass: 'fa-hand-holding-dollar', theme: 'blue', okLabel: 'Bayar & Ambil Alih' }))) return;
            if (companyCash < fee) return;
            companyCash -= fee; totalExpense += fee; addFinanceLog(`Biaya ambil alih ${x.nama}`, -fee); updateCashDisplay();
            x.mitraLama = x.mitra && x.mitra.nama; delete x.mitra; x.blocked = false; x.tipe = 'COCO'; x.taken = true;
            addLog(`AMBIL ALIH: ${x.nama} kini milik perusahaan & dikelola swasta. Biaya ${formatRupiah(fee)} dibayar.`, 'success');
            renderSpbuOnMap(); populateSpbuDropdowns(); renderInvestorTab();
            showModal('Berhasil Diambil Alih', `${x.nama} aktif kembali sebagai SPBU perusahaan (dikelola swasta) dan memberi setoran bulanan.`, 'fa-circle-check', 'blue');
        }
        function tickMitra() {
            const now = gameNow(), day = Math.floor(now / DAY_MS);
            loadedSpbuList.forEach(x => {
                const m = x.mitra; if (!m || !isOp(x)) return;
                if (!m.telat && now >= m.due) {
                    if (Math.random() < m.rel) payMitra(x, false);
                    else { m.telat = true; m.telatSejak = m.due; m.lastDay = day; addLog(`TUNGGAKAN: ${m.nama} (${x.nama}) belum membayar iuran ${formatRupiah(m.bulanan)}.`, 'warning'); notify(`${m.nama} menunggak iuran ${x.nama}. Batas ${MITRA_CFG.graceDays} hari sebelum lisensi dicabut.`, 'warn'); }
                } else if (m.telat) {
                    if (now - m.telatSejak > MITRA_CFG.graceDays * DAY_MS) return revokeMitra(x);
                    if (m.lastDay !== day) { m.lastDay = day; if (Math.random() < 0.2) payMitra(x, true); }
                }
            });
            const mi = miNow();
            if (mi > lastSetor) {
                const bln = mi - lastSetor, gaji = Math.round(companyCrew.reduce((n, c) => n + (ECO[ROLE_META[c.role].salary][0] + c.reputation * ECO[ROLE_META[c.role].salary][1]), 0) * bln);
                if (gaji > 0) { companyCash -= gaji; totalExpense += gaji; addFinanceLog(`Gaji kru (${companyCrew.length} orang, ${bln} bulan)`, -gaji); addLog(`GAJI KRU: ${formatRupiah(gaji)} dibayarkan untuk ${companyCrew.length} kru.`, 'info'); updateCashDisplay(); }
                const own = loadedSpbuList.filter(x => isOp(x) && x.tipe === 'COCO'); let tot = 0;
                own.forEach(x => tot += MITRA_CFG.setorCoco[jenisKey(x)] * (mi - lastSetor));
                lastSetor = mi;
                if (tot > 0) { companyCash += tot; totalIncome += tot; addFinanceLog(`Setoran pengelola swasta (${own.length} SPBU milik perusahaan)`, tot); addLog(`PENDAPATAN SPBU: setoran pengelola swasta ${formatRupiah(tot)} dari ${own.length} SPBU.`, 'success'); updateCashDisplay(); }
            }
            if (!document.getElementById('tab-partnership').classList.contains('hidden')) renderMitraActive();
        }
        function renderMitraActive() {
            const c = document.getElementById('mitra-active-list'); if (!c) return;
            const ms = loadedSpbuList.filter(x => x.mitra && x.is_approved), now = gameNow();
            const act = ms.filter(x => !x.blocked && !x.mitra.telat).length, tel = ms.filter(x => !x.blocked && x.mitra.telat).length, blk = ms.filter(x => x.blocked).length;
            const own = loadedSpbuList.filter(x => isOp(x) && x.tipe === 'COCO'), est = own.reduce((n, x) => n + MITRA_CFG.setorCoco[jenisKey(x)], 0);
            const kpi = (l, v, cl) => `<div class="stat-chip"><div class="stat-chip-label">${l}</div><div class="stat-chip-value ${cl}">${v}</div></div>`;
            document.getElementById('mitra-kpi').innerHTML = kpi('Aktif', act, 'text-emerald-400') + kpi('Menunggak', tel, 'text-amber-400') + kpi('Diblokir', blk, 'text-red-400')
                + `<div class="col-span-3 text-[10px] text-gray-400 bg-gray-900 rounded-lg p-2 border border-gray-800">SPBU milik perusahaan (dikelola swasta): <b class="text-blue-400">${own.length}</b> &middot; estimasi setoran <b class="text-emerald-400">${formatRupiah(est)}</b>/bulan</div>`;
            const order = x => x.blocked ? 0 : x.mitra.telat ? 1 : 2;
            c.innerHTML = ms.length ? ms.sort((a, b) => order(a) - order(b)).map(x => {
                const m = x.mitra; let badge, extra = '', btn = '';
                if (x.blocked) { badge = '<span class="text-red-400 font-bold">DIBLOKIR</span>'; extra = `<div class="text-[10px] text-red-300">Lisensi dicabut ${dShort(x.blockedAt)} &middot; operasional off</div>`; btn = `<button onclick="takeOverSpbu('${x.kode}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Ambil Alih &middot; ${formatRupiah(MITRA_CFG.ambil[jenisKey(x)])}</button>`; }
                else if (m.telat) { const d = Math.floor((now - m.telatSejak) / DAY_MS); badge = `<span class="text-amber-400 font-bold">MENUNGGAK ${d}/${MITRA_CFG.graceDays} hari</span>`; extra = `<div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1"><div class="bg-red-500 h-full" style="width:${Math.min(100, d / MITRA_CFG.graceDays * 100)}%"></div></div>`; btn = `<button onclick="tagihMitra('${x.kode}')" class="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-[10px] font-bold">Tagih</button>`; }
                else { badge = '<span class="text-emerald-400 font-bold">AKTIF</span>'; extra = `<div class="text-[10px] text-gray-500">Tagihan berikut ${dShort(m.due)} &middot; ${formatRupiah(m.bulanan)}</div>`; }
                return `<div class="p-2.5 bg-gray-900 rounded-lg border ${x.blocked ? 'border-red-500/50' : 'border-gray-800'} flex justify-between items-center gap-2"><div class="min-w-0 flex-1"><div class="text-[10px]">${badge} <span class="text-gray-500">&middot; ${esc(m.nama)}${x.jenis === 'SPPBE' ? ' &middot; SPPBE' : x.has_lpg ? ' &middot; +LPG' : ''}</span></div><div class="font-bold text-gray-200 text-xs truncate">${esc(x.nama)}</div><div class="text-[10px] text-gray-400">${esc(x.region)}</div>${extra}</div>${btn}</div>`;
            }).join('') : '<div class="text-xs text-gray-500 text-center py-3">Belum ada mitra. Setujui izin di atas.</div>';
        }
        setInterval(() => { if (currentAccount) tickMitra(); }, 3000);

        // DASHBOARD 1: TAB KHUSUS FISIK ARMADA
        // Susun satu kartu armada (dipakai di dalam kelompok jenis+pangkalan pada renderFleetDashboard)
        // ===== Status surat kendaraan (KIR, STNK, Plat, Balik Nama) =====
        const docDays = ts => Math.ceil((ts - gameNow()) / DAY_MS);
        function docChip(ts) {
            const d = docDays(ts);
            if (d <= 0) return '<span class="px-2 py-0.5 rounded border font-bold text-red-300 bg-red-500/10 border-red-500/40"><i class="fa-solid fa-circle-xmark mr-1"></i>Kedaluwarsa</span>';
            if (d < 30) return `<span class="px-2 py-0.5 rounded border font-bold text-amber-300 bg-amber-500/10 border-amber-500/40"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Segera habis (${d} Hari)</span>`;
            return `<span class="px-2 py-0.5 rounded border font-bold text-emerald-300 bg-emerald-500/10 border-emerald-500/40"><i class="fa-solid fa-check mr-1"></i>Aktif (${d} Hari)</span>`;
        }
        // 'bad' = ada dokumen kedaluwarsa, 'warn' = segera habis / belum balik nama, 'ok' = semua beres
        function suratState(t) {
            const days = [t.kirTs, t.stnkTs, t.platTs].map(docDays);
            if (days.some(d => d <= 0)) return 'bad';
            if (days.some(d => d < 30) || perluBalikNama(t)) return 'warn';
            return 'ok';
        }
        function suratNote(t) {
            const n = [t.kirTs, t.stnkTs, t.platTs].filter(ts => docDays(ts) <= 0).length;
            if (n) return `${n} dokumen kedaluwarsa`;
            if (perluBalikNama(t)) return 'Belum balik nama';
            if ([t.kirTs, t.stnkTs, t.platTs].some(ts => docDays(ts) < 30)) return 'Ada yang segera habis';
            return 'Lengkap';
        }

        // DASHBOARD 1: TAB KHUSUS FISIK ARMADA
        // Satu kartu armada, ringkas: baris label-nilai. Surat (KIR/STNK/Plat/Balik Nama) dibuka lewat tombol surat.
        function fleetCardHtml(trk) {
                const isKapalCard = trk.kelas === 'kapal';
                // Kapal: pangkalan efektif (depo ber-dermaga atau anjungan); truk: depo bermekanik seperti biasa.
                const depot = isKapalCard ? shipBaseOf(trk) : (refineryData.find(k => k.id === trk.depotId) || refineryData[0]);
                const baseTakSah = isKapalCard && !shipBaseOk(shipBaseEntity(trk.depotId));
                const depotOptions = isKapalCard ? shipBaseOptionsHtml(trk.depotId, depot.id) : refineryData.filter(k => k.is_unlocked && k.mekanikId)
                    .map(k => `<option value="${k.id}" ${k.id === trk.depotId ? 'selected' : ''}>${esc(k.nama)}</option>`).join('');
                const row = (l, v) => `<div class="flex justify-between items-center gap-2"><span class="text-gray-400">${l}</span><span class="text-right">${v}</span></div>`;
                const isKapal = trk.kelas === 'kapal', st = suratState(trk), belum = perluBalikNama(trk);
                const stCls = { ok: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', warn: 'text-amber-300 border-amber-500/50 bg-amber-500/10', bad: 'text-red-300 border-red-500/50 bg-red-500/10' }[st];
                const dot = { ok: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-red-500' }[st];

                return `<div class="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
                    <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                        <div class="min-w-0">
                            <span class="text-[10px] font-mono bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-800">${esc(trk.id)}</span>
                            <h4 class="font-bold text-gray-200 text-xs inline-block ml-1.5">${esc(trk.name)}</h4>
                            ${trk.limitedId ? `<div class="text-[10px] font-black uppercase tracking-wide text-yellow-300 mt-1"><i class="fa-solid fa-gem mr-1"></i>Limited Edition &middot; No. ${esc(trk.limitedSerial)}</div>` : ''}
                            ${trk.julukan ? `<div class="text-[11px] text-amber-300 font-semibold mt-1"><i class="fa-solid fa-signature mr-1 text-amber-400/70"></i>"${esc(trk.julukan)}"</div>` : ''}
                        </div>
                        <span class="shrink-0 font-mono font-bold text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">${esc(trk.plat)}</span>
                    </div>

                    <div class="bg-gray-950 p-2.5 rounded-lg border border-gray-800 space-y-1.5 text-[11px]">
                        ${row(isKapal ? 'Jarak Tempuh:' : 'Odometer:', `<b class="text-gray-200 font-mono">${trk.odometer.toLocaleString('id-ID')} km</b>`)}
                        ${row(isKapal ? 'Kondisi Mesin:' : 'Ban:', `<b class="${banCls(trk.banPct)} font-mono">${trk.banPct}%</b>`)}
                        <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden"><div class="${banBar(trk.banPct)} h-full" style="width:${trk.banPct}%"></div></div>
                        ${isKapal ? shipStatusBlock(trk) : truckFuelHtml(trk)}
                        ${row('Pangkalan:', `<b class="text-teal-300">${depot ? esc(depot.nama) : '-'}</b>${depot && depot.anjungan ? ' <span class="text-[9px] text-sky-300 border border-sky-500/40 rounded px-1 py-0.5 ml-1">Anjungan</span>' : ''}${baseTakSah ? ' <span class="text-[9px] text-amber-400 border border-amber-500/40 rounded px-1 py-0.5 ml-1">Pangkalan lama tak sah, dipakai Tuban</span>' : ''}`)}
                        ${row('Atas Nama:', `<b class="${belum ? 'text-amber-400' : 'text-gray-200'}">${esc(trk.pemilik || '-')}</b>${belum ? ' <span class="text-[9px] text-amber-400 border border-amber-500/40 rounded px-1 py-0.5 ml-1">Belum balik nama</span>' : ''}`)}
                        <div class="text-[9px] text-gray-500">${isKapal ? `Kapal diservis otomatis begitu sandar di depot kalau kondisi mesin &le;${SHIP_SERVICE_AT}% (${formatRupiah(shipServiceCost(trk))}).` : `Ban otomatis diganti kru bengkel begitu tiba di depot kalau sisa &le;${TIRE_REPLACE_THRESHOLD}%.`}</div>
                    </div>

                    <div class="flex gap-1.5 text-[10px]">
                        <input id="julukan-${esc(trk.id)}" type="text" maxlength="24" value="${esc(trk.julukan || '')}" placeholder="Julukan unit (opsional)" class="min-w-0 flex-1 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-gray-200 font-sans">
                        <button onclick="simpanJulukan('${esc(trk.id)}')" class="shrink-0 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded px-2.5 py-1 font-sans">Simpan</button>
                    </div>
                    <div class="flex gap-1.5 text-[10px]">
                        <select id="depot-sel-${esc(trk.id)}" class="min-w-0 flex-1 bg-gray-950 border border-gray-700 rounded px-1 py-1 text-gray-200 font-sans">${depotOptions}</select>
                        <button onclick="pindahDepot('${esc(trk.id)}')" class="shrink-0 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded px-2.5 py-1 font-sans">Pindah ${formatRupiah(DEPOT_MOVE_FEE)}</button>
                    </div>

                    <div class="pt-1 border-t border-gray-800 flex gap-1.5">
                        <button onclick="openSuratModal('${esc(trk.id)}')" title="${docLbl(trk).tombol}" class="relative flex-1 min-w-0 border ${stCls} font-semibold py-1.5 rounded-lg text-[11px] transition hover:brightness-125">
                            <i class="fa-solid fa-envelope-open-text mr-1.5"></i>Surat &middot; ${suratNote(trk)}
                            <span class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${dot} ${st === 'ok' ? 'hidden' : ''}"></span>
                        </button>
                        ${busyIds.has(trk.id)
                            ? `<button disabled title="Sedang bertugas" class="shrink-0 px-3 bg-gray-800/60 text-gray-500 rounded-lg text-[11px] cursor-not-allowed"><i class="fa-solid fa-truck-fast"></i></button>`
                            : belum
                            ? `<button disabled title="Belum balik nama, tidak bisa dijual" class="shrink-0 px-3 bg-gray-800/60 text-gray-500 rounded-lg text-[11px] cursor-not-allowed"><i class="fa-solid fa-lock"></i></button>`
                            : `<button onclick="openSellModal('${esc(trk.id)}')" title="Jual (Bursa P2P / Instan ke Server)" class="shrink-0 px-3 bg-orange-600/90 hover:bg-orange-600 text-white rounded-lg text-[11px] transition"><i class="fa-solid fa-right-left"></i></button>`}
                    </div>
                </div>`;
        }

        // ===== Modal Surat Kendaraan =====
        let suratModalId = null;
        function openSuratModal(id) {
            if (!companyFleet.some(t => t.id === id)) return;
            suratModalId = id; renderSuratModal();
            document.getElementById('surat-kendaraan-modal').classList.remove('hidden');
        }
        function closeSuratModal() {
            suratModalId = null;
            document.getElementById('surat-kendaraan-modal').classList.add('hidden');
        }
        function renderSuratModal() {
            const box = document.getElementById('surat-kendaraan-body'); if (!box || !suratModalId) return;
            const t = companyFleet.find(x => x.id === suratModalId);
            if (!t) return closeSuratModal();   // unit sudah terjual / keluar garasi
            const belum = perluBalikNama(t), L = docLbl(t);
            const hd = document.getElementById('surat-kendaraan-head'); if (hd) hd.textContent = L.head;
            const btn = (cls, onclick, label, disabled) => `<button ${disabled ? 'disabled' : `onclick="${onclick}"`} class="w-full mt-2 ${disabled ? 'bg-gray-800/60 text-gray-500 cursor-not-allowed' : cls} font-bold py-2 rounded-lg text-[11px] transition">${label}</button>`;
            const card = (icon, title, chip, extra, action) => `<div class="bg-gray-950 border border-gray-800 rounded-xl p-3">
                <div class="flex justify-between items-center gap-2 text-xs"><span class="font-bold text-gray-200"><i class="fa-solid ${icon} mr-1.5 text-gray-500"></i>${title}</span><span class="text-[10px]">${chip}</span></div>
                ${extra ? `<div class="text-[10px] text-gray-400 mt-1.5">${extra}</div>` : ''}${action}</div>`;
            document.getElementById('surat-kendaraan-title').textContent = `${t.id} \u00b7 ${t.plat}`;
            document.getElementById('surat-kendaraan-sub').textContent = t.name;
            box.innerHTML =
                card('fa-file-signature', `Balik Nama (${L.bpkb})`,
                    belum ? '<span class="px-2 py-0.5 rounded border font-bold text-amber-300 bg-amber-500/10 border-amber-500/40"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Belum</span>'
                          : '<span class="px-2 py-0.5 rounded border font-bold text-emerald-300 bg-emerald-500/10 border-emerald-500/40"><i class="fa-solid fa-check mr-1"></i>Atas nama PT Anda</span>',
                    `Atas nama: <b class="text-gray-200">${esc(t.pemilik || '-')}</b>${belum ? '<br>Unit bekas Bursa P2P. Selama belum balik nama, unit tidak bisa dijual ke Bursa P2P maupun Instan ke Server.' : ''}`,
                    belum ? btn('bg-amber-600 hover:bg-amber-700 text-white', `balikNama('${esc(t.id)}')`, `<i class="fa-solid fa-file-signature mr-1.5"></i>Balik Nama ${formatRupiah(balikNamaCost(t))}`) : '') +
                card('fa-clipboard-check', L.kirCard, docChip(t.kirTs),
                    `Berlaku hingga ${dShort(t.kirTs)}${t.kirPending ? `<br><span class="text-amber-400"><i class="fa-solid fa-hourglass-half mr-1"></i>Diverifikasi ${L.badan}, selesai ${fmtTime(t.kirPending)}</span>` : ''}`,
                    btn('bg-gray-800 hover:bg-gray-700 text-gray-200', `renewDoc('${esc(t.id)}','kir')`, t.kirPending ? `Sedang Diproses ${L.badan}` : `Kirim ke ${L.badan} ${formatRupiah(kirRenewCost(t))}`, !!t.kirPending)) +
                card('fa-id-card', L.stnkCard, docChip(t.stnkTs), `Berlaku hingga ${dShort(t.stnkTs)}`,
                    btn('bg-gray-800 hover:bg-gray-700 text-gray-200', `renewDoc('${esc(t.id)}','stnk')`, `Perpanjang ${formatRupiah(stnkRenewCost(t))}`)) +
                card('fa-rectangle-list', L.platCard, docChip(t.platTs), `Berlaku hingga ${dShort(t.platTs)}`,
                    btn('bg-gray-800 hover:bg-gray-700 text-gray-200', `renewDoc('${esc(t.id)}','plat')`, `Perpanjang ${formatRupiah(platRenewCost(t))}`));
        }

        function simpanJulukan(truckId) {
            const t = companyFleet.find(x => x.id === truckId), inp = document.getElementById('julukan-' + truckId); if (!t || !inp) return;
            t.julukan = cleanJulukan(inp.value);
            addLog(t.julukan ? `JULUKAN: ${t.id} [${t.plat}] kini dijuluki "${t.julukan}".` : `JULUKAN: julukan ${t.id} [${t.plat}] dihapus.`, 'info');
            if (typeof refreshTruckTips === 'function') refreshTruckTips(truckId);   // label julukan di peta ikut berubah
            populateTruckDropdowns(); renderFleetDashboard(); saveGame();
        }

        // Struktur Armada: lokasi (Kilang Tuban / Depo Cabang) -> kelompok jenis unit -> kartu.
        // Urutan kelompok SAMA di kedua lokasi supaya rapi: Truk BBM, Truk LPG, Truk BBL (antar depo), Kapal.
        const FLEET_GROUPS = [
            { key: 'truk-bbm', label: 'Truk BBM', icon: 'fa-truck', match: t => isSpbuTruck(t) && t.type === 'BBM' },
            { key: 'truk-lpg', label: 'Truk LPG', icon: 'fa-truck-ramp-box', match: t => isSpbuTruck(t) && t.type === 'LPG' },
            { key: 'truk-depo', label: 'Truk BBL (Antar Depo)', icon: 'fa-oil-can', match: t => t.kelas === 'depo' },
            { key: 'kapal', label: 'Kapal', icon: 'fa-ship', match: t => t.kelas === 'kapal' }
        ];
        const fleetDepotOf = trk => trk.kelas === 'kapal' ? shipBaseOf(trk) : (refineryData.find(k => k.id === trk.depotId && k.is_unlocked) || null);   // kapal: pangkalan efektif (bisa anjungan)
        const fleetLocOf = trk => { const d = fleetDepotOf(trk); return d && d.id === 'KILANG-01' ? 'TUBAN' : 'CABANG'; };
        let fleetLocTab = null, fleetDepotFilter = 'ALL';
        function setFleetLoc(key) { fleetLocTab = key; fleetDepotFilter = 'ALL'; renderFleetDashboard(); }
        function setFleetDepot(key) { fleetDepotFilter = key; renderFleetDashboard(); }
        function renderFleetDashboard() {
            const container = document.getElementById('fleet-list-container');
            const locTabs = document.getElementById('fleet-cat-tabs'), depotTabs = document.getElementById('fleet-depot-tabs');
            if (!companyFleet.length) {
                locTabs.innerHTML = ''; depotTabs.innerHTML = '';
                container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-truck-fast"></i>Belum punya armada. Beli truk di tab Dealer Armada (biaya KIR, STNK &amp; plat ikut dibayar).</div>';
                if (suratModalId) renderSuratModal(); return;
            }
            const refOrderIdx = refineryData.map(k => k.id);
            const nTuban = companyFleet.filter(t => fleetLocOf(t) === 'TUBAN').length, nCabang = companyFleet.length - nTuban;
            if (fleetLocTab === null) fleetLocTab = nTuban ? 'TUBAN' : 'CABANG';

            // Tab lokasi
            locTabs.innerHTML = [{ key: 'TUBAN', label: 'Kilang Tuban', icon: 'fa-industry', n: nTuban }, { key: 'CABANG', label: 'Depo Cabang / Anjungan', icon: 'fa-warehouse', n: nCabang }].map(c =>
                `<button onclick="setFleetLoc('${c.key}')" class="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-bold border transition ${fleetLocTab === c.key ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'}"><i class="fa-solid ${c.icon}"></i><span>${c.label}</span><span class="font-mono text-[10px] opacity-80">(${c.n})</span></button>`
            ).join('');

            const inLoc = companyFleet.filter(t => fleetLocOf(t) === fleetLocTab);

            // Chip cabang: hanya di tab Depo Cabang
            let depotKeys = [];
            const depotNama = new Map();
            if (fleetLocTab === 'CABANG') {
                inLoc.forEach(t => { const d = fleetDepotOf(t), k = d ? d.id : 'IDLE'; if (!depotNama.has(k)) depotNama.set(k, d ? d.nama : 'Idle (belum ada pangkalan valid)'); });
                const ordIx = k => { const i = refOrderIdx.indexOf(k); return i < 0 ? 999 : i; };   // anjungan (bukan di refineryData) setelah depo
                depotKeys = [...depotNama.keys()].sort((a, b) => (a === 'IDLE' ? 1 : b === 'IDLE' ? -1 : ordIx(a) - ordIx(b)));
                if (fleetDepotFilter !== 'ALL' && !depotNama.has(fleetDepotFilter)) fleetDepotFilter = 'ALL';
                depotTabs.innerHTML = [{ key: 'ALL', label: 'Semua Cabang' }, ...depotKeys.map(k => ({ key: k, label: depotNama.get(k) }))].map(c =>
                    `<button onclick="setFleetDepot('${c.key}')" class="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${fleetDepotFilter === c.key ? 'bg-teal-600 border-teal-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'}">${esc(c.label)}</button>`
                ).join('');
            } else depotTabs.innerHTML = '';

            // Satu blok kelompok jenis unit (Truk BBM / LPG / BBL / Kapal) berisi kartu
            const groupsHtml = list => FLEET_GROUPS.map(g => {
                const u = list.filter(g.match); if (!u.length) return '';
                return `<div class="space-y-2">
                    <div class="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gray-200 border-b border-gray-700 pb-1">
                        <i class="fa-solid ${g.icon} text-cyan-400"></i><span>${g.label}</span><span class="ml-auto font-mono text-[10px] bg-gray-900 border border-gray-800 rounded-full px-2 py-0.5 normal-case text-gray-400">${u.length} unit</span>
                    </div>
                    <div class="space-y-2.5">${u.map(fleetCardHtml).join('')}</div>
                </div>`;
            }).join('');

            let html;
            if (fleetLocTab === 'TUBAN') html = groupsHtml(inLoc);
            else html = depotKeys.filter(k => fleetDepotFilter === 'ALL' || k === fleetDepotFilter).map(k => {
                const list = inLoc.filter(t => { const d = fleetDepotOf(t); return (d ? d.id : 'IDLE') === k; });
                return `<div class="space-y-3">
                    <div class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${k === 'IDLE' ? 'text-amber-400' : 'text-teal-400'}">
                        <i class="fa-solid ${k === 'IDLE' ? 'fa-triangle-exclamation' : String(k).indexOf('AN_') === 0 ? 'fa-oil-well' : 'fa-warehouse'}"></i><span>${esc(depotNama.get(k))}</span><span class="ml-auto font-mono text-[10px] text-gray-500 normal-case">${list.length} unit</span>
                    </div>
                    ${groupsHtml(list)}
                </div>`;
            }).join('');
            container.innerHTML = html || `<div class="text-xs text-gray-500 text-center py-4">${fleetLocTab === 'TUBAN' ? 'Belum ada armada berpangkalan di Kilang Tuban.' : 'Belum ada armada di depo cabang / anjungan.'}</div>`;
            if (suratModalId) renderSuratModal();   // modal surat yang sedang terbuka ikut segar
        }

        // ===== SISTEM REPUTASI KRU =====
        let crewIdCounter = 10;
        let recruitRole = 'Supir';
        let candidatePool = { Supir: [], Kernet: [], Mekanik: [], Nahkoda: [], ABK: [] };

        // Metadata generik per role - dipusatkan di sini biar nambah role baru (Nahkoda/ABK utk kapal)
        // gak perlu ubah ternary di banyak tempat.
        const ROLE_META = {
            Supir:   { salary: 'gajiSupir',   hireBase: 1000000, hirePer: 40000, idPrefix: 'DRV-', icon: 'fa-id-card' },
            Kernet:  { salary: 'gajiKernet',  hireBase: 600000,  hirePer: 20000, idPrefix: 'KRN-', icon: 'fa-user-gear' },
            Mekanik: { salary: 'gajiMekanik', hireBase: 800000,  hirePer: 30000, idPrefix: 'MEK-', icon: 'fa-screwdriver-wrench' },
            Nahkoda: { salary: 'gajiNahkoda', hireBase: 1200000, hirePer: 45000, idPrefix: 'NHK-', icon: 'fa-user-tie' },
            ABK:     { salary: 'gajiABK',     hireBase: 650000,  hirePer: 22000, idPrefix: 'ABK-', icon: 'fa-anchor' }
        };

        const FIRST_NAMES = ['Eko','Setyo','Hendra','Deni','Bambang','Rudi','Agus','Slamet','Wahyu','Dimas','Yusuf','Heru','Bayu','Rizal','Joko','Andi','Fajar','Tono','Rian','Gunawan','Purnomo','Anwar','Imam','Taufik','Hadi','Sugeng'];
        const LAST_NAMES = ['Prasetyo','Budiman','Wijaya','Raharjo','Sukoco','Hartono','Santoso','Saputra','Kurniawan','Nugroho','Utomo','Wibowo','Firmansyah','Setiawan','Susanto','Hidayat','Mulyadi','Suryanto'];

        function repToStars(rep) { return Math.min(5, Math.max(1, Math.round(rep / 20))); }

        function repInfo(rep) {
            if (rep >= 85) return { label: 'Sangat Terpercaya', text: 'text-emerald-400', bar: 'bg-emerald-500' };
            if (rep >= 70) return { label: 'Terpercaya', text: 'text-blue-400', bar: 'bg-blue-500' };
            if (rep >= 50) return { label: 'Cukup', text: 'text-amber-400', bar: 'bg-amber-500' };
            if (rep >= 30) return { label: 'Buruk', text: 'text-orange-400', bar: 'bg-orange-500' };
            return { label: 'Sangat Buruk', text: 'text-red-400', bar: 'bg-red-500' };
        }

        // Peluang pelanggaran per tugas: makin rendah reputasi, makin besar risikonya
        function violationChance(rep) {
            if (rep >= 90) return 0.02;
            if (rep >= 75) return 0.06;
            if (rep >= 60) return 0.15;
            if (rep >= 40) return 0.28;
            return 0.42;
        }

        function riskLabel(rep) {
            const ch = violationChance(rep);
            if (ch <= 0.06) return { label: 'Risiko Rendah', cls: 'text-emerald-400', icon: 'fa-shield-halved' };
            if (ch <= 0.15) return { label: 'Risiko Sedang', cls: 'text-amber-400', icon: 'fa-eye' };
            return { label: 'Risiko Tinggi', cls: 'text-red-400', icon: 'fa-triangle-exclamation' };
        }

        // Harga rekrut: makin tinggi reputasi, makin mahal
        function hireCost(role, rep) {
            const m = ROLE_META[role];
            return Math.round((m.hireBase + rep * m.hirePer) / 50000) * 50000;
        }

        // ===== REKRUTMEN KRU: KANDIDAT =====
        const KOTA = ['Surabaya','Malang','Sidoarjo','Gresik','Tuban','Bojonegoro','Ngawi','Madiun','Kediri','Jember','Banyuwangi','Probolinggo','Pasuruan','Lamongan','Mojokerto','Situbondo'];
        const SKILLS = { Supir: ['Mengemudi','Disiplin','Keselamatan'], Kernet: ['Ketelitian','Stamina','Disiplin'], Mekanik: ['Servis Mesin','Kelistrikan','Ketelitian'],
                         Nahkoda: ['Navigasi','Kepemimpinan','Disiplin'], ABK: ['Stamina','Ketelitian','Kerja Tim'] };
        const TAGS = {
            Supir: ['SIM B2 Umum','Diklat Defensive Driving','Sertifikat Angkutan B3','Hafal Jalur Pantura','Terbiasa Tol Trans-Jawa'],
            Kernet: ['Sertifikat K3 Dasar','Cekatan Bongkar Muat','Paham Prosedur Segel','Pernah Kerja di SPBU','Terlatih APAR'],
            Mekanik: ['Sertifikat Mekanik Diesel','Bengkel Resmi Terlatih','Spesialis Tangki BBM','Pengalaman Kilang/Depo','K3 Bengkel'],
            Nahkoda: ['ANT (Ahli Nautika)','Sertifikat BST','Hafal Jalur Pelayaran Nusantara','Pengalaman Kapal Tanker','Radar & GPS Bersertifikat'],
            ABK: ['Sertifikat BST Dasar','Cekatan Tambat Kapal','Paham Prosedur Muatan B3 Laut','Pernah Berlayar Antar Pulau','Terlatih Alat Keselamatan Laut']
        };
        const AVATAR = ['bg-purple-600','bg-blue-600','bg-emerald-600','bg-amber-600','bg-rose-600','bg-cyan-600','bg-indigo-600'];
        const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
        const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
        // Papan Bursa Kerja: tiap peran maksimal 4 kandidat ACAK (reputasi rendah sampai tinggi) dengan tombol Tolak / Terima.
        // Kandidat yang ditolak (atau diterima) meninggalkan slot kosong; 10 detik kemudian pelamar baru (rating acak) mengisinya.
        const CANDIDATE_BOARD_SIZE = 4, CANDIDATE_RESPAWN_MS = 10000;
        let candidatePending = { Supir: [], Kernet: [], Mekanik: [], Nahkoda: [], ABK: [] };   // waktu (ms) kapan pelamar baru datang, satu per slot kosong
        let candidateTick = null;
        let confirmCid = null;

        function generateCandidate(role) {
            const used = new Set([...companyCrew.map(c => c.name), ...candidatePool[role].map(c => c.name)]);
            let name, guard = 0;
            do {
                name = FIRST_NAMES[rnd(0, FIRST_NAMES.length - 1)] + ' ' + LAST_NAMES[rnd(0, LAST_NAMES.length - 1)];
                guard++;
            } while (used.has(name) && guard < 50);
            if (used.has(name)) name += ' ' + 'ABCDEFGHJKLMNPRSTW'[rnd(0, 17)] + '.';
            const base = rnd(18, 96);
            const skills = SKILLS[role].map(() => clamp(base + rnd(-12, 12)));
            const reputation = Math.round(skills.reduce((a, b) => a + b, 0) / skills.length);
            const exp = clamp(Math.round((base - 15) / 7) + rnd(0, 3), 0, 25);
            const tags = [...TAGS[role]].sort(() => Math.random() - 0.5).slice(0, base > 70 ? 3 : base > 45 ? 2 : 1);
            return { cid: 'CND-' + (++crewIdCounter), name, role, reputation, skills, exp, tags,
                     age: 19 + exp + rnd(0, 9), kota: KOTA[rnd(0, KOTA.length - 1)], cost: hireCost(role, reputation) };
        }

        // Pelamar baru yang waktunya sudah tiba masuk ke papan. Mengembalikan true kalau ada yang masuk.
        function fillDueCandidates(role) {
            const now = Date.now(), pool = candidatePool[role]; let changed = false;
            candidatePending[role] = candidatePending[role].filter(t => {
                if (t <= now && pool.length < CANDIDATE_BOARD_SIZE) { pool.push(generateCandidate(role)); changed = true; return false; }
                return true;
            });
            return changed;
        }
        // Papan awal: langsung 4 kandidat acak. Slot yang sedang menunggu pelamar baru tidak diisi duluan.
        function ensureCandidatePool(role) {
            fillDueCandidates(role);
            while (candidatePool[role].length + candidatePending[role].length < CANDIDATE_BOARD_SIZE) candidatePool[role].push(generateCandidate(role));
        }
        function scheduleCandidate(role) { candidatePending[role].push(Date.now() + CANDIDATE_RESPAWN_MS); }

        // Hasil satu tugas: pelanggaran -> reputasi turun; sukses -> reputasi naik perlahan
        function applyTripResult(member) {
            member.trips += 1;
            if (Math.random() < violationChance(member.reputation)) {
                const drop = 6 + Math.floor(Math.random() * 7); // -6 s/d -12
                member.reputation = Math.max(0, member.reputation - drop);
                member.violations += 1;
                return { violated: true, drop: drop };
            }
            member.reputation = Math.min(100, member.reputation + 1);
            return { violated: false, drop: 0 };
        }

        // DASHBOARD 2: TAB KHUSUS SDM DRIVER
        function renderDriversDashboard() {
            const container = document.getElementById('driver-list-container');
            container.innerHTML = '';
            if (!companyCrew.length) container.innerHTML = '<div class="text-xs text-gray-500 text-center py-4">Belum ada supir &amp; kernet. Klik Rekrut untuk merekrut kru sebelum bisa mengirim BBM/LPG.</div>';

            companyCrew.forEach(c => {
                const rep = Math.round(c.reputation);
                const info = repInfo(rep);
                const risk = riskLabel(rep);
                const sev = fireSeverance(c);
                const stars = '★'.repeat(repToStars(rep)) + '☆'.repeat(5 - repToStars(rep));
                const violationBadge = c.violations === 0
                    ? `<span class="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-bold"><i class="fa-solid fa-shield-halved mr-1"></i> Bebas Pelanggaran</span>`
                    : `<span class="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${c.violations} Pelanggaran Tercatat</span>`;

                const card = document.createElement('div');
                card.className = 'bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2';
                card.innerHTML = `
                    <div class="flex justify-between items-center border-b border-gray-800 pb-2">
                        <div>
                            <span class="text-[10px] font-mono bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800">${c.id}</span>
                            ${c.awal ? '<span class="text-[9px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded ml-1.5">Kru Awal</span>' : ''}
                            <h4 class="font-bold text-gray-200 text-xs inline-block ml-1.5">${c.name} (${c.role})</h4>
                        </div>
                        <span class="text-amber-400 font-mono font-bold text-xs">${stars}</span>
                    </div>
                    <div>
                        <div class="flex justify-between text-[10px] mb-1">
                            <span class="text-gray-400">Reputasi: <b class="${info.text}">${rep}/100 - ${info.label}</b></span>
                            <span class="${risk.cls}"><i class="fa-solid ${risk.icon} mr-1"></i>${risk.label}</span>
                        </div>
                        <div class="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div class="h-full ${info.bar}" style="width:${rep}%"></div></div>
                    </div>
                    ${c.kota ? `<div class="text-[10px] text-gray-500">${c.age} th &middot; ${c.kota} &middot; ${c.exp} th pengalaman</div>` : ''}
                    ${c.role === 'Mekanik' ? `<div class="text-[10px] ${c.kilangId ? 'text-emerald-400' : 'text-amber-400'}"><i class="fa-solid fa-screwdriver-wrench mr-1"></i>${c.kilangId ? 'Bertugas di ' + ((refineryData.find(k => k.id === c.kilangId) || {}).nama || '-') : 'Belum ditugaskan - tugaskan di tab Kilang'}</div>` : ''}
                    <div class="text-[10px] pt-1">
                        <span class="text-gray-400 mr-2">Total Rute: <b>${c.trips} Pengiriman</b></span>
                        ${violationBadge}
                    </div>
                    <div class="pt-2 border-t border-gray-800 space-y-1.5">
                        ${fireId === c.id ? `
                        <div class="text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
                            Pecat <b>${c.name}</b>? ${sev > 0 ? `Pesangon <b class="font-mono">${formatRupiah(sev)}</b> akan dibayar.` : 'Reputasi buruk: <b>tanpa pesangon</b> (PHK tidak hormat).'}
                            ${companyCrew.filter(x => x.role === c.role).length === 1 ? `<br><i class="fa-solid fa-triangle-exclamation mr-1"></i>Ini ${c.role} terakhir Anda, dispatch tidak bisa dilakukan sebelum merekrut lagi.` : ''}
                        </div>
                        <div class="flex gap-1.5 justify-end">
                            <button onclick="cancelFire()" class="px-2.5 py-1 rounded text-[10px] font-bold bg-gray-800 hover:bg-gray-700 text-gray-300">Batal</button>
                            <button onclick="fireCrew('${c.id}')" class="px-2.5 py-1 rounded text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white">Ya, Pecat</button>
                        </div>` : `
                        <div class="flex items-center justify-between text-[10px]">
                            <span class="text-gray-500">Pesangon jika dipecat: <b class="font-mono ${sev > 0 ? 'text-gray-300' : 'text-emerald-400'}">${sev > 0 ? formatRupiah(sev) : 'Rp 0'}</b></span>
                            <button onclick="askFire('${c.id}')" class="px-2.5 py-1 rounded text-[10px] font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition"><i class="fa-solid fa-user-slash mr-1"></i>Pecat</button>
                        </div>`}
                    </div>
                `;
                container.appendChild(card);
            });
        }

        // ===== SISTEM PECAT KRU =====
        let fireId = null;
        // Pesangon: dasar per peran + bonus masa kerja. Reputasi < 30 = PHK tidak hormat (tanpa pesangon)
        function fireSeverance(c) {
            if (Math.round(c.reputation) < 30) return 0;
            const base = c.role === 'Supir' ? 1500000 : c.role === 'Mekanik' ? 900000 : 750000;
            return Math.round((base + c.trips * 40000) / 50000) * 50000;
        }
        function askFire(id) { fireId = id; renderDriversDashboard(); }
        function cancelFire() { fireId = null; renderDriversDashboard(); }
        function fireCrew(id) {
            const idx = companyCrew.findIndex(c => c.id === id);
            if (idx === -1) return;
            const c = companyCrew[idx];
            if (busyIds.has(c.id)) { showModal('Masih Bertugas', `${c.name} sedang dalam perjalanan. Tunggu sampai tiba sebelum dipecat.`, 'fa-truck-fast', 'red'); fireId = null; renderDriversDashboard(); return; }
            const sev = fireSeverance(c);
            if (companyCash < sev) {
                showModal('Kas Tidak Cukup', `Pesangon ${c.name} sebesar ${formatRupiah(sev)} belum bisa dibayar.`, 'fa-circle-xmark', 'red');
                return;
            }
            fireId = null;
            companyCash -= sev;
            totalExpense += sev;
            companyCrew.splice(idx, 1);
            if (c.role === 'Mekanik' && c.kilangId) {
                const k = refineryData.find(x => x.id === c.kilangId);
                if (k && k.mekanikId === c.id) { k.mekanikId = null; renderRefineries(); }
            }
            if (sev > 0) addFinanceLog(`Pesangon PHK ${c.role.toUpperCase()} (${c.name})`, -sev);
            addLog(`PHK: ${c.name} (${c.role}) dipecat${sev > 0 ? ', pesangon ' + formatRupiah(sev) : ' tanpa pesangon (reputasi buruk)'}.`, 'warning');
            updateCashDisplay();
            populateCrewDropdowns();
            renderDriversDashboard();
            renderCandidateList();
            renderFleetDashboard();
        }

        // ===== MODAL REKRUT (BURSA KERJA) =====
        function askHire(cid) { confirmCid = cid; renderCandidateList(); }
        function cancelHire() { confirmCid = null; renderCandidateList(); }

        function openRecruitModal(role) {
            confirmCid = null;
            ['Supir', 'Kernet', 'Mekanik', 'Nahkoda', 'ABK'].forEach(r => ensureCandidatePool(r));
            if (role) recruitRole = role;
            document.getElementById('recruit-status').classList.add('hidden');
            document.getElementById('recruit-modal').classList.remove('hidden');
            renderCandidateList();
            if (!candidateTick) candidateTick = setInterval(recruitTick, 1000);
        }
        function closeRecruitModal() {
            document.getElementById('recruit-modal').classList.add('hidden');
            if (candidateTick) { clearInterval(candidateTick); candidateTick = null; }
        }
        // Tiap detik: pelamar baru yang sudah tiba dimasukkan; hitung mundur di kartu kosong diperbarui tanpa merender ulang seluruh daftar.
        function recruitTick() {
            let arrivedHere = false;
            Object.keys(candidatePending).forEach(r => { if (fillDueCandidates(r) && r === recruitRole) arrivedHere = true; });
            if (arrivedHere) return renderCandidateList();
            document.querySelectorAll('#candidate-list [data-ready]').forEach(el => { el.textContent = Math.max(1, Math.ceil((+el.dataset.ready - Date.now()) / 1000)); });
        }
        function rejectCandidate(cid) {
            const pool = candidatePool[recruitRole], idx = pool.findIndex(c => c.cid === cid);
            if (idx === -1) return;
            pool.splice(idx, 1); scheduleCandidate(recruitRole);
            if (confirmCid === cid) confirmCid = null;
            renderCandidateList();
        }
        function setRecruitRole(role) { recruitRole = role; confirmCid = null; renderCandidateList(); }

        function renderCandidateList() {
            document.getElementById('recruit-cash').innerText = formatRupiah(companyCash);
            ['Supir', 'Kernet', 'Mekanik', 'Nahkoda', 'ABK'].forEach(r => {
                const el = document.getElementById('recruit-tab-' + r);
                const n = companyCrew.filter(c => c.role === r).length;
                el.className = 'py-2 rounded-lg text-xs font-bold transition ' + (r === recruitRole ? 'bg-purple-600 text-white shadow' : 'bg-gray-800 text-gray-400 hover:bg-gray-700');
                el.innerHTML = `<i class="fa-solid ${ROLE_META[r].icon} mr-1.5"></i>${r} <span class="opacity-70 font-normal">(${n} di tim)</span>`;
            });
            fillDueCandidates(recruitRole);
            const list = candidatePool[recruitRole], pending = candidatePending[recruitRole];
            document.getElementById('recruit-sorts').innerHTML = `<span class="text-[10px] text-gray-500"><i class="fa-solid fa-shuffle mr-1"></i>${list.length} dari ${CANDIDATE_BOARD_SIZE} kandidat &middot; rating acak &middot; yang ditolak digantikan pelamar baru &plusmn;${CANDIDATE_RESPAWN_MS / 1000} detik</span>`;
            const container = document.getElementById('candidate-list');
            container.innerHTML = list.map(c => {
                const info = repInfo(c.reputation), risk = riskLabel(c.reputation);
                const chance = Math.round(violationChance(c.reputation) * 100);
                const canAfford = companyCash >= c.cost;
                const av = AVATAR[c.name.length % AVATAR.length];
                const stars = repToStars(c.reputation);
                const bars = c.skills.map((v, i) => `<div class="flex items-center gap-2 text-[10px]"><span class="w-16 text-gray-400 shrink-0">${SKILLS[c.role][i]}</span><div class="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden"><div class="h-full ${repInfo(v).bar}" style="width:${v}%"></div></div><span class="w-6 text-right font-mono text-gray-300">${v}</span></div>`).join('');
                const tags = c.tags.map(t => `<span class="text-[9px] text-gray-300 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">${t}</span>`).join('');
                const action = c.cid === confirmCid && canAfford
                    ? `<div class="flex gap-1"><button onclick="cancelHire()" class="px-2 py-1 rounded text-[10px] font-bold bg-gray-800 hover:bg-gray-700 text-gray-300">Batal</button><button onclick="hireCandidate('${c.cid}')" class="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white">Ya, Terima</button></div>`
                    : `<div class="flex gap-1.5"><button onclick="rejectCandidate('${c.cid}')" class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition border border-red-500/40 text-red-400 hover:bg-red-500/10">Tolak</button><button onclick="askHire('${c.cid}')" ${canAfford ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${canAfford ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}">${canAfford ? 'Terima' : 'Kas Kurang'}</button></div>`;
                return `<div class="bg-gray-950 border ${c.cid === confirmCid ? 'border-purple-500' : 'border-gray-800'} rounded-xl p-3 flex flex-col gap-2.5">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-full ${av} flex items-center justify-center font-bold text-sm shrink-0">${c.name.split(' ').map(w => w[0]).join('')}</div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-gray-100 truncate">${c.name}</div>
                            <div class="text-[10px] text-gray-400">${c.age} th &middot; ${c.kota} &middot; ${c.exp} th pengalaman</div>
                        </div>
                        <div class="text-right shrink-0">
                            <div class="text-amber-400 text-[11px]">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
                            <div class="text-[10px] font-bold ${info.text}">${c.reputation} &middot; ${info.label}</div>
                        </div>
                    </div>
                    <div class="space-y-1">${bars}</div>
                    <div class="flex flex-wrap gap-1">${tags}</div>
                    <div class="flex items-center justify-between gap-2 pt-2 border-t border-gray-800 mt-auto">
                        <div>
                            <div class="text-[10px] ${risk.cls}"><i class="fa-solid ${risk.icon} mr-1"></i>${risk.label} &middot; ${chance}% pelanggaran/tugas</div>
                            <div class="font-mono font-bold text-emerald-400 text-xs">${formatRupiah(c.cost)}</div>
                        </div>
                        ${action}
                    </div>
                </div>`;
            }).join('') + pending.map(t => `<div class="bg-gray-950/40 border border-dashed border-gray-800 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 min-h-[9rem] text-center">
                    <i class="fa-solid fa-user-clock text-gray-600 text-xl"></i>
                    <div class="text-[11px] text-gray-400">Pelamar baru datang dalam <b class="font-mono text-purple-300" data-ready="${t}">${Math.max(1, Math.ceil((t - Date.now()) / 1000))}</b> dtk</div>
                </div>`).join('');
        }

        function hireCandidate(cid) {
            if (pphBlokir()) return;
            const pool = candidatePool[recruitRole];
            const idx = pool.findIndex(c => c.cid === cid);
            if (idx === -1) return;
            const cand = pool[idx];
            if (companyCash < cand.cost) {
                showModal('Kas Tidak Cukup', `Biaya rekrutmen ${cand.name} adalah ${formatRupiah(cand.cost)}!`, 'fa-circle-xmark', 'red');
                return;
            }
            confirmCid = null;
            companyCash -= cand.cost;
            totalExpense += cand.cost;
            pool.splice(idx, 1);
            scheduleCandidate(recruitRole);   // slot kosong diisi pelamar baru (acak) beberapa detik lagi

            crewIdCounter++;
            companyCrew.push({
                id: ROLE_META[cand.role].idPrefix + crewIdCounter,
                name: cand.name, role: cand.role, reputation: cand.reputation,
                violations: 0, status: cand.role === 'Mekanik' ? 'Belum Ditugaskan' : 'Siap Bertugas', trips: 0,
                age: cand.age, exp: cand.exp, kota: cand.kota, kilangId: null
            });

            addFinanceLog(`Rekrut ${cand.role.toUpperCase()} (${cand.name})`, -cand.cost);
            updateCashDisplay();
            populateCrewDropdowns();
            renderDriversDashboard();
            renderCandidateList();
            renderRefineries();
            const st = document.getElementById('recruit-status');
            st.textContent = cand.role === 'Mekanik'
                ? `✓ ${cand.name} berhasil direkrut sebagai Mekanik. Tugaskan ke salah satu kilang/depo di tab Kilang. Sisa kas ${formatRupiah(companyCash)}.`
                : `✓ ${cand.name} berhasil direkrut sebagai ${cand.role}. Sisa kas ${formatRupiah(companyCash)}.`;
            st.classList.remove('hidden');
            addLog(`REKRUT SDM: ${cand.name} bergabung sebagai ${cand.role} (Reputasi ${cand.reputation}) seharga ${formatRupiah(cand.cost)}.`, 'purple');
        }

        // Proses hasil tugas untuk supir + kernet, kembalikan denda & catatan
        function settleCrewResult(driver, kernet) {
            const notes = [];
            let fine = 0;
            const dRes = applyTripResult(driver);
            const kRes = applyTripResult(kernet);

            if (dRes.violated) {
                fine += 2000000;
                notes.push(`${driver.name} melanggar (terlambat/rute) - denda Rp 2jt, reputasi -${dRes.drop}`);
            } else {
                notes.push(`${driver.name} reputasi +1`);
            }
            if (kRes.violated) {
                fine += 500000;
                notes.push(`${kernet.name} lalai bongkar muat - denda Rp 500rb, reputasi -${kRes.drop}`);
            } else {
                notes.push(`${kernet.name} reputasi +1`);
            }
            return { fine, notes, violated: dRes.violated || kRes.violated };
        }

        // Kalau pesanan ini sudah "dikunci" ke armada tertentu (sedang kirim bertahap/nyicil, lihat settleTruckDelivery),
        // armada lain dilarang ikut mengambil sisanya sampai armada yang sama itu melunasi semuanya sendiri.
        function orderLockBlock(spbu, fuelId, truck) {
            const o = orders.find(x => x.kode === spbu.kode && x.fuel === fuelId && x.status === 'open');
            if (!o || !o.lockedTruckId || o.lockedTruckId === truck.id) return null;
            const lockedTruck = companyFleet.find(t => t.id === o.lockedTruckId);
            return `Pesanan ${spbu.nama} sedang dikirim bertahap oleh armada ${o.lockedTruckId}${lockedTruck ? ' [' + lockedTruck.name + ']' : ''}. Armada lain tidak bisa membantu sampai pesanan ini lunas - tunggu ${o.lockedTruckId} kembali dan kirim lagi pakai armada itu.`;
        }
        // Bisakah volume r dilunasi persis oleh kombinasi armada berkapasitas caps (boleh dipakai berulang)?
        // Dipakai supaya pengiriman bertahap tidak meninggalkan sisa pesanan yang tidak akan pernah muat di truk mana pun.
        function ordCanFill(r, caps) {
            const n = Math.round(r * 10);
            if (n <= 0) return true;
            const cs = caps.map(c => Math.round(c * 10)).filter(c => c > 0);
            const ok = new Array(n + 1).fill(false); ok[0] = true;
            for (let i = 1; i <= n; i++) for (const c of cs) if (c <= i && ok[i - c]) { ok[i] = true; break; }
            return ok[n];
        }
        // Cek kesesuaian ukuran truk vs sisa pesanan SPBU.
        // ATURAN: kapasitas truk TIDAK BOLEH melebihi sisa pesanan (pesanan 8 KL tidak bisa diangkut truk 32 KL).
        // Truk yang lebih kecil boleh kirim bertahap (nyicil), asalkan sisa setelahnya masih bisa dilunasi armada Anda,
        // dan hanya kalau tidak ada truk yang PAS (kapasitas = sisa) yang sedang nganggur.
        function truckSizeBlock(spbu, fuelId, truck, type) {
            const o = orders.find(x => x.kode === spbu.kode && x.fuel === fuelId);
            if (!o) return null; // tidak ada pesanan aktif buat kombinasi ini, tidak ada batasan
            const unit = type === 'LPG' ? 'Ton' : 'KL';
            const sisa = Math.round((o.kl - o.terkirim - (o.inTransit || 0)) * 10) / 10; // yang belum dikirim & belum dibawa armada lain
            if (sisa <= 0) return `Pesanan ${spbu.nama} sudah terpenuhi seluruhnya oleh armada yang sedang dalam perjalanan. Tidak perlu kirim lagi.`;
            if (truck.cap > sisa) return `Pesanan ${spbu.nama} hanya ${sisa} ${unit}, sedangkan ${truck.id} [${truck.name}] berkapasitas ${truck.cap} ${unit}. Muatan truk tidak boleh melebihi pesanan - pakai armada berkapasitas ${sisa} ${unit} atau lebih kecil.`;
            if (truck.cap === sisa) return null; // pas persis
            const caps = capsOf(type, truckDepoId(truck)); // hanya armada dari depo yang sama yang bisa menyicil pesanan ini
            if (ordCanFill(sisa, caps)) {
                const r = Math.round((sisa - truck.cap) * 10) / 10;
                if (!ordCanFill(r, caps)) return `Kalau ${truck.id} [${truck.cap} ${unit}] dikirim sekarang, sisa pesanan ${spbu.nama} tinggal ${r} ${unit} dan tidak akan muat di armada mana pun milik Anda (tidak boleh melebihi pesanan). Pakai armada dengan kapasitas yang pas dengan sisa ${sisa} ${unit}.`;
            }
            const better = companyFleet.find(t => t.type === type && isSpbuTruck(t) && truckDepoId(t) === truckDepoId(truck) && t.id !== truck.id && t.cap === sisa && !busyIds.has(t.id));
            if (!better) return null; // tidak ada truk yang pas & available - truk kecil boleh nyicil
            return `Sisa pesanan ${spbu.nama} tinggal ${sisa} ${unit}, dan armada ${better.id} [${better.name}] berkapasitas ${better.cap} ${unit} sedang tidak bertugas - pas buat melunasi sekali jalan. Gunakan ${better.id} dulu sebelum memakai ${truck.id} [${truck.cap} ${unit}] buat kirim bertahap.`;
        }

        // ===== DISPATCH OTOMATIS (BBM & LPG) =====
        // Pemain tidak lagi memilih wilayah/SPBU/armada/supir/kernet/jenis muatan secara manual. Sistem memilih sendiri:
        //  - PESANAN : pesanan terbuka (BBM atau LPG, sesuai tab) yang paling mendesak (stok SPBU paling tipis) dan benar-benar bisa
        //              dikirim sekarang. Kalau pemain menekan "Kirim" dari tab Pesanan SPBU, pesanan itu yang dicoba duluan (dispatchFocus).
        //  - WILAYAH : otomatis = Kilang/Depo wilayah SPBU tujuan (wilayahBbmNama / wilayahLpgNama).
        //  - JENIS   : BBM ikut yang dipesan SPBU; LPG memakai LPG Tabung (sesuai stok depo yang dipakai pickOrigin).
        //  - ARMADA  : truk (BBM/LPG) idle, dokumen sah, lolos aturan kunci pesanan & ukuran (truckSizeBlock), stok depo cukup.
        //              Prioritas kapasitas PAS dengan sisa pesanan, lalu kapasitas terbesar, lalu asal depo terdekat.
        //  - SUPIR / KERNET : yang sedang bebas dengan reputasi tertinggi (pelanggaran paling sedikit sebagai pemecah seri).
        // Hasilnya ditulis ke select tersembunyi #delivery-* / #lpg-* supaya dispatchToSpbu()/dispatchLPGToSpbu() & updateRouteEstimate()
        // tetap memakai jalur yang sama.
        const dispatchFocus = { BBM: null, LPG: null };
        const dispatchAutoLastKey = { BBM: '', LPG: '' };
        const DISPATCH_AUTO = {
            BBM: { pre: 'delivery', unit: 'KL', fuelOf: o => o.fuel !== 'lpg', ids: ['delivery-region-filter', 'delivery-spbu-select', 'delivery-truck-select', 'delivery-driver-select', 'delivery-kernet-select', 'delivery-fuel-type'] },
            LPG: { pre: 'lpg', unit: 'Ton', fuelOf: o => o.fuel === 'lpg', ids: ['lpg-spbu-select', 'lpg-truck-select', 'lpg-driver-select', 'lpg-kernet-select', 'lpg-type-select'] }
        };
        function planDispatchAuto(kind) {
            const cfg = DISPATCH_AUTO[kind], unit = cfg.unit;
            const openOrders = orders.filter(o => cfg.fuelOf(o) && isOrderDispatchable(o)
                && (() => { const sp = loadedSpbuList.find(x => x.kode === o.kode); return sp && isOp(sp) && (kind === 'LPG' ? sp.has_lpg : sp.jenis !== 'SPPBE'); })());
            if (dispatchFocus[kind] && !openOrders.some(o => o.id === dispatchFocus[kind])) dispatchFocus[kind] = null;
            if (!openOrders.length) return { ok: false, reason: `Belum ada pesanan ${kind} terbuka dari SPBU.`, tip: 'Sistem akan otomatis menyusun pengiriman begitu ada SPBU yang memesan.' };

            const stokLive = o => { const sp = loadedSpbuList.find(x => x.kode === o.kode); return sp && sp.stok ? sp.stok[o.fuel] : 0; };
            const queue = openOrders.slice().sort((a, b) => stokLive(a) - stokLive(b));
            if (dispatchFocus[kind]) { const i = queue.findIndex(o => o.id === dispatchFocus[kind]); if (i > 0) queue.unshift(queue.splice(i, 1)[0]); }

            const rep = c => (c.reputation || 0) * 1000 - (c.violations || 0);
            const bestCrew = role => companyCrew.filter(c => c.role === role && !busyIds.has(c.id)).sort((a, b) => rep(b) - rep(a))[0] || null;
            const driver = bestCrew('Supir'), kernet = bestCrew('Kernet');
            if (!driver || !kernet) {
                const kurang = [!driver ? 'Supir' : '', !kernet ? 'Kernet' : ''].filter(Boolean).join(' & ');
                return { ok: false, reason: `Tidak ada ${kurang} yang sedang bebas.`, tip: 'Tunggu kru yang bertugas kembali, atau rekrut di tab SDM.', pending: queue.length };
            }

            const idleTrucks = companyFleet.filter(t => t.type === kind && isSpbuTruck(t) && !busyIds.has(t.id) && !docExpired(t));
            for (const o of queue) {
                const spbu = loadedSpbuList.find(x => x.kode === o.kode);
                const kapKey = kind === 'LPG' ? 'lpg_tabung' : FUEL_KAP_KEY[o.fuel];
                const sisa = Math.round((o.kl - o.terkirim - (o.inTransit || 0)) * 10) / 10;
                const cands = idleTrucks.map(t => ({ t, origin: (truckWilayahBlock(t, spbu, kind) || orderLockBlock(spbu, o.fuel, t) || truckSizeBlock(spbu, o.fuel, t, kind)) ? null : pickOrigin(kind, spbu, t.cap, t, kapKey) }))
                    .filter(c => c.origin);
                if (!cands.length) continue;
                cands.sort((a, b) => ((b.t.cap === sisa) - (a.t.cap === sisa)) || (b.t.cap - a.t.cap) || (distKm(a.origin, spbu) - distKm(b.origin, spbu)));
                const { t: truck, origin } = cands[0];
                return { ok: true, kind, order: o, spbu, truck, driver, kernet, origin, fuelId: o.fuel, fuelLabel: kind === 'LPG' ? 'LPG Tabung' : fuelLabel(o.fuel), sisa, unit, pending: queue.length,
                    focusMiss: dispatchFocus[kind] && dispatchFocus[kind] !== o.id ? orders.find(x => x.id === dispatchFocus[kind]) : null };
            }
            // Ada pesanan tapi belum satupun yang bisa dikirim: jelaskan alasan pesanan paling mendesak.
            const u = orderUnitStatus(queue[0]);
            return { ok: false, reason: `Pesanan ${queue[0].nama} belum bisa dikirim: ${u.txt}.`, tip: u.tip || '', pending: queue.length };
        }

        function deliverySelectForce(id, value, text) {
            const el = document.getElementById(id); if (!el) return;
            if (value != null && value !== '' && !el.querySelector(`option[value="${String(value).replace(/"/g, '\\"')}"]`)) el.appendChild(new Option(text || value, value));
            el.value = value == null ? '' : value;
        }
        function renderDispatchAutoPlan(kind, plan) {
            const cfg = DISPATCH_AUTO[kind];
            const box = document.getElementById(cfg.pre + '-auto-plan'); if (!box) return;
            const btn = document.getElementById(cfg.pre + '-dispatch-btn');
            if (btn) btn.disabled = !plan.ok;
            if (!plan.ok) {
                box.innerHTML = `<div class="py-2.5 flex items-start gap-2 text-amber-300"><i class="fa-solid fa-hourglass-half mt-0.5"></i><div><div class="font-semibold">${esc(plan.reason)}</div>${plan.tip ? `<div class="text-[10px] text-gray-500 mt-0.5">${esc(plan.tip)}</div>` : ''}</div></div>`;
                return;
            }
            const { spbu, truck, driver, kernet, origin, sisa, unit } = plan;
            const stars = c => '\u2605'.repeat(repToStars(c.reputation));
            const row = (ic, col, label, val, sub) => `<div class="flex items-start justify-between gap-3 py-1.5 border-b border-gray-800/70 last:border-0"><span class="text-gray-500 shrink-0 whitespace-nowrap"><i class="fa-solid ${ic} ${col} w-4 text-center mr-1"></i>${label}</span><span class="text-right min-w-0"><span class="text-gray-100 font-semibold break-words">${val}</span>${sub ? `<span class="block text-[10px] text-gray-500">${sub}</span>` : ''}</span></div>`;
            const wNama = kind === 'LPG' ? spbu.wilayahLpgNama : spbu.wilayahBbmNama, wJarak = kind === 'LPG' ? spbu.wilayahLpgJarak : spbu.wilayahBbmJarak;
            const jarak = wJarak != null ? ` &middot; &plusmn;${wJarak} km` : '';
            box.innerHTML =
                row('fa-map-location-dot', 'text-sky-400', 'Wilayah', esc(wNama || '-'), `Kilang/Depo terdekat${jarak}`) +
                row('fa-gas-pump', 'text-emerald-400', 'Tujuan SPBU', `[${esc(spbu.kode)}] ${esc(spbu.nama)}`, `Pesanan tersisa ${sisa} ${unit}`) +
                row(kind === 'LPG' ? 'fa-fire-flame-simple' : 'fa-droplet', 'text-amber-400', kind === 'LPG' ? 'Jenis Muatan' : 'Jenis BBM', esc(plan.fuelLabel), `Muatan ${truck.cap} ${unit} &middot; asal ${esc(origin.nama)}`) +
                row('fa-truck', 'text-blue-400', 'Armada', `${esc(truck.id)} [${esc(truck.plat)}]`, esc(truck.name)) +
                row('fa-id-card', 'text-blue-400', 'Supir', esc(driver.name), `${stars(driver)} Rep ${Math.round(driver.reputation)} &middot; Viol ${driver.violations}`) +
                row('fa-user-gear', 'text-amber-400', 'Kernet', esc(kernet.name), `${stars(kernet)} Rep ${Math.round(kernet.reputation)} &middot; Viol ${kernet.violations}`) +
                (plan.pending > 1 ? `<div class="py-1.5 text-[10px] text-gray-500"><i class="fa-solid fa-list-ol mr-1"></i>${plan.pending - 1} pesanan ${kind} lain menunggu giliran.</div>` : '') +
                (plan.focusMiss ? `<div class="py-1.5 text-[10px] text-amber-400"><i class="fa-solid fa-circle-info mr-1"></i>Pesanan ${esc(plan.focusMiss.nama)} belum bisa dikirim sekarang, jadi sistem memilih pesanan lain yang siap.</div>` : '');
        }
        // Susun ulang rencana dispatch otomatis lalu sinkronkan ke select tersembunyi + estimasi rute. Aman dipanggil berulang.
        function refreshDispatchAuto(kind) {
            const cfg = DISPATCH_AUTO[kind], pre = cfg.pre;
            if (!document.getElementById(pre + '-auto-plan')) return { ok: false, reason: 'Belum siap.' };
            let plan;
            try { plan = planDispatchAuto(kind); } catch (e) { console.error('planDispatchAuto', e); plan = { ok: false, reason: 'Gagal menyusun rencana otomatis.', tip: String(e && e.message || e) }; }
            const snap = () => cfg.ids.map(i => (document.getElementById(i) || {}).value).join('|');
            const before = snap();
            if (kind === 'BBM') deliverySelectForce('delivery-region-filter', 'ALL');
            if (plan.ok) {
                deliverySelectForce(pre + '-spbu-select', plan.spbu.kode, `[${plan.spbu.kode}] ${plan.spbu.nama}`);
                deliverySelectForce(pre + '-truck-select', plan.truck.id, `${plan.truck.id} [${plan.truck.plat}] - ${plan.truck.name}`);
                deliverySelectForce(pre + '-driver-select', plan.driver.id, plan.driver.name);
                deliverySelectForce(pre + '-kernet-select', plan.kernet.id, plan.kernet.name);
                if (kind === 'BBM') deliverySelectForce('delivery-fuel-type', plan.fuelLabel);
                else deliverySelectForce('lpg-type-select', 'Tabung 3kg'); // label muatan saja; stok yang dipakai tetap LPG Tabung (lpg_tabung)
            } else {
                ['-spbu-select', '-truck-select', '-driver-select', '-kernet-select'].forEach(x => deliverySelectForce(pre + x, ''));
            }
            renderDispatchAutoPlan(kind, plan);
            const key = plan.ok ? [plan.spbu.kode, plan.truck.id, plan.fuelId].join('|') : 'none';
            if (snap() !== before || key !== dispatchAutoLastKey[kind]) {
                dispatchAutoLastKey[kind] = key;
                if (!plan.ok) {
                    routeEstimateSeq[pre]++; // buang hasil estimasi async lama supaya tidak menimpa pesan kosong ini
                    const box = document.getElementById(pre + '-route-estimate');
                    if (box) box.innerHTML = 'Menunggu rencana pengiriman otomatis.';
                } else updateRouteEstimate(pre);
            }
            return plan;
        }
        // Dipanggil dari semua tempat yang me-refresh dropdown/pesanan: perbarui rencana BBM dan LPG sekaligus.
        function refreshDeliveryAuto() { refreshDispatchAuto('LPG'); return refreshDispatchAuto('BBM'); }

        // ===== DISPATCHER OTOMATIS (Pass Dasar ke atas) =====
        // Memakai rencana yang sama dengan tombol Kirim (planDispatchAuto), tapi berangkat langsung tanpa modal Surat Jalan.
        // Jalan berulang sampai tidak ada lagi pasangan pesanan+truk idle+kru bebas (jadi sebanyak truk yang idle).
        // Nomor Surat Jalan tetap diterbitkan & dicatat di log. Tidak jalan saat tab tidak aktif (jam game juga dijeda).
        let autoDispatchOn = true, autoDispatchBusy = false;
        function autoDispatchRun(kind) {
            let n = 0;
            for (let guard = 0; guard < 200; guard++) {
                let plan; try { plan = planDispatchAuto(kind); } catch (e) { console.error('autoDispatch', e); break; }
                if (!plan.ok) break;
                const { spbu, truck, driver, kernet, origin } = plan, lpg = kind === 'LPG';
                const d = { spbu, truck, driver, kernet, origin, jenisMuatan: lpg ? 'Tabung 3kg' : plan.fuelLabel, kapKey: lpg ? 'lpg_tabung' : FUEL_KAP_KEY[plan.fuelId], hargaPerUnit: lpg ? ECO.jualTon : hargaJualKl(plan.fuelId), silent: true };
                const no = generateNomorSuratJalan(kind);
                notifyAsalBeda(truck, origin, d.jenisMuatan);
                settleTruckDelivery(no, d); n++;
                addLog(`DISPATCHER OTOMATIS: ${no} - ${truck.id} [${driver.name}] membawa ${plan.fuelLabel} ke ${spbu.nama}.`, 'info', 'truck');
                if (!busyIds.has(truck.id)) break; // pengaman: kalau truk tidak jadi berangkat, jangan berputar terus
            }
            return n;
        }
        function tickAutoDispatch() {
            renderAutoDispatchBar();
            if (!autoDispatchOn || !passHas('dispatch') || autoDispatchBusy || document.hidden || pphUtang > 0) return; // menunggak PPh: dispatcher otomatis ikut berhenti (tanpa modal)
            autoDispatchBusy = true;
            try { autoDispatchRun('LPG'); autoDispatchRun('BBM'); } finally { autoDispatchBusy = false; }
        }
        function toggleAutoDispatch() { autoDispatchOn = !autoDispatchOn; renderAutoDispatchBar(); addLog(`DISPATCHER OTOMATIS ${autoDispatchOn ? 'DINYALAKAN' : 'DIMATIKAN'}.`, 'info'); }
        function renderAutoDispatchBar() {
            const bar = document.getElementById('auto-dispatch-bar'); if (!bar) return;
            const has = passHas('dispatch');
            bar.innerHTML = `<div class="flex items-center gap-2 min-w-0"><i class="fa-solid fa-robot ${has && autoDispatchOn ? 'text-emerald-400' : 'text-gray-500'}"></i><div class="min-w-0"><div class="text-[11px] font-bold text-gray-200">Dispatcher Otomatis</div><div class="text-[10px] text-gray-500">${has ? (autoDispatchOn ? 'Aktif: truk idle otomatis mengambil pesanan SPBU.' : 'Dimatikan: kirim manual lewat tombol Kirim.') : 'Butuh Pass Dasar atau lebih tinggi.'}</div></div></div>`
                + (has ? `<button onclick="toggleAutoDispatch()" class="shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg ${autoDispatchOn ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-gray-700 hover:bg-gray-600'} text-white">${autoDispatchOn ? 'ON' : 'OFF'}</button>` : '');
        }

        // DISPATCH BBM - Tahap 1: validasi pilihan lalu buka Surat Jalan untuk ditandatangani
        function dispatchToSpbu() {
            if (pphBlokir()) return;
            // Semua pilihan ditentukan otomatis (lihat planDispatchAuto). Hitung ulang saat tombol ditekan supaya data selalu segar.
            const plan = refreshDispatchAuto('BBM');
            if (!plan.ok) return showModal('Belum Bisa Dispatch', plan.reason + (plan.tip ? ' ' + plan.tip : ''), 'fa-circle-info', 'amber');
            const kodeSpbu = document.getElementById('delivery-spbu-select').value;
            const truckId = document.getElementById('delivery-truck-select').value;
            const driverId = document.getElementById('delivery-driver-select').value;
            const kernetId = document.getElementById('delivery-kernet-select').value;
            const fuelType = document.getElementById('delivery-fuel-type').value;

            const spbu = loadedSpbuList.find(s => s.kode === kodeSpbu);
            if (spbu && spbu.blocked) return showModal('SPBU Diblokir', 'Lisensi SPBU ini dicabut. Operasional dihentikan.', 'fa-ban', 'red');
            const truck = companyFleet.find(t => t.id === truckId);
            const driver = companyCrew.find(c => c.id === driverId);
            const kernet = companyCrew.find(c => c.id === kernetId);

            if (!spbu || !truck || !driver || !kernet) {
                showModal('Peringatan', 'Lengkapi pilihan SPBU, Armada Truk, Supir & Kernet!', 'fa-circle-exclamation', 'red');
                return;
            }
            if (busyCheck(truck, driver, kernet)) return;
            if (docBlock(truck)) return;
            const fBBM = FUELS.find(x => x.label === fuelType);
            const lockMsg = fBBM ? orderLockBlock(spbu, fBBM.id, truck) : null;
            if (lockMsg) return showModal('Pesanan Terkunci', lockMsg, 'fa-lock', 'red');
            const sizeMsg = fBBM ? truckSizeBlock(spbu, fBBM.id, truck, 'BBM') : null;
            if (sizeMsg) return showModal('Pakai Armada yang Lebih Pas', sizeMsg, 'fa-truck-ramp-box', 'red');
            const kapKey = fBBM && FUEL_KAP_KEY[fBBM.id];
            { const wb = truckWilayahBlock(truck, spbu, 'BBM'); if (wb) return showModal('Beda Wilayah Depo', wb, 'fa-map-location-dot', 'red'); }
            const origin = pickOrigin('BBM', spbu, truck.cap, truck, kapKey);
            if (!origin) return showModal('Stok Kilang Kurang', `Depo pangkalan ${truck.id} (${depoNamaOf(truckDepoId(truck))}) tidak punya stok ${fuelType} (jadi) cukup untuk ${truck.cap} KL. Olah dulu BBL mentah jadi ${fuelType} di tab Kilang (tombol Konversi), atau transfer stok ${fuelType} ke depo.`, 'fa-gas-pump', 'red');

            notifyAsalBeda(truck, origin, fuelType);
            const d = { spbu, truck, driver, kernet, origin, jenisMuatan: fuelType, kapKey, hargaPerUnit: hargaJualKl(fBBM && fBBM.id) };
            openSuratJalanModal({ mode: 'BBM', tujuanNama: spbu.nama, tujuanKode: spbu.kode, jenisMuatan: fuelType, volumeText: `${truck.cap} KL`, truck, driver, kernet,
                execute: (no) => {
                    settleTruckDelivery(no, d);
                    // Setelah truk berangkat, kembali ke daftar Pesanan SPBU (pesanan yang baru dikirim pindah ke daftar Proses di Riwayat).
                    dispatchFocus.BBM = null;
                    switchTab('tab-orders');
                } });
        }

