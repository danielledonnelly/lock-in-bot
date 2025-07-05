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
    ExceptionChannelID: process.env.EXCEPTION_CHANNEL_ID,
    LimitChannelID: process.env.LIMIT_CHANNEL_ID,
    GoalChannelID: process.env.GOAL_CHANNEL_ID,
    DaniDiscordID: process.env.DANI_DISCORD_ID,
    MaddieDiscordID: process.env.MADDIE_DISCORD_ID,
    JoshDiscordID: process.env.JOSH_DISCORD_ID,
    LockedOutRoleID: process.env.LOCKED_OUT_ROLE_ID,
}