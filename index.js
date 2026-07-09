global.version = '2.0.1';

import config from './config.js';
// Hapus import clearDirectory jika tidak digunakan di tempat lain untuk startup
// import { clearDirectory } from './lib/utils.js'; 

import { connectToWhatsApp } from './src/connection.js';

// Hapus pembersihan directory tmp saat start untuk efisiensi
// clearDirectory('./tmp');

async function startBot() {
  console.log('🚀 Memulai Bot dengan fitur Pairing & AI...');
  
  // Langsung panggil koneksi
  // Pastikan di dalam ./src/connection.js sudah diatur untuk menggunakan Pairing Code jika diperlukan
  await connectToWhatsApp();
}

startBot();
