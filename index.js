import "dotenv/config.js";
import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import fetch from 'node-fetch';
import Commands from './commands/index.js';
import Config from './util/config.js';
import { getCheckMode } from './commands/check.js';

console.log('Starting Lock-in Bot...');

// Add startup checks
if (!Config.BotToken) {
    console.error('DISCORD_TOKEN is not set in environment variables!');
    process.exit(1);
}

if (!Config.ClientID) {
    console.error('DISCORD_CLIENT_ID is not set in environment variables!');
    process.exit(1);
}

if (!Config.ServerID) {
    console.error('SERVER_ID is not set in environment variables!');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ]
});

// Get date range based on check mode
function getDateRange() {
    const now = new Date();
    const checkMode = getCheckMode();

    if (checkMode === 'daily') {
        const nowUTC = new Date();
        const ntOffset = -3.5 * 60; // NT is UTC-3:30 (in minutes)
        const nowNT = new Date(nowUTC.getTime() + (ntOffset * 60 * 1000));
        const midnightNT = new Date(nowNT);
        midnightNT.setHours(0, 0, 0, 0);
        const midnightUTC = new Date(midnightNT.getTime() - (ntOffset * 60 * 1000));

        return {
            start: midnightUTC.toISOString().split('.')[0] + 'Z',
            end: now.toISOString().split('.')[0] + 'Z'
        };
    } else {
        const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
        return {
            start: eightHoursAgo.toISOString().split('.')[0] + 'Z',
            end: now.toISOString().split('.')[0] + 'Z'
        };
    }
}

// Function to check if user has committed
async function checkCommitStatus() {
    const dateRange = getDateRange();
    const checkMode = getCheckMode();

    try {
        const query = `author:${Config.GithubUsername} committer-date:>${dateRange.start}`;
        const response = await fetch(`https://api.github.com/search/commits?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.cloak-preview+json'
            }
        });

        if (!response.ok) {
            console.error('GitHub API Error:', response.status, response.statusText);
            return false;
        }

        const data = await response.json();
        return data.total_count > 0;
    } catch (error) {
        console.error('GitHub check error:', error.message);
        return false;
    }
}

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted) {
    try {
        const guild = await client.guilds.fetch(Config.ServerID);
        const member = await guild.members.fetch(Config.DiscordUserID);

        if (hasCommitted) {
            await member.timeout(null); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        } else {
            await member.timeout(60 * 60 * 1000, 'No commit today'); // 1 hour timeout
            console.log(`Muted ${member.user.tag} - No commit found`);
        }
    } catch (error) {
        console.error('Mute status error:', error.message);
    }
}

// Initialize commands
try {
    await Commands.init(client);
} catch (error) {
    console.error('Failed to initialize commands:', error.message);
    process.exit(1);
}

// Handle slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Command error (${interaction.commandName}):`, error.message);
        const reply = { content: 'There was an error while executing this command!', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

// Improve signal handling
let shuttingDown = false;

async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    
    try {
        if (checkInterval) {
            console.log('Clearing check interval...');
            clearInterval(checkInterval);
        }
        
        if (client) {
            console.log('Destroying Discord client...');
            await client.destroy();
        }
        
        console.log('Shutdown complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

let checkInterval;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Initial check
    try {
        console.log('Running initial check...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(hasCommitted);
        console.log('Initial check complete');
    } catch (error) {
        console.error('Initial check error:', error);
    }

    // Set up interval check - run every 15 minutes
    checkInterval = setInterval(async () => {
        if (shuttingDown) return;
        
        try {
            console.log('Running interval check...');
            const hasCommitted = await checkCommitStatus();
            await updateUserMuteStatus(hasCommitted);
            console.log('Interval check complete');
        } catch (error) {
            console.error('Interval check error:', error);
        }
    }, 15 * 60 * 1000); // 15 minutes in milliseconds
    
    console.log('Auto-check interval started - will check every 15 minutes');
});

// Handle login errors
try {
    console.log('Attempting to log in to Discord...');
    await client.login(Config.BotToken);
    console.log('Successfully logged in to Discord');
} catch (error) {
    console.error('Failed to log in:', error);
    process.exit(1);
} 