/**
 * ============================================================
 *  api.js - pengganti google.script.run untuk halaman GitHub Pages
 * ============================================================
 *  Form & dashboard dulu dibuka dari script.google.com. Kalau browser login ke
 *  beberapa akun Google, Google menampilkan "Sorry, unable to open the file at
 *  this time" SEBELUM kode kita jalan - itu bug Google, bukan bug aplikasi.
 *
 *  Sekarang halamannya di-host di GitHub Pages, dan berkas ini meniru
 *  google.script.run: setiap panggilan diteruskan ke web app Apps Script lewat
 *  fetch() TANPA cookie login Google. Jadi berapa pun akun yang login, tetap jalan.
 *
 *  Kode Form.html & Rekap.html TIDAK perlu diubah - baris seperti
 *    google.script.run.withSuccessHandler(f).withFailureHandler(g).login(id, pw)
 *  tetap bekerja persis sama.
 *
 *  JANGAN dimuat di halaman yang dibuka dari script.google.com (di sana
 *  google.script.run yang asli sudah ada).
 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbzhz9AJrpFGDfF1iPKBU7RwRYsSHnfJ7a8Pl8ilwH-Uzxr-tufovxUvPP7gqxdftL4pSA/exec';

  // Harus sama dengan daftar FUNGSI di jalankanApi_() pada Code.gs
  var NAMA = ['pilihan', 'resolveMaps', 'mulaiUpload', 'uploadChunk', 'simpanKunjungan',
              'periksaKelengkapan', 'login', 'ambilData', 'simpanEdit',
              'tambahVideo', 'hapusVideo', 'hapusBaris'];

  // Panggilan yang aman diulang otomatis kalau sinyal putus sesaat (tidak menulis data)
  var AMAN_DIULANG = { pilihan: 1, resolveMaps: 1, login: 1, ambilData: 1, periksaKelengkapan: 1 };

  // Handler dijalankan di luar rantai Promise, supaya error di dalam handler
  // tidak tertelan dan tidak dikira "gagal tersambung".
  function jalankan(f, nilai) { if (typeof f === 'function') setTimeout(function () { f(nilai); }, 0); }

  function kirim(nama, args, sukses, gagal, percobaan) {
    fetch(API, {
      method: 'POST',
      // text/plain = tanpa preflight CORS. Apps Script tetap membaca isi JSON-nya.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ aksi: nama, args: args }),
      credentials: 'omit',     // JANGAN kirim cookie login Google - itulah sumber masalahnya
      redirect: 'follow'
    })
      .then(function (r) {
        if (!r.ok) return { ok: false, pesan: 'Server membalas HTTP ' + r.status + '. Coba lagi sebentar.' };
        return r.text().then(function (t) {
          try { return JSON.parse(t); }
          catch (e) { return { ok: false, pesan: 'Balasan server tidak terbaca. Pastikan web app sudah di-deploy dengan akses "Siapa saja".' }; }
        });
      })
      .then(function (j) {
        if (j && j.ok) jalankan(sukses, j.hasil);
        else jalankan(gagal, new Error((j && j.pesan) || 'Server menolak permintaan.'));
      }, function (err) {
        if (AMAN_DIULANG[nama] && !percobaan) {
          setTimeout(function () { kirim(nama, args, sukses, gagal, 1); }, 1500);
          return;
        }
        jalankan(gagal, new Error('Tidak tersambung ke server. Periksa sinyal lalu coba lagi.'));
      });
  }

  function runner() {
    var sukses = null, gagal = null, o = {};
    o.withSuccessHandler = function (f) { sukses = f; return o; };
    o.withFailureHandler = function (f) { gagal = f; return o; };
    o.withUserObject = function () { return o; };
    NAMA.forEach(function (nama) {
      o[nama] = function () { kirim(nama, Array.prototype.slice.call(arguments), sukses, gagal, 0); };
    });
    return o;
  }

  var script = {};
  // Setiap kali "google.script.run" dibaca, dapat runner baru - sama seperti aslinya.
  Object.defineProperty(script, 'run', { get: runner });
  window.google = { script: script };
  window.__API_URL = API;
})();
