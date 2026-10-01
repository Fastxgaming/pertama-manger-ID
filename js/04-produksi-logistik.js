        // ===== WILAYAH DEPO TETAP: tiap kota/kabupaten sudah dipetakan ke SATU depo (bukan lagi berdasarkan jarak) =====
        // Satu depo melayani beberapa kota. Kalau depo wilayahnya BELUM dibuka pemain, SPBU di kota itu
        // dianggap TIDAK TERJANGKAU (tidak ada pesanan, tidak bisa dikirimi) sampai depo tersebut dibuka.
        // Ubah pembagian wilayah cukup di dua tabel ini. Kunci = nama kota persis seperti di data SPBU (field region).
        // BBM: Kilang Pusat Tuban & semua TBBM/Depo BBM cabang.
        const COVER_BBM = {
            'KILANG-01': ['Tuban & Bojonegoro (Area Kilang Utama)', 'Ngawi (Perbatasan Barat)', 'Lamongan', 'Madiun', 'Kediri'], // Kilang Tuban (Pusat)
            'KILANG-02': ['Surabaya & Sidoarjo (Hub Perak)', 'Mojokerto', 'Malang', 'Blitar', 'Pamekasan'], // TBBM Perak Surabaya
            'KILANG-04': ['Jakarta Pusat', 'Jakarta Utara', 'Jakarta Barat', 'Jakarta Selatan', 'Jakarta Timur', 'Bogor', 'Depok', 'Tangerang', 'Tangerang Selatan', 'Bekasi', 'Karawang'], // TBBM Plumpang
            'KILANG-05': ['Semarang', 'Surakarta (Solo)', 'Magelang', 'Pekalongan', 'Tegal', 'Purwokerto', 'Kudus', 'Cilacap'], // TBBM Tanjung Emas Semarang
            'KILANG-06': ['Bandung', 'Cirebon', 'Tasikmalaya', 'Sukabumi', 'Subang', 'Garut'], // TBBM Padalarang
            'KILANG-07': ['Denpasar', 'Badung (Kuta)', 'Gianyar', 'Singaraja', 'Tabanan', 'Karangasem'], // TBBM Manggis Bali
            'KILANG-08': ['Manado', 'Bitung', 'Tomohon', 'Kotamobagu'], // TBBM Bitung
            'KILANG-09': ['Palu', 'Poso', 'Luwuk', 'Donggala'], // TBBM Donggala
            'KILANG-10': ['Mamuju', 'Majene', 'Polewali Mandar'], // Depo Mamuju
            'KILANG-11': ['Balikpapan (Kaltim)', 'Samarinda (Kaltim)', 'Bontang (Kaltim)'], // TBBM Balikpapan
            'KILANG-12': ['Banjarmasin (Kalsel)', 'Banjarbaru (Kalsel)'], // TBBM Banjarmasin
            'KILANG-13': ['Pontianak (Kalbar)', 'Singkawang (Kalbar)'], // TBBM Pontianak
            'KILANG-14': ['Palangka Raya (Kalteng)', 'Sampit (Kalteng)'], // Depo Palangka Raya
            'KILANG-15': ['Tarakan (Kaltara)'], // Depo Tarakan
            'KILANG-16': ['Makassar', 'Gowa', 'Maros', 'Parepare'], // TBBM Makassar
            'KILANG-17': ['Situbondo & Banyuwangi', 'Probolinggo', 'Bondowoso', 'Jember', 'Lumajang'] // TBBM Ketapang Banyuwangi
        };
        // LPG: hanya Kilang Pusat Tuban & Depo LPG Gresik yang menyuplai LPG. Kota di luar daftar ini = belum terjangkau LPG.
        const COVER_LPG = {
            'KILANG-01': ['Tuban & Bojonegoro (Area Kilang Utama)', 'Ngawi (Perbatasan Barat)', 'Lamongan', 'Madiun', 'Kediri'],
            'KILANG-03': ['Surabaya & Sidoarjo (Hub Perak)', 'Mojokerto', 'Malang', 'Blitar', 'Pamekasan'], // Depo LPG Gresik
            'KILANG-17': ['Situbondo & Banyuwangi', 'Probolinggo', 'Bondowoso', 'Jember', 'Lumajang'] // TBBM Ketapang Banyuwangi (BBM & LPG)
        };
        const _invertCover = c => { const m = {}; Object.entries(c).forEach(([id, ks]) => ks.forEach(k => { m[k] = id; })); return m; };
        const DEPO_BBM_OF_REGION = _invertCover(COVER_BBM), DEPO_LPG_OF_REGION = _invertCover(COVER_LPG);
        // Depo yang SEHARUSNYA melayani kota ini (dibuka atau belum). null = kota belum masuk pemetaan wilayah mana pun.
        function depoOfRegion(region, type) {
            const id = (type === 'LPG' ? DEPO_LPG_OF_REGION : DEPO_BBM_OF_REGION)[region];
            return id ? (refineryData.find(k => k.id === id) || null) : null;
        }
        function recomputeWilayah() {
            loadedSpbuList.forEach(s => {
                const bbm = depoOfRegion(s.region, 'BBM');
                if (bbm && bbm.is_unlocked) { s.wilayahBbmId = bbm.id; s.wilayahBbmNama = bbm.nama; s.wilayahBbmJarak = Math.round(distKm(bbm, s) * 10) / 10; }
                else { s.wilayahBbmId = null; s.wilayahBbmNama = '-'; s.wilayahBbmJarak = null; }
                if (s.has_lpg) {
                    const lpg = depoOfRegion(s.region, 'LPG');
                    if (lpg && lpg.is_unlocked) { s.wilayahLpgId = lpg.id; s.wilayahLpgNama = lpg.nama; s.wilayahLpgJarak = Math.round(distKm(lpg, s) * 10) / 10; }
                    else { s.wilayahLpgId = null; s.wilayahLpgNama = '-'; s.wilayahLpgJarak = null; }
                } else { s.wilayahLpgId = null; s.wilayahLpgNama = null; s.wilayahLpgJarak = null; }
                // Alias wilayah utama = wilayah BBM (dipakai buat dropdown filter & tampilan umum, karena semua SPBU jual BBM).
                s.wilayahId = s.wilayahBbmId; s.wilayahNama = s.wilayahBbmNama; s.wilayahJarak = s.wilayahBbmJarak;
            });
            rebuildRegionFilterOptions();
        }
        // Bangun ulang opsi dropdown "Pilih Wilayah" berdasarkan Kilang/Depo yang aktif saat ini,
        // dikelompokkan otomatis (bukan lagi daftar kabupaten/kota statis).
        function rebuildRegionFilterOptions() {
            const sel = document.getElementById('delivery-region-filter');
            if (!sel) return;
            const prev = sel.value;
            const counts = {};
            loadedSpbuList.forEach(s => { if (s.wilayahId) counts[s.wilayahId] = (counts[s.wilayahId] || 0) + 1; });
            sel.innerHTML = '<option value="ALL">-- Semua Wilayah Nusantara --</option>';
            refineryData.filter(k => k.is_unlocked).forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.innerText = `${k.nama} (${counts[k.id] || 0} SPBU)`;
                sel.appendChild(opt);
            });
            if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev; else sel.value = 'ALL';
        }

        let kilangFilter = 'ALL';
        function setKilangFilter(key) { kilangFilter = key; renderRefineries(); }
        // Filter tujuan transfer di tab Kirim BBL/LPG Curah - diisi oleh openTransferKapal() (06-rute-transport.js)
        // sesuai tombol nav mana yang dipencet, supaya dropdown tujuan cuma nampilin depo yang jenisnya cocok.
        let transferFuelFilter = 'ALL';
        let transferRoute = 'kapal'; // pilihan rute BBL ke depo berdermaga: 'kapal' | 'darat' (depo tanpa dermaga selalu darat)
        // ===== BUKA / TUTUP PESANAN per Kilang/Depo =====
        // kilang.tutup = true -> SPBU di wilayah depo ini TIDAK akan membuat pesanan baru (pesanan yang sudah terlanjur
        // masuk tetap bisa dikirim). Status ikut tersimpan di save.
        const depoTutup = id => { const k = id && refineryData.find(x => x.id === id); return !!(k && k.tutup); };
        function toggleDepoBuka(kilangId) {
            const k = refineryData.find(x => x.id === kilangId);
            if (!k || !k.is_unlocked) return;
            k.tutup = !k.tutup;
            addLog(k.tutup
                ? `DEPO DITUTUP: ${k.nama} ditutup untuk pesanan. SPBU di wilayahnya tidak akan memesan sampai dibuka lagi.`
                : `DEPO DIBUKA: ${k.nama} kembali menerima pesanan dari SPBU di wilayahnya.`, k.tutup ? 'warning' : 'success');
            if (k.tutup) batalkanPesananDepo(k);
            renderRefineries();
        }
        // Saat depo ditutup, pesanan terbuka di wilayahnya yang BELUM mulai dikerjakan (belum ada truk/muatan/pengiriman)
        // ikut dihentikan. Pesanan yang sudah berjalan dibiarkan selesai supaya armada di jalan tidak terlantar.
        function batalkanPesananDepo(k) {
            let n = 0;
            orders.slice().forEach(o => {
                if (o.terkirim > 0 || o.inTransit > 0 || o.tahap || o.lockedTruckId) return;
                const sp = loadedSpbuList.find(x => x.kode === o.kode), f = FUELS.find(x => x.id === o.fuel);
                if (!sp || !f) return;
                if ((f.lpg ? sp.wilayahLpgId : sp.wilayahBbmId) !== k.id) return;
                if (typeof ensureStok === 'function') { ensureStok(sp); sp.stok[o.fuel] = f.cap; }
                closeOrder(o, 'Batal'); n++;
            });
            if (n) { addLog(`${n} pesanan belum berjalan di wilayah ${k.nama} dihentikan karena depo ditutup.`, 'warning'); if (typeof renderOrders === 'function') renderOrders(); }
        }
        function depoBukaHtml(kilang) {
            const t = !!kilang.tutup;
            return `<div class="flex items-center justify-between text-[10px] pt-1 border-t border-gray-800">
                <span class="text-gray-400"><i class="fa-solid ${t ? 'fa-store-slash text-red-400' : 'fa-store text-emerald-400'} mr-1"></i>Pesanan wilayah: <b class="${t ? 'text-red-400' : 'text-emerald-400'}">${t ? 'TUTUP' : 'BUKA'}</b></span>
                <button onclick="toggleDepoBuka('${kilang.id}')" class="${t ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-red-700 hover:bg-red-600'} text-white px-2 py-0.5 rounded font-bold">${t ? 'Buka' : 'Tutup'}</button>
            </div>`;
        }

        function renderRefineries() {
            kilangMarkers.forEach(km => map.removeLayer(km));
            kilangMarkers = [];

            const listContainer = document.getElementById('kilang-list-container');
            const targetSelect = document.getElementById('transfer-target-select');
            const tabsEl = document.getElementById('kilang-filter-tabs');

            listContainer.innerHTML = '';
            targetSelect.innerHTML = '';

            if (tabsEl) {
                // Dropdown, bukan deretan chip - daftar kilang/depo terus bertambah seiring ekspansi (bisa sampai
                // belasan), jadi kalau dijejer horizontal pasti ada saatnya kepotong berapa pun lebar layarnya.
                const opts = [{ key: 'ALL', label: 'Semua Kilang' }, ...refineryData.map(k => ({ key: k.id, label: k.nama + (k.is_unlocked ? '' : ' (Terkunci)') }))];
                tabsEl.innerHTML = `<select onchange="setKilangFilter(this.value)" class="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-200 focus:outline-none focus:border-teal-500">
                    ${opts.map(c => `<option value="${c.key}" ${kilangFilter === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
                </select>`;
            }

            refineryData.forEach(kilang => {
                const pct = Math.round((kilang.stok_current / kilang.stok_max) * 100);
                
                const card = document.createElement('div');
                card.className = "p-3 bg-gray-900 rounded-lg border border-gray-800 space-y-2";
                
                if (kilang.is_unlocked) {
                    const mName = mekanikName(kilang);
                    const freeMekanik = companyCrew.filter(c => c.role === 'Mekanik' && !c.kilangId);
                    const mekanikBlock = mName
                        ? `<div class="flex items-center justify-between text-[10px] pt-1 border-t border-gray-800"><span class="text-gray-400"><i class="fa-solid fa-screwdriver-wrench mr-1 text-blue-400"></i>Mekanik: <b class="text-emerald-400">${mName}</b></span></div>`
                        : `<div class="pt-1 border-t border-gray-800 space-y-1 text-[10px]">
                            <span class="text-gray-400"><i class="fa-solid fa-screwdriver-wrench mr-1 text-amber-400"></i>Mekanik: <b class="text-amber-400">Belum ada</b></span>
                            ${freeMekanik.length
                                ? `<div class="flex gap-1"><select id="mekanik-sel-${kilang.id}" class="flex-1 bg-gray-950 border border-gray-700 rounded px-1 py-0.5 text-gray-200">${freeMekanik.map(c => `<option value="${c.id}">${c.name} (Rep ${Math.round(c.reputation)})</option>`).join('')}</select><button onclick="assignMekanik('${kilang.id}')" class="bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded font-bold">Tugaskan</button></div>`
                                : `<button onclick="openRecruitModal('Mekanik')" class="w-full bg-blue-700 hover:bg-blue-600 text-white px-2 py-0.5 rounded font-bold">Rekrut Mekanik di Bursa Kerja</button>`}
                          </div>`;
                    const anyRefining = kilang.kap ? Object.values(kilang.kap).some(s => s.refining) : false;
                    card.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="text-gray-200 font-bold">${kilang.nama} <span class="text-[10px] text-blue-400 font-normal">(${kilang.tipe})</span> ${isCoastal(kilang) ? '<span class="text-[9px] text-cyan-400 font-normal" title="Punya akses pelabuhan, bisa dilayani kapal tanker"><i class="fa-solid fa-anchor"></i> Pesisir</span>' : '<span class="text-[9px] text-gray-500 font-normal" title="Tidak ada akses pelabuhan, hanya bisa dilayani truk"><i class="fa-solid fa-road"></i> Darat</span>'}${kilang.id === 'KILANG-01' ? `<span id="refine-indicator-${kilang.id}" class="${anyRefining ? '' : 'hidden'} text-[9px] text-amber-400 font-normal ml-1"><i class="fa-solid fa-gear fa-spin mr-0.5"></i>Mengolah...</span>` : ''}</span>
                            <span id="crude-text-${kilang.id}" class="font-bold text-white font-mono">${kilang.stok_current.toLocaleString()} / ${kilang.stok_max.toLocaleString()} ${kilang.unit}</span>
                        </div>
                        <div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div id="crude-bar-${kilang.id}" class="${anyRefining ? 'refine-flow' : ''} bg-emerald-500 h-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                        ${supplyReqBadge(kilang)}
                        ${typeof huluSupplyHtml === 'function' ? huluSupplyHtml(kilang) : ''}
                        ${mekanikBlock}
                        ${depoBukaHtml(kilang)}
                        ${kilang.id === 'KILANG-01' ? fuelBuyHtml(kilang) : ''}
                        ${kilang.id === 'KILANG-01' ? lpgCurahBuyHtml(kilang) : ''}
                        ${renderKapPanel(kilang)}
                    `;

                    if (kilang.id !== 'KILANG-01') {
                        if (transferFuelFilter === 'ALL' || kilang.tipe.includes(transferFuelFilter)) {
                            const opt = document.createElement('option');
                            opt.value = kilang.id;
                            opt.innerText = `${kilang.nama} (Sisa: ${kilang.stok_max - kilang.stok_current} ${kilang.unit})`;
                            targetSelect.appendChild(opt);
                        }
                    }
                } else {
                    card.innerHTML = `
                        <div class="flex justify-between items-center text-xs">
                            <div>
                                <span class="text-gray-400 font-bold block">${kilang.nama}</span>
                                <span class="text-[10px] text-amber-500 font-mono"><i class="fa-solid fa-lock mr-1"></i> Terkunci</span>
                            </div>
                            <button onclick="buyRefinery('${kilang.id}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition">
                                Beli ${formatRupiah(kilang.harga_beli)}
                            </button>
                        </div>
                    `;
                }

                if (kilangFilter === 'ALL' || kilangFilter === kilang.id) listContainer.appendChild(card);

                let colorMarker = '#6b7280';
                if (kilang.is_unlocked) {
                    colorMarker = kilang.id === 'KILANG-01' ? '#14b8a6' : (supplyReqIsOpen(kilang) ? '#ef4444' : '#f97316'); // merah = depo sedang meminta pasokan
                }

                const marker = L.circleMarker([kilang.lat, kilang.lon], {
                    radius: 10,
                    fillColor: colorMarker,
                    color: "#ffffff",
                    weight: 2,
                    fillOpacity: 0.9
                }).addTo(map);

                const coastal = isCoastal(kilang);
                marker.bindPopup(`
                    <div class="text-gray-900 font-sans p-1">
                        <strong class="text-xs font-bold block text-teal-700">${kilang.nama}</strong>
                        <div class="text-[10px] text-gray-600">Status: <b>${kilang.is_unlocked ? 'Aktif' : 'Terkunci'}</b></div>
                        <div class="text-[10px] text-gray-600">Akses: <b>${coastal ? '⚓ Pesisir (ada dermaga, bisa disandari kapal tanker)' : '🛣️ Darat saja (tidak ada dermaga)'}</b></div>
                        <div class="text-[10px] text-gray-600">Stok: <b>${kilang.stok_current.toLocaleString()} / ${kilang.stok_max.toLocaleString()} ${kilang.unit}</b></div>
                        <div class="text-[10px] text-gray-600">Mekanik: <b>${mekanikName(kilang) || 'Belum ada'}</b></div>
                    </div>
                `);

                kilangMarkers.push(marker);

                // Bug fix: tandai di PETA (bukan cuma di daftar sidebar) depo/kilang mana yang punya akses
                // pelabuhan (dermaga) - lencana jangkar kecil menempel di pojok marker depo tersebut.
                if (coastal) {
                    const dermagaBadge = L.marker([kilang.lat, kilang.lon], {
                        icon: L.divIcon({
                            className: '',
                            iconSize: [16, 16],
                            iconAnchor: [-6, 18],
                            html: `<div style="width:16px;height:16px;border-radius:50%;background:#0891b2;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px;box-shadow:0 1px 4px rgba(0,0,0,.6)"><i class="fa-solid fa-anchor"></i></div>`
                        }),
                        zIndexOffset: 700,
                        interactive: false
                    }).addTo(map);
                    dermagaBadge.bindTooltip(esc(`${kilang.nama} - Ada Dermaga`), { direction: 'top', offset: [0, -8], className: 'truck-tip' });
                    kilangMarkers.push(dermagaBadge);
                }
            });

            if (targetSelect.options.length === 0) {
                const noOptMsg = transferFuelFilter === 'LPG' ? '-- Belum Ada Depo Cabang LPG --' : transferFuelFilter === 'BBM' ? '-- Belum Ada Depo Cabang BBM --' : '-- Beli Depo Cabang Terlebih Dahulu --';
                targetSelect.innerHTML = `<option value="">${noOptMsg}</option>`;
            }
            populateTransferKapal();
        }

        // ===== MEKANIK DI SETIAP KILANG/DEPO (direkrut lewat Bursa Kerja Kru, lalu ditugaskan ke kilang) =====
        function mekanikName(kilang) {
            if (!kilang.mekanikId) return null;
            if (kilang.mekanikId === 'BUILTIN') return 'Slamet Riyadi (Kepala Mekanik Tetap)';
            const c = companyCrew.find(x => x.id === kilang.mekanikId);
            return c ? c.name : null;
        }
        function assignMekanik(kilangId) {
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.is_unlocked || kilang.mekanikId) return;
            const sel = document.getElementById('mekanik-sel-' + kilangId);
            if (!sel || !sel.value) return;
            const crewId = sel.value;
            const c = companyCrew.find(x => x.id === crewId);
            if (!c || c.role !== 'Mekanik' || c.kilangId) return;
            kilang.mekanikId = c.id;
            c.kilangId = kilang.id;
            c.status = 'Bertugas di ' + kilang.nama;
            addLog(`MEKANIK DITUGASKAN: ${c.name} kini bertugas di ${kilang.nama}. Depo ini sekarang bisa dipilih sebagai pangkalan armada.`, 'success');
            showModal('Mekanik Ditugaskan', `${c.name} kini bertugas sebagai mekanik di ${kilang.nama}. Depo ini sekarang bisa dipilih sebagai pangkalan armada (Pindah Depot di tab Armada).`, 'fa-screwdriver-wrench', 'blue');
            renderRefineries(); renderFleetDashboard(); renderDriversDashboard();
        }

        // ===== ODOMETER & KEAUSAN BAN ARMADA =====
        const TIRE_WEAR_PER_KM = 100 / 4000; // set ban habis (0%) tiap ±4.000 km tempuh
        const TIRE_REPLACE_THRESHOLD = 15; // otomatis diganti begitu tiba di depot kalau sisa <=15%
        const tireReplaceCost = t => Math.round((t.price || 500e6) * 0.01 / 100000) * 100000;
        function banCls(pct) { return pct <= TIRE_REPLACE_THRESHOLD ? 'text-red-400' : pct <= 40 ? 'text-amber-400' : 'text-emerald-400'; }
        function banBar(pct) { return pct <= TIRE_REPLACE_THRESHOLD ? 'bg-red-500' : pct <= 40 ? 'bg-amber-500' : 'bg-emerald-500'; }

        // ===== PINDAH DEPOT PANGKALAN ARMADA =====
        const DEPOT_MOVE_FEE = 3500000;
        function pindahDepot(truckId) {
            if (pphBlokir()) return;
            const t = companyFleet.find(x => x.id === truckId); if (!t) return;
            const sel = document.getElementById('depot-sel-' + truckId); if (!sel || !sel.value) return;
            const isKapal = t.kelas === 'kapal';
            // KAPAL: tujuan harus depo ber-dermaga (bermekanik) atau anjungan yang sudah beroperasi; tidak boleh dipindah saat bertugas.
            const target = isKapal ? shipBaseEntity(sel.value) : refineryData.find(k => k.id === sel.value);
            if (isKapal) {
                if (busyIds.has(t.id)) return showModal('Kapal Sedang Bertugas', `${t.id} sedang bertugas. Tunggu sampai kembali berlabuh di pangkalannya sebelum dipindah.`, 'fa-ship', 'amber');
                const why = shipBaseWhy(target);
                if (why) return showModal('Pangkalan Tidak Sah', `${target ? esc(target.nama) : 'Lokasi yang dipilih'} ${why}. Kapal hanya boleh berpangkalan di depo yang punya dermaga atau di anjungan yang sudah beroperasi.`, 'fa-anchor', 'red');
            } else if (!target || !target.is_unlocked || !target.mekanikId) return showModal('Depo Belum Siap', 'Depo tujuan harus sudah aktif dan punya mekanik yang ditugaskan terlebih dahulu.', 'fa-triangle-exclamation', 'red');
            if (target.id === t.depotId) return;
            if (companyCash < DEPOT_MOVE_FEE) return showModal('Kas Tidak Cukup', `Pindah depot butuh biaya mobilisasi ${formatRupiah(DEPOT_MOVE_FEE)}.`, 'fa-triangle-exclamation', 'red');
            const asal = isKapal ? shipBaseEntity(t.depotId) : refineryData.find(k => k.id === t.depotId);
            companyCash -= DEPOT_MOVE_FEE; totalExpense += DEPOT_MOVE_FEE;
            t.depotId = target.id;
            // Kapal standby ikut pindah: ikon parkir di pangkalan lama dibuang, status runtime direset (standby di pangkalan baru).
            if (isKapal) { try { if (typeof parkedMarkers !== 'undefined' && parkedMarkers.has(t.id) && typeof map !== 'undefined' && map) { map.removeLayer(parkedMarkers.get(t.id)); parkedMarkers.delete(t.id); } if (typeof shipRt !== 'undefined') shipRt.delete(t.id); } catch (e) { console.error('[kapal] pindah pangkalan:', e); } }
            // Mutasi plat: truk ikut kode wilayah depo barunya (kapal memakai registrasi GT, tidak berubah).
            if (t.kelas !== 'kapal') { const kode = platKode(target.id); if (!String(t.plat).startsWith(kode + ' ')) { let baru; do { baru = kode + ' ' + Math.floor(1000 + Math.random() * 9000) + ' ' + PLAT_HURUF[Math.floor(Math.random() * PLAT_HURUF.length)] + PLAT_HURUF[Math.floor(Math.random() * PLAT_HURUF.length)]; } while (companyFleet.some(x => x.plat === baru)); t.plat = baru; } }
            addFinanceLog(`Mobilisasi ${t.id} ke ${target.nama}`, -DEPOT_MOVE_FEE);
            addLog(`PINDAH DEPOT: ${t.id} [${t.plat}] dipindah pangkalan dari ${asal ? asal.nama : '-'} ke ${target.nama}.`, 'info');
            showModal('Armada Dipindah', `${t.id} [${t.plat}] kini berpangkalan di ${target.nama}.${t.kelas !== 'kapal' ? ' Plat nomor menyesuaikan daerah depo baru.' : ' Misi berikutnya berangkat dan pulang ke pangkalan ini.'}`, 'fa-truck-fast', 'blue');
            updateCashDisplay(); renderFleetDashboard();
        }

        // ===== BELI BAHAN BAKAR KILANG UTAMA =====
        // Harga beli BBL mentah (diturunkan dari 1.100.000). Batas bawah: biaya pokok anjungan ±Rp 256.000/Bbl (opex mingguan ÷ produksi), jadi harga beli harus tetap di atas itu.
        // Harga dasar (rata-rata) Rp 430.000/Bbl = Rp 2,7 jt/KL (60% harga jual Rp 4,5 jt/KL). Harga BELI sebenarnya DINAMIS: bblPrice() / lpgCurahPrice() di 04a-pasar-harga.js (indeks pasar x harga dasar).
        let bbmWarned = false, bbmSpent = 0;
        // Batas atas kapasitas tangki (upgrade tidak bisa lewat ini): BBL mentah & LPG Curah sama-sama 10 Juta.
        const KAP_UPGRADE_CAPS = { lpg_curah: 10000000 };
        const BBL_KAP_MAX = 10000000, BBL_KAP_STEP = 200000, BBL_KAP_BASE_COST = 1500e6;
        const bblUpgradeCost = kilang => Math.round(BBL_KAP_BASE_COST * Math.pow(1.32, kilang.stokUpgradeLevel || 0));
        function upgradeBblTangki(kilangId) {
            if (pphBlokir()) return;
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.is_unlocked) return;
            if (kilang.stok_max >= BBL_KAP_MAX) return showModal('Kapasitas Maksimum', `Tangki BBL mentah ${kilang.nama} sudah mencapai batas maksimum ${BBL_KAP_MAX.toLocaleString('id-ID')} Bbl.`, 'fa-circle-info', 'blue');
            const cost = bblUpgradeCost(kilang);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Upgrade kapasitas tangki BBL mentah di ${kilang.nama} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            companyCash -= cost; totalExpense += cost;
            kilang.stok_max = Math.min(BBL_KAP_MAX, kilang.stok_max + BBL_KAP_STEP);
            kilang.stokUpgradeLevel = (kilang.stokUpgradeLevel || 0) + 1;
            addFinanceLog(`Upgrade Kapasitas Tangki BBL Mentah - ${kilang.nama}`, -cost);
            updateCashDisplay();
            addLog(`KAPASITAS DITINGKATKAN: Tangki BBL mentah ${kilang.nama} kini menampung ${kilang.stok_max.toLocaleString('id-ID')} Bbl.`, 'success');
            renderRefineries();
        }
        function fuelBuyHtml(kilang) {
            const pct = Math.round((kilang.stok_current / kilang.stok_max) * 100);
            const atMax = kilang.stok_max >= BBL_KAP_MAX;
            const b = (n, l) => `<button onclick="buyFuel(${n})" class="bg-teal-700 hover:bg-teal-600 text-white rounded px-2 py-1 font-bold">${l}</button>`;
            return `<div class="pt-1.5 border-t border-gray-800 space-y-1.5">
                ${pct <= 25 ? '<div class="text-[10px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Stok bahan bakar menipis! Segera beli pasokan.</div>' : ''}
                ${marketPanelHtml('bbl')}
                <div class="flex flex-wrap gap-1 text-[10px]">${b(10000, '+10.000 Bbl')}${b(50000, '+50.000 Bbl')}${b(100000, '+100.000 Bbl')}${b(500000, '+500.000 Bbl')}${b(1000000, '+1 Juta Bbl')}${b(0, 'Isi Penuh')}
                    ${atMax ? '' : `<button onclick="upgradeBblTangki('${kilang.id}')" class="bg-emerald-700 hover:bg-emerald-600 text-white rounded px-2 py-1 font-bold"><i class="fa-solid fa-arrow-up-right-dots"></i> Upgrade Tangki (${formatRupiah(bblUpgradeCost(kilang))})</button>`}
                </div>
                ${supplyBadge(kilang.id, 'bbl')}
                <div class="text-[9px] text-gray-500"><i class="fa-solid fa-circle-info mr-1"></i>Stok mentah ini diolah jadi Pertalite, Pertamax, dst lewat tombol Konversi di panel Kapasitas Depo di bawah - tidak jalan sendiri.${atMax ? ' Kapasitas tangki sudah maksimum (10 Juta Bbl).' : ' Kapasitas tangki bisa di-upgrade sampai maksimum 10 Juta Bbl.'}</div></div>`;
        }
        function buyFuel(n) { supplyOrderFlow(refineryData[0].id, 'bbl', n, 'Bahan Bakar', 'Bbl', bblPrice(), true); }

        // ===== LPG CURAH: diperlakukan sama seperti bahan mentah (Bbl) - beli manual, bukan diolah otomatis dari crude =====
        function lpgCurahBuyHtml(kilang) {
            const meta = PRODUCT_META.lpg_curah, slot = kilang.kap && kilang.kap.lpg_curah;
            if (!slot) return '';
            const pct = slot.max ? Math.round((slot.cur / slot.max) * 100) : 0;
            const upCost = kapUpgradeCost(meta, slot.level);
            const capMax = KAP_UPGRADE_CAPS.lpg_curah;
            const atMax = capMax && slot.max >= capMax;
            const b = (n, l) => `<button onclick="buyLpgCurah('${kilang.id}',${n})" class="bg-orange-700 hover:bg-orange-600 text-white rounded px-2 py-1 font-bold">${l}</button>`;
            return `<div class="pt-1.5 border-t border-gray-800 space-y-1.5">
                <div class="flex justify-between text-xs">
                    <span class="text-gray-200 font-bold"><i class="fa-solid fa-fire-flame-simple text-orange-400 mr-1"></i>LPG Curah <span class="text-[10px] text-gray-500 font-normal">(Bahan Mentah)</span></span>
                    <span id="lpgcurah-text-${kilang.id}" class="font-bold text-white font-mono">${slot.cur.toLocaleString('id-ID', { maximumFractionDigits: 1 })} / ${slot.max.toLocaleString('id-ID')} Ton</span>
                </div>
                <div class="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div id="lpgcurah-bar-${kilang.id}" class="bg-orange-500 h-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
                ${pct <= 25 ? '<div class="text-[10px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Stok LPG Curah menipis! Segera beli pasokan.</div>' : ''}
                ${marketPanelHtml('lpg')}
                <div class="flex flex-wrap gap-1 text-[10px]">${b(200, '+200 Ton')}${b(1000, '+1.000 Ton')}${b(2000, '+2.000 Ton')}${b(0, 'Isi Penuh')}
                    ${atMax ? '' : `<button onclick="upgradeKapasitas('${kilang.id}','lpg_curah')" class="bg-emerald-700 hover:bg-emerald-600 text-white rounded px-2 py-1 font-bold"><i class="fa-solid fa-arrow-up-right-dots"></i> Upgrade Tangki (${formatRupiah(upCost)})</button>`}
                </div>
                ${supplyBadge(kilang.id, 'lpg_curah')}
                <div class="text-[9px] text-gray-500"><i class="fa-solid fa-circle-info mr-1"></i>Bahan baku LPG Tabung - konversi di panel Kapasitas Depo di bawah.${atMax ? ' Kapasitas tangki sudah maksimum (10 Juta Ton).' : ' Kapasitas tangki bisa di-upgrade sampai maksimum 10 Juta Ton.'}</div>
            </div>`;
        }
        function buyLpgCurah(kilangId, n) { const k = refineryData.find(x => x.id === kilangId) || refineryData[0]; if (!k || !k.kap || !k.kap.lpg_curah) return; supplyOrderFlow(k.id, 'lpg_curah', n, 'LPG Curah', 'Ton', lpgCurahPrice(), true); }

        // ===== TANDA TANGAN DIGITAL: konfirmasi transaksi (dipakai isi ulang kilang, dll) =====
        let signCtx = null, signDrawing = false, signHasStroke = false, signPendingAction = null;
        function initSignatureCanvas() {
            const canvas = document.getElementById('sign-canvas');
            if (!canvas || signCtx) return;
            signCtx = canvas.getContext('2d');
            signCtx.lineWidth = 2.2; signCtx.lineCap = 'round'; signCtx.lineJoin = 'round'; signCtx.strokeStyle = '#111827';
            const pos = e => {
                const r = canvas.getBoundingClientRect();
                const cx = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
                const cy = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
                return { x: cx * canvas.width / r.width, y: cy * canvas.height / r.height };
            };
            const start = e => { signDrawing = true; signHasStroke = true; const p = pos(e); signCtx.beginPath(); signCtx.moveTo(p.x, p.y); e.preventDefault(); };
            const move = e => { if (!signDrawing) return; const p = pos(e); signCtx.lineTo(p.x, p.y); signCtx.stroke(); e.preventDefault(); };
            const end = () => { signDrawing = false; };
            canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
            canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', end);
        }
        function clearSignature() {
            if (!signCtx) return;
            signCtx.clearRect(0, 0, signCtx.canvas.width, signCtx.canvas.height);
            signHasStroke = false;
            document.getElementById('sign-msg').classList.add('hidden');
        }
        function openSignature(desc, onConfirm) {
            signPendingAction = onConfirm;
            document.getElementById('sign-desc').textContent = desc;
            document.getElementById('sign-modal').classList.remove('hidden');
            setTimeout(() => { initSignatureCanvas(); clearSignature(); }, 0);
        }
        function cancelSignature() {
            document.getElementById('sign-modal').classList.add('hidden');
            signPendingAction = null;
        }
        function confirmSignature() {
            if (!signHasStroke) {
                const m = document.getElementById('sign-msg');
                m.textContent = 'Tanda tangan dulu di kotak putih di atas sebelum konfirmasi.';
                m.classList.remove('hidden');
                return;
            }
            const action = signPendingAction;
            document.getElementById('sign-modal').classList.add('hidden');
            signPendingAction = null;
            if (action) action();
        }

        function buyRefinery(kilangId) {
            if (pphBlokir()) return;
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang) return;

            if (companyCash < kilang.harga_beli) {
                showModal('Kas Tidak Cukup', `Biaya pembelian ${kilang.nama} adalah ${formatRupiah(kilang.harga_beli)}. Kas perusahaan tidak mencukupi!`, 'fa-triangle-exclamation', 'red');
                return;
            }

            companyCash -= kilang.harga_beli;
            totalExpense += kilang.harga_beli;
            kilang.is_unlocked = true;

            addFinanceLog(`Pembelian Aset ${kilang.nama}`, -kilang.harga_beli);
            updateCashDisplay();
            renderRefineries();
            recomputeWilayah();
            renderSpbuOnMap();

            addLog(`KILANG BARU DIBUKA: ${kilang.nama} telah dibeli. Stok awal 0!`, 'success');
            showModal('Kilang Berhasil Dibeli', `${kilang.nama} telah dibuka! Silakan lakukan transfer pasokan BBM dari Kilang Pusat (Tuban).`, 'fa-building-circle-check', 'blue');
        }

        // ===== PASOKAN BERPROSES (tidak ada lagi isi ulang instan) + PASS (fitur 'refill' = Plus ke atas) =====
        // Bayar di muka, barang tiba setelah SUPPLY_DELAY_MS (jam nyata yang ikut dijeda saat tab tidak aktif). Slot yang
        // sudah dipesan dihitung sebagai "terisi" supaya tidak bisa dipesan dobel melebihi kapasitas tangki.
        const SUPPLY_DELAY_MS = 120000, SUPPLY_AUTO_OPEN = 0.25, SUPPLY_AUTO_FILL = 0.60, SUPPLY_ANJ_OPEN = 0.10, SUPPLY_ANJ_FILL = 0.40;
        let supplyQueue = [], passState = { tier: '', exp: 0, floor: 0 }, supplyAutoWarnAt = -1e9;
        const PASS_TIERS = {
            dasar: { label: 'Dasar', feats: ['dispatch'] },
            plus: { label: 'Plus', feats: ['dispatch', 'refill'] },
            juragan: { label: 'Juragan', feats: ['dispatch', 'refill', 'bursa'] }
        };
        // Keterangan manfaat per fitur (dipakai kartu paket pemain, layar bayar, dan panel admin). Angka slot Bursa harus sama dengan BURSA_SLOT_* di 09-bursa-p2p.js.
        const PASS_BENEFIT = {
            dispatch: [['Dispatcher Otomatis', 'Truk idle mengambil pesanan SPBU (BBM & LPG) sendiri, tanpa menekan Kirim satu per satu. Bisa ON/OFF kapan saja.']],
            refill: [['Isi Ulang Depo Otomatis', 'BBL & LPG Curah di semua depo dipesan otomatis saat stok tinggal 25% (diisi sampai 60%). Tiba setelah jeda; depo cabang +10% ongkos kirim.']],
            bursa: [['Slot Bursa P2P 8 Iklan', 'Pasang sampai 8 iklan truk sekaligus (tanpa pass hanya 3).']]
        };
        const passBenefits = t => ((PASS_TIERS[t] || {}).feats || []).flatMap(f => PASS_BENEFIT[f] || []);
        const passBenefitHtml = t => passBenefits(t).map(([h, d]) => `<div class="flex gap-1.5 items-start"><i class="fa-solid fa-check text-emerald-400 mt-0.5 text-[9px]"></i><div class="min-w-0"><span class="font-bold text-gray-200">${h}</span><span class="block text-[10px] text-gray-500">${d}</span></div></div>`).join('');
        const passHas = f => { const t = PASS_TIERS[passState.tier]; return !!(t && passState.exp > Date.now() && t.feats.includes(f)); };
        function grantPass(tier, days) { // dipanggil dari alur topup/admin (belum disambungkan ke UI)
            if (!PASS_TIERS[tier]) return;
            const base = Math.max(Date.now(), passState.tier === tier ? passState.exp : 0);
            passState = { tier, exp: base + days * 86400000, floor: passState.floor || 0 };
            addLog(`PASS ${PASS_TIERS[tier].label.toUpperCase()} aktif ${days} hari.`, 'success');
        }
        function supplySlot(kid, key) {
            const k = refineryData.find(x => x.id === kid); if (!k) return null;
            if (key === 'bbl') return { k, cur: k.stok_current, max: k.stok_max };
            const s = k.kap && k.kap[key]; return s ? { k, cur: s.cur, max: s.max } : null;
        }
        const supplyPending = (kid, key) => supplyQueue.filter(s => s.kid === kid && s.key === key).reduce((a, s) => a + s.qty, 0);
        function supplyRoom(kid, key) { const s = supplySlot(kid, key); return s ? Math.max(0, s.max - s.cur - supplyPending(kid, key)) : 0; }
        // Depo cabang: jeda tambahan sesuai jarak dari Tuban (maks +8 menit) dan ongkos kirim pemasok +10% (armada sendiri tetap lebih murah).
        const supplyDelay = kid => { const k = refineryData.find(x => x.id === kid), p = refineryData[0]; return (!k || k === p) ? SUPPLY_DELAY_MS : SUPPLY_DELAY_MS + Math.min(480000, Math.round(distKm(p, k) * 1000)); };
        const supplyPrice = (kid, price) => kid === refineryData[0].id ? price : Math.round(price * 1.1);
        function supplyBadge(kid, key) {
            const q = supplyQueue.filter(s => s.kid === kid && s.key === key); if (!q.length) return '';
            const qty = q.reduce((a, s) => a + s.qty, 0), menit = Math.max(1, Math.ceil((Math.min(...q.map(s => s.at)) - gameElapsed) / 60000));
            return `<div class="text-[10px] text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded px-2 py-1"><i class="fa-solid fa-truck-fast mr-1"></i>Pasokan ${qty.toLocaleString('id-ID')} dalam perjalanan, tiba &plusmn;${menit} menit lagi.</div>`;
        }
        function supplyOrder(kid, key, qty, cost, label, unit, auto) {
            const kn = (refineryData.find(x => x.id === kid) || {}).nama || kid;
            companyCash -= cost; totalExpense += cost; bbmSpent += cost;
            supplyQueue.push({ id: 'SUP-' + Date.now() + Math.floor(Math.random() * 999), kid, key, qty, label, unit, at: gameElapsed + supplyDelay(kid) });
            addFinanceLog(`Pesan ${label} ${qty.toLocaleString('id-ID')} ${unit} (${kn})${auto ? ' [Pass]' : ''}`, -cost);
            updateCashDisplay(); renderRefineries();
            addLog(`PASOKAN DIPESAN${auto ? ' OTOMATIS (Pass' + (typeof auto === 'string' ? ': ' + auto : '') + ')' : ''}: ${qty.toLocaleString('id-ID')} ${unit} ${label} menuju ${kn} seharga ${formatRupiah(cost)}, tiba ±${Math.round(supplyDelay(kid) / 60000)} menit.`, 'success');
        }
        function supplyOrderFlow(kid, key, n, label, unit, price, needSign) {
            const room = supplyRoom(kid, key), qty = Math.min(n || room, room);
            if (qty <= 0) return showModal('Tangki Penuh', `Tangki ${label} sudah penuh atau pasokan yang dipesan sudah cukup mengisinya.`, 'fa-circle-info', 'blue');
            const cost = Math.round(qty * supplyPrice(kid, price));
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(cost)} untuk ${qty.toLocaleString('id-ID')} ${unit} ${label}.`, 'fa-triangle-exclamation', 'red');
            const go = () => {
                if (companyCash < cost) return;
                supplyOrder(kid, key, qty, cost, label, unit, false);
                showModal('Pesanan Dibuat', `${qty.toLocaleString('id-ID')} ${unit} ${label} dalam perjalanan. Stok bertambah setelah ±${Math.round(supplyDelay(kid) / 60000)} menit.`, 'fa-truck-fast', 'blue');
            };
            if (needSign) openSignature(`Konfirmasi pemesanan ${qty.toLocaleString('id-ID')} ${unit} ${label} seharga ${formatRupiah(cost)} (${formatRupiah(supplyPrice(kid, price))}/${unit}).${marketBuyNote(key)} Barang tiba setelah ±${Math.round(supplyDelay(kid) / 60000)} menit. Tanda tangani untuk menyetujui.`, go); else go();
        }
        // Status pasokan anjungan untuk tangki ini: 'ok' = ada anjungan sejenis dengan pipa sehat yang mengalir ke kilang/depo ini (anjungan jadi sumber utama),
        // 'down' = ada anjungan tapi pipa belum ada/bocor/berhenti, 'none' = tidak ada anjungan yang melayani. Tuban dianggap dilayani semua anjungan sejenis;
        // depo lain hanya dilayani anjungan yang sudah punya pipa ke depo itu.
        function supplyAnjungan(kid, key) {
            try {
                const fuel = key === 'bbl' ? 'oil' : key === 'lpg_curah' ? 'gas' : null;
                if (!fuel) return 'none';
                const ready = HULU_KEYS.filter(k => HULU_SITES[k].fuel === fuel && hs(k).ready && !hs(k).shutIn);
                const piped = ready.filter(k => huluPipeKeys(k).indexOf(kid) >= 0);
                if (kid === refineryData[0].id ? !ready.length : !piped.length) return 'none';
                return piped.some(k => huluPipeInfo(k, kid).key === 'r') ? 'ok' : 'down';
            } catch (e) { return 'none'; }
        }
        function autoRefill() {
            const T = [];
            refineryData.forEach((k, i) => {
                if (!k.is_unlocked) return;
                if (i === 0 || String(k.tipe).includes('BBM')) T.push([k.id, 'bbl', 'Bahan Bakar', 'Bbl', bblPrice()]);
                if (k.kap && k.kap.lpg_curah) T.push([k.id, 'lpg_curah', 'LPG Curah', 'Ton', lpgCurahPrice()]);
            });
            T.forEach(([kid, key, label, unit, price]) => {
                const sl = supplySlot(kid, key); if (!sl || !sl.max) return;
                const anj = supplyAnjungan(kid, key), cov = anj === 'ok';
                const eff = sl.cur + supplyPending(kid, key); if (eff / sl.max > (cov ? SUPPLY_ANJ_OPEN : SUPPLY_AUTO_OPEN)) return;
                const qty = Math.floor(sl.max * (cov ? SUPPLY_ANJ_FILL : SUPPLY_AUTO_FILL) - eff); if (qty <= 0) return;
                const cost = Math.round(qty * supplyPrice(kid, price));
                if (companyCash - cost < (passState.floor || 0)) {
                    if (gameElapsed - supplyAutoWarnAt > 300000) { supplyAutoWarnAt = gameElapsed; addLog(`PASS: isi ulang otomatis ${label} ditahan, kas tidak cukup (butuh ${formatRupiah(cost)}).`, 'warning'); }
                    return;
                }
                supplyOrder(kid, key, qty, cost, label, unit, anj === 'ok' ? 'stok kritis, pasokan anjungan belum cukup' : anj === 'down' ? 'anjungan tidak mengalir (pipa bocor/belum ada)' : 'stok menipis');
            });
        }
        function tickSupply() {
            const due = supplyQueue.filter(s => s.at <= gameElapsed);
            if (due.length) {
                supplyQueue = supplyQueue.filter(s => s.at > gameElapsed);
                due.forEach(s => {
                    const sl = supplySlot(s.kid, s.key); if (!sl) return;
                    if (s.key === 'bbl') { sl.k.stok_current = Math.min(sl.max, sl.k.stok_current + s.qty); bbmWarned = false; }
                    else sl.k.kap[s.key].cur = Math.min(sl.max, Math.round((sl.cur + s.qty) * 100) / 100);
                    addLog(`PASOKAN TIBA: ${s.qty.toLocaleString('id-ID')} ${s.unit} ${s.label} masuk ${sl.k.nama}.`, 'success');
                });
                renderRefineries();
            }
            if (passHas('refill')) autoRefill();
        }

        // ===== KAPASITAS DEPO: upgrade tangki, isi ulang, konversi LPG curah->tabung, kirim otomatis ke cabang =====
        function kapUpgradeCost(meta, level) { return Math.round(meta.baseCost * Math.pow(1.32, level || 0)); }

        function upgradeKapasitas(kilangId, key) {
            if (pphBlokir()) return;
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.is_unlocked || !kilang.kap || !kilang.kap[key]) return;
            const meta = PRODUCT_META[key], slot = kilang.kap[key];
            const capMax = KAP_UPGRADE_CAPS[key];
            if (capMax && slot.max >= capMax) {
                showModal('Kapasitas Maksimum', `Tangki ${meta.label} di ${kilang.nama} sudah mencapai batas maksimum ${capMax.toLocaleString('id-ID')} ${meta.unit}.`, 'fa-circle-info', 'blue');
                return;
            }
            const cost = kapUpgradeCost(meta, slot.level);
            if (companyCash < cost) {
                showModal('Kas Tidak Cukup', `Upgrade kapasitas tangki ${meta.label} di ${kilang.nama} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
                return;
            }
            companyCash -= cost; totalExpense += cost;
            slot.max = capMax ? Math.min(capMax, slot.max + meta.step) : slot.max + meta.step;
            slot.level = (slot.level || 0) + 1;
            addFinanceLog(`Upgrade Kapasitas ${meta.label} - ${kilang.nama}`, -cost);
            updateCashDisplay();
            addLog(`KAPASITAS DITINGKATKAN: Tangki ${meta.label} di ${kilang.nama} kini menampung ${slot.max.toLocaleString('id-ID')} ${meta.unit}.`, 'success');
            renderRefineries();
        }

        // Lama proses olah dalam JAM GAME: 3 jam (jumlah kecil) sampai 4 jam (jumlah >= 1 langkah konversi / isi penuh).
        // Dihitung dari jam game (gameNow), jadi ikut berhenti saat game dijeda / tab tidak aktif, dan 3-4 jam game
        // = 30-40 menit nyata (GAME_SPEED). Mengembalikan milidetik WAKTU GAME.
        const REFINE_MIN_JAM = 3, REFINE_MAX_JAM = 4;
        function refineDurationMs(amount, scale) {
            const s = scale || amount || 1;
            const frac = Math.min(1, Math.max(0, amount / s));
            return Math.round((REFINE_MIN_JAM + (REFINE_MAX_JAM - REFINE_MIN_JAM) * frac) * 3600000);
        }
        const refineJamLabel = ms => (Math.round(ms / 360000) / 10).toString().replace('.', ',') + ' jam game';

        // Proses olah = "job" yang disimpan di slot (slot.job) berdasarkan jam game: { gs: mulai, ge: selesai, from, to, kind, bbl, amount }.
        // Satu ticker global menaikkan slot.cur SEDIKIT DEMI SEDIKIT sesuai waktu game yang berjalan (animasi stok jalan
        // selama diolah), lalu menyelesaikannya. Karena job ikut tersimpan di save (kap), proses tetap lanjut setelah refresh.
        function startRefineJob(kilang, slot, addAmount, durGameMs, info) {
            const gs = gameNow();
            slot.refining = true;
            slot.job = Object.assign({ gs, ge: gs + durGameMs, from: slot.cur, to: Math.min(slot.max, Math.round((slot.cur + addAmount) * 100) / 100) }, info || {});
        }
        function finishRefineJob(kilang, key, slot) {
            const j = slot.job, meta = PRODUCT_META[key];
            slot.cur = j.to; slot.refining = false; delete slot.job;
            if (j.kind === 'lpg') {
                addLog(`KONVERSI SELESAI: ${(j.amount || 0).toLocaleString('id-ID')} Ton LPG Tabung siap distribusi di ${kilang.nama}.`, 'success');
                notify(`Konversi selesai: ${(j.bbl || 0).toLocaleString('id-ID')} Ton LPG Curah menjadi ${(j.amount || 0).toLocaleString('id-ID')} Ton LPG Tabung di ${kilang.nama}. (Susut 8%)`, 'success');
            } else {
                addLog(`KONVERSI SELESAI: ${(j.amount || 0).toLocaleString('id-ID')} ${meta.unit} ${meta.label} siap di ${kilang.nama}.`, 'success');
                notify(`Konversi selesai: ${(j.bbl || 0).toLocaleString('id-ID')} Bbl mentah menjadi ${(j.amount || 0).toLocaleString('id-ID')} ${meta.unit} ${meta.label} di ${kilang.nama}.`, 'success');
            }
        }
        function tickRefineJobs() {
            if (!currentAccount || isSuspended()) return;
            const now = gameNow();
            refineryData.forEach(kilang => {
                if (!kilang.kap) return;
                let changed = false, done = false;
                Object.keys(kilang.kap).forEach(key => {
                    const slot = kilang.kap[key];
                    if (!slot.refining) return;
                    if (!slot.job) { slot.refining = false; done = true; return; } // save lama: status "diolah" tanpa job -> bebaskan
                    const j = slot.job, frac = Math.min(1, Math.max(0, (now - j.gs) / (j.ge - j.gs)));
                    if (frac >= 1) { finishRefineJob(kilang, key, slot); done = true; }
                    else { slot.cur = Math.round((j.from + (j.to - j.from) * frac) * 100) / 100; changed = true; }
                });
                if (done) renderRefineries(); else if (changed) updateKilangLiveBars(kilang);
            });
        }
        setInterval(tickRefineJobs, 500);

        function convertLpgCurah(kilangId) {
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.kap || !kilang.kap.lpg_curah || !kilang.kap.lpg_tabung) return;
            const curah = kilang.kap.lpg_curah, tabung = kilang.kap.lpg_tabung, RATIO = 0.92;
            if (tabung.refining) return; // sedang diolah, tombol seharusnya sudah disembunyikan/nonaktif
            const room = tabung.max - tabung.cur;
            const amount = Math.min(curah.cur, room / RATIO);
            if (amount <= 0) {
                showModal('Tidak Bisa Konversi', curah.cur <= 0 ? `Stok LPG Curah di ${kilang.nama} kosong.` : `Tangki LPG Tabung di ${kilang.nama} sudah penuh.`, 'fa-circle-exclamation', 'amber');
                return;
            }
            const hasil = Math.round(amount * RATIO * 100) / 100;
            const durasi = refineDurationMs(amount, 1500);
            // Bahan mentah LPG Curah langsung terpakai begitu proses dimulai; hasil LPG Tabung baru masuk tangki setelah durasi olah selesai.
            curah.cur = Math.round((curah.cur - amount) * 100) / 100;
            addLog(`KONVERSI LPG: ${kilang.nama} mulai mengolah ${amount.toLocaleString('id-ID')} Ton LPG Curah menjadi LPG Tabung (&plusmn;${refineJamLabel(durasi)}).`, 'info');
            startRefineJob(kilang, tabung, hasil, durasi, { kind: 'lpg', bbl: amount, amount: hasil });
            renderRefineries();
        }

        // ===== KONVERSI BBL -> BBM: manual lewat tombol, prosesnya berjalan sesuai durasi (tidak instan, tidak otomatis lagi) =====
        // n = jumlah produk (KL) yang mau dihasilkan sekali klik; n=0/kosong artinya "isi penuh sebisa mungkin".
        // Biaya olah (BBL -> BBM) & transfer darat Tuban -> depo: Rp per Bbl mentah yang dipakai (ECO.biayaOlahBbl / ECO.biayaTransferDaratBbl).
        // Dibayar di muka saat proses dimulai. Mengembalikan false (tanpa memotong kas) kalau kas tidak cukup.
        function chargeBiayaBbl(bbl, tarif, desc) {
            const biaya = Math.round(bbl * tarif);
            if (companyCash < biaya) return false;
            companyCash -= biaya; totalExpense += biaya;
            addFinanceLog(desc, -biaya);
            return biaya;
        }
        function convertBblKeProduk(kilangId, key, n) {
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.kap || !kilang.kap[key]) return;
            const meta = PRODUCT_META[key], slot = kilang.kap[key];
            if (!meta || !meta.refineRatio) return;
            if (slot.refining) return; // sedang diolah, tombol seharusnya sudah disembunyikan/nonaktif
            const room = slot.max - slot.cur;
            const maxByBbl = kilang.stok_current / meta.refineRatio;
            const amount = Math.min(n || room, room, maxByBbl);
            if (amount <= 0) {
                showModal('Tidak Bisa Konversi', kilang.stok_current <= 0 ? `Stok BBL mentah di ${kilang.nama} kosong.` : `Tangki ${meta.label} di ${kilang.nama} sudah penuh.`, 'fa-circle-exclamation', 'amber');
                return;
            }
            const bblUsed = Math.round(amount * meta.refineRatio * 100) / 100;
            const durasi = refineDurationMs(amount, BBL_CONVERT_STEP[key]);
            const biayaOlah = chargeBiayaBbl(bblUsed, ECO.biayaOlahBbl, `Biaya Olah ${bblUsed.toLocaleString('id-ID')} Bbl -> ${meta.label} - ${kilang.nama}`);
            if (biayaOlah === false) return showModal('Kas Tidak Cukup', `Biaya olah ${bblUsed.toLocaleString('id-ID')} Bbl adalah ${formatRupiah(Math.round(bblUsed * ECO.biayaOlahBbl))} (${formatRupiah(ECO.biayaOlahBbl)}/Bbl). Kurangi jumlah atau tambah kas.`, 'fa-triangle-exclamation', 'red');
            // BBL mentah langsung terpakai/terkunci begitu proses dimulai; hasil BBM baru masuk tangki setelah durasi olah selesai.
            kilang.stok_current = Math.max(0, Math.round((kilang.stok_current - bblUsed) * 100) / 100);
            addLog(`KONVERSI BBL: ${kilang.nama} mulai mengolah ${bblUsed.toLocaleString('id-ID')} Bbl mentah menjadi ${meta.label} (&plusmn;${refineJamLabel(durasi)}).`, 'info');
            startRefineJob(kilang, slot, amount, durasi, { kind: 'bbm', bbl: bblUsed, amount });
            renderRefineries();
        }

        // ===== KONVERSI BBL -> SEMUA JENIS BBM SEKALIGUS (1 tombol) =====
        // Beda dari convertBblKeProduk (per-jenis, manual pilih satu-satu): tombol ini mengurutkan semua jenis BBM
        // yang belum diolah/belum penuh di kilang/depo ini, lalu MULAI proses "isi penuh" untuk tiap jenis satu
        // per satu (stok BBL mentah dipakai berurutan sampai habis atau semua tangki BBM penuh). Proses tiap
        // jenis TETAP berjalan sesuai durasinya masing-masing secara paralel (bukan instan/langsung jadi) - lihat
        // convertBblKeProduk untuk mekanisme durasi & badge "Diolah" per jenis.
        function convertBblSemuaJenis(kilangId) {
            const kilang = refineryData.find(k => k.id === kilangId);
            if (!kilang || !kilang.kap) return;
            const keys = Object.keys(kilang.kap).filter(key => {
                const meta = PRODUCT_META[key], slot = kilang.kap[key];
                return meta && meta.refineRatio && key !== 'lpg_curah' && key !== 'lpg_tabung' && slot && !slot.refining;
            });
            if (!keys.length) return;
            const started = []; let kasKurang = false;
            for (const key of keys) {
                if (kilang.stok_current <= 0) break; // BBL mentah habis, hentikan - jenis berikutnya tidak kebagian
                const meta = PRODUCT_META[key], slot = kilang.kap[key];
                const room = slot.max - slot.cur;
                if (room <= 0) continue; // tangki jenis ini sudah penuh, lewati
                const maxByBbl = kilang.stok_current / meta.refineRatio;
                const amount = Math.min(room, maxByBbl);
                if (amount <= 0) continue;
                const bblUsed = Math.round(amount * meta.refineRatio * 100) / 100;
                const durasi = refineDurationMs(amount, BBL_CONVERT_STEP[key]);
                if (chargeBiayaBbl(bblUsed, ECO.biayaOlahBbl, `Biaya Olah ${bblUsed.toLocaleString('id-ID')} Bbl -> ${meta.label} - ${kilang.nama}`) === false) { kasKurang = true; continue; } // kas tak cukup untuk jenis ini, lewati
                kilang.stok_current = Math.max(0, Math.round((kilang.stok_current - bblUsed) * 100) / 100);
                started.push({ key, meta, amount, bblUsed });
                addLog(`KONVERSI BBL: ${kilang.nama} mulai mengolah ${bblUsed.toLocaleString('id-ID')} Bbl mentah menjadi ${meta.label} (&plusmn;${refineJamLabel(durasi)}) - bagian dari konversi massal semua jenis.`, 'info');
                startRefineJob(kilang, slot, amount, durasi, { kind: 'bbm', bbl: bblUsed, amount });
            }
            renderRefineries();
            if (!started.length) {
                showModal('Tidak Bisa Konversi', kasKurang ? `Kas tidak cukup untuk biaya olah (${formatRupiah(ECO.biayaOlahBbl)}/Bbl).` : kilang.stok_current <= 0 ? `Stok BBL mentah di ${kilang.nama} kosong.` : `Semua tangki BBM di ${kilang.nama} sudah penuh.`, 'fa-circle-exclamation', 'amber');
                return;
            }
            const ringkasan = started.map(s => `${s.amount.toLocaleString('id-ID')} ${s.meta.unit} ${s.meta.label}`).join(', ');
            // Bug fix: sebelumnya showModal (blocking, wajib diklik OK) tepat saat proses baru mulai - kalau
            // durasinya pendek, begitu modal ditutup prosesnya sudah selesai duluan sehingga terasa "instan".
            // Sekarang notify() (toast di panel notifikasi, tidak menutupi/menghentikan apa pun) supaya progress
            // bar & badge "Diolah" yang sedang berjalan bertahap tetap kelihatan.
            notify(`${kilang.nama} mulai mengolah BBL mentah jadi semua jenis BBM sekaligus: ${ringkasan}. Tunggu sampai badge "Diolah" hilang.`, 'info');
        }

        const openKapPanels = new Set(); // id kilang yang panel "Kapasitas Depo"-nya sedang dibuka user - dipakai supaya tidak ikut nutup tiap renderRefineries()
        function toggleKapPanel(id) {
            const el = document.getElementById('kap-panel-' + id), btn = document.getElementById('kap-toggle-' + id);
            if (!el) return;
            el.classList.toggle('hidden');
            const nowOpen = !el.classList.contains('hidden');
            if (nowOpen) openKapPanels.add(id); else openKapPanels.delete(id);
            if (btn) { const ic = btn.querySelector('.kap-chev'); if (ic) ic.classList.toggle('rotate-180', nowOpen); }
        }

        function renderKapPanel(kilang) {
            if (!kilang.kap) return '';
            const keys = Object.keys(kilang.kap);
            if (!keys.length) return '';
            const isPusat = kilang.id === 'KILANG-01';
            // LPG Curah sudah tampil sebagai gauge bahan mentah sendiri (lpgCurahBuyHtml, sejajar BBL mentah) di Kilang
            // Pusat, jadi tidak perlu dobel muncul lagi di daftar kecil "Kapasitas Depo" ini.
            const visibleKeys = isPusat ? keys.filter(k => k !== 'lpg_curah') : keys;
            // Jenis BBM (bukan LPG) yang di kilang/depo ini memang diolah dari BBL mentah - dipakai buat tombol
            // konversi massal "Semua Jenis" (1 klik olah semua, bukan satu-satu manual per jenis lewat convertBblKeProduk).
            const bbmRefineKeys = visibleKeys.filter(key => PRODUCT_META[key] && PRODUCT_META[key].refineRatio && key !== 'lpg_curah' && key !== 'lpg_tabung');
            const anyBbmRefining = bbmRefineKeys.some(key => kilang.kap[key].refining);
            const convertAllBtn = bbmRefineKeys.length
                ? (anyBbmRefining
                    ? `<button disabled class="w-full mb-1.5 bg-amber-900/60 text-amber-200 text-[10px] font-bold py-1.5 rounded cursor-not-allowed"><i class="fa-solid fa-industry fa-fade mr-1"></i>Sedang Mengolah BBL &rarr; BBM...</button>`
                    : `<button onclick="convertBblSemuaJenis('${kilang.id}')" class="w-full mb-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded shadow"><i class="fa-solid fa-industry mr-1"></i> Konversi BBL &rarr; Semua Jenis BBM (Isi Penuh)</button>`)
                : '';
            const rows = visibleKeys.map(key => {
                const meta = PRODUCT_META[key], slot = kilang.kap[key];
                const pct = slot.max ? Math.round((slot.cur / slot.max) * 100) : 0;
                const cost = kapUpgradeCost(meta, slot.level);
                // BBL (bahan mentah) diolah jadi BBM (Pertalite/Pertamax/dst) lewat tombol Konversi manual - tidak lagi otomatis.
                // Berlaku di Kilang Pusat MAUPUN Depo Cabang BBM: cabang mengolah sendiri stok BBL mentah yang dikirim dari pusat.
                const isBbmRefine = meta.refineRatio && key !== 'lpg_curah' && key !== 'lpg_tabung';
                // Badge "Diolah" dipakai untuk animasi selama proses konversi berjalan (BBL->BBM maupun LPG Curah->Tabung).
                const showsRefineBadge = isBbmRefine || key === 'lpg_tabung';
                const refineBadge = showsRefineBadge
                    ? `<span id="kap-refine-${kilang.id}-${key}" class="${slot.refining ? '' : 'hidden'} text-[8px] text-amber-300 font-semibold shrink-0 ml-1"><i class="fa-solid fa-industry fa-fade mr-0.5"></i>Diolah</span>`
                    : '';
                const refineInfo = isBbmRefine
                    ? `<div class="text-[9px] text-gray-300 mb-1"><i class="fa-solid fa-arrows-turn-right mr-1 text-amber-500"></i>Diolah dari stok BBL mentah lewat tombol Konversi &middot; butuh ${meta.refineRatio.toLocaleString('id-ID', { maximumFractionDigits: 2 })} Bbl mentah / ${meta.unit}</div>`
                    : '';
                const convertBblRow = isBbmRefine
                    ? (slot.refining
                        ? `<div class="mb-1"><button disabled class="w-full text-[9px] bg-amber-900/60 text-amber-200 rounded px-1.5 py-1 font-bold cursor-not-allowed"><i class="fa-solid fa-industry fa-fade mr-1"></i>Sedang Diolah Jadi ${meta.label}...</button></div>`
                        : '')
                    : '';
                const capMax = KAP_UPGRADE_CAPS[key];
                const atCap = capMax && slot.max >= capMax;
                const upgradeBtn = atCap
                    ? `<span class="text-[9px] text-gray-500 px-1.5 py-0.5"><i class="fa-solid fa-circle-check mr-1"></i>Kapasitas maksimum</span>`
                    : `<button onclick="upgradeKapasitas('${kilang.id}','${key}')" class="text-[9px] bg-emerald-700 hover:bg-emerald-600 text-white rounded px-1.5 py-0.5 font-semibold"><i class="fa-solid fa-arrow-up-right-dots"></i> Upgrade Tangki (${formatRupiah(cost)})</button>`;
                return `<div class="text-[10px]">
                    <div class="flex justify-between items-center mb-0.5 gap-1">
                        <span class="text-gray-100 font-semibold truncate flex items-center"><i class="fa-solid ${meta.icon} mr-1" style="color:${meta.color}"></i>${meta.label}${refineBadge}</span>
                        <span id="kap-text-${kilang.id}-${key}" class="font-mono text-[11px] font-bold text-white shrink-0">${slot.cur.toLocaleString('id-ID', { maximumFractionDigits: 1 })}/${slot.max.toLocaleString('id-ID')} ${meta.unit}</span>
                    </div>
                    <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mb-1">
                        <div id="kap-bar-${kilang.id}-${key}" class="${slot.refining ? 'refine-flow' : ''} h-full transition-all duration-500" style="width:${pct}%;background:${meta.color}"></div>
                    </div>
                    ${refineInfo}
                    ${convertBblRow}
                    <div class="flex gap-1 flex-wrap">
                        ${upgradeBtn}
                    </div>
                </div>`;
            }).join('<div class="border-t border-gray-800/70"></div>');

            const convertBtn = (kilang.kap.lpg_curah && kilang.kap.lpg_tabung)
                ? (kilang.kap.lpg_tabung.refining
                    ? `<button disabled class="w-full mt-1.5 bg-amber-900/60 text-amber-200 text-[10px] font-bold py-1.5 rounded cursor-not-allowed"><i class="fa-solid fa-industry fa-fade mr-1"></i> Sedang Diolah Jadi Tabung...</button>`
                    : `<button onclick="convertLpgCurah('${kilang.id}')" class="w-full mt-1.5 bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 rounded"><i class="fa-solid fa-arrows-turn-to-dots mr-1"></i> Konversi LPG Curah &rarr; Tabung</button>`)
                : '';

            let kirimForm = '';
            if (isPusat) {
                // Pengiriman instan (klik Kirim, stok langsung pindah) SUDAH DIHAPUS. Bahan mentah (BBL & LPG Curah)
                // ke Depo Cabang sekarang hanya lewat menu Kirim BBL / LPG Curah (kapal tanker, atau jalur darat
                // khusus depo tanpa dermaga). Tiap cabang tetap wajib mengolah sendiri stok mentahnya lewat Konversi.
                kirimForm = `<div class="mt-2 pt-2 border-t border-gray-800 text-[9px] text-gray-500"><i class="fa-solid fa-ship text-cyan-400 mr-1"></i>Kirim bahan mentah ke Depo Cabang lewat menu <b class="text-gray-300">Kirim BBL</b> / <b class="text-gray-300">LPG Curah</b> (memakai kapal tanker).</div>`;
            }

            const isOpen = openKapPanels.has(kilang.id);
            return `<div class="pt-1.5 border-t border-gray-800">
                <button id="kap-toggle-${kilang.id}" onclick="toggleKapPanel('${kilang.id}')" class="w-full flex items-center justify-between text-[10px] font-bold text-teal-400 uppercase tracking-wide py-1">
                    <span><i class="fa-solid fa-warehouse mr-1"></i> Kapasitas Depo (${visibleKeys.length} Jenis)</span>
                    <i class="fa-solid fa-chevron-down kap-chev text-[9px] transition-transform${isOpen ? ' rotate-180' : ''}"></i>
                </button>
                <div id="kap-panel-${kilang.id}" class="${isOpen ? '' : 'hidden'} space-y-1.5 mt-1">
                    ${convertAllBtn}
                    ${rows}
                    ${convertBtn}
                    ${kirimForm}
                </div>
            </div>`;
        }

        // ===== PENGOLAHAN BBL: sekarang manual lewat tombol Konversi (lihat convertBblKeProduk) =====
        // Update tampilan bar stok mentah & tiap tangki produk tanpa render ulang seluruh kartu (biar panel yg lagi
        // dibuka pemain, misal Kapasitas Depo, tidak ikut ke-collapse tiap kali proses olah berdenyut).
        function updateKilangLiveBars(kilang) {
            if (!kilang) return;
            const pct = kilang.stok_max ? Math.round((kilang.stok_current / kilang.stok_max) * 100) : 0;
            const crudeBar = document.getElementById('crude-bar-' + kilang.id);
            const crudeTxt = document.getElementById('crude-text-' + kilang.id);
            const anyRefining = kilang.kap ? Object.values(kilang.kap).some(s => s.refining) : false;
            if (crudeTxt) crudeTxt.innerText = `${Math.round(kilang.stok_current).toLocaleString('id-ID')} / ${kilang.stok_max.toLocaleString('id-ID')} ${kilang.unit}`;
            if (crudeBar) {
                crudeBar.style.width = pct + '%';
                crudeBar.classList.toggle('bg-red-500', pct <= 15);
                crudeBar.classList.toggle('bg-emerald-500', pct > 15);
                crudeBar.classList.toggle('refine-flow', anyRefining);
            }
            const indicator = document.getElementById('refine-indicator-' + kilang.id);
            if (indicator) indicator.classList.toggle('hidden', !anyRefining);

            const lpgSlot = kilang.kap && kilang.kap.lpg_curah;
            if (lpgSlot) {
                const lpgBar = document.getElementById('lpgcurah-bar-' + kilang.id);
                const lpgTxt = document.getElementById('lpgcurah-text-' + kilang.id);
                const lpgPct = lpgSlot.max ? Math.round((lpgSlot.cur / lpgSlot.max) * 100) : 0;
                if (lpgTxt) lpgTxt.innerText = `${lpgSlot.cur.toLocaleString('id-ID', { maximumFractionDigits: 1 })} / ${lpgSlot.max.toLocaleString('id-ID')} Ton`;
                if (lpgBar) lpgBar.style.width = lpgPct + '%';
            }

            Object.keys(kilang.kap || {}).forEach(key => {
                const meta = PRODUCT_META[key], slot = kilang.kap[key];
                const kBar = document.getElementById(`kap-bar-${kilang.id}-${key}`);
                const kTxt = document.getElementById(`kap-text-${kilang.id}-${key}`);
                const kBadge = document.getElementById(`kap-refine-${kilang.id}-${key}`);
                const kpct = slot.max ? Math.round((slot.cur / slot.max) * 100) : 0;
                if (kTxt) kTxt.innerText = `${slot.cur.toLocaleString('id-ID', { maximumFractionDigits: 1 })}/${slot.max.toLocaleString('id-ID')} ${meta.unit}`;
                if (kBar) { kBar.style.width = kpct + '%'; kBar.classList.toggle('refine-flow', !!slot.refining); }
                if (kBadge) kBadge.classList.toggle('hidden', !slot.refining);
            });
        }

        // Kredit hasil pengiriman Kilang Pusat -> Depo Cabang (rute kapal/darat). Untuk Depo Cabang LPG, muatan
        // "LPG Curah" masuk ke tangki kap.lpg_curah (yang benar-benar dipakai tombol Konversi LPG Curah -> Tabung),
        // bukan ke gauge atas yang terpisah, supaya LPG curah yang dikirim beneran bisa diolah cabang.
        // Untuk Depo Cabang BBM, BBL mentah tetap masuk ke gauge atas (stok_current), sama seperti dipakai
        // convertBblKeProduk. Mengembalikan info tangki yang dikredit, untuk ditampilkan di log.
        function creditKlgDelivery(target, amount, type) {
            const isLpg = type ? type === 'LPG' : target.tipe.includes('LPG');
            if (target.kap && target.kap.lpg_curah && isLpg) {
                const slot = target.kap.lpg_curah;
                slot.cur = Math.min(slot.max, Math.round((slot.cur + amount) * 100) / 100);
                return { cur: slot.cur, max: slot.max, unit: 'Ton' };
            }
            target.stok_current = Math.min(target.stok_max, Math.round((target.stok_current + amount) * 10) / 10);
            return { cur: target.stok_current, max: target.stok_max, unit: target.unit };
        }

        // ===== PERMINTAAN PASOKAN DEPO (order internal) =====
        // Depo cabang yang tangki mentahnya (BBL untuk depo BBM, LPG Curah untuk depo LPG) menipis sampai
        // <= SUPPLY_REQ_OPEN otomatis membuka "Permintaan Pasokan" ke Kilang Pusat. Order tetap terbuka sampai
        // stok fisik depo naik >= SUPPLY_REQ_CLOSE. Depo berdermaga dipasok kapal tanker (atau konvoi truk BBL), depo tanpa dermaga lewat darat.
        // Daftar order ini hanya status di memori (bukan data save): dibangun ulang dari stok depo tiap tick.
        const SUPPLY_REQ_OPEN = 0.25, SUPPLY_REQ_CLOSE = 0.60;
        const supplyReqOpen = new Set();     // kunci `${idDepo}|${BBM|LPG}` untuk order yang sedang terbuka
        const supplyIncoming = new Map();    // kunci sama -> volume kapal yang SEDANG BERLAYAR ke depo itu (reservasi ruang tangki)
        let supplyReqFirst = true;           // tick pertama setelah muat save: buka order tanpa membanjiri log
        const supplyKey = (d, type) => d.id + '|' + type;
        const supplyTypes = d => [String(d.tipe).includes('BBM') ? 'BBM' : null, String(d.tipe).includes('LPG') ? 'LPG' : null].filter(Boolean);
        // Tangki yang dipasok untuk jenis muatan tertentu: LPG -> tangki LPG Curah cabang, BBM -> gauge BBL mentah.
        function depoTank(d, type) {
            const slot = type === 'LPG' && d.kap && d.kap.lpg_curah;
            return slot ? { cur: slot.cur, max: slot.max, unit: 'Ton' } : { cur: d.stok_current, max: d.stok_max, unit: d.unit };
        }
        const incomingOf = (d, type) => (supplyIncoming.get(supplyKey(d, type)) || 0) + supplyPending(d.id, type === 'LPG' ? 'lpg_curah' : 'bbl'); // + pasokan yang sudah dipesan (pass/manual)
        function addIncoming(d, type, v) {
            const k = supplyKey(d, type);
            supplyIncoming.set(k, Math.max(0, Math.round(((supplyIncoming.get(k) || 0) + v) * 100) / 100));
            renderSupplyReq();
        }
        // Lepas reservasi milik satu pelayaran (aman dipanggil berkali-kali).
        function releaseIncoming(job) {
            if (!job || !job.incReserved) return;
            job.incReserved = false;
            addIncoming(job.spbu, job.neededType, -job.amount);
        }
        function supplyReqReset() { supplyReqOpen.clear(); supplyIncoming.clear(); supplyReqFirst = true; }
        const supplyReqIsOpen = d => supplyTypes(d).some(t => supplyReqOpen.has(supplyKey(d, t)));
        const supplyLabel = type => type === 'LPG' ? 'LPG Curah' : 'BBL Mentah';

        function supplyReqTick() {
            const quiet = supplyReqFirst; supplyReqFirst = false;
            let changed = false;
            refineryData.forEach(d => {
                if (d.id === 'KILANG-01') return;
                supplyTypes(d).forEach(type => {
                    const k = supplyKey(d, type), open = supplyReqOpen.has(k);
                    if (!d.is_unlocked) { if (open) { supplyReqOpen.delete(k); changed = true; } return; }
                    const t = depoTank(d, type); if (!(t.max > 0)) return;
                    const pct = t.cur / t.max;
                    if (!open && pct <= SUPPLY_REQ_OPEN) {
                        supplyReqOpen.add(k); changed = true;
                        if (!quiet) {
                            addLog(`PERMINTAAN PASOKAN: ${d.nama} menipis (${Math.round(pct * 100)}% dari tangki ${supplyLabel(type)}) dan meminta kiriman dari Kilang Tuban. ${isCoastal(d) ? (type === 'LPG' ? 'Depo berdermaga - kirim pakai kapal tanker.' : 'Depo berdermaga - kirim pakai kapal tanker atau konvoi darat.') : 'Depo tanpa dermaga - kirim lewat jalur darat.'}`, 'warning');
                            notify(`Permintaan pasokan: ${d.nama} butuh ${supplyLabel(type)}. Buka menu Kirim ${type === 'LPG' ? 'LPG Curah' : 'BBL'}.`, 'warn');
                        }
                    } else if (open && pct >= SUPPLY_REQ_CLOSE) {
                        supplyReqOpen.delete(k); changed = true;
                        addLog(`PERMINTAAN TERPENUHI: tangki ${supplyLabel(type)} ${d.nama} kini ${Math.round(pct * 100)}%.`, 'success');
                    }
                });
            });
            if (changed) renderRefineries(); // warna penanda peta & lencana kartu depo (jarang terjadi: hanya saat order dibuka/ditutup)
            renderSupplyReq();
        }

        function supplyReqBadge(d) {
            const open = supplyTypes(d).filter(t => supplyReqOpen.has(supplyKey(d, t)));
            if (!open.length) return '';
            return `<div class="text-[10px] text-red-300 bg-red-500/10 border border-red-500/30 rounded px-2 py-1"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Meminta pasokan: ${open.map(supplyLabel).join(' &amp; ')}</div>`;
        }

        function renderSupplyReq() {
            const card = document.getElementById('supply-req-card'), list = document.getElementById('supply-req-list'), cnt = document.getElementById('supply-req-count');
            if (!card || !list) return;
            const rows = [];
            supplyReqOpen.forEach(k => {
                const [id, type] = k.split('|'), d = refineryData.find(x => x.id === id); if (!d) return;
                const t = depoTank(d, type), inc = incomingOf(d, type);
                rows.push({ d, type, t, inc, pct: t.cur / t.max, need: Math.max(0, Math.floor(t.max - t.cur - inc)) });
            });
            rows.sort((a, b) => a.pct - b.pct);
            card.classList.toggle('hidden', !rows.length);
            if (cnt) cnt.textContent = rows.length ? `(${rows.length})` : '';
            list.innerHTML = rows.map(r => {
                const p = Math.round(r.pct * 100), sea = isCoastal(r.d), u = r.t.unit, done = r.need <= 0;
                return `<div class="bg-gray-900 border border-gray-800 rounded-lg p-2.5 space-y-1.5">
                    <div class="flex justify-between items-start gap-2">
                        <div class="min-w-0">
                            <div class="text-[11px] font-bold text-gray-200 truncate">${esc(r.d.nama)}</div>
                            <div class="text-[10px] text-gray-500">${supplyLabel(r.type)} &middot; ${sea ? `<span class="text-cyan-400"><i class="fa-solid fa-anchor"></i> ${r.type === 'LPG' ? 'via kapal' : 'kapal / darat'}</span>` : '<span class="text-amber-400"><i class="fa-solid fa-road"></i> via darat</span>'}</div>
                        </div>
                        <button ${done ? 'disabled' : `onclick="supplyReqPick('${r.d.id}','${r.type}')"`} class="shrink-0 text-[10px] font-bold px-2 py-1 rounded ${done ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-cyan-700 hover:bg-cyan-600 text-white'}">${done ? 'Menunggu kiriman' : 'Penuhi'}</button>
                    </div>
                    <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden"><div class="bg-red-500 h-full" style="width:${Math.min(100, p)}%"></div></div>
                    <div class="flex justify-between text-[10px] text-gray-400 font-mono">
                        <span>${fmtN(r.t.cur)} / ${fmtN(r.t.max)} ${u} (${p}%)</span>
                        <span>${r.inc > 0 ? `<span class="text-emerald-400">&#9654; ${fmtN(r.inc)} berlayar</span> &middot; ` : ''}butuh ${fmtN(r.need)}</span>
                    </div>
                </div>`;
            }).join('');
        }
        // Tombol "Penuhi": buka menu Kirim BBL/LPG dengan tujuan sudah terpilih.
        function supplyReqPick(id, type) {
            openTransferKapal(type);
            const sel = document.getElementById('transfer-target-select');
            if (sel && sel.querySelector(`option[value="${id}"]`)) { sel.value = id; populateTransferKapal(); }
        }

        // Info rute transfer Kilang Pusat -> Depo tujuan: jenis muatan yg dibutuhkan & apakah dua-duanya Pesisir
        // (kalau ya, bisa dilayani kapal tanker; kalau tidak, hanya bisa lewat jalur darat).
        function transferModeInfo() {
            const targetId = document.getElementById('transfer-target-select').value;
            const pusat = refineryData[0];
            const target = refineryData.find(k => k.id === targetId);
            if (!target) return { target: null, pusat, neededType: null, coastal: false };
            const dual = target.tipe.includes('LPG') && target.tipe.includes('BBM');
            const neededType = dual ? (transferFuelFilter === 'LPG' ? 'LPG' : 'BBM') : (target.tipe.includes('LPG') ? 'LPG' : 'BBM');
            return { target, pusat, neededType, coastal: isCoastal(pusat) && isCoastal(target) };
        }

        // Pintu masuk khusus "Kirim BBL" (BBM) & "LPG Curah" ke tab-kapal (transfer stok antar Kilang/Depo).
        // Dipanggil dari 2 tombol nav terpisah supaya jelas mana untuk BBM, mana untuk LPG - keduanya berbagi
        // satu tab-content yang sama (tab-kapal), cuma filter tujuan & judul panelnya yang menyesuaikan.
        function openTransferKapal(type) {
            transferFuelFilter = type; // 'BBM' atau 'LPG' - dibaca renderRefineries() saat mengisi dropdown tujuan
            switchTab('tab-kapal');
            renderRefineries(); // isi ulang dropdown tujuan sesuai filter jenis yang baru dipilih

            // switchTab menyorot & mengambil judul dari btn-tab-kapal generik (sengaja disembunyikan di nav) -
            // timpa di sini supaya sorotan & judul panel mengikuti tombol spesifik yang benar-benar dipencet.
            document.querySelectorAll('.tab-btn').forEach(el => { el.classList.remove('text-emerald-300', 'bg-emerald-500/10', 'border-emerald-500/25', 'shadow-inner'); el.classList.add('text-gray-400'); });
            const btn = document.getElementById(type === 'LPG' ? 'btn-tab-kapal-lpg' : 'btn-tab-kapal-bbm');
            if (btn) { btn.classList.add('text-emerald-300', 'bg-emerald-500/10', 'border-emerald-500/25', 'shadow-inner'); btn.classList.remove('text-gray-400'); }
            const titleEl = document.getElementById('tab-panel-title');
            if (titleEl && btn) { const icon = btn.querySelector('i'), label = [...btn.querySelectorAll('span')].find(s => !s.querySelector('i') && s.textContent.trim() && !s.id); titleEl.innerHTML = (icon ? icon.outerHTML + ' ' : '') + (label ? label.textContent : ''); }

            const panelTitle = document.getElementById('kapal-panel-title');
            const panelDesc = document.getElementById('kapal-panel-desc');
            if (type === 'LPG') {
                if (panelTitle) panelTitle.innerHTML = '<i class="fa-solid fa-fire-flame-simple mr-2"></i> Kirim LPG Curah ke Depo/Cabang';
                if (panelDesc) panelDesc.textContent = 'Khusus mengirim pasokan LPG curah dari Kilang Pusat ke Depo Cabang LPG yang punya akses pelabuhan, memakai Kapal Tanker LPG (beli di tab Dealer). Tujuan berdermaga wajib dilayani kapal; jalur darat hanya untuk depo tanpa dermaga.';
            } else {
                if (panelTitle) panelTitle.innerHTML = '<i class="fa-solid fa-truck-ramp-box mr-2"></i> Kirim BBL ke Depo/Cabang';
                if (panelDesc) panelDesc.textContent = 'Khusus mengirim pasokan BBL (bahan bakar mentah) dari Kilang Pusat ke Kilang/Depo Cabang BBM yang punya akses pelabuhan, memakai Kapal Tanker BBM (beli di tab Dealer). Tujuan berdermaga bisa dilayani kapal ATAU konvoi Truk Tangki BBL lewat darat (pilih sesuai waktu & biaya); depo tanpa dermaga dilayani konvoi Truk Tangki BBL (Hino / Fuso / Isuzu Giga / UD Quester, beli di tab Dealer).';
            }
        }

        // Isi ulang dropdown Unit Kapal Tanker & tampilkan/sembunyikan panel laut vs darat sesuai kelayakan rute.
        function populateTransferKapal() {
            const sel = document.getElementById('transfer-kapal-select');
            const wrapKapal = document.getElementById('transfer-kapal-wrap');
            const wrapLand = document.getElementById('transfer-land-wrap');
            const hint = document.getElementById('transfer-hint');
            if (!sel || !wrapKapal) return;
            const info = transferModeInfo();
            const prev = sel.value;
            sel.innerHTML = '';
            let ships = [];
            if (info.target && info.coastal) {
                ships = companyFleet.filter(t => t.kelas === 'kapal' && t.type === info.neededType && !busyIds.has(t.id));
                ships.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.innerText = `${s.id} [${s.plat}]${unitJulukan(s)} - ${s.name} (${s.cap.toLocaleString('id-ID')} ${info.neededType === 'LPG' ? 'Ton' : 'Bbl'}) · pangkalan ${shipBaseOf(s).nama}`; sel.appendChild(o); });
            }
            if (prev && sel.querySelector(`option[value="${prev}"]`)) sel.value = prev;
            else if (sel.options.length) sel.selectedIndex = 0;

            // BBL ke depo berdermaga boleh kapal ATAU konvoi darat (pemain memilih); LPG curah berdermaga tetap wajib kapal.
            const landOk = !!(info.target && info.coastal && info.neededType === 'BBM');
            const modeLand = landOk && (transferRoute === 'darat' || !ships.length);
            const useKapal = !!(info.target && info.coastal && ships.length) && !modeLand;
            wrapKapal.classList.toggle('hidden', !useKapal);
            if (wrapLand) wrapLand.classList.toggle('hidden', useKapal || !!(info.target && info.coastal && !modeLand)); // LPG berdermaga: panel darat disembunyikan
            renderTransferModePicker(info, ships, landOk, modeLand);

            if (hint) {
                if (!info.target) hint.textContent = '';
                else if (info.coastal && info.neededType === 'BBM') hint.textContent = `${info.target.nama} berakses pelabuhan: BBL bisa dikirim lewat Kapal Tanker atau konvoi truk tangki BBL lewat jalur darat. Bandingkan waktu & biaya di bawah.`;
                else if (info.coastal && !ships.length) hint.textContent = `${info.target.nama} berakses pelabuhan (Pesisir), tapi Anda belum punya Kapal Tanker ${info.neededType} - beli dulu di tab Dealer. Depo berdermaga tidak bisa dipasok lewat darat.`;
                else if (info.coastal) hint.textContent = `${info.target.nama} berakses pelabuhan - kirim otomatis pakai Kapal Tanker ${info.neededType}, durasi pelayaran mengikuti jarak laut sesungguhnya.`;
                else hint.textContent = `${info.target.nama} tidak berakses pelabuhan (Darat) - hanya bisa ditransfer lewat jalur darat${info.neededType === 'BBM' ? ' memakai konvoi truk tangki BBL (Hino / Fuso / Isuzu Giga / UD Quester, beli di Dealer)' : ''}.`;
            }
            if (hint && info.target) { const inc = incomingOf(info.target, info.neededType); if (inc > 0) hint.textContent += ` Sedang berlayar ke sana: ${fmtN(inc)} ${info.neededType === 'LPG' ? 'Ton' : 'Bbl'}.`; }
            renderLandFleetInfo(info);
            if (useKapal) populateTransferCrew();
        }

        function setTransferRoute(m) { transferRoute = m === 'darat' ? 'darat' : 'kapal'; populateTransferKapal(); }
        // Pemilih rute (hanya BBL ke depo berdermaga) + perbandingan estimasi waktu & biaya kapal vs konvoi darat.
        function renderTransferModePicker(info, ships, landOk, modeLand) {
            const wrap = document.getElementById('transfer-mode-wrap'); if (!wrap) return;
            wrap.classList.toggle('hidden', !landOk);
            if (!landOk) return;
            const on = 'bg-cyan-600/20 border-cyan-500 text-cyan-200', off = 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200';
            const bK = document.getElementById('transfer-mode-kapal'), bD = document.getElementById('transfer-mode-darat');
            bK.className = `py-1.5 rounded-lg border transition ${!modeLand ? on : off}`;
            bD.className = `py-1.5 rounded-lg border transition ${modeLand ? on : off}`;
            const { pusat, target } = info;
            const tk = depoTank(target, 'BBM'), room = Math.max(0, Math.floor(tk.max - tk.cur - incomingOf(target, 'BBM')));
            const row = (ic, col, judul, lines) => `<div class="rounded-lg border border-gray-800 bg-gray-950 px-2 py-1.5"><div class="font-bold ${col}"><i class="fa-solid ${ic} mr-1"></i>${judul}</div>${lines.map(l => `<div>${l}</div>`).join('')}</div>`;
            // --- Kapal ---
            let kapalRow;
            const ship = ships[0] ? (companyFleet.find(t => t.id === (document.getElementById('transfer-kapal-select') || {}).value) || ships[0]) : null;
            const seaKmV = seaKm(pusat, target);
            if (!ship) kapalRow = row('fa-ship', 'text-cyan-300', 'Kapal Tanker', [`Jarak laut ±${Math.round(seaKmV)} km &middot; ±${fmtJam(seaKmV / AVG_SHIP_SPEED_KMH)} sekali jalan`, '<span class="text-amber-300">Belum ada kapal BBM yang bebas.</span>']);
            else {
                const pl = shipPlan(ship, pusat, target), muat = Math.min(ship.cap, room);
                kapalRow = pl.err ? row('fa-ship', 'text-cyan-300', `Kapal ${esc(ship.id)}`, [`<span class="text-red-300">${esc(pl.err)}</span>`])
                    : row('fa-ship', 'text-cyan-300', `Kapal ${esc(ship.id)} (${fmtN(ship.cap)} Bbl)`, [`Jarak laut ±${Math.round(pl.oneWayKm)} km &middot; tiba ±${fmtJam(pl.oneWayKm / pl.speed)}`, `Pangkalan: ${esc(pl.base.nama)}${pl.outKm > 0 ? ` (ke Tuban ±${Math.round(pl.outKm)} km dulu)` : ''}${pl.backKm > 0 ? ` &middot; pulang ±${Math.round(pl.backKm)} km` : ''}`, `Biaya: bunker ${formatRupiah(pl.cost)} &middot; ±${formatRupiah(Math.round(muat > 0 ? pl.cost / muat : 0))}/Bbl`, 'Rawan ditahan cuaca buruk (gelombang/badai), perlu Nahkoda &amp; ABK.']);
            }
            // --- Darat ---
            const pool = depoConvoySelected(pusat), cap = pool.reduce((a, t) => a + bblOfTruck(t), 0), muatD = Math.min(cap, room);
            const beda = islandOf(pusat) !== islandOf(target), roadKm = distKm(pusat, target) * 1.3; // perkiraan: garis lurus x faktor kelokan jalan
            const jamD = roadKm / AVG_TRUCK_SPEED_KMH + (beda ? 3 : 0);
            const biayaD = Math.round(muatD * ECO.biayaTransferDaratBbl);
            const daratRow = row('fa-truck-ramp-box', 'text-teal-300', `Konvoi darat (${pool.length} unit, ${fmtN(cap)} Bbl)`, [`Jarak jalan ±${Math.round(roadKm)} km${beda ? ' + ferry antar pulau' : ''} &middot; tiba ±${fmtJam(jamD)}`, pool.length ? `Biaya: ${formatRupiah(biayaD)} (${formatRupiah(ECO.biayaTransferDaratBbl)}/Bbl) + solar &amp; ban truk` : '<span class="text-amber-300">Belum ada Truk Tangki BBL yang siap.</span>', 'Tidak terkena larangan cuaca laut; muatan terbatas kapasitas unit.']);
            document.getElementById('transfer-compare').innerHTML = `<div class="grid grid-cols-1 gap-1.5">${kapalRow}${daratRow}</div><div class="text-[9px] text-gray-500 mt-1">*Estimasi waktu game satu arah; jarak darat perkiraan. Kapal besar biasanya lebih hemat per Bbl untuk muatan besar, konvoi darat lebih lincah untuk muatan kecil.</div>`;
        }

        // Isi ulang dropdown Nahkoda & ABK yang sedang tidak bertugas.
        function populateTransferCrew() {
            const nSel = document.getElementById('transfer-nahkoda-select');
            const aSel = document.getElementById('transfer-abk-select');
            if (!nSel || !aSel) return;
            const prev = [nSel.value, aSel.value];
            nSel.innerHTML = ''; aSel.innerHTML = '';
            companyCrew.forEach(c => {
                if (busyIds.has(c.id)) return;
                const stars = '★'.repeat(repToStars(c.reputation));
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = `${c.name} (${stars} Rep ${Math.round(c.reputation)} - Viol: ${c.violations})`;
                if (c.role === 'Nahkoda') nSel.appendChild(opt.cloneNode(true));
                else if (c.role === 'ABK') aSel.appendChild(opt.cloneNode(true));
            });
            [nSel, aSel].forEach((el, i) => { if (prev[i] && el.querySelector(`option[value="${prev[i]}"]`)) el.value = prev[i]; else if (el.options.length) el.selectedIndex = 0; });
        }

        // ===== TRANSFER BBL DARAT: KONVOI TRUK TANGKI ANTAR DEPO (tujuan tanpa dermaga ATAU berdermaga) =====
        // Muatan konvoi = jumlah kapasitas truk 'depo' yang berpangkalan di Kilang Tuban dan sedang bebas (kapasitas truk depo langsung dalam Bbl).
        // Unit dipilih dari yang terbesar sampai muatan tercukupi. Konvoi dipimpin 1 Supir + 1 Kernet (kru terbaik yang sedang bebas).
        const bblOfTruck = t => Math.floor(t.cap);
        const convoyOff = new Set();   // id truk yang dicentang OFF pemain (default semua unit bebas ikut konvoi)
        const depoTruckReason = (t, origin) => (t.depotId || 'KILANG-01') !== origin.id ? 'berpangkalan di depo lain' : busyIds.has(t.id) ? 'sedang bertugas' : docExpired(t) ? 'dokumen kedaluwarsa' : '';
        function depoConvoyPool(origin) {
            return companyFleet.filter(t => isDepoTruck(t) && t.type === 'BBM' && !depoTruckReason(t, origin)).sort((a, b) => b.cap - a.cap);
        }
        const depoConvoySelected = origin => depoConvoyPool(origin).filter(t => !convoyOff.has(t.id));
        function toggleConvoyUnit(id, on) { if (on) convoyOff.delete(id); else convoyOff.add(id); try { renderLandFleetInfo(transferModeInfo()); } catch (e) {} }
        function convoyCrewOptions(role) {
            const rep = c => (c.reputation || 0) * 1000 - (c.violations || 0);
            return companyCrew.filter(c => c.role === role && !busyIds.has(c.id)).sort((a, b) => rep(b) - rep(a));
        }
        function executeLandBblConvoy(info, amount) {
            const { pusat, target } = info;
            const pool = depoConvoyPool(pusat), sel = depoConvoySelected(pusat);
            if (!pool.length) return showModal('Butuh Truk Tangki BBL', `${target.nama} dipasok lewat konvoi truk tangki BBL jalur darat. Beli unit (Hino, Fuso, Isuzu Giga, atau UD Quester) di tab Dealer > Truk BBL Antar Depo dengan pangkalan ${pusat.nama}, lalu kirim lagi. Unit yang sedang jalan / dokumennya kedaluwarsa tidak dihitung.`, 'fa-truck-ramp-box', 'amber');
            if (!sel.length) return showModal('Pilih Unit Truk', 'Centang minimal satu unit Truk Tangki BBL untuk ikut konvoi.', 'fa-circle-exclamation', 'red');
            const driver = companyCrew.find(c => c.id === (document.getElementById('transfer-convoy-driver') || {}).value);
            const kernet = companyCrew.find(c => c.id === (document.getElementById('transfer-convoy-kernet') || {}).value);
            if (!driver || !kernet) return showModal('Kru Tidak Tersedia', `Konvoi butuh 1 Supir & 1 Kernet yang sedang bebas${!driver ? ' (Supir kosong)' : ''}${!kernet ? ' (Kernet kosong)' : ''}. Tunggu kru kembali atau rekrut di tab SDM.`, 'fa-user-slash', 'red');
            if (busyCheck(sel[0], driver, kernet)) return;
            const totalCap = sel.reduce((a, t) => a + bblOfTruck(t), 0);
            const tk = depoTank(target, 'BBM'), roomFisik = Math.floor(tk.max - tk.cur), roomTujuan = roomFisik - incomingOf(target, 'BBM');
            if (roomTujuan < 1) return roomFisik >= 1
                ? showModal('Pasokan Sudah Mencukupi', `Pasokan yang sudah dalam perjalanan akan mengisi tangki ${target.nama} sampai penuh. Tunggu kiriman itu tiba.`, 'fa-truck-ramp-box', 'blue')
                : showModal('Tangki Depo Penuh', `Tangki ${target.nama} sudah penuh, tidak ada ruang untuk muatan baru.`, 'fa-circle-info', 'blue');
            const muat = Math.floor(Math.min(amount, totalCap, pusat.stok_current, roomTujuan));
            if (muat < 1) return showModal('Stok Kurang', 'Stok BBL mentah Kilang Tuban tidak mencukupi!', 'fa-triangle-exclamation', 'red');
            // Hanya unit yang benar-benar dibutuhkan yang berangkat (terbesar dulu); unit tercentang lain tetap standby.
            const pick = []; let sum = 0; for (const t of sel) { if (sum >= muat) break; pick.push(t); sum += bblOfTruck(t); }
            const biayaDarat = Math.round(muat * ECO.biayaTransferDaratBbl);
            if (companyCash < biayaDarat) return showModal('Kas Tidak Cukup', `Biaya konvoi darat ${fmtN(muat)} Bbl adalah ${formatRupiah(biayaDarat)} (${formatRupiah(ECO.biayaTransferDaratBbl)}/Bbl).`, 'fa-triangle-exclamation', 'red');
            const lead = pick[0];
            const d = { spbu: target, truck: lead, convoy: pick, driver, kernet, origin: pusat, amount: muat, neededType: 'BBM' };
            openSuratJalanModal({ mode: 'KLG', tujuanNama: target.nama, tujuanKode: target.id, jenisMuatan: 'BBL Mentah (dari Kilang Pusat Tuban, konvoi darat)',
                volumeText: `${fmtN(muat)} Bbl · ${pick.length} unit truk tangki (kapasitas ${fmtN(sum)} Bbl) · biaya darat ${formatRupiah(biayaDarat)}${muat < amount ? ' · dibatasi kapasitas unit terpilih/stok/ruang tujuan' : ''}`,
                truck: lead, driver, kernet, labels: { truk: `Pemimpin Konvoi (${pick.length} unit)`, plat: 'No. Polisi Pemimpin Konvoi', driver: 'Supir Pemimpin Konvoi', kernet: 'Kernet Pendamping' },
                execute: (nomorSJ) => {
                    if (pick.some(t => busyIds.has(t.id)) || busyIds.has(driver.id) || busyIds.has(kernet.id)) return showModal('Kondisi Berubah', 'Ada unit/kru konvoi yang sudah bertugas saat Surat Jalan ditandatangani. Ulangi pengiriman.', 'fa-circle-info', 'amber');
                    if (pusat.stok_current < muat) return showModal('Stok Kurang', 'Stok BBL mentah Kilang Tuban tidak mencukupi!', 'fa-triangle-exclamation', 'red');
                    { const t2 = depoTank(target, 'BBM'); if (muat > Math.floor(t2.max - t2.cur - incomingOf(target, 'BBM'))) return showModal('Kondisi Berubah', 'Ruang tangki tujuan berubah karena ada kiriman lain. Ulangi pengiriman.', 'fa-circle-info', 'amber'); }
                    if (chargeBiayaBbl(muat, ECO.biayaTransferDaratBbl, `Biaya Konvoi Darat ${fmtN(muat)} Bbl ke ${target.nama} (${pick.length} truk)`) === false) return showModal('Kas Tidak Cukup', `Biaya konvoi darat ${formatRupiah(biayaDarat)} tidak tertutup kas.`, 'fa-triangle-exclamation', 'red');
                    addIncoming(target, 'BBM', muat); d.incReserved = true;
                    d.refund = () => { pusat.stok_current = Math.min(pusat.stok_max, pusat.stok_current + muat); };
                    pusat.stok_current -= muat;
                    d.nomorSJ = nomorSJ;
                    renderRefineries();
                    const inp = document.getElementById('transfer-amount-input'); if (inp) inp.value = '';
                    animateDepoConvoy(d);
                    addLog(`SURAT JALAN ${nomorSJ}: KONVOI ${pick.length} truk tangki BBL [Pemimpin: ${lead.id}, Supir: ${driver.name}] DITANDATANGANI & BERANGKAT membawa ${fmtN(muat)} Bbl dari ${pusat.nama} ke ${target.nama}.`, 'purple');
                    showModal('Konvoi Berangkat', `Surat Jalan ${nomorSJ} ditandatangani. ${pick.length} unit truk tangki berangkat membawa ${fmtN(muat)} Bbl ke ${target.nama}. Stok depo bertambah setelah konvoi tiba & selesai bongkar; unit dan kru baru bebas setelah kembali ke ${pusat.nama}.`, 'fa-truck-ramp-box', 'blue');
                } });
        }
        // Panel pilih unit di menu Kirim BBL (konvoi darat, depo tanpa dermaga maupun berdermaga): daftar truk tangki BBL + kru + ringkasan muatan.
        function renderLandFleetInfo(info) {
            const wrap = document.getElementById('transfer-convoy-wrap'); if (!wrap) return;
            const show = !!(info.target && info.neededType === 'BBM' && (!info.coastal || transferRoute === 'darat' || !companyFleet.some(t => t.kelas === 'kapal' && t.type === 'BBM' && !busyIds.has(t.id))));
            wrap.classList.toggle('hidden', !show);
            if (!show) return;
            const all = companyFleet.filter(t => isDepoTruck(t) && t.type === 'BBM').sort((a, b) => b.cap - a.cap);
            const list = document.getElementById('transfer-convoy-list');
            list.innerHTML = all.length ? all.map(t => {
                const why = depoTruckReason(t, info.pusat), on = !why && !convoyOff.has(t.id);
                return `<label class="flex items-center gap-2 text-[11px] rounded px-2 py-1 border ${why ? 'bg-gray-950/50 border-gray-800 text-gray-600' : 'bg-gray-950 border-gray-800 text-gray-200 cursor-pointer'}">
                    <input type="checkbox" ${on ? 'checked' : ''} ${why ? 'disabled' : ''} onchange="toggleConvoyUnit('${t.id}', this.checked)" class="accent-teal-500">
                    <span class="min-w-0 flex-1 truncate">${t.id} <span class="font-mono text-amber-400/80">[${t.plat}]</span>${unitJulukan(t)} &middot; ${t.name}</span>
                    <span class="shrink-0 font-mono text-[10px] ${why ? 'text-gray-600' : 'text-teal-300'}">${why ? why : fmtN(bblOfTruck(t)) + ' Bbl'}</span></label>`;
            }).join('') : '<div class="text-[10px] text-amber-200">Belum punya Truk Tangki BBL. Beli di tab Dealer &gt; Truk BBL Antar Depo (Hino / Fuso / Isuzu Giga / UD Quester).</div>';
            [['transfer-convoy-driver', 'Supir'], ['transfer-convoy-kernet', 'Kernet']].forEach(([id, role]) => {
                const el = document.getElementById(id); if (!el) return;
                const prev = el.value; el.innerHTML = '';
                convoyCrewOptions(role).forEach(c => { const o = document.createElement('option'); o.value = c.id; o.innerText = `${c.name} (${'★'.repeat(repToStars(c.reputation))} Rep ${Math.round(c.reputation)} - Viol: ${c.violations})`; el.appendChild(o); });
                if (prev && el.querySelector(`option[value="${prev}"]`)) el.value = prev; else if (el.options.length) el.selectedIndex = 0;
            });
            const sel = depoConvoySelected(info.pusat), cap = sel.reduce((a, t) => a + bblOfTruck(t), 0);
            document.getElementById('transfer-land-fleet').innerHTML = sel.length
                ? `<i class="fa-solid fa-circle-check mr-1"></i>${sel.length} unit terpilih &middot; muatan maks sekali jalan ${fmtN(cap)} Bbl. Hanya unit yang dibutuhkan yang berangkat.`
                : '<i class="fa-solid fa-triangle-exclamation mr-1 text-amber-300"></i><span class="text-amber-200">Belum ada unit yang siap/terpilih di ' + info.pusat.nama + '.</span>';
        }

        function executeTransferStock() {
            if (pphBlokir()) return;
            const info = transferModeInfo();
            if (!info.target) return showModal('Peringatan', 'Pilih depo tujuan terlebih dahulu!', 'fa-circle-exclamation', 'red');

            const wrapKapal = document.getElementById('transfer-kapal-wrap');
            const useKapal = wrapKapal && !wrapKapal.classList.contains('hidden');
            const { pusat, target, neededType } = info;
            const unitMuat = neededType === 'LPG' ? 'Ton' : target.unit; // depo gabungan BBM&LPG: gauge Bbl, tapi muatan LPG dihitung Ton

            // ===== RUTE LAUT: Kapal Tanker (Kilang Pusat <-> Depo Pesisir), volume = kapasitas kapal, durasi = jarak laut =====
            if (useKapal) {
                const kapal = companyFleet.find(t => t.id === document.getElementById('transfer-kapal-select').value);
                const nahkoda = companyCrew.find(c => c.id === document.getElementById('transfer-nahkoda-select').value);
                const abk = companyCrew.find(c => c.id === document.getElementById('transfer-abk-select').value);
                if (!kapal || !nahkoda || !abk) return showModal('Peringatan', 'Lengkapi pilihan Kapal Tanker, Nahkoda & ABK!', 'fa-circle-exclamation', 'red');
                if (busyCheck(kapal, nahkoda, abk)) return;
                if (docBlock(kapal)) return;

                // Muatan = yang terkecil dari: kapasitas kapal, stok Kilang Tuban, dan ruang kosong di tangki depo tujuan
                // (kapal besar tidak lagi butuh stok/ruang sebesar kapasitas penuhnya).
                const tankT = depoTank(target, neededType), roomFisik = tankT.max - tankT.cur, roomTujuan = roomFisik - incomingOf(target, neededType); // ruang tujuan dikurangi muatan kapal lain yang sedang berlayar
                // Kapal LPG mengambil dari tangki LPG Curah Tuban; kapal BBM dari stok minyak mentah.
                const srcLpg = neededType === 'LPG' && pusat.kap && pusat.kap.lpg_curah ? pusat.kap.lpg_curah : null;
                const srcStok = () => srcLpg ? srcLpg.cur : pusat.stok_current;
                const muat = Math.floor(Math.min(kapal.cap, srcStok(), Math.max(0, roomTujuan)));
                if (roomTujuan < 1) return roomFisik >= 1
                    ? showModal('Pasokan Sudah Mencukupi', `Kapal lain sedang membawa ${fmtN(incomingOf(target, neededType))} ${unitMuat} ke ${target.nama} dan akan mengisi tangkinya sampai penuh. Tunggu kapal itu tiba.`, 'fa-ship', 'blue')
                    : showModal('Tangki Depo Penuh', `Tangki ${target.nama} sudah penuh, tidak ada ruang untuk muatan baru.`, 'fa-circle-info', 'blue');
                if (muat < 1) return showModal('Stok Kurang', srcLpg ? 'Tangki LPG Curah Kilang Tuban kosong, tidak ada yang bisa dimuat kapal.' : 'Stok Kilang Tuban kosong, tidak ada yang bisa dimuat kapal.', 'fa-triangle-exclamation', 'red');
                const bblUse = target.unit === 'KL' ? Math.ceil(muat * ECO.bblPerKl) : muat;
                // Tahap 3: bahan bakar & servis. Bunker dibayar saat Surat Jalan ditandatangani; di sini hanya cek kelayakan.
                const planKapal = shipPlan(kapal, pusat, target);
                if (planKapal.err) return showModal('Pelayaran Ditolak', planKapal.err, 'fa-gas-pump', 'red');
                if (companyCash < planKapal.cost) return showModal('Kas Tidak Cukup', `${kapal.id} butuh ${shipPlanText(planKapal)} sebelum berlayar, kas Anda ${formatRupiah(companyCash)}.`, 'fa-sack-dollar', 'red');

                const d = { spbu: target, truck: kapal, driver: nahkoda, kernet: abk, origin: pusat, amount: muat, neededType };
                openSuratJalanModal({ mode: 'KLG', tujuanNama: target.nama, tujuanKode: target.id, jenisMuatan: `${neededType} Curah (dari Kilang Pusat Tuban)`, volumeText: `${muat.toLocaleString('id-ID')} ${unitMuat} (kapasitas kapal ${kapal.cap.toLocaleString('id-ID')}) · ${shipPlanText(planKapal)}`,
                    truck: kapal, driver: nahkoda, kernet: abk, labels: { truk: 'Unit Kapal Tanker', plat: 'No. Registrasi', driver: 'Nahkoda Bertugas', kernet: 'ABK Pendamping' },
                    execute: (nomorSJ) => {
                        if (srcStok() < (srcLpg ? muat : bblUse)) return showModal('Stok Kurang', 'Stok Kilang Tuban tidak mencukupi!', 'fa-triangle-exclamation', 'red');
                        // Cek ulang ruang tujuan (kapal lain bisa saja berangkat selagi Surat Jalan ditandatangani), lalu kunci ruangnya.
                        { const t2 = depoTank(target, neededType); if (muat > Math.floor(t2.max - t2.cur - incomingOf(target, neededType))) return showModal('Kondisi Berubah', 'Ruang tangki tujuan berubah karena ada kapal lain yang berangkat ke sana. Ulangi pengiriman.', 'fa-circle-info', 'amber'); }
                        { const pk = shipPlan(kapal, pusat, target); if (pk.err || !shipBunker(kapal, pk)) return showModal('Kas Tidak Cukup', pk.err || `${kapal.id} butuh ${shipPlanText(pk)} sebelum berlayar.`, 'fa-sack-dollar', 'red'); }
                        addIncoming(target, neededType, muat); d.incReserved = true;
                        d.refund = () => { if (srcLpg) srcLpg.cur = Math.min(srcLpg.max, Math.round((srcLpg.cur + muat) * 100) / 100); else pusat.stok_current = Math.min(pusat.stok_max, pusat.stok_current + bblUse); };
                        if (srcLpg) srcLpg.cur = Math.round(Math.max(0, srcLpg.cur - muat) * 100) / 100; else pusat.stok_current = Math.max(0, pusat.stok_current - bblUse);
                        renderRefineries();
                        d.nomorSJ = nomorSJ;
                        animateKapalTransfer(d);
                        addLog(`SURAT JALAN ${nomorSJ}: Kapal ${kapal.id} [Nahkoda: ${nahkoda.name}] DITANDATANGANI & BERLAYAR membawa ${muat.toLocaleString('id-ID')} ${unitMuat} ${neededType} curah ke ${target.nama}.`, 'purple');
                        showModal('Kapal Berangkat', `Surat Jalan ${nomorSJ} telah ditandatangani. ${kapal.id} resmi berlayar membawa ${muat.toLocaleString('id-ID')} ${unitMuat} ke ${target.nama}.\nStok depo tujuan bertambah otomatis setelah kapal tiba & kru selesai bongkar muatan.`, 'fa-ship', 'blue');
                    } });
                return;
            }

            // Depo berdermaga WAJIB dilayani kapal - jalur darat instan hanya untuk depo tanpa dermaga.
            if (info.coastal && neededType !== 'BBM') return showModal('Butuh Kapal Tanker', `${target.nama} berdermaga, jadi hanya bisa dipasok lewat kapal. Beli Kapal Tanker ${neededType} di tab Dealer, rekrut Nahkoda & ABK di tab SDM, lalu kirim lagi.`, 'fa-ship', 'amber');

            // ===== RUTE DARAT: transfer instan (truk konvoi, diabstraksikan) untuk depo tanpa akses pelabuhan =====
            const amount = parseInt(document.getElementById('transfer-amount-input').value);
            if (isNaN(amount) || amount <= 0) return showModal('Peringatan', 'Masukkan jumlah transfer yang valid!', 'fa-circle-exclamation', 'red');
            // BBL jalur darat (depo tanpa dermaga, atau berdermaga bila dipilih): WAJIB konvoi truk tangki BBL (Hino / Fuso / Isuzu Giga / UD Quester dari Dealer). LPG curah darat tetap lewat jalur lama.
            if (neededType === 'BBM') return executeLandBblConvoy(info, amount);
            const bblUse = target.unit === 'KL' ? Math.ceil(amount * ECO.bblPerKl) : amount;
            if (pusat.stok_current < bblUse) return showModal('Stok Kurang', `Stok Kilang Tuban tidak mencukupi!`, 'fa-triangle-exclamation', 'red');
            { const tk = depoTank(target, neededType), ruang = Math.floor(tk.max - tk.cur); if (amount > ruang) return showModal('Melebihi Kapasitas', `Ruang tangki ${target.nama} tinggal ${fmtN(ruang)} ${unitMuat}. Kurangi jumlah kiriman.`, 'fa-circle-info', 'amber'); }
            const biayaDarat = Math.round(bblUse * ECO.biayaTransferDaratBbl);
            if (companyCash < biayaDarat) return showModal('Kas Tidak Cukup', `Biaya transfer darat ${bblUse.toLocaleString('id-ID')} Bbl adalah ${formatRupiah(biayaDarat)} (${formatRupiah(ECO.biayaTransferDaratBbl)}/Bbl).`, 'fa-triangle-exclamation', 'red');

            openSuratJalanModal({ mode: 'KLG', tujuanNama: target.nama, tujuanKode: target.id, jenisMuatan: `${neededType} (dari Kilang Pusat Tuban, jalur darat)`, volumeText: `${amount.toLocaleString()} ${unitMuat} - biaya darat ${formatRupiah(biayaDarat)}`,
                execute: (nomorSJ) => {
                    if (pusat.stok_current < bblUse) {
                        showModal('Stok Kurang', 'Stok Kilang Tuban tidak mencukupi!', 'fa-triangle-exclamation', 'red');
                        return;
                    }
                    if (chargeBiayaBbl(bblUse, ECO.biayaTransferDaratBbl, `Biaya Transfer Darat ${bblUse.toLocaleString('id-ID')} Bbl ke ${target.nama}`) === false) {
                        showModal('Kas Tidak Cukup', `Biaya transfer darat ${formatRupiah(biayaDarat)} tidak tertutup kas.`, 'fa-triangle-exclamation', 'red');
                        return;
                    }
                    pusat.stok_current -= bblUse;
                    creditKlgDelivery(target, amount, neededType);

                    renderRefineries();
                    document.getElementById('transfer-amount-input').value = '';

                    addLog(`SURAT JALAN ${nomorSJ}: TRANSFER PASOKAN DARAT ${amount.toLocaleString()} ${unitMuat} dikirim dari Tuban ke ${target.nama}.`, 'purple');
                    showModal('Transfer Berhasil', `Surat Jalan ${nomorSJ} telah ditandatangani. Berhasil mentransfer ${amount.toLocaleString()} ${unitMuat} ${neededType} ke ${target.nama} lewat jalur darat.`, 'fa-truck-arrow-right', 'blue');
                } });
        }

        function filterSpbuByRegion() {
            const selectedRegion = document.getElementById('delivery-region-filter').value;
            populateSpbuDropdowns(selectedRegion);
            const l = loadedSpbuList.filter(s => isOp(s) && (selectedRegion === 'ALL' || s.wilayahId === selectedRegion));
            if (l.length) map.flyToBounds(L.latLngBounds(l.map(s => [s.lat, s.lon])), { maxZoom: 11, padding: [30, 30] });
        }

        function renderSpbuOnMap() {
            mapMarkers.forEach(m => map.removeLayer(m));
            mapMarkers = [];

            let activeSpbuCount = 0;

            loadedSpbuList.forEach(spbu => {
                if (!spbu.is_approved) return;

                if (!spbu.blocked) activeSpbuCount++;
                let markerColor = spbu.tipe === 'COCO' ? '#3b82f6' : '#a855f7';
                if (spbu.has_lpg) markerColor = '#eab308';
                if (spbu.blocked) markerColor = '#ef4444';

                const marker = L.circleMarker([spbu.lat, spbu.lon], {
                    radius: spbu.has_lpg ? 6.5 : 5,
                    fillColor: markerColor,
                    color: "#ffffff",
                    weight: 1.2,
                    fillOpacity: spbu.blocked ? 0.45 : 0.85
                }).addTo(map);

                marker.bindPopup(`
                    <div class="text-gray-900 font-sans p-1">
                        <div class="text-[10px] font-bold text-blue-700">${spbu.kode}</div>
                        <strong class="text-xs font-bold block">${spbu.nama}</strong>
                        <div class="text-[10px] text-gray-600">Kab/Kota: ${spbu.region}</div>
                        <div class="text-[10px] text-gray-600">Wilayah BBM (Depo): <b>${spbu.wilayahBbmNama || '-'}</b>${spbu.wilayahBbmJarak != null ? ` (&plusmn;${spbu.wilayahBbmJarak} km)` : ''}</div>
                        ${spbu.has_lpg ? `<div class="text-[10px] text-gray-600">Wilayah LPG (Depo): <b>${spbu.wilayahLpgNama || '-'}</b>${spbu.wilayahLpgJarak != null ? ` (&plusmn;${spbu.wilayahLpgJarak} km)` : ''}</div>` : ''}
                        <div class="text-[10px] text-gray-600">Keramaian: <b>${TRAFFIC[spbu.traffic || (spbu.traffic = pickTraffic())].label}</b> &middot; konsumsi BBM/LPG ${TRAFFIC[spbu.traffic].mult}x</div>
                        <div class="text-[10px] text-gray-600">${spbu.tipe === 'COCO' ? 'Milik perusahaan (dikelola swasta)' : 'Mitra: ' + esc(spbu.mitra ? spbu.mitra.nama : '-')}${spbu.has_lpg ? ' &middot; + LPG' : ''}</div>
                        ${spbu.blocked ? '<div class="text-[10px] font-bold text-red-600">DIBLOKIR - operasional off</div>' : ''}
                    </div>
                `);

                mapMarkers.push(marker);
            });

            document.getElementById('kpis-spbu-count').innerText = `${activeSpbuCount} Unit`;
        }

        function populateSpbuDropdowns(filterRegion = 'ALL') {
            const deliverySelect = document.getElementById('delivery-spbu-select');
            const lpgSelect = document.getElementById('lpg-spbu-select');
            const prevDelivery = deliverySelect.value, prevLpg = lpgSelect.value;

            deliverySelect.innerHTML = '';
            lpgSelect.innerHTML = '';

            const filteredList = loadedSpbuList.filter(s => isOp(s) && (filterRegion === 'ALL' || s.wilayahId === filterRegion));
            // Dropdown target dispatch SEKARANG cuma nampilin SPBU yang lagi punya pesanan terbuka -
            // dispatch bebas ke SPBU yang stoknya masih aman dimatikan supaya nggak dobel/bentrok
            // sama alur Pesanan SPBU. Transfer antar Kilang/Depo (tab Kilang) TIDAK kena filter ini.
            const orderFor = (kode, wantLpg) => orders.find(x => x.kode === kode && (wantLpg ? x.fuel === 'lpg' : x.fuel !== 'lpg'));

            filteredList.forEach(spbu => {
                const oBbm = orderFor(spbu.kode, false);
                if (oBbm) {
                    const opt1 = document.createElement('option');
                    opt1.value = spbu.kode;
                    opt1.innerText = `[${spbu.kode}] ${spbu.nama} \u{1F4E6} Pesan ${fuelLabel(oBbm.fuel)} ${oBbm.kl - oBbm.terkirim} KL (+6%)`;
                    deliverySelect.appendChild(opt1);
                }

                if (spbu.has_lpg) {
                    const oLpg = orderFor(spbu.kode, true);
                    if (oLpg) {
                        const opt2 = document.createElement('option');
                        opt2.value = spbu.kode;
                        opt2.innerText = `[${spbu.kode}] ${spbu.nama} - Outlet LPG \u{1F4E6} Pesan ${oLpg.kl - oLpg.terkirim} Ton (+6%)`;
                        lpgSelect.appendChild(opt2);
                    }
                }
            });

            if (!deliverySelect.options.length) deliverySelect.appendChild(new Option('-- Tidak ada SPBU dengan pesanan terbuka saat ini --', ''));
            if (!lpgSelect.options.length) lpgSelect.appendChild(new Option('-- Tidak ada Outlet LPG dengan pesanan terbuka saat ini --', ''));

            // Pertahankan pilihan SPBU sebelumnya kalau masih ada di daftar hasil filter,
            // supaya isian form pemain nggak kereset tiap dropdown di-refresh.
            if (prevDelivery && deliverySelect.querySelector(`option[value="${prevDelivery}"]`)) deliverySelect.value = prevDelivery;
            if (prevLpg && lpgSelect.querySelector(`option[value="${prevLpg}"]`)) lpgSelect.value = prevLpg;
            updateRouteEstimate('delivery'); updateRouteEstimate('lpg');
            refreshDeliveryAuto();
        }

        function populateTruckDropdowns() {
            const deliveryTruckSelect = document.getElementById('delivery-truck-select');
            const lpgTruckSelect = document.getElementById('lpg-truck-select');
            const prev = [deliveryTruckSelect.value, lpgTruckSelect.value];

            deliveryTruckSelect.innerHTML = '';
            lpgTruckSelect.innerHTML = '';

            companyFleet.forEach(trk => {
                if (busyIds.has(trk.id)) return; // sedang bertugas, sembunyikan dari pilihan
                if (!isSpbuTruck(trk)) return; // kapal & truk antar-depo bukan buat SPBU; kapal cuma buat transfer Kilang<->Depo, bukan ke SPBU
                const opt = document.createElement('option');
                opt.value = trk.id;
                opt.innerText = `${trk.id} [${trk.plat}]${unitJulukan(trk)} - ${trk.name}`;

                if (trk.type === 'BBM') deliveryTruckSelect.appendChild(opt);
                else lpgTruckSelect.appendChild(opt);
            });
            [deliveryTruckSelect, lpgTruckSelect].forEach((el, i) => { if (prev[i] && el.querySelector(`option[value="${prev[i]}"]`)) el.value = prev[i]; });
            if (!deliveryTruckSelect.value && deliveryTruckSelect.options.length) deliveryTruckSelect.selectedIndex = 0;
            if (!lpgTruckSelect.value && lpgTruckSelect.options.length) lpgTruckSelect.selectedIndex = 0;
            populateTransferKapal();
            updateRouteEstimate('delivery'); updateRouteEstimate('lpg');
            refreshDeliveryAuto();
        }

        // POPULATE DROPDOWN DRIVER & KERNET
        function populateCrewDropdowns() {
            const dDriver = document.getElementById('delivery-driver-select');
            const dKernet = document.getElementById('delivery-kernet-select');
            const lDriver = document.getElementById('lpg-driver-select');
            const lKernet = document.getElementById('lpg-kernet-select');

            const prev = [dDriver.value, dKernet.value, lDriver.value, lKernet.value];
            dDriver.innerHTML = ''; dKernet.innerHTML = '';
            lDriver.innerHTML = ''; lKernet.innerHTML = '';

            companyCrew.forEach(c => {
                if (busyIds.has(c.id)) return; // sedang bertugas, sembunyikan dari pilihan
                const stars = '★'.repeat(repToStars(c.reputation));
                const text = `${c.name} (${stars} Rep ${Math.round(c.reputation)} - Viol: ${c.violations})`;
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = text;

                if (c.role === 'Supir') {
                    dDriver.appendChild(opt.cloneNode(true));
                    lDriver.appendChild(opt.cloneNode(true));
                } else if (c.role === 'Kernet') {
                    dKernet.appendChild(opt.cloneNode(true));
                    lKernet.appendChild(opt.cloneNode(true));
                }
            });
            [dDriver, dKernet, lDriver, lKernet].forEach((el, i) => { if (prev[i] && el.querySelector(`option[value="${prev[i]}"]`)) el.value = prev[i]; });
            [dDriver, dKernet, lDriver, lKernet].forEach(el => { if (!el.value && el.options.length) el.selectedIndex = 0; });
            populateTransferCrew();
            refreshDeliveryAuto();
        }

