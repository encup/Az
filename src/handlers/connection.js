import chalk from 'chalk';
import { DisconnectReason } from 'baileys';
import Boom from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import config from '../../config.js';

async function handleConnectionUpdate(update, sock, connectToWhatsApp) {
  const { connection, lastDisconnect, qr } = update;

  // Tampilkan QR jika tipe koneksi menggunakan QR
  if (qr != null && config.type_connection.toLowerCase() === 'qr') {
    console.log(chalk.yellowBright(`Menampilkan QR`));
    qrcode.generate(qr, { small: true }, (qrcodeStr) => {
      console.log(qrcodeStr);
    });
  }

  // Jika koneksi terbuka
  if (connection === 'open') {
    global.sock = sock;

    await new Promise((resolve) => setTimeout(resolve, 1000));
    await sock.sendMessage(`${config.phone_number_bot}@s.whatsapp.net`, { text: 'Bot Connected' });

    console.log(chalk.greenBright(`✅ [${config.phone_number_bot}] Koneksi Terhubung`));
    return;
  }

  // Jika koneksi tertutup
  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const reason = new Boom.Boom(lastDisconnect?.error)?.output?.statusCode;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

    switch (reason) {
      case DisconnectReason.badSession:
        console.log(chalk.redBright(`Bad Session File, Start Again ...`));
        return await connectToWhatsApp();

      case DisconnectReason.connectionClosed:
        console.log(chalk.redBright(`Connection closed, reconnecting...`));
        return await connectToWhatsApp();

      case DisconnectReason.connectionLost:
        console.log(chalk.redBright(`Connection lost from server, reconnecting...`));
        return await connectToWhatsApp();

      case DisconnectReason.connectionReplaced:
        console.log(chalk.redBright(`Connection replaced by another session. Please restart bot.`));
        return await connectToWhatsApp();

      case DisconnectReason.loggedOut:
        console.log(chalk.redBright(`Perangkat logout. Hapus Folder session lalu restart server.`));
        break;

      case DisconnectReason.restartRequired:
        console.log(chalk.redBright(`Restart required. Restarting...`));
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return await connectToWhatsApp();

      case DisconnectReason.timedOut:
        console.log(chalk.redBright(`Connection timed out. Reconnecting...`));
        return await connectToWhatsApp();

      default:
        console.log(chalk.redBright(`Unknown disconnect reason: ${reason} | ${connection}`));
        return await connectToWhatsApp();
    }
  }
}

export { handleConnectionUpdate };
