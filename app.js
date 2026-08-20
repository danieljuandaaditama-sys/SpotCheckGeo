// 1. Inisialisasi Peta
const mapDashboard = L.map('map').setView([-3.0470, 120.2158], 13);
const mapSmart = L.map('smart-map').setView([-3.0470, 120.2158], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapDashboard);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapSmart);

// 2. Fungsi Pindah Tab
function switchTab(tabName) {
    document.getElementById('tab-dashboard').classList.add('hidden');
    document.getElementById('tab-map').classList.add('hidden');
    document.getElementById('tab-data').classList.add('hidden');
    
    document.getElementById('btn-dashboard').classList.remove('tab-active');
    document.getElementById('btn-map').classList.remove('tab-active');
    document.getElementById('btn-data').classList.remove('tab-active');

    document.getElementById('tab-' + tabName).classList.remove('hidden');
    document.getElementById('btn-' + tabName).classList.add('tab-active');

    // Perbaikan Leaflet agar tidak error saat ganti tab
    setTimeout(() => { 
        mapDashboard.invalidateSize(); 
        mapSmart.invalidateSize();
    }, 200);
}

// ==========================================
// 3. PENGOLAHAN DATA & LOGBOOK
// ==========================================
const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTYfUrwzyFJ3Kdvz4GHNZ9EUK6gdxd-Vz6GP_0fyAGnyj4X-3NkZfeiRxwM69r34swN6xQa5zrZXR2H/pubhtml'; // <--- GANTI LINK INI

// Dummy Target (Bisa kamu ubah nilainya)
const TARGET = { total: 20000, usaha: 3000, campuran: 5000, tinggal: 12000 };

