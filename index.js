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
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events`);
        const events = await response.json();
        const hasCommitted = events.some(event => event.type === 'PushEvent' && event.created_at.startsWith(today));
        console.log(`Commit status: ${hasCommitted ? 'Found commit' : 'No commit found'}`);
        return hasCommitted;
    } catch (error) {
        console.error('Error checking GitHub commits:', error);
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
            // Set timeout for 24 hours (in milliseconds)
            await member.timeout(24 * 60 * 60 * 1000, 'No commit today');
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
});

client.login(process.env.DISCORD_TOKEN); 