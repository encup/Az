import fs from 'fs';

const SETTINGS_PATH = './database/settings.json';

function ensureSettings() {
    if (!fs.existsSync(SETTINGS_PATH)) {
        fs.writeFileSync(
            SETTINGS_PATH,
            JSON.stringify(
                {
                    ai: true
                },
                null,
                2
            )
        );
    }
}

function getSettings() {
    ensureSettings();
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
}

function saveSettings(settings) {
    ensureSettings();
    fs.writeFileSync(
        SETTINGS_PATH,
        JSON.stringify(settings, null, 2)
    );
}

export {
    getSettings,
    saveSettings
};