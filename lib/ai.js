import config from '../config.js';
import { getSession, resetSession } from './session.js';
import { AI_TEXT } from './ai.service.js';

/**
 * Fungsi utama untuk memproses pesan masuk.
 * Hanya menangani logika AI Chat.
 */
async function processMessage(
  content,
  sock,
  sender,
  remoteJid,
  message,
  messageType,
  pushName,
  isQuoted,
) {
  try {
    // Abaikan jika tidak ada konten teks
    if (!content) return;

    const session = getSession(sender);

    // Command Reset Session AI
    const lowerCaseMessage = content.toLowerCase().trim();

    if (lowerCaseMessage === 'reset' || lowerCaseMessage === '/reset') {
      resetSession(sender);

      // Hapus history dari global jika ada
      if (
        global.conversationHistories &&
        global.conversationHistories[sender]
      ) {
        delete global.conversationHistories[sender];
      }

      await sock.sendMessage(remoteJid, {
        text: '🔄 Riwayat percakapan telah direset. Silakan mulai topik baru.'
      });

      return;
    }

    // Status mengetik
    try {
      await sock.sendPresenceUpdate('composing', remoteJid);
    } catch {
      // Abaikan jika gagal
    }

    let aiResponseText = '';

    try {
      aiResponseText = await AI_TEXT(sender, content);
    } catch (error) {
      console.error('❌ Error saat memanggil AI:', error.message);

      aiResponseText =
        'Maaf, terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi nanti.';
    }

    // Kirim balasan AI tanpa quote
    if (aiResponseText) {
      await sock.sendMessage(remoteJid, {
        text: aiResponseText
      });
    }

  } catch (error) {
    console.error('❌ Fatal Error in processMessage:', error);
  }
}

export { processMessage };
