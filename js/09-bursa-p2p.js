        // ===== Bursa P2P: state lokal =====
        let bursaListings = [], bursaListingsUnsub = null, bursaSalesUnsub = null;
        let pendingBursaSales = [], bursaSaleInflight = new Set(), bursaBuyBusy = new Set(), bursaSaleCredited = new Set();
        const bursaSeen = new Set();
        const rpFmt = n => 'Rp ' + n.toLocaleString('id-ID');

        function topupMsg(text, ok) {
            const el = document.getElementById('topup-msg');
            el.textContent = text; el.classList.toggle('hidden', !text);
            el.className = 'mt-3 text-[11px] rounded-lg px-3 py-2 border ' + (ok === false ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-amber-200 bg-amber-500/10 border-amber-500/30') + (text ? '' : ' hidden');
        }
        // Ganti layar modal Top Up: 'list' (pilih paket) atau 'pay' (QRIS + registrasi) - saling menggantikan,
        // bukan ditumpuk ke bawah, supaya modal tetap ringkas dan tidak perlu discroll panjang.
        function showTopupView(view) {
            document.getElementById('topup-view-list').classList.toggle('hidden', view !== 'list');
            document.getElementById('topup-view-pay').classList.toggle('hidden', view !== 'pay');
            document.getElementById('topup-header-sub').textContent = view === 'pay' ? 'Selesaikan pembayaran di bawah' : 'Tambah modal perusahaan lewat pembayaran nyata';
        }
        function backToPkgList() { showTopupView('list'); renderTopupGrid(); }
        function renderTopupGrid() {
            // Semakin besar paket, semakin "kaya" warna koinnya - urutan tier kasual sebagai isyarat visual nilai paket.
            const coinTiers = [
                'from-slate-400 to-slate-600',
                'from-amber-300 to-amber-600',
                'from-amber-400 to-orange-600',
                'from-orange-400 to-red-600',
                'from-fuchsia-400 to-purple-600',
                'from-yellow-200 via-amber-400 to-orange-600'
            ];
            const tagStyle = { Hemat: 'bg-emerald-500 text-emerald-950', Terbaik: 'bg-gradient-to-r from-yellow-300 to-amber-500 text-amber-950' };
            const gridList = TOPUP_PKGS.filter(p => !p.pass || PASS_LIVE.includes(p.pass));
            document.getElementById('topup-grid').innerHTML = gridList.map((p, i) => {
                const sel = selTopup === p.id;
                const coin = p.pass ? 'from-violet-400 to-fuchsia-600' : (coinTiers[i] || coinTiers[coinTiers.length - 1]);
                const hdrCls = 'col-span-full text-[10px] font-black uppercase tracking-wider mt-1';
                const hdr = (i === 0 || !!p.pass !== !!gridList[i - 1].pass) ? (p.pass ? `<div class="${hdrCls} text-violet-300"><i class="fa-solid fa-ticket mr-1"></i>Pass Langganan (mingguan / bulanan)</div>` : `<div class="${hdrCls} text-amber-300"><i class="fa-solid fa-coins mr-1"></i>Top Up Saldo</div>`) : '';
                return `${hdr}
                <button onclick="selectTopup('${p.id}')" class="pkg-card ${sel ? 'selected bg-amber-500/10' : 'bg-gray-950 hover:border-gray-600'}">
                    ${sel ? '<span class="pkg-check"><i class="fa-solid fa-check"></i></span>' : ''}
                    ${p.tag ? `<span class="pkg-ribbon ${tagStyle[p.tag] || 'bg-emerald-500 text-emerald-950'}">${p.tag}</span>` : ''}
                    <div class="flex items-center gap-2">
                        <span class="pkg-coin bg-gradient-to-br ${coin}"><i class="fa-solid ${p.pass ? 'fa-ticket' : 'fa-coins'} text-gray-950/80"></i></span>
                        <div class="min-w-0 font-bold text-sm text-gray-100 truncate">${p.label}</div>
                    </div>
                    <div class="text-gray-200 mt-2 font-mono font-bold">${rpFmt(p.price)}</div>
                    ${p.pass ? `<div class="pkg-days text-violet-300 mt-1"><i class="fa-solid fa-ticket"></i>${p.info}</div>` : `<div class="pkg-days text-sky-300 mt-1"><i class="fa-solid fa-circle-check"></i>Centang biru ${p.days} hari</div>`}
                </button>`;
            }).join('');
        }
        // Tampilkan ringkasan paket terpilih + atur aktif/tidaknya tombol WhatsApp, pada layar bayar
        function renderTopupPayStep() {
            const p = TOPUP_PKGS.find(x => x.id === selTopup);
            if (!p) { document.getElementById('topup-pay').disabled = true; return; }
            document.getElementById('topup-pkg-summary').innerHTML = `
                <span class="pkg-coin bg-gradient-to-br from-yellow-200 via-amber-400 to-orange-600 shrink-0"><i class="fa-solid fa-coins text-gray-950/80"></i></span>
                <div class="min-w-0 flex-1"><div class="font-bold text-gray-100 text-sm truncate">${p.label}</div><div class="text-[10.5px] ${p.pass ? 'text-violet-300' : 'text-sky-300'}"><i class="fa-solid ${p.pass ? 'fa-ticket' : 'fa-circle-check'} mr-1"></i>${p.pass ? p.info : 'Centang biru ' + p.days + ' hari'}</div></div>
                <div class="font-mono font-bold text-amber-300 shrink-0">${rpFmt(p.price)}</div>`;
            document.getElementById('topup-pay-amount').textContent = rpFmt(p.price);
            const sm = document.getElementById('topup-pkg-summary'); sm.classList.toggle('flex-wrap', !!p.pass);
            if (p.pass) sm.insertAdjacentHTML('beforeend', `<div class="basis-full w-full space-y-1.5 pt-2 mt-1 border-t border-violet-500/20 text-[11px]"><div class="text-[10px] font-black uppercase tracking-wider text-violet-300">Manfaat Pass ${PASS_TIERS[p.pass].label} (${p.pdays} hari)</div>${passBenefitHtml(p.pass)}</div>`);
            document.getElementById('topup-reg-form').classList.toggle('hidden', topupRegistered);
            document.getElementById('topup-reg-done').classList.toggle('hidden', !topupRegistered);
            if (topupRegistered) document.getElementById('topup-reg-name').textContent = topupSender;
            document.getElementById('topup-pay').disabled = !(selTopup && topupRegistered) || topupBusy;
        }
        function selectTopup(id) {
            if (id !== selTopup) { topupRegistered = false; topupSender = ''; } // ganti paket -> registrasi ulang
            selTopup = id; renderTopupGrid(); renderTopupPayStep(); topupMsg(''); showTopupView('pay');
        }
        function registerTopupSender() {
            const inp = document.getElementById('topup-sender-input');
            const name = (inp.value || '').trim();
            if (!name) { topupMsg('Isi dulu nama pengirim sesuai aplikasi pembayaran sebelum registrasi.', false); inp.focus(); return; }
            topupSender = name; topupRegistered = true;
            topupMsg('Registrasi berhasil. Silakan lanjut tekan Konfirmasi via WhatsApp.');
            renderTopupPayStep();
        }
        function editTopupSender() {
            topupRegistered = false; renderTopupPayStep();
            const inp = document.getElementById('topup-sender-input'); if (inp) { inp.value = topupSender; inp.focus(); }
        }
        function openTopup() {
            if (!currentAccount) return;
            renderTopupBox(); selTopup = null; topupRegistered = false; topupSender = ''; topupMsg('');
            document.getElementById('topup-uid').textContent = currentAccount.id;
            const senderInput = document.getElementById('topup-sender-input'); if (senderInput) senderInput.value = '';
            const qrisImg = document.getElementById('topup-qris-img'), qrisMissing = document.getElementById('topup-qris-missing');
            if (qrisImg) { qrisImg.style.display = ''; qrisImg.src = 'asset/qris.png?r=' + Date.now(); } // paksa coba muat ulang kalau sebelumnya gagal
            if (qrisMissing) qrisMissing.classList.add('hidden');
            renderTopupGrid(); renderVerified(); showTopupView('list');
            document.getElementById('topup-modal').classList.remove('hidden');
        }
        function closeTopup() { document.getElementById('topup-modal').classList.add('hidden'); }


        function copyUid() {
            try { navigator.clipboard.writeText(currentAccount.id); topupMsg('UID disalin. Sertakan saat mengirim bukti bayar.'); showToast('UID berhasil disalin.'); } catch (e) { topupMsg('Salin manual UID di atas.', false); showToast('Gagal menyalin UID, salin manual ya.', false); }
        }
        function sendWa() {
            const p = TOPUP_PKGS.find(x => x.id === selTopup);
            if (!p || !currentAccount) return;
            if (!topupRegistered || !topupSender) return topupMsg('Registrasi pembayaran (isi nama pengirim) dulu sebelum konfirmasi ke WhatsApp.', false);
            if (/X{4}/.test(TOPUP_ADMIN.wa)) return topupMsg('Nomor WhatsApp admin belum diisi di index.html (TOPUP_ADMIN.wa).', false);
            const msg = `Halo Admin *Migas Manager ID* 👋\nSaya ingin konfirmasi pembayaran Top Up Saldo.\n\n🏢 *Detail Perusahaan*\nPerusahaan: ${currentAccount.company}\nEmail: ${currentAccount.email || '-'}\nUID: ${currentAccount.id}\n\n💳 *Detail Pembayaran*\nNama Pengirim: ${topupSender}\nPaket: *${p.label}* (${rpFmt(p.price)})\n${p.pass ? 'Masa aktif: ' + p.pdays + ' hari (' + p.info + ')' : 'Bonus: Centang biru ' + p.days + ' hari'}\n\n📎 Bukti pembayaran (screenshot QRIS + struk/notifikasi pembayaran) saya lampirkan di chat ini.\n\nMohon segera diproses ya, terima kasih 🙏`;
            window.open('https://wa.me/' + TOPUP_ADMIN.wa + '?text=' + encodeURIComponent(msg), '_blank');
            topupMsg('WhatsApp dibuka. Lampirkan bukti bayar. Setelah admin mengonfirmasi, tekan Klaim di kotak Notifikasi Top Up.');
        }

        // ----- Panel admin -----
        let isAdminUser = false, isOwnerUser = false;   // owner = admins/{uid}.role == 'owner' (Rules yang menjaga; ini hanya tampilan)
        async function checkAdmin() {
            if (!window.fb || !currentAccount) return;
            isAdminUser = await fb.isAdmin(currentAccount.id);
            isOwnerUser = isAdminUser && await fb.isOwnerDev(currentAccount.id);
            document.getElementById('btn-admin').classList.toggle('hidden', !isAdminUser);
            if (typeof flagsOnAdminChecked === 'function') flagsOnAdminChecked();   // saklar darurat: owner dikecualikan dari layar maintenance
        }
        function admMsg(t, ok) { const el = document.getElementById('adm-msg'); el.textContent = t; el.className = 'mt-3 text-[11px] rounded-lg px-3 py-2 border ' + (ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-red-300 bg-red-500/10 border-red-500/30') + (t ? '' : ' hidden'); }
        async function renderGrants() {
            try {
                const g = await fb.recentGrants();
                document.getElementById('adm-list').innerHTML = g.map(x => `<div class="flex justify-between bg-gray-950 rounded px-2 py-1"><span class="truncate text-gray-300">${esc(x.uid.slice(0, 10))}… &middot; ${rpFmt(x.price || 0)}</span><b class="${x.claimed ? 'text-emerald-400' : 'text-amber-400'}">${x.claimed ? 'Masuk' : 'Menunggu'}</b></div>`).join('') || '<div class="text-gray-600">Belum ada.</div>';
            } catch (e) { document.getElementById('adm-list').textContent = 'Gagal memuat riwayat.'; }
        }
        // Keterangan produk di panel admin: pilih paket pass -> tampil harga jual, masa aktif, dan daftar manfaatnya.
        function admPkgInfo() {
            const el = document.getElementById('adm-pkg-info'); if (!el) return;
            const pkg = ADMIN_PKGS.find(x => x.id === document.getElementById('adm-pkg').value);
            if (!pkg || !pkg.pass) { el.classList.add('hidden'); el.innerHTML = ''; return; }
            const t = TOPUP_PKGS.find(x => x.id === pkg.id.replace('apass_', 'pass_'));
            el.classList.remove('hidden');
            el.innerHTML = `<div class="text-[10px] font-black uppercase tracking-wider text-violet-300 mb-1.5"><i class="fa-solid fa-ticket mr-1"></i>Pass ${PASS_TIERS[pkg.pass].label} &middot; ${pkg.pdays} hari${t ? ' &middot; harga jual ' + rpFmt(t.price) : ''}</div><div class="space-y-1.5 text-[11px]">${passBenefitHtml(pkg.pass)}</div><div class="text-[10px] text-gray-500 mt-1.5">Aktif langsung di server, tanpa klaim. Kalau pemain sudah punya pass yang sama, masa aktifnya diperpanjang.</div>`;
        }
        function openAdmin() {
            if (!isAdminUser) return;
            const admOpt = p => { const t = p.pass ? TOPUP_PKGS.find(x => x.id === p.id.replace('apass_', 'pass_')) : null; return `<option value="${p.id}">${p.pass ? p.label + (t ? ' - ' + rpFmt(t.price) : '') : p.label + ' - centang ' + p.days + ' hari'}</option>`; };
            const admSel = document.getElementById('adm-pkg');
            admSel.innerHTML = `<optgroup label="Top Up Saldo">${ADMIN_PKGS.filter(p => !p.pass).map(admOpt).join('')}</optgroup><optgroup label="Pass Langganan">${ADMIN_PKGS.filter(p => p.pass).map(admOpt).join('')}</optgroup>`;
            admSel.onchange = admPkgInfo; admPkgInfo();
            document.getElementById('adm-player').textContent = ''; admMsg('');
            document.getElementById('adm-only-check').checked = false;
            document.getElementById('adm-only-cash').checked = false;
            document.getElementById('adm-custom-cash').value = '';
            document.getElementById('adm-custom-days').value = '';
            admToggleOnlyCheck();
            document.getElementById('admin-modal').classList.remove('hidden'); renderGrants(); renderBroadcastList();
            document.querySelectorAll('#admin-modal .owner-only').forEach(el => el.classList.toggle('hidden', !isOwnerUser));
            { const po = document.querySelector('#adm-ban-days option[value="0"]'); if (po) { po.hidden = !isOwnerUser; po.disabled = !isOwnerUser; } }   // admin biasa: blokir sementara saja
            ['adm-send', 'adm-fill'].forEach(id => { const b = document.getElementById(id); if (b) { b.disabled = !isOwnerUser; b.title = isOwnerUser ? '' : 'Khusus owner developer'; } });
            if (isOwnerUser) { renderMentahPanel(); admMtMsg(''); }
            if (isOwnerUser && typeof renderOwnerPanel === 'function') renderOwnerPanel();
            if (isOwnerUser && typeof renderFlagsPanel === 'function') renderFlagsPanel();
        }
        function closeAdmin() { document.getElementById('admin-modal').classList.add('hidden'); }
        // Saat "hanya centang" dicentang, paket & nominal khusus dinonaktifkan (tidak dipakai), dan otomatis
        // membatalkan centang "hanya saldo" (dua opsi ini saling meniadakan, tidak bisa aktif berbarengan).
        function admToggleOnlyCheck() {
            const only = document.getElementById('adm-only-check').checked;
            if (only) document.getElementById('adm-only-cash').checked = false;
            document.getElementById('adm-pkg').disabled = only;
            document.getElementById('adm-custom-cash').disabled = only;
            document.getElementById('adm-custom-days').disabled = false;
            admCustomPreview();
        }
        // Saat "hanya saldo" dicentang, saldo tetap dikirim (dari paket atau nominal khusus) tapi centang biru
        // TIDAK ikut dikirim/diperpanjang. Otomatis membatalkan centang "hanya centang biru".
        function admToggleOnlyCash() {
            const onlyCash = document.getElementById('adm-only-cash').checked;
            if (onlyCash) {
                document.getElementById('adm-only-check').checked = false;
                document.getElementById('adm-pkg').disabled = false;
                document.getElementById('adm-custom-cash').disabled = false;
            }
            document.getElementById('adm-custom-days').disabled = onlyCash;
            admCustomPreview();
        }
        // Pratinjau nominal khusus yang akan dikirim (dibatasi maks ADMIN_CASH_MAX)
        const ADMIN_DAYS_MAX = 3650; // batas atas durasi centang biru khusus admin: 10 tahun
        function admSetDays(d) { const el = document.getElementById('adm-custom-days'); if (el.disabled) return; el.value = d; admCustomPreview(); }
        function admCustomDays() { const n = parseInt(document.getElementById('adm-custom-days').value, 10); return n > 0 ? Math.min(n, ADMIN_DAYS_MAX) : 0; }
        function admCustomPreview() {
            const el = document.getElementById('adm-custom-preview');
            const cd = admCustomDays();
            if (document.getElementById('adm-only-check').checked) { el.textContent = 'Hanya kirim centang biru' + (cd ? ' limited ' + cd + ' hari' : '') + ', saldo tidak dikirim.'; return; }
            const onlyCash = document.getElementById('adm-only-cash').checked;
            const raw = parseInt(document.getElementById('adm-custom-cash').value, 10);
            if (!raw || raw <= 0) { el.textContent = onlyCash ? 'Saldo mengikuti nominal paket di atas, tanpa centang biru.' : (cd ? 'Centang biru limited ' + cd + ' hari.' : ''); return; }
            const clamped = Math.min(raw, ADMIN_CASH_MAX);
            el.textContent = 'Nominal terkirim: ' + rpFmt(clamped) + (raw > ADMIN_CASH_MAX ? ' (dibatasi maks 10 Triliun)' : '') + (onlyCash ? ', tanpa centang biru.' : (cd ? ', centang biru limited ' + cd + ' hari.' : ''));
        }
        const admUid = () => document.getElementById('adm-uid').value.trim();
        async function adminLookup() {
            const uid = admUid(), el = document.getElementById('adm-player');
            if (uid.length < 20) { el.textContent = 'UID tidak valid.'; return null; }
            try {
                const [pl, ban] = await Promise.all([fb.lookupPlayer(uid), fb.checkBanned(uid)]);
                const banActive = ban && (ban.permanent || (ban.until && ban.until > Date.now()));
                const banInfo = banActive ? `<div class="text-red-400 mt-1"><i class="fa-solid fa-ban mr-1"></i>DIBLOKIR ${ban.permanent ? '(permanen)' : 'sampai ' + new Date(ban.until).toLocaleString('id-ID')}${ban.reason ? ' &middot; ' + esc(ban.reason) : ''}</div>` : '';
                el.innerHTML = (pl ? `<span class="text-emerald-400"><i class="fa-solid fa-circle-check mr-1"></i>${esc(pl.company)} &middot; pemilik ${esc(pl.owner)}</span>` : '<span class="text-amber-400">UID belum ada di leaderboard (pemain belum pernah login/menyimpan). Pastikan UID benar.</span>') + banInfo;
                return pl || {};
            } catch (e) { el.textContent = 'Gagal mengecek: ' + (e.code || e.message); return null; }
        }
        async function adminSend() {
            if (!isAdminUser) return;
            const uid = admUid(), pkg = ADMIN_PKGS.find(x => x.id === document.getElementById('adm-pkg').value), btn = document.getElementById('adm-send');
            const pl = await adminLookup(); if (pl === null || !pkg) return admMsg('Periksa UID dan paket.', false);
            if (pkg.pass) { // Pass: aktif langsung di server (koleksi passes), tanpa klaim dan tanpa saldo
                if (!(await showConfirm(`Aktifkan ${pkg.label} untuk ${pl.company || 'UID ini (TIDAK ditemukan di leaderboard)'}?\nUID: ${uid}`, { title: 'Aktifkan Pass', iconClass: 'fa-ticket', theme: 'blue', okLabel: 'Aktifkan' }))) return;
                btn.disabled = true;
                try { await fb.adminGrantPass(currentAccount.id, uid, pkg.pass, pkg.pdays); fb.audit(currentAccount.id, 'grant_pass', uid, pkg.label); admMsg(`${pkg.label} aktif untuk ${pl.company || uid}.`, true); showModal('Pass Aktif', `${pkg.label} berhasil diaktifkan untuk ${pl.company || uid}.`, 'fa-ticket', 'blue'); }
                catch (e) { console.warn('Pass gagal:', e); admMsg('Gagal mengaktifkan pass (' + (e.code || e.message) + ').', false); }
                finally { btn.disabled = false; }
                return;
            }

            // Tentukan nominal & hari centang biru yang dikirim:
            // - onlyCheck: hanya kirim centang biru, saldo = 0
            // - onlyCash : hanya kirim saldo (dari paket/nominal khusus), hari centang biru = 0 (tidak dikirim/diperpanjang)
            // - selain itu: kirim keduanya (nominal khusus kalau diisi, atau ikut paket)
            const onlyCheck = document.getElementById('adm-only-check').checked;
            const onlyCash = document.getElementById('adm-only-cash').checked;
            const customRaw = parseInt(document.getElementById('adm-custom-cash').value, 10);
            let cash = pkg.cash, days = pkg.days, label = pkg.label;
            const customDays = admCustomDays();
            if (customDays > 0 && !onlyCash) days = customDays;
            if (onlyCheck) {
                cash = 0; label = customDays > 0 ? 'Centang biru limited (tanpa saldo)' : 'Centang biru saja (tanpa saldo)';
            } else if (onlyCash) {
                days = 0; label = pkg.label + ' (tanpa centang biru)';
                if (customRaw > 0) { cash = Math.min(customRaw, ADMIN_CASH_MAX); label = rpFmt(cash) + ' (nominal khusus, tanpa centang biru)'; }
            } else if (customRaw > 0) {
                cash = Math.min(customRaw, ADMIN_CASH_MAX); label = rpFmt(cash) + ' (nominal khusus)';
            } else if (customDays > 0) {
                label = pkg.label + ' (centang biru limited)';
            }
            const sendPkg = { id: pkg.id, label, cash, price: 0, days };

            const centangTxt = days > 0 ? ` + centang biru ${days} hari` : ' (tanpa centang biru)';
            if (!(await showConfirm(`Kirim ${sendPkg.label}${centangTxt} ke ${pl.company || 'UID ini (TIDAK ditemukan di leaderboard)'}?\nUID: ${uid}`, { title: 'Kirim Top Up', iconClass: 'fa-paper-plane', theme: 'blue', okLabel: 'Kirim' }))) return;
            btn.disabled = true;
            try {
                await fb.adminGrant(currentAccount.id, uid, sendPkg, document.getElementById('adm-note').value.trim());
                fb.audit(currentAccount.id, 'grant_topup', uid, (sendPkg.label || '') + ' cash=' + sendPkg.cash + ' hari=' + sendPkg.days);
                admMsg(`Berhasil dikirim ke ${pl.company || uid}. Pemain tinggal menekan Klaim di kotak Notifikasi Top Up.`, true);
                showModal('Top Up Terkirim', `${sendPkg.label}${centangTxt} berhasil dikirim ke ${pl.company || uid}.`, 'fa-circle-check', 'blue');
                document.getElementById('adm-uid').value = ''; document.getElementById('adm-note').value = ''; document.getElementById('adm-player').textContent = '';
                document.getElementById('adm-only-check').checked = false; document.getElementById('adm-only-cash').checked = false; document.getElementById('adm-custom-cash').value = ''; document.getElementById('adm-custom-days').value = ''; admToggleOnlyCheck();
                renderGrants();
            } catch (e) { admMsg('Gagal mengirim: ' + (e.code || e.message), false); }
            finally { btn.disabled = false; }
        }
        // ----- Broadcast: kirim notifikasi ke semua pemain -----
        function admBroadcastMsg(t, ok) {
            const el = document.getElementById('adm-broadcast-msg-status');
            el.textContent = t; el.className = 'mt-2 text-[11px] rounded-lg px-3 py-2 border ' + (ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-red-300 bg-red-500/10 border-red-500/30') + (t ? '' : ' hidden');
        }
        async function renderBroadcastList() {
            try {
                const list = await fb.recentBroadcasts();
                document.getElementById('adm-broadcast-list').innerHTML = list.map(x => `<div class="bg-gray-950 rounded px-2 py-1 ${x.level === 'warn' ? 'text-amber-300' : 'text-gray-300'}">${esc(x.message)}</div>`).join('') || '<div class="text-gray-600">Belum ada.</div>';
            } catch (e) { document.getElementById('adm-broadcast-list').textContent = 'Gagal memuat riwayat.'; }
        }
        async function adminSendBroadcast() {
            if (!isAdminUser) return;
            const inp = document.getElementById('adm-broadcast-msg'), msg = inp.value.trim();
            const level = document.getElementById('adm-broadcast-level').value;
            const btn = document.getElementById('adm-broadcast-send');
            if (!msg) return admBroadcastMsg('Isi dulu pesannya.', false);
            if (!(await showConfirm(`Kirim pengumuman ini ke SEMUA pemain (termasuk yang sedang offline, akan mereka terima saat login berikutnya)?\n\n"${msg}"`, { title: 'Kirim Broadcast', iconClass: 'fa-tower-broadcast', theme: 'amber', okLabel: 'Kirim ke Semua' }))) return;
            btn.disabled = true;
            try {
                await fb.sendBroadcast(currentAccount.id, msg, level); fb.audit(currentAccount.id, 'broadcast', '', String(msg).slice(0, 80));
                admBroadcastMsg('Terkirim. Pemain yang offline akan otomatis menerimanya begitu mereka login lagi.', true);
                inp.value = '';
                renderBroadcastList();
            } catch (e) { admBroadcastMsg('Gagal mengirim: ' + (e.code || e.message), false); }
            finally { btn.disabled = false; }
        }
        // Dipanggil sekali tiap login/refresh (bukan realtime listener) - ambil broadcast yang belum pernah
        // dilihat akun ini (dibandingkan "terakhir dilihat" yang tersimpan di Firestore, ikut akun bukan ikut
        // perangkat), lalu tampilkan sebagai notifikasi biasa (masuk ke panel Notifikasi + ikut bunyi
        // notifikasi yang sudah ada). Login dari HP lalu dari laptop tetap tersinkron - tidak dobel.
        async function checkNewBroadcasts() {
            if (!window.fb || !currentAccount) return;
            let lastSeen = currentAccount.lastBroadcastSeen || 0;
            // Migrasi sekali dari localStorage lama (peninggalan versi sebelumnya, per-perangkat) kalau akun
            // ini belum pernah punya catatan "terakhir dilihat" di Firestore sama sekali.
            if (!lastSeen) {
                try { lastSeen = parseInt(localStorage.getItem('pmid_lastbroadcast_' + currentAccount.id) || '0', 10) || 0; } catch (e) { /* localStorage diblokir, abaikan */ }
            }
            try {
                const list = await fb.fetchNewBroadcasts();
                const belum = list.filter(x => x.created && x.created.toMillis && x.created.toMillis() > lastSeen).sort((a, b) => a.created.toMillis() - b.created.toMillis());
                if (!belum.length) return;
                belum.forEach(x => notify('PENGUMUMAN: ' + x.message, x.level === 'warn' ? 'warn' : 'info'));
                const newest = belum[belum.length - 1].created.toMillis();
                currentAccount.lastBroadcastSeen = newest; // langsung update di memori, cegah double-trigger kalau fungsi ini kepanggil 2x sebelum tulisan cloud selesai
                try { await fb.markBroadcastSeen(currentAccount.id, newest); } catch (e) { console.warn('Gagal simpan status broadcast ke cloud:', e); }
            } catch (e) { console.warn('Gagal ambil broadcast:', e); }
        }
        async function adminBan() {
            if (!isAdminUser) return;
            const uid = admUid();
            if (uid.length < 20) return admMsg('UID tidak valid.', false);
            const raw = document.getElementById('adm-ban-days').value, days = raw === '0' ? null : parseInt(raw, 10);
            const reason = document.getElementById('adm-ban-reason').value.trim(), label = days ? `${days} hari` : 'PERMANEN';
            if (!(await showConfirm(`Blokir UID ${uid} selama ${label}?${reason ? '\nAlasan: ' + reason : ''}`, { title: 'Blokir Pemain', iconClass: 'fa-ban', theme: 'red', okLabel: 'Blokir' }))) return;
            try {
                await fb.banPlayer(currentAccount.id, uid, days, reason); fb.audit(currentAccount.id, 'ban', uid, (days ? days + ' hari' : 'permanen') + ' ' + (reason || ''));
                admMsg(`UID ${uid} diblokir (${label}).`, true);
                showModal('Pemain Diblokir', `UID ${uid} diblokir ${label}.${reason ? ' Alasan: ' + reason + '.' : ''}\nBlokir berlaku mulai login berikutnya pemain tersebut.`, 'fa-ban', 'red');
                document.getElementById('adm-ban-reason').value = '';
                adminLookup();
            } catch (e) { admMsg('Gagal memblokir: ' + (e.code || e.message), false); }
        }
        async function adminUnban() {
            if (!isAdminUser) return;
            const uid = admUid();
            if (uid.length < 20) return admMsg('UID tidak valid.', false);
            if (!(await showConfirm(`Buka blokir UID ${uid}?`, { title: 'Buka Blokir', iconClass: 'fa-lock-open', theme: 'blue', okLabel: 'Buka Blokir' }))) return;
            try {
                await fb.unbanPlayer(uid); fb.audit(currentAccount.id, 'unban', uid, '');
                admMsg(`UID ${uid} dibuka blokirnya.`, true);
                showModal('Blokir Dibuka', `UID ${uid} sudah bisa login kembali.`, 'fa-lock-open', 'blue');
                adminLookup();
            } catch (e) { admMsg('Gagal membuka blokir: ' + (e.code || e.message), false); }
        }

        // Pantau real-time dokumen banned/{uid} pemain yang sedang login. Kalau admin menjatuhkan blokir
        // (atau memperpanjang/mengubah alasan) SAAT pemain online, dia langsung ditendang saat itu juga -
        // tidak perlu tunggu logout/login ulang. Munculkan pop-up yang sama seperti pengecekan saat login,
        // lengkap dengan status permanen/berapa lama serta alasannya.
        function startBanListener() {
            if (banUnsub || !window.fb || !currentAccount) return;
            banUnsub = fb.listenBanned(currentAccount.id, ban => { if (isBanActive(ban)) forceBanKick(ban); });
        }
        function stopBanListener() { if (banUnsub) { banUnsub(); banUnsub = null; } }
        async function forceBanKick(ban) {
            if (!currentAccount) return;
            stopBanListener();
            if (typeof stopFlagsListener === 'function') stopFlagsListener();
            skipSave = true; // cegah autosave nyelip sebelum sesi ditutup
            currentAccount = null;
            try { await fb.out(); } catch (e) {}
            document.getElementById('splash-overlay').classList.add('hidden');
            document.getElementById('auth-overlay').classList.remove('hidden');
            showModal('Akun Diblokir', banModalText(ban), 'fa-ban', 'red');
        }

        // Notifikasi top up dari admin (belum diklaim). Saldo baru masuk setelah pemain menekan Klaim.
        // ===== ISI BBL SEMUA CABANG (perintah admin) =====
        // Hanya depo cabang yang sudah dibuka pemain dan bertipe BBM (Kilang Tuban tidak ikut). Tangki BBL diisi sampai kapasitas penuh miliknya.
        let fillUnsub = null; const fillSeen = new Set();
        function applyBblCabangFill() {
            let depo = 0, total = 0;
            refineryData.forEach((k, i) => {
                if (i === 0 || !k.is_unlocked || !String(k.tipe).includes('BBM') || !(k.stok_max > 0)) return;
                total += Math.max(0, k.stok_max - k.stok_current); k.stok_current = k.stok_max; depo++;
            });
            renderRefineries(); saveGame();
            addLog(depo ? `ISI BBL ADMIN: tangki BBL ${depo} depo cabang diisi penuh (+${Math.round(total).toLocaleString('id-ID')} Bbl).` : 'ISI BBL ADMIN: belum ada depo cabang yang dibuka, tidak ada yang diisi.', depo ? 'success' : 'warning');
            if (depo) notify(`Admin mengisi penuh BBL di ${depo} depo cabang.`, 'info');
        }
        // ===== ISI BAHAN MENTAH PER KILANG (perintah owner) =====
        // Bahan 'bbl' = BBL mentah (kilang.stok_current/stok_max, Bbl); 'lpg_curah' = tangki LPG Curah (kilang.kap.lpg_curah.cur/max, Ton).
        // Selalu dibatasi kapasitas tangki. Kilang yang belum dibuka pemain tidak diisi (perintah tetap ditandai selesai).
        function mentahSlot(k, bahan) {
            if (!k) return null;
            if (bahan === 'bbl') return (k.id === 'KILANG-01' || String(k.tipe).includes('BBM')) && k.stok_max > 0 ? { get cur() { return k.stok_current; }, set cur(v) { k.stok_current = v; }, max: k.stok_max, unit: 'Bbl', label: 'BBL mentah' } : null;
            if (bahan === 'lpg_curah') { const s = k.kap && k.kap.lpg_curah; return s ? { get cur() { return s.cur; }, set cur(v) { s.cur = v; }, max: s.max, unit: 'Ton', label: 'LPG Curah' } : null; }
            return null;
        }
        function applyBahanMentahFill(f) {
            const k = refineryData.find(x => x.id === f.kilangId), slot = mentahSlot(k, f.bahan), mode = f.mode === 'add' ? 'add' : 'full', amt = Math.max(0, Math.floor(Number(f.amount) || 0));
            if (!k || !slot) { addLog('ISI BAHAN ADMIN: kilang/bahan tidak dikenali, perintah dilewati.', 'warning'); return; }
            if (!k.is_unlocked) { addLog(`ISI BAHAN ADMIN: ${k.nama} belum kamu buka, ${slot.label} tidak diisi.`, 'warning'); notify(`Admin mencoba mengisi ${slot.label} di ${k.nama}, tapi depo ini belum dibuka.`, 'info'); return; }
            const ruang = Math.max(0, slot.max - slot.cur), tambah = mode === 'full' ? ruang : Math.min(amt, ruang);
            if (tambah <= 0) { addLog(`ISI BAHAN ADMIN: tangki ${slot.label} ${k.nama} sudah penuh, tidak ada yang ditambah.`, 'warning'); return; }
            slot.cur = Math.min(slot.max, slot.cur + tambah);
            renderRefineries(); saveGame();
            addLog(`ISI BAHAN ADMIN: tangki ${slot.label} ${k.nama} +${Math.round(tambah).toLocaleString('id-ID')} ${slot.unit}.`, 'success');
            notify(`Admin mengisi ${Math.round(tambah).toLocaleString('id-ID')} ${slot.unit} ${slot.label} di ${k.nama}.`, 'info');
        }
        // --- Panel owner: daftar semua kilang/depo + form kirim ---
        function renderMentahPanel() {
            const sel = document.getElementById('adm-mt-kilang'); if (!sel) return;
            const keep = sel.value, grp = {};
            refineryData.forEach(k => { const g = k.tipe === 'Pusat Utama' ? 'Pusat Utama' : String(k.tipe); (grp[g] = grp[g] || []).push(k); });
            sel.innerHTML = Object.entries(grp).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(k => `<option value="${esc(k.id)}">${esc(k.nama)} (${esc(k.id)})</option>`).join('')}</optgroup>`).join('');
            if (keep && refineryData.some(k => k.id === keep)) sel.value = keep;
            admMtUpdate();
        }
        function admMtUpdate() {
            const k = refineryData.find(x => x.id === document.getElementById('adm-mt-kilang').value); if (!k) return;
            const bSel = document.getElementById('adm-mt-bahan'), prev = bSel.value, opts = [];
            if (mentahSlot(k, 'bbl')) opts.push(['bbl', 'BBL Mentah (Bbl)']);
            if (mentahSlot(k, 'lpg_curah')) opts.push(['lpg_curah', 'LPG Curah (Ton)']);
            bSel.innerHTML = opts.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('') || '<option value="">Tidak ada bahan mentah di depo ini</option>';
            if (opts.some(o => o[0] === prev)) bSel.value = prev;
            const slot = mentahSlot(k, bSel.value), full = document.getElementById('adm-mt-mode').value === 'full', amt = document.getElementById('adm-mt-amount');
            document.getElementById('adm-mt-unit').textContent = slot ? '(' + slot.unit + ')' : '';
            amt.disabled = full || !slot; if (full) amt.value = '';
            document.getElementById('adm-mt-info').textContent = slot ? `Kapasitas dasar ${k.nama}: ${Math.round(slot.max).toLocaleString('id-ID')} ${slot.unit} (kapasitas pemain bisa berbeda kalau sudah di-upgrade; pengisian dibatasi kapasitas milik pemain).` : '';
        }
        function admMtMsg(t, ok) { const el = document.getElementById('adm-mt-msg'); el.textContent = t; el.className = 'mt-2 text-[11px] rounded-lg px-3 py-2 border ' + (ok ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-red-300 bg-red-500/10 border-red-500/30') + (t ? '' : ' hidden'); }
        async function adminFillMentah() {
            if (!isAdminUser || !isOwnerUser) return;
            const uid = admUid(), btn = document.getElementById('adm-mt-send');
            const k = refineryData.find(x => x.id === document.getElementById('adm-mt-kilang').value), bahan = document.getElementById('adm-mt-bahan').value, mode = document.getElementById('adm-mt-mode').value;
            const slot = mentahSlot(k, bahan); if (!k || !slot) return admMtMsg('Pilih kilang/depo dan bahan yang valid.', false);
            const amount = mode === 'full' ? 0 : Math.floor(Number(document.getElementById('adm-mt-amount').value) || 0);
            if (mode === 'add' && (amount <= 0 || amount > 10000000)) return admMtMsg('Jumlah harus 1 sampai 10.000.000.', false);
            const pl = await adminLookup(); if (pl === null) return admMtMsg('Periksa UID pemain dulu.', false);
            const ket = mode === 'full' ? 'diisi PENUH' : `ditambah ${amount.toLocaleString('id-ID')} ${slot.unit}`;
            if (!(await showConfirm(`${slot.label} di ${k.nama} milik ${pl.company || 'UID ini (TIDAK ditemukan di leaderboard)'} akan ${ket}?\nUID: ${uid}\nDiterapkan otomatis begitu pemain online.`, { title: 'Isi Bahan Mentah', iconClass: 'fa-droplet', theme: 'blue', okLabel: 'Kirim' }))) return;
            btn.disabled = true;
            try { await fb.adminFillMentah(currentAccount.id, uid, k.id, bahan, mode, amount); fb.audit(currentAccount.id, 'fill_mentah', uid, `${k.id} ${bahan} ${mode}${mode === 'add' ? ' ' + amount : ''}`); admMtMsg(`Perintah isi ${slot.label} ${k.nama} terkirim ke ${pl.company || uid}. Diterapkan otomatis saat pemain online.`, true); showModal('Perintah Terkirim', `${slot.label} di ${k.nama} milik ${pl.company || uid} akan ${ket} begitu pemain online.`, 'fa-droplet', 'blue'); }
            catch (e) { console.warn('Fill mentah gagal:', e); admMtMsg('Gagal mengirim perintah (' + (e.code || e.message) + ').', false); }
            finally { btn.disabled = false; }
        }
        function startFillListener() {
            if (fillUnsub || !window.fb || !currentAccount) return;
            fillUnsub = fb.listenFills(currentAccount.id, list => list.forEach(f => {
                if (fillSeen.has(f.id) || (f.type !== 'bbl_cabang' && f.type !== 'bahan_mentah')) return; fillSeen.add(f.id);
                try { if (f.type === 'bahan_mentah') applyBahanMentahFill(f); else applyBblCabangFill(); } catch (e) { console.error('fill', e); fillSeen.delete(f.id); return; }
                fb.markFillClaimed(f.id).catch(e => console.warn('Tandai fill gagal:', e));
            }));
        }
        async function adminFillBbl() {
            if (!isAdminUser) return;
            const uid = admUid(), btn = document.getElementById('adm-fill');
            const pl = await adminLookup(); if (pl === null) return admMsg('Periksa UID pemain dulu.', false);
            if (!(await showConfirm(`Isi PENUH tangki BBL di semua depo cabang (bukan Kilang Tuban) milik ${pl.company || 'UID ini (TIDAK ditemukan di leaderboard)'}?\nUID: ${uid}\nDiterapkan otomatis begitu pemain online.`, { title: 'Isi BBL Semua Cabang', iconClass: 'fa-oil-can', theme: 'blue', okLabel: 'Isi Penuh' }))) return;
            btn.disabled = true;
            try { await fb.adminFillBbl(currentAccount.id, uid); fb.audit(currentAccount.id, 'fill_bbl', uid, ''); admMsg(`Perintah isi BBL cabang terkirim ke ${pl.company || uid}. Diterapkan otomatis saat pemain online.`, true); showModal('Perintah Terkirim', `BBL semua cabang milik ${pl.company || uid} akan terisi penuh begitu pemain online.`, 'fa-oil-can', 'blue'); }
            catch (e) { console.warn('Fill gagal:', e); admMsg('Gagal mengirim perintah (' + (e.code || e.message) + ').', false); }
            finally { btn.disabled = false; }
        }
        // Pass: masa aktif dibaca dari server (passes/{uid}, hanya admin yang bisa menulis), bukan dari save lokal.
        let passUnsub = null;
        function startPassListener() {
            if (passUnsub || !window.fb || !currentAccount) return;
            passUnsub = fb.listenPass(currentAccount.id, d => {
                const tier = d && PASS_TIERS[d.tier] ? d.tier : '', exp = tier ? (d.until || 0) : 0;
                const changed = tier !== passState.tier || exp !== passState.exp;
                passState = { tier, exp, floor: passState.floor || 0 };
                if (changed && passHas('dispatch')) addLog(`PASS ${PASS_TIERS[tier].label.toUpperCase()} aktif sampai ${new Date(exp).toLocaleDateString('id-ID')}.`, 'success');
            });
        }
        const topupSeen = new Set();
        function startTopupListener() {
            if (topupUnsub || !window.fb || !currentAccount) return;
            topupUnsub = fb.listenTopups(currentAccount.id, list => {
                pendingTopups = list.sort((x, y) => (x.paidAt && x.paidAt.seconds || 0) - (y.paidAt && y.paidAt.seconds || 0));
                pendingTopups.forEach(t => { if (!topupSeen.has(t.id)) { topupSeen.add(t.id); addLog(`TOP UP: Kiriman ${formatRupiah(t.cash)} dari admin menunggu diklaim. Buka menu Top Up lalu tekan Klaim.`, 'success'); } });
                renderTopupBox();
            });
        }
        function renderTopupBox() {
            const n = pendingTopups.length, bd = document.getElementById('topup-badge'), box = document.getElementById('topup-box');
            bd.textContent = n; bd.classList.toggle('hidden', !n); box.classList.toggle('hidden', !n);
            const items = pendingTopups.map(t => `
                <div class="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                    <div><div class="text-emerald-300 font-bold text-sm">+${formatRupiah(t.cash)}</div><div class="text-[10px] text-sky-300"><i class="fa-solid fa-circle-check mr-1"></i>Centang biru ${t.days || 0} hari (sudah aktif)</div></div>
                    <button onclick="claimTopup('${esc(t.id)}')" ${topupInflight.has(t.id) || topupBlocked() ? 'disabled' : ''} class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg">${topupInflight.has(t.id) ? 'Memproses...' : 'Klaim'}</button>
                </div>`).join('');
            box.innerHTML = n ? `<div class="text-[11px] font-bold text-emerald-300"><i class="fa-solid fa-bell mr-1"></i>Notifikasi Top Up (${n})</div>` + items : '';
            document.getElementById('notif-topup').innerHTML = items || '<div class="text-gray-600 px-1">Tidak ada top up yang menunggu diklaim.</div>';
            renderNotif();
        }
        async function claimTopup(id) {
            const t = pendingTopups.find(x => x.id === id);
            if (!t || topupInflight.has(id)) return;
            if (topupBlocked()) return topupMsg(topupClosedText(), false);   // saklar darurat
            topupInflight.add(id); renderTopupBox();
            try { await creditTopup(t); topupMsg('Top up berhasil diklaim.'); }
            catch (e) { console.warn('Klaim gagal:', e); topupMsg('Klaim belum tuntas (' + (e.code || e.message) + '). Tekan Klaim lagi; saldo tidak akan terhitung dua kali.', false); }
            finally { topupInflight.delete(id); renderTopupBox(); }
        }
        async function creditTopup(t) {
            if (!currentAccount) return;
            if (!appliedTopups.includes(t.id)) {           // cegah kredit ganda
                companyCash += t.cash; topupTotal += t.cash; appliedTopups.push(t.id);
                updateCashDisplay(); saveGame();
                addLog(`TOP UP: Saldo bertambah ${formatRupiah(t.cash)} (pembayaran ${rpFmt(t.price)}).`, 'success');
                addLog('CLOUD: Saldo top up baru tersimpan lokal. Tekan "Save Cloud" supaya tidak hilang kalau ganti perangkat.', 'warning');
                document.getElementById('btn-cloud-save')?.classList.add('cloud-remind');
                showModal('Top Up Berhasil!', `Saldo perusahaan bertambah ${formatRupiah(t.cash)}.\n\nJangan lupa buka menu "Akun" lalu tekan "Save Cloud" supaya saldo ini aman tersimpan di cloud.`, 'fa-wallet', 'blue');
            }
            // Saldo tersimpan lokal otomatis (saveGame di atas). Save cloud tetap manual lewat tombol "Save Cloud" -
            // di sini cukup tandai kiriman sebagai sudah diklaim supaya tidak muncul lagi di notifikasi.
            await fb.markClaimed(t.id);
        }

        // ===== Bursa P2P: jual-beli truk bekas antar pemain nyata (Firestore) =====
        function startBursaSalesListener() {
            // Uid-scoped (cuma dengar notifikasi truk MILIK SENDIRI yang laku) - murah, tetap nyala sepanjang sesi
            // supaya notifikasi "truk terjual" tetap masuk walau pemain sedang di tab lain.
            if (!window.fb || !currentAccount) return;
            if (!bursaSalesUnsub) bursaSalesUnsub = fb.listenBursaSales(currentAccount.id, list => {
                pendingBursaSales = list.sort((x, y) => (x.created && x.created.seconds || 0) - (y.created && y.created.seconds || 0));
                pendingBursaSales.forEach(s => { if (!bursaSeen.has(s.id)) { bursaSeen.add(s.id); addLog(`BURSA P2P: ${esc(s.buyerCompany)} membeli ${esc(s.truck.name)} [${esc(s.truck.plat)}] seharga ${formatRupiah(s.harga)}. Klaim pembayarannya di tab Bursa P2P.`, 'success'); notify(`Truk ${s.truck.name} terjual seharga ${formatRupiah(s.harga)}. Klaim di Bursa P2P.`, 'info'); } });
                renderBursaClaimBox();
            });
        }
        // Listener daftar lapak terbuka (sampai 200 dokumen, koleksi bersama semua pemain) - broadcast ke
        // semua yang mendengarkan tiap kali ada yang pasang/batal/beli lapak. Sengaja hanya menyala selagi
        // tab Bursa P2P dibuka (lihat switchTab), bukan sepanjang sesi login.
        function startBursaListingsListener() {
            if (!window.fb || !currentAccount) return;
            if (bursaListingsUnsub) return;
            bursaListingsUnsub = fb.listenBursaListings(list => {
                // terbaru di atas; iklan yang baru dipasang (created belum terisi server) dianggap paling baru
                bursaListings = list.sort((a, b) => (b.created ? b.created.seconds : 9e15) - (a.created ? a.created.seconds : 9e15));
                if (!document.getElementById('tab-bursa').classList.contains('hidden')) renderBursa();
            }, e => {
                bursaListingsUnsub = null;   // biar bisa dicoba lagi saat tab dibuka ulang
                showModal('Daftar Bursa Gagal Dimuat', 'Iklan tidak bisa diambil dari server. Coba buka ulang tab Bursa P2P. (' + (e.code || e.message) + ')', 'fa-triangle-exclamation', 'red');
            });
        }
        function stopBursaListingsListener() { if (bursaListingsUnsub) { bursaListingsUnsub(); bursaListingsUnsub = null; } }

        function renderBursaClaimBox() {
            const box = document.getElementById('bursa-claim-box');
            if (!pendingBursaSales.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
            box.classList.remove('hidden');
            box.innerHTML = `<div class="text-[11px] font-bold text-emerald-300 mb-1"><i class="fa-solid fa-hand-holding-dollar mr-1"></i>Pembayaran Truk Terjual (${pendingBursaSales.length})</div>` +
                pendingBursaSales.map(s => `
                <div class="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                    <div class="min-w-0"><div class="text-emerald-300 font-bold text-sm">+${formatRupiah(s.harga)}</div><div class="text-[10px] text-gray-400 truncate">${esc(s.truck.name)} [${esc(s.truck.plat)}] &middot; dibeli ${esc(s.buyerCompany)}</div></div>
                    <button onclick="claimBursaSale('${esc(s.id)}')" ${bursaSaleInflight.has(s.id) || bursaBlocked() ? 'disabled' : ''} class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg shrink-0">${bursaSaleInflight.has(s.id) ? 'Memproses...' : 'Klaim'}</button>
                </div>`).join('');
        }

        async function claimBursaSale(id) {
            const s = pendingBursaSales.find(x => x.id === id);
            if (!s || bursaSaleInflight.has(id)) return;
            if (bursaBlocked()) return showModal('Klaim Ditutup', bursaClosedText() + '\n\nPembayaranmu tidak hilang; klaim lagi setelah Bursa dibuka.', 'fa-store-slash', 'red');   // saklar darurat
            bursaSaleInflight.add(id); renderBursaClaimBox();
            try {
                if (!bursaSaleCredited.has(id)) {   // uang cuma dikreditkan sekali per sesi walau penandaan 'sudah diklaim' perlu diulang
                    bursaSaleCredited.add(id);
                    companyCash += s.harga; totalIncome += s.harga;
                    addFinanceLog(`Bursa P2P: penjualan ${s.truck.name} [${s.truck.plat}] ke ${s.buyerCompany}`, s.harga);
                    updateCashDisplay();
                    addLog(`BURSA P2P: Pembayaran ${formatRupiah(s.harga)} dari ${esc(s.buyerCompany)} untuk ${esc(s.truck.name)} [${esc(s.truck.plat)}] berhasil diklaim.`, 'success');
                }
                await fb.markBursaSaleClaimed(id);
            } catch (e) { console.warn('Klaim bursa gagal:', e); showModal('Klaim Gagal', 'Coba tekan Klaim sekali lagi. (' + (e.code || e.message) + ')', 'fa-triangle-exclamation', 'red'); }
            finally { bursaSaleInflight.delete(id); renderBursaClaimBox(); }
        }

        function renderBursa() {
            if (!currentAccount) return;
            // --- Selector truk milik sendiri yang bisa dijual (tidak sedang bertugas) ---
            const sellSel = document.getElementById('bursa-sell-truck');
            const myListedIds = new Set(bursaListings.filter(l => l.sellerUid === currentAccount.id).map(l => l.truck.id));
            const sellable = companyFleet.filter(t => !busyIds.has(t.id) && !myListedIds.has(t.id) && !perluBalikNama(t));
            sellSel.innerHTML = sellable.map(t => `<option value="${esc(t.id)}">${esc(t.id)} - ${esc(t.name)} [${esc(t.plat)}]</option>`).join('');
            document.getElementById('bursa-sell-empty').classList.toggle('hidden', !!sellable.length);
            sellSel.classList.toggle('hidden', !sellable.length);
            document.getElementById('bursa-sell-price').classList.toggle('hidden', !sellable.length);

            // --- Iklan milik saya ---
            const mine = bursaListings.filter(l => l.sellerUid === currentAccount.id);
            document.getElementById('bursa-mine-list').innerHTML = mine.length ? mine.map(l => `
                <div class="bg-gray-900 border border-gray-800 rounded-lg p-2.5 flex justify-between items-center gap-2">
                    <div class="min-w-0"><div class="font-bold text-gray-200 truncate">${esc(l.truck.name)} <span class="text-amber-400 font-mono">[${esc(l.truck.plat)}]</span></div><div class="text-[10px] text-gray-500">${esc(l.truck.id)} &middot; ${l.truck.type} &middot; ${l.truck.cap} ${l.truck.type === 'LPG' ? 'Ton' : (l.truck.kelas === 'kapal' || l.truck.kelas === 'depo' ? 'Bbl' : 'KL')}</div><div class="text-emerald-400 font-mono font-bold text-xs mt-0.5">${formatRupiah(l.harga)}</div></div>
                    <button onclick="cancelBursaListing('${esc(l.id)}')" class="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1.5 rounded font-bold shrink-0">Batalkan</button>
                </div>`).join('') : '<div class="empty-state"><i class="fa-solid fa-tags"></i>Belum ada iklan aktif.</div>';
            document.getElementById('bursa-mine-list').insertAdjacentHTML('afterbegin', `<div class="text-[10px] text-gray-500 pb-1"><i class="fa-solid fa-tags mr-1"></i>Slot iklan: <b class="text-gray-300">${mine.length}/${bursaSlotMax()}</b>${passHas('bursa') ? ' <span class="text-violet-300">(Pass Juragan)</span>' : ''}</div>`);

            // --- Iklan dari pemain lain ---
            const others = bursaListings.filter(l => l.sellerUid !== currentAccount.id);
            document.getElementById('bursa-other-list').innerHTML = others.length ? others.map(l => `
                <div class="bg-gray-900 border border-gray-800 rounded-lg p-2.5 space-y-1.5">
                    <div class="flex justify-between items-start gap-2">
                        <div class="min-w-0"><div class="font-bold text-gray-200 truncate">${esc(l.truck.name)} <span class="text-amber-400 font-mono">[${esc(l.truck.plat)}]</span></div><div class="text-[10px] text-gray-500 truncate">Penjual: ${esc(l.sellerCompany)}</div><div class="text-[10px] text-gray-500 truncate">Atas nama: ${esc(l.truck.pemilik || l.sellerCompany)} &middot; pembeli wajib balik nama</div></div>
                        <span class="text-[10px] font-bold border rounded px-1.5 py-0.5 shrink-0 ${l.truck.type === 'LPG' ? 'text-amber-400 border-amber-500/40' : 'text-indigo-400 border-indigo-500/40'}">${l.truck.type}</span>
                    </div>
                    <div class="text-[10px] text-gray-400">Kapasitas ${l.truck.cap} ${l.truck.type === 'LPG' ? 'Ton' : (l.truck.kelas === 'kapal' || l.truck.kelas === 'depo' ? 'Bbl' : 'KL')} &middot; Odometer ${l.truck.odometer.toLocaleString('id-ID')} km &middot; ${l.truck.kelas === 'kapal' ? 'Kondisi Mesin' : 'Ban'} ${l.truck.banPct}%</div>
                    <div class="flex justify-between items-center"><span class="text-emerald-400 font-mono font-bold text-sm">${formatRupiah(l.harga)}</span>
                    <button onclick="buyBursaListing('${esc(l.id)}')" ${bursaBuyBusy.has(l.id) || bursaBlocked() ? 'disabled' : ''} class="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold">${bursaBuyBusy.has(l.id) ? 'Memproses...' : 'Beli'}</button></div>
                </div>`).join('') : '<div class="empty-state"><i class="fa-solid fa-store-slash"></i>Belum ada truk dijual pemain lain saat ini.</div>';

            document.getElementById('bursa-badge').innerText = pendingBursaSales.length;
            document.getElementById('bursa-badge').classList.toggle('hidden', !pendingBursaSales.length);
            renderBursaClaimBox();
        }

        // Logika inti pasang iklan jual, dipakai bareng oleh form di tab Bursa P2P
        // dan tombol "Jual ke Bursa P2P" cepat di tiap kartu tab Armada.
        // Batas iklan aktif per pemain: 3 slot biasa, 8 slot dengan Pass Juragan (fitur 'bursa'). Dicek di sisi klien (rules tidak bisa menghitung dokumen).
        const BURSA_SLOT_BASE = 3, BURSA_SLOT_PASS = 8;
        const bursaSlotMax = () => passHas('bursa') ? BURSA_SLOT_PASS : BURSA_SLOT_BASE;
        async function postTruckToBursa(truckId, harga) {
            if (!currentAccount) return false;
            if (bursaBlocked()) { showModal('Bursa P2P Ditutup', bursaClosedText(), 'fa-store-slash', 'red'); return false; }   // saklar darurat
            if (!window.fb) { showModal('Belum Siap', 'Firebase belum siap. Periksa koneksi lalu muat ulang halaman.', 'fa-triangle-exclamation', 'red'); return false; }
            const idx = companyFleet.findIndex(t => t.id === truckId);
            if (idx < 0) { showModal('Pilih Truk', 'Pilih unit truk yang ingin dijual terlebih dahulu.', 'fa-truck', 'red'); return false; }
            if (busyIds.has(truckId)) { showModal('Truk Sedang Bertugas', 'Truk yang sedang dalam perjalanan tidak bisa dijual. Tunggu sampai tiba di depot.', 'fa-truck-fast', 'red'); return false; }
            if (tolakBelumBalikNama(companyFleet[idx])) return false;
            if (!harga || harga < 1000000) { showModal('Harga Tidak Valid', 'Masukkan harga jual minimal Rp 1.000.000.', 'fa-circle-exclamation', 'red'); return false; }
            let used; try { used = await fb.myBursaCount(currentAccount.id); } catch (e) { used = bursaListings.filter(l => l.sellerUid === currentAccount.id).length; }
            if (used >= bursaSlotMax()) { showModal('Slot Iklan Penuh', `Iklan aktifmu sudah ${used}/${bursaSlotMax()}. Batalkan atau tunggu ada yang laku${passHas('bursa') || !PASS_LIVE.includes('juragan') ? '' : ', atau tambah slot dengan Pass Juragan (maks ' + BURSA_SLOT_PASS + ' iklan)'}.`, 'fa-tags', 'amber'); return false; }
            const truck = companyFleet[idx];
            companyFleet.splice(idx, 1);   // truk keluar dari garasi selama iklan aktif
            try {
                await fb.postBursaListing(currentAccount.id, currentAccount.company, truck, harga);
                populateTruckDropdowns(); renderFleetDashboard(); updateCashDisplay(); saveGame();
                addLog(`BURSA P2P: Truk ${truck.id} [${truck.plat}] dipasang di Bursa P2P seharga ${formatRupiah(harga)}.`, 'info');
                notify(`${truck.name} dipasang di Bursa P2P.`, 'info');
                return true;
            } catch (e) {
                companyFleet.push(truck);   // gagal terbit, kembalikan ke garasi
                populateTruckDropdowns(); renderFleetDashboard(); updateCashDisplay();
                showModal('Gagal Memasang Iklan', 'Coba lagi. (' + (e.code || e.message) + ')', 'fa-triangle-exclamation', 'red');
                return false;
            }
        }

        async function submitBursaListing() {
            const truckId = document.getElementById('bursa-sell-truck').value;
            const harga = Math.round(Number(document.getElementById('bursa-sell-price').value));
            const ok = await postTruckToBursa(truckId, harga);
            if (ok) document.getElementById('bursa-sell-price').value = '';
        }

