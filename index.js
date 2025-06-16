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
let selfMuteEndTime = null; // Track when self-mute ends

// Get date range based on check mode
function getDateRange() {
    const now = new Date();
    
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
            start: midnightUTC.toISOString().split('.')[0]+'Z',
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

// Function to check if user is currently self-muted
function isSelfMuted() {
    if (!selfMuteEndTime) return false;
    return Date.now() < selfMuteEndTime;
}

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

// Function to handle self-muting
async function handleSelfMute(message, hours) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only mute yourself, not others!');
            return;
        }

        const milliseconds = hours * 60 * 60 * 1000;
        selfMuteEndTime = Date.now() + milliseconds;
        await member.timeout(milliseconds, `Self-muted for ${hours} hour(s)`);
        message.reply(`You have been muted for ${hours} hour(s). Use this time to focus and get work done!`);
        console.log(`Self-muted ${member.user.tag} for ${hours} hour(s)`);
    } catch (error) {
        console.error('Error setting self-mute timeout:', error);
        message.reply('Failed to set mute. Please check bot permissions.');
    }
}

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        
        // Don't unmute if user is self-muted
        if (hasCommitted && !isSelfMuted()) {
            console.log(`Found commit, unmuting ${member.user.tag}...`);
            await member.timeout(null); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        } else if (!hasCommitted && !isSelfMuted()) {
            console.log(`No commit found, muting ${member.user.tag}...`);
            await member.timeout(60 * 60 * 1000, 'No commit today'); // 1 hour timeout
            console.log(`Muted ${member.user.tag} - No commit today`);
        } else if (isSelfMuted()) {
            console.log(`Skipping mute update - user is self-muted until ${new Date(selfMuteEndTime).toLocaleString()}`);
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

// When changing modes, handle the transition
async function handleModeChange(newMode, message) {
    const oldMode = checkMode;
    checkMode = newMode;
    
    // If switching between check modes, do an immediate check
    if (oldMode !== newMode) {
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

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Handle self-mute commands
    if (message.content === '!mute1hour') {
        await handleSelfMute(message, 1);
    } else if (message.content === '!mute2hour') {
        await handleSelfMute(message, 2);
    } else if (message.content === '!mute4hour') {
        await handleSelfMute(message, 4);
    } else if (message.content === '!mute8hour') {
        await handleSelfMute(message, 8);
    }
    
    // Handle mode commands
    if (message.content.startsWith('!mode')) {
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only lock yourself in, but you can\'t lock anyone else in!');
            return;
        }
        
        if (message.content === '!mode daily') {
            await handleModeChange('daily', message);
        } else if (message.content === '!mode 8hour') {
            await handleModeChange('8hour', message);
        } else if (message.content === '!mode') {
            let currentMode;
            if (checkMode === 'daily') {
                currentMode = 'daily commit mode (one commit per day NT)';
            } else {
                currentMode = '8-hour window mode (one commit every 8 hours)';
            }
            message.reply(`Currently in ${currentMode}`);
        }
        return;
    }

    // Handle check command
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

    // Handle unmute command for immediate relief
    if (message.content === '!unmute') {
        if (message.author.id !== DISCORD_USER_ID) {
            message.reply('You can only unmute yourself!');
            return;
        }
        
        try {
            const guild = await client.guilds.fetch(SERVER_ID);
            const member = await guild.members.fetch(DISCORD_USER_ID);
            await member.timeout(null); // Remove timeout
            selfMuteEndTime = null; // Clear self-mute tracking
            message.reply('You have been unmuted! Now go commit some code!');
            console.log(`Manually unmuted ${member.user.tag}`);
        } catch (error) {
            console.error('Error unmuting:', error);
            message.reply('Failed to unmute. Please check bot permissions.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN); 