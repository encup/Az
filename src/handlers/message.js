import config from '../../config.js';
import chalk from 'chalk';
import fs from 'fs';
import serializeMessage from '../../lib/serializeMessage.js';
import { processMessage } from '../../lib/ai.js';

const lastMessageTime = {};
const SETTINGS_PATH = './database/settings.json';

// Membuat settings.json jika belum ada
if (!fs.existsSync(SETTINGS_PATH)) {
  fs.writeFileSync(
    SETTINGS_PATH,
    JSON.stringify({ ai: true }, null, 2)
  );
}

const getSettings = () => {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
};

const saveSettings = (settings) => {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
};

async function handleMessageUpsert(sock, m) {
  try {
    const result = serializeMessage(m, sock);
    if (!result) return;

    const {
      isGroup,
      content,
      messageType,
      message,
      isQuoted,
      pushName,
      sender,
      remoteJid
    } = result;

    // Abaikan status WhatsApp
    if (remoteJid === 'status@broadcast') return;

    // Ambil setting
    const settings = getSettings();

    // Cek owner
    const senderNumber = Number(sender.split('@')[0]);
    const isOwner = config.owner_number.includes(senderNumber);

    /* ==========================
       COMMAND OWNER
    ========================== */

    if (content === '.ai on') {
      if (!isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Command ini hanya untuk owner.'
        });
      }

      settings.ai = true;
      saveSettings(settings);

      return sock.sendMessage(remoteJid, {
        text: '✅ AI berhasil diaktifkan.'
      });
    }

    if (content === '.ai off') {
      if (!isOwner) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Command ini hanya untuk owner.'
        });
      }

      settings.ai = false;
      saveSettings(settings);

      return sock.sendMessage(remoteJid, {
        text: '✅ AI berhasil dinonaktifkan.'
      });
    }

    // Filter tujuan bot
    const destination = config.bot_destination.toLowerCase();

    if (
      (isGroup && destination === 'private') ||
      (!isGroup && destination === 'group')
    ) {
      return;
    }

    // AI OFF
    if (!settings.ai) return;

    // Rate Limit (jika ada di config)
    const currentTime = Date.now();

    if (
      config.rate_limit &&
      content &&
      lastMessageTime[remoteJid] &&
      currentTime - lastMessageTime[remoteJid] < config.rate_limit
    ) {
      return;
    }

    if (content) {
      lastMessageTime[remoteJid] = currentTime;
    }

    /* ==========================
       PROSES AI
    ========================== */

    if (content || messageType) {
      try {
        await processMessage(
          content,
          sock,
          sender,
          remoteJid,
          message,
          messageType,
          pushName,
          isQuoted
        );
      } catch (error) {
        console.error(
          chalk.red('❌ Error saat memproses AI:'),
          error.message
        );
      }
    }

  } catch (error) {
    console.error(
      chalk.red('❌ Error dalam message upsert:'),
      error.message
    );
  }
}

export { handleMessageUpsert };
