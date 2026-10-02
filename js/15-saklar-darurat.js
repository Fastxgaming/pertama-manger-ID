        // ===== SAKLAR DARURAT (v2.1) =====
        // Satu dokumen Firestore: config/flags = { maintenance, bursaOff, topupOff, message, by, updated }.
        //   bursaOff    -> Bursa P2P mati (pasang iklan, beli, klaim pembayaran). Batalkan iklan tetap boleh.
        //   topupOff    -> klaim top up dari admin mati.
        //   maintenance -> seluruh game maintenance: pemain non-owner tertutup layar maintenance & penulisan datanya ditolak server.
        // Hanya owner (admins/{uid}.role == 'owner') yang bisa menulis. Penegakan sebenarnya ada di firestore.rules (fungsi
        // playable/bursaOpen/topupOpen) - kode di sini hanya memantau real-time, menutup UI, dan menampilkan panel owner.
        // Dokumen belum ada / listener gagal = semua normal (fail-open di klien; server tetap yang memutuskan).
        let gameFlags = { maintenance: false, bursaOff: false, topupOff: false, message: '', by: '', updated: 0 };
        let flagsUnsub = null, flagsSeenOnce = false, flagsAdminChecked = false, flagsBusy = false;

        const maintenanceBlocksMe = () => !!gameFlags.maintenance && !isOwnerUser;   // owner dikecualikan dari maintenance (sama seperti di Rules)
        const bursaBlocked = () => maintenanceBlocksMe() || !!gameFlags.bursaOff;
        const topupBlocked = () => maintenanceBlocksMe() || !!gameFlags.topupOff;
        const bursaClosedText = () => maintenanceBlocksMe()
            ? 'Game sedang maintenance. Bursa P2P dibuka lagi setelah maintenance selesai.'
            : 'Bursa P2P sedang dinonaktifkan sementara oleh admin. Pasang iklan, beli, dan klaim pembayaran ditutup sampai dibuka kembali. Iklan yang sudah terpasang masih bisa dibatalkan.';
        const topupClosedText = () => 'Klaim top up sedang dinonaktifkan sementara oleh admin. Kirimanmu tetap tersimpan dan tidak hilang; klaim lagi setelah dibuka kembali.';

        function startFlagsListener() {
            if (flagsUnsub || !window.fb || !currentAccount) return;
            flagsUnsub = fb.listenFlags(f => {
                f = f || {};
                const prev = gameFlags;
                gameFlags = {
                    maintenance: f.maintenance === true, bursaOff: f.bursaOff === true, topupOff: f.topupOff === true,
                    message: typeof f.message === 'string' ? f.message : '', by: f.by || '',
                    updated: f.updated && f.updated.seconds ? f.updated.seconds * 1000 : 0
                };
                if (flagsSeenOnce) announceFlagChanges(prev, gameFlags);
                flagsSeenOnce = true;
                applyFlagsUi();
            });
        }
        function stopFlagsListener() {
            if (flagsUnsub) { flagsUnsub(); flagsUnsub = null; }
            flagsSeenOnce = false; flagsAdminChecked = false;
            gameFlags = { maintenance: false, bursaOff: false, topupOff: false, message: '', by: '', updated: 0 };
            renderMaintenanceOverlay(false); renderFlagsPill();
        }
        // Dipanggil checkAdmin() begitu peran akun diketahui: owner tidak boleh sempat tertutup layar maintenance.
        function flagsOnAdminChecked() { flagsAdminChecked = true; applyFlagsUi(); }

        function announceFlagChanges(prev, now) {
            if (!currentAccount) return;
            if (prev.bursaOff !== now.bursaOff) {
                addLog(now.bursaOff ? 'ADMIN: Bursa P2P dinonaktifkan sementara.' : 'ADMIN: Bursa P2P dibuka kembali.', now.bursaOff ? 'warning' : 'success');
                notify(now.bursaOff ? 'Bursa P2P dinonaktifkan sementara oleh admin.' : 'Bursa P2P sudah dibuka kembali.', 'info');
            }
            if (prev.topupOff !== now.topupOff) {
                addLog(now.topupOff ? 'ADMIN: Klaim top up dinonaktifkan sementara.' : 'ADMIN: Klaim top up dibuka kembali.', now.topupOff ? 'warning' : 'success');
                notify(now.topupOff ? 'Klaim top up dinonaktifkan sementara oleh admin.' : 'Klaim top up sudah dibuka kembali.', 'info');
            }
            if (prev.maintenance && !now.maintenance) { addLog('ADMIN: Maintenance selesai, game dibuka kembali.', 'success'); notify('Maintenance selesai. Selamat bermain!', 'info'); }
        }

        function applyFlagsUi() {
            renderMaintenanceOverlay(!!currentAccount && flagsAdminChecked && maintenanceBlocksMe());
            renderFlagsPill();
            if (currentAccount) {
                const note = document.getElementById('bursa-off-note');
                if (note) { note.classList.toggle('hidden', !bursaBlocked()); const t = note.querySelector('[data-note]'); if (t) t.textContent = bursaClosedText(); }
                const tabBursa = document.getElementById('tab-bursa');
                if (tabBursa && !tabBursa.classList.contains('hidden') && typeof renderBursa === 'function') renderBursa();
                if (typeof renderBursaClaimBox === 'function') renderBursaClaimBox();
                if (typeof renderTopupBox === 'function') renderTopupBox();
            }
            if (isOwnerUser) renderFlagsPanel();
        }

        // ---------- Layar maintenance (pemain biasa) ----------
        function renderMaintenanceOverlay(on) {
            let el = document.getElementById('maintenance-overlay');
            if (!on) { if (el) el.remove(); return; }
            const msg = (gameFlags.message || '').trim() || 'Game sedang dalam perbaikan. Silakan kembali beberapa saat lagi.';
            if (!el) {
                el = document.createElement('div'); el.id = 'maintenance-overlay';
                el.innerHTML = '<div class="mt-box"><div class="mt-ico"><i class="fa-solid fa-screwdriver-wrench"></i></div><h2>Game Sedang Maintenance</h2><p data-mt-msg></p>'
                    + '<div class="mt-sub">Layar ini hilang otomatis begitu maintenance selesai.</div>'
                    + '<div class="mt-btns"><button type="button" data-mt="reload">Muat Ulang</button><button type="button" data-mt="out">Keluar</button></div></div>';
                el.querySelector('[data-mt="reload"]').addEventListener('click', () => location.reload());
                el.querySelector('[data-mt="out"]').addEventListener('click', () => { if (typeof logoutAccount === 'function') logoutAccount(); });
                document.body.appendChild(el);
            }
            el.querySelector('[data-mt-msg]').textContent = msg;   // textContent: pesan owner tidak pernah dirender sebagai HTML
        }

        // ---------- Pil pengingat untuk owner (supaya saklar yang menyala tidak terlupa) ----------
        function renderFlagsPill() {
            let el = document.getElementById('flags-pill');
            const on = [gameFlags.maintenance && 'Maintenance', gameFlags.bursaOff && 'Bursa', gameFlags.topupOff && 'Klaim Top Up'].filter(Boolean);
            if (!isOwnerUser || !currentAccount || !on.length) { if (el) el.remove(); return; }
            if (!el) {
                el = document.createElement('button'); el.id = 'flags-pill'; el.type = 'button'; el.title = 'Buka panel admin';
                el.addEventListener('click', () => openAdmin());
                document.body.appendChild(el);
            }
            el.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><span></span>';
            el.querySelector('span').textContent = 'Saklar aktif: ' + on.join(' · ');
        }

        // ---------- Panel owner ----------
        const FLAG_DEFS = [
            { key: 'bursaOff', icon: 'fa-store-slash', title: 'Bursa P2P', stateOn: 'DIMATIKAN',
              desc: 'Menutup pasang iklan, pembelian, dan klaim pembayaran penjual. Pemain masih bisa membatalkan iklannya.',
              btnOn: 'Hidupkan Bursa', btnOff: 'Matikan Bursa',
              confirmOn: 'MATIKAN Bursa P2P untuk semua pemain? Pasang iklan, beli, dan klaim pembayaran langsung ditolak server.',
              confirmOff: 'Hidupkan kembali Bursa P2P untuk semua pemain?' },
            { key: 'topupOff', icon: 'fa-wallet', title: 'Klaim Top Up', stateOn: 'DIMATIKAN',
              desc: 'Pemain tidak bisa menekan Klaim pada kiriman top up. Kiriman tidak hilang; tetap menunggu sampai dibuka lagi.',
              btnOn: 'Hidupkan Klaim', btnOff: 'Matikan Klaim',
              confirmOn: 'MATIKAN klaim top up untuk semua pemain? Kiriman yang belum diklaim tetap aman dan bisa diklaim setelah dibuka lagi.',
              confirmOff: 'Hidupkan kembali klaim top up untuk semua pemain?' },
            { key: 'maintenance', icon: 'fa-screwdriver-wrench', title: 'Maintenance Seluruh Game', stateOn: 'MAINTENANCE',
              desc: 'Semua pemain (selain owner) tertutup layar maintenance dan penyimpanan datanya ditolak server. Bursa & top up ikut tertutup.',
              btnOn: 'Akhiri Maintenance', btnOff: 'Aktifkan Maintenance',
              confirmOn: 'AKTIFKAN MAINTENANCE? Semua pemain selain owner langsung tertutup layar maintenance dan tidak bisa menyimpan data ke server.',
              confirmOff: 'Akhiri maintenance dan buka game untuk semua pemain?' }
        ];
        function renderFlagsPanel() {
            const box = document.getElementById('adm-flags-rows'); if (!box) return;
            box.innerHTML = FLAG_DEFS.map(d => {
                const on = !!gameFlags[d.key];
                return `<div class="bg-gray-900 border ${on ? 'border-red-500/50' : 'border-gray-800'} rounded-lg p-2.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0 font-bold text-gray-100"><i class="fa-solid ${d.icon} w-4 text-center ${on ? 'text-red-400' : 'text-gray-500'}"></i><span class="truncate">${d.title}</span></div>
                        <span class="shrink-0 font-mono text-[10px] font-bold ${on ? 'text-red-400' : 'text-emerald-400'}">${on ? d.stateOn : 'NORMAL'}</span>
                    </div>
                    <div class="text-[10px] text-gray-500 mt-1">${d.desc}</div>
                    <button type="button" onclick="ownerToggleFlag('${d.key}')" ${flagsBusy ? 'disabled' : ''} class="w-full mt-2 ${on ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-red-700 hover:bg-red-600'} disabled:opacity-50 text-white font-bold py-2 rounded-lg transition">${on ? d.btnOn : d.btnOff}</button>
                </div>`;
            }).join('');
            const inp = document.getElementById('adm-flags-msg');
            if (inp && document.activeElement !== inp) inp.value = gameFlags.message || '';
            const meta = document.getElementById('adm-flags-meta');
            if (meta) meta.textContent = gameFlags.updated
                ? 'Terakhir diubah ' + new Date(gameFlags.updated).toLocaleString('id-ID') + (gameFlags.by ? ' oleh ' + gameFlags.by.slice(0, 10) + '…' : '')
                : 'Belum pernah diubah (semua normal).';
        }
        async function ownerToggleFlag(key) {
            if (!isOwnerUser || flagsBusy) return;
            const d = FLAG_DEFS.find(x => x.key === key); if (!d) return;
            const turnOn = !gameFlags[key], patch = { [key]: turnOn };
            if (key === 'maintenance') patch.message = ((document.getElementById('adm-flags-msg') || {}).value || '').trim().slice(0, 300);
            if (!(await showConfirm(turnOn ? d.confirmOn : d.confirmOff, { title: 'Saklar Darurat', iconClass: turnOn ? 'fa-triangle-exclamation' : 'fa-circle-check', theme: turnOn ? 'red' : 'amber', okLabel: turnOn ? 'Ya, Aktifkan' : 'Ya, Hidupkan' }))) return;
            flagsBusy = true; renderFlagsPanel();
            try { await fb.ownerSetFlags(currentAccount.id, patch, key); admMsg(`${d.title}: ${turnOn ? d.stateOn.toLowerCase() : 'kembali normal'}. Berlaku real-time ke semua pemain.`, true); }
            catch (e) { console.warn('Saklar gagal:', e); admMsg('Gagal mengubah saklar (' + (e.code || e.message) + '). Pastikan Firestore Rules versi terbaru sudah dipublish.', false); }
            finally { flagsBusy = false; renderFlagsPanel(); }
        }
        async function ownerSaveFlagMsg() {
            if (!isOwnerUser || flagsBusy) return;
            const message = ((document.getElementById('adm-flags-msg') || {}).value || '').trim().slice(0, 300);
            flagsBusy = true;
            try { await fb.ownerSetFlags(currentAccount.id, { message }, 'message'); admMsg('Pesan maintenance disimpan.', true); }
            catch (e) { console.warn('Simpan pesan gagal:', e); admMsg('Gagal menyimpan pesan (' + (e.code || e.message) + ').', false); }
            finally { flagsBusy = false; renderFlagsPanel(); }
        }
