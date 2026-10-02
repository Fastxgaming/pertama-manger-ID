        // ===== UNIT LIMITED EDITION + PANEL OWNER (v2.0) =====
        // Katalog model ada di LIMITED_CATALOG (03-dealer-keuangan.js); efeknya dibaca lewat unitPerk() (06-rute-transport.js).
        // Server (Firestore) menjaga: tampil di dealer atau tidak, kuota, nomor seri, dan bukti kepemilikan (limited_units/{model}_{serial}).
        // Isi save TIDAK dipercaya: unit limited di save yang tidak punya dokumen sah (atau sudah dicabut) dibuang oleh limitedSync().
        let limitedModels = {};                 // { [modelId]: { active, quota, granted } } dari server
        let limitedMine = null;                 // null = belum ada data server; array = dokumen limited_units milik pemain ini
        let limitedFromCache = true;            // true = snapshot dari cache lokal (belum boleh dipakai untuk membuang unit)
        let limitedUnsubModels = null, limitedUnsubMine = null, limitedBuyBusy = false;

        function startLimitedListeners() {
            if (!window.fb || !currentAccount) return;
            if (!limitedUnsubModels) limitedUnsubModels = fb.listenLimitedModels(m => { limitedModels = m || {}; renderLimitedDealer(); if (isOwnerUser) renderOwnerModels(); });
            if (!limitedUnsubMine) limitedUnsubMine = fb.listenMyLimited(currentAccount.id, (docs, fromCache) => { limitedMine = docs; limitedFromCache = !!fromCache; limitedSync(); });
        }
        setInterval(() => { if (currentAccount && limitedMine) limitedSync(); }, 15000);   // lokal saja (tanpa baca Firestore): menyusul unit yang tertunda karena sibuk / save baru dimuat

        // Buat unit limited di armada (atau kembalikan yang sudah ada). Aman dipanggil berulang: dedup lewat limitedId.
        function limitedEnsureUnit(m, docId, serial, depot) {
            let u = companyFleet.find(t => t.limitedId === docId);
            if (u) return { unit: u, created: false };
            const dep = depot || refineryData.find(k => dealerDepotReady(k)) || refineryData[0];
            let no = companyFleet.length + 1;
            while (companyFleet.some(t => t.id === 'TRK-' + String(no).padStart(2, '0'))) no++;
            u = {
                id: 'TRK-' + String(no).padStart(2, '0'), name: m.name, cap: m.cap, type: m.type, kelas: 'truk', status: 'Sedia',
                plat: buatPlat('truk', dep.id), julukan: '', depotId: dep.id, odometer: 0, banPct: 100,
                fuelL: truckTankL({ cap: m.cap, kelas: 'truk' }), price: m.price,
                kirTs: gameNow() + 182 * 86400000, stnkTs: gameNow() + STNK_PERIOD, platTs: gameNow() + PLAT_PERIOD, kirPending: null,
                pemilikUid: currentAccount ? currentAccount.id : '', pemilik: currentAccount ? currentAccount.company : '',
                limited: m.id, limitedId: docId, limitedSerial: serial
            };
            companyFleet.push(u);
            spawnOrderForNewTruck(u);
            return { unit: u, created: true };
        }

        // Selaraskan armada dengan dokumen server: buang unit tidak sah/dicabut, terapkan pemberian owner, pulihkan unit yang hilang.
        function limitedSync() {
            if (limitedMine === null || !currentAccount) return;
            const byId = new Map(limitedMine.map(d => [d.id, d]));
            let changed = false;
            if (!limitedFromCache) {   // jangan membuang apa pun berdasarkan cache lokal yang mungkin kosong
                for (let i = companyFleet.length - 1; i >= 0; i--) {
                    const t = companyFleet[i];
                    if (!t.limited && !t.limitedId) continue;
                    const d = t.limitedId ? byId.get(t.limitedId) : null;
                    if (d && !d.revoked && d.model === t.limited) continue;
                    if (busyIds.has(t.id)) continue;   // sedang bertugas: dicoba lagi di sinkronisasi berikutnya
                    companyFleet.splice(i, 1); changed = true;
                    addLog(d && d.revoked ? `UNIT LIMITED DICABUT: ${t.id} [${t.plat}] ditarik oleh developer.` : `UNIT TIDAK SAH: ${t.id} [${t.plat}] tidak punya bukti kepemilikan server dan dihapus dari armada.`, 'error');
                }
            }
            limitedMine.forEach(d => {
                if (d.revoked) return;
                const m = limitedModel(d.model); if (!m) return;
                const r = limitedEnsureUnit(m, d.id, d.serial);
                if (r.created) {
                    changed = true;
                    if (d.src === 'owner' && !d.applied) {
                        addLog(`HADIAH LIMITED EDITION: ${m.name} No. ${d.serial} dari developer masuk garasi (${r.unit.id} [${r.unit.plat}]).`, 'success');
                        showModal('Hadiah dari Developer', `Unit <b>${esc(m.name)}</b> No. <b>${d.serial}</b> masuk garasimu: <b>${esc(r.unit.id)} [${esc(r.unit.plat)}]</b>.`, 'fa-gem', 'amber');
                    } else addLog(`UNIT LIMITED DIPULIHKAN: ${m.name} No. ${d.serial} (${r.unit.id}).`, 'success');
                }
                if (d.src === 'owner' && !d.applied) fb.markLimitedApplied(d.id).catch(e => console.warn('Tandai diterapkan gagal:', e));
            });
            if (changed) { populateTruckDropdowns(); renderFleetDashboard(); updateCashDisplay(); }
        }

        // ---------- Dealer (pemain) ----------
        function renderLimitedDealer() {
            const list = document.getElementById('dealer-limited-list'); if (!list) return;
            const avail = LIMITED_CATALOG.filter(m => limitedModels[m.id] && limitedModels[m.id].active);
            const tab = document.querySelector('[data-dcat="limited"]'); if (tab) tab.classList.toggle('hidden', !avail.length);
            if (!avail.length) {
                list.innerHTML = '';
                const p = document.querySelector('[data-dcat-panel="limited"]');
                if (p && !p.classList.contains('hidden') && typeof selectDealerCat === 'function') selectDealerCat('bbm');   // model dinonaktifkan saat panelnya terbuka
                return;
            }
            list.innerHTML = avail.map(m => {
                const sv = limitedModels[m.id], sisa = Math.max(0, (sv.quota || 0) - (sv.granted || 0)), habis = sisa <= 0;
                return `<div class="p-2.5 bg-gray-900 rounded-lg border border-yellow-500/30 flex justify-between items-center gap-2">
                    <div class="min-w-0">
                        <div class="font-bold text-yellow-200"><i class="fa-solid fa-gem mr-1 text-yellow-400"></i>${esc(m.short)}</div>
                        <div class="text-[10px] text-gray-400">${esc(m.axle)} &bull; ${esc(m.engine)}</div>
                        <div class="text-[10px] text-gray-500">${esc(m.capText)} &middot; Tangki BBM ${truckTankL(m)} L</div>
                        <div class="text-emerald-400 font-mono font-bold mt-0.5">${formatRupiah(m.price)}</div>
                        <div class="text-[10px] ${habis ? 'text-red-400' : 'text-yellow-300'} font-bold">${habis ? 'HABIS' : 'Sisa ' + sisa + ' dari ' + sv.quota + ' unit'}</div>
                    </div>
                    <button ${habis ? 'disabled' : ''} onclick="buyLimitedFromDealer('${m.id}')" class="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-950 px-3 py-1.5 rounded font-bold transition shrink-0">${habis ? 'Habis' : 'Beli Unit'}</button>
                </div>`;
            }).join('');
        }
        function buyLimitedFromDealer(id) {
            const m = limitedModel(id), sv = limitedModels[id];
            if (!m || !sv || !sv.active) return showModal('Tidak Tersedia', 'Unit ini sudah tidak dijual di dealer.', 'fa-gem', 'red');
            openDealerConfirm(m.name, m.cap, m.type, m.price, m.engine, m.axle, m.capText, 'truk');
            if (pendingTruckPurchase) { pendingTruckPurchase.limitedId = id; renderDealerQty(); }
        }
        async function executeLimitedPurchase() {
            if (limitedBuyBusy) return;
            const pp = pendingTruckPurchase; if (!pp || !pp.limitedId) return;
            const m = limitedModel(pp.limitedId), sv = limitedModels[pp.limitedId];
            const fail = (t, d) => { closeDealerModal(); showModal(t, d, 'fa-gem', 'red'); };
            if (!m || !sv || !sv.active) return fail('Tidak Tersedia', 'Unit ini sudah tidak dijual di dealer.');
            if ((sv.granted || 0) >= (sv.quota || 0)) return fail('Habis', 'Kuota unit ini sudah habis terjual.');
            if (!window.fb || !currentAccount || !navigator.onLine) return fail('Butuh Koneksi', 'Pembelian unit Limited Edition harus online karena nomor seri dikunci server.');
            const selDepot = document.getElementById('dealer-depot-sel');
            let depot = refineryData.find(k => k.id === (selDepot && selDepot.value)); if (!dealerDepotReady(depot)) depot = refineryData[0];
            const q = bulkQuote(pp);
            if (companyCash < q.total) return fail('Kas Tidak Cukup', `Butuh ${formatRupiah(q.total)} (unit ${formatRupiah(q.gross)} + KIR/STNK/plat ${formatRupiah(q.fees)}).`);
            limitedBuyBusy = true;
            const btn = document.getElementById('btn-confirm-buy-truck'); if (btn) btn.disabled = true;
            companyCash -= q.total; totalExpense += q.total;   // dipotong dulu; dikembalikan kalau server menolak
            try {
                const r = await fb.buyLimited(currentAccount.id, m.id);
                const e = limitedEnsureUnit(m, r.id, r.serial, depot);
                if (e.unit.depotId !== depot.id) e.unit.depotId = depot.id;   // listener bisa menaruhnya di depo bawaan lebih dulu
                addFinanceLog(`Pembelian ${m.name} No. ${r.serial} (${e.unit.id})`, -q.gross);
                addFinanceLog(`KIR/STNK/Plat ${e.unit.id}`, -q.fees);
                closeDealerModal(); updateCashDisplay(); populateTruckDropdowns(); renderFleetDashboard();
                addLog(`BERHASIL MEMBELI UNIT LIMITED: ${m.name} No. ${r.serial} [${e.unit.plat}] berpangkalan di ${depot.nama}.`, 'success');
                showModal('Pembelian Berhasil', `<b>${esc(m.name)}</b> No. <b>${r.serial}</b> masuk garasi: <b>${esc(e.unit.id)} [${esc(e.unit.plat)}]</b>.`, 'fa-gem', 'amber');
            } catch (err) {
                companyCash += q.total; totalExpense -= q.total;   // kembalikan uang
                console.warn('Beli limited gagal:', err);
                const msg = String(err && err.message || '');
                fail(msg.includes('KUOTA_HABIS') ? 'Habis' : 'Pembelian Gagal', msg.includes('KUOTA_HABIS') ? 'Unit terakhir baru saja terjual ke pemain lain. Uangmu tidak terpotong.' : 'Server menolak pembelian atau koneksi bermasalah. Uangmu tidak terpotong, coba lagi.');
                updateCashDisplay();
            } finally { limitedBuyBusy = false; if (btn) btn.disabled = false; }
        }

        // ---------- Panel Owner ----------
        const ltdModelState = id => { const m = limitedModel(id), sv = limitedModels[id]; return { active: !!(sv && sv.active), quota: sv ? (sv.quota || 0) : m.defaultQuota, granted: sv ? (sv.granted || 0) : 0, exists: !!sv }; };
        function renderOwnerModels() {
            const box = document.getElementById('adm-ltd-models'); if (!box) return;
            box.innerHTML = LIMITED_CATALOG.map(m => {
                const st = ltdModelState(m.id);
                return `<div class="bg-gray-900 border border-gray-800 rounded-lg p-2.5">
                    <div class="flex justify-between gap-2"><div class="font-bold text-yellow-200 truncate">${esc(m.short)}</div><div class="font-mono text-[10px] ${st.active ? 'text-emerald-400' : 'text-gray-500'}">${st.active ? 'TAMPIL DI DEALER' : 'TIDAK TAMPIL'}</div></div>
                    <div class="text-[10px] text-gray-500">${esc(m.capText)} &middot; ${formatRupiah(m.price)} &middot; Terbit <b class="text-gray-300">${st.granted}</b> / ${st.quota}</div>
                    <div class="flex items-center gap-2 mt-2">
                        <label class="flex items-center gap-1.5 text-gray-300"><input type="checkbox" id="ltd-act-${m.id}" ${st.active ? 'checked' : ''} class="w-4 h-4 accent-yellow-500"> Tampil di dealer</label>
                        <input id="ltd-q-${m.id}" type="number" min="${st.granted}" step="1" value="${st.quota}" title="Kuota total" class="w-20 bg-gray-950 border border-gray-800 rounded-lg p-1.5 text-gray-100 text-right font-mono">
                        <button onclick="ownerSaveModel('${m.id}')" class="ml-auto bg-yellow-700 hover:bg-yellow-600 text-white font-bold px-3 py-1.5 rounded-lg transition">Simpan</button>
                    </div></div>`;
            }).join('');
            const sel = document.getElementById('adm-ltd-grant-model');
            if (sel && !sel.options.length) sel.innerHTML = LIMITED_CATALOG.map(m => `<option value="${m.id}">${esc(m.short)}</option>`).join('');
        }
        async function renderOwnerPanel() {
            if (!isOwnerUser) return;
            renderOwnerModels();
            const ul = document.getElementById('adm-ltd-list'), al = document.getElementById('adm-audit-list');
            try {
                const units = await fb.recentLimitedUnits();
                ul.innerHTML = units.map(u => `<div class="flex justify-between items-center gap-2 bg-gray-950 rounded px-2 py-1"><span class="truncate ${u.revoked ? 'text-red-400 line-through' : 'text-gray-300'}">${esc(u.id)} &rarr; ${esc(String(u.uid).slice(0, 8))}&hellip; (${esc(u.src)}${u.applied ? '' : ', belum diterapkan'})</span>${u.revoked ? '' : `<button onclick="adminRevokeLimited('${esc(u.id)}')" class="shrink-0 text-red-400 hover:text-red-300 font-bold">Cabut</button>`}</div>`).join('') || '<div class="text-gray-600">Belum ada.</div>';
            } catch (e) { ul.textContent = 'Gagal memuat.'; }
            try {
                const lg = await fb.recentAudit();
                al.innerHTML = lg.map(a => `<div class="bg-gray-950 rounded px-2 py-1 text-gray-400"><span class="text-gray-500">${a.created && a.created.seconds ? new Date(a.created.seconds * 1000).toLocaleString('id-ID') : '-'}</span> <b class="text-gray-300">${esc(a.action)}</b> ${esc(String(a.target || '').slice(0, 12))} ${esc(a.detail || '')}</div>`).join('') || '<div class="text-gray-600">Belum ada.</div>';
            } catch (e) { al.textContent = 'Gagal memuat.'; }
        }
        async function ownerSaveModel(id) {
            if (!isOwnerUser) return;
            const st = ltdModelState(id), active = document.getElementById('ltd-act-' + id).checked, quota = parseInt(document.getElementById('ltd-q-' + id).value, 10);
            if (!(quota >= st.granted)) return admMsg(`Kuota tidak boleh di bawah jumlah yang sudah terbit (${st.granted}).`, false);
            if (!(await showConfirm(`${active ? 'TAMPILKAN' : 'SEMBUNYIKAN'} ${limitedModel(id).short} di dealer dengan kuota ${quota}?`, { title: 'Katalog Limited', iconClass: 'fa-gem', theme: 'amber', okLabel: 'Simpan' }))) return;
            try { await fb.ownerSetLimitedModel(currentAccount.id, id, active, quota); admMsg('Katalog limited disimpan.', true); renderOwnerPanel(); }
            catch (e) { console.warn('Simpan model gagal:', e); admMsg('Gagal menyimpan (' + (e.code || e.message) + ').', false); }
        }
        async function adminGrantLimited() {
            if (!isOwnerUser) return;
            const uid = admUid(), btn = document.getElementById('adm-ltd-grant-btn'), id = document.getElementById('adm-ltd-grant-model').value;
            const pl = await adminLookup(); if (pl === null) return admMsg('Periksa UID pemain dulu.', false);
            if (!(await showConfirm(`Beri 1 unit ${limitedModel(id).short} ke ${pl.company || 'UID ini (TIDAK ditemukan di leaderboard)'}?\nUID: ${uid}\nMengurangi kuota model ini.`, { title: 'Beri Unit Limited', iconClass: 'fa-gift', theme: 'amber', okLabel: 'Beri Unit' }))) return;
            btn.disabled = true;
            try {
                const r = await fb.ownerGrantLimited(currentAccount.id, uid, id);
                admMsg(`${limitedModel(id).short} No. ${r.serial} terkirim ke ${pl.company || uid}. Masuk garasi otomatis saat pemain online.`, true);
                renderOwnerPanel();
            } catch (e) {
                console.warn('Beri limited gagal:', e);
                const m = String(e && e.message || '');
                admMsg(m.includes('KUOTA_HABIS') ? 'Kuota model ini sudah habis. Naikkan kuota dulu.' : m.includes('MODEL_BELUM_DIATUR') ? 'Model belum diatur. Tekan Simpan pada model itu dulu.' : 'Gagal (' + (e.code || m) + ').', false);
            } finally { btn.disabled = false; }
        }
        async function adminRevokeLimited(id) {
            if (!isOwnerUser) return;
            if (!(await showConfirm(`Cabut unit ${id}? Unit akan dihapus dari armada pemain begitu ia online dan tidak sedang bertugas. Nomor seri tidak dipakai ulang.`, { title: 'Cabut Unit Limited', iconClass: 'fa-ban', theme: 'red', okLabel: 'Cabut' }))) return;
            try { await fb.ownerRevokeLimited(currentAccount.id, id); admMsg(`Unit ${id} dicabut.`, true); renderOwnerPanel(); }
            catch (e) { console.warn('Cabut gagal:', e); admMsg('Gagal mencabut (' + (e.code || e.message) + ').', false); }
        }
