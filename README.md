# Lock In Bot

A Discord bot with moderator privileges that only allows me to send messages in a server if I've made at least ONE GitHub commit for the day on [danielledonnelly's GitHub](https://github.com/danielledonnelly).

## Features
- Restricts messaging unless you have committed to GitHub today
- Designed for personal productivity and accountability

## Setup
1. Clone this repository or copy the files to your project folder.
2. Run `npm install` to install dependencies.
3. Create a `.env` file in the root directory with the following:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   GITHUB_USERNAME=danielledonnelly
   ```
4. Start the bot with `node index.js`.

## Requirements
- Node.js
- A Discord bot token ([How to create a bot](https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot))