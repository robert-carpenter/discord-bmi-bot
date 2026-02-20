import {
  ApplicationCommandOptionType,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import { AppDataSource } from './data-source';
import { UserBmi } from './entity/UserBmi';
import { config } from './config';

const slashCommands = [
  {
    name: 'bmi',
    description: 'Set, show, or announce BMI',
    dm_permission: false,
    options: [
      {
        name: 'set',
        description: 'Save your BMI data',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'height_cm',
            description: 'Height in centimeters',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 50,
            max_value: 300,
          },
          {
            name: 'weight_kg',
            description: 'Weight in kilograms',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 20,
            max_value: 500,
          },
          {
            name: 'height',
            description: "Height like 5ft9 or 5'9",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: 'weight_pounds',
            description: 'Weight in pounds',
            type: ApplicationCommandOptionType.Integer,
            required: false,
            min_value: 44,
            max_value: 1100,
          },
        ],
      },
      {
        name: 'show',
        description: 'Show BMI for yourself or another user',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'user',
            description: 'User to check',
            type: ApplicationCommandOptionType.User,
            required: false,
          },
        ],
      },
      {
        name: 'announce',
        description: 'Announce your BMI publicly',
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let bmiRepo: ReturnType<typeof AppDataSource.getRepository<UserBmi>>;

client.once(Events.ClientReady, () => {
  console.log(`BMI bot ready as ${client.user?.tag}`);
  registerSlashCommands().catch((err) => {
    console.error('Failed to register slash commands:', err);
  });
});

client.on(Events.InteractionCreate, handleInteractionCreate);

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    bmiRepo = AppDataSource.getRepository(UserBmi);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }

  await client.login(config.token);
}

bootstrap().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationCommands(client.user!.id), { body: slashCommands });
  console.log('Slash commands registered globally.');
}

async function handleInteractionCreate(interaction: any) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'bmi') return;
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This bot only works in servers.', ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === 'set') {
    await handleSetBmi(interaction);
    return;
  }

  if (sub === 'show') {
    await handleShowBmi(interaction);
    return;
  }

  if (sub === 'announce') {
    await handleAnnounceBmi(interaction);
  }
}

async function handleSetBmi(interaction: any) {
  const heightCm = interaction.options.getInteger('height_cm');
  const weightKg = interaction.options.getInteger('weight_kg');
  const heightStr = interaction.options.getString('height');
  const weightLbs = interaction.options.getInteger('weight_pounds');

  const parsed = parseBmiInput({ heightCm, weightKg, heightStr, weightLbs });
  if (!parsed.ok) {
    await interaction.reply({ content: parsed.error, ephemeral: true });
    return;
  }

  const bmi = computeBmi(parsed.heightCm, parsed.weightKg);
  const saved = await bmiRepo.save({
    userId: interaction.user.id,
    heightCm: parsed.heightCm,
    weightKg: parsed.weightKg,
    bmi,
    updatedAt: new Date(),
  });

  await interaction.reply({
    content: `Saved. Your BMI is ${formatBmi(saved.bmi)} (Height: ${formatHeightCm(saved.heightCm)}, Weight: ${formatWeightKg(saved.weightKg)}).`,
    ephemeral: true,
  });
}

async function handleShowBmi(interaction: any) {
  const target = interaction.options.getUser('user') || interaction.user;
  const data = await bmiRepo.findOneBy({ userId: target.id });

  if (!data) {
    await interaction.reply({
      content:
        target.id === interaction.user.id
          ? 'You have not set your BMI yet. Use /bmi set.'
          : `${target.tag} has not set a BMI yet.`,
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `${target.tag}'s BMI is ${formatBmi(data.bmi)}.`,
    ephemeral: false,
  });
}

async function handleAnnounceBmi(interaction: any) {
  const data = await bmiRepo.findOneBy({ userId: interaction.user.id });

  if (!data) {
    await interaction.reply({
      content: 'You have not set your BMI yet. Use /bmi set first.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `${interaction.user.tag}'s BMI is ${formatBmi(data.bmi)}.`,
    ephemeral: false,
  });
}

type ParsedBmi =
  | { ok: false; error: string }
  | { ok: true; heightCm: number; weightKg: number };

function parseBmiInput({
  heightCm,
  weightKg,
  heightStr,
  weightLbs,
}: {
  heightCm: number | null;
  weightKg: number | null;
  heightStr: string | null;
  weightLbs: number | null;
}): ParsedBmi {
  if (Number.isFinite(heightCm) && Number.isFinite(weightKg)) {
    if (!isReasonableMetric(heightCm!, weightKg!)) {
      return { ok: false, error: 'Height or weight looks out of range. Please check your inputs.' };
    }
    return { ok: true, heightCm: heightCm!, weightKg: weightKg! };
  }

  if (heightStr && Number.isFinite(weightLbs)) {
    const parsedHeightCm = parseHeightStringToCm(heightStr);
    if (!parsedHeightCm) {
      return { ok: false, error: "Could not parse height. Try formats like 5ft9, 5'9, or 175cm." };
    }
    const parsedWeightKg = poundsToKg(weightLbs!);
    if (!isReasonableMetric(parsedHeightCm, parsedWeightKg)) {
      return { ok: false, error: 'Height or weight looks out of range. Please check your inputs.' };
    }
    return { ok: true, heightCm: parsedHeightCm, weightKg: parsedWeightKg };
  }

  return {
    ok: false,
    error: 'Provide either height_cm + weight_kg OR height + weight_pounds.',
  };
}

function parseHeightStringToCm(input: string) {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  const cmMatch = raw.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cmMatch) {
    const cm = Number(cmMatch[1]);
    return Number.isFinite(cm) ? cm : null;
  }

  let match = raw.match(/^(\d+)\s*(?:ft|')\s*(\d+)?\s*(?:in|")?$/);
  if (match) {
    const feet = Number(match[1]);
    const inches = match[2] ? Number(match[2]) : 0;
    return feetInchesToCm(feet, inches);
  }

  match = raw.match(/^(\d+)\s*(?:feet|foot)\s*(\d+)?\s*(?:in|inches)?$/);
  if (match) {
    const feet = Number(match[1]);
    const inches = match[2] ? Number(match[2]) : 0;
    return feetInchesToCm(feet, inches);
  }

  match = raw.match(/^(\d+)\s*(?:in|")$/);
  if (match) {
    const inches = Number(match[1]);
    return Number.isFinite(inches) ? inches * 2.54 : null;
  }

  match = raw.match(/^(\d+)\s+(\d+)$/);
  if (match) {
    const feet = Number(match[1]);
    const inches = Number(match[2]);
    return feetInchesToCm(feet, inches);
  }

  return null;
}

function feetInchesToCm(feet: number, inches: number) {
  if (!Number.isFinite(feet) || !Number.isFinite(inches)) return null;
  if (feet < 3 || feet > 8 || inches < 0 || inches > 11) return null;
  return (feet * 12 + inches) * 2.54;
}

function poundsToKg(pounds: number) {
  return pounds * 0.45359237;
}

function computeBmi(heightCm: number, weightKg: number) {
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
}

function formatBmi(bmi: number) {
  return bmi.toFixed(1);
}

function formatHeightCm(cm: number) {
  return `${Math.round(cm)} cm`;
}

function formatWeightKg(kg: number) {
  return `${Math.round(kg * 10) / 10} kg`;
}

function isReasonableMetric(heightCm: number, weightKg: number) {
  return heightCm >= 50 && heightCm <= 300 && weightKg >= 20 && weightKg <= 500;
}
