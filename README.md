# RiFinTrack

Aplikasi manajemen keuangan pribadi berbasis web (PWA) untuk mencatat pemasukan, pengeluaran, dan transfer; mengatur anggaran; menabung dengan target; memantau laporan; serta mengelola transaksi rutin.

## Fitur

- Autentikasi email/password dengan session cookie (30 hari).
- Profil pengguna: ubah nama, email/username, dan password; menu profil + logout lewat avatar.
- Multi-rekening bank, e-wallet, tunai, dan lainnya.
- Pencatatan pemasukan, pengeluaran, transfer antar rekening, dan saldo awal.
- Buku besar (ledger) dengan pembatalan transaksi (void) yang dapat diaudit.
- Kategori default otomatis untuk setiap pengguna baru (11 pengeluaran, 5 pemasukan).
- Anggaran bulanan per kategori dengan status aman/hampir/melewati batas dan salin dari bulan sebelumnya.
- Tujuan tabungan (dana darurat, pribadi, pembelian, perjalanan) dengan kontribusi/penarikan dan progres otomatis.
- Transaksi rutin harian/mingguan/bulanan/tahunan dengan jadwal dan konfirmasi posting.
- Notifikasi in-app: pengingat jatuh tempo, peringatan anggaran, progres tabungan, evaluasi bulanan.
- Insight keuangan: rasio tabungan, kategori terbesar, status anggaran, dana darurat, estimasi target, rekomendasi.
- Laporan harian/mingguan/bulanan/tahunan + export CSV, Excel, dan PDF.
- Tema terang/gelap dengan preferensi tersimpan di browser dan mengikuti tema sistem saat pertama dibuka.
- Backup/restore seluruh data keuangan dalam format JSON.
- PWA: manifest, service worker (produksi), halaman fallback offline, dan antrean transaksi offline.

## Tech Stack

| Bagian           | Teknologi                              |
| ---------------- | -------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)     |
| UI               | React 19, Tailwind CSS 4, lucide-react |
| Bahasa           | TypeScript 5 (strict)                  |
| Database         | PostgreSQL 16 + Prisma ORM 6           |
| Validasi         | Zod 4                                  |
| Password hashing | `@node-rs/argon2`                      |
| Export           | ExcelJS (Excel), PDFKit (PDF)          |
| Deploy           | Vercel + Supabase PostgreSQL           |

## Prasyarat

- Node.js **20.9+** (disarankan Node 22 LTS) dan npm 10+.
- PostgreSQL 16, baik lokal, Docker, atau layanan cloud (Supabase/Neon).
- Git (opsional) dan Docker (opsional, untuk database lokal cepat).

## Mulai Cepat (Development)

### 1. Masuk ke folder proyek dan install dependency

```powershell
cd C:\Development\RiFinTrack
npm install
```

### 2. Siapkan environment

```powershell
Copy-Item .env.example .env
```

Buka `.env`, lalu isi minimal `DATABASE_URL`, `DIRECT_URL`, dan kredensial seed.

#### Opsi A - PostgreSQL lewat Docker (paling cepat)

```powershell
docker run -d --name rifintrack-pg `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=rifintrack `
  -p 55432:5432 `
  postgres:16-alpine
```

Gunakan port `55432` agar tidak bentrok dengan PostgreSQL lokal:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/rifintrack"
DIRECT_URL="postgresql://postgres:postgres@localhost:55432/rifintrack"
```

Jika container sudah pernah dibuat:

```powershell
docker start rifintrack-pg
docker exec rifintrack-pg pg_isready -U postgres
```

> `DIRECT_URL` wajib diisi karena `prisma/schema.prisma` memakai `directUrl`. Prisma CLI membaca `.env` melalui `prisma.config.ts`.

### 3. Generate Prisma Client dan jalankan migrasi

```powershell
npm run db:generate
npm run db:deploy
```

Untuk development yang akan mengubah schema, gunakan:

```powershell
npx prisma migrate dev --name nama_perubahan
```

`migrate dev` otomatis membuat migrasi baru, menerapkannya, dan menjalankan seed bila dikonfigurasi. `migrate deploy` hanya menerapkan migrasi yang sudah ada (cocok untuk CI/produksi).

### 4. Isi data development (opsional)

Pastikan variabel berikut ada di `.env` sebelum seed:

```env
SEED_USER_NAME="Development User"
SEED_USER_EMAIL="dev@example.com"
SEED_USER_PASSWORD="GantiDenganPasswordKuat123!"
```

Lalu jalankan:

```powershell
npm run db:seed
```

Seed bersifat idempotent dan membuat:

- 1 user development.
- 16 kategori default.
- 4 rekening contoh (BNI, SeaBank, DANA, Tunai) dengan saldo awal 0.
- 1 anggaran bulan berjalan beserta limit per kategori.

### 5. Jalankan aplikasi

```powershell
npm run dev
```

Buka `http://localhost:3000`.

- Login memakai `SEED_USER_EMAIL` dan `SEED_USER_PASSWORD`, atau
- Daftar akun baru lewat `/register` (kategori default dibuat otomatis).

## Scripts

