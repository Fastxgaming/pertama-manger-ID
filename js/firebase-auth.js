    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
    import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
    import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
             sendPasswordResetEmail, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider, deleteUser, updateProfile
           } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc, deleteDoc, serverTimestamp, collection, query, where, onSnapshot, updateDoc, getDocs, orderBy, limit, writeBatch, runTransaction
           } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyCDtefVgfEl_Q-NFjrJOg7jB1lIusHFFLM",
        authDomain: "migas-manager-indonesia.firebaseapp.com",
        projectId: "migas-manager-indonesia",
        storageBucket: "migas-manager-indonesia.firebasestorage.app",
        messagingSenderId: "678967562740",
        appId: "1:678967562740:web:b19c87b0a2032a7589a9a1",
        measurementId: "G-YBSB580XD6"
    };
    const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
    // Analytics bersifat opsional; tidak boleh mengganggu game jika gagal (mis. dibuka via file://)
    isSupported().then(ok => { if (ok) getAnalytics(app); }).catch(() => {});
    auth.languageCode = 'id'; // email reset password berbahasa Indonesia

    window.fb = {
        async register(email, pw, prof) {
            window.__regBusy = true;
            let user = null;
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, pw);
                user = cred.user;
                try { await updateProfile(user, { displayName: prof.company }); } catch (e) {}
                // Klaim kode perusahaan WAJIB berhasil dulu - keunikannya dijamin oleh Firestore Rules
                // (allow create hanya kalau dokumen companyCodes/{code} belum ada). Kalau gagal (mis. kode
                // ini "direbut" pemain lain persis di detik yang sama), akun Auth yang baru dibuat langsung
                // dihapus lagi (rollback) supaya tidak ada akun nyangkut tanpa kode perusahaan yang valid.
                await setDoc(doc(db, 'companyCodes', prof.code), { uid: user.uid, created: serverTimestamp() });
                try { await setDoc(doc(db, 'users', user.uid), { ...prof, email, created: serverTimestamp() }); } catch (e) { console.warn('Firestore:', e); }
                // Kirim email verifikasi (memakai template di Firebase Console). Gagal kirim TIDAK membatalkan
                // pendaftaran - pemain bisa minta kirim ulang lewat tombol Masuk.
                try { await sendEmailVerification(user); } catch (e) { console.warn('Kirim email verifikasi gagal:', e); }
                return { user, profile: prof };
            } catch (err) {
                if (user) { try { await deleteUser(user); } catch (e) { console.warn('Rollback user gagal:', e); } }
                throw err;
            } finally { window.__regBusy = false; }
        },
        saveCloud: (uid, data, ts) => setDoc(doc(db, 'saves', uid), { data, ts }),
        async loadSave(uid) { const s = await getDoc(doc(db, 'saves', uid)); return s.exists() ? s.data() : null; },
        deleteSave: uid => deleteDoc(doc(db, 'saves', uid)),
        // Buku besar pajak (anti-curang): taxledger/{uid}/lines/{sid}. Rules hanya membolehkan angka NAIK, jadi taxSync
        // membaca dulu lalu menulis nilai maksimum (klien yang angkanya lebih rendah tidak ditolak, hanya dinaikkan).
        async taxLoad(uid, sid) { const s = await getDoc(doc(db, 'taxledger', uid, 'lines', sid)); return s.exists() ? s.data() : null; },
        async taxSync(uid, sid, v) {
            const ref = doc(db, 'taxledger', uid, 'lines', sid);
            let old = null; try { const s = await getDoc(ref); old = s.exists() ? s.data() : null; } catch (e) {}
            const m = k => Math.max(Number(v[k]) || 0, old ? (Number(old[k]) || 0) : 0);
            return setDoc(ref, { billed: m('billed'), fine: m('fine'), paid: m('paid'), income: m('income'), expense: m('expense'), gt: m('gt'), upd: serverTimestamp() });
        },
        // Login WAJIB email terverifikasi (Firestore Rules juga menolak akses tanpa email_verified).
        // Kalau belum terverifikasi: kirim ulang link verifikasi, keluar, lalu lempar error 'app/email-not-verified'.
        async login(email, pw) {
            window.__regBusy = true;   // tahan onAuthStateChanged supaya tidak memulai sesi sebelum dicek
            try {
                const cred = await signInWithEmailAndPassword(auth, email, pw);
                try { await cred.user.reload(); } catch (e) {}   // bisa jadi sudah diverifikasi di tab/perangkat lain
                if (!cred.user.emailVerified) {
                    try { await sendEmailVerification(cred.user); } catch (e) { console.warn('Kirim ulang verifikasi gagal:', e); }
                    await signOut(auth);
                    const err = new Error('EMAIL_NOT_VERIFIED'); err.code = 'app/email-not-verified'; throw err;
                }
                try { await cred.user.getIdToken(true); } catch (e) {}   // perbarui token agar klaim email_verified ikut terbaca Rules
                window.__regBusy = false;
                await handleUser(cred.user);
            } finally { window.__regBusy = false; }
        },
        out: () => signOut(auth),
        publishStats: (uid, d) => setDoc(doc(db, 'leaderboard', uid), { ...d, updated: serverTimestamp() }),
        listenBoard: cb => onSnapshot(query(collection(db, 'leaderboard'), orderBy('cash', 'desc'), limit(50)), sn => cb(sn.docs.map(x => ({ uid: x.id, ...x.data() }))), e => console.warn('Listener leaderboard:', e)),
        listenVerified: cb => onSnapshot(collection(db, 'verified'), sn => { const m = {}; sn.docs.forEach(x => { m[x.id] = x.data().until || 0; }); cb(m); }, e => console.warn('Listener verified:', e)),
        // Top up manual: pemain kirim bukti bayar via WhatsApp, admin mengirim saldo memakai UID pemain
        listenTopups: (uid, cb) => onSnapshot(query(collection(db, 'topups'), where('uid', '==', uid), where('status', '==', 'paid'), where('claimed', '==', false)),
            snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn('Listener top up:', e)),
        isAdmin: uid => getDoc(doc(db, 'admins', uid)).then(x => x.exists()).catch(() => false),
        checkBanned: uid => getDoc(doc(db, 'banned', uid)).then(x => x.exists() ? x.data() : null).catch(() => null),
        // Real-time: pantau dokumen banned/{uid} selama sesi berjalan, supaya blokir yang dijatuhkan admin
        // langsung menendang pemain yang SEDANG online, tanpa perlu tunggu login berikutnya.
        listenBanned: (uid, cb) => onSnapshot(doc(db, 'banned', uid), snap => cb(snap.exists() ? snap.data() : null), e => console.warn('Listener banned:', e)),
        banPlayer: (adminUid, uid, days, reason) => setDoc(doc(db, 'banned', uid), { permanent: !days, until: days ? Date.now() + days * 86400000 : null, reason: reason || '', by: adminUid, updated: serverTimestamp() }),
        unbanPlayer: uid => deleteDoc(doc(db, 'banned', uid)),
        lookupPlayer: uid => getDoc(doc(db, 'leaderboard', uid)).then(x => x.exists() ? x.data() : null),
        // Cek kode perusahaan (3-4 huruf, dicetak di Surat Jalan) sudah dipakai pemain lain atau belum.
        // Ini cuma pengecekan awal untuk UX (best-effort, dibaca publik dari koleksi companyCodes yang
        // memang tidak berisi data sensitif) - keunikan yang SEBENARNYA dijamin oleh Firestore Rules saat
        // fb.register() mencoba "mengklaim" kode ini (lihat companyCodes di bawah).
        isCompanyCodeTaken: code => getDoc(doc(db, 'companyCodes', code)).then(s => s.exists()).catch(() => false),
        recentGrants: () => getDocs(query(collection(db, 'topups'), orderBy('created', 'desc'), limit(10))).then(sn => sn.docs.map(d => ({ id: d.id, ...d.data() }))),
        async adminGrant(adminUid, uid, pkg, note) {
            const id = 'ADM-' + Date.now() + '-' + uid.slice(0, 6);
            const b = writeBatch(db);   // atomik: saldo + centang biru berhasil bersamaan atau tidak sama sekali
            b.set(doc(db, 'topups', id), { uid, pkgId: pkg.id, cash: pkg.cash, price: pkg.price, days: pkg.days, status: 'paid', claimed: false, created: serverTimestamp(), paidAt: serverTimestamp(), by: adminUid, note: note || '' });
            // Kalau days = 0 (mode "hanya saldo"), dokumen centang biru TIDAK disentuh sama sekali -
            // centang biru pemain tidak ikut diperpanjang/diaktifkan lewat kiriman ini.
            if (pkg.days > 0) {
                const vref = doc(db, 'verified', uid), v = await getDoc(vref);
                const base = Math.max(Date.now(), v.exists() ? (v.data().until || 0) : 0);
                b.set(vref, { until: base + pkg.days * 86400000, updated: serverTimestamp() });
            }
            await b.commit(); return id;
        },
        // Pass: hanya admin yang boleh menulis (lihat firestore.rules); pemain cukup mendengarkan dokumennya sendiri.
        adminGrantPass: async (adminUid, uid, tier, days) => {
            const ref = doc(db, 'passes', uid), v = await getDoc(ref), cur = v.exists() && v.data().tier === tier ? (v.data().until || 0) : 0;
            const b = writeBatch(db); b.set(ref, { tier, until: Math.max(Date.now(), cur) + days * 86400000, by: adminUid, updated: serverTimestamp() }); await b.commit();
        },
        listenPass: (uid, cb) => onSnapshot(doc(db, 'passes', uid), s => cb(s.exists() ? s.data() : null), e => console.warn('Listener pass:', e)),
        // Jumlah iklan Bursa aktif milik pemain (dicek di server supaya batas slot tetap akurat walau listener Bursa sedang mati)
        myBursaCount: uid => getDocs(query(collection(db, 'bursa'), where('sellerUid', '==', uid), where('status', '==', 'open'))).then(sn => sn.size),
        // Isi BBL cabang (khusus admin): admin menulis perintah, klien pemain menerapkannya otomatis lalu menandai selesai.
        adminFillBbl: async (adminUid, uid) => {
            const id = 'FILL-' + Date.now() + '-' + uid.slice(0, 6), b = writeBatch(db);
            b.set(doc(db, 'fills', id), { uid, type: 'bbl_cabang', claimed: false, created: serverTimestamp(), by: adminUid }); await b.commit(); return id;
        },
        listenFills: (uid, cb) => onSnapshot(query(collection(db, 'fills'), where('uid', '==', uid), where('claimed', '==', false)),
            snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn('Listener fills:', e)),
        markFillClaimed: id => updateDoc(doc(db, 'fills', id), { claimed: true, claimedAt: serverTimestamp() }),
        markClaimed: id => updateDoc(doc(db, 'topups', id), { claimed: true, claimedAt: serverTimestamp() }),
        // ===== BROADCAST: notifikasi admin ke semua pemain, tersimpan permanen di Firestore =====
        // Kenapa bukan push notification (FCM)? Proyek ini belum menyiapkan service worker/VAPID key.
        // Solusinya: setiap dokumen broadcast disimpan permanen, lalu tiap klien mengambil broadcast yang
        // ID/waktunya lebih baru dari "terakhir dilihat" (disimpan di localStorage per akun) begitu mereka
        // login/refresh - jadi pemain yang sedang offline tetap otomatis menerimanya nanti, kapan pun mereka
        // login berikutnya, tanpa perlu online saat admin mengirim.
        sendBroadcast: (adminUid, message, level) => setDoc(doc(collection(db, 'broadcasts')), { message, level: level || 'info', by: adminUid, created: serverTimestamp() }),
        recentBroadcasts: () => getDocs(query(collection(db, 'broadcasts'), orderBy('created', 'desc'), limit(5))).then(sn => sn.docs.map(d => ({ id: d.id, ...d.data() }))),
        // Dipanggil sekali per sesi (bukan realtime) - cukup ambil status saat login/refresh, tidak perlu
        // listener terus-menerus untuk pengumuman yang sifatnya tidak mendesak seperti ini.
        fetchNewBroadcasts: () => getDocs(query(collection(db, 'broadcasts'), orderBy('created', 'desc'), limit(20))).then(sn => sn.docs.map(d => ({ id: d.id, ...d.data() }))),
        // "Terakhir dilihat" disimpan di Firestore (dokumen users/{uid}), BUKAN localStorage, supaya kalau
        // pemain login dari HP lalu dari laptop, status "sudah dilihat"-nya tersinkron - tidak dobel per perangkat.
        markBroadcastSeen: (uid, ts) => setDoc(doc(db, 'users', uid), { lastBroadcastSeen: ts }, { merge: true }),
        // ===== Bursa P2P: jual-beli unit truk bekas antar pemain nyata =====
        // Tanpa orderBy supaya TIDAK butuh composite index (status + created); urutan dibuat di sisi client.
        listenBursaListings: (cb, onErr) => onSnapshot(query(collection(db, 'bursa'), where('status', '==', 'open'), limit(200)),
            sn => cb(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.warn('Listener bursa:', e); if (onErr) onErr(e); }),
        postBursaListing(sellerUid, sellerCompany, truck, harga) {
            const ref = doc(collection(db, 'bursa'));
            return setDoc(ref, { sellerUid, sellerCompany, truck, harga, status: 'open', created: serverTimestamp() }).then(() => ref.id);
        },
        cancelBursaListing: id => deleteDoc(doc(db, 'bursa', id)),
        // Transaksi atomik: cegah 2 pembeli membeli iklan yang sama secara bersamaan
        buyBursaListing: (listingId, buyerUid, buyerCompany) => runTransaction(db, async tx => {
            const ref = doc(db, 'bursa', listingId), snap = await tx.get(ref);
            if (!snap.exists() || snap.data().status !== 'open') throw new Error('SOLD');
            const data = snap.data();
            if (data.sellerUid === buyerUid) throw new Error('SELF');
            tx.update(ref, { status: 'sold', buyerUid, buyerCompany, soldAt: serverTimestamp() });
            const tradeRef = doc(collection(db, 'bursa_trades'));
            tx.set(tradeRef, { listingId, sellerUid: data.sellerUid, sellerCompany: data.sellerCompany, buyerUid, buyerCompany, truck: data.truck, harga: data.harga, claimed: false, created: serverTimestamp() });
            return data;
        }),
        listenBursaSales: (uid, cb) => onSnapshot(query(collection(db, 'bursa_trades'), where('sellerUid', '==', uid), where('claimed', '==', false)),
            sn => cb(sn.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.warn('Listener bursa_trades:', e)),
        markBursaSaleClaimed: id => updateDoc(doc(db, 'bursa_trades', id), { claimed: true, claimedAt: serverTimestamp() }),
        // ===== Tender Blok Nasional: rebutan hak lelang antar pemain nyata (siapa lebih dulu, atomik) =====
        // Dokumen blok_claims/{kunciBlok} hanya bisa DIBUAT sekali (tidak ada update), jadi transaksi ini menjamin satu pemenang rebutan.
        claimBlok: (key, uid, company) => runTransaction(db, async tx => {
            const ref = doc(db, 'blok_claims', key), snap = await tx.get(ref);
            if (snap.exists()) return { ok: false, mine: snap.data().uid === uid, by: snap.data().company || 'pemain lain' };
            tx.set(ref, { uid, company: String(company || '').slice(0, 40), created: serverTimestamp() });
            return { ok: true };
        }),
        listenBlokClaims: (cb, onErr) => onSnapshot(query(collection(db, 'blok_claims'), orderBy('created', 'desc'), limit(60)),
            sn => cb(sn.docs.map(d => ({ key: d.id, ...d.data() }))), e => { console.warn('Listener blok_claims:', e); if (onErr) onErr(e); }),
        resetPassword: email => sendPasswordResetEmail(auth, email),
        reauth: pw => reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, pw)),
        async deleteAccount() {
            const u = auth.currentUser;
            const uid = u.uid, step = async (nama, fn) => { try { await fn(); } catch (e) { console.warn('Hapus akun - ' + nama + ' gagal:', e); } };
            let kode = ''; await step('baca profil', async () => { const s = await getDoc(doc(db, 'users', uid)); kode = s.exists() ? (s.data().code || '') : ''; });
            // Iklan Bursa yang masih terbuka ikut dibatalkan (kalau dibiarkan, pembeli bisa "membeli" dari penjual yang sudah tidak ada).
            await step('iklan bursa', async () => { const sn = await getDocs(query(collection(db, 'bursa'), where('sellerUid', '==', uid), where('status', '==', 'open'))); await Promise.all(sn.docs.map(d => deleteDoc(d.ref))); });
            await step('klaim blok', async () => { const sn = await getDocs(query(collection(db, 'blok_claims'), where('uid', '==', uid))); await Promise.all(sn.docs.map(d => deleteDoc(d.ref))); });
            await step('save cloud', () => deleteDoc(doc(db, 'saves', uid)));
            await step('leaderboard', () => deleteDoc(doc(db, 'leaderboard', uid)));
            if (kode) await step('kode perusahaan', () => deleteDoc(doc(db, 'companyCodes', kode)));   // kode dibebaskan lagi
            // URUTAN PENTING: profil users/{uid} dihapus DULU, karena rules taxledger baru mengizinkan hapus setelah profil tidak ada.
            await step('profil', () => deleteDoc(doc(db, 'users', uid)));
            await step('buku besar pajak', async () => { const sn = await getDocs(collection(db, 'taxledger', uid, 'lines')); await Promise.all(sn.docs.map(d => deleteDoc(d.ref))); });
            await deleteUser(u);
        }
    };

    async function handleUser(user) {
        let prof = null;
        try { const snap = await getDoc(doc(db, 'users', user.uid)); prof = snap.exists() ? snap.data() : null; } catch (e) {}
        authChecked = true;
        window.fbSession(user, prof || { company: user.displayName || user.email, owner: '-' }, false);
    }

    // Sesi login otomatis dipulihkan Firebase saat halaman dibuka lagi
    onAuthStateChanged(auth, async user => {
        if (window.__regBusy) return;
        if (!user) { authChecked = true; maybeFinish(); return; }
        // Akun lama / sesi yang belum terverifikasi: cek ulang ke server, kalau tetap belum -> keluarkan.
        try { await user.reload(); } catch (e) {}
        if (!user.emailVerified) {
            try { await signOut(auth); } catch (e) {}
            authChecked = true; maybeFinish();
            if (window.fbNeedVerify) window.fbNeedVerify();
            return;
        }
        try { await user.getIdToken(true); } catch (e) {}
        await handleUser(user);
    });
