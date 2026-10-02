        // Kelas armada: 'truk' = pengantar ke SPBU, 'kapal' = tanker laut, 'depo' = truk tangki BBL antar Kilang/Depo (bisa ke depo tanpa maupun berdermaga).
        // Truk 'depo' tidak pernah melayani SPBU, jadi semua filter armada SPBU memakai isSpbuTruck().
        const isDepoTruck = t => !!t && t.kelas === 'depo';
        // Skala kapasitas truk antar depo (Bbl). Tangki depo jutaan Bbl, jadi truk dibuat besar supaya transfer tidak ribuan trip. Setara KL = cap / DEPO_TRUK_SKALA / ECO.bblPerKl (dipakai rumus solar & KIR).
        const DEPO_TRUK_SKALA = 100;
        const depoKlEq = t => t.cap / DEPO_TRUK_SKALA / ECO.bblPerKl;
        // ===== TANGKI BBM (SOLAR) TRUK: bahan bakar truk itu sendiri, BUKAN muatan =====
        // Kapasitas tangki (liter) mengikuti ukuran muatan (KL untuk BBM, Ton untuk LPG, truk depo dikonversi ke KL setara).
        // Tabel ini mudah diubah: { max: batas kapasitas, l: liter tangki }. Cadangan 10%: di bawah itu truk wajib mampir ke pom bensin.
        const TRUK_TANK_TIER = [{ max: 5, l: 80 }, { max: 8, l: 120 }, { max: 16, l: 200 }, { max: 24, l: 300 }, { max: 36, l: 400 }, { max: Infinity, l: 500 }];
        const TRUK_FUEL_RESERVE = 0.10;
        const truckCapEq = t => t.kelas === 'depo' ? depoKlEq(t) : t.cap;
        const truckTankL = t => TRUK_TANK_TIER.find(x => truckCapEq(t) <= x.max).l;
        function truckFuelEnsure(t) {
            if (!t || t.kelas === 'kapal') return t;   // kapal punya sistem bunker sendiri (07b)
            const tank = truckTankL(t);
            if (typeof t.fuelL !== 'number' || !isFinite(t.fuelL)) t.fuelL = tank;
            t.fuelL = Math.max(0, Math.min(tank, t.fuelL));
            if (typeof t.odometer !== 'number' || !isFinite(t.odometer)) t.odometer = 0;
            return t;
        }
        const truckRangeKm = t => { truckFuelEnsure(t); return Math.max(0, t.fuelL - truckTankL(t) * TRUK_FUEL_RESERVE) * kmPerLiterTruk(t); };
        function truckFuelHtml(t) {
            truckFuelEnsure(t);
            const tank = truckTankL(t), pct = Math.round(t.fuelL / tank * 100), low = t.fuelL <= tank * (TRUK_FUEL_RESERVE + 0.10);
            const cls = pct <= 15 ? 'text-red-400' : pct <= 35 ? 'text-amber-400' : 'text-emerald-400', bar = pct <= 15 ? 'bg-red-500' : pct <= 35 ? 'bg-amber-500' : 'bg-emerald-500';
            return `<div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-800"><span class="text-gray-400"><i class="fa-solid fa-gas-pump mr-1 text-gray-500"></i>BBM: <b class="${cls} font-mono">${Math.round(t.fuelL).toLocaleString('id-ID')}/${tank.toLocaleString('id-ID')} L</b></span><span class="text-gray-400">Jangkauan <b class="text-gray-200 font-mono">&plusmn;${Math.round(truckRangeKm(t)).toLocaleString('id-ID')} km</b></span></div>
                <div class="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden mt-1"><div class="${bar} h-full" style="width:${pct}%"></div></div>
                <div class="text-[9px] text-gray-500 mt-0.5">Solar di bawah ${Math.round(TRUK_FUEL_RESERVE * 100)}% tangki: truk otomatis mampir ke pom bensin &amp; isi full tank di tengah jalan.${low ? ' <b class="text-amber-400">Hampir habis.</b>' : ''}</div>`;
        }
        const isSpbuTruck = t => !!t && t.kelas !== 'kapal' && t.kelas !== 'depo';

        // ===== KATALOG DEALER ARMADA =====
        const DEALER_CATALOG = [
            // --- Mobil Tangki BBM ---
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Kecil 8 KL (BBM)', short: 'Tangki Kecil (8 KL)', cap: 8, price: 520000000, engine: 'Diesel 4 Silinder Turbo 190 PS', axle: '2 Sumbu (6 Roda)', capText: '8.000 Liter · 2 kompartemen' },
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Menengah 16 KL (BBM)', short: 'Tangki Menengah (16 KL)', cap: 16, price: 980000000, engine: 'Diesel 6 Silinder 235 PS', axle: '3 Sumbu Rigid (10 Roda)', capText: '16.000 Liter · 4 kompartemen' },
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Besar 18 KL (BBM)', short: 'Tangki Besar (18 KL)', cap: 18, price: 1100000000, engine: 'Diesel 6 Silinder 260 PS', axle: '3 Sumbu Rigid (10 Roda)', capText: '18.000 Liter · 4 kompartemen' },
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Besar 24 KL Standar (BBM)', short: 'Tangki Besar (24 KL)', cap: 24, price: 1400000000, engine: 'Diesel 6 Silinder 290 PS', axle: '3 Sumbu Rigid (10 Roda)', capText: '24.000 Liter · 5 kompartemen' },
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Besar 24 KL Heavy Duty (BBM)', short: 'Tangki Besar (24 KL)', cap: 24, price: 1650000000, engine: 'Diesel 6 Silinder 330 PS Euro 4 (solar hemat 20%, ban awet 2x, laju +10%)', axle: '3 Sumbu Rigid (10 Roda)', capText: '24.000 Liter · 5 kompartemen' },
            { list: 'dealer-bbm-list', type: 'BBM', name: 'Tangki Trailer 32 KL (BBM)', short: 'Tangki Trailer (32 KL)', cap: 32, price: 2300000000, engine: 'Kepala Trailer Diesel 6 Silinder 380 PS', axle: 'Semi-Trailer (18 Roda)', capText: '32.000 Liter · 6 kompartemen' },
            // --- Truk Tangki BBL Antar Depo (bisa ke depo TANPA maupun BERDERMAGA; kapasitas langsung dalam Bbl) ---
            // HARGA BERTINGKAT (naik lebih tajam untuk kapasitas lebih besar): 10.000 Bbl x1,25 | 15.000 Bbl x1,5 | 20.000 Bbl x1,75 | 22.500 Bbl x2,0 | 25.000 Bbl x2,25 dari harga lama.
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Hino 500 Ranger FL 6x2 Tangki BBL 10.000 Bbl', short: 'Hino 500 FL 6x2 (10.000 Bbl)', cap: 10000, price: 1350000000, engine: 'Hino 500 · Diesel 6 Silinder ±260 PS', axle: '6x2 (Ranger FL) · 3 Sumbu Rigid', capText: '10.000 Bbl · Tangki curah BBL antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Hino 500 Ranger FM 6x4 Tangki BBL 15.000 Bbl', short: 'Hino 500 FM 6x4 (15.000 Bbl)', cap: 15000, price: 2280000000, engine: 'Hino 500 · Diesel 6 Silinder ±280 PS', axle: '6x4 (Ranger FM) · 3 Sumbu Rigid', capText: '15.000 Bbl · Tangki curah BBL antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Hino 700 Profia Tractor Head + Tangki BBL 20.000 Bbl', short: 'Hino 700 Profia Trailer (20.000 Bbl)', cap: 20000, price: 4375000000, engine: 'Hino 700 · Diesel 6 Silinder ±380 PS', axle: 'Semi-Trailer (Kepala Tractor 6x4)', capText: '20.000 Bbl · Beban berat, andalan antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Fuso Fighter X FN 6x4 Tangki BBL 15.000 Bbl', short: 'Fuso Fighter X 6x4 (15.000 Bbl)', cap: 15000, price: 2220000000, engine: 'Mitsubishi Fuso · Diesel 6 Silinder ±270 PS', axle: '6x4 (Fighter X) · 3 Sumbu Rigid', capText: '15.000 Bbl · Tangki curah BBL antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Fuso Super Great Tractor Head + Tangki BBL 22.500 Bbl', short: 'Fuso Super Great Trailer (22.500 Bbl)', cap: 22500, price: 5500000000, engine: 'Mitsubishi Fuso · Diesel 6 Silinder ±400 PS', axle: 'Semi-Trailer (Kepala Tractor 6x4)', capText: '22.500 Bbl · Beban berat, jarak jauh' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Isuzu Giga FX 6x4 Tangki BBL 15.000 Bbl', short: 'Isuzu Giga FX 6x4 (15.000 Bbl)', cap: 15000, price: 2190000000, engine: 'Isuzu · Diesel 6 Silinder Common Rail ±270 PS', axle: '6x4 (Giga FX) · 3 Sumbu Rigid', capText: '15.000 Bbl · Tangki curah BBL antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'Isuzu Giga GX Tractor Head + Tangki BBL 22.500 Bbl', short: 'Isuzu Giga GX Trailer (22.500 Bbl)', cap: 22500, price: 5400000000, engine: 'Isuzu · Diesel 6 Silinder Common Rail ±380 PS', axle: 'Semi-Trailer (Kepala Tractor 6x4)', capText: '22.500 Bbl · Beban berat, mesin common rail tangguh' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'UD Quester GWE 6x4 Tangki BBL 15.000 Bbl', short: 'UD Quester GWE 6x4 (15.000 Bbl)', cap: 15000, price: 2250000000, engine: 'UD Trucks · Diesel 6 Silinder ±280 PS', axle: '6x4 (Quester GWE) · 3 Sumbu Rigid', capText: '15.000 Bbl · Tangki curah BBL antar depo' },
            { list: 'dealer-depo-bbl-list', type: 'BBM', kelas: 'depo', name: 'UD Quester GDE Tractor Head + Tangki BBL 25.000 Bbl', short: 'UD Quester GDE Trailer (25.000 Bbl)', cap: 25000, price: 6750000000, engine: 'UD Trucks · Diesel 6 Silinder ±420 PS', axle: 'Semi-Trailer (Kepala Tractor 6x4)', capText: '25.000 Bbl · Kapasitas terbesar antar depo darat' },
            // --- LPG curah: Pressure Tanker & Skid Tank ---
            { list: 'dealer-lpg-bulk-list', type: 'LPG', name: 'Pressure Tanker LPG 8 Ton', short: 'Pressure Tanker (8 Ton)', cap: 8, price: 880000000, engine: 'Diesel 4 Silinder Turbo 190 PS', axle: '2 Sumbu (6 Roda)', capText: '8 Ton LPG Curah (Pressure Vessel)' },
            { list: 'dealer-lpg-bulk-list', type: 'LPG', name: 'Skid Tank LPG 15 Ton', short: 'Skid Tank (15 Ton)', cap: 15, price: 1550000000, engine: 'Diesel 6 Silinder 235 PS', axle: '3 Sumbu Rigid (10 Roda)', capText: '15 Ton LPG Curah' },
            { list: 'dealer-lpg-bulk-list', type: 'LPG', name: 'Skid Tank LPG 20 Ton Trailer', short: 'Skid Tank Trailer (20 Ton)', cap: 20, price: 2400000000, engine: 'Kepala Trailer Diesel 6 Silinder 400 PS', axle: 'Semi-Trailer (18 Roda)', capText: '20 Ton LPG Curah (Pressure Vessel)' },

            // --- Kapal Tanker (khusus transfer Kilang Pusat <-> Depo Cabang yang punya akses pelabuhan) ---
            { list: 'dealer-kapal-bbm-list', type: 'BBM', kelas: 'kapal', name: 'Tanker Pesisir 50.000 Bbl (Coastal)', short: 'Coastal Tanker (50.000 Bbl)', cap: 50000, price: 10000000000, engine: 'Marine Diesel 2.400 HP', axle: 'Coastal Tanker · di bawah 50.000 DWT (antar-pulau/pantai)', capText: '50.000 Bbl · Tanker Curah Pesisir' },
            { list: 'dealer-kapal-bbm-list', type: 'BBM', kelas: 'kapal', name: 'MR Tanker Nusa Sagara 250.000 Bbl', short: 'MR / GP Tanker (250.000 Bbl)', cap: 250000, price: 50000000000, engine: 'Marine Diesel 8.000 HP', axle: 'Medium Range / General Purpose · 17.000–45.000 DWT', capText: '250.000 Bbl · Tanker Curah MR/GP' },
            { list: 'dealer-kapal-bbm-list', type: 'BBM', kelas: 'kapal', name: 'Aframax MT Galunggong 500.000 Bbl', short: 'Aframax / LR2 (500.000 Bbl)', cap: 500000, price: 150000000000, engine: 'Marine Diesel 14.000 HP', axle: 'Large Range / Aframax · 80.000–120.000 DWT', capText: '500.000 Bbl · Tanker Curah Aframax' },
            { list: 'dealer-kapal-bbm-list', type: 'BBM', kelas: 'kapal', name: 'Suezmax Permatina Halmahera 800.000 Bbl', short: 'Suezmax (800.000 Bbl)', cap: 800000, price: 300000000000, engine: 'Marine Diesel 18.000 HP', axle: 'Suezmax · 125.000–156.000 DWT', capText: '800.000 Bbl · Tanker Curah Suezmax' },
            { list: 'dealer-kapal-bbm-list', type: 'BBM', kelas: 'kapal', name: 'VLCC Pertamini Pride 2.000.000 Bbl', short: 'VLCC (2.000.000 Bbl)', cap: 2000000, price: 500000000000, engine: 'Marine Diesel 30.000 HP', axle: 'Very Large Crude Carrier · 300.000+ DWT', capText: '2.000.000 Bbl · Tanker Minyak Mentah Raksasa' },
            { list: 'dealer-kapal-lpg-list', type: 'LPG', kelas: 'kapal', name: 'Small LPG Gas Antasenu 3.000 Ton', short: 'Small LPG (3.000 Ton)', cap: 3000, price: 15000000000, engine: 'Marine Diesel 3.500 HP', axle: 'Small LPG Carrier · 1.700–3.800 MT (2.000–4.000 CBM)', capText: '3.000 Ton LPG Curah · Kapal Kecil (pelabuhan kecil/antar-pulau)' },
            { list: 'dealer-kapal-lpg-list', type: 'LPG', kelas: 'kapal', name: 'Midsize LPG Gas Widuro 15.000 Ton', short: 'Midsize LPG (15.000 Ton)', cap: 15000, price: 100000000000, engine: 'Marine Diesel 9.000 HP', axle: 'Midsize LPG Carrier · 15.000–17.400 MT', capText: '15.000 Ton LPG Curah · Kapal Menengah (rute regional)' },
            { list: 'dealer-kapal-lpg-list', type: 'LPG', kelas: 'kapal', name: 'VLGC PIZ Prolifik 40.000 Ton', short: 'VLGC (40.000 Ton)', cap: 40000, price: 400000000000, engine: 'Marine Diesel 22.000 HP', axle: 'Very Large Gas Carrier · 56.000–91.000 CBM', capText: '40.000 Ton LPG Curah · Kapal Raksasa (VLGC)' },
            // --- LPG tabung: Truk distribusi agen/SPBE ---
            { list: 'dealer-lpg-agent-list', type: 'LPG', name: 'Truk Agen Tabung 3 Kg (Oranye)', short: 'Agen Tabung 3 Kg (3 Ton)', cap: 3, price: 380000000, engine: 'Diesel 4 Silinder 110 PS', axle: '2 Sumbu (6 Roda)', capText: '3 Ton Tabung LPG 3 Kg' },
            { list: 'dealer-lpg-agent-list', type: 'LPG', name: 'Truk Agen LPG 12 Kg (Biru)', short: 'Agen LPG 12 Kg (4 Ton)', cap: 4, price: 420000000, engine: 'Diesel 4 Silinder 130 PS', axle: '2 Sumbu (6 Roda)', capText: '4 Ton Tabung LPG 12 Kg' },
            { list: 'dealer-lpg-agent-list', type: 'LPG', name: 'Truk Tabung LPG 5 Ton', short: 'Truk Tabung Campuran (5 Ton)', cap: 5, price: 460000000, engine: 'Diesel 4 Silinder 110 PS', axle: '2 Sumbu (6 Roda)', capText: '5 Ton Tabung (3 Kg / 12 Kg)' }
        ];

        // ===== UNIT LIMITED EDITION (DEV) =====
        // Tidak masuk DEALER_CATALOG: tampil di kategori "Limited" hanya kalau owner mengaktifkannya (dokumen server limited_models/{id}.active),
        // dan bisa juga diberikan langsung oleh owner lewat Panel Admin. Kuota & nomor seri dijaga server (js/14-limited-edition.js).
        // perk: pakaiSolar = pengali konsumsi solar (0.75 = hemat 25%), ausBan = pengali keausan ban, laju = pengali kecepatan, kirFree = perpanjang KIR gratis.
        const LIMITED_CATALOG = [
            { id: 'ltd-trailer-40', type: 'BBM', name: 'Tangki Trailer 40 KL Dev Edition (BBM)', short: 'Trailer 40 KL Dev Edition', cap: 40, price: 3600000000, defaultQuota: 50,
              engine: 'Kepala Trailer Diesel 6 Silinder 450 PS Euro 5 (solar hemat 25%, ban awet 2x, laju +10%, KIR gratis)', axle: 'Semi-Trailer (18 Roda)', capText: '40.000 Liter · 7 kompartemen',
              perk: { pakaiSolar: 0.75, ausBan: 0.5, laju: 1.10, kirFree: true } },
            { id: 'ltd-lpg-25', type: 'LPG', name: 'Skid Tank LPG 25 Ton Dev Edition', short: 'Skid Tank 25 Ton Dev Edition', cap: 25, price: 3800000000, defaultQuota: 50,
              engine: 'Kepala Trailer Diesel 6 Silinder 450 PS Euro 5 (solar hemat 25%, ban awet 2x, laju +10%, KIR gratis)', axle: 'Semi-Trailer (18 Roda)', capText: '25 Ton LPG Curah (Pressure Vessel)',
              perk: { pakaiSolar: 0.75, ausBan: 0.5, laju: 1.10, kirFree: true } }
        ];
        const limitedModel = id => LIMITED_CATALOG.find(m => m.id === id) || null;

        // Biaya legalitas saat beli: uji KIR baru + STNK/BBN + pelat nomor (TNKB)
        const regFee = u => { const kir = u.kelas === 'kapal' ? Math.round(u.price * 0.005 / 100000) * 100000 : Math.round((1200000 + (u.kelas === 'depo' ? depoKlEq(u) : u.cap) * 150000) / 100000) * 100000, stnk = Math.round(u.price * 0.03 / 100000) * 100000, plat = 500000; return { kir, stnk, plat, total: kir + stnk + plat }; };
        const kirRenewCost = t => (typeof unitPerk === 'function' && (unitPerk(t) || {}).kirFree) ? 0 : Math.round(regFee({ cap: t.cap, price: t.price || 500e6, kelas: t.kelas }).kir * 0.6 / 50000) * 50000;
        const stnkRenewCost = t => Math.round((t.price || 500e6) * 0.02 / 100000) * 100000;
        const platRenewCost = t => 500000;
        const STNK_PERIOD = 5 * 365 * 86400000; // STNK berlaku 5 tahun
        const PLAT_PERIOD = 5 * 365 * 86400000; // Plat nomor (TNKB) berlaku 5 tahun
        const KIR_DISHUB_MS = 3600000; // proses verifikasi Dishub = 1 jam waktu in-game
        // Istilah dokumen per jenis unit. Mekanik (tanggal berlaku, biaya) sama; kapal memakai istilah pelayaran, bukan KIR/STNK/plat.
        const docLbl = t => (t && t.kelas === 'kapal')
            ? { kir: 'Sertifikat Kelaikan', kirCard: 'Sertifikat Kelaikan Kapal', badan: 'Syahbandar', stnk: 'Surat Kebangsaan', stnkCard: 'Surat Tanda Kebangsaan (5 th)', plat: 'Tanda Selar', platCard: 'Tanda Selar (5 th)', ringkas: 'Sertifikat/Kebangsaan/Selar', bpkb: 'Grosse Akta', bbn: 'biaya balik nama', unit: 'Kapal', head: 'Surat Kapal', tombol: 'Surat kapal: Sertifikat Kelaikan, Surat Kebangsaan, Tanda Selar, Balik Nama' }
            : { kir: 'Uji KIR', kirCard: 'Uji KIR Dishub', badan: 'Dishub', stnk: 'STNK', stnkCard: 'Pajak STNK Tahunan (5 th)', plat: 'Plat Nomor', platCard: 'Pajak Plat Nomor (5 th)', ringkas: 'KIR/STNK/plat', bpkb: 'STNK/BPKB', bbn: 'BBNKB + administrasi', unit: 'Kendaraan', head: 'Surat Kendaraan', tombol: 'Surat kendaraan: KIR, STNK, Plat, Balik Nama' };
        const docCls = ts => { const l = ts - gameNow(); return l <= 0 ? 'text-red-400' : l < 30 * 86400000 ? 'text-amber-400' : 'text-emerald-400'; };
        const docTxt = ts => { const l = ts - gameNow(); return dShort(ts) + (l <= 0 ? ' (KEDALUWARSA)' : l < 30 * 86400000 ? ' (segera habis)' : ''); };
        function docBlock(t) {
            const L = docLbl(t), bad = [t.kirTs <= gameNow() ? L.kir : '', t.stnkTs <= gameNow() ? L.stnk : '', t.platTs <= gameNow() ? L.plat : ''].filter(Boolean);
            if (!bad.length) return false;
            showModal('Dokumen Kedaluwarsa', `${t.id} [${t.plat}] tidak boleh jalan: ${bad.join(' & ')} sudah habis. Perpanjang di tab Armada.`, 'fa-file-circle-xmark', 'red'); return true;
        }
        // Proses berkas Uji KIR yang sedang diverifikasi Dishub (dicek tiap tick jam game berjalan)
        function processKirPending() {
            companyFleet.forEach(t => {
                if (t.kirPending && gameNow() >= t.kirPending) {
                    t.kirTs = Math.max(gameNow(), t.kirTs) + 182 * 86400000;
                    t.kirPending = null;
                    const L = docLbl(t);
                    addLog(`${L.kir.toUpperCase()} DISETUJUI ${L.badan.toUpperCase()}: berkas ${t.id} [${t.plat}] selesai diverifikasi, ${L.kir} baru aktif hingga ${dShort(t.kirTs)}.`, 'success');
                    notify(`${L.kir} ${t.id} [${t.plat}] disetujui ${L.badan}.`, 'success');
                    renderFleetDashboard();
                }
            });
        }
        function renewDoc(id, kind) {
            const t = companyFleet.find(x => x.id === id); if (!t) return;
            const L = docLbl(t);
            if (kind === 'kir') {
                if (t.kirPending) return showModal(`Sedang Diproses ${L.badan}`, `Berkas ${L.kir} ${t.id} [${t.plat}] masih diverifikasi ${L.badan}, estimasi selesai ${fmtTime(t.kirPending)} (waktu in-game).`, 'fa-hourglass-half', 'blue');
                const cost = kirRenewCost(t);
                if (companyCash < cost) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
                companyCash -= cost; totalExpense += cost;
                t.kirPending = gameNow() + KIR_DISHUB_MS;
                addFinanceLog(`${L.kir} dikirim ke ${L.badan} ${t.id} [${t.plat}]`, -cost);
                addLog(`${L.kir.toUpperCase()} DIKIRIM: berkas ${t.id} [${t.plat}] dikirim ke ${L.badan} untuk verifikasi.`, 'info');
                showModal(`${L.kir} Dikirim ke ${L.badan}`, `Berkas ${L.kir} untuk ${t.id} [${t.plat}] sudah dikirim ke ${L.badan}. Proses verifikasi memakan waktu 1 jam (waktu in-game), estimasi selesai pukul ${fmtTime(t.kirPending)} WIB.`, 'fa-paper-plane', 'blue');
                updateCashDisplay(); renderFleetDashboard();
                return;
            }
            const cost = kind === 'stnk' ? stnkRenewCost(t) : platRenewCost(t);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            companyCash -= cost; totalExpense += cost;
            let newTs;
            if (kind === 'stnk') { t.stnkTs = Math.max(gameNow(), t.stnkTs) + STNK_PERIOD; newTs = t.stnkTs; }
            else { t.platTs = Math.max(gameNow(), t.platTs) + PLAT_PERIOD; newTs = t.platTs; }
            addFinanceLog(`${kind === 'stnk' ? (t.kelas === 'kapal' ? 'Perpanjang Surat Kebangsaan' : 'Perpanjang STNK/pajak') : 'Perpanjang ' + L.plat} ${t.id} [${t.plat}]`, -cost);
            showModal((kind === 'stnk' ? L.stnk : L.plat) + ' Diperpanjang', `${kind === 'stnk' ? L.stnk : L.plat} untuk ${t.id} [${t.plat}] berhasil diperpanjang dan berlaku 5 tahun, aktif hingga ${dShort(newTs)}.`, 'fa-circle-check', 'blue');
            updateCashDisplay(); renderFleetDashboard();
        }

        // ===== BALIK NAMA =====
        // Tiap unit punya "atas nama" (pemilikUid + pemilik = nama PT di STNK/BPKB). Unit beli baru di Dealer langsung atas nama PT sendiri.
        // Unit yang dibeli dari Bursa P2P MASIH atas nama PT penjual: pembeli wajib balik nama manual di tab Armada (bayar BBNKB + administrasi).
        // Selama belum balik nama, unit tidak bisa dijual lagi (Bursa P2P maupun Jual Instan ke Server). Unit tetap boleh beroperasi.
        const BBNKB_RATE = 0.05, BALIK_NAMA_ADM = 500000;
        const perluBalikNama = t => !!currentAccount && !!t.pemilikUid && t.pemilikUid !== currentAccount.id;
        const balikNamaCost = t => Math.round(estimateTruckValue(t) * BBNKB_RATE / 100000) * 100000 + BALIK_NAMA_ADM;
        function tolakBelumBalikNama(t) {
            if (t && (t.limited || t.limitedId)) { showModal('Unit Limited Edition', `${t.id} [${t.plat}] adalah unit Limited Edition: tidak bisa dijual ke Bursa P2P maupun Jual Instan.`, 'fa-gem', 'amber'); return true; }
            if (!perluBalikNama(t)) return false;
            showModal('Belum Balik Nama', `${t.id} [${t.plat}] masih atas nama ${t.pemilik || '-'}. Lakukan Balik Nama lewat tombol Surat di tab Armada (biaya ${formatRupiah(balikNamaCost(t))}) sebelum unit ini bisa dijual ke Bursa P2P atau Jual Instan.`, 'fa-file-signature', 'amber');
            return true;
        }
        let balikNamaBusy = false;
        async function balikNama(id) {
            if (balikNamaBusy) return;
            const t = companyFleet.find(x => x.id === id); if (!t || !currentAccount) return;
            if (!perluBalikNama(t)) return;
            const cost = balikNamaCost(t);
            if (companyCash < cost) return showModal('Kas Tidak Cukup', `Balik nama ${t.id} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
            balikNamaBusy = true;
            try {
                const ok = await showConfirm(`Balik nama ${t.id} [${t.plat}] dari ${t.pemilik || '-'} menjadi ${currentAccount.company}? Biaya ${docLbl(t).bbn} ${formatRupiah(cost)} dipotong dari kas.`, { title: 'Balik Nama ' + docLbl(t).unit, iconClass: 'fa-file-signature', theme: 'amber', okLabel: 'Balik Nama' });
                if (!ok) return;
                const t2 = companyFleet.find(x => x.id === id);   // cek ulang: state bisa berubah saat dialog terbuka
                if (!t2 || !perluBalikNama(t2)) return;
                if (companyCash < cost) return showModal('Kas Tidak Cukup', `Balik nama ${t2.id} butuh ${formatRupiah(cost)}.`, 'fa-triangle-exclamation', 'red');
                const lama = t2.pemilik || '-';
                companyCash -= cost; totalExpense += cost;
                t2.pemilikUid = currentAccount.id; t2.pemilik = currentAccount.company;
                addFinanceLog(`Balik nama ${t2.name} [${t2.plat}] dari ${lama}`, -cost);
                addLog(`BALIK NAMA: ${t2.id} [${t2.plat}] resmi atas nama ${esc(currentAccount.company)} (sebelumnya ${esc(lama)}). Unit kini bisa dijual.`, 'success');
                showModal('Balik Nama Selesai', `${t2.id} [${t2.plat}] kini atas nama ${currentAccount.company}. Unit sudah bisa dijual ke Bursa P2P maupun Instan.`, 'fa-circle-check', 'blue');
                updateCashDisplay(); populateTruckDropdowns(); renderFleetDashboard(); saveGame();
            } finally { balikNamaBusy = false; }
        }
        function renderDealerCatalog() {
            document.querySelectorAll('[id^="dealer-"][id$="-list"]').forEach(el => el.innerHTML = '');
            DEALER_CATALOG.forEach((u, idx) => {
                const isBBM = u.type === 'BBM';
                const btn = u.kelas === 'kapal' ? 'bg-cyan-600 hover:bg-cyan-700' : u.kelas === 'depo' ? 'bg-teal-600 hover:bg-teal-700' : (isBBM ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700');
                const row = document.createElement('div');
                row.className = 'p-2.5 bg-gray-900 rounded-lg border border-gray-800 flex justify-between items-center gap-2';
                row.innerHTML = `
                    <div class="min-w-0">
                        <div class="font-bold text-gray-200">${u.short}</div>
                        <div class="text-[10px] text-gray-400">${u.axle} • ${u.engine}</div>
                        <div class="text-[10px] text-gray-500">${u.capText}${u.kelas === 'kapal' ? '' : ' &middot; Tangki BBM ' + truckTankL(u) + ' L'}</div>
                        <div class="text-emerald-400 font-mono font-bold mt-0.5">${formatRupiah(u.price)}</div>
                        <div class="text-[10px] text-gray-500">+ ${docLbl(u).ringkas} ${formatRupiah(regFee(u).total)}</div>
                    </div>
                    <button onclick="buyFromCatalog(${idx})" class="${btn} text-white px-3 py-1.5 rounded font-semibold transition shrink-0">Beli Unit</button>
                `;
                document.getElementById(u.list).appendChild(row);
            });
            if (typeof renderLimitedDealer === 'function') renderLimitedDealer();
        }

        function buyFromCatalog(idx) {
            const u = DEALER_CATALOG[idx];
            openDealerConfirm(u.name, u.cap, u.type, u.price, u.engine, u.axle, u.capText, u.kelas);
        }

        function openDealerConfirm(name, cap, type, price, engine, axle, capText, kelas) {
            pendingTruckPurchase = { name, cap, type, price, fee: regFee({ cap, price, kelas: kelas || 'truk' }), kelas: kelas || 'truk', qty: 1 };
            
            document.getElementById('dealer-spec-name').innerText = name;
            document.getElementById('dealer-spec-engine').innerText = engine;
            document.getElementById('dealer-spec-axle').innerText = axle;
            document.getElementById('dealer-spec-capacity').innerText = capText + (kelas === 'kapal' ? '' : ' · Tangki BBM ' + truckTankL({ cap, kelas: kelas || 'truk' }) + ' L');
            { const f = regFee({ cap, price, kelas: kelas || 'truk' }); document.getElementById('dealer-spec-price').innerHTML = formatRupiah(price) + `<br><span class="text-[10px] font-sans font-normal text-gray-400">+ ${docLbl({ kelas }).kir} ${formatRupiah(f.kir)} &middot; ${docLbl({ kelas }).stnk} ${formatRupiah(f.stnk)} &middot; ${kelas === 'kapal' ? 'Tanda Selar' : 'Plat'} ${formatRupiah(f.plat)}</span><br><span class="text-[11px] font-sans text-amber-300">Total ${formatRupiah(price + f.total)}</span>`; }

            document.getElementById('btn-confirm-buy-truck').onclick = executeTruckPurchase;
            { const jk = document.getElementById('dealer-julukan'); if (jk) jk.value = ''; }
            renderDealerDepotOptions();
            renderDealerQty();
            document.getElementById('dealer-modal').classList.remove('hidden');
        }

        // ===== PLAT NOMOR MENGIKUTI DAERAH DEPO + JULUKAN ARMADA =====
        // Kode wilayah TNKB sesuai lokasi depo pangkalan (Tuban = S, Surabaya = L, Gresik = W, Banyuwangi = P, dst).
        const PLAT_DAERAH = {
            'KILANG-01': 'S',  'KILANG-02': 'L',  'KILANG-03': 'W',  'KILANG-04': 'B',  'KILANG-05': 'H',  'KILANG-06': 'D',
            'KILANG-07': 'DK', 'KILANG-08': 'DB', 'KILANG-09': 'DN', 'KILANG-10': 'DC', 'KILANG-11': 'KT', 'KILANG-12': 'DA',
            'KILANG-13': 'KB', 'KILANG-14': 'KH', 'KILANG-15': 'KU', 'KILANG-16': 'DD', 'KILANG-17': 'P'
        };
        const platKode = depotId => PLAT_DAERAH[depotId] || 'S';
        const PLAT_HURUF = 'ABCDEFGHJKLMNPRSTUVWXYZ';
        function buatPlat(kelas, depotId) {
            let plat;
            do {
                plat = kelas === 'kapal'
                    ? 'GT ' + Math.floor(100 + Math.random() * 900) + ' NUSA'
                    : platKode(depotId) + ' ' + Math.floor(1000 + Math.random() * 9000) + ' ' + PLAT_HURUF[Math.floor(Math.random() * PLAT_HURUF.length)] + PLAT_HURUF[Math.floor(Math.random() * PLAT_HURUF.length)];
            } while (companyFleet.some(t => t.plat === plat));
            return plat;
        }
        // Julukan bebas (opsional), maks 24 karakter, tanpa tag HTML.
        const cleanJulukan = v => String(v || '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
        // Label unit untuk dropdown/daftar: "TRK-01 [S 1234 AB] "Si Bolang" - ..."
        const unitJulukan = t => t && t.julukan ? ` "${t.julukan}"` : '';
        // Save lama: plat bawaan lama ("W ####  PK") disesuaikan ke daerah depo pangkalannya.
        function migrasiPlatDaerah() {
            companyFleet.forEach(t => {
                if (t.kelas === 'kapal' || !/^W \d{4} PK$/.test(t.plat || '')) return;
                const kode = platKode(t.depotId); if (kode === 'W') return;
                let baru; do { baru = kode + t.plat.slice(1); if (companyFleet.some(x => x !== t && x.plat === baru)) t.plat = 'W ' + Math.floor(1000 + Math.random() * 9000) + ' PK'; else break; } while (true);
                t.plat = baru;
            });
        }

        // ===== PILIH PANGKALAN DEPO SAAT BELI (supaya tidak perlu Pindah Depot satu-satu) =====
        // Semua depo yang sudah dibeli ditampilkan. Depo tanpa mekanik tampil nonaktif (aturan pangkalan armada sama
        // seperti Pindah Depot di tab Armada). Pilihan terakhir diingat selama sesi supaya pembelian berikutnya langsung sama.
        let lastDealerDepotId = 'KILANG-01';
        function dealerDepotReady(k) { return !!(k && k.is_unlocked && k.mekanikId); }
        function renderDealerDepotOptions() {
            const sel = document.getElementById('dealer-depot-sel'); if (!sel) return;
            sel.onchange = updateDealerPlatHint;
            const hint = document.getElementById('dealer-depot-hint');
            // KAPAL: hanya depo yang PUNYA DERMAGA (dan bermekanik) atau anjungan yang sudah beroperasi. Opsi lain tampil nonaktif beserta alasannya.
            if (pendingTruckPurchase && pendingTruckPurchase.kelas === 'kapal') {
                const cand = shipBaseCandidates(), siap = cand.filter(shipBaseOk);
                const pilih = siap.some(e => e.id === lastDealerDepotId) ? lastDealerDepotId : 'KILANG-01';
                sel.innerHTML = shipBaseOptionsHtml(pilih, pilih);
                const tanpa = cand.length - siap.length;
                hint.innerHTML = (tanpa
                    ? `<span class="text-amber-400"><i class="fa-solid fa-circle-info mr-1"></i>${tanpa} lokasi belum bisa dipilih: kapal hanya boleh berpangkalan di depo yang punya dermaga (dan bermekanik) atau di anjungan yang sudah beroperasi.</span>`
                    : 'Kapal berpangkalan di depo ber-dermaga atau anjungan. Misi berangkat dan pulang ke pangkalan ini.');
                updateDealerPlatHint();
                return;
            }
            const aktif = refineryData.filter(k => k.is_unlocked);
            const siap = aktif.filter(dealerDepotReady);
            const pilih = siap.some(k => k.id === lastDealerDepotId) ? lastDealerDepotId : 'KILANG-01';
            sel.innerHTML = aktif.map(k => dealerDepotReady(k)
                ? `<option value="${k.id}" ${k.id === pilih ? 'selected' : ''}>${esc(k.nama)}</option>`
                : `<option value="${k.id}" disabled>${esc(k.nama)} (belum ada mekanik)</option>`).join('');
            const tanpa = aktif.length - siap.length;
            hint.innerHTML = tanpa
                ? `<span class="text-amber-400"><i class="fa-solid fa-circle-info mr-1"></i>${tanpa} depo sudah dibeli tapi belum bisa dipilih: tugaskan mekanik dulu di tab Kilang.</span>`
                : 'Unit langsung berpangkalan di depo ini, tanpa biaya mobilisasi.';
            updateDealerPlatHint();
        }
        function updateDealerPlatHint() {
            const el = document.getElementById('dealer-plat-hint'); if (!el) return;
            const sel = document.getElementById('dealer-depot-sel');
            const isKapal = pendingTruckPurchase && pendingTruckPurchase.kelas === 'kapal';
            { const dt = document.getElementById('dealer-doc-text'); if (dt) dt.textContent = isKapal ? 'Tanda Selar resmi, Surat Kebangsaan, dan Sertifikat Kelaikan Kapal aktif' : 'Plat Nomor resmi dan dokumen kelayakan Uji KIR aktif'; }
            el.innerHTML = isKapal ? 'Kapal memakai nomor registrasi GT (bukan plat daerah).' : `Plat nomor akan berkode wilayah <b class="text-amber-400 font-mono">${platKode(sel && sel.value)}</b> sesuai daerah depo.`;
        }

        // ===== BELI BORONGAN (dealer) =====
        // Diskon volume hanya untuk truk darat, dihitung dari harga unit (biaya KIR/STNK/plat tetap per unit).
        // Kapal boleh borongan tapi tanpa diskon dan dibatasi 3 unit (harga sudah sangat besar).
        const BULK_MAX_TRUK = 10, BULK_MAX_KAPAL = 3;
        const bulkMax = k => k === 'kapal' ? BULK_MAX_KAPAL : BULK_MAX_TRUK;
        const bulkDiscPct = (qty, kelas) => kelas === 'kapal' ? 0 : qty >= 8 ? 8 : qty >= 5 ? 5 : qty >= 3 ? 3 : 0;
        function bulkQuote(pp) {
            const disc = bulkDiscPct(pp.qty, pp.kelas);
            const gross = pp.price * pp.qty;
            const discAmt = Math.round(gross * disc / 100);
            const fees = pp.fee.total * pp.qty;
            return { disc, gross, discAmt, fees, total: gross - discAmt + fees };
        }
        function renderDealerQty() {
            const pp = pendingTruckPurchase; if (!pp) return;
            const q = bulkQuote(pp);
            document.getElementById('dealer-qty').innerText = pp.qty;
            document.getElementById('dealer-qty-minus').disabled = pp.qty <= 1;
            document.getElementById('dealer-qty-plus').disabled = pp.qty >= (pp.limitedId ? 1 : bulkMax(pp.kelas));
            document.getElementById('dealer-bulk-info').innerHTML =
                `<div class="flex justify-between"><span class="text-gray-400">Harga unit x ${pp.qty}</span><span class="text-gray-200 font-mono">${formatRupiah(q.gross)}</span></div>` +
                (q.disc ? `<div class="flex justify-between"><span class="text-emerald-400">Diskon borongan ${q.disc}%</span><span class="text-emerald-400 font-mono">-${formatRupiah(q.discAmt)}</span></div>` : '') +
                `<div class="flex justify-between"><span class="text-gray-400">KIR + STNK + Plat x ${pp.qty}</span><span class="text-gray-200 font-mono">${formatRupiah(q.fees)}</span></div>` +
                `<div class="flex justify-between border-t border-gray-800 pt-1 mt-1"><span class="text-gray-300 font-bold">Total Bayar</span><span class="text-amber-300 font-mono font-bold">${formatRupiah(q.total)}</span></div>` +
                (pp.kelas !== 'kapal' && pp.qty < 8 ? `<div class="text-[10px] text-gray-500 mt-1">Diskon: 3 unit 3% &middot; 5 unit 5% &middot; 8 unit 8%</div>` : '');
            document.getElementById('btn-confirm-buy-truck').innerText = pp.qty > 1 ? `Setujui & Beli ${pp.qty} Unit` : 'Setujui & Beli';
        }
        function changeDealerQty(d) {
            const pp = pendingTruckPurchase; if (!pp) return;
            pp.qty = Math.min(pp.limitedId ? 1 : bulkMax(pp.kelas), Math.max(1, pp.qty + d));
            renderDealerQty();
        }

        function closeDealerModal() {
            document.getElementById('dealer-modal').classList.add('hidden');
            pendingTruckPurchase = null;
        }

        function executeTruckPurchase() {
            if (pphBlokir()) return;
            if (!pendingTruckPurchase) return;
            if (pendingTruckPurchase.limitedId) return executeLimitedPurchase();   // js/14-limited-edition.js (server menjaga kuota & nomor seri)

            const { name, cap, type, price, kelas, qty } = pendingTruckPurchase;
            const fee = pendingTruckPurchase.fee;
            const q = bulkQuote(pendingTruckPurchase);
            const isKapal = kelas === 'kapal';

            // Pangkalan yang dipilih. Kapal: WAJIB depo ber-dermaga (bermekanik) atau anjungan yang sudah beroperasi, kalau tidak pembelian ditolak
            // (divalidasi sebelum kas dipotong). Truk: harus depo aktif + punya mekanik, kalau tidak jatuh ke Tuban.
            const selDepot = document.getElementById('dealer-depot-sel');
            let depotTarget;
            if (isKapal) {
                depotTarget = shipBaseEntity(selDepot && selDepot.value);
                const why = shipBaseWhy(depotTarget);
                if (why) {
                    closeDealerModal();
                    showModal('Pangkalan Tidak Sah', `${depotTarget ? esc(depotTarget.nama) : 'Lokasi yang dipilih'} ${why}. Kapal hanya boleh berpangkalan di depo yang punya dermaga atau di anjungan yang sudah beroperasi. Pilih pangkalan lain lalu ulangi pembelian.`, 'fa-anchor', 'red');
                    return;
                }
            } else {
                depotTarget = refineryData.find(k => k.id === (selDepot && selDepot.value));
                if (!dealerDepotReady(depotTarget)) depotTarget = refineryData[0];
            }

            if (companyCash < q.total) {
                closeDealerModal();
                showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(q.total)} (${qty} unit ${formatRupiah(q.gross - q.discAmt)} + KIR/STNK/plat ${formatRupiah(q.fees)}).`, 'fa-triangle-exclamation', 'red');
                return;
            }

            lastDealerDepotId = depotTarget.id;

            companyCash -= q.total;
            totalExpense += q.total;

            const julukanDasar = cleanJulukan((document.getElementById('dealer-julukan') || {}).value);
            const prefix = isKapal ? 'KPL-' : 'TRK-';
            const newUnits = [];
            for (let i = 0; i < qty; i++) {
                const randomPlat = buatPlat(kelas, depotTarget.id);
                let truckNo = companyFleet.length + 1;
                while (companyFleet.some(t => t.id === prefix + String(truckNo).padStart(2, '0'))) truckNo++;
                const newTruckId = prefix + String(truckNo).padStart(2, '0');
                const newTruck = {
                    id: newTruckId,
                    name: name,
                    cap: cap,
                    type: type,
                    kelas: isKapal ? 'kapal' : kelas === 'depo' ? 'depo' : 'truk',
                    status: 'Sedia',
                    plat: randomPlat,
                    julukan: julukanDasar ? (qty > 1 ? cleanJulukan(julukanDasar.slice(0, 20) + ' ' + (i + 1)) : julukanDasar) : '',
                    depotId: depotTarget.id,
                    odometer: 0, banPct: 100, ...(isKapal ? {} : { fuelL: truckTankL({ cap, kelas: kelas === 'depo' ? 'depo' : 'truk' }) }), // truk baru: tangki BBM penuh
                    price, kirTs: gameNow() + 182 * 86400000, stnkTs: gameNow() + STNK_PERIOD, platTs: gameNow() + PLAT_PERIOD, kirPending: null,
                    pemilikUid: currentAccount ? currentAccount.id : '', pemilik: currentAccount ? currentAccount.company : ''   // atas nama (STNK/BPKB)
                };
                companyFleet.push(newTruck);
                newUnits.push(newTruck);
                spawnOrderForNewTruck(newTruck);
            }

            // Catatan keuangan: harga unit (sudah dikurangi diskon borongan) sebagai satu baris, biaya legalitas per unit
            const idList = newUnits.length > 1 ? `${newUnits[0].id} s/d ${newUnits[newUnits.length - 1].id}` : newUnits[0].id;
            addFinanceLog(`Pembelian ${qty}x ${name} (${idList})${q.disc ? ` diskon borongan ${q.disc}%` : ''}`, -(q.gross - q.discAmt));
            addFinanceLog(`${docLbl({ kelas: isKapal ? 'kapal' : '' }).kir} baru ${idList}`, -fee.kir * qty);
            addFinanceLog(`${isKapal ? 'Surat Kebangsaan' : 'STNK/BBN'} ${idList}`, -fee.stnk * qty);
            addFinanceLog(`${isKapal ? 'Tanda selar' : 'Pelat nomor'} ${qty} unit`, -fee.plat * qty);
            closeDealerModal();
            updateCashDisplay();
            populateTruckDropdowns();
            renderFleetDashboard();

            const platList = newUnits.map(u => u.plat).join(', ');
            addLog(`BERHASIL MEMBELI ARMADA: ${qty} Unit ${name} [${platList}] ditambahkan ke garasi, berpangkalan di ${depotTarget.nama}.${q.disc ? ` Diskon borongan ${q.disc}% (hemat ${formatRupiah(q.discAmt)}).` : ''}`, 'success');
            showModal('Pembelian Berhasil', `${qty} Unit ${name} berhasil dibeli!<br><b>${newUnits.map(u => u.id + ' [' + u.plat + ']').join('<br>')}</b>${q.disc ? `<br><br>Diskon borongan ${q.disc}%: hemat <b>${formatRupiah(q.discAmt)}</b>.` : ''}<br><br>${isKapal ? 'Surat Kebangsaan & Tanda Selar' : 'STNK & Plat Nomor'} aktif <b>5 tahun</b> sejak hari ini. Pangkalan: <b>${esc(depotTarget.nama)}</b>. Silakan assign ${isKapal ? 'Nahkoda & ABK' : 'driver'} saat hendak dispatch.`, 'fa-circle-check');
        }

        function formatRupiah(amount) {
            return 'Rp ' + amount.toLocaleString('id-ID');
        }

        function updateCashDisplay() {
            document.getElementById('kpis-cash').innerText = formatRupiah(companyCash);
            if (typeof corpRepRender === 'function') corpRepRender();
            document.getElementById('kpis-truck-count').innerText = `${companyFleet.length} Unit`;
            document.getElementById('kpis-driver-count').innerText = `${companyCrew.length} Orang`;
            document.getElementById('fin-income').innerText = formatRupiah(totalIncome);
            document.getElementById('fin-expense').innerText = formatRupiah(totalExpense);
            renderFinance();
            saveGame();
        }

        // ===== LAPORAN KEUANGAN & PPh BADAN =====
        // PPh Badan tiap 2 MINGGU: tiap akhir periode 2 minggu game (14 hari game = ±11,2 jam nyata) terbit tagihan sebesar
        // PPh kumulatif dikurangi yang sudah pernah ditagih. Pemain boleh bayar sendiri sebelum jatuh tempo (tanpa denda).
        // Begitu lewat jatuh tempo, sistem MEMOTONG KAS OTOMATIS: pokok + denda 20%. Kalau kas kurang, sisanya jadi
        // TUNGGAKAN (pphUtang): semua kas masuk berikutnya dipotong sampai lunas, dan selama masih menunggak pembelian /
        // ekspansi / pengiriman diblokir (lihat pphBlokir). Jual cepat & Bursa tetap bisa dipakai untuk menutup tunggakan.
        // PPh minimum: walau rugi, tetap ada pajak minimum PPH_MIN_TARIF dari omzet (mencegah rugi buatan untuk menghindar pajak).
        const PPH_TARIF_KECIL = 0.15, PPH_TARIF_UMUM = 0.30, PPH_TARIF_BESAR = 0.35, PPH_BESAR_OMZET = 50e9;   // tarif SIMULASI game, dinaikkan dari 11% / 22% aslinya
        const PPH_MIN_TARIF = 0.005;                            // pajak minimum 0,5% dari peredaran bruto (kumulatif)
        const PPH_DAY_MS = 86400000, PPH_PERIODE_MS = 14 * PPH_DAY_MS;
        const PPH_JATUH_TEMPO_HARI = 2;                         // batas bayar: 2 hari game (±8 jam nyata) sejak tagihan terbit
        const PPH_DENDA_AWAL = 0.20;                            // denda 20% dari pokok, dipotong otomatis bersama pokok saat lewat tempo
        // pphBilled = pokok yang pernah ditagih, pphFineTotal = denda yang pernah dikenakan, pphPaid = total yang benar-benar terpotong/dibayar
        // (pokok + denda), pphUtang = bagian yang sudah lewat tempo tapi belum terbayar. Aturan tetap (dicek saat load & di server):
        //   pphBilled + pphFineTotal = pphPaid + (pokok tagihan belum jatuh tempo) + pphUtang
        let pphPaid = 0, pphBilled = 0, pphFineTotal = 0, pphUtang = 0, pphBills = [], nextPphGt = 0, topupTotal = 0, pphSid = '';
        // Tarif: omzet <= Rp 4,8 M pakai tarif kecil; Rp 4,8-50 M campuran (bagian laba setara Rp 4,8 M pertama tarif kecil, sisanya tarif umum); > Rp 50 M tarif umum.
        function calcPph(laba, omzet) {
            if (omzet <= 0) return 0;
            const minimum = Math.round(omzet * PPH_MIN_TARIF);
            let normal = 0;
            if (laba > 0) {
                if (omzet <= 4.8e9) normal = Math.round(laba * PPH_TARIF_KECIL);
                else if (omzet <= 50e9) { const a = laba * 4.8e9 / omzet; normal = Math.round(a * PPH_TARIF_KECIL + (laba - a) * PPH_TARIF_UMUM); }
                else normal = Math.round(laba * PPH_TARIF_BESAR); // omzet > Rp 50 M: lapisan atas 35%
            }
            return Math.max(normal, minimum);
        }
        const pphPokokBelum = () => pphBills.reduce((n, b) => n + b.amt, 0);
        // Gerbang blokir: dipanggil di awal aksi pembelian/ekspansi/pengiriman. true = diblokir (modal sudah ditampilkan).
        function pphBlokir() {
            if (!(pphUtang > 0)) return false;
            showModal('Diblokir: Tunggakan Pajak', `Perusahaan masih menunggak PPh Badan sebesar <b>${formatRupiah(pphUtang)}</b>. Pembelian, ekspansi, dan pengiriman diblokir sampai lunas.<br><br>Kas yang masuk otomatis dipakai melunasi tunggakan. Anda juga bisa menjual unit lewat Jual Cepat / Bursa, lalu bayar di tab Laporan.`, 'fa-landmark', 'red');
            return true;
        }
        // Dipanggil dari tickStock (tiap ~6 detik): terbitkan tagihan berkala, potong otomatis yang jatuh tempo, cicil tunggakan.
        function tickPph() {
            if (!currentAccount) return;
            const now = gameNow();
            if (!nextPphGt) nextPphGt = GAME_START + PPH_PERIODE_MS;
            let berubah = false;
            if (now >= nextPphGt) {
                const baru = Math.max(0, calcPph(totalIncome - totalExpense, totalIncome) - pphBilled);
                nextPphGt += PPH_PERIODE_MS * Math.max(1, Math.ceil((now - nextPphGt + 1) / PPH_PERIODE_MS)); // lompat ke batas periode berikutnya (aman kalau game lama ditinggal)
                if (baru > 0) {
                    pphBilled += baru;
                    pphBills.push({ id: Date.now(), amt: baru, gt: now, due: now + PPH_JATUH_TEMPO_HARI * PPH_DAY_MS });
                    addLog(`PAJAK: Tagihan PPh Badan periode 2 minggu ini terbit ${formatRupiah(baru)}. Bayar di tab Laporan dalam ${PPH_JATUH_TEMPO_HARI} hari game. Kalau lewat, kas dipotong otomatis + denda ${Math.round(PPH_DENDA_AWAL * 100)}%.`, 'warning');
                }
                berubah = true;
            }
            // Lewat jatuh tempo -> pokok + denda dipotong otomatis dari kas; kekurangannya jadi tunggakan.
            const jatuh = pphBills.filter(b => now > b.due);
            if (jatuh.length) {
                pphBills = pphBills.filter(b => now <= b.due);
                jatuh.forEach(b => {
                    const denda = Math.max(Math.round(b.fine || 0), Math.round(b.amt * PPH_DENDA_AWAL)), total = b.amt + denda;
                    const bayar = Math.min(Math.max(0, companyCash), total);
                    corpRepAdd(-6, 'PPh terlambat dibayar'); pphFineTotal += denda; companyCash -= bayar; pphPaid += bayar; pphUtang += total - bayar;
                    if (bayar > 0) addFinanceLog(`PPh Badan dipotong otomatis (pokok ${formatRupiah(b.amt)} + denda ${formatRupiah(denda)})`, -bayar);
                    addLog(`PAJAK: PPh Badan ${formatRupiah(b.amt)} lewat jatuh tempo. Denda ${Math.round(PPH_DENDA_AWAL * 100)}% = ${formatRupiah(denda)}. Dipotong otomatis dari kas ${formatRupiah(bayar)}${total > bayar ? `; kurang ${formatRupiah(total - bayar)} menjadi TUNGGAKAN (pembelian & pengiriman diblokir)` : ''}.`, 'warning');
                });
                berubah = true;
            }
            // Cicil tunggakan dari kas yang masuk.
            if (pphUtang > 0 && companyCash > 0) {
                const cicil = Math.min(companyCash, pphUtang);
                companyCash -= cicil; pphPaid += cicil; pphUtang -= cicil;
                addFinanceLog('Pelunasan tunggakan PPh Badan', -cicil);
                if (pphUtang <= 0) { pphUtang = 0; addLog('PAJAK: Tunggakan PPh Badan lunas. Pembelian & pengiriman dibuka kembali.', 'success'); }
                berubah = true;
            }
            if (berubah) { pphDirty = true; updateCashDisplay(); }
            pphAuditTick();
        }
        function renderFinance() {
            const box = document.getElementById('fin-report'); if (!box) return;
            const laba = totalIncome - totalExpense, tax = calcPph(laba, totalIncome), pokokBelum = pphPokokBelum(), kurang = pokokBelum + pphUtang;
            const row = (l, v, c, b) => `<div class="flex justify-between gap-2 ${b ? 'border-t border-gray-700 pt-1 font-bold' : ''}"><span class="text-gray-400 font-sans">${l}</span><span class="${c || 'text-gray-200'}">${v}</span></div>`;
            const neg = n => (n < 0 ? '(' + formatRupiah(-n) + ')' : formatRupiah(n));
            box.innerHTML = row('Pendapatan (peredaran bruto)', formatRupiah(totalIncome), 'text-emerald-400')
                + row('Beban pembelian bahan bakar', '(' + formatRupiah(bbmSpent) + ')', 'text-red-400')
                + row('Beban armada, SDM &amp; lainnya', '(' + formatRupiah(Math.max(0, totalExpense - bbmSpent)) + ')', 'text-red-400')
                + row('Laba (Rugi) Sebelum Pajak', neg(laba), laba >= 0 ? 'text-emerald-400' : 'text-red-400', true)
                + row('PPh Badan terutang', '(' + formatRupiah(tax) + ')', 'text-amber-300')
                + row('Laba (Rugi) Bersih', neg(laba - tax), laba - tax >= 0 ? 'text-emerald-400' : 'text-red-400', true)
                + row('Kas saat ini', formatRupiah(companyCash), 'text-teal-300', true)
                + row('Setoran modal tambahan (top up)', formatRupiah(topupTotal), 'text-sky-300');
            const estimasi = Math.max(0, tax - pphBilled), jt = pphBills.length ? Math.min(...pphBills.map(b => b.due)) : 0, now = gameNow();
            const sisaMs = nextPphGt ? Math.max(0, nextPphGt - now) : 0;
            document.getElementById('pph-box').innerHTML = row('Dasar pengenaan (laba sebelum pajak)', neg(laba))
                + row('Tarif efektif', laba > 0 ? (tax / laba * 100).toFixed(1).replace('.', ',') + '%' : (tax > 0 ? 'pajak minimum' : '-'))
                + row('PPh terutang (kumulatif)', formatRupiah(tax), 'text-amber-300')
                + row('Sudah dibayar / dipotong', formatRupiah(pphPaid), 'text-emerald-400')
                + row('Estimasi PPh periode berjalan (2 minggu)', formatRupiah(estimasi), 'text-gray-300')
                + row('Tagihan berikutnya terbit', nextPphGt ? 'dalam ' + Math.floor(sisaMs / PPH_DAY_MS) + ' hr ' + Math.floor((sisaMs % PPH_DAY_MS) / 3600000) + ' j game' : '-', 'text-gray-300')
                + row('Tagihan PPh belum jatuh tempo', formatRupiah(pokokBelum), pokokBelum ? 'text-amber-300' : 'text-gray-300')
                + (pphBills.length ? row('Dipotong otomatis', 'dalam ' + Math.max(0, Math.floor((jt - now) / 3600000)) + ' j game', 'text-gray-300') : '')
                + row('TUNGGAKAN (pembelian &amp; pengiriman diblokir)', formatRupiah(pphUtang), pphUtang ? 'text-red-400' : 'text-gray-300')
                + row('Total wajib bayar', formatRupiah(kurang), kurang ? 'text-red-400' : 'text-gray-300', true)
                + (pphAuditNote ? `<div class="mt-1 text-[10px] font-sans text-amber-400">${esc(pphAuditNote)}</div>` : '');
            document.getElementById('pph-pay').disabled = kurang <= 0;
            const co = currentAccount ? esc(currentAccount.company) : 'perusahaan';
            document.getElementById('pph-law').innerHTML = `<div class="font-bold text-gray-300">Dasar hukum untuk ${co} (WP badan dalam negeri berbentuk PT)</div>
                <div>&bull; <b>UU No. 7 Tahun 1983</b> tentang Pajak Penghasilan, sebagaimana telah diubah terakhir dengan <b>UU No. 7 Tahun 2021</b> tentang Harmonisasi Peraturan Perpajakan (UU HPP).</div>
                <div>&bull; Tarif umum aslinya: <b>Pasal 17 ayat (1) huruf b</b> = 22%. <b>Di game ini tarif dinaikkan</b> menjadi ${Math.round(PPH_TARIF_UMUM * 100)}% (umum), ${Math.round(PPH_TARIF_BESAR * 100)}% (peredaran bruto di atas Rp 50 miliar) dan ${Math.round(PPH_TARIF_KECIL * 100)}% (fasilitas omzet kecil).</div>
                <div>&bull; Fasilitas: <b>Pasal 31E ayat (1)</b> (UU No. 36 Tahun 2008) = fasilitas tarif lebih rendah atas penghasilan kena pajak dari bagian peredaran bruto sampai Rp 4,8 miliar, bagi peredaran bruto sampai Rp 50 miliar.</div>
                <div>&bull; <b>Pajak minimum (aturan game):</b> walau perusahaan rugi, PPh terutang tidak kurang dari ${(PPH_MIN_TARIF * 100).toFixed(1).replace('.', ',')}% peredaran bruto kumulatif.</div>
                <div>&bull; <b>Tagihan 2 mingguan, pemotongan otomatis &amp; tunggakan (aturan game):</b> PPh ditagih tiap 2 minggu game, jatuh tempo ${PPH_JATUH_TEMPO_HARI} hari game. Lewat tempo, kas dipotong otomatis sebesar pokok + denda ${Math.round(PPH_DENDA_AWAL * 100)}%. Kekurangan kas menjadi tunggakan: kas masuk dipotong sampai lunas dan pembelian, ekspansi, serta pengiriman diblokir.</div>
                <div>&bull; <b>Pajak Pengolahan (aturan game):</b> konversi BBL&rarr;BBM dikenai ${Math.round(ECO.pajakOlahBbm * 100)}% dan LPG Curah&rarr;Tabung ${Math.round(ECO.pajakOlahLpg * 100)}% dari nilai jual produk. Pajak ini dicatat sebagai pengeluaran, jadi ikut mengurangi laba kena PPh (bukan dipajaki dua kali).</div>
                <div>&bull; Pelaporan: <b>UU No. 6 Tahun 1983</b> tentang KUP (diubah UU No. 7 Tahun 2021) <b>Pasal 3 ayat (3) huruf b</b>: SPT Tahunan badan paling lambat 4 bulan setelah tahun pajak berakhir.</div>
                <div class="text-gray-500">Simulasi: laba = pendapatan &minus; beban, dihitung kumulatif sejak akun dibuat; tagihan 2 mingguan = PPh kumulatif dikurangi yang sudah ditagih. Bukan konsultasi pajak.</div>`;
        }
        function payPph() {
            const pokok = pphPokokBelum(), tung = pphUtang, total = pokok + tung;
            if (total <= 0) return showModal('Tidak Ada Tagihan', 'Belum ada tagihan PPh yang terbit. Tagihan baru terbit tiap 2 minggu game.', 'fa-circle-info', 'blue');
            if (companyCash < total) return showModal('Kas Tidak Cukup', `Butuh ${formatRupiah(total)} untuk melunasi PPh${tung > 0 ? ` (tagihan ${formatRupiah(pokok)} + tunggakan ${formatRupiah(tung)})` : ''}.`, 'fa-triangle-exclamation', 'red');
            companyCash -= total; pphPaid += total; pphBills = []; pphUtang = 0; pphDirty = true;
            if (tung <= 0 && pokok > 0) corpRepAdd(1.5, 'PPh dibayar tepat waktu');
            if (pokok > 0) addFinanceLog('Pembayaran PPh Badan', -pokok);
            if (tung > 0) addFinanceLog('Pelunasan tunggakan PPh Badan', -tung);
            updateCashDisplay();
            addLog(`PAJAK: PPh Badan ${formatRupiah(total)} dibayar lunas.`, 'success');
            pphSyncNow();
        }

        // ===== AUDIT PAJAK (anti-curang ringan) =====
        // Lapis 1 (lokal, pphAuditLocal): saat save dimuat, angka pajak dicek konsistensinya (aturan tetap di atas); yang janggal dikoreksi.
        // Lapis 2 (server, pphAuditServer/pphSyncNow): tiap "garis progres" (pphSid, ikut tersimpan di save) punya buku besar pajak di
        // Firestore (taxledger/{uid}/lines/{sid}) yang aturannya HANYA membolehkan angka naik (lihat firestore.rules). Saat save dimuat,
        // angka save dibandingkan dengan buku besar: jam game yang dimundurkan, income/expense/tagihan/pembayaran yang diturunkan, atau
        // save lama yang dipulihkan (rollback) dikoreksi otomatis. Keterbatasan: game jalan penuh di browser, jadi ini menyulitkan, bukan mustahil ditembus.
        let pphAuditDone = false, pphAuditBusy = false, pphDirty = false, pphSyncBusy = false, pphLastSync = 0, pphAuditNote = '';
        const PPH_SYNC_MS = 10 * 60 * 1000, PPH_CLOCK_TOL_MS = 15 * 60 * 1000;   // detak sinkron 10 menit; toleransi jam 15 menit nyata
        function pphNewSid() {
            const a = new Uint8Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
            return Array.from(a, x => x.toString(16).padStart(2, '0')).join('');
        }
        function pphAuditReset() { pphAuditDone = false; pphAuditNote = ''; pphLastSync = 0; }
        // Kembalikan daftar catatan koreksi (kosong = save bersih).
        function pphAuditLocal() {
            const notes = [], ok = v => typeof v === 'number' && isFinite(v);
            if (!ok(companyCash)) { companyCash = 0; notes.push('kas tidak valid direset'); }
            [['totalIncome', 'pendapatan'], ['totalExpense', 'beban'], ['pphPaid', 'pembayaran PPh'], ['pphBilled', 'tagihan PPh'], ['pphFineTotal', 'denda PPh'], ['pphUtang', 'tunggakan PPh']].forEach(([n, l]) => {
                const v = ({ totalIncome, totalExpense, pphPaid, pphBilled, pphFineTotal, pphUtang })[n];
                if (!ok(v) || v < 0) { notes.push(l + ' tidak valid direset'); ({ totalIncome: () => totalIncome = 0, totalExpense: () => totalExpense = 0, pphPaid: () => pphPaid = 0, pphBilled: () => pphBilled = 0, pphFineTotal: () => pphFineTotal = 0, pphUtang: () => pphUtang = 0 })[n](); }
            });
            pphBills = (Array.isArray(pphBills) ? pphBills : []).filter(b => b && ok(b.amt) && b.amt > 0 && ok(b.due)).map(b => ({ id: b.id, amt: Math.round(b.amt), gt: b.gt || 0, due: b.due, fine: b.fine || 0 }));
            // Aturan tetap: pphBilled + pphFineTotal = pphPaid + tagihan belum jatuh tempo + tunggakan
            const expected = Math.max(0, pphBilled + pphFineTotal - pphPaid);
            let actual = pphPokokBelum() + pphUtang;
            if (actual > expected + 1) {                       // kelebihan (mis. tagihan yang sebenarnya sudah dibayar): buang tunggakan lalu tagihan terbaru
                let lebih = actual - expected;
                const dU = Math.min(pphUtang, lebih); pphUtang -= dU; lebih -= dU;
                pphBills.sort((x, y) => y.due - x.due);
                while (lebih > 1 && pphBills.length) { const b = pphBills[0]; if (b.amt <= lebih + 1) { lebih -= b.amt; pphBills.shift(); } else { b.amt -= lebih; lebih = 0; } }
                pphBills.sort((x, y) => x.due - y.due);
                notes.push('tagihan PPh yang sudah lunas dibersihkan');
                actual = pphPokokBelum() + pphUtang;
            }
            if (actual < expected - 1) {                        // kekurangan (tagihan/tunggakan dihapus lewat edit): jadi tunggakan
                pphUtang += Math.round(expected - actual);
                notes.push('tagihan PPh yang hilang dikembalikan sebagai tunggakan ' + formatRupiah(Math.round(expected - actual)));
            }
            if (nextPphGt && nextPphGt > gameNow() + PPH_PERIODE_MS) { nextPphGt = gameNow() + PPH_PERIODE_MS; notes.push('jadwal tagihan PPh dikoreksi'); }
            return notes;
        }
        async function pphAuditServer() {
            if (pphAuditDone || pphAuditBusy) return;
            if (!currentAccount || !window.fb || !fb.taxLoad || navigator.onLine === false) return;
            pphAuditBusy = true;
            try {
                if (!pphSid) pphSid = pphNewSid();
                const L = await fb.taxLoad(currentAccount.id, pphSid), notes = [];
                if (L) {
                    const num = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
                    if (num(L.gt) - gameNow() > PPH_CLOCK_TOL_MS * GAME_SPEED) { gameElapsed += (num(L.gt) - gameNow()) / GAME_SPEED; notes.push('jam game dimundurkan, dipulihkan'); }
                    if (num(L.income) > totalIncome) { totalIncome = num(L.income); notes.push('pendapatan diturunkan, dipulihkan'); }
                    if (num(L.expense) > totalExpense) { totalExpense = num(L.expense); }
                    if (num(L.billed) > pphBilled) { pphBilled = num(L.billed); notes.push('tagihan PPh diturunkan, dipulihkan'); }
                    if (num(L.fine) > pphFineTotal) pphFineTotal = num(L.fine);
                    const selisih = Math.max(0, num(L.paid) - pphPaid);   // pembayaran yang tercatat di server tapi hilang dari save ini (rollback)
                    if (selisih > 0) pphPaid = num(L.paid);
                    notes.push(...pphAuditLocal());
                    if (selisih > 0) {                                     // tarik ulang kas yang "dikembalikan" oleh rollback
                        const tarik = Math.min(Math.max(0, companyCash), selisih);
                        companyCash -= tarik;
                        if (selisih > tarik) { pphBilled += selisih - tarik; pphUtang += selisih - tarik; }
                        notes.push('save lama terdeteksi (rollback), pembayaran PPh ' + formatRupiah(selisih) + ' ditarik kembali dari kas');
                    }
                }
                pphAuditDone = true; pphDirty = true;
                if (notes.length) { pphAuditNote = 'Audit pajak: ' + notes.join('; '); addLog('AUDIT PAJAK: ' + notes.join('; ') + '.', 'warning'); updateCashDisplay(); }
                await pphSyncNow();
            } catch (e) { console.warn('Audit pajak server gagal (dicoba lagi nanti):', e); }
            finally { pphAuditBusy = false; }
        }
        async function pphSyncNow() {
            if (!currentAccount || !window.fb || !fb.taxSync || pphSyncBusy || !pphSid || !pphAuditDone || navigator.onLine === false) return;
            pphSyncBusy = true;
            try {
                await fb.taxSync(currentAccount.id, pphSid, { billed: pphBilled, fine: pphFineTotal, paid: pphPaid, income: Math.round(totalIncome), expense: Math.round(totalExpense), gt: Math.round(gameNow()) });
                pphDirty = false; pphLastSync = Date.now();
            } catch (e) { console.warn('Sinkron buku besar pajak gagal:', e); pphLastSync = Date.now() - PPH_SYNC_MS + 60000; }
            finally { pphSyncBusy = false; }
        }
        // Dipanggil tiap tickPph: audit server kalau belum berhasil; sinkron bila ada perubahan pajak atau sudah 10 menit sejak sinkron terakhir.
        function pphAuditTick() {
            if (!pphAuditDone) { pphAuditServer(); return; }
            if (pphDirty || Date.now() - pphLastSync > PPH_SYNC_MS) pphSyncNow();
        }

        let financeEntries = [];
        function addFinanceLog(desc, amount) {
            financeEntries.push({ desc, amount }); if (financeEntries.length > 80) financeEntries.shift();
            const container = document.getElementById('finance-history-log');
            const div = document.createElement('div');
            div.className = 'p-2 bg-gray-900 rounded border border-gray-800 flex justify-between items-center';

            const isIncome = amount > 0;
            div.innerHTML = `
                <span class="text-gray-300">${desc}</span>
                <span class="${isIncome ? 'text-emerald-400' : 'text-red-400'} font-bold font-mono">
                    ${isIncome ? '+' : ''}${formatRupiah(amount)}
                </span>
            `;
            container.prepend(div);
        }

        // Tab yang tampil menggantikan peta (Peta & Dealer tetap tampil inline di sidebar)
        const POPUP_TABS = ['tab-kilang', 'tab-hulu', 'tab-dealer', 'tab-delivery', 'tab-lpg', 'tab-kapal', 'tab-fleet', 'tab-bursa', 'tab-drivers', 'tab-partnership', 'tab-finance', 'tab-orders', 'tab-kontrak', 'tab-leaderboard'];

        let currentTabId = 'tab-map-view';
        function switchTab(tabId) {
            // Listener leaderboard & daftar lapak Bursa (koleksi bersama, broadcast ke semua pemain online -
            // paling boros kuota baca Firestore gratis) hanya dihidupkan selagi tab terkait benar-benar
            // dibuka, dan dimatikan begitu pindah ke tab lain.
            if (currentTabId === 'tab-leaderboard' && tabId !== 'tab-leaderboard') stopLeaderboardListener();
            if (currentTabId === 'tab-bursa' && tabId !== 'tab-bursa') stopBursaListingsListener();
            currentTabId = tabId;

            document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab-btn').forEach(el => {
                el.classList.remove('text-emerald-300', 'bg-emerald-500/10', 'border-emerald-500/25', 'shadow-inner');
                el.classList.add('text-gray-400');
            });

            // kembalikan konten panel sebelumnya (jika ada) ke tempat asal di sidebar
            const panel = document.getElementById('tab-content-panel');
            const popupBody = document.getElementById('tab-popup-body');
            while (popupBody.firstChild) panel.appendChild(popupBody.firstChild);

            // Tab Peta tidak punya konten sendiri (peta selalu tampil penuh), jadi target bisa null
            const target = document.getElementById(tabId);
            if (target) target.classList.remove('hidden');
            if (tabId === 'tab-leaderboard') { startLeaderboardListener(); renderLeaderboard(); }
            if (tabId === 'tab-orders') renderOrders();
            if (tabId === 'tab-kontrak') kpRender(true);
            if (tabId === 'tab-delivery' || tabId === 'tab-lpg') populateSpbuDropdowns(document.getElementById('delivery-region-filter') ? document.getElementById('delivery-region-filter').value : 'ALL');
            if (tabId === 'tab-kapal') populateTransferKapal();
            if (tabId === 'tab-hulu' && typeof huluRender === 'function') huluRender();
            if (tabId === 'tab-bursa') { startBursaListingsListener(); renderBursa(); }
            const activeBtn = document.getElementById('btn-' + tabId);
            // Tombol yang bukan bagian nav sidebar (mis. Peringkat di header) sengaja tidak diberi class
            // 'tab-btn', jadi gaya khasnya (gradient kuning trofi) tidak ditimpa warna aktif/nonaktif sidebar ini.
            if (activeBtn.classList.contains('tab-btn')) {
                activeBtn.classList.add('text-emerald-300', 'bg-emerald-500/10', 'border-emerald-500/25', 'shadow-inner');
                activeBtn.classList.remove('text-gray-400');
            }

            const mapViewWrap = document.getElementById('map-view-wrap');
            const tabPanelInline = document.getElementById('tab-panel-inline');
            const leftAside = document.getElementById('left-aside');

            if (POPUP_TABS.includes(tabId)) {
                // Tampilkan konten tab menggantikan peta (bukan overlay) - sidebar tetap bisa diklik
                const icon = activeBtn.querySelector('i'), label = [...activeBtn.querySelectorAll('span')].find(s => !s.querySelector('i') && s.textContent.trim() && !s.id);
                document.getElementById('tab-panel-title').innerHTML = (icon ? icon.outerHTML + ' ' : '') + (label ? label.textContent : '');
                if (target) popupBody.appendChild(target);
                mapViewWrap.classList.add('hidden');
                tabPanelInline.classList.remove('hidden');
                // Panel konten sidebar kiri jadi kosong (isinya pindah ke atas) -> sembunyikan & susutkan aside
                panel.classList.add('hidden');
                if (leftAside) leftAside.classList.add('nav-only');
            } else {
                // Peta: tampilkan peta lagi (panel konten sidebar tidak dipakai lagi)
                mapViewWrap.classList.remove('hidden');
                tabPanelInline.classList.add('hidden');
                // Panel konten sidebar tetap tersembunyi & aside tetap ringkas: peta memakai seluruh ruang sisa
                panel.classList.add('hidden');
                if (leftAside) leftAside.classList.add('nav-only');
                setTimeout(() => { if (window.map) map.invalidateSize(); }, 60);
            }
        }

        function closeTabPopup() { switchTab('tab-map-view'); }

        const map = L.map('map').setView([-2.5, 117.5], 5);

        // OpenStreetMap standar: gratis, tanpa API key
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        function initSpbuDatabase() {
            // Tiap kota kini mulai dengan 3 SPBU AKTIF (bukan cuma 1): 1 unit COCO milik perusahaan
            // + 2 unit DODO yang sudah otomatis disetujui sejak awal permainan. Jenis layanannya
            // sengaja dicampur (has_lpg berselang-seling per rIndex+sIndex) supaya tiap kota punya
            // kombinasi SPBU + Outlet LPG dan SPBU non-LPG, bukan seragam satu jenis saja.
            // Berlaku untuk SELURUH kota (rawSpbuData yang manual maupun hasil generate WILAYAH).
            const START_APPROVED_PER_KOTA = 3;
            rawSpbuData.forEach((region, rIndex) => {
                const pv = region.provinsi || 'Jawa Timur';

                region.list_spbu.forEach((item, sIndex) => {
                    // Data baru punya field jenis: 'SPBU' (BBM saja), 'SPBU+LPG' (BBM + LPG), 'SPPBE' (outlet LPG saja). Wilayah lama (tanpa jenis) tetap selang-seling.
                    const isLpgAvailable = item.jenis ? item.jenis !== 'SPBU' : ((rIndex + sIndex) % 2 === 0);
                    const isStartApproved = sIndex < START_APPROVED_PER_KOTA;
                    if (sIndex === 0) item = { ...item, tipe: 'COCO' }; else item = { ...item, tipe: 'DODO' };

                    const spbu = {
                        kode: item.kode,
                        nama: item.nama,
                        region: region.kabupaten_kota,
                        provinsi: pv,
                        lat: item.lat,
                        lon: item.lon,
                        tipe: item.tipe,
                        has_lpg: isLpgAvailable,
                        jenis: item.jenis || (isLpgAvailable ? 'SPBU+LPG' : 'SPBU'),
                        kecamatan: item.kecamatan || '',
                        is_approved: isStartApproved
                    };
                    // 2 slot DODO pertama yang di-auto-approve butuh objek mitra langsung (sama seperti
                    // hasil approveMitra manual), supaya iuran bulanan & status tunggakan langsung berjalan.
                    if (isStartApproved && spbu.tipe === 'DODO') spbu.mitra = newMitra(spbu);

                    loadedSpbuList.push(spbu);
                });
            });

            recomputeWilayah();
            renderRefineries();
            renderSpbuOnMap();
            populateSpbuDropdowns();
            populateTruckDropdowns();
            populateCrewDropdowns();
            renderInvestorTab();
            renderFleetDashboard();
            renderDriversDashboard();
        }