| Perintah              | Fungsi                                         |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Menjalankan development server (Turbopack).    |
| `npm run build`       | Build produksi.                                |
| `npm run start`       | Menjalankan hasil build produksi.              |
| `npm run lint`        | ESLint seluruh proyek.                         |
| `npx tsc --noEmit`    | Typecheck tanpa menghasilkan file.             |
| `npm run db:generate` | Generate Prisma Client.                        |
| `npm run db:migrate`  | `prisma migrate dev` untuk development.        |
| `npm run db:deploy`   | Terapkan migrasi yang sudah ada (CI/produksi). |
| `npm run db:status`   | Cek status migrasi database.                   |
| `npm run db:seed`     | Jalankan seed development.                     |
| `npm run db:studio`   | Buka Prisma Studio.                            |
| `npm run db:validate` | Validasi schema Prisma.                        |
| `npm run db:format`   | Rapikan format schema Prisma.                  |

## Halaman

| Route            | Fungsi                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `/dashboard`     | KPI saldo, pemasukan, pengeluaran, tabungan, arus kas, kategori, anggaran, transaksi terbaru. |
| `/transactions`  | Catat, cari, filter, dan void transaksi.                                                      |
| `/accounts`      | Kelola rekening, saldo awal, arsip.                                                           |
| `/categories`    | Kelola kategori pemasukan/pengeluaran.                                                        |
| `/budgets`       | Anggaran dan limit per kategori per bulan.                                                    |
| `/savings`       | Tujuan tabungan dan riwayat kontribusi/penarikan.                                             |
| `/recurring`     | Aturan transaksi rutin dan konfirmasi jadwal.                                                 |
| `/notifications` | Daftar notifikasi dan status baca.                                                            |
| `/insights`      | Analisis dan rekomendasi keuangan bulan berjalan.                                             |
| `/reports`       | Laporan empat periode + export CSV, Excel, dan PDF.                                           |
| `/backup`        | Unduh backup JSON dan restore.                                                                |
| `/more`          | Pintasan modul tambahan di mobile.                                                            |
| `/profile`       | Profil pengguna, ubah nama/email, dan ganti password.                                         |

## Aturan Data dan Ledger

- Nominal uang disimpan sebagai `BIGINT` dan dipetakan ke `number` sebelum keluar dari service.
- Arah ledger: `DEBIT` mengurangi saldo, `CREDIT` menambah saldo.
- Saldo rekening = `openingBalance + ΣCREDIT − ΣDEBIT`.
- `Account.openingBalance` bernilai `0`; saldo awal dicatat sebagai transaksi `OPENING_BALANCE` + ledger `CREDIT`.
- Pemasukan = `CREDIT`; pengeluaran = `DEBIT`; transfer = `DEBIT` rekening sumber + `CREDIT` rekening tujuan.
- Void tidak menghapus data: transaksi ditandai `VOIDED` dan dibuat ledger dengan arah berlawanan.
- Setiap transaksi offline memakai `idempotencyKey` unik per user agar tidak dobel saat retry.
- Operasi multi-tabel (transaksi + ledger, restore backup) dijalankan dalam `prisma.$transaction`.

## Offline dan PWA

- Manifest tersedia di `/manifest.json`; ikon di `/icons/icon.svg`.
- Service worker `public/sw.js` didaftarkan **hanya pada produksi** (`NODE_ENV=production`). Di development tidak ada cache agar hot reload tidak terganggu.
- Service worker menyimpan aset statis (script/style/image/font), memakai fallback `/offline.html` untuk navigasi yang gagal, dan tidak meng-cache `/api/*`.
- Transaksi yang gagal karena jaringan disimpan di `localStorage` (`rifintrack.offline.transactions.v1`), lalu dikirim otomatis saat `online` atau lewat tombol "Sinkronkan sekarang".
- Antrean bersifat per browser/perangkat dan per akun yang sedang login. Antrean tidak tersinkron antar perangkat.
- Untuk menguji: jalankan `npm run build` + `npm run start` (atau HTTPS), buka DevTools → Network → Offline, catat transaksi, lalu online-kan kembali.

## Backup dan Restore

- `GET /api/backup` mengunduh JSON berisi rekening, kategori, transaksi + ledger, anggaran + limit, tabungan + pergerakan, serta transaksi rutin + jadwal.
- `POST /api/backup` memvalidasi format (`format: "rifintrack-backup"`, `version: 1`), lalu **menghapus seluruh data keuangan user saat ini** dan menggantinya dengan isi backup dalam satu transaksi database.
- File backup berisi data pribadi. Simpan di tempat aman dan jangan diunggah ke tempat publik.

## Export Laporan

- Halaman `/reports` menyediakan tombol **Export CSV**, **Export Excel**, dan **Export PDF** untuk periode yang sedang dipilih.
- CSV berisi data transaksi mentah dengan UTF-8 BOM agar aman dibuka di Excel.
- Excel (`.xlsx`) berisi sheet Ringkasan, Transaksi, Kategori, dan Arus Kas; nominal memakai format Rupiah.
- PDF berisi ringkasan, perbandingan periode, kategori pengeluaran, serta tabel transaksi dengan penomoran halaman.
- Endpoint: `GET /api/reports/export?period=MONTHLY&date=YYYY-MM-DD&format=csv|pdf|xlsx`. Format `excel` diterima sebagai alias `.xlsx`.
- Export memuat maksimal 1.000 transaksi per periode.

## Build dan Deploy

### Build lokal

```powershell
npm run build
npm run start
```

## Contributing

Contributions are welcome! If you find issues or have improvements, please create a new issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

Happy coding!
