# Discord BMI Bot

Tracks user BMI and allows setting, showing, and announcing BMI via slash commands.

## Prerequisites
- Node.js 18+ (uses discord.js v14)
- A Discord bot token

## Setup
1) Copy config examples and fill in your values:
   ```bash
   cp .env.example .env
   ```
   - `DISCORD_TOKEN`: Bot token
   - `DATABASE_URL`: Postgres connection string
   - `COMMAND_PREFIX`: Optional (not used by slash commands)

2) Install dependencies:
   ```bash
   npm install
   ```

3) Run the bot:
   ```bash
   npm start
   ```

State is stored in Postgres.

## Commands
Slash:
- `/bmi set height_cm:<int> weight_kg:<int>`
- `/bmi set height:<string (5ft9)> weight_pounds:<int>`
- `/bmi show [user]`
- `/bmi announce`

Notes:
- BMI data is always public. Anyone can run `/bmi show` for any user.
- Height string examples: `5ft9`, `5'9`, `6ft`, `175cm`.

## How it works
- The bot stores height/weight per user globally in Postgres.
- BMI is computed as `kg / (m^2)` and shown to one decimal place.
