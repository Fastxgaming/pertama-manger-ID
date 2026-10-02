        // ===== WILAYAH NUSANTARA: [provinsi, prefix kode, [[kota, lat, lon, jumlah SPBU]]] =====
        const WILAYAH = [
          ['Jawa Timur','JT',[['Malang',-7.9797,112.6304,6],['Kediri',-7.848,112.0178,5],['Jember',-8.1845,113.6681,5],['Madiun',-7.6298,111.5239,4],['Mojokerto',-7.4726,112.4338,4],['Lamongan',-7.1167,112.4167,4],['Blitar',-8.0983,112.1681,4],['Pamekasan',-7.1568,113.4825,4]]],
          ['Jawa Tengah','JG',[['Semarang',-6.9667,110.4167,7],['Surakarta (Solo)',-7.5666,110.8283,6],['Magelang',-7.4797,110.2177,4],['Pekalongan',-6.8886,109.6753,4],['Tegal',-6.8694,109.1402,4],['Purwokerto',-7.4242,109.2396,5],['Kudus',-6.8048,110.8405,4],['Cilacap',-7.7188,109.0154,4]]],
          ['Jawa Barat','JB',[['Bandung',-6.9175,107.6191,7],['Cirebon',-6.7063,108.5571,5],['Tasikmalaya',-7.3274,108.2207,4],['Sukabumi',-6.9277,106.93,4],['Karawang',-6.3015,107.302,5],['Subang',-6.5715,107.7587,4],['Garut',-7.2279,107.9087,4]]],
          ['Jakarta & Jabodetabek','JK',[['Jakarta Pusat',-6.1865,106.8341,6],['Jakarta Utara',-6.1384,106.8632,6],['Jakarta Barat',-6.1683,106.7588,6],['Jakarta Selatan',-6.2615,106.8106,6],['Jakarta Timur',-6.225,106.9004,6],['Bogor',-6.5971,106.806,5],['Depok',-6.4025,106.7942,5],['Tangerang',-6.1783,106.6319,6],['Tangerang Selatan',-6.2885,106.718,5],['Bekasi',-6.2383,106.9756,6]]],
          ['Bali','BL',[['Denpasar',-8.6705,115.2126,6],['Badung (Kuta)',-8.722,115.1694,5],['Gianyar',-8.5449,115.3255,4],['Singaraja',-8.112,115.0882,4],['Tabanan',-8.5386,115.125,4],['Karangasem',-8.45,115.61,3]]],
          ['Sulawesi Utara','SU',[['Manado',1.4748,124.8421,6],['Bitung',1.4404,125.1917,4],['Tomohon',1.33,124.8333,3],['Kotamobagu',0.7333,124.3167,3]]],
          ['Sulawesi Tengah','ST',[['Palu',-0.8917,119.8707,5],['Poso',-1.395,120.752,3],['Luwuk',-0.95,122.787,3],['Donggala',-0.681,119.742,3]]],
          ['Sulawesi Barat','SB',[['Mamuju',-2.674,118.888,4],['Majene',-3.54,118.97,3],['Polewali Mandar',-3.432,119.343,3]]],
['Sulawesi Selatan','SS',[['Makassar',-5.1477,119.4327,7],['Gowa',-5.2159,119.4497,4],['Maros',-4.9887,119.5713,3],['Parepare',-4.0135,119.6255,3]]],
          ['Kalimantan','KL',[['Balikpapan (Kaltim)',-1.2379,116.8529,6],['Samarinda (Kaltim)',-0.5022,117.1536,5],['Bontang (Kaltim)',0.1333,117.5,3],['Banjarmasin (Kalsel)',-3.3186,114.5944,5],['Banjarbaru (Kalsel)',-3.442,114.83,3],['Pontianak (Kalbar)',-0.0263,109.3425,5],['Singkawang (Kalbar)',0.906,108.987,3],['Palangka Raya (Kalteng)',-2.2161,113.9135,4],['Sampit (Kalteng)',-2.533,112.95,3],['Tarakan (Kaltara)',3.3,117.6333,3]]],
          ['Jawa Timur','JT',[['Probolinggo',-7.7543,113.2159,4],['Lumajang',-8.1335,113.2246,4],['Bondowoso',-7.9135,113.8219,3]]]
        ];
        const JALAN = ['Jl. Jend. Sudirman','Jl. A. Yani','Jl. Diponegoro','Jl. Gatot Subroto','Jl. Raya Utara','Jl. Pahlawan','Jl. Imam Bonjol','Jl. Veteran','Jl. Merdeka','Jl. Pemuda','Jl. Hasanuddin','Jl. Ahmad Dahlan','Jl. Lingkar Kota','Jl. Trans Regional'];
        (function buildWilayah() {
            let ci = 300;
            WILAYAH.forEach(([prov, pfx, cities]) => cities.forEach(([kota, lat, lon, n]) => {
                let seed = ci * 7919 + 13; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
                const jl = JALAN.slice().sort(() => rand() - 0.5);
                const list = [];
                for (let k = 0; k < n; k++) list.push({ kode: `${pfx}-${ci}-${String(k + 1).padStart(2, '0')}`, nama: `SPBU ${jl[k % jl.length]} ${kota.replace(/ \(.*\)/, '')}`, lat: +(lat + (rand() - 0.5) * 0.09).toFixed(6), lon: +(lon + (rand() - 0.5) * 0.09).toFixed(6), tipe: rand() < 0.45 ? 'COCO' : 'DODO' });
                rawSpbuData.push({ kabupaten_kota: kota, provinsi: prov, total_spbu: n, list_spbu: list });
                ci++;
            }));
        })();


        // ===== KOORDINAT SPBU NYATA (update v1.9.1) =====
        // Menggantikan koordinat acak/lama per wilayah. Urutan SPBU = urutan di data baru: SPBU ke-1 tiap wilayah = COCO,
        // 3 SPBU pertama auto-aktif (aturan di initSpbuDatabase). Kode SPBU lama dipertahankan berurutan agar save lama tetap cocok.
        // Format: [nama, kecamatan, lat, lon, jenis]. Nama dibuat acak (fiktif). jenis: 'SPBU' (BBM saja), 'SPBU+LPG' (BBM + LPG), 'SPPBE' (outlet LPG saja, tanpa BBM). Wilayah gabungan memakai urutan kota seperti data baru (mis. Banyuwangi lalu Situbondo).
        const SPBU_REAL = {
          "Situbondo & Banyuwangi": [
            ["SPBU Nusa Barokah", "Kabat", -8.294528550115846, 114.30919289991299, "SPBU"],
            ["SPBU Rejeki Abadi", "Rogojampi", -8.345260349215872, 114.28146623295137, "SPBU+LPG"],
            ["SPBU Mulia Agung", "Rogojampi", -8.406679216792112, 114.25803599444153, "SPBU+LPG"],
            ["SPBU Artha Utama", "Gambiran", -8.4068569707597, 114.16654698916707, "SPBU"],
            ["SPBU Maju Perkasa", "Tegalsari", -8.355553265602143, 114.13045963001883, "SPBU"],
            ["SPBU Gemilang Agung", "Kalibaru", -8.29788121121832, 113.99681316304299, "SPBU"],
            ["SPBU Citra Agung", "Wongsorejo", -7.981400865474921, 114.39720526354832, "SPBU"],
            ["SPBU Sinar Jaya", "Wongsorejo", -8.065583309254793, 114.41852178400126, "SPBU"],
            ["SPBU Graha Agung", "Kalipuro", -8.114634528531175, 114.40111227505378, "SPBU"],
            ["SPBU Sentosa Makmur", "Kalipuro", -8.152322005978117, 114.39667693044291, "SPBU"],
            ["SPBU Bintang Bersama", "Banyuputih", -7.759293666506102, 114.26358449946062, "SPBU"],
            ["SPPBE Makmur Bersama", "Asembagus", -7.7496085301842585, 114.22314381972751, "SPPBE"],
            ["SPPBE Mitra Sentral", "Arjasa", -7.726054183014699, 114.13314612147036, "SPPBE"],
            ["SPBU Berkah Sentral", "Kapongan", -7.694507508954372, 114.09356590027491, "SPBU"],
            ["SPBU Bumi Putra", "Kapongan", -7.692470528461476, 114.0526897257424, "SPBU+LPG"],
            ["SPBU Mitra Putra", "Panji", -7.702634597293347, 114.01644643181598, "SPBU+LPG"],
            ["SPBU Graha Abadi", "Situbondo", -7.708722382296338, 113.9869381052842, "SPBU"],
            ["SPBU Pelita Sentral", "Situbondo", -7.7212473632585015, 114.01290549887275, "SPBU+LPG"],
            ["SPBU Karya Makmur", "Situbondo", -7.744525077149933, 114.00920690503293, "SPBU+LPG"],
            ["SPBU Sentosa Perkasa", "Panarukan", -7.69948255350714, 113.95000755788617, "SPBU+LPG"],
            ["SPBU Dwi Mandiri", "Kendit", -7.702773016682775, 113.92086641806793, "SPBU+LPG"],
            ["SPBU Jaya Sakti", "Bungatan", -7.6860018164388775, 113.84575027393967, "SPBU+LPG"],
            ["SPBU Tri Energi", "Suboh", -7.7335617376179435, 113.73888713884598, "SPBU+LPG"],
            ["SPBU Pelita Agung", "Banyuglugur", -7.7355557625320905, 113.67872019263125, "SPBU"],
            ["SPPBE Sentosa Sentral", "Banyuglugur", -7.724465475173304, 113.62025270354367, "SPPBE"],
          ],
          "Probolinggo": [
            ["SPBU Berkah Permai", "Paiton", -7.71804722399329, 113.52787290970848, "SPBU"],
            ["SPBU Artha Jaya", "Paiton", -7.7243715896468075, 113.48866857607958, "SPBU+LPG"],
            ["SPBU Citra Permai", "Kraksaan", -7.748403710257895, 113.4486009505055, "SPBU+LPG"],
            ["SPBU Sinar Mulya", "Kraksaan", -7.761977097113269, 113.40005026867267, "SPBU"],
            ["SPBU Harapan Putra", "Pajarakan", -7.788025447528841, 113.33820302935536, "SPBU"],
            ["SPBU Karya Indah", "Gending", -7.793181734288814, 113.29856399952584, "SPBU+LPG"],
            ["SPBU Bintang Sakti", "Mayangan", -7.753605328621049, 113.20101742207079, "SPBU"],
            ["SPPBE Dwi Utama", "Tongas", -7.731504243791255, 113.1084208616107, "SPPBE"],
            ["SPBU Harapan Barokah", "Tongas", -7.720632686030209, 113.0873023590229, "SPBU+LPG"],
          ],
          "Lumajang": [
            ["SPBU Dwi Indah", "Klakah", -7.959174476488481, 113.25731182219715, "SPBU"],
            ["SPBU Surya Sejahtera", "Klakah", -7.984838837091098, 113.25056823825608, "SPBU+LPG"],
            ["SPBU Maju Sejahtera", "Klakah", -8.01540393733869, 113.24029995030152, "SPBU+LPG"],
            ["SPBU Mitra Indah", "Kedungjajang", -8.079750094623611, 113.24128529089145, "SPBU"],
            ["SPBU Bumi Raya", "Pasirian", -8.225292170656001, 113.14202209959922, "SPBU+LPG"],
            ["SPBU Berkah Energi", "Pasirian", -8.221554451508524, 113.12013527398952, "SPBU"],
            ["SPPBE Bintang Persada", "Randuagung", -8.106054737322522, 113.273870525904, "SPPBE"],
          ],
          "Jember": [
            ["SPBU Cahaya Raya", "Sumberbaru", -8.12602447681533, 113.37735596463881, "SPBU"],
            ["SPPBE Gemilang Jaya", "Bangsalsari", -8.201788029948226, 113.54421650766884, "SPPBE"],
            ["SPPBE Rejeki Makmur", "Rambipuji", -8.207414602194012, 113.59684736230847, "SPPBE"],
            ["SPBU Lestari Perkasa", "Patrang", -8.135041882838788, 113.73769446631213, "SPBU+LPG"],
            ["SPBU Sentosa Sejahtera", "Arjasa", -8.116038965729654, 113.7488839410885, "SPBU"],
            ["SPBU Dwi Bersama", "Jelbuk", -8.052702061570645, 113.77586882038514, "SPBU+LPG"],
            ["SPBU Tunas Prima", "Silo", -8.204982773686227, 113.89088385186821, "SPBU"],
            ["SPBU Rejeki Agung", "Silo", -8.18037514625522, 113.86469094564707, "SPBU"],
            ["SPBU Rejeki Jaya", "Mayang", -8.171198500550904, 113.79338318382995, "SPBU+LPG"],
            ["SPBU Sumber Indah", "Pakusari", -8.188236374031382, 113.75368958408079, "SPBU+LPG"],
            ["SPBU Graha Prima", "Kaliwates", -8.173486937179996, 113.70390615481276, "SPBU"],
          ],
          "Bondowoso": [
            ["SPBU Berkah Perkasa", "Maesan", -8.034436845304471, 113.77606761768567, "SPBU"],
            ["SPBU Sinar Prima", "Bondowoso", -7.938899311909135, 113.81248824715581, "SPBU"],
            ["SPBU Pelita Perkasa", "Bondowoso", -7.921157379464293, 113.82724284650624, "SPBU+LPG"],
            ["SPPBE Artha Barokah", "Bondowoso", -7.906216226674293, 113.80851988725328, "SPPBE"],
            ["SPBU Sumber Raya", "Tapen", -7.874276116225654, 113.91481022327272, "SPBU+LPG"],
            ["SPBU Artha Makmur", "Klabang", -7.818104679730761, 113.96551690628662, "SPBU"],
          ],
          "Malang": [
            ["SPBU Maju Putra", "Blimbing", -7.952476328295437, 112.63932311534481, "SPBU"],
            ["SPBU Tri Indah", "Lowokwaru", -7.938252412363456, 112.62846958544084, "SPBU+LPG"],
            ["SPBU Bintang Utama", "Blimbing", -7.920650804371876, 112.6524398242814, "SPBU"],
            ["SPBU Tri Abadi", "Blimbing", -7.933282167406489, 112.65857144315389, "SPBU+LPG"],
            ["SPBU Mitra Perkasa", "Klojen", -7.941995522265401, 112.64936610179652, "SPBU"],
            ["SPBU Tri Agung", "Klojen", -7.977909804364812, 112.62402718290913, "SPBU"],
            ["SPBU Harapan Bersama", "Sukun", -7.986254576402634, 112.6267337310274, "SPBU+LPG"],
            ["SPPBE Gemilang Mandiri", "Turen", -8.184749837491445, 112.69912133689195, "SPPBE"],
            ["SPBU Rejeki Prima", "Lowokwaru", -7.920723241128588, 112.59513356576021, "SPBU+LPG"],
          ],
          "Blitar": [
            ["SPBU Jaya Agung", "Sananwetan", -8.082120679466417, 112.19563680453211, "SPBU"],
            ["SPBU Sinar Utama", "Sananwetan", -8.089780580201722, 112.18557028183815, "SPBU+LPG"],
            ["SPBU Berkah Abadi", "Kepanjenkidul", -8.094810287041833, 112.17542298416245, "SPBU+LPG"],
            ["SPPBE Sentosa Abadi", "Kepanjenkidul", -8.09079781663393, 112.17046868573645, "SPPBE"],
            ["SPBU Karya Mandiri", "Sukorejo", -8.088814147495968, 112.15507813339366, "SPBU+LPG"],
            ["SPBU Sumber Energi", "Sukorejo", -8.09849470271439, 112.14535297286626, "SPBU+LPG"],
            ["SPBU Tirta Agung", "Sukorejo", -8.112519199287798, 112.15603222842294, "SPBU"],
            ["SPBU Tri Sentral", "Kepanjenkidul", -8.113965531147933, 112.16444311725606, "SPBU"],
            ["SPBU Citra Raya", "Sukorejo", -8.122167501896476, 112.1534392311424, "SPBU+LPG"],
            ["SPPBE Karya Abadi", "Kademangan", -8.134963322444031, 112.13402963851546, "SPPBE"],
            ["SPBU Bintang Mulya", "Bendo", -8.082841284980976, 112.12123314660079, "SPBU"],
            ["SPBU Surya Permai", "Srengat", -8.064917621473002, 112.09501451558707, "SPBU"],
          ],
          "Kediri": [
            ["SPBU Sinar Agung", "Gampengrejo", -7.753866804198056, 112.03240126662665, "SPBU"],
            ["SPBU Tunas Mandiri", "Gampengrejo", -7.778296332897353, 112.01677088836298, "SPBU+LPG"],
            ["SPBU Nusa Abadi", "Banyakan", -7.774166628257126, 111.98696962461473, "SPBU"],
            ["SPBU Lestari Prima", "Kota", -7.802413141390284, 112.03528318734732, "SPBU+LPG"],
            ["SPBU Cahaya Makmur", "Grogol", -7.841563860342133, 112.03051202742922, "SPBU"],
            ["SPPBE Maju Persada", "Ngadiluwih", -7.871475467355005, 112.00044818475507, "SPPBE"],
            ["SPBU Cahaya Sakti", "Pesantren", -7.865679308705777, 112.02870011270608, "SPBU+LPG"],
          ],
          "Mojokerto": [
            ["SPBU Harapan Makmur", "Bangsal", -7.497676921774949, 112.47960869004551, "SPBU"],
            ["SPPBE Harapan Perkasa", "Mojoanyar", -7.492589631197489, 112.44998280914962, "SPPBE"],
            ["SPBU Rejeki Sentral", "Magersari", -7.487325859581721, 112.44897859476829, "SPBU"],
            ["SPBU Rejeki Sakti", "Mojosari", -7.45546539926269, 112.45946206400471, "SPBU"],
            ["SPBU Tunas Energi", "Magersari", -7.463378446643327, 112.4581528208969, "SPBU"],
            ["SPBU Gemilang Permai", "Gedek", -7.456423911579512, 112.39692410707882, "SPBU+LPG"],
            ["SPBU Tirta Putra", "Sooko", -7.5277883335162175, 112.41136701093784, "SPBU+LPG"],
            ["SPBU Maju Barokah", "Sooko", -7.512063467539992, 112.42873875997518, "SPBU+LPG"],
            ["SPBU Anugerah Prima", "Prajurit Kulon", -7.462187513251722, 112.43980046819178, "SPBU+LPG"],
          ],
          "Surabaya & Sidoarjo (Hub Perak)": [
            ["SPBU Mitra Bersama", "Candi", -7.493540070914927, 112.71056362975742, "SPBU"],
            ["SPBU Lestari Sejahtera", "Sidoarjo", -7.470377859903423, 112.71412258155684, "SPBU+LPG"],
            ["SPBU Sumber Bersama", "Sidoarjo", -7.441228698348478, 112.72015514267518, "SPBU+LPG"],
            ["SPBU Harapan Sejahtera", "Buduran", -7.4139326791043745, 112.72514305162798, "SPBU"],
            ["SPBU Artha Persada", "Gedangan", -7.3950375641312345, 112.72718341571733, "SPBU"],
            ["SPPBE Citra Sakti", "Gedangan", -7.372119505169364, 112.72869559173233, "SPPBE"],
            ["SPBU Sumber Sejahtera", "Sukodono", -7.397158355058913, 112.69836471444755, "SPBU"],
            ["SPBU Mitra Mulya", "Tulangan", -7.444449880883604, 112.69161289683628, "SPBU"],
            ["SPBU Bintang Indah", "Sidoarjo", -7.449643623470262, 112.67416568000736, "SPBU+LPG"],
            ["SPPBE Dwi Prima", "Sukodono", -7.417648927080391, 112.69406685331379, "SPPBE"],
            ["SPBU Graha Persada", "Sukodono", -7.402870567751259, 112.67259352690449, "SPBU"],
            ["SPPBE Cahaya Energi", "Taman", -7.378895308076, 112.62793677342927, "SPPBE"],
            ["SPBU Graha Energi", "Taman", -7.37135612465705, 112.64788479572744, "SPBU+LPG"],
            ["SPBU Sinar Raya", "Dukuh Pakis", -7.284377443769625, 112.69115143199485, "SPBU"],
            ["SPBU Anugerah Mandiri", "Gayungan", -7.333925761385721, 112.72952822381326, "SPBU+LPG"],
            ["SPBU Rejeki Sejahtera", "Wonokromo", -7.306442110948681, 112.76010200849493, "SPBU+LPG"],
            ["SPBU Makmur Indah", "Wonokromo", -7.296473894654297, 112.74248225889932, "SPBU+LPG"],
            ["SPBU Tirta Jaya", "Bulak", -7.241788873411768, 112.75734648777065, "SPBU+LPG"],
            ["SPBU Artha Permai", "Bubutan", -7.245393889306864, 112.72945838513573, "SPBU"],
            ["SPBU Lestari Raya", "Mulyorejo", -7.278331200633965, 112.80764027846524, "SPBU"],
          ],
          "Pamekasan": [
            ["SPBU Berkah Prima", "Pasean", -6.8959543182628, 113.53673715020456, "SPBU"],
            ["SPBU Pelita Mandiri", "Pamekasan", -7.204370241702016, 113.46875800587333, "SPBU"],
            ["SPPBE Bumi Energi", "Larangan", -7.12523096966495, 113.49927529513049, "SPPBE"],
            ["SPBU Citra Indah", "Sampang", -7.217576160801571, 113.3101585362846, "SPBU+LPG"],
            ["SPBU Tunas Mulya", "Sampang", -7.182439123619356, 113.23448213869034, "SPBU+LPG"],
            ["SPBU Anugerah Mulya", "Torjun", -7.11904664174456, 113.11738985540167, "SPBU+LPG"],
            ["SPBU Lestari Putra", "Jrengik", -7.095939212707637, 113.10900944195399, "SPBU"],
            ["SPBU Harapan Indah", "Blega", -7.125876995757557, 112.99040924652039, "SPBU"],
            ["SPBU Jaya Energi", "Tanah Merah", -7.070264909212006, 112.82706372656003, "SPBU"],
            ["SPBU Sentosa Permai", "Bangkalan", -7.000862943805464, 112.77481041625933, "SPBU+LPG"],
            ["SPPBE Cahaya Perkasa", "Bangkalan", -7.043938187670988, 112.73787511899113, "SPPBE"],
          ],
          "Lamongan": [
            ["SPBU Citra Prima", "Deket", -7.122784720744675, 112.46992449389653, "SPBU"],
            ["SPBU Tirta Barokah", "Deket", -7.115163471211121, 112.43241609453358, "SPBU"],
            ["SPBU Pelita Mulya", "Lamongan", -7.131163157413038, 112.41366004489822, "SPBU+LPG"],
            ["SPBU Harapan Utama", "Lamongan", -7.119471772886261, 112.4058202069319, "SPBU"],
            ["SPBU Mitra Agung", "Lamongan", -7.104235396776595, 112.37943784699915, "SPBU+LPG"],
            ["SPBU Artha Mandiri", "Sukodadi", -7.096091051303827, 112.34108464291751, "SPBU"],
            ["SPPBE Mulia Raya", "Babat", -7.100168020321461, 112.23295442671652, "SPPBE"],
            ["SPBU Anugerah Raya", "Sugio", -7.155421611843022, 112.29847722406653, "SPBU+LPG"],
          ],
          "Tuban & Bojonegoro (Area Kilang Utama)": [
            ["SPBU Anugerah Abadi", "Palang", -6.899747517864766, 112.15550988393124, "SPBU"],
            ["SPBU Maju Jaya", "Palang", -6.900131841810727, 112.1157957708352, "SPBU"],
            ["SPBU Mulia Prima", "Semanding", -6.9341914794489075, 112.09657402022597, "SPBU+LPG"],
            ["SPBU Berkah Sakti", "Semanding", -6.970485012676109, 112.1029324858656, "SPBU+LPG"],
            ["SPBU Mulia Persada", "Tuban", -6.906286579726952, 112.0725211922847, "SPBU+LPG"],
            ["SPBU Berkah Makmur", "Tuban", -6.90332475768272, 112.08016058937706, "SPBU"],
            ["SPBU Anugerah Sentral", "Jenu", -6.894446858351522, 112.03936043631197, "SPBU+LPG"],
            ["SPPBE Anugerah Barokah", "Jenu", -6.851187240246499, 112.0201826484226, "SPPBE"],
            ["SPBU Anugerah Jaya", "Jenu", -6.820693842759729, 111.966510408243, "SPBU"],
            ["SPBU Harapan Energi", "Sumberrejo", -7.1773961197678515, 112.00019713529282, "SPBU+LPG"],
            ["SPBU Bintang Perkasa", "Balen", -7.184421857161076, 111.98477915342433, "SPBU"],
            ["SPBU Rejeki Mulya", "Balen", -7.193634238535473, 111.95636553432855, "SPBU"],
            ["SPBU Dwi Sejahtera", "Kapas", -7.191363403320852, 111.92165026390406, "SPBU"],
            ["SPPBE Lestari Barokah", "Kapas", -7.173442807617903, 111.89882292464789, "SPPBE"],
            ["SPPBE Cahaya Sejahtera", "Kalitidu", -7.144840006750923, 111.8271791101463, "SPPBE"],
            ["SPBU Bintang Prima", "Kalitidu", -7.129689283041766, 111.77891776832804, "SPBU+LPG"],
            ["SPBU Makmur Jaya", "Kalitidu", -7.130824595590851, 111.74058528209775, "SPBU+LPG"],
          ],
          "Madiun": [
            ["SPBU Sumber Perkasa", "Madiun", -7.593196438933991, 111.5375604211456, "SPBU"],
            ["SPBU Surya Indah", "Sawahan", -7.608946734922007, 111.5512998168929, "SPBU+LPG"],
            ["SPBU Nusa Raya", "Manguharjo", -7.610705573600822, 111.50952855210559, "SPBU"],
            ["SPBU Berkah Sejahtera", "Jiwan", -7.625320452724023, 111.49804248824304, "SPBU+LPG"],
            ["SPBU Karya Jaya", "Kartoharjo", -7.62415383546858, 111.53445720716398, "SPBU+LPG"],
            ["SPPBE Lestari Bersama", "Jiwan", -7.6185910901119565, 111.4833893754554, "SPPBE"],
            ["SPBU Tunas Abadi", "Wungu", -7.556949999311984, 111.55066076409987, "SPBU"],
          ],
          "Surakarta (Solo)": [
            ["SPBU Tunas Barokah", "Jebres", -7.564881625163938, 110.85787282082991, "SPBU"],
            ["SPBU Bumi Jaya", "Jebres", -7.559281712678663, 110.84865824028455, "SPBU+LPG"],
            ["SPBU Sentosa Indah", "Jebres", -7.544054516138469, 110.83995633241007, "SPBU"],
            ["SPBU Rejeki Bersama", "Banjarsari", -7.545586804994716, 110.8072886273435, "SPBU+LPG"],
            ["SPBU Harapan Prima", "Banjarsari", -7.554041162206177, 110.79863581942129, "SPBU"],
            ["SPPBE Bumi Sentral", "Laweyan", -7.562667544870707, 110.7921889562708, "SPPBE"],
            ["SPBU Bumi Prima", "Kartasura", -7.561042161265418, 110.76459211370204, "SPBU"],
            ["SPBU Bumi Mulya", "Banjarsari", -7.531197966072241, 110.81896616657295, "SPBU+LPG"],
            ["SPBU Sentosa Jaya", "Colomadu", -7.53467061868513, 110.79239063576549, "SPBU+LPG"],
          ],
        };
        (function applySpbuReal() {
            const pfxOf = r => (r.list_spbu[0] && r.list_spbu[0].kode.split('-').slice(0, 2).join('-')) || 'JT-000';
            const usedKode = new Set(); rawSpbuData.forEach(r => r.list_spbu.forEach(x => usedKode.add(x.kode)));
            rawSpbuData.forEach(region => {
                const real = SPBU_REAL[region.kabupaten_kota];
                if (!real) return; // wilayah yang tidak ada di data baru (mis. Ngawi, kota luar Jatim) tidak diubah
                const oldList = region.list_spbu, pfx = pfxOf(region);
                const nextKode = () => { let n = 50; while (usedKode.has(`${pfx}-${n}`)) n++; const k = `${pfx}-${n}`; usedKode.add(k); return k; };
                region.list_spbu = real.map(([nama, kecamatan, lat, lon, jenis], i) => ({
                    kode: oldList[i] ? oldList[i].kode : nextKode(),
                    nama, kecamatan, lat, lon, jenis,
                    tipe: i === 0 ? 'COCO' : 'DODO'
                }));
                region.total_spbu = region.list_spbu.length;
            });
        })();

        // Depo/TBBM regional (dibeli pemain, jadi titik berangkat truk terdekat)
        refineryData.push(...[['TBBM Plumpang Jakarta',-6.1216,106.8967,25e9,'JKb'],['TBBM Tanjung Emas Semarang',-6.949,110.426,18e9,'SMb'],['TBBM Padalarang Bandung',-6.84,107.48,15e9,null],['TBBM Manggis Bali',-8.5,115.52,18e9,'MGb'],['TBBM Bitung Sulut',1.45,125.19,16e9,'BTb'],['TBBM Donggala Sulteng',-0.66,119.74,15e9,'DGb'],['Depo Mamuju Sulbar',-2.67,118.89,12e9,'MMb'],['TBBM Balikpapan Kaltim',-1.27,116.8,22e9,'BPb'],['TBBM Banjarmasin Kalsel',-3.29,114.57,15e9,'BJb'],['TBBM Pontianak Kalbar',-0.04,109.32,15e9,'PTb'],['Depo Palangka Raya Kalteng',-2.25,113.9,12e9,null],['Depo Tarakan Kaltara',3.31,117.62,14e9,'TKb'],['TBBM Makassar Sulsel',-5.14,119.43,20e9,'MKb'],['TBBM Ketapang Banyuwangi',-8.134972996171921,114.39943366088116,20e9,'KTb']]
            .map((d, i) => ({ id: 'KILANG-' + String(4 + i).padStart(2, '0'), nama: d[0], tipe: 'Depo Cabang BBM', lat: d[1], lon: d[2], berth: d[4], is_unlocked: false, stok_current: 0, stok_max: 100000, unit: 'Bbl', harga_beli: d[3] * 2, mekanikId: null })));

        // TBBM Ketapang Banyuwangi (KILANG-17) melayani BBM sekaligus LPG (unit gauge tetap Bbl untuk BBL mentah).
        refineryData.forEach(k => { if (k.nama === 'TBBM Ketapang Banyuwangi') k.tipe = 'Depo Cabang BBM & LPG'; });

        // Tangki BBL mentah depo cabang BBM = 50% dari Kilang Utama Tuban (5.000.000 Bbl -> 2.500.000 Bbl). Depo LPG murni (Gresik) tidak memakai tangki ini.
        const DEPO_BBL_RATIO = 0.5, DEPO_BBL_MAX0 = Math.round(refineryData[0].stok_max * DEPO_BBL_RATIO);
        refineryData.forEach((k, i) => { if (i > 0 && String(k.tipe).includes('BBM')) k.stok_max = DEPO_BBL_MAX0; });

        // ===== KAPASITAS DEPO PER JENIS PRODUK (Pusat & Cabang) =====
        // Setiap Kilang/Depo kini punya tangki terpisah per jenis BBM & LPG, masing-masing bisa di-upgrade sendiri.
        // refineRatio = jumlah Bbl bahan mentah yang dibutuhkan untuk mengolah 1 unit produk ini (BBM pakai rasio Bbl->KL yang sama dengan ECO.bblPerKl, LPG disamakan 1:1 seperti konvensi transfer kapal/darat).
        // refineRate  = sisa dari desain lama, tidak dipakai lagi untuk kecepatan; BBL->BBM sekarang diproses manual lewat tombol Konversi (lihat convertBblKeProduk & BBL_CONVERT_STEP).
        const PRODUCT_META = {
            pertalite:      { label: 'Pertalite',      unit: 'KL',  icon: 'fa-gas-pump',       color: '#22c55e', step: 3000, baseCost: 900e6,  refineRatio: ECO.bblPerKl, refineRate: 40 },
            pertamax:       { label: 'Pertamax',       unit: 'KL',  icon: 'fa-gas-pump',       color: '#3b82f6', step: 2500, baseCost: 950e6,  refineRatio: ECO.bblPerKl, refineRate: 30 },
            pertamax_turbo: { label: 'Pertamax Turbo', unit: 'KL',  icon: 'fa-bolt',           color: '#a855f7', step: 1500, baseCost: 1100e6, refineRatio: ECO.bblPerKl, refineRate: 18 },
            solar:          { label: 'Solar',          unit: 'KL',  icon: 'fa-oil-can',        color: '#f59e0b', step: 3000, baseCost: 850e6,  refineRatio: ECO.bblPerKl, refineRate: 40 },
            dexlite:        { label: 'Dexlite',        unit: 'KL',  icon: 'fa-oil-can',        color: '#06b6d4', step: 2000, baseCost: 1000e6, refineRatio: ECO.bblPerKl, refineRate: 22 },
            lpg_curah:      { label: 'LPG Curah',      unit: 'Ton', icon: 'fa-truck-ramp-box', color: '#f97316', step: 5250, baseCost: 4200e6 },   // upgrade tangki ikut skala 3,5x (1.500 -> 5.250 Ton/level, Rp 1,2 M -> 4,2 M) supaya biaya per Ton kapasitas tetap Rp 800 rb. Harga beli LPG Curah dinamis: lpgCurahPrice() di 04a-pasar-harga.js
            lpg_tabung:     { label: 'LPG Tabung',     unit: 'Ton', icon: 'fa-dolly',          color: '#ef4444', step: 1200, baseCost: 1050e6 }
        };
        // Ukuran sekali klik tombol "Konversi BBL -> BBM" (BBL diolah manual lewat tombol, bukan otomatis lagi).
        const BBL_CONVERT_STEP = { pertalite: 5000, pertamax: 4000, pertamax_turbo: 2000, solar: 5000, dexlite: 3000 };
        const REFINE_TICK_MS = 2000; // dipakai untuk durasi kedip animasi "Diolah" saat tombol konversi diklik
        const KAP_GROUP = {
            'Pusat Utama': Object.keys(PRODUCT_META),
            'Depo Cabang BBM': ['pertalite', 'pertamax', 'pertamax_turbo', 'solar', 'dexlite'],
            'Depo Cabang LPG': ['lpg_curah', 'lpg_tabung'],
            'Depo Cabang BBM & LPG': ['pertalite', 'pertamax', 'pertamax_turbo', 'solar', 'dexlite', 'lpg_curah', 'lpg_tabung']
        };
        // Tangki LPG Tabung: Tuban 200.000 Ton, depo cabang 100.000 Ton. Tangki LPG Curah: Tuban 700.000 Ton, depo cabang 350.000 Ton. Stok awal Tuban: LPG Curah 560.000 Ton (80% tangki), LPG Tabung 6.000 Ton (bukan penuh).
        const LPG_TUBAN_MAX0 = 200000, LPG_DEPO_MAX0 = Math.round(LPG_TUBAN_MAX0 * DEPO_BBL_RATIO), LPG_TUBAN_START_STOK = 6000,
              LPG_CURAH_TUBAN_MAX0 = 700000, LPG_CURAH_DEPO_MAX0 = Math.round(LPG_CURAH_TUBAN_MAX0 * DEPO_BBL_RATIO), LPG_CURAH_START_STOK = Math.round(LPG_CURAH_TUBAN_MAX0 * 0.8),   // tangki LPG CURAH: Tuban 700.000 Ton, depo cabang 50% (350.000 Ton), stok awal 80% (560.000 Ton). LPG Tabung tetap memakai LPG_TUBAN_MAX0/LPG_DEPO_MAX0
              BBM_TUBAN_START_STOK = 5000; // BBM_TUBAN_START_STOK = stok awal tiap jenis BBM jadi di Tuban (KL); kapasitas tangki tetap 40.000
        function initKapasitasDepo() {
            refineryData.forEach(k => {
                if (k.kap) return;
                const keys = KAP_GROUP[k.tipe] || [];
                k.kap = {};
                keys.forEach(key => {
                    const isLpg = key.startsWith('lpg');
                    const curah = key === 'lpg_curah';
                    const startMax = k.tipe === 'Pusat Utama' ? (curah ? LPG_CURAH_TUBAN_MAX0 : isLpg ? LPG_TUBAN_MAX0 : 40000) : (curah ? LPG_CURAH_DEPO_MAX0 : isLpg ? LPG_DEPO_MAX0 : 15000);
                    k.kap[key] = { max: startMax, cur: 0, level: 0 };
                });
                if (k.id === 'KILANG-01') {
                    // Awal main: BBM jadi Tuban 5.000 KL per jenis, LPG curah 560.000 Ton (80% tangki), LPG tabung 6.000 Ton (bukan penuh).
                    Object.entries(k.kap).forEach(([key, s]) => { s.cur = key === 'lpg_curah' ? Math.min(s.max, LPG_CURAH_START_STOK) : key.startsWith('lpg') ? Math.min(s.max, LPG_TUBAN_START_STOK) : Math.min(s.max, BBM_TUBAN_START_STOK); });
                }
            });
        }
        initKapasitasDepo();

        // ===== KOTAK NOTIFIKASI (sistem + klaim top up) =====
        let notifs = [], notifUnread = 0, pendingTopups = [];
        // ===== EFEK SUARA (Web Audio API, nada sintetis - tanpa file audio eksternal, ringan & offline) =====
        let audioCtx = null, soundEnabled = true;
        try { const sv = localStorage.getItem('pmid_sound'); if (sv !== null) soundEnabled = sv === '1'; } catch (e) { /* localStorage tidak tersedia, default nyala */ }
        function getAudioCtx() {
            if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            return audioCtx;
        }
        // Buka/kunci AudioContext sedini mungkin lewat interaksi pertama pengguna (kebijakan autoplay browser).
        document.addEventListener('click', () => getAudioCtx(), { once: true });
        function beep(freq, durMs, type, startDelay, vol) {
            if (!soundEnabled) return;
            const ctx = getAudioCtx();
            if (!ctx) return;
            const t0 = ctx.currentTime + (startDelay || 0);
            const osc = ctx.createOscillator(), gain = ctx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(vol || 0.15, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
            osc.connect(gain).connect(ctx.destination);
            osc.start(t0); osc.stop(t0 + durMs / 1000 + 0.03);
        }
        // Notifikasi/alert: nada lembut naik utk info, nada dua-ketuk lebih tegas utk peringatan (warn).
        function playSoundNotif(level) {
            if (level === 'warn') { beep(660, 150, 'square', 0, 0.12); beep(440, 220, 'square', 0.16, 0.12); }
            else { beep(880, 130, 'sine', 0, 0.11); beep(1180, 150, 'sine', 0.08, 0.11); }
        }
        // Truk/kapal berangkat: nada rendah naik pendek. Truk/kapal tiba: nada tiga-ketuk naik (lebih ceria).
        function playSoundDepart() { beep(392, 90, 'triangle', 0, 0.13); beep(523, 140, 'triangle', 0.08, 0.13); }
        function playSoundArrive() { beep(659, 100, 'sine', 0, 0.13); beep(784, 100, 'sine', 0.09, 0.13); beep(988, 180, 'sine', 0.18, 0.13); }
        function renderSoundBtn() {
            const b = document.getElementById('sound-toggle-btn');
            if (b) b.innerHTML = soundEnabled ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
        }
        function toggleSound() {
            soundEnabled = !soundEnabled;
            try { localStorage.setItem('pmid_sound', soundEnabled ? '1' : '0'); } catch (e) { /* abaikan kalau localStorage diblokir */ }
            renderSoundBtn();
            if (soundEnabled) playSoundNotif('info');
        }
        renderSoundBtn();

        function notify(text, level) {
            playSoundNotif(level);
            notifs.unshift({ text, level: level || 'info', t: gameStamp() });
            if (notifs.length > 30) notifs.pop();
            notifUnread++; renderNotif();
        }
        function clearNotif() { notifs = []; notifUnread = 0; renderNotif(); }
        function toggleNotif() {
            const pn = document.getElementById('notif-panel'); pn.classList.toggle('hidden');
            if (!pn.classList.contains('hidden')) { notifUnread = 0; renderNotif(); positionNotifPanel(); }
        }
        // FIX BUG panel lonceng di HP: hitung ulang posisi top panel = tepat di bawah header
        // (bukan cuma di bawah ikon), supaya tidak menimpa/kepotong saat header pecah 2 baris.
        function positionNotifPanel() {
            const header = document.querySelector('header');
            const btn = document.querySelector('#notif-wrap > button');
            const isMobile = window.matchMedia('(max-width: 767.98px)').matches;
            const top = (!isMobile && btn) ? btn.getBoundingClientRect().bottom + 8 : (header ? header.getBoundingClientRect().bottom + 6 : 64);
            document.documentElement.style.setProperty('--notif-panel-top', top + 'px');
        }
        window.addEventListener('resize', () => {
            const pn = document.getElementById('notif-panel');
            if (pn && !pn.classList.contains('hidden')) positionNotifPanel();
        });
        document.addEventListener('click', e => { if (!e.target.closest('#notif-wrap')) document.getElementById('notif-panel').classList.add('hidden'); });
        function renderNotif() {
            const n = pendingTopups.length + notifUnread, bd = document.getElementById('notif-badge');
            bd.textContent = n > 99 ? '99+' : n; bd.classList.toggle('hidden', !n);
            document.getElementById('notif-sys').innerHTML = notifs.length ? notifs.map(x => `<div class="rounded-lg border px-2.5 py-1.5 ${x.level === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-gray-950 border-gray-800 text-gray-300'}"><div class="text-[9px] text-gray-500">${esc(x.t)}</div>${esc(x.text)}</div>`).join('') : '<div class="text-gray-600 px-1">Tidak ada notifikasi sistem.</div>';
        }
        // ===== TAB LOG: pisahkan log Aktivitas umum dari log Truk & Perjalanan =====
        let activeLogTab = 'general', truckLogUnread = 0;
        function switchLogTab(tab) {
            activeLogTab = tab;
            document.getElementById('activity-log').classList.toggle('hidden', tab !== 'general');
            document.getElementById('truck-log').classList.toggle('hidden', tab !== 'truck');
            document.getElementById('logtab-btn-general').className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition ' + (tab === 'general' ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300');
            document.getElementById('logtab-btn-truck').className = 'text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition relative ' + (tab === 'truck' ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300');
            if (tab === 'truck') { truckLogUnread = 0; }
            renderTruckBadge();
        }
        function renderTruckBadge() {
            const bd = document.getElementById('truck-log-badge');
            bd.textContent = truckLogUnread > 99 ? '99+' : truckLogUnread;
            bd.classList.toggle('hidden', !truckLogUnread || activeLogTab === 'truck');
        }
        // cat: 'general' (default, semua aktivitas non-truk) atau 'truck' (khusus log berangkat/tiba/bongkar muatan)
        function addLog(msg, type = 'info', cat = 'general') {
            if (type === 'warning' || /^(PERINGATAN|PAJAK|CLOUD|PEMBELIAN BBM)/.test(msg)) notify(msg, type === 'warning' ? 'warn' : 'info');
            if (cat === 'truck') {
                if (/^BERANGKAT/.test(msg)) playSoundDepart();
                else if (/^(TIBA:|TIBA DI DEPOT|SANDAR)/.test(msg)) playSoundArrive();
            }
            const container = document.getElementById(cat === 'truck' ? 'truck-log' : 'activity-log');
            const div = document.createElement('div');
            const now = gameStamp();
            div.innerText = `[${now}] ${msg}`;
            if (type === 'success') div.className = 'text-green-400';
            else if (type === 'purple') div.className = 'text-purple-400';
            else if (type === 'warning') div.className = 'text-amber-400';
            else div.className = 'text-gray-300';
            container.prepend(div);
            if (cat === 'truck' && activeLogTab !== 'truck') { truckLogUnread++; renderTruckBadge(); }
        }

        // Toast singkat mengambang di atas layar (mis. konfirmasi "UID berhasil disalin"), hilang otomatis
        function showToast(text, ok = true) {
            const wrap = document.getElementById('toast-wrap');
            const el = document.createElement('div');
            el.className = 'toast-item ' + (ok ? 'ok' : 'err');
            el.innerHTML = `<i class="fa-solid ${ok ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i><span>${esc(text)}</span>`;
            wrap.appendChild(el);
            setTimeout(() => el.remove(), 2000);
        }
        async function copyAcctUid() {
            const uid = currentAccount ? currentAccount.id : '';
            if (!uid) return;
            try {
                if (navigator.clipboard) await navigator.clipboard.writeText(uid);
                else throw new Error('no-clipboard');
                showToast('UID berhasil disalin.');
            } catch (e) { showToast('Gagal menyalin UID, salin manual ya.', false); }
        }

        // Isi pesan modal secara aman: hanya <b>...</b>, <br>, dan baris baru (\n) yang dirender sebagai format.
        // Semua teks lain (termasuk nama/plat dari pemain) tetap dimasukkan sebagai teks biasa, jadi tidak bisa menyisipkan HTML.
        function setModalMessage(el, message) {
            el.textContent = '';
            let bold = null;
            String(message).split(/(<\/?b>|<br\s*\/?>|\n)/i).forEach(part => {
                if (!part) return;
                const tag = part.toLowerCase();
                if (tag === '<b>') { bold = document.createElement('b'); el.appendChild(bold); }
                else if (tag === '</b>') { bold = null; }
                else if (tag === '\n' || /^<br/.test(tag)) (bold || el).appendChild(document.createElement('br'));
                else (bold || el).appendChild(document.createTextNode(part));
            });
        }

        function showModal(title, message, iconClass = 'fa-handshake', theme = 'purple') {
            document.getElementById('modal-title').innerText = title;
            setModalMessage(document.getElementById('modal-message'), message);
            
            const iconEl = document.getElementById('modal-icon');
            iconEl.className = `fa-solid ${iconClass}`;

            const iconBg = document.getElementById('modal-icon-bg');
            if (theme === 'blue') {
                iconBg.className = "w-14 h-14 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-blue-500/30";
            } else if (theme === 'red') {
                iconBg.className = "w-14 h-14 bg-red-600/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-red-500/30";
            } else {
                iconBg.className = "w-14 h-14 bg-purple-600/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-purple-500/30";
            }

            document.getElementById('custom-modal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('custom-modal').classList.add('hidden');
        }

        // ===== Konfirmasi kustom (pengganti confirm() bawaan browser) =====
        const CONFIRM_THEMES = {
            amber: { bg: 'w-14 h-14 bg-amber-600/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-amber-500/30', btn: 'bg-amber-600 hover:bg-amber-700' },
            red: { bg: 'w-14 h-14 bg-red-600/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-red-500/30', btn: 'bg-red-600 hover:bg-red-700' },
            blue: { bg: 'w-14 h-14 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl border border-blue-500/30', btn: 'bg-blue-600 hover:bg-blue-700' }
        };
        let _confirmResolve = null;
        function showConfirm(message, opts = {}) {
            const { title = 'Konfirmasi', iconClass = 'fa-triangle-exclamation', theme = 'amber', okLabel = 'OK', cancelLabel = 'Batal' } = opts;
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;
            document.getElementById('confirm-ok-btn').textContent = okLabel;
            document.getElementById('confirm-cancel-btn').textContent = cancelLabel;
            document.getElementById('confirm-icon').className = `fa-solid ${iconClass}`;
            const t = CONFIRM_THEMES[theme] || CONFIRM_THEMES.amber;
            document.getElementById('confirm-icon-bg').className = t.bg;
            document.getElementById('confirm-ok-btn').className = 'flex-1 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-lg ' + t.btn;
            document.getElementById('confirm-modal').classList.remove('hidden');
            return new Promise(resolve => { _confirmResolve = resolve; });
        }
        function _confirmDone(v) {
            document.getElementById('confirm-modal').classList.add('hidden');
            if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(v); }
        }

