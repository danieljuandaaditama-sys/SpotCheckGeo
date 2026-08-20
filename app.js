// 1. Setup Peta Leaflet (Fokus di sekitar koordinat Sulawesi)
const map = L.map('map').setView([-3.0470, 120.2158], 13);

// 2. Tambahkan layer peta dasar dari OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// 3. Baca Data CSV menggunakan PapaParse
const csvUrl = 'Titik Koordinat SE 11-08.csv'; // Pastikan nama file sama persis

Papa.parse(csvUrl, {
    download: true,
    header: true,
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

        // 4. Update angka di Kartu KPI pada halaman web
        document.getElementById('total-data').innerText = total;
        document.getElementById('total-usaha').innerText = usaha;
        document.getElementById('total-campuran').innerText = campuran;
        document.getElementById('total-tinggal').innerText = tinggal;
    }
});
