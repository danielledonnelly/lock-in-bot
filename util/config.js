// This used to be this:
// These values should be set in your .env file
// const GITHUB_USERNAME = process.env.GITHUB_USERNAME || 'your-github-username';
// const DISCORD_USER_ID = process.env.DISCORD_USER_ID || 'your-discord-user-id';
// const SERVER_ID = process.env.SERVER_ID || 'your-server-id';


export default {
    BotToken: process.env.DISCORD_TOKEN,
    ClientID: process.env.DISCORD_CLIENT_ID,
    Debug: process.env.DEBUG === "true",
    DiscordUserID: process.env.DISCORD_USER_ID,
    GithubUsername: process.env.GITHUB_USERNAME,
    ServerID: process.env.SERVER_ID,
}