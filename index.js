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

// Get today's date range in Newfoundland Time (UTC-3:30)
function getNewfoundlandDateRange() {
    const now = new Date();
    // Get start of today in NT (midnight NT)
    const startOfToday = new Date();
    startOfToday.setHours(3, 30, 0, 0); // Midnight in NT is 3:30 UTC
    
    return {
        start: startOfToday.toISOString().split('.')[0]+'Z',
        end: now.toISOString().split('.')[0]+'Z'
    };
}

// These values should be set in your .env file
const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'your-github-username';
const DISCORD_USER_ID = process.env.DISCORD_USER_ID || 'your-discord-user-id';
const SERVER_ID = process.env.SERVER_ID || 'your-server-id';

// Function to check if user has committed today
async function checkCommitStatus() {
    const dateRange = getNewfoundlandDateRange();
    console.log('Checking commits between:');
    console.log('Start (midnight NT):', dateRange.start);
    console.log('End (now):', dateRange.end);
    
    try {
        // Search for commits by the user from today in NT
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
        console.log(`Found ${data.total_count} commits today`);
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

// Add message event to test bot is working
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!check') {
        console.log('Manual check requested...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(hasCommitted);
        message.reply(hasCommitted ? 'You have committed today! ✅' : 'No commits found today. Get to work! ❌');
    }

    if (message.content === '!test') {
        console.log('Test command received');
        message.reply('Bot is working! 🎉');
    }
});

client.login(process.env.DISCORD_TOKEN); 