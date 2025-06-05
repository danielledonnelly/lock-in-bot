require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const GITHUB_USERNAME = process.env.GITHUB_USERNAME;

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events`);
    const events = await response.json();
    const hasCommitToday = events.some(event => event.type === 'PushEvent' && event.created_at.startsWith(today));

    if (!hasCommitToday) {
        message.delete();
        message.channel.send(`${message.author}! You have to lock in!`);
    }
});

client.login(process.env.DISCORD_TOKEN); 