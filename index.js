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
    try {
        const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events`);
        const events = await response.json();
        return events.some(event => event.type === 'PushEvent' && event.created_at.startsWith(today));
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
            await member.timeout(null, 'No commit today');
            console.log(`Muted ${member.user.tag} - No commit today`);
        } else {
            await member.timeout(null);
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        }
    } catch (error) {
        console.error('Error updating mute status:', error);
    }
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    // Check commit status every hour
    setInterval(async () => {
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(!hasCommitted);
    }, 3600000); // 1 hour in milliseconds
    
    // Initial check
    checkCommitStatus().then(hasCommitted => {
        updateUserMuteStatus(!hasCommitted);
    });
});

client.login(process.env.DISCORD_TOKEN); 