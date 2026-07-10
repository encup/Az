const config = {
  phone_number_bot: '62881036466864', // Nomor BOT CONTOH : 6285124002201
  type_connection: 'pairing', // qr atau pairing
  bot_destination: 'private', // group , private, both
  name_bot: 'Resbot Ai',
  owner_name: 'Autoresbot',
  owner_number: [628976308400], // '6282154365238@s.whatsapp.net'
    AI: {
    DEFAULT_PROVIDER: 'groq', // gemini | groq
    GROQ: {
      API_KEY: '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', // Apikey dari groq.com
      MODEL: 'llama-3.3-70b-versatile',
      BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
    },
    GEMINI: {
      API_KEY: 'AQ.Ab8RN6Lxw18WJNO_0UzBe5ucHqxRe54c6C1WzwCoApC3aeWbjg', // apikey dari aistudio.google.com
      MODEL: 'gemini-2.5-flash',
      BASE_URL: 'https://generativelanguage.googleapis.com/v1/models',
    },
    GENDER_API: {
    API_KEY: '6a4d2575929e41a957a4a460',
    BASE_URL: 'https://genderapi.io/api'
  },
    HISTORY_LIMIT: 10, // CHAT HISTORY LIMIT YANG TERSIMPAN
  },
};

export default config;
