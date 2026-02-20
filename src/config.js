const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json');

function loadConfig() {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch (err) {
      console.error('Failed to parse config.json:', err);
      process.exit(1);
    }
  }

  const config = {
    token: process.env.DISCORD_TOKEN || fileConfig.token,
    commandPrefix: process.env.COMMAND_PREFIX || fileConfig.commandPrefix || '!bmi',
    dataFile: process.env.DATA_FILE || fileConfig.dataFile || path.resolve(process.cwd(), 'data', 'state.json'),
    guilds: Array.isArray(fileConfig.guilds) ? fileConfig.guilds : [],
  };

  if (!config.token) {
    console.error('Missing bot token. Set DISCORD_TOKEN in .env or token in config.json');
    process.exit(1);
  }

  return config;
}

module.exports = {
  loadConfig,
};
