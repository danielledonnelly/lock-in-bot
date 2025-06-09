# GitHub Lock-in Bot

A Discord bot that keeps you accountable for daily GitHub commits by timing you out in Discord if you haven't committed today. The bot checks your GitHub activity every 5 minutes and:
- Mutes you for 1 hour if you haven't committed today
- Unmutes you as soon as you make a commit
- Works with both public and private repositories
By default it is set up to work only for it's original creator (hi that's me i'm dani), but you can clone it and substitute in your own GitHub and Discord info to make it work for you.

## Repository Setup
Before following the setup instructions, make sure to:
1. Click the "Use this template" button at the top of this repository
   - This creates a clean copy of the repository for you
   - Choose "Create a new repository"
   - Make it Public or Private (your choice)
2. Clone your new repository to your local machine
3. Create a `.env` file locally (it won't be committed to GitHub)

This is better than forking because:
- You get a clean commit history
- You can make it private if you want
- You won't get notifications from the original repo
- Your GitHub tokens will be safe in your `.env` file

## Setup Instructions

### 1. Create a Discord Bot
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section
4. Click "Add Bot"
5. Under "Privileged Gateway Intents", enable:
   - PRESENCE INTENT
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
6. Save your changes
7. Copy your bot token (you'll need this later)

### 2. Create a GitHub Token
1. Go to [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Lock-in Bot")
4. Select these permissions:
   - `repo` (for private repository access)
   - `read:user`
5. Copy your token (you'll need this later)

### 3. Get Your IDs
1. In Discord, enable Developer Mode (User Settings > Advanced > Developer Mode)
2. Right-click your username and "Copy User ID" - This is your `DISCORD_USER_ID`
3. Right-click your server and "Copy Server ID" - This is your `SERVER_ID`
4. Note your GitHub username - This is your `GITHUB_USERNAME`

### 4. Deploy to Railway
1. Use your repository created from the template
2. Go to [Railway](https://railway.app/) (This is what I used, but you can opt to host wherever you wish)
3. Create a new project
4. Select "Deploy from GitHub repo"
5. Choose your forked repository
6. Add these environment variables in Railway:
   - `DISCORD_TOKEN` (your Discord bot token)
   - `GITHUB_TOKEN` (your GitHub personal access token)
   - `GITHUB_USERNAME` (your GitHub username)
   - `DISCORD_USER_ID` (your Discord user ID)
   - `SERVER_ID` (your server ID)

For local development:
1. Create a `.env` file in your repository with the same variables:
```env
DISCORD_TOKEN=your-discord-token
GITHUB_TOKEN=your-github-token
GITHUB_USERNAME=your-github-username
DISCORD_USER_ID=your-discord-user-id
SERVER_ID=your-server-id
```
Note: The `.env` file is in `.gitignore` and won't be committed to GitHub.

### 5. Add Bot to Your Server
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 > URL Generator
4. Select scopes:
   - `bot`
   - `applications.commands`
5. Select bot permissions:
   - "Moderate Members"
   - "Send Messages"
   - "Read Message History"
   - "View Channels"
6. Copy the generated URL
7. Open it in a browser
8. Select your server and authorize

### 6. Final Setup
1. In your Discord server, make sure the bot's role is ABOVE your role in the role hierarchy
2. Test the bot by typing `!check` in any channel

## Commands
- `!check` - Manually check if you've committed today

## Troubleshooting
- If the bot can't mute you, make sure its role is above your role in the server settings
- If commits aren't being detected, verify your GitHub token has the correct permissions
- The bot needs to be able to see the channels where commands are used

## Contributing
Feel free to submit issues. This is both my first time making a Discord bot and my first time sharing this type of public project so please be patient with me if anything is missing or off. Feedback is welcome!