import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment';
import config from '../config.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../database/users.json');

function resetUsersJson() {
  const emptyData = { users: [] };
  fs.writeFile(filePath, JSON.stringify(emptyData, null, 2), (err) => {
    if (err) console.error('Gagal mereset users.json:', err);
  });
}

function readData() {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function isPremiumUser(user) {
  const currentTime = moment();
  return moment(user.premium_end).isAfter(currentTime);
}

function checkLimit(user) {
  if (!user || typeof user !== 'object') return 0;
  if (isPremiumUser(user)) return 'Unlimited';

  if (user.limit === undefined) {
    user.limit = config.total_limit;
    user.last_reset = moment().format('YYYY-MM-DD');
  }

  const currentDate = moment().format('YYYY-MM-DD');
  if (user.last_reset !== currentDate) {
    user.limit = config.total_limit;
    user.last_reset = currentDate;
  }
  return user.limit;
}

function reduceLimit(id) {
  const data = readData();
  const user = data.users.find((u) => u.id === id);
  if (user && !isPremiumUser(user)) {
    const remainingLimit = checkLimit(user);
    if (remainingLimit > 0) {
      user.limit -= 1;
      writeData(data);
    }
  }
}

function addUser(id, premiumDurationDays) {
  const data = readData();
  const user = data.users.find((u) => u.id === id);
  const premiumStart = moment();
  
  let premiumEnd;
  if (premiumDurationDays === -1) {
    premiumEnd = moment().subtract(1, 'days');
  } else {
    premiumEnd = premiumStart.clone().add(premiumDurationDays, 'days');
  }

  if (user) {
    user.premium_start = premiumStart.format();
    user.premium_end = premiumEnd.format();
  } else {
    data.users.push({
      id,
      premium_start: premiumStart.format(),
      premium_end: premiumEnd.format(),
    });
  }
  writeData(data);
}

function editUser(id, premiumDurationDays) {
  const data = readData();
  const user = data.users.find((u) => u.id === id);
  if (user) {
    const premiumStart = moment();
    const premiumEnd = premiumStart.clone().add(premiumDurationDays, 'days');
    user.premium_start = premiumStart.format();
    user.premium_end = premiumEnd.format();
    writeData(data);
  }
}

function deleteUser(id) {
  const data = readData();
  const updatedUsers = data.users.filter((u) => u.id !== id);
  if (updatedUsers.length !== data.users.length) {
    data.users = updatedUsers;
    writeData(data);
  }
}

function getUser(id) {
  const data = readData();
  let user = data.users.find((u) => u.id === id);

  if (!user) {
    user = {
      id,
      limit: config.total_limit,
      last_reset: moment().format('YYYY-MM-DD'),
      premium_start: null,
      premium_end: moment().subtract(1, 'day').format(),
    };
    data.users.push(user);
    writeData(data);
  }
  return user;
}

/**
 * ✅ FUNGSI BARU: Update data user secara dinamis (termasuk gender)
 */
function updateUser(id, newData) {
  const data = readData();
  let user = data.users.find((u) => u.id === id);

  if (!user) {
    user = {
      id,
      limit: config.total_limit,
      last_reset: moment().format('YYYY-MM-DD'),
      premium_start: null,
      premium_end: moment().subtract(1, 'day').format(),
      ...newData,
    };
    data.users.push(user);
  } else {
    Object.assign(user, newData);
  }
  writeData(data);
  return user;
}

/**
 * ✅ FUNGSI BARU: Deteksi gender otomatis via Genderize.io
 */
async function getOrCreateUserWithGender(id, pushName) {
  let user = getUser(id);
  
  // Jika sudah punya gender, kembalikan saja
  if (user.gender) return user;

  // Coba deteksi dari nama jika tersedia
  if (pushName) {
    try {
      const axios = (await import('axios')).default;
      const firstName = pushName.split(' ')[0];
      const response = await axios.get(`https://api.genderize.io?name=${firstName}`);
      
      if (response.data && response.data.gender) {
        return updateUser(id, { 
          name: pushName, 
          gender: response.data.gender.toLowerCase() 
        });
      }
    } catch (err) {
      console.log('Gagal deteksi gender via API, menggunakan neutral');
    }
  }

  // Default ke neutral jika gagal
  return updateUser(id, { name: pushName, gender: 'neutral' });
}

function getUserPremium() {
  const data = readData();
  const currentDate = moment();
  const premiumUsers = data.users.filter((user) =>
    moment(user.premium_end).isSameOrAfter(currentDate)
  );

  const total = premiumUsers.length;
  let userListText = `*DAFTAR LIST PREMIUM* (${total})\n\n`;

  premiumUsers.sort((a, b) => new Date(a.premium_end) - new Date(b.premium_end));
  premiumUsers.forEach((user) => {
    const number = user.id.split('@')[0];
    userListText += `⌬ ${number}, - ${moment(user.premium_end).format('YYYY-MM-DD')}\n`;
  });
  return userListText.trim();
}

function getAllUsers() {
  const data = readData();
  const total = data.users.length;
  let userListText = `*DAFTAR SEMUA USER* (${total})\n\n`;

  data.users.sort((a, b) => new Date(a.premium_end) - new Date(b.premium_end));
  data.users.forEach((user) => {
    const number = user.id.split('@')[0];
    userListText += ` ${number}, - ${moment(user.premium_end).format('YYYY-MM-DD')}\n`;
  });
  return userListText.trim();
}

// ✅ EXPORT YANG SUDAH DILENGKAPI
export {
  addUser,
  editUser,
  deleteUser,
  getUser,
  updateUser,                // <--- Ditambahkan
  getOrCreateUserWithGender, // <--- Ditambahkan
  isPremiumUser,
  checkLimit,
  reduceLimit,
  getUserPremium,
  getAllUsers,
  resetUsersJson,
};
