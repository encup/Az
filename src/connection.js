import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import config from '../config.js';
import { handleMessageUpsert } from './handlers/message.js';
import { handleConnectionUpdate } from './handlers/connection.js';
// Hapus handleContactsUpdate jika tidak digunakan untuk fitur AI/Pairing inti
// import { handleContactsUpdate } from './handlers/contact.js';

const logger = pino({ level: 'silent' });

async function connectToWhatsApp() {
  // Cek apakah sudah ada koneksi aktif
  if (global.sock && global.sock.user && global.sock.ws && global.sock.ws.readyState === 1) {
    console.log(chalk.yellow('⚠️ Bot sudah terkoneksi dan aktif.'));
    return global.sock;
  }

  const sessionDir = path.join(process.cwd(), 'session');
  
  // Buat direktori session jika belum ada
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: logger,
    printQRInTerminal: false, // Matikan QR karena kita pakai Pairing
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  global.sock = sock;

  // Logika Pairing Code
  if (!sock.authState.creds.registered && config.type_connection.toLowerCase() == 'pairing') {
    const phoneNumber = config.phone_number_bot;
    if (phoneNumber) {
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await delay(4000);
      try {
        const code = await sock.requestPairingCode(phoneNumber.trim());
        console.log(chalk.blue('📱 PHONE NUMBER: '), chalk.yellow(phoneNumber));
        console.log(chalk.blue('🔑 CODE PAIRING: '), chalk.yellow(code.match(/.{1,4}/g).join('-')));
      } catch (err) {
        console.error(chalk.red('❌ Gagal meminta kode pairing:'), err.message);
      }
    } else {
      console.error(chalk.red('❌ Nomor telepon bot tidak ditemukan di config!'));
    }
  }

  sock.ev.on('creds.update', saveCreds);

  // Handlers Utama
  // Hapus contacts.update jika tidak vital untuk AI
  // sock.ev.on('contacts.update', handleContactsUpdate);

  // Handler Pesan (Tempat logika AI biasanya berada)
  sock.ev.on('messages.upsert', async (m) => {
    await handleMessageUpsert(sock, m);
  });

  // Handler Koneksi (Reconnect, dll)
  sock.ev.on('connection.update', async (update) => {
    await handleConnectionUpdate(update, sock, connectToWhatsApp);
  });

  return sock;
}

export { connectToWhatsApp };
