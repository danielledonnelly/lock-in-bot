import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import fetch from 'node-fetch';

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

    try {
        // Search for commits by the user within the time window
        const query = `author:${Config.GithubUsername} committer-date:>${dateRange.start}`;
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

// Function to mute/unmute user
async function updateUserMuteStatus(hasCommitted, interaction) {
    try {
        const guild = await interaction.client.guilds.fetch(Config.ServerID);
        const member = await guild.members.fetch(Config.DiscordUserID);

        if (hasCommitted) {
            console.log(`Found commit, unmuting ${member.user.tag}...`);
            await member.timeout(null); // Remove timeout
            console.log(`Unmuted ${member.user.tag} - Commit found`);
        } else {
            console.log(`No commit found, muting ${member.user.tag}...`);
            await member.timeout(60 * 60 * 1000, 'No commit today'); // 1 hour timeout
            console.log(`Muted ${member.user.tag} - No commit today`);
        }
    } catch (error) {
        console.error('Error updating mute status:', error);
        console.error('Full error:', error);
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('check')
        .setDescription('Check your commit status and update mute status'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only check your own commit status!', ephemeral: true });
            return;
        }

        await interaction.deferReply();
        console.log('Manual check requested...');
        const hasCommitted = await checkCommitStatus();
        const timeWindow = checkMode === 'daily' ? 'today' : 'in the last 8 hours';
        await updateUserMuteStatus(hasCommitted, interaction);
        await interaction.editReply(
            hasCommitted 
                ? `Congratulations, you have locked in! You have committed ${timeWindow}!` 
                : `No commits found ${timeWindow}. Lock in now or you will be silenced.`
        );
    }
} 