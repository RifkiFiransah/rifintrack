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

#### Opsi B - PostgreSQL lokal

Buat database `rifintrack`, lalu sesuaikan `.env`:

```env
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/rifintrack"
DIRECT_URL="postgresql://postgres:PASSWORD@localhost:5432/rifintrack"
```

#### Opsi C - Supabase

Supabase memakai dua koneksi: pooler untuk aplikasi dan koneksi langsung untuk migrasi.

```env
DATABASE_URL="postgresql://USER:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@DB_HOST:5432/postgres"
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

## Environment Variables

| Variabel              | Wajib      | Keterangan                                                             |
| --------------------- | ---------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`        | Ya         | Koneksi database yang dipakai aplikasi (boleh pooler).                 |
| `DIRECT_URL`          | Ya         | Koneksi langsung untuk Prisma CLI/migrasi.                             |
| `NODE_ENV`            | Tidak      | `production` mengaktifkan cookie session `Secure`.                     |
| `SEED_USER_NAME`      | Untuk seed | Nama user development.                                                 |
| `SEED_USER_EMAIL`     | Untuk seed | Email user development.                                                |
| `SEED_USER_PASSWORD`  | Untuk seed | Password user development. Jangan pakai di produksi.                   |
| `NEXT_PUBLIC_APP_URL` | Tidak      | Disiapkan untuk kebutuhan URL publik; belum dipakai kode saat ini.     |
| `SESSION_SECRET`      | Tidak      | Disiapkan untuk kebutuhan signing/rotasi; belum dipakai kode saat ini. |

Jangan commit file `.env`. File tersebut sudah ada di `.gitignore`.

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

## Struktur Proyek

```text
prisma/
  schema.prisma          # 17 model, enum, relasi, unique constraint
  migrations/            # riwayat migrasi SQL
  seed.ts                # data development idempotent
public/
  manifest.json          # manifest PWA
  icons/icon.svg
  sw.js                  # service worker (cache aset + fallback offline)
  offline.html           # halaman fallback saat offline
src/
  app/
    (dashboard)/         # halaman terproteksi + layout sidebar/bottom nav
    api/                 # route handlers (JSON API)
    login/, register/    # halaman autentikasi
    layout.tsx           # root layout + PWA register
  components/
    ui/                  # button, input, select, badge, stat-card
    charts/              # chart SVG/HTML tanpa library chart
    layout/              # sidebar dan bottom navigation
  features/              # client components per domain
  lib/                   # auth, prisma, validation, money, offline queue
  services/              # business logic + query Prisma
  proxy.ts               # proteksi route (Next.js 16)
```

Alur data:

1. Halaman server (`app/(dashboard)`) mengambil session dan memanggil `src/services/*`.
2. Service memvalidasi kepemilikan data, mengelola BigInt/ledger, lalu mengembalikan view yang aman untuk RSC.
3. Form interaktif (`src/features/*`) memanggil route handler `/api/*`.
4. Route handler memakai Zod + service yang sama, sehingga aturan bisnis konsisten.

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

## API Ringkas

| Endpoint                                   | Method        | Keterangan                                                     |
| ------------------------------------------ | ------------- | -------------------------------------------------------------- |
| `/api/auth/register`                       | POST          | Registrasi + kategori default.                                 |
| `/api/auth/login`                          | POST          | Login, membuat session cookie.                                 |
| `/api/auth/logout`                         | POST          | Logout, mencabut session.                                      |
| `/api/profile`                             | PATCH         | Ubah nama dan email/username.                                  |
| `/api/profile/password`                    | POST          | Ganti password; mencabut sesi di perangkat lain.               |
| `/api/accounts`                            | GET, POST     | Daftar/buat rekening.                                          |
| `/api/accounts/[id]`                       | PATCH         | Ubah/arsipkan rekening.                                        |
| `/api/categories`                          | GET, POST     | Daftar/buat kategori.                                          |
| `/api/categories/[id]`                     | PATCH         | Ubah/arsipkan kategori.                                        |
| `/api/transactions`                        | GET, POST     | Daftar/buat transaksi (mendukung `idempotencyKey`).            |
| `/api/transactions/[id]`                   | PATCH, DELETE | Ubah transaksi; `DELETE` berarti void.                         |
| `/api/budgets`                             | GET, POST     | Anggaran per bulan.                                            |
| `/api/budgets/[id]`                        | PATCH         | Ubah nama/catatan anggaran.                                    |
| `/api/budgets/[id]/limits`                 | PUT           | Upsert limit kategori.                                         |
| `/api/budgets/[id]/limits/[categoryId]`    | DELETE        | Hapus limit kategori.                                          |
| `/api/budgets/copy`                        | POST          | Salin limit dari periode lain.                                 |
| `/api/savings`                             | GET, POST     | Daftar/buat tujuan tabungan.                                   |
| `/api/savings/[id]`                        | PATCH         | Ubah/buka/tutup tujuan.                                        |
| `/api/savings/[id]/movements`              | POST          | Kontribusi/penarikan.                                          |
| `/api/savings/[id]/movements/[movementId]` | DELETE        | Hapus pergerakan.                                              |
| `/api/recurring`                           | GET, POST     | Daftar/buat aturan rutin (sekaligus generate jadwal).          |
| `/api/recurring/[id]`                      | PATCH         | Aktif/nonaktif aturan.                                         |
| `/api/recurring/occurrences/[id]`          | PATCH         | `{ "action": "post" }` atau `{ "action": "skip" }`.            |
| `/api/notifications`                       | GET           | Daftar notifikasi + sinkronisasi pengingat.                    |
| `/api/notifications/[id]`                  | PATCH         | Tandai satu notifikasi dibaca.                                 |
| `/api/notifications/read-all`              | POST          | Tandai semua dibaca.                                           |
| `/api/insights`                            | GET           | Insight bulan berjalan.                                        |
| `/api/reports`                             | GET           | `?period=DAILY, WEEKLY, MONTHLY, YEARLY&date=YYYY-MM-DD`.      |
| `/api/reports/export`                      | GET           | Export laporan: `?format=csv, pdf, xlsx, excel` (default CSV). |
| `/api/backup`                              | GET, POST     | Unduh JSON backup; `POST` restore.                             |

