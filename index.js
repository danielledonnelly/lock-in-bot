require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('mode')
        .setDescription('Set or check the commit check mode')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The mode to set')
                .setRequired(false)
                .addChoices(
                    { name: 'Daily (one commit per day)', value: 'daily' },
                    { name: '8-hour window', value: '8hour' }
                )),
    new SlashCommandBuilder()
        .setName('check')
        .setDescription('Manually check your commit status'),
    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute yourself for a specified duration')
        .addStringOption(option =>
            option.setName('duration')
                .setDescription('How long to mute yourself')
                .setRequired(true)
                .addChoices(
                    { name: '1 hour', value: '1' },
                    { name: '2 hours', value: '2' },
                    { name: '4 hours', value: '4' },
                    { name: '8 hours', value: '8' }
                )),
    new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test if the bot is working')
];

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, SERVER_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

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
async function handleSelfMute(interaction, hours) {
    try {
        const guild = await client.guilds.fetch(SERVER_ID);
        const member = await guild.members.fetch(DISCORD_USER_ID);
        
        if (interaction.user.id !== DISCORD_USER_ID) {
            await interaction.reply('You can only mute yourself, not others!');
            return;
        }

        const milliseconds = hours * 60 * 60 * 1000;
        selfMuteEndTime = Date.now() + milliseconds;
        await member.timeout(milliseconds, `Self-muted for ${hours} hour(s)`);
        await interaction.reply(`You have been muted for ${hours} hour(s). Use this time to focus and get work done!`);
        console.log(`Self-muted ${member.user.tag} for ${hours} hour(s)`);
    } catch (error) {
        console.error('Error setting self-mute timeout:', error);
        await interaction.reply('Failed to set mute. Please check bot permissions.');
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
async function handleModeChange(newMode, interaction) {
    const oldMode = checkMode;
    checkMode = newMode;
    
    // If switching between check modes, do an immediate check
    if (oldMode !== newMode) {
        console.log('Mode changed, running immediate check...');
        const hasCommitted = await checkCommitStatus();
        await updateUserMuteStatus(hasCommitted);
    }
    
    if (newMode === 'daily') {
        await interaction.reply('Switched to daily commit mode. You need one commit per day (NT) to avoid being muted.');
    } else if (newMode === '8hour') {
        await interaction.reply('Switched to 8-hour window mode. You need one commit every 8 hours to avoid being muted.');
    }
}

// Remove the old messageCreate event handler and replace with interactionCreate
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    // Only allow the target user to use commands
    if (interaction.user.id !== DISCORD_USER_ID) {
        await interaction.reply('You can only lock yourself in, but you can\'t lock anyone else in!');
        return;
    }

    try {
        switch (commandName) {
            case 'mode':
                const modeType = interaction.options.getString('type');
                if (modeType) {
                    await handleModeChange(modeType, interaction);
                } else {
                    let currentMode;
                    if (checkMode === 'daily') {
                        currentMode = 'daily commit mode (one commit per day NT)';
                    } else {
                        currentMode = '8-hour window mode (one commit every 8 hours)';
                    }
                    await interaction.reply(`Currently in ${currentMode}`);
                }
                break;

            case 'check':
                console.log('Manual check requested...');
                const hasCommitted = await checkCommitStatus();
                const timeWindow = checkMode === 'daily' ? 'today' : 'in the last 8 hours';
                await updateUserMuteStatus(hasCommitted);
                await interaction.reply(hasCommitted 
                    ? `Congratulations, you have locked in! You have committed ${timeWindow}!` 
                    : `No commits found ${timeWindow}. Lock in now or you will be silenced.`);
                break;

            case 'mute':
                const hours = parseInt(interaction.options.getString('duration'));
                await handleSelfMute(interaction, hours);
                break;

            case 'test':
                await interaction.reply('Bot is working! Probably!');
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
        await interaction.reply('There was an error executing that command.');
    }
});

client.login(process.env.DISCORD_TOKEN); 