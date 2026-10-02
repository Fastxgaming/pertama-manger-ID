        // ===== ANIMASI TRUK: hanya terlihat oleh pemain yang mengirim (tidak dibagikan ke pemain lain) =====
        const flying = new Set();
        let ownAnims = 0;
        // ===== PERJALANAN AKTIF (ikut disimpan) =====
        // Sebelumnya perjalanan truk cuma ada di memori: refresh/tutup tab membuat truk "lupa" sedang jalan, padahal stok
        // kilang sudah terpotong & pesanan SPBU masih ditandai inTransit -> muatan hilang, pesanan nyangkut.
        // Sekarang tiap perjalanan dicatat di activeTrips (id saja, bukan objek) dan dipulihkan lewat resumeTrips() saat save dimuat.
        const activeTrips = new Map();
        // Bug fix: sebelumnya truk/kapal yang sudah tiba kembali di depot langsung dihapus total dari peta (marker +
        // bekas rute lenyap begitu saja). Sekarang truk milik sendiri "diparkir" sebagai titik kecil di lokasi
        // terakhirnya (depot) sampai truk itu ditugaskan berangkat lagi, supaya tidak terasa tiba-tiba menghilang.
        const parkedMarkers = new Map();
        // Label di atas ikon truk/kapal milik sendiri: baris atas = JULUKAN unit (kalau ada), baris bawah = teks biasa (ID · plat, dst).
        // Julukan dicari ulang dari armada tiap kali label dibuat/diperbarui, jadi selalu mengikuti julukan terbaru.
        // Unit pemain lain (remote) tidak punya julukan di sisi sini, jadi labelnya tetap satu baris.
        function truckTipHtml(id, text, remote) {
            const u = remote || typeof companyFleet === 'undefined' ? null : companyFleet.find(x => x.id === id);
            return (u && u.julukan ? `<span class="tt-jk">${esc(u.julukan)}</span>` : '') + esc(text);
        }
        function setTruckTip(marker, id, text, remote) { marker._tipText = text; marker.setTooltipContent(truckTipHtml(id, text, remote)); }
        // Dipanggil saat pemain mengubah julukan: perbarui label unit yang sedang berjalan maupun yang terparkir di peta.
        function refreshTruckTips(id) {
            flying.forEach(t => { if (!t.remote && t.e.id === id && t.marker._tipText != null) setTruckTip(t.marker, id, t.marker._tipText, false); });
            const pm = parkedMarkers.get(id); if (pm && pm._tipText != null) setTruckTip(pm, id, pm._tipText, false);
        }

        // ===== LENCANA STATUS DI IKON TRUK: "MEMUAT" / "BONGKAR" + hitung mundur, tampil tanpa perlu ikon ditekan =====
        // Menempel di bawah ikon (anak dari elemen marker Leaflet, bukan dari .truck-ico yang isinya bisa diganti ikon centang),
        // jadi tetap terlihat di ikon terbang, ikon "tiba", maupun ikon terparkir. Hitung mundur memakai jam virtual vNow()
        // yang sama dengan timer muat/bongkar, jadi ikut berhenti saat tab disembunyikan / game dijeda.
        const truckStage = new Map();   // id truk -> { txt, kind, endAt, ll, color }
        let stageTimer = null;
        const STAGE_CFG = {
            muat: { ic: 'fa-boxes-packing', bg: '#b45309' }, bongkar: { ic: 'fa-arrow-down-long', bg: '#6d28d9' },
            // khusus kapal (dipanggil dari shipSetState di 07b-kapal-dermaga.js)
            antre: { ic: 'fa-hourglass-half', bg: '#d97706' }, sandar: { ic: 'fa-anchor', bg: '#0f766e' },
            lepas: { ic: 'fa-water', bg: '#0e7490' }, servis: { ic: 'fa-screwdriver-wrench', bg: '#c2410c' },
            isi: { ic: 'fa-gas-pump', bg: '#0891b2' }   // truk mampir pom bensin isi full tank
        };
        function stageHostMarker(id) {
            if (parkedMarkers.has(id)) return parkedMarkers.get(id);
            for (const t of flying) if (!t.remote && t.e.id === id) return t.marker;
            return null;
        }
        function applyTruckStages() {
            truckStage.forEach((st, id) => {
                let host = stageHostMarker(id);
                if (!host) {   // belum ada ikon di peta (mis. truk baru memuat di depo): buat ikon terparkir supaya lencana punya tempat
                    host = L.marker(st.ll, { icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: `<div class="truck-ico ${st.boat ? 'boat' : ''}" style="background:${st.color};width:26px;height:26px"><span class="tf"><i class="fa-solid fa-${st.boat ? 'ship' : 'truck'}"></i></span></div>` }), zIndexOffset: 300 }).addTo(map);
                    parkedMarkers.set(id, host);
                }
                const el = host.getElement(); if (!el) return;
                let chip = el.querySelector('.truck-stat');
                if (!chip) { chip = document.createElement('div'); chip.className = 'truck-stat'; el.appendChild(chip); }
                const cfg = STAGE_CFG[st.kind], sisa = st.endAt == null ? null : Math.max(0, Math.ceil((st.endAt - vNow()) / 1000));
                chip.style.background = cfg.bg;
                chip.innerHTML = `<i class="fa-solid ${cfg.ic}"></i> ${st.txt}${sisa == null ? '' : ' ' + Math.floor(sisa / 60) + ':' + String(sisa % 60).padStart(2, '0')}`;
                const ico = el.querySelector('.truck-ico'); if (ico) ico.style.opacity = 1;
            });
        }
        // sec = null -> tanpa hitung mundur (mis. antre labuh yang lamanya tidak pasti). boat = true untuk kapal.
        function setTruckStage(id, txt, kind, sec, ll, color, boat) {
            truckStage.set(id, { txt, kind, endAt: sec == null ? null : vNow() + sec * 1000, ll, color, boat: !!boat });
            applyTruckStages();
            if (!stageTimer) stageTimer = setInterval(applyTruckStages, 400);
        }
        function clearTruckStage(id) {
            if (!truckStage.delete(id)) return;
            const host = stageHostMarker(id), el = host && host.getElement();
            const chip = el && el.querySelector('.truck-stat'); if (chip) chip.remove();
            const ico = el && el.querySelector('.truck-ico'); if (ico && parkedMarkers.get(id) === host) ico.style.opacity = .6;
            if (!truckStage.size && stageTimer) { clearInterval(stageTimer); stageTimer = null; }
        }

        // Isi popup info yang muncul saat ikon truk/kapal (yang sedang dispatch/jalan) ditekan.
        // Status kartu mengikuti FASE perjalanan: saat mengantar muatan -> tujuan = SPBU/depo penerima; setelah bongkar
        // & truk balik -> tujuan otomatis berganti ke DEPO pangkalan (bukan SPBU lagi), asal = lokasi bongkar tadi.
        function truckLiveOf(e) { for (const t of flying) if (t.e === e) return t; return null; }
        function truckInfoPopupHtml(e) {
            const isFerry = e.vehicle === 'ferry', isKapal = e.vehicle === 'kapal';
            const label = isFerry ? 'Ferry · ' + e.id : isKapal ? 'Kapal · ' + e.id : e.id;
            const balik = e.fase === 'kembali';
            const tujuanIcon = balik ? 'fa-warehouse' : 'fa-location-dot';
            const badge = balik
                ? '<span class="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700"><i class="fa-solid fa-rotate-left mr-1"></i>KEMBALI KE DEPO</span>'
                : '<span class="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"><i class="fa-solid fa-truck-fast mr-1"></i>MENGANTAR MUATAN</span>';
            // Progres ruas yang sedang ditempuh (dihitung live dari jam virtual yang sama dengan animasi).
            let prog = '';
            const t = truckLiveOf(e);
            if (t && e.dur > 0) {
                const f = Math.max(0, Math.min(1, (vNow() - (t.stall || 0) - e.startAt) / e.dur));
                const sisaKm = Math.max(0, t.total * (1 - f));
                const sisaJam = (e.dur * (1 - f)) * GAME_SPEED / 3600000;
                const eta = new Date(gameNow() + sisaJam * 3600000);
                const hh = String(eta.getHours()).padStart(2, '0') + ':' + String(eta.getMinutes()).padStart(2, '0');
                prog = `<div class="mt-1 mb-0.5 h-1.5 rounded bg-gray-200 overflow-hidden"><div style="width:${Math.round(f * 100)}%" class="h-full ${balik ? 'bg-sky-500' : 'bg-emerald-500'}"></div></div>
                    <div class="text-[10px] text-gray-600 leading-4">Progres ruas: <b>${Math.round(f * 100)}%</b> &middot; sisa <b>±${Math.round(sisaKm)} km</b></div>
                    <div class="text-[10px] text-gray-600 leading-4">Tiba ${balik ? 'di depo' : 'di tujuan'}: <b>${e.halted ? 'tertunda' : fmtJam(sisaJam) + ' lagi (±' + hh + ')'}</b></div>`;
            }
            return `
                <div class="text-gray-900 font-sans p-1 min-w-[180px]">
                    <strong class="text-xs font-bold block text-blue-700 mb-0.5">${esc(label)}${e.plat ? ' · ' + esc(e.plat) : ''}</strong>
                    <div class="mb-1">${badge}</div>
                    ${e.jenisMuatan ? `<div class="text-[10px] text-gray-600 leading-4">Muatan: <b>${esc(e.type === 'LPG' ? 'LPG ' : '')}${esc(e.jenisMuatan)}</b></div>` : ''}
                     <div class="text-[10px] text-gray-600 leading-4">Depo Pangkalan: <b>${esc(e.depoNama || '-')}</b></div>
                    <div class="text-[10px] text-gray-600 leading-4">Dari: <b>${esc(e.dariNama || e.depoNama || '-')}</b></div>
                    <div class="text-[10px] text-gray-600 leading-4"><i class="fa-solid ${tujuanIcon} mr-0.5"></i>Tujuan: <b>${esc(e.tujuanNama || '-')}</b>${balik ? ' <span class="text-sky-600">(depo)</span>' : ''}</div>
                    ${e.leg ? `<div class="text-[10px] text-gray-600 leading-4">Tahap: <b>${esc(e.leg)}</b></div>` : ''}
                    <div class="text-[10px] text-gray-600 leading-4">Speed: <b>${e.halted ? '0 km/j' : e.speedKmh ? Math.round(e.speedKmh) + ' km/j' : '-'}</b></div>
                    ${prog}
                    ${e.halted ? `<div class="text-[10px] text-amber-600 font-bold leading-4">⛈ Ditahan ${esc(e.halted)} - menunggu cuaca membaik</div>` : ''}
                    ${(() => { const tk = !isFerry && !isKapal && (e.fuelIds || [e.id]).length ? companyFleet.find(x => x.id === e.id) : null; if (!tk) return ''; truckFuelEnsure(tk); return `<div class="text-[10px] text-gray-600 leading-4">Solar truk: <b>${Math.round(tk.fuelL)}/${truckTankL(tk)} L</b> &middot; Odometer: <b>${tk.odometer.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km</b></div>`; })()}
                    <div class="text-[10px] text-gray-600 leading-4">Surat Jalan: <b>${esc(e.nomorSJ || '-')}</b></div>
                    ${isKapal && typeof shipInfoHtml === 'function' ? shipInfoHtml(e.id) : ''}
                </div>
            `;
        }

        // Fluktuasi kecepatan "hidup" untuk truk (kosmetik saja, TIDAK mengubah durasi/biaya perjalanan yang
        // sudah dihitung & dikunci sejak dispatch) - dulu popup info truk cuma menampilkan satu angka speed
        // tetap sepanjang perjalanan (mis. selalu "55 km/j"), padahal jalan lurus & lancar seharusnya kecepatan
        // riil naik-turun sedikit (56/57/58...80), bukan diam di satu angka. Dibungkus gelombang sinus 2
        // frekuensi (bukan random murni) supaya perubahannya mulus, bukan lompat-lompat kasar tiap frame.
        function hashSeed(str) {
            let h = 0;
            for (let i = 0; i < String(str).length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
            return h;
        }
        function liveSpeedKmh(t, now) {
            const range = t.e.hd ? [SPEED_RANGE[0], SPEED_RANGE[1] * (t.e.hd === true ? HD_EFEK.laju : t.e.hd)] : SPEED_RANGE;
            const base = t.e.baseSpeedKmh != null ? t.e.baseSpeedKmh : t.e.speedKmh;
            const seed = hashSeed(t.e.id || 'truck');
            const wobble = Math.sin(now / 2600 + seed) * 0.6 + Math.sin(now / 900 + seed * 1.7) * 0.4;
            const amp = (range[1] - range[0]) * 0.18; // amplitudo proporsional lebar rentang kecepatan jalan
            return Math.max(range[0], Math.min(range[1], base + wobble * amp));
        }
        function launchTruck(e, remote) {
            if (vNow() - e.startAt >= e.dur || flying.size > 80) return null;
            if (!remote && parkedMarkers.has(e.id)) { map.removeLayer(parkedMarkers.get(e.id)); parkedMarkers.delete(e.id); }
            const pts = e.pts, cum = [0];
            for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distKm({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] }));
            const isFerry = e.vehicle === 'ferry';
            const isKapal = e.vehicle === 'kapal';
            const isBoat = isFerry || isKapal;
            const color = isFerry ? '#0ea5e9' : isKapal ? '#06b6d4' : (remote ? '#38bdf8' : (TRUCK_COLOR[e.type] || '#3b82f6'));
            const routeColor = '#a855f7'; // ungu terang - dulu amber (#f59e0b), gampang menyatu dengan warna jalan nasional/arteri di tile peta
            const line = L.polyline(pts, { color: routeColor, weight: remote ? 2 : 3, opacity: isBoat ? 0.75 : 0.85, dashArray: isBoat ? '2 10' : '6 8' }).addTo(map);
            const trail = L.polyline([pts[0]], { color, weight: remote ? 3 : 4, opacity: 0.85 }).addTo(map);
            const marker = L.marker(pts[0], {
                icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15], html: `<div class="truck-ico ${isBoat ? 'boat' : ''}" style="background:${color};${remote ? 'opacity:.85' : ''}"><span class="tf"><i class="fa-solid fa-${isBoat ? 'ship' : 'truck'}"></i></span></div>` }),
                zIndexOffset: remote ? 500 : 1000
            }).addTo(map);
            { const tipText = remote ? `${e.owner} · ${e.plat}` : `${isFerry ? 'Ferry · ' + e.id : isKapal ? 'Kapal · ' + e.id : e.id} · ${e.plat}${e.fase === 'kembali' ? ' · ↩ ke depo' : ''}`;
              marker.bindTooltip(truckTipHtml(e.id, tipText, remote), { permanent: true, direction: 'top', offset: [0, -16], className: 'truck-tip' }); marker._tipText = tipText; }
            // Info armada saat ikon truk/kapal yang lagi jalan ditekan: Depo asal, Tujuan, Speed & No. Surat Jalan.
            if (!remote) marker.bindPopup(() => truckInfoPopupHtml(e), { className: 'truck-info-popup', closeButton: true, maxWidth: 220 });
            const t = { e, pts, cum, total: cum[cum.length - 1] || 0.01, marker, line, trail, remote, color, isBoat, lastTrail: 0, done: null };
            flying.add(t);
            if (flying.size === 1) requestAnimationFrame(flyLoop);
            return t;
        }

        function flyLoop() {
            const now = vNow();
            flying.forEach(t => {
                // Kapal ditahan cuaca buruk: jam perjalanan kapal ini dibekukan (haltAt), lalu dilanjutkan dari titik yang sama
                // saat cuaca membaik (waktu tertahan dijumlahkan ke t.stall) - posisi, sisa jarak & ETA tidak loncat.
                if (t.e.vehicle === 'kapal') {
                    const hold = seaHalted(t.marker.getLatLng());
                    const ic = () => t.marker.getElement() && t.marker.getElement().querySelector('.truck-ico');
                    if (hold && t.haltAt == null) {
                        t.haltAt = now; t.e.halted = seaStormLabel(); t.baseSpd = t.e.speedKmh; t.e.speedKmh = 0;
                        setTruckTip(t.marker, t.e.id, `${t.remote ? t.e.owner + ' · ' : ''}Kapal · ${t.e.id} · ⛈ ditahan ${t.e.halted.toLowerCase()}`, t.remote);
                        if (ic()) ic().style.filter = 'grayscale(.7) brightness(.8)';
                        if (!t.remote) addLog(`CUACA: Kapal ${t.e.id} berhenti di tengah laut karena ${t.e.halted.toLowerCase()}, menunggu cuaca membaik sebelum melanjutkan pelayaran.`, 'warning', 'truck');
                    } else if (!hold && t.haltAt != null) {
                        t.stall = (t.stall || 0) + (now - t.haltAt); t.haltAt = null; t.e.halted = null; t.e.speedKmh = t.baseSpd;
                        setTruckTip(t.marker, t.e.id, `${t.remote ? t.e.owner + ' · ' : ''}Kapal · ${t.e.id} · ${t.e.plat}`, t.remote);
                        if (ic()) ic().style.filter = '';
                        if (!t.remote) addLog(`CUACA: Cuaca membaik, kapal ${t.e.id} melanjutkan pelayaran dari posisi terakhir.`, 'success', 'truck');
                    }
                    if (t.haltAt != null) return; // tertahan: posisi tidak berubah
                }
                const f = Math.min(1, (now - (t.stall || 0) - t.e.startAt) / t.e.dur);
                if (!t.remote && now - (t.lastPop || 0) > 500 && t.marker.isPopupOpen && t.marker.isPopupOpen()) { t.lastPop = now; try { t.marker.getPopup().setContent(truckInfoPopupHtml(t.e)); } catch (_) {} }
                if (t.e.vehicle === 'truck' && f < 1) t.e.speedKmh = liveSpeedKmh(t, now);
                const sd = (t.e.ease ? seaEase(f) : f) * t.total;
                if (!t.remote && t.e.vehicle === 'truck') truckLiveConsume(t, sd); // odometer & solar ikut naik selagi truk berjalan
                const { i, ll } = posAt(t.pts, t.cum, sd);
                t.marker.setLatLng(ll);
                const tf = t.marker.getElement() && t.marker.getElement().querySelector('.tf');
                const dLon = t.pts[Math.min(i + 1, t.pts.length - 1)][1] - t.pts[i][1];
                if (tf && t.e.ease) {
                    // Haluan kapal: arah diambil sedikit ke depan lalu diperhalus (lerp) supaya tidak menyentak di belokan.
                    const ah = posAt(t.pts, t.cum, Math.min(t.total, sd + 4)).ll, dx = (ah[1] - ll[1]) * Math.cos(ll[0] * Math.PI / 180), dy = ah[0] - ll[0];
                    if (Math.abs(dx) + Math.abs(dy) > 1e-7) {
                        if (Math.abs(dx) > 1e-5) t.flip = dx < 0;
                        const tgt = Math.atan2(dy, Math.abs(dx)) * 180 / Math.PI;
                        t.tilt = (t.tilt || 0) + (tgt - (t.tilt || 0)) * 0.08;
                    }
                    tf.style.transform = `rotate(${(t.flip ? 1 : -1) * (t.tilt || 0)}deg) ${t.flip ? 'scaleX(-1)' : ''}`;
                } else if (tf && Math.abs(dLon) > 1e-5) tf.style.transform = dLon < 0 ? 'scaleX(-1)' : '';
                if (now - t.lastTrail > 150 || f === 1) {
                    // trail (solid, terang) = jejak yang SUDAH dilalui truk, dari titik berangkat sampai posisi sekarang.
                    t.trail.setLatLngs(t.pts.slice(0, i + 1).concat([ll]));
                    // line (putus-putus, transparan) = sisa jalur yang BELUM dilalui, dari posisi truk sekarang menuju tujuan.
                    // Sebelumnya garis ini statis penuh dari titik depo sampai tujuan sejak awal; sekarang ikut menyusut
                    // mengikuti posisi truk supaya benar-benar menggambarkan arah sisa perjalanan ke tujuan.
                    t.line.setLatLngs([ll].concat(t.pts.slice(i + 1)));
                    t.lastTrail = now;
                }
                if (f < 1) return;
                const el = t.marker.getElement() && t.marker.getElement().querySelector('.truck-ico');
                if (el) { el.classList.add('done'); el.innerHTML = '<i class="fa-solid fa-circle-check"></i>'; }
                if (t.done) t.done();
                flying.delete(t);
                setTimeout(() => {
                    [t.line, t.trail].forEach(l => map.removeLayer(l));
                    map.removeLayer(t.marker);
                    if (!t.remote) {
                        // Truk/kapal TIDAK dihapus total dari peta - diganti jadi ikon "terparkir" (redup) di lokasi
                        // terakhirnya. Ini berlaku baik saat baru tiba di tujuan (SPBU/depo, masih bongkar muatan)
                        // MAUPUN saat sudah kembali ke depot asal. Otomatis dibersihkan sendiri saat truk ini
                        // ditugaskan berangkat lagi (lihat launchTruck).
                        if (parkedMarkers.has(t.e.id)) map.removeLayer(parkedMarkers.get(t.e.id));
                        const finalLL = (t.e.vehicle === 'kapal' && typeof shipParkLL === 'function' && shipParkLL(t.e.id)) || t.pts[t.pts.length - 1];
                        const parked = L.marker(finalLL, {
                            icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: `<div class="truck-ico ${t.isBoat ? 'boat' : ''}" style="background:${t.color};opacity:.6;width:26px;height:26px"><span class="tf"><i class="fa-solid fa-${t.isBoat ? 'ship' : 'truck'}"></i></span></div>` }),
                            zIndexOffset: 300
                        }).addTo(map);
                        { const parkText = `${t.e.id} · ${t.e.vehicle === 'kapal' && typeof shipStateLabel === 'function' ? shipStateLabel(t.e.id) : 'terparkir/bongkar muatan'}`;
                          parked.bindTooltip(truckTipHtml(t.e.id, parkText, false), { direction: 'top', offset: [0, -14], className: 'truck-tip' }); parked._tipText = parkText; }
                        if (t.e.vehicle === 'kapal') parked.bindPopup(() => truckInfoPopupHtml(t.e), { className: 'truck-info-popup', closeButton: true, maxWidth: 220 });
                        parkedMarkers.set(t.e.id, parked);
                        if (truckStage.has(t.e.id)) applyTruckStages();
                    }
                }, 4000);
            });
            if (flying.size) requestAnimationFrame(flyLoop);
        }

        // Format jam tempuh (mis. 2.4 jam) jadi teks "2j 24m"
        function fmtJam(h) {
            const totalMin = Math.round(h * 60), jam = Math.floor(totalMin / 60), men = totalMin % 60;
            return (jam ? `${jam}j ` : '') + `${men}m`;
        }

        // Jalankan satu ruas perjalanan (darat via OSRM ATAU laut/ferry garis lurus) dan tunggu sampai tiba.
        function runVehicleLeg(pts, dur, meta, fit) {
            return new Promise(resolve => {
                const e = { ...meta, pts, dur, startAt: vNow() };
                const t = launchTruck(e, false);
                if (!t) { resolve(); return; }
                if (fit) map.fitBounds(t.line.getBounds(), { padding: [50, 50], maxZoom: 11 });
                t.done = () => resolve(t);
            });
        }
        // Satu ruas perjalanan darat, mengikuti SATU jalur nyata apa adanya dari OSRM (fitur pilihan Rute
        // Tol/Non-Tol sudah dihapus - tidak ada lagi pemisahan gaya rute atau potongan gerbang tol). Kecepatan
        // & durasi murni mengikuti karakter/kelokan jalur asli yang benar-benar dilalui (lihat roadSpeedKmh).
        // ===== BBM TRUK: konsumsi di jalan, mampir pom bensin bila solar habis, odometer naik langsung =====
        // Solar terpakai sepanjang rute (km / kmPerLiterTruk). Begitu sisa tangki menyentuh cadangan (TRUK_FUEL_RESERVE), ruas
        // perjalanan DIPOTONG di titik itu: truk berhenti di "pom bensin", isi FULL tank selama (liter x REFUEL_SEC_PER_L) detik,
        // bayar solar di tempat (HARGA_SOLAR_TRUK), lalu lanjut sisa rute. Konvoi truk depo: semua unit diisi bersamaan (durasi = unit terlama).
        const REFUEL_SEC_PER_L = 0.08, REFUEL_MIN_SEC = 5;   // 300 L = 24 detik nyata, tangki kecil 120 L = ±10 detik
        const fuelUnitsOf = meta => (meta.fuelIds || [meta.id]).map(id => companyFleet.find(t => t.id === id)).filter(t => t && t.kelas !== 'kapal').map(truckFuelEnsure);
        function cumKm(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + distKm({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] })); return c; }
        function ptAtKm(pts, cum, k) {
            const n = pts.length - 1; if (k <= 0) return pts[0].slice(); if (k >= cum[n]) return pts[n].slice();
            let i = 1; while (i < n && cum[i] < k) i++;
            const f = (k - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1e-9);
            return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
        }
        function slicePath(pts, cum, k0, k1) { const out = [ptAtKm(pts, cum, k0)]; for (let i = 1; i < pts.length - 1; i++) if (cum[i] > k0 && cum[i] < k1) out.push(pts[i]); out.push(ptAtKm(pts, cum, k1)); return out; }
        // Konsumsi LIVE: dipanggil tiap frame dari flyLoop. Nilai awal ruas (odometer & solar) dicatat sekali, lalu tiap frame
        // di-set = nilai awal + jarak tempuh sejauh ini. Hasilnya sama persis dengan truckConsume di akhir ruas, tapi
        // odometer/BBM di popup truk & tab Armada sudah bergerak selama perjalanan (tidak lagi menunggu sampai tiba).
        function truckLiveConsume(t, km) {
            if (!t.liveUnits) {
                t.liveUnits = fuelUnitsOf(t.e).map(u => ({ u, odo0: u.odometer, fuel0: u.fuelL, kpl: kmPerLiterTruk(u) }));
                t.liveKm = 0; t.livePaint = 0;
            }
            if (!t.liveUnits.length) return;
            if (km - t.liveKm < 0.05 && km < t.total) return; // hemat: update tiap >= 50 m
            t.liveKm = km;
            t.liveUnits.forEach(x => { x.u.odometer = Math.round((x.odo0 + km) * 10) / 10; x.u.fuelL = Math.max(0, Math.round((x.fuel0 - km / x.kpl) * 100) / 100); });
            const nowMs = Date.now();
            if (nowMs - t.livePaint > 3000) {   // tab Armada ikut hidup, tapi tidak dirender tiap frame (render-nya berat)
                t.livePaint = nowMs;
                const c = document.getElementById('fleet-list-container');
                if (c && c.offsetParent !== null) { try { renderFleetDashboard(); } catch (_) {} }
            }
        }
        function truckConsume(units, km) {
            units.forEach(u => { u.fuelL = Math.max(0, Math.round((u.fuelL - km / kmPerLiterTruk(u)) * 100) / 100); u.odometer = Math.round((u.odometer + km) * 10) / 10; });
        }
        async function truckRefuel(units, ll, meta) {
            const need = units.map(u => ({ u, l: Math.max(0, truckTankL(u) - u.fuelL) }));
            const literTotal = Math.round(need.reduce((a, n) => a + n.l, 0)), literMax = Math.max(...need.map(n => n.l));
            const sec = Math.max(REFUEL_MIN_SEC, Math.round(literMax * REFUEL_SEC_PER_L));
            const biaya = Math.round(literTotal * HARGA_SOLAR_TRUK);
            const lead = units[0], label = units.length > 1 ? `konvoi ${meta.id} (${units.length} truk)` : `${meta.id} [${lead.plat}]`;
            addLog(`ISI SOLAR: ${label} kehabisan solar, mampir ke pom bensin & isi full tank ${literTotal.toLocaleString('id-ID')} L (±${sec} detik, ${formatRupiah(biaya)}). Odometer ${lead.odometer.toLocaleString('id-ID')} km.`, 'info', 'truck');
            notify(`${meta.id} mampir ke pom bensin, isi solar ${literTotal.toLocaleString('id-ID')} L...`, 'info');
            const pom = L.marker(ll, { icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 30], html: '<div style="width:22px;height:22px;border-radius:6px;background:#0891b2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)"><i class="fa-solid fa-gas-pump"></i></div>' }), zIndexOffset: 250 }).addTo(map);
            pom.bindTooltip('POM BENSIN', { direction: 'top', offset: [0, -4], className: 'truck-tip' });
            setTruckStage(meta.id, 'ISI BBM', 'isi', sec, ll, TRUCK_COLOR[lead.type] || '#3b82f6');
            try { await pausableDelay(sec * 1000); } finally { clearTruckStage(meta.id); map.removeLayer(pom); }
            need.forEach(n => { n.u.fuelL = truckTankL(n.u); });
            companyCash -= biaya; totalExpense += biaya;
            addFinanceLog(`Solar ${units.length > 1 ? 'konvoi ' + meta.id : lead.id} di pom bensin (${literTotal.toLocaleString('id-ID')} L)`, -biaya);
            updateCashDisplay();
            addLog(`SOLAR PENUH: ${label} selesai isi solar, lanjut perjalanan (jangkauan &plusmn;${Math.round(Math.min(...units.map(truckRangeKm)))} km).`, 'info', 'truck');
            try { renderFleetDashboard(); } catch (e) {}
        }
        async function driveSegment(from, to, meta, fit) {
            const { pts, real } = await fetchRoute(from, to);
            const straightKm = distKm(from, to);
            const { total, sinuosity } = sinuosityOf(pts, straightKm);
            const speedKmh = roadSpeedKmh(sinuosity, real, meta.hd);
            const dur = (total / speedKmh) * (3600000 / GAME_SPEED);
            const emeta = { ...meta, vehicle: 'truck', speedKmh, baseSpeedKmh: speedKmh };
            const units = fuelUnitsOf(meta);
            if (!units.length) { await runVehicleLeg(pts, dur, emeta, fit); return { km: total, dur, real, speedKmh, sinuosity }; }
            const cum = cumKm(pts), L_ = cum[cum.length - 1] || total;
            let done = 0, first = true, stops = 0;
            for (let guard = 0; guard < 40 && done < L_ - 0.05; guard++) {
                const rng = Math.min(...units.map(truckRangeKm)), seg = Math.min(rng, L_ - done);
                if (seg > 0.05) {
                    const legT = await runVehicleLeg(slicePath(pts, cum, done, done + seg), (seg / speedKmh) * (3600000 / GAME_SPEED), emeta, fit && first);
                    first = false; if (!legT) truckConsume(units, seg); done += seg; // legT ada = konsumsi sudah dihitung live oleh truckLiveConsume
                    try { renderFleetDashboard(); } catch (e) {}   // odometer & BBM di tab Armada ikut naik
                }
                if (done < L_ - 0.05) { await truckRefuel(units, ptAtKm(pts, cum, done), meta); stops++; }
            }
            return { km: total, dur, real, speedKmh, sinuosity, stops };
        }
        async function driveLeg(from, to, meta, fit) {
            return await driveSegment(from, to, meta, fit);
        }
        async function ferryLeg(from, to, meta, fit) {
            const pts = [[from.lat, from.lon], [to.lat, to.lon]];
            const total = distKm(from, to);
            const dur = (total / AVG_FERRY_SPEED_KMH) * (3600000 / GAME_SPEED);
            await runVehicleLeg(pts, dur, { ...meta, vehicle: 'ferry', speedKmh: AVG_FERRY_SPEED_KMH }, fit);
            return { km: total, dur };
        }
        // Pelayaran langsung Kilang Pusat <-> Depo Cabang Pesisir (kapal tanker curah): garis lurus laut, TIDAK lewat
        // logika jalan darat/ferry pulau seperti journey() di bawah - kapal tanker niaga jalan sendiri lewat rute laut.
        async function shipLeg(from, to, meta, fit) {
            return await shipVoyage(from, to, meta, fit); // lihat 07a-rute-laut.js
        }
        // Satu perjalanan lengkap dari titik A ke titik B, otomatis menyisipkan penyeberangan ferry bila beda pulau.
        // Alur: [darat ke pelabuhan] -> antre masuk kapal -> [penyeberangan] -> kapal sandar & antre turun -> [darat ke tujuan].
        async function journey(from, to, meta, fitFirst) {
            const oIsl = islandOf(from), dIsl = islandOf(to);
            if (oIsl === dIsl) {
                const leg = await driveLeg(from, to, meta, fitFirst);
                const speedLabel = meta.vehicle !== 'kapal' ? ` &middot; ${Math.round(leg.speedKmh)} km/j` : '';
                addLog(`BERANGKAT: ${meta.id} dari ${from.nama} menuju ${to.nama} (±${Math.round(leg.km)} km${leg.real ? ', mengikuti jalan' : ', rute perkiraan'}${speedLabel} &middot; estimasi ${fmtJam(leg.dur * GAME_SPEED / 3600000)} perjalanan).`, 'info', 'truck');
                return leg.km;
            }
            const depPort = getPort(oIsl, dIsl), arrPort = getPort(dIsl, oIsl);
            let km = 0;
            const l1 = await driveLeg(from, depPort, { ...meta, leg: `Darat menuju ${depPort.name}` }, fitFirst);
            km += l1.km;
            addLog(`BERANGKAT: ${meta.id} dari ${from.nama} menuju ${depPort.name} (±${Math.round(l1.km)} km) untuk menyeberang ke Pulau ${dIsl}.`, 'info', 'truck');
            addLog(`TIBA DI PELABUHAN: ${meta.id} tiba di ${depPort.name}, mengantre masuk kapal ferry...`, 'info', 'truck');
            notify(`${meta.id} mengantre naik kapal di ${depPort.name}...`, 'info');
            await sleep(FERRY_QUEUE_SEC * 1000);
            addLog(`PENYEBERANGAN: Kapal ferry membawa ${meta.id} dari ${depPort.name} menuju ${arrPort.name} (±${Math.round(distKm(depPort, arrPort))} km laut)...`, 'info', 'truck');
            const l2 = await ferryLeg(depPort, arrPort, { ...meta, leg: `Ferry ${depPort.name} → ${arrPort.name}` }, false);
            km += l2.km;
            addLog(`SANDAR: Kapal tiba &amp; sandar di ${arrPort.name}, ${meta.id} mengantre turun kapal...`, 'info', 'truck');
            notify(`Kapal sandar di ${arrPort.name}, ${meta.id} bersiap lanjut jalan darat.`, 'info');
            await sleep(FERRY_QUEUE_SEC * 1000);
            const l3 = await driveLeg(arrPort, to, { ...meta, leg: `Darat dari ${arrPort.name} ke ${to.nama}` }, false);
            km += l3.km;
            addLog(`LANJUT PERJALANAN: ${meta.id} melanjutkan jalan darat dari ${arrPort.name} menuju ${to.nama} (±${Math.round(l3.km)} km).`, 'info', 'truck');
            return km;
        }
        // ===== PULIHKAN PERJALANAN SETELAH REFRESH / MUAT SAVE =====
        // 1) Selaraskan pesanan: inTransit tiap pesanan = total kapasitas truk yang MASIH benar-benar dalam perjalanan menurut save
        //    (ini sekaligus membersihkan pesanan "nyangkut" dari save lama yang belum punya data perjalanan).
        // 2) Jalankan lagi animasi tiap perjalanan dari fase terakhirnya (posisi persis di peta tidak disimpan: rute diulang dari depo).
        //    Stok kilang TIDAK dipotong lagi karena sudah terpotong saat surat jalan ditandatangani.
        function resumeTrips(list) {
            const found = [];
            (list || []).forEach(t => {
                if (!t || t.ph === 'kembali') return;   // pendapatan sudah cair, truk tinggal pulang: cukup bebas di depot
                const spbu = loadedSpbuList.find(x => x.kode === t.sp), truck = companyFleet.find(x => x.id === t.t),
                      driver = companyCrew.find(x => x.id === t.dr), kernet = companyCrew.find(x => x.id === t.kn),
                      origin = refineryData.find(x => x.id === t.o);
                if (spbu && truck && driver && kernet && origin) found.push({ t, spbu, truck, driver, kernet, origin });
            });
            const expect = new Map();
            found.forEach(f => { const fid = orderFuelIdFor(f.truck, f.t.jm); if (fid) { const k = f.spbu.kode + '|' + fid; expect.set(k, (expect.get(k) || 0) + f.truck.cap); } });
            orders.forEach(o => {
                const n = expect.get(o.kode + '|' + o.fuel) || 0;
                o.inTransit = n;
                if (!n && (o.tahap === 'muat' || o.tahap === 'berangkat' || o.tahap === 'tiba' || o.tahap === 'bongkar')) o.tahap = null;
            });
            renderOrders();
            if (!found.length) return;
            setTimeout(() => {
                if (!currentAccount) return;
                found.forEach(f => {
                    if (busyIds.has(f.truck.id) || busyIds.has(f.driver.id) || busyIds.has(f.kernet.id)) return;
                    animateDelivery({ spbu: f.spbu, truck: f.truck, driver: f.driver, kernet: f.kernet, origin: f.origin, jenisMuatan: f.t.jm, kapKey: f.t.kk || undefined,
                                      hargaPerUnit: f.t.hp, nomorSJ: f.t.no, km: f.t.km || 0, silent: true, resume: f.t.ph });
                });
                addLog(`PEMULIHAN: ${found.length} perjalanan armada yang sedang berjalan sebelum game dimuat ulang dilanjutkan.`, 'info', 'truck');
            }, 1500);
        }
        async function animateDelivery(d) {
            const { spbu, truck, driver, kernet, origin: origin0 } = d;
            const ids = [truck.id, driver.id, kernet.id];
            const origin = origin0 || pickOrigin(truck.type, spbu, truck.cap, truck);
            if (!origin) return;
            ids.forEach(i => busyIds.add(i));
            populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
            ownAnims++;
            const meta = { id: truck.id, hd: unitLaju(truck), plat: truck.plat, type: truck.type, owner: currentAccount ? currentAccount.company : 'Pemain',
                           depoNama: origin.nama, dariNama: origin.nama, tujuanNama: spbu.nama, fase: 'berangkat', nomorSJ: d.nomorSJ, jenisMuatan: d.jenisMuatan };
            // Rute PULANG: tujuan otomatis berganti ke depo pangkalan (bukan SPBU lagi), asal = SPBU tempat bongkar.
            const metaBalik = { ...meta, fase: 'kembali', dariNama: spbu.nama, tujuanNama: origin.nama };
            const fit = ownAnims === 1;
            const rs = d.resume || null;   // fase saat save terakhir (hanya terisi kalau perjalanan ini dipulihkan setelah refresh)
            const trip = { sp: spbu.kode, t: truck.id, dr: driver.id, kn: kernet.id, o: origin.id, jm: d.jenisMuatan, kk: d.kapKey || null, hp: d.hargaPerUnit, no: d.nomorSJ, km: d.km || 0, ph: rs || 'muat' };
            activeTrips.set(truck.id, trip);
            const endTrip = () => { if (activeTrips.get(truck.id) === trip) activeTrips.delete(truck.id); };
            try {
                if (rs === 'tiba' || rs === 'bongkar') {
                    // Sudah sampai di SPBU saat save terakhir: tidak perlu jalan lagi, langsung lanjut bongkar.
                    d.km = d.km || 0;
                    addLog(`PEMULIHAN: ${truck.id} [Supir: ${driver.name}] dilanjutkan dari ${spbu.nama} setelah game dimuat ulang.`, 'info', 'truck');
                } else {
                    if (!rs || rs === 'muat') {
                        // FASE MUAT: kru memuat kargo di kilang/depo asal dulu (pasangan dari fase bongkar), baru truk berangkat.
                        // Stok kilang sudah dikurangi saat surat jalan ditandatangani; di sini hanya jeda waktu muat + status pesanan.
                        updateOrderTahap(spbu, truck, d.jenisMuatan, 'muat');
                        addLog(`${rs ? 'PEMULIHAN - ' : ''}MUAT: ${truck.id} [Supir: ${driver.name}] sedang dimuati ${d.jenisMuatan} (${truck.cap} ${truck.type === 'LPG' ? 'Ton' : 'KL'}) di ${origin.nama} (±${LOAD_SECONDS} detik)...`, 'info', 'truck');
                        notify(`${truck.id} sedang memuat ${d.jenisMuatan} di ${origin.nama}...`, 'info');
                        setTruckStage(truck.id, 'MEMUAT', 'muat', LOAD_SECONDS, [origin.lat, origin.lon], TRUCK_COLOR[truck.type] || '#3b82f6');
                        await pausableDelay(LOAD_SECONDS * 1000);
                        clearTruckStage(truck.id);
                    }
                    updateOrderTahap(spbu, truck, d.jenisMuatan, 'berangkat');
                    addLog(`${rs ? 'PEMULIHAN - ' : ''}BERANGKAT: ${truck.id} [Supir: ${driver.name}] ${rs ? 'melanjutkan perjalanan dari ' + origin.nama + ' membawa' : 'selesai muat & berangkat membawa'} ${d.jenisMuatan} ke ${spbu.nama}.`, 'info', 'truck');
                    d.km = await journey(origin, spbu, meta, fit);
                }
                trip.km = d.km;
                updateOrderTahap(spbu, truck, d.jenisMuatan, 'tiba');
                addLog(`TIBA: ${truck.id} [Supir: ${driver.name}] sampai di ${spbu.nama}. Kru bersiap bongkar muatan (±${UNLOAD_SECONDS} detik)...`, 'info', 'truck');
                notify(`${truck.id} tiba di ${spbu.nama}, sedang bongkar muatan...`, 'info');
                ownAnims = Math.max(0, ownAnims - 1);
                updateOrderTahap(spbu, truck, d.jenisMuatan, 'bongkar');
                setTruckStage(truck.id, 'BONGKAR', 'bongkar', UNLOAD_SECONDS, [spbu.lat, spbu.lon], TRUCK_COLOR[truck.type] || '#3b82f6');
                await pausableDelay(UNLOAD_SECONDS * 1000);
                clearTruckStage(truck.id);
                {
                    trip.ph = 'kembali';   // ditandai SEBELUM pendapatan cair (satu langkah sinkron) supaya save tidak pernah membayar dua kali
                    completeUnloading(d);
                    // Animasi truk/kapal berjalan balik ke depot asal setelah bongkar muatan tuntas (lewat ferry lagi bila perlu).
                    // PENTING: truk/supir/kernet baru dibebaskan (busyIds) SETELAH benar-benar tiba di depot di bawah ini,
                    // supaya tidak bisa ditugaskan ulang (dobel) selagi masih dalam perjalanan pulang.
                    try {
                        truckFase.set(truck.id, 'kembali'); renderOrders();
                        await journey(spbu, origin, metaBalik, false);
                        addLog(`TIBA DI DEPOT: ${truck.id} [Supir: ${driver.name}] kembali ke ${origin.nama} setelah selesai bongkar muatan.`, 'info', 'truck');
                    } catch (e) { /* animasi balik gagal dimuat, tidak mempengaruhi keuangan yang sudah cair */ }
                    ids.forEach(x => busyIds.delete(x)); endTrip();
                    populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard(); renderOrders();
                }
            } catch (err) {
                clearTruckStage(truck.id);
                ids.forEach(x => busyIds.delete(x)); endTrip();
                populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard(); renderOrders();
                ownAnims = Math.max(0, ownAnims - 1);
            }
        }

        // ===== TRANSFER KAPAL TANKER: Kilang Pusat <-> Depo Cabang Pesisir =====
        // Berbeda dari animateDelivery (BBM/LPG ke SPBU, ada pendapatan) - ini murni pemindahan stok internal
        // perusahaan sendiri lewat laut, jadi tidak ada pendapatan, hanya biaya pelayaran implisit dari harga beli kapal.
        async function animateKapalTransfer(d) {
            const { spbu: target, truck, driver, kernet, origin } = d;
            const ids = [truck.id, driver.id, kernet.id];
            ids.forEach(i => busyIds.add(i));
            populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
            ownAnims++;
            // Pangkalan kapal = titik berangkat & pulang: pangkalan -> Kilang Tuban (muat) -> tujuan -> pangkalan.
            const base = shipBaseOf(truck);
            const meta = { id: truck.id, hd: unitLaju(truck), plat: truck.plat, type: truck.type, owner: currentAccount ? currentAccount.company : 'Pemain',
                           depoNama: base.nama, dariNama: origin.nama, tujuanNama: target.nama, fase: 'berangkat', nomorSJ: d.nomorSJ };
            const metaBalik = { ...meta, fase: 'kembali', dariNama: target.nama, tujuanNama: base.nama };
            const fit = ownAnims === 1;
            let arrived = false;
            try {
                // Tahap 3+4: standby -> [ke tempat muat] -> [antre] -> muat -> lepas sandar -> berlayar -> [antre labuh] -> sandar -> bongkar -> lepas sandar -> pulang ke pangkalan
                await shipMissionOut(truck, base, origin, meta, fit);
                const rt = seaRoute(origin, target);
                if (rt) addLog(`BERLAYAR: Kapal ${truck.id} [Nahkoda: ${driver.name}] dari ${origin.nama} menuju ${target.nama} (±${Math.round(rt.km)} km laut &middot; estimasi ${fmtJam(rt.km / shipSpeedKmh(truck))} pelayaran).`, 'info', 'truck');
                const leg = await shipSail(truck, origin, target, meta, fit);
                d.km = leg.km;
                arrived = true;
                ownAnims = Math.max(0, ownAnims - 1);
                await shipCallAt(truck, target, UNLOAD_SECONDS_KAPAL, () => completeKapalTransfer(d), {
                    onBerthed: () => {
                        addLog(`SANDAR: Kapal ${truck.id} sandar di ${target.nama}, kru bongkar muatan curah (±${UNLOAD_SECONDS_KAPAL} detik)...`, 'info', 'truck');
                        notify(`${truck.id} sandar di ${target.nama}, sedang bongkar muatan curah...`, 'info');
                    }
                });
                // PENTING: sama seperti truk darat - busyIds baru dilepas SETELAH kapal benar-benar sandar
                // kembali di PANGKALANNYA, supaya kapal tidak bisa dipakai lagi selagi masih berlayar pulang.
                try {
                    await shipMissionHome(truck, target, base, metaBalik);
                    addLog(`TIBA DI PANGKALAN: Kapal ${truck.id} [Nahkoda: ${driver.name}] kembali berlabuh di ${base.nama} setelah selesai bongkar muatan. BBM ${fmtN(truck.fuelL)} L, mesin ${shipCond(truck)}%.`, 'info', 'truck');
                } catch (e) { /* pelayaran pulang gagal, tidak mempengaruhi stok yang sudah masuk */ shipAbort(truck); }
                ids.forEach(x => busyIds.delete(x));
                populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
            } catch (err) {
                // Pelayaran gagal sebelum muatan turun: lepas reservasi & kembalikan muatan ke Tuban (sebelumnya hilang begitu saja).
                shipAbort(truck);
                releaseIncoming(d);
                if (!d.credited && d.refund) { d.refund(); renderRefineries(); addLog(`PELAYARAN GAGAL: Kapal ${truck.id} tidak bisa berlayar ke ${target.nama}. Muatan dikembalikan ke Kilang Tuban.`, 'warning'); }
                ids.forEach(x => busyIds.delete(x));
                populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
                if (!arrived) ownAnims = Math.max(0, ownAnims - 1);
            }
        }

        // ===== KONVOI TRUK TANGKI BBL: Kilang Pusat -> Depo Cabang (tanpa maupun berdermaga) =====
        // Satu marker di peta (pemimpin konvoi); semua unit konvoi + supir + kernet ditandai sibuk sampai kembali ke depo asal.
        // Seperti kapal, hanya status di memori: kalau game ditutup di tengah jalan, muatan yang sudah keluar dari tangki Tuban tidak dipulihkan.
        function depoConvoyBusyUi() { populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard(); try { renderLandFleetInfo(transferModeInfo()); } catch (e) {} }
        async function animateDepoConvoy(d) {
            const { spbu: target, truck: lead, convoy, driver, kernet, origin } = d;
            const ids = [...convoy.map(t => t.id), driver.id, kernet.id];
            ids.forEach(i => busyIds.add(i));
            depoConvoyBusyUi();
            ownAnims++;
            const meta = { id: lead.id, fuelIds: convoy.map(t => t.id), hd: unitLaju(lead), plat: lead.plat, type: 'BBM', owner: currentAccount ? currentAccount.company : 'Pemain',
                           depoNama: origin.nama, dariNama: origin.nama, tujuanNama: target.nama, fase: 'berangkat', nomorSJ: d.nomorSJ };
            const metaBalik = { ...meta, fase: 'kembali', dariNama: target.nama, tujuanNama: origin.nama };
            const fit = ownAnims === 1;
            let arrived = false;
            try {
                addLog(`MUAT: Konvoi ${convoy.length} truk tangki [Pemimpin ${lead.id}, Supir: ${driver.name}] sedang memuat ${fmtN(d.amount)} Bbl di ${origin.nama} (±${LOAD_SECONDS} detik)...`, 'info', 'truck');
                setTruckStage(lead.id, 'MEMUAT', 'muat', LOAD_SECONDS, [origin.lat, origin.lon], TRUCK_COLOR.BBM || '#10b981');
                await pausableDelay(LOAD_SECONDS * 1000);
                clearTruckStage(lead.id);
                d.km = await journey(origin, target, meta, fit);
                arrived = true; ownAnims = Math.max(0, ownAnims - 1);
                addLog(`TIBA: Konvoi ${lead.id} sampai di ${target.nama}, kru bersiap bongkar BBL (±${UNLOAD_SECONDS} detik)...`, 'info', 'truck');
                notify(`Konvoi ${lead.id} tiba di ${target.nama}, sedang bongkar BBL...`, 'info');
                setTruckStage(lead.id, 'BONGKAR', 'bongkar', UNLOAD_SECONDS, [target.lat, target.lon], TRUCK_COLOR.BBM || '#10b981');
                await pausableDelay(UNLOAD_SECONDS * 1000);
                clearTruckStage(lead.id);
                completeDepoConvoy(d);
                try {
                    await journey(target, origin, metaBalik, false);
                    addLog(`TIBA DI DEPOT: Konvoi ${lead.id} [Supir: ${driver.name}] kembali ke ${origin.nama}.`, 'info', 'truck');
                } catch (e) { /* animasi pulang gagal, stok sudah masuk */ }
                ids.forEach(x => busyIds.delete(x));
                depoConvoyBusyUi();
            } catch (err) {
                clearTruckStage(lead.id);
                releaseIncoming(d);
                if (!d.credited && d.refund) { d.refund(); renderRefineries(); addLog(`KONVOI GAGAL: ${lead.id} tidak bisa berangkat ke ${target.nama}. Muatan dikembalikan ke ${origin.nama}.`, 'warning'); }
                ids.forEach(x => busyIds.delete(x));
                depoConvoyBusyUi();
                if (!arrived) ownAnims = Math.max(0, ownAnims - 1);
            }
        }
        // Dieksekusi setelah konvoi tiba & selesai bongkar: stok depo naik, keausan ban/odometer semua unit, hasil kru.
        function completeDepoConvoy(d) {
            const { spbu: target, truck: lead, convoy, driver, kernet, nomorSJ } = d;
            const info = creditKlgDelivery(target, d.amount, 'BBM');
            d.credited = true; releaseIncoming(d);
            const result = settleCrewResult(driver, kernet);
            if (result.fine) { companyCash -= result.fine; totalExpense += result.fine; addFinanceLog(`Denda pelanggaran konvoi ${lead.id} (${target.nama})`, -result.fine); }
            const rt = Math.round((d.km || 0) * 2);   // pulang-pergi
            convoy.forEach(t => {
                // odometer sudah bertambah langsung selama perjalanan (lihat truckConsume)
                t.banPct = Math.max(0, Math.round(((t.banPct == null ? 100 : t.banPct) - rt * TIRE_WEAR_PER_KM * tireWearMult(t)) * 10) / 10);
                if (t.banPct <= TIRE_REPLACE_THRESHOLD) {
                    const cost = tireReplaceCost(t); companyCash -= cost; totalExpense += cost; t.banPct = 100;
                    addFinanceLog(`Ganti ban otomatis ${t.id} [${t.plat}] di depot`, -cost);
                    addLog(`BAN DIGANTI OTOMATIS: ${t.id} [${t.plat}] tiba di depot dengan ban kritis, langsung diganti set baru (${formatRupiah(cost)}).`, 'warning', 'truck');
                }
            });
            addLog(`TRANSFER SELESAI ${nomorSJ || ''}: ${fmtN(d.amount)} Bbl BBL mentah diturunkan konvoi ${lead.id} (${convoy.length} truk, ±${rt} km PP) di ${target.nama}. Stok kini ${Math.round(info.cur).toLocaleString('id-ID')}/${info.max.toLocaleString('id-ID')} ${info.unit}.`, 'success');
            notify(`Konvoi ${lead.id} selesai bongkar BBL di ${target.nama}.`, 'ok');
            updateCashDisplay(); renderRefineries(); depoConvoyBusyUi();
        }

        // Dieksekusi setelah kapal sandar DAN selesai masa bongkar (UNLOAD_SECONDS_KAPAL) - stok depo tujuan baru bertambah di sini
        function completeKapalTransfer(d) {
            const { spbu: target, truck, driver, kernet, nomorSJ } = d;
            const ids = [truck.id, driver.id, kernet.id];
            const muat = d.amount != null ? d.amount : truck.cap;
            const info = creditKlgDelivery(target, muat, d.neededType);
            d.credited = true; releaseIncoming(d); // muatan sudah masuk tangki: lepas reservasi ruang
            const result = settleCrewResult(driver, kernet);
            if (result.fine) {
                companyCash -= result.fine; totalExpense += result.fine;
                addFinanceLog(`Denda pelanggaran pelayaran kapal ${truck.id} (${target.nama})`, -result.fine);
            }
            // busyIds TIDAK dilepas di sini lagi - baru dilepas setelah kapal benar-benar sandar kembali di depot
            // asal (lihat animateKapalTransfer), supaya kapal tidak bisa ditugaskan dobel selagi masih berlayar pulang.
            addLog(`TRANSFER SELESAI ${nomorSJ || ''}: ${muat.toLocaleString('id-ID')} ${d.neededType === 'LPG' ? 'Ton' : target.unit} pasokan curah diturunkan di ${target.nama}. Stok kini ${Math.round(info.cur).toLocaleString()}/${info.max.toLocaleString()} ${info.unit}.`, 'success');
            notify(`${truck.id} selesai bongkar muatan di ${target.nama}.`, 'ok');
            updateCashDisplay();
            renderRefineries();
            populateTruckDropdowns(); populateCrewDropdowns(); renderDriversDashboard(); renderFleetDashboard();
        }

        // Dieksekusi setelah truk tiba DAN selesai masa bongkar muatan (UNLOAD_SECONDS) - baru di sinilah pendapatan cair
        function completeUnloading(d) {
            const { spbu, truck, driver, kernet, jenisMuatan, hargaPerUnit, nomorSJ } = d;
            const ids = [truck.id, driver.id, kernet.id];
            let revenueKotor = truck.cap * hargaPerUnit;
            const result = settleCrewResult(driver, kernet);
            revenueKotor -= result.fine;
            revenueKotor += fulfilOrder(spbu, jenisMuatan, truck);

            // Bonus jarak tempuh (berlaku BBM & LPG): sampai jarakBonusMinKm (50 km) harga tetap/dasar; di atas itu
            // pendapatan naik bonusJarakPerKm (kini 0,25%) dari nilai muatan per km kelebihan, dibatasi jarakBonusCapKm
            // (300 km) supaya rute super jauh tidak jadi absurd. Supaya kirim jauh sepadan dengan waktu tempuhnya.
            const jarakBonusKm = Math.max(0, Math.min(d.km || 0, ECO.jarakBonusCapKm) - ECO.jarakBonusMinKm);
            const bonusJarak = Math.round(truck.cap * hargaPerUnit * ECO.bonusJarakPerKm * jarakBonusKm);
            revenueKotor += bonusJarak;

            const biayaKirimDasar = Math.round(truck.cap * (truck.type === 'LPG' ? ECO.biayaKirimTon : ECO.biayaKirimKl));

            // Biaya BBM Solar truk dihitung dari jarak riil pulang-pergi (PP) sepanjang jalur nyata yang dilalui.
            const roundTripKmBiaya = Math.round((d.km || 0) * 2 * 10) / 10;
            const biayaBbm = 0; // solar truk kini dibayar langsung di pom bensin saat isi tangki (truckRefuel), bukan per pengiriman
            // ASURANSI PENGANTARAN: premi tiap pengantaran = asuransiPersen (2,5%) dari nilai muatan (kapasitas x harga jual).
            const biayaAsuransi = Math.round(truck.cap * hargaPerUnit * ECO.asuransiPersen);
            const biayaKirim = biayaKirimDasar + biayaBbm + biayaAsuransi;
            const revenueBersih = revenueKotor - biayaKirim;

            companyCash += revenueBersih;
            totalIncome += revenueKotor;
            totalExpense += biayaKirim;

            addFinanceLog(`Pasokan ${jenisMuatan} ke ${spbu.nama} (${driver.name}) - pendapatan kotor`, revenueKotor);
            if (bonusJarak > 0) addFinanceLog(`Bonus jarak tempuh ${truck.id} ke ${spbu.nama} (±${Math.round(d.km || 0)} km, +${Math.round(jarakBonusKm)} km di atas ${ECO.jarakBonusMinKm} km)`, bonusJarak);
            addFinanceLog(`Biaya kirim dasar ${truck.id} ke ${spbu.nama}`, -biayaKirimDasar);
            addFinanceLog(`Asuransi pengantaran ${truck.id} ke ${spbu.nama} (${(ECO.asuransiPersen * 100).toLocaleString('id-ID')}% nilai muatan)`, -biayaAsuransi);

            // Truk kembali ke depot pangkalan setelah bongkar muatan tuntas - jarak PP dihitung ke odometer & keausan ban
            const roundTripKm = roundTripKmBiaya;
            // odometer sudah bertambah langsung selama perjalanan (lihat truckConsume)
            truck.banPct = Math.max(0, Math.round((truck.banPct - roundTripKm * TIRE_WEAR_PER_KM * tireWearMult(truck)) * 10) / 10);
            let banNote = '';
            if (truck.banPct <= TIRE_REPLACE_THRESHOLD) {
                const cost = tireReplaceCost(truck);
                companyCash -= cost; totalExpense += cost;
                addFinanceLog(`Ganti ban otomatis ${truck.id} [${truck.plat}] di depot`, -cost);
                truck.banPct = 100;
                banNote = ` Ban sudah menipis saat tiba di depot, kru bengkel otomatis mengganti set ban baru (${formatRupiah(cost)}).`;
                addLog(`BAN DIGANTI OTOMATIS: ${truck.id} [${truck.plat}] tiba di depot dengan ban tersisa kritis, langsung diganti set baru. Odometer: ${truck.odometer.toLocaleString('id-ID')} km.`, 'warning', 'truck');
                notify(`${truck.id} ganti ban otomatis di depot.`, 'warn');
            }

            updateCashDisplay();
            populateCrewDropdowns();
            renderDriversDashboard();
            renderFleetDashboard();

            addLog(`BONGKAR SELESAI (SJ ${nomorSJ}): ${truck.id} [Supir: ${driver.name}] tuntas bongkar ${jenisMuatan} di ${spbu.nama}. Kotor ${formatRupiah(revenueKotor)}${bonusJarak > 0 ? ` (termasuk bonus jarak +${Math.round(jarakBonusKm)} km di atas ${ECO.jarakBonusMinKm} km: ${formatRupiah(bonusJarak)})` : ''} - biaya kirim dasar ${formatRupiah(biayaKirimDasar)} - asuransi ${formatRupiah(biayaAsuransi)} = bersih ${formatRupiah(revenueBersih)} cair ke kas. ${result.notes.join('; ')}. Menempuh ±${roundTripKm} km PP (total odometer ${truck.odometer.toLocaleString('id-ID')} km, sisa ban ${truck.banPct}%).${banNote}`, result.violated ? 'warning' : 'success', 'truck');
            notify(`Pendapatan ${formatRupiah(revenueBersih)} cair dari ${truck.id} setelah bongkar muatan di ${spbu.nama}.`, result.violated ? 'warn' : 'info');

            // busyIds TIDAK dilepas di sini lagi - baru dilepas setelah truk benar-benar tiba kembali di depot asal
            // (lihat animateDelivery), supaya truk tidak bisa ditugaskan dobel selagi masih dalam perjalanan pulang.
            populateTruckDropdowns(); populateCrewDropdowns();
        }

