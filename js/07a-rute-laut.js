        // ===== SISTEM RUTE LAUT (KHUSUS KAPAL) =====
        // Terpisah total dari jalan darat (OSRM) DAN dari garis pipa bawah laut (huluPath di 11-hulu-upstream.js).
        // Kapal hanya berlayar di LAJUR PELAYARAN (graf titik air) seperti alur pelayaran sungguhan:
        //   dermaga depo -> alur masuk -> lajur utama -> alur masuk -> dermaga tujuan / anjungan.
        // Karena hanya berjalan di titik air yang sudah ditetapkan, kapal tidak pernah melewati daratan.
        // Rute dihaluskan (fillet lengkung di tiap belokan) & dijalankan sebagai SATU pelayaran utuh
        // dengan profil kecepatan trapesium (pelan saat lepas/sandar, cruise di tengah) -> gerak mulus.
        // Koordinat = perkiraan; ubah SEA_NODES / SEA_LINKS di bawah kalau ingin menggeser lajur.
        // Nyalakan tombol "Lajur" di pojok kiri-bawah peta (atau seaDebug(true)) untuk melihat & memeriksa lajur.
        const SEA_NODES = {
            // Jawa (pantai utara)
            JKb: [-6.075, 106.90], JKg: [-5.95, 106.95], J1: [-5.85, 107.60], J2: [-6.10, 109.00], J3: [-6.30, 110.00],
            J4: [-6.05, 110.90], J5: [-6.35, 111.80], J6: [-6.55, 112.55],
            SMb: [-6.90, 110.43], SMg: [-6.55, 110.43], TBb: [-6.75, 111.96],
            SB1: [-6.80, 112.68], SB2: [-7.02, 112.68], SBb: [-7.19, 112.72],
            // Utara Madura -> timur -> anjungan (jalur KAPAL; pipa tetap pakai huluPath sendiri)
            K1: [-6.55, 113.45], K2: [-6.62, 114.85], K3: [-7.35, 114.80],
            AN_alpha: [-7.39985, 114.02714], AN_bravo: [-7.47, 114.10], AN_gamma: [-7.34, 113.96],
            // Selat Bali & Bali
            BS1: [-7.80, 114.70], BS2: [-8.00, 114.60], BS3: [-8.06, 114.48], KTb: [-8.125, 114.415],
            L1: [-7.85, 115.75], L2: [-8.35, 115.88], L3: [-8.42, 115.80], MGb: [-8.535, 115.545],
            // Laut Jawa timur & Makassar
            E1: [-6.30, 115.20], E2: [-6.30, 117.00], E3: [-6.05, 118.65], MK1: [-5.50, 118.90], MK2: [-5.30, 119.30], MKb: [-5.125, 119.40],
            // Selat Makassar
            MS1: [-4.20, 117.90], MS2: [-2.60, 118.05], MS3: [-1.35, 117.55], BPb: [-1.285, 116.84],
            MMg: [-2.72, 118.60], MMb: [-2.68, 118.865], DG1: [-0.55, 118.40], DGb: [-0.665, 119.72],
            // Banjarmasin (masuk alur Barito) & Pontianak (alur Kapuas)
            BJ1: [-4.90, 114.90], BJ2: [-4.45, 114.55], BJ3: [-4.10, 114.48], BJ4: [-3.56, 114.54], BJb: [-3.33, 114.575],
            PT1: [-4.20, 108.60], PT2: [-2.75, 108.55], PT3: [-1.20, 108.35], PT4: [-0.15, 108.85], PTb: [-0.03, 109.30],
            // Utara: Tarakan & Bitung
            N1: [0.10, 119.10], N2: [1.30, 119.60], N3: [2.30, 121.50], N4: [2.25, 124.40], N5: [2.15, 125.45], BTg: [1.60, 125.35], BTb: [1.44, 125.21],
            TK1: [3.00, 119.00], TK2: [3.05, 118.35], TK3: [3.10, 117.78], TKb: [3.32, 117.58]
        };
        const SEA_LINKS = ('JKb-JKg JKg-J1 J1-J2 J2-J3 J3-J4 J4-J5 J5-J6 SMb-SMg SMg-J3 TBb-J5 TBb-J6 J6-SB1 SB1-SB2 SB2-SBb ' +
            'J6-K1 K1-K2 K2-K3 K3-AN_alpha AN_alpha-AN_bravo AN_alpha-AN_gamma K3-BS1 BS1-BS2 BS2-BS3 BS3-KTb K3-L1 L1-L2 L2-L3 L3-MGb ' +
            'K1-E1 E1-E2 E2-E3 E3-MK1 MK1-MK2 MK2-MKb MK1-MS1 MS1-MS2 MS2-MS3 MS3-BPb MS2-MMg MMg-MMb MS3-DG1 DG1-DGb ' +
            'E1-BJ1 BJ1-BJ2 BJ2-BJ3 BJ3-BJ4 BJ4-BJb J1-PT1 PT1-PT2 PT2-PT3 PT3-PT4 PT4-PTb ' +
            'DG1-N1 N1-N2 N2-N3 N3-N4 N4-N5 N5-BTg BTg-BTb N2-TK1 TK1-TK2 TK2-TK3 TK3-TKb').split(' ').map(s => s.split('-'));
        const seaLL = id => ({ lat: SEA_NODES[id][0], lon: SEA_NODES[id][1] });
        const SEA_ADJ = (() => { const g = {}; SEA_LINKS.forEach(([a, b]) => { const w = distKm(seaLL(a), seaLL(b)); (g[a] = g[a] || []).push([b, w]); (g[b] = g[b] || []).push([a, w]); }); return g; })();
        // Dermaga = field `berth` pada entitas (id node di SEA_NODES). null/kosong = tidak punya dermaga.
        // Entitas tanpa field `berth` sama sekali (tidak seharusnya terjadi) jatuh ke titik lajur terdekat + peringatan di konsol.
        function seaNodeOf(e) {
            if (e && e.berth) return e.berth;
            if (e && e.berth === null) return null;
            console.warn('[rute laut] entitas tanpa field berth:', e && e.nama);
            return Object.keys(SEA_NODES).reduce((b, k) => distKm(e, seaLL(k)) < distKm(e, seaLL(b)) ? k : b);
        }
        // Pemeriksa data: semua berth harus ada di SEA_NODES dan terhubung ke jaringan lajur (dipanggil saat muat).
        function seaValidateBerths(list) {
            (list || []).forEach(e => {
                if (!e.berth) return;
                if (!SEA_NODES[e.berth]) console.error('[rute laut] berth tidak dikenal:', e.nama, e.berth);
                else if (!SEA_ADJ[e.berth]) console.error('[rute laut] berth tidak terhubung ke SEA_LINKS:', e.nama, e.berth);
            });
        }
        // Dijkstra di graf lajur (kecil, cukup untuk ~90 titik).
        function seaShortest(a, b) {
            const dist = { [a]: 0 }, prev = {}, todo = new Set([a]);
            while (todo.size) {
                let u = null; todo.forEach(k => { if (u === null || dist[k] < dist[u]) u = k; });
                todo.delete(u); if (u === b) break;
                (SEA_ADJ[u] || []).forEach(([v, w]) => { if (dist[v] === undefined || dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; todo.add(v); } });
            }
            if (dist[b] === undefined) return null;
            const ids = [b]; while (ids[0] !== a) ids.unshift(prev[ids[0]]);
            return ids;
        }
        // Haluskan belokan: tiap titik sudut diganti kurva Bezier (fillet) dengan radius adaptif
        // (maks 30% panjang ruas & 25 km) - lengkung lembut tanpa banting stir & tidak menyimpang jauh dari lajur.
        function seaSmooth(P, R = 25) {
            if (P.length < 3) return P.slice();
            const out = [P[0]], km = (a, b) => distKm({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] });
            for (let i = 1; i < P.length - 1; i++) {
                const p = P[i], a = P[i - 1], b = P[i + 1], la = km(a, p) || 1e-6, lb = km(p, b) || 1e-6;
                const r = Math.min(0.3 * la, 0.3 * lb, R), ta = r / la, tb = r / lb;
                const s = [p[0] + (a[0] - p[0]) * ta, p[1] + (a[1] - p[1]) * ta], e = [p[0] + (b[0] - p[0]) * tb, p[1] + (b[1] - p[1]) * tb];
                for (let k = 0; k <= 12; k++) { const t = k / 12, u = 1 - t; out.push([u * u * s[0] + 2 * u * t * p[0] + t * t * e[0], u * u * s[1] + 2 * u * t * p[1] + t * t * e[1]]); }
            }
            out.push(P[P.length - 1]); return out;
        }
        // Sampel ulang rapat (±1.5 km) supaya interpolasi posisi kapal halus.
        function seaResample(pts, step = 1.5) {
            const out = [pts[0]];
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(distKm({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }) / step));
                for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
            }
            return out;
        }
        const seaRouteCache = new Map();
        // Rute laut lengkap dari entitas A ke B: {pts, km, ids}. Mengembalikan null bila tak ada lajur.
        function seaRoute(from, to) {
            const na = seaNodeOf(from), nb = seaNodeOf(to);
            if (!na || !nb) return null; // salah satu ujung tidak punya dermaga
            const key = na + '>' + nb;
            if (seaRouteCache.has(key)) return seaRouteCache.get(key);
            const ids = na === nb ? [na] : seaShortest(na, nb);
            if (!ids) return null;
            const raw = ids.map(i => SEA_NODES[i]);
            if (raw.length < 2) raw.push([raw[0][0] + 1e-4, raw[0][1] + 1e-4]);
            const pts = seaResample(seaSmooth(raw));
            let km = 0; for (let i = 1; i < pts.length; i++) km += distKm({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] });
            const res = { pts, km, ids };
            seaRouteCache.set(key, res); seaRouteCache.set(nb + '>' + na, { pts: pts.slice().reverse(), km, ids: ids.slice().reverse() });
            return res;
        }
        seaValidateBerths(refineryData);
        // Tambah/ubah titik dermaga di tengah permainan (dipakai anjungan hasil tender blok, lihat 10a-tender-blok.js).
        // Dermaga disambungkan ke satu titik lajur terdekat; id yang sama dipakai ulang (aman saat muat save lain).
        function seaAddNode(id, lat, lon, linkTo) {
            if (!SEA_NODES[linkTo]) { console.error('[rute laut] titik lajur tidak dikenal:', linkTo); return; }
            if (SEA_ADJ[id]) { SEA_ADJ[id].forEach(([v]) => { SEA_ADJ[v] = (SEA_ADJ[v] || []).filter(([x]) => x !== id); }); delete SEA_ADJ[id]; }
            for (let i = SEA_LINKS.length - 1; i >= 0; i--) if (SEA_LINKS[i][0] === id || SEA_LINKS[i][1] === id) SEA_LINKS.splice(i, 1);
            SEA_NODES[id] = [lat, lon]; SEA_LINKS.push([id, linkTo]);
            const w = distKm(seaLL(id), seaLL(linkTo));
            (SEA_ADJ[id] = SEA_ADJ[id] || []).push([linkTo, w]); (SEA_ADJ[linkTo] = SEA_ADJ[linkTo] || []).push([id, w]);
            seaRouteCache.clear();
        }
        const seaKm = (a, b) => { const r = seaRoute(a, b); return r ? r.km : distKm(a, b); };
        // Satu pelayaran utuh (tanpa berhenti di tiap titik) - dipakai kapal tanker & kapal anjungan.
        // opts.speedKmh = kecepatan jelajah kapal ini (turun bila mesin aus, lihat shipSpeedKmh di 07b-kapal-dermaga.js).
        // Hasil menyertakan stallMs = total waktu tertahan cuaca buruk (dipakai untuk BBM mesin menyala saat diam).
        async function shipVoyage(from, to, meta, fit, opts) {
            const r = seaRoute(from, to);
            if (!r) throw new Error('Tidak ada lajur laut dari ' + from.nama + ' ke ' + to.nama);
            const spd = (opts && opts.speedKmh) || AVG_SHIP_SPEED_KMH;
            const dur = (r.km / spd) * (3600000 / GAME_SPEED);
            const t = await runVehicleLeg(r.pts, dur, { ...meta, vehicle: 'kapal', speedKmh: spd, ease: true }, fit);
            return { km: r.km, dur, stallMs: (t && t.stall) || 0 };
        }
        // Profil kecepatan trapesium: akselerasi 6% awal, cruise, deselerasi 8% akhir. f 0..1 -> jarak 0..1.
        function seaEase(f) {
            const a = 0.06, b = 0.08, v = 1 / (1 - (a + b) / 2);
            if (f <= 0) return 0; if (f >= 1) return 1;
            return f < a ? v * f * f / (2 * a) : f > 1 - b ? 1 - v * (1 - f) * (1 - f) / (2 * b) : v * a / 2 + v * (f - a);
        }

        // ---- Cuaca buruk: kapal yang sedang berlayar berhenti di posisinya sampai cuaca membaik ----
        // Jenis cuaca yang menahan kapal (sama dengan aturan "kapal dilarang berlayar" di 11-hulu-upstream.js).
        // Ubah gelombang ke false kalau hanya badai yang boleh menghentikan kapal di tengah laut.
        const SEA_HALT_KINDS = { badai: true, gelombang: true };
        // Cuaca buruk berlaku per ZONA (lihat HULU_ZONES di 11-hulu-upstream.js): kapal hanya tertahan bila posisinya (ll = {lat,lng|lon}) di dalam zona.
        // Tanpa ll = "ada cuaca buruk di suatu tempat".
        const seaHalted = ll => typeof hulu !== 'undefined' && !!hulu.storm && !!hulu.storm.kind && !!SEA_HALT_KINDS[hulu.storm.kind] &&
            (!ll || typeof huluInStorm !== 'function' || huluInStorm(ll.lat, ll.lng != null ? ll.lng : ll.lon));
        const seaStormLabel = () => (typeof HULU_STORM !== 'undefined' && HULU_STORM[hulu.storm.kind] ? HULU_STORM[hulu.storm.kind].label : 'Cuaca buruk');

        // ---- Overlay pemeriksa lajur (tombol "Lajur" di peta) ----
        let seaDebugLayer = null;
        function seaDebug(on) {
            if (typeof map === 'undefined' || !map) return;
            if (seaDebugLayer) { map.removeLayer(seaDebugLayer); seaDebugLayer = null; }
            if (!on) return;
            seaDebugLayer = L.layerGroup().addTo(map);
            SEA_LINKS.forEach(([a, b]) => L.polyline([SEA_NODES[a], SEA_NODES[b]], { color: '#22d3ee', weight: 2, opacity: .8, dashArray: '4 6' }).addTo(seaDebugLayer));
            Object.entries(SEA_NODES).forEach(([k, p]) => L.circleMarker(p, { radius: /b$|^AN_/.test(k) ? 5 : 3, color: '#0891b2', fillColor: /b$|^AN_/.test(k) ? '#f59e0b' : '#67e8f9', fillOpacity: 1, weight: 1 })
                .bindTooltip(k + (/b$|^AN_/.test(k) ? ' (dermaga)' : ''), { direction: 'top' }).addTo(seaDebugLayer));
        }
        (function seaDebugButton() {
            const t = setInterval(() => {
                if (typeof map === 'undefined' || !map || typeof L === 'undefined') return;
                clearInterval(t);
                const c = L.control({ position: 'bottomleft' });
                c.onAdd = () => { const d = L.DomUtil.create('div'); d.innerHTML = '<button style="background:#0e7490;color:#fff;border:0;border-radius:8px;padding:4px 10px;font:700 11px sans-serif;cursor:pointer">⚓ Lajur</button>';
                    let on = false; L.DomEvent.disableClickPropagation(d); d.firstChild.onclick = () => { on = !on; seaDebug(on); d.firstChild.style.opacity = on ? 1 : .7; }; d.firstChild.style.opacity = .7; return d; };
                c.addTo(map);
            }, 500);
        })();
