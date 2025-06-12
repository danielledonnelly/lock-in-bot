require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

// Bot configuration
let checkMode = 'daily'; // can be 'daily' or '8hour'

// Get date range based on check mode
function getDateRange() {
    const now = new Date();
    
    if (checkMode === 'daily') {
        // Get start of today in NT (midnight NT)
        const startOfToday = new Date();
        startOfToday.setHours(3, 30, 0, 0); // Midnight in NT is 3:30 UTC
        return {
            start: startOfToday.toISOString().split('.')[0]+'Z',
            end: now.toISOString().split('.')[0]+'Z'
        };
    } else {
        // Get 8 hours ago from now
        const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
        return {
            start: eightHoursAgo.toISOString().split('.')[0]+'Z',
            end: now.toISOString().split('.')[0]+'Z'
        };
    }
}

// These values should be set in your .env file
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'your-github-username';
const DISCORD_USER_ID = process.env.DISCORD_USER_ID || 'your-discord-user-id';
const SERVER_ID = process.env.SERVER_ID || 'your-server-id';

// Function to check if user has committed
async function checkCommitStatus() {
    const dateRange = getDateRange();
    const timeWindow = checkMode === 'daily' ? 'today (NT)' : 'last 8 hours';
    console.log(`Checking commits for ${timeWindow} between:`);
    console.log('Start:', dateRange.start);
    console.log('End:', dateRange.end);
    
    try {
        // Search for commits by the user within the time window
        const query = `author:${GITHUB_USERNAME} committer-date:>${dateRange.start}`;
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

// Function to mute user for specified duration
async function muteUser(durationHours, message) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        const durationMs = durationHours * 60 * 60 * 1000;
        await member.timeout(durationMs, `Manual mute for ${durationHours} hour${durationHours > 1 ? 's' : ''}`);
        console.log(`Muted ${member.user.tag} for ${durationHours} hour${durationHours > 1 ? 's' : ''}`);
        message.reply(`You have been muted for ${durationHours} hour${durationHours > 1 ? 's' : ''}. Use this time to lock in and get work done!`);
    } catch (error) {
        console.error('Error setting mute:', error);
        message.reply('Failed to mute. Please check bot permissions.');
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Check commit status every 5 minutes if not in focus mode
    setInterval(async () => {
        console.log(`Current mode: ${checkMode}`);
        if (checkMode !== 'focus') {
            console.log('Running scheduled check...');
            const hasCommitted = await checkCommitStatus();
            await updateUserMuteStatus(hasCommitted);
        } else {
            console.log('Skipping scheduled check - in focus mode');
        }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds
    
    // Initial check if not starting in focus mode
    console.log('Running initial check...');
    if (checkMode !== 'focus') {
        checkCommitStatus().then(hasCommitted => {
            updateUserMuteStatus(hasCommitted);
        });
    }
});

// When changing modes, handle the transition
async function handleModeChange(newMode, message) {
    const oldMode = checkMode;
    checkMode = newMode;
    
    if (newMode === 'focus') {
        message.reply('Focus mode activated! You will be muted for one hour. Use this time to lock in and get work done!');
        try {
            const guild = await client.guilds.fetch(SERVER_ID);
            const member = await guild.members.fetch(DISCORD_USER_ID);
            await member.timeout(60 * 60 * 1000, 'Focus mode activated');
            console.log(`Muted ${member.user.tag} for focus mode`);
        } catch (error) {
            console.error('Error setting focus mode timeout:', error);
            message.reply('Failed to activate focus mode. Please check bot permissions.');
        }
    } else {
        // If coming out of focus mode or switching between check modes, do an immediate check
        if (oldMode === 'focus' || (oldMode !== newMode)) {
            console.log('Mode changed, running immediate check...');
            const hasCommitted = await checkCommitStatus();
            await updateUserMuteStatus(hasCommitted);
        }
        
        if (newMode === 'daily') {
            message.reply('Switched to daily commit mode. You need one commit per day (NT) to avoid being muted.');
        } else if (newMode === '8hour') {
            message.reply('Switched to 8-hour window mode. You need one commit every 8 hours to avoid being muted.');
        }
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Handle mute duration commands
    if (message.content.startsWith('!mute')) {
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only lock yourself in, but you can\'t lock anyone else in!');
            return;
        }

        const duration = message.content.match(/!mute(\d+)hour/)?.[1];
        if (duration && ['1', '2', '4', '8'].includes(duration)) {
            await muteUser(parseInt(duration), message);
        }
        return;
    }
    
    // If you want other people to be able to do bot commands, edit the code below
    // Only allow the target user to use mode commands
    if (message.content.startsWith('!mode')) {
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only lock yourself in, but you can\'t lock anyone else in!');
            return;
        }
        
        if (message.content === '!mode daily') {
            checkMode = 'daily';
            message.reply('Switched to daily commit mode. You need one commit per day (NT) to avoid being muted.');
        } else if (message.content === '!mode 8hour') {
            checkMode = '8hour';
            message.reply('Switched to 8-hour window mode. You need one commit every 8 hours to avoid being muted.');
        } else if (message.content === '!mode') {
            const currentMode = checkMode === 'daily' ? 'daily commit mode (one commit per day NT)' : '8-hour window mode (one commit every 8 hours)';
            message.reply(`Currently in ${currentMode}`);
        }
        return;
    }

    // If you want other people to be able to do bot commands, edit the code below
    // Only allow the target user to check their commits
    if (message.content === '!check') {
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only lock yourself in, but you can\'t lock anyone else in!');
            return;
        }
        console.log('Manual check requested...');
        const hasCommitted = await checkCommitStatus();
        const timeWindow = checkMode === 'daily' ? 'today' : 'in the last 8 hours';
        await updateUserMuteStatus(hasCommitted);
        message.reply(hasCommitted ? `Congratulations, you have locked in! You have committed ${timeWindow}!` : `No commits found ${timeWindow}. Lock in now or you will be silenced.`);
    }

    if (message.content === '!test') {
        message.reply('Bot is working! Probably!');
    }
});

client.login(process.env.DISCORD_TOKEN); 