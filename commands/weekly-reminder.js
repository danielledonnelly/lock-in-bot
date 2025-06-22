import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';

// Store the channel ID where the reminder was last sent
let reminderChannelId = null;

// Function to send the weekly reminder
async function sendWeeklyReminder(client) {
    if (!reminderChannelId) {
        console.log('No channel set for weekly reminder');
        return;
    }

    try {
        const channel = await client.channels.fetch(reminderChannelId);
        if (!channel) {
            console.log('Could not find channel for weekly reminder');
            return;
        }

        const message = `Set a new goal for this week and lock in! You are legally obligated to disclose whether you locked in or not, and chat is permitted to lightly shade you if the goal was not achieved.

<@480415224164253707> <@742187091475169300> <@224890702218133505>`;

        await channel.send(message);
        console.log('Sent weekly reminder message');
    } catch (error) {
        console.error('Error sending weekly reminder:', error);
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('setreminderhere')
        .setDescription('Set this channel for weekly goal reminders'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'Only the bot owner can set the reminder channel!', ephemeral: true });
            return;
        }

        reminderChannelId = interaction.channelId;
        await interaction.reply('This channel will now receive weekly goal reminders every Monday morning!');
        console.log(`Set reminder channel to ${reminderChannelId}`);
    }
};

// Export the reminder function so it can be called from index.js
export { sendWeeklyReminder }; 