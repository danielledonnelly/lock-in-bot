import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import fetch from 'node-fetch';

// Track mode internally
let checkMode = 'daily'; // can be 'daily' or '8hour'

// Get date range based on check mode
function getDateRange() {
    const now = new Date();

    if (checkMode === 'daily') {
        // Get start of today in NT (midnight NT)
        // NT is UTC-3:30, so midnight NT is 3:30 AM UTC
        const nowUTC = new Date();
        const ntOffset = -3.5 * 60; // NT is UTC-3:30 (in minutes)
        const nowNT = new Date(nowUTC.getTime() + (ntOffset * 60 * 1000));

        // Get midnight NT in NT timezone
        const midnightNT = new Date(nowNT);
        midnightNT.setHours(0, 0, 0, 0);

        // Convert midnight NT back to UTC
        const midnightUTC = new Date(midnightNT.getTime() - (ntOffset * 60 * 1000));

        return {
            start: midnightUTC.toISOString().split('.')[0] + 'Z',
            end: now.toISOString().split('.')[0] + 'Z'
        };
    } else {
        // Get 8 hours ago from now
        const eightHoursAgo = new Date(now.getTime() - (8 * 60 * 60 * 1000));
        return {
            start: eightHoursAgo.toISOString().split('.')[0] + 'Z',
            end: now.toISOString().split('.')[0] + 'Z'
        };
    }
}

// Function to check if user has committed
async function checkCommitStatus() {
    const dateRange = getDateRange();
    const timeWindow = checkMode === 'daily' ? 'today (NT)' : 'last 8 hours';
    console.log(`Checking commits for ${timeWindow} between:`);
    console.log('Start:', dateRange.start);
    console.log('End:', dateRange.end);
    console.log('GitHub Username:', Config.GithubUsername);
    console.log('GitHub Token present:', !!process.env.GITHUB_TOKEN);

    try {
        // Search for commits by the user within the time window
        const query = `author:${Config.GithubUsername} committer-date:>${dateRange.start}`;
        console.log('GitHub search query:', query);
        const apiUrl = `https://api.github.com/search/commits?q=${encodeURIComponent(query)}`;
        console.log('Full API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${process.env.GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.cloak-preview+json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

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

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted, interaction) {
    try {
        const guild = await interaction.client.guilds.fetch(Config.ServerID);
        const member = await guild.members.fetch(Config.DiscordUserID);
        // I highly recommend setting up an exception channel so that you can still communicate with the bot in the event of a timeout, should you need to check anything.
        const exceptionChannel = await guild.channels.fetch(Config.ExceptionChannelID);

        if (hasCommitted) {
            console.log(`Found commit, unmuting ${member.user.tag}...`);
            await member.timeout(null); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        } else {
            console.log(`No commit found, muting ${member.user.tag}...`);
            // Set timeout for 1 hour
            await member.timeout(60 * 60 * 1000, 'No commit today');
            // Allow messages in exception channel
            await exceptionChannel.permissionOverwrites.edit(member, {
                SendMessages: true,
                AddReactions: true,
                CreatePublicThreads: true,
                CreatePrivateThreads: true,
                SendMessagesInThreads: true
            });
            console.log(`Muted ${member.user.tag} - No commit today (except in exception channel)`);
        }
    } catch (error) {
        console.error('Error updating mute status:', error);
        console.error('Full error:', error);
    }
}

export function setCheckMode(newMode) {
    checkMode = newMode;
}

export function getCheckMode() {
    return checkMode;
}

export default {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check your commit status and update mute status'),
    
    execute: async (interaction, skipReply = false) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only check your own commit status!', ephemeral: true });
            return;
        }

        if (!skipReply) {
            await interaction.deferReply();
        }

        // Get mode description
        const modeDescription = checkMode === 'daily'
            ? "Lock in Bot is currently in daily mode; this requires you to make at least one commit today to avoid being timed out."
            : "Lock in Bot is currently in 8-hour mode; this requires you to make at least one commit every 8 hours to avoid being timed out.";
        
        console.log('Manual check requested...');
        const hasCommitted = await checkCommitStatus();
        const timeWindow = checkMode === 'daily' ? 'today' : 'in the last 8 hours';
        await updateUserMuteStatus(hasCommitted, interaction);
        
        const statusMessage = hasCommitted 
            ? `\n\nCongratulations, you have locked in! You have committed ${timeWindow}!` 
            : `\n\nNo commits found ${timeWindow}. Lock in now or you will be silenced.`;

        const fullMessage = `${modeDescription}${statusMessage}`;

        if (skipReply) {
            await interaction.followUp(fullMessage);
        } else {
            await interaction.editReply(fullMessage);
        }
    }
} 