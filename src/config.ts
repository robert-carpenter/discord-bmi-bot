import * as dotenv from 'dotenv';

dotenv.config();

function required(name: string, value?: string) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  token: required('DISCORD_TOKEN', process.env.DISCORD_TOKEN),
  commandPrefix: process.env.COMMAND_PREFIX || '!bmi',
  databaseUrl: required('DATABASE_URL', process.env.DATABASE_URL),
};