fetch(csvUrl)
    .then(response => response.text())
    .then(rawCsvText => {
        let barisBersih = rawCsvText.split('\n').map(baris => {
            let teks = baris.trim();
            if (teks.startsWith('"') && teks.endsWith('"')) {
                teks = teks.slice(1, -1).replace(/""/g, '"');
            }
            return teks;
        });
        
        Papa.parse(barisBersih.join('\n'), {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                const data = results.data;
                
                // Variabel Hitung KPI & Logbook
                let total = 0, usaha = 0, campuran = 0, tinggal = 0;
                let logbookData = {}; // Menyimpan rekap harian
                let tableData = []; // Menyimpan data untuk tabel DataTables

                let latestDate = "Belum Ada Data";

                data.forEach(row => {
                    // Masukkan ke array Tabel
                    tableData.push([
                        row.id_subsls || "-",
                        row.nama_usaha || row.nama_kepala_keluarga || "-",
                        row.kode_bang_label || "-",
                        row.jenis_prelist || "-",
                        row.geotag_accuracy || "-",
                        row.assignment_date_modified || "-"
                    ]);

                    // Cari Tanggal Terakhir untuk Disclaimer
                    if (row.assignment_date_modified) {
                        let dateOnly = row.assignment_date_modified.split(" ")[0];
                        if (latestDate === "Belum Ada Data" || row.assignment_date_modified > latestDate) {
                            latestDate = row.assignment_date_modified;
                        }
                        
                        // Kumpulkan data untuk Logbook Harian
                        if(!logbookData[dateOnly]) {
                            logbookData[dateOnly] = { total: 0, usaha: 0, campuran: 0, tinggal: 0 };
                        }
                        logbookData[dateOnly].total++;
                    }

                    if (row.geotag_latitude && row.geotag_longitude) {
                        total++;
                        let markerColor = "#3b82f6";
                        
                        if (row.kode_bang_label === "1. Bangunan Khusus Usaha") {
                            usaha++; markerColor = "#10b981";
                            if(row.assignment_date_modified) logbookData[row.assignment_date_modified.split(" ")[0]].usaha++;
                        } else if (row.kode_bang_label === "2. Bangunan Campuran") {
                            campuran++; markerColor = "#f97316";
                            if(row.assignment_date_modified) logbookData[row.assignment_date_modified.split(" ")[0]].campuran++;
                        } else if (row.kode_bang_label === "3. Bangunan Tempat Tinggal") {
                            tinggal++; markerColor = "#a855f7"; // Ungu
                            if(row.assignment_date_modified) logbookData[row.assignment_date_modified.split(" ")[0]].tinggal++;
                        }

                        // Fitur: Ukuran Bubble (Radius) berdasar Geotag Accuracy
                        // Semakin besar angkanya, semakin tidak akurat (kita beri radius lebih besar/berbeda)
                        let acc = parseFloat(row.geotag_accuracy) || 10;
                        let bubbleRadius = acc > 50 ? 8 : (acc > 20 ? 5 : 3); 

                        // Gambar di Peta Dashboard
                        L.circleMarker([row.geotag_latitude, row.geotag_longitude], {
                            radius: bubbleRadius, fillColor: markerColor, color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.7
                        }).addTo(mapDashboard);

                        // Gambar di Peta Smart Map (Nanti bisa ditambah filter interaktif di sini)
                        L.circleMarker([row.geotag_latitude, row.geotag_longitude], {
                            radius: bubbleRadius, fillColor: markerColor, color: "#fff", weight: 1, opacity: 1, fillOpacity: 0.7
                        }).addTo(mapSmart);
                    }
                });

                // UPDATE KPI
                document.getElementById('kpi-total').innerText = total;
                document.getElementById('kpi-persen-total').innerText = Math.round((total / TARGET.total) * 100) + "%";
                document.getElementById('kpi-persen-usaha').innerText = Math.round((usaha / TARGET.usaha) * 100) + "%";
                document.getElementById('kpi-persen-campuran').innerText = Math.round((campuran / TARGET.campuran) * 100) + "%";
                document.getElementById('kpi-persen-tinggal').innerText = Math.round((tinggal / TARGET.tinggal) * 100) + "%";

                // UPDATE DISCLAIMER TANGGAL
                document.getElementById('disclaimer-date').innerText = "Data tarikan terakhir: " + latestDate;

                // RENDER DONUT CHART
                new Chart(document.getElementById('donutChart').getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: ['Tempat Tinggal', 'Campuran', 'Khusus Usaha'],
                        datasets: [{
                            data: [tinggal, campuran, usaha],
                            backgroundColor: ['#a855f7', '#f97316', '#10b981'], borderWidth: 0
                        }]
                    },
                    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
                });

                // RENDER TABEL SE CANGGIH (20 baris per halaman, ada fitur Search & Sort)
                const dataTable = new simpleDatatables.DataTable("#dataTable", {
                    data: {
                        headings: ["ID_SLS", "Nama/Usaha", "Label Bangunan", "Jenis Prelist", "Akurasi (m)", "Tgl Update"],
                        data: tableData
                    },
                    perPage: 20, // 20 baris sekali muat sesuai catatan
                    labels: { placeholder: "Cari data...", perPage: "data per halaman", noRows: "Tidak ada data ditemukan", info: "Menampilkan {start} - {end} dari {rows} data" }
                });

                // RENDER LOGBOOK HARIAN
                let logbookHTML = "";
                // Urutkan tanggal dari yang terbaru
                let sortedDates = Object.keys(logbookData).sort((a,b) => new Date(b) - new Date(a));
                
                sortedDates.forEach(date => {
                    let d = logbookData[date];
                    logbookHTML += `
                    <div class="bg-gray-50 p-4 rounded border text-sm">
                        <div class="font-bold text-gray-700 flex items-center gap-2">
                            <span>📅 Tgl ${date}</span> 
                            <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">+${d.total} records</span>
                        </div>
                        <div class="flex gap-4 mt-2 text-gray-500 text-xs">
                            <span>🏠 Tempat Tinggal: +${d.tinggal}</span>
                            <span>🏪 Khusus Usaha: +${d.usaha}</span>
                            <span>🏭 Campuran: +${d.campuran}</span>
                        </div>
                    </div>`;
                });
                document.getElementById('logbook-container').innerHTML = logbookHTML;
            }
        });
    });
