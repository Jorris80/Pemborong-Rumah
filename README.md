# Housing Contractor ERP — PWA (GitHub Pages)

Aplikasi web progresif (PWA) untuk kontraktor/developer perumahan: RAB & AHSP, permintaan material, PO, gudang, laporan harian lapangan (foto + GPS), opname subkon, keuangan, QC, BAST, job costing per kavling, dan EVM Kurva-S. Backend berjalan di **Google Apps Script + Google Sheets** milik perusahaan Anda; repositori ini hanya berisi tampilan yang bisa dipasang di HP dan tetap bisa dipakai **tanpa sinyal**.

## Isi repositori (5 berkas)

| Berkas | Fungsi |
|---|---|
| `index.html` | Seluruh aplikasi (HTML + CSS + JavaScript, tanpa pustaka luar) |
| `sw.js` | Service worker: menyimpan aplikasi di perangkat agar terbuka offline |
| `manifest.webmanifest` | Identitas PWA (nama, ikon, warna) agar bisa "Tambahkan ke layar utama" |
| `icon.svg` | Ikon aplikasi |
| `README.md` | Panduan ini |

## Pemasangan (±5 menit)

1. Selesaikan dulu instalasi backend Apps Script (lihat *Panduan Pengguna PDF*, bab 2) dan salin **URL Web App** yang berakhiran `/exec`.
2. Buat repositori baru di GitHub (boleh privat bila memakai GitHub Pro/Team; publik juga aman karena tidak ada data di sini).
3. Unggah kelima berkas ini ke akar repositori (*Add file → Upload files*).
4. Opsional — tanam URL server agar pengguna tidak perlu mengisinya: buka `index.html`, cari `API_URL: '__API_URL__'`, ganti dengan URL `/exec` Anda.
5. *Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main / (root) → Save*.
6. Tunggu 1–2 menit, buka `https://<nama-akun>.github.io/<nama-repo>/`.
7. Di HP: buka alamat tersebut di Chrome/Safari → menu → **Tambahkan ke layar utama**.

## Cara kerja offline

- Saat pertama dibuka online, aplikasi & data proyek terakhir disimpan di perangkat (IndexedDB).
- Tanpa sinyal: data terakhir tetap bisa dilihat; input baru (laporan harian, permintaan material, pengeluaran gudang, QC, dll.) masuk **antrean** dengan ID unik.
- Begitu online, antrean dikirim otomatis berurutan. Server menolak pengiriman ganda (idempoten). Transaksi yang ditolak aturan bisnis (mis. stok sudah habis) tampil di *Admin → Sinkronisasi offline* untuk ditinjau.
- Aksi administratif (pengguna, lisensi, backup) hanya bisa online.

## Pembaruan versi

Saat mengganti `index.html`, naikkan juga `VERSION` di `sw.js` (mis. `hcerp-v2.0.1`) agar semua perangkat mengambil versi baru.

## Keamanan

- Repositori ini tidak berisi data maupun kredensial. Login memakai akun yang dibuat admin di aplikasi; sesi berupa token yang divalidasi server Apps Script.
- Web App Apps Script di-deploy *Execute as: Me* dan *Who has access: Anyone* agar PWA dapat memanggilnya; akses data tetap dilindungi login + peran (RBAC) + keanggotaan proyek di server.

## Lisensi

Perangkat lunak komersial. Penggunaan tunduk pada Perjanjian Lisensi Pengguna Akhir yang Anda terima dari penyedia.
