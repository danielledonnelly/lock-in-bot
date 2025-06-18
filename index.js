import "dotenv/config.js";
import { Client, Collection, GatewayIntentBits, Events, PermissionsBitField } from 'discord.js';
import fetch from 'node-fetch';
import Commands from './commands/index.js';
import Config from './util/config.js';
import { getCheckMode } from './commands/check.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        // GatewayIntentBits.GuildMessages,
    ]
});

// Get date range based on check mode
function getDateRange() {
    const now = new Date();
    const checkMode = getCheckMode();

    if (checkMode === 'daily') {
        // Get start of today in NT (midnight NT)
        // NT is UTC-3:30, so midnight NT is 3:30 AM UTC
        const nowUTC = new Date();
        const ntOffset = -3.5 * 60; // NT is UTC-3:30 (in minutes)
        const nowNT = new Date(nowUTC.getTime() + (ntOffset * 60 * 1000));

        // Get midnight NT in NT timezone
        const midnightNT = new Date(nowNT);
        midnightNT.setHours(0, 0, 0, 0);

        // Convert midnight NT back to UTC
        const midnightUTC = new Date(midnightNT.getTime() - (ntOffset * 60 * 1000));

        return {
            start: midnightUTC.toISOString().split('.')[0] + 'Z',
            end: now.toISOString().split('.')[0] + 'Z'
        };
    } else {
        // Get 8 hours ago from now
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
    const timeWindow = checkMode === 'daily' ? 'today (NT)' : 'last 8 hours';
    console.log(`Checking commits for ${timeWindow} between:`);
    console.log('Start:', dateRange.start);
    console.log('End:', dateRange.end);

    try {
        // Search for commits by the user within the time window
        const query = `author:${Config.GithubUsername} committer-date:>${dateRange.start}`;
        console.log('GitHub search query:', query);
        const response = await fetch(`https://api.github.com/search/commits?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.cloak-preview+json'
            }
        });

        if (!response.ok) {
            console.error('GitHub API Error:', {
                status: response.status,
                statusText: response.statusText
            });
            const errorText = await response.text();
            console.error('Error details:', errorText);
            return false;
        }

        const data = await response.json();
        console.log('GitHub response:', JSON.stringify(data, null, 2));

        const hasCommitted = data.total_count > 0;
        console.log(`Found ${data.total_count} commits in the ${timeWindow}`);
        console.log(`Commit status: ${hasCommitted ? 'Found commit' : 'No commit found'}`);
        return hasCommitted;
    } catch (error) {
        console.error('Error checking GitHub commits:', error);
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted) {
    try {
        const guild = await client.guilds.fetch(Config.ServerID);
        const member = await guild.members.fetch(Config.DiscordUserID);

        if (hasCommitted) {
            console.log(`Found commit, unmuting ${member.user.tag}...`);
            await member.timeout(null); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        } else {
            console.log(`No commit found, muting ${member.user.tag}...`);
            await member.timeout(60 * 60 * 1000, 'No commit today'); // 1 hour timeout
            console.log(`Muted ${member.user.tag} - No commit today`);
        }
    } catch (error) {
        console.error('Error updating mute status:', error);
        console.error('Full error:', error);
    }
}

Commands.init(client);

// This triggers upon a slash command. It will check if it's correctly registered for your bot, then passes it to the execution function
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Check commit status every 5 minutes
    setInterval(async () => {
        const checkMode = getCheckMode();
        console.log(`Current mode: ${checkMode}`);
        console.log('Running scheduled check...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(hasCommitted);
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    // Initial check
    console.log('Running initial check...');
    checkCommitStatus().then(hasCommitted => {
        updateUserMuteStatus(hasCommitted);
    });
});

client.login(Config.BotToken); 