Semua endpoint (kecuali auth publik) memerlukan session. Endpoint API mengembalikan `401` jika belum login, dan memeriksa kepemilikan data per user.

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

### Vercel + Supabase

Stack produksi: GitHub → Vercel → Supabase PostgreSQL. Panduan lengkap ada di [`DEPLOYMENT.md`](DEPLOYMENT.md), mencakup setup Supabase, environment variable, migrasi, deploy, smoke test, backup, dan rollback.

Ringkasan:

1. Buat project Supabase dan ambil `DATABASE_URL` (pooler) serta `DIRECT_URL` (direct/session pooler).
2. Set environment variable tersebut di Vercel.
3. Jalankan migrasi produksi dari mesin/CI tepercaya: `npm run db:deploy`.
4. Deploy dari GitHub. `postinstall` menjalankan `prisma generate` otomatis.
5. Jangan menjalankan seed development di produksi.
6. Gunakan HTTPS agar cookie session `Secure` bekerja.

Catatan: cookie session memakai `Secure` saat `NODE_ENV=production`. Login lewat `http://` (selain localhost) tidak akan menyimpan cookie.

## Troubleshooting

| Masalah                                                            | Penyebab umum                                            | Solusi                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `P1001: Can't reach database server`                               | Database belum jalan atau URL salah.                     | `docker start rifintrack-pg`, cek `pg_isready`, cocokkan host/port/user/password.                                                                    |
| Prisma CLI error padahal `.env` benar                              | `DIRECT_URL` belum diisi.                                | Isi `DIRECT_URL` (schema memakai `directUrl`).                                                                                                       |
| `prisma generate` gagal: `EPERM ... query_engine-windows.dll.node` | Dev server/Node masih memegang Prisma engine.            | Hentikan `npm run dev`/proses Node proyek, lalu jalankan ulang `npm run db:generate`.                                                                |
| Seed gagal: `SEED_USER_EMAIL and SEED_USER_PASSWORD are required`  | Variabel seed kosong.                                    | Isi keduanya di `.env`, lalu `npm run db:seed`.                                                                                                      |
| Login berhasil di dev, gagal setelah `next start`                  | Cookie `Secure` dikirim lewat HTTP.                      | Gunakan HTTPS, atau uji dengan `npm run dev`.                                                                                                        |
| User seed tidak bisa login                                         | Password masih placeholder atau seed belum jalan.        | Set password baru di `.env`, jalankan `npm run db:seed` (seed tidak mengubah password user yang sudah ada; gunakan email baru atau reset DB).        |
| Error native `@node-rs/argon2`                                     | Platform/arsitektur tidak cocok.                         | Hapus `node_modules` + `package-lock.json`, install ulang di platform yang didukung. Jangan ganti ke paket `argon2` native karena butuh build tools. |
| Port 3000 dipakai                                                  | Proses lain masih berjalan.                              | Hentikan proses tersebut atau `npm run dev -- -p 3001`.                                                                                              |
| Ingin reset database development                                   | Data lama mengganggu.                                    | `npx prisma migrate reset` (menghapus semua data), lalu `npm run db:seed`.                                                                           |
| Notifikasi kosong                                                  | Notifikasi dibuat saat halaman/API notifikasi diakses.   | Buka `/notifications` atau panggil `GET /api/notifications`.                                                                                         |
| Transaksi offline tidak sinkron                                    | Berbeda browser/akun, session habis, atau masih offline. | Login di browser yang sama, pastikan online, gunakan tombol "Sinkronkan sekarang".                                                                   |
| Tombol Posting transaksi rutin nonaktif                            | Jadwal belum jatuh tempo atau aturan nonaktif.           | Tunggu tanggal jadwal atau aktifkan aturan.                                                                                                          |

## Keamanan

- Jangan commit `.env` atau file backup.
- Gunakan password database dan `SEED_USER_PASSWORD` yang kuat.
- Session disimpan sebagai hash SHA-256 di database; cookie `httpOnly`, `sameSite=lax`, berlaku 30 hari, dan `Secure` di produksi.
- Semua query data pengguna memeriksa `userId`; akses lintas user menghasilkan `404`.
- Ganti password mencabut sesi aktif lain, tetapi mempertahankan sesi perangkat saat ini.
- Restore backup bersifat destruktif dan meminta konfirmasi di UI.
- Rate limiting in-memory tersedia untuk login, register, dan ganti password. Verifikasi email, reset password, dan rate limiting terdistribusi belum tersedia.

## Contributing

Contributions are welcome! If you find issues or have improvements, please create a new issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

Happy coding!
