import axios from 'axios';
import config from '../config.js';
import { GENDER_STYLES } from '../templates/gender_styles.js';
// ✅ PERBAIKAN: Gunakan updateUser karena setUserGender tidak ada lagi
import { getUser, updateUser } from './users.js';

const {
  AI: { DEFAULT_PROVIDER, GEMINI, GROQ, HISTORY_LIMIT, GENDER_API },
} = config;

// Inisialisasi global history jika belum ada
global.conversationHistories ||= {};

/* =========================
 * Helper Functions
 * ========================= */

/**
 * Mendeteksi gender dari nama pengguna.
 * Menggunakan caching: hanya memanggil API jika data belum ada di database.
 */
async function detectAndCacheGender(id_user, name) {
  // 1. Cek apakah user sudah punya data gender di database lokal
  const userData = getUser(id_user);
  if (userData && userData.gender) {
    return userData.gender;
  }

  // 2. Jika belum ada, panggil API GenderAPI.io
  let detectedGender = 'unknown';
  
  if (GENDER_API && GENDER_API.API_KEY) {
    try {
      const cleanName = name.split(' ')[0].trim();
      
      // Menggunakan GET request sesuai contoh URL Anda
      const res = await axios.get(GENDER_API.BASE_URL, {
        params: {
          key: GENDER_API.API_KEY,
          name: cleanName
        }
      });

      // GenderAPI mengembalikan field 'gender' ('male', 'female', atau null)
      detectedGender = res.data.gender || 'unknown';
      
    } catch (err) {
      console.warn('⚠️ Gagal mendeteksi gender via API:', err.message);
    }
  }

  // 3. Simpan hasil deteksi ke database agar tidak perlu cek lagi nanti
  // ✅ PERBAIKAN: Gunakan updateUser sebagai pengganti setUserGender
  updateUser(id_user, { gender: detectedGender });
  
  return detectedGender;
}

function getWaktuWIB() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 60 * 60 * 1000);

  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  return `${wib.getDate()} ${bulan[wib.getMonth()]} ${wib.getFullYear()} jam ${String(wib.getHours()).padStart(2, '0')}:${String(wib.getMinutes()).padStart(2, '0')} WIB`;
}

/**
 * Membangun prompt untuk AI dengan menyertakan instruksi gaya bahasa berdasarkan gender.
 */
function buildPrompt(id_user, prompt, gender) {
  if (!global.conversationHistories[id_user]) {
    global.conversationHistories[id_user] = [];
  }

  const recentHistory = global.conversationHistories[id_user].slice(-HISTORY_LIMIT).join('\n');

  // Ambil style dari template berdasarkan gender
  let styleInstruction = GENDER_STYLES.neutral;
  if (gender === 'female') styleInstruction = GENDER_STYLES.female;
  else if (gender === 'male') styleInstruction = GENDER_STYLES.male;

  return `
Kamu adalah Resbot AI, asisten cerdas yang ramah dan membantu.
Website Developer: autoresbot.com
Waktu Sekarang: ${getWaktuWIB()}
Gender Pengguna: ${gender === 'unknown' ? 'Tidak Diketahui' : gender}

Instruksi Gaya Bahasa:
${styleInstruction}

Instruksi Umum:
1. Jawablah dengan singkat, padat, dan jelas.
2. Jika tidak tahu jawabannya, katakan dengan jujur.

Riwayat Percakapan Terakhir:
${recentHistory}

Pesan Pengguna Saat Ini:
User: ${prompt}
AI:
`.trim();
}

function saveHistory(id_user, prompt, reply) {
  if (!global.conversationHistories[id_user]) {
    global.conversationHistories[id_user] = [];
  }

  global.conversationHistories[id_user].push(`User: ${prompt}`);
  global.conversationHistories[id_user].push(`AI: ${reply}`);

  // Batasi jumlah history agar tidak memakan memori (RAM 128MB-512MB sangat terbatas)
  if (global.conversationHistories[id_user].length > HISTORY_LIMIT * 2) { 
    global.conversationHistories[id_user] = global.conversationHistories[id_user].slice(-(HISTORY_LIMIT * 2));
  }
}

/* =========================
 * AI Providers (Gemini & Groq)
 * ========================= */

async function askGemini(prompt) {
  const url = `${GEMINI.BASE_URL}/${GEMINI.MODEL}:generateContent?key=${GEMINI.API_KEY}`;
  
  const res = await axios.post(url, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  return res.data.candidates[0].content.parts[0].text;
}

async function askGroq(prompt) {
  const res = await axios.post(
    GROQ.BASE_URL,
    {
      model: GROQ.MODEL,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ.API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return res.data.choices[0].message.content;
}

/* =========================
 * Main Logic (Auto Fallback)
 * ========================= */

async function AI_TEXT(id_user, prompt, pushName = 'User') {
  // 1. Deteksi gender (dengan caching otomatis)
  const gender = await detectAndCacheGender(id_user, pushName);
  
  // 2. Build Prompt dengan informasi gender
  const fullPrompt = buildPrompt(id_user, prompt, gender);

  // Tentukan urutan provider berdasarkan config DEFAULT_PROVIDER
  const providers = [
    { 
      name: 'Primary', 
      func: DEFAULT_PROVIDER === 'groq' ? askGroq : askGemini 
    },
    { 
      name: 'Fallback', 
      func: DEFAULT_PROVIDER === 'groq' ? askGemini : askGroq 
    }
  ];

  for (let i = 0; i < providers.length; i++) {
    try {
      const reply = await providers[i].func(fullPrompt);
      
      // Simpan history hanya jika berhasil
      saveHistory(id_user, prompt, reply);
      return reply;
    } catch (err) {
      console.warn(`⚠️ Provider ${providers[i].name} gagal:`, err.message);
    }
  }

  return 'Maaf, saat ini layanan AI sedang mengalami gangguan. Silakan coba lagi nanti.';
}

export { AI_TEXT };
