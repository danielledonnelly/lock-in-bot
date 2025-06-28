# Lock-in Bot

![Lock-in Bot](./images/thumbnail.png)

A Discord bot to help Dani lock in by tracking GitHub commits and managing server timeouts.

## Features

- **Commit Tracking**: Automatically checks for daily GitHub commits
- **Auto-Timeout**: Times out users who haven't committed 
- **Flexible Modes**: Daily or 8-hour checking modes
- **Exception Channels**: Maintains access to designated channels even when timed out
- **Manual Commands**: Check commit status, switch modes, and get encouragement

## Commands

- `/check` - Check your commit status and update timeout
- `/switch` - Switch between daily and 8-hour modes
- `/encourage` - Get motivational messages
- `/lockout` - Manual timeout management

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables in `.env`:
   ```
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_USER_ID=your_user_id
   SERVER_ID=your_server_id
   GITHUB_USERNAME=your_github_username
   GITHUB_TOKEN=your_github_token
   EXCEPTION_CHANNEL_ID=channel_id_for_testing
   DEBUG=false
   ```
4. Run the bot: `npm start`

## License

MIT License
