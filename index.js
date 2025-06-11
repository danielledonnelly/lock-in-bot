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
let checkMode = 'daily'; // can be 'daily', '8hour', or 'focus'

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

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        
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

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Check commit status every 5 minutes
    setInterval(async () => {
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
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
        } else if (message.content === '!mode focushour') {
            checkMode = 'focus';
            message.reply('Focus mode activated! You will be muted for one hour. Use this time to lock in and get work done!');
            // Get the guild and member
            try {
                const guild = await client.guilds.fetch(SERVER_ID);
                const member = await guild.members.fetch(DISCORD_USER_ID);
                await member.timeout(60 * 60 * 1000, 'Focus mode activated');
                console.log(`Muted ${member.user.tag} for focus mode`);
            } catch (error) {
                console.error('Error setting focus mode timeout:', error);
                message.reply('Failed to activate focus mode. Please check bot permissions.');
            }
        } else if (message.content === '!mode') {
            let currentMode;
            if (checkMode === 'daily') {
                currentMode = 'daily commit mode (one commit per day NT)';
            } else if (checkMode === '8hour') {
                currentMode = '8-hour window mode (one commit every 8 hours)';
            } else {
                currentMode = 'focus mode (1-hour mute for concentrated work)';
            }
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