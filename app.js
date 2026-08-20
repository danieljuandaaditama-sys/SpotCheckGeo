// 1. Setup Peta Leaflet 
const map = L.map('map').setView([-3.0470, 120.2158], 13);

// 2. Tambahkan layer peta dasar dari OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// 3. Masukkan LINK CSV PUBLIK dari Google Sheets kamu di sini
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTYfUrwzyFJ3Kdvz4GHNZ9EUK6gdxd-Vz6GP_0fyAGnyj4X-3NkZfeiRxwM69r34swN6xQa5zrZXR2H/pubhtml'; 

// 4. Proses Ambil Data, BERSIHKAN OTOMATIS, lalu Tampilkan
fetch(csvUrl)
    .then(response => response.text())
    .then(rawCsvText => {
        
        // --- SISTEM PEMBERSIH DATA OTOMATIS (AUTO-CLEANING) ---
        let barisData = rawCsvText.split('\n');
        let barisBersih = barisData.map(baris => {
            let teks = baris.trim();
            // Cek jika seluruh baris "dibungkus" tanda kutip akibat ada koma di nama
            if (teks.startsWith('"') && teks.endsWith('"')) {
                // Buang tanda kutip paling awal dan akhir, lalu ubah "" kembali menjadi "
                teks = teks.slice(1, -1).replace(/""/g, '"');
            }
            return teks;
        });
        
        // Gabungkan kembali data yang sudah bersih
        let csvBersih = barisBersih.join('\n');
        // ------------------------------------------------------

        // 5. Berikan data yang sudah bersih ke PapaParse
        Papa.parse(csvBersih, {
            header: true,
            skipEmptyLines: true, // Abaikan jika ada baris kosong
            complete: function(results) {
                const data = results.data;
                
                // Variabel untuk menghitung KPI
                let total = 0, usaha = 0, campuran = 0, tinggal = 0;

                // Looping setiap baris data
                data.forEach(row => {
                    // Pastikan data memiliki latitude dan longitude
                    if (row.geotag_latitude && row.geotag_longitude) {
                        total++;

                        // Logika penentuan warna & perhitungan KPI
                        let markerColor = "#3b82f6"; // Default Biru

                        if (row.kode_bang_label === "1. Bangunan Khusus Usaha") {
                            usaha++;
                            markerColor = "#10b981"; // Hijau
                        } else if (row.kode_bang_label === "2. Bangunan Campuran") {
                            campuran++;
                            markerColor = "#f97316"; // Orange
                        } else if (row.kode_bang_label === "3. Bangunan Tempat Tinggal") {
                            tinggal++;
                            markerColor = "#8b5cf6"; // Ungu
                        }

                        // Tambahkan titik (CircleMarker) ke peta
                        L.circleMarker([row.geotag_latitude, row.geotag_longitude], {
                            radius: 5,
                            fillColor: markerColor,
                            color: "#ffffff",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        })
                        .bindPopup(`
                            <b>Jenis:</b> ${row.kode_bang_label}<br>
                            <b>Nama KK/Usaha:</b> ${row.nama_usaha || row.nama_kepala_keluarga || '-'}<br>
                            <b>Akurasi:</b> ${row.geotag_accuracy}m
                        `)
                        .addTo(map);
                    }
                });

                // 6. Update angka di Kartu KPI pada halaman web
                document.getElementById('total-data').innerText = total;
                document.getElementById('total-usaha').innerText = usaha;
                document.getElementById('total-campuran').innerText = campuran;
                document.getElementById('total-tinggal').innerText = tinggal;
            }
        });
    })
    .catch(error => {
        console.error("Gagal mengambil atau memproses data:", error);
    });
