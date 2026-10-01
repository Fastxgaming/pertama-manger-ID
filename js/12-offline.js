        // ===== INDIKATOR OFFLINE + PERINGATAN REFRESH =====
        // Game jalan penuh di browser (jam, stok, pesanan, dispatcher, perjalanan armada), jadi WiFi mati TIDAK menghentikannya.
        // Yang tertunda saat offline: Save Cloud, bursa P2P, leaderboard, top-up, pembelian Pass, rute baru (jadi rute perkiraan).
        // File ini hanya memberi tahu pemain: lencana kecil di atas layar + catatan di Log, dan konfirmasi sebelum refresh/tutup tab
        // ketika offline (halaman + peta + Firebase dimuat dari internet, jadi refresh saat offline bisa gagal dibuka).
        (function () {
            const badge = document.createElement('div');
            badge.id = 'net-badge';
            document.body.appendChild(badge);
            let okTimer = null, wasOffline = navigator.onLine === false;

            function show(html, cls, autoHideMs) {
                clearTimeout(okTimer);
                badge.className = cls; badge.innerHTML = html;
                badge.style.display = 'flex';
                if (autoHideMs) okTimer = setTimeout(() => { badge.style.display = 'none'; }, autoHideMs);
            }
            function log(msg, type) { try { if (typeof addLog === 'function' && typeof currentAccount !== 'undefined' && currentAccount) addLog(msg, type); } catch (e) {} }

            function goOffline() {
                wasOffline = true;
                show('<i class="fa-solid fa-triangle-exclamation"></i><b>OFFLINE</b><span>game tetap jalan &middot; jangan refresh</span>', 'net-off');
                log('JARINGAN: Koneksi internet terputus. Game & dispatcher otomatis tetap berjalan; Save Cloud, bursa, top-up & rute baru ditunda. Jangan refresh/tutup tab sampai online lagi (save lokal jalan tiap 30 detik).', 'warning');
            }
            function goOnline() {
                if (!wasOffline) return;
                wasOffline = false;
                show('<i class="fa-solid fa-wifi"></i><b>ONLINE kembali</b><span>sinkron ulang otomatis</span>', 'net-on', 4000);
                log('JARINGAN: Koneksi internet pulih. Data online (bursa, leaderboard, Pass) tersinkron ulang otomatis. Tekan Save Cloud untuk mengunggah progres.', 'success');
            }

            window.addEventListener('offline', goOffline);
            window.addEventListener('online', goOnline);
            if (navigator.onLine === false) goOffline();

            // Refresh / tutup tab saat offline: minta konfirmasi. (saveGame sudah dipanggil oleh beforeunload di 10-ui-final.js,
            // jadi progres lokal aman; yang dicegah adalah tab yang tidak bisa dibuka lagi karena tidak ada internet.)
            window.addEventListener('beforeunload', e => {
                if (navigator.onLine === false && typeof currentAccount !== 'undefined' && currentAccount) {
                    e.preventDefault();
                    e.returnValue = 'Sedang offline - halaman mungkin tidak bisa dimuat ulang. Progres tetap tersimpan lokal.';
                    return e.returnValue;
                }
            });
        })();
