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
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Track last message time in limited channel
let lastMessageTime = null;

// Function to check if it's a new day in NT timezone
function isNewDay(lastTime) {
    if (!lastTime) return true;
    
    const ntOffset = -3.5 * 60; // NT is UTC-3:30 (in minutes)
    const lastNT = new Date(lastTime.getTime() + (ntOffset * 60 * 1000));
    const nowNT = new Date(Date.now() + (ntOffset * 60 * 1000));
    
    return lastNT.getDate() !== nowNT.getDate() ||
           lastNT.getMonth() !== nowNT.getMonth() ||
           lastNT.getFullYear() !== nowNT.getFullYear();
}

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

// Function to manage channel permissions
async function updateChannelPermissions(hasCommitted, reason = 'No commit today') {
    try {
        const guild = await client.guilds.fetch(Config.ServerID);
        const member = await guild.members.fetch(Config.DiscordUserID);
        
        // Always ensure access to exception channel
        const exceptionChannel = await guild.channels.fetch(Config.ExceptionChannelID);
        await exceptionChannel.permissionOverwrites.edit(member, {
            SendMessages: true,
            AddReactions: true,
            CreatePublicThreads: true,
            CreatePrivateThreads: true,
            SendMessagesInThreads: true
        });

        if (!hasCommitted) {
            // Get all channels and remove permissions except for exception channel
            const channels = await guild.channels.fetch();
            for (const [_, channel] of channels) {
                if (channel.id !== Config.ExceptionChannelID) {
                    await channel.permissionOverwrites.edit(member, {
                        SendMessages: false,
                        AddReactions: false,
                        CreatePublicThreads: false,
                        CreatePrivateThreads: false,
                        SendMessagesInThreads: false
                    });
                }
            }
            console.log(`Limited channel access for ${member.user.tag} - ${reason}`);
        } else {
            // Restore permissions to all channels
            const channels = await guild.channels.fetch();
            for (const [_, channel] of channels) {
                await channel.permissionOverwrites.delete(member);
            }
            console.log(`Restored channel access for ${member.user.tag} - Commit found`);
        }
    } catch (error) {
        console.error('Permission update error:', error.message);
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

// Add message event handler
client.on(Events.MessageCreate, async message => {
    // Only check messages in the limit channel from the target user
    if (message.channelId === Config.LimitChannelID && 
        message.author.id === Config.DiscordUserID) {
        
        // Check if it's a new day
        if (!isNewDay(lastMessageTime)) {
            console.log('Daily message limit reached, restricting channel access...');
            const channel = await client.channels.fetch(Config.LimitChannelID);
            const member = await message.guild.members.fetch(Config.DiscordUserID);
            
            // Only timeout from the limit channel
            await channel.permissionOverwrites.edit(member, {
                SendMessages: false,
                AddReactions: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                SendMessagesInThreads: false
            });
            
            try {
                await message.reply('You have reached your daily message limit in this channel. You will be unable to send messages here until tomorrow (NT).');
            } catch (error) {
                console.error('Failed to send limit message:', error);
            }
        } else {
            // Update last message time
            lastMessageTime = new Date();
            console.log('Message limit updated for new day');
        }
    }
});

// Handle process signals
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM. Cleaning up...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT. Cleaning up...');
    await client.destroy();
    process.exit(0);
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error.message);
});

let checkInterval;

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Initial check
    try {
        const hasCommitted = await checkCommitStatus();
        await updateChannelPermissions(hasCommitted);
    } catch (error) {
        console.error('Initial check error:', error.message);
    }

    // Set up interval check
    checkInterval = setInterval(async () => {
        try {
            const hasCommitted = await checkCommitStatus();
            await updateChannelPermissions(hasCommitted);
        } catch (error) {
            console.error('Interval check error:', error.message);
        }
    }, 5 * 60 * 1000);
});

// Handle login errors
try {
    await client.login(Config.BotToken);
} catch (error) {
    console.error('Failed to log in:', error.message);
    process.exit(1);
} 