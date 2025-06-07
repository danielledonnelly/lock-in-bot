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

const GITHUB_USERNAME = 'danielledonnelly';
const DISCORD_USER_ID = '480415224164253707';
const SERVER_ID = '961813532092006440';

// Function to check if user has committed today
async function checkCommitStatus() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Checking commits for ${today}...`);
    try {
        // Search for commits by the user from today
        const query = `author:${GITHUB_USERNAME} committer-date:${today}`;
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
async function updateUserMuteStatus(shouldMute) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        
        if (shouldMute) {
            console.log(`Attempting to mute ${member.user.tag}...`);
            // Set timeout for 1 hour (in milliseconds)
            await member.timeout(60 * 60 * 1000, 'No commit today');
            console.log(`Muted ${member.user.tag} - No commit today`);
        } else {
            console.log(`Attempting to unmute ${member.user.tag}...`);
            await member.timeout(0); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        }
    } catch (error) {
        console.error('Error updating mute status:', error);
        console.error('Full error:', error);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Check commit status every 30 seconds for testing
    setInterval(async () => {
        console.log('Running scheduled check...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(!hasCommitted);
    }, 30000); // 30 seconds for testing
    
    // Initial check
    console.log('Running initial check...');
    checkCommitStatus().then(hasCommitted => {
        updateUserMuteStatus(!hasCommitted);
    });
});

// Add message event to test bot is working
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    if (message.content === '!check') {
        console.log('Manual check requested...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(!hasCommitted);
        message.reply(`Commit status: ${hasCommitted ? 'Found commit' : 'No commit found'}`);
    }

    if (message.content === '!test') {
        console.log('Test command received');
        message.reply('Bot is working! 🎉');
    }
});

client.login(process.env.DISCORD_TOKEN); 