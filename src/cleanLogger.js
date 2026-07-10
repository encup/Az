// cleanLogger.mjs
const blockKeywords = [
  'Closing session: SessionEntry',
  'Decrypted message with closed session',
  'SessionEntry',
  'currentRatchet',
  '_chains',
];

// filter console.*
['log', 'warn', 'error', 'info'].forEach((type) => {
  const original = console[type];
  console[type] = (...args) => {
    const msg = args.join(' ');
    if (blockKeywords.some((k) => msg.includes(k))) return;
    original(...args);
  };
});

// filter stdout (pino nulis ke sini)
const originalWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
  const msg = chunk.toString();
  if (blockKeywords.some((k) => msg.includes(k))) return true;
  return originalWrite.apply(this, arguments);
};

export {};
