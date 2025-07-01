// This is a work in progress command specific to a specific channel that I use personally.

import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testreminder')
        .setDescription('Test the weekly reminder message'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'Only the bot owner can use this command!', ephemeral: true });
            return;
        }

        try {
            const channel = await interaction.client.channels.fetch(Config.GoalChannelID);
            if (!channel) {
                await interaction.reply({ content: 'Goal channel not found! Check your GOAL_CHANNEL_ID.', ephemeral: true });
                return;
            }

            const message = `
            Hey <@${Config.DaniDiscordID}>, <@${Config.MaddieDiscordID}>, and <@${Config.JoshDiscordID}>, it's time to lock in. Set your weekly goal and confirm whether or not you completed your last goal. 
            <@${Config.DaniDiscordID}>
            <@${Config.MaddieDiscordID}> 
            <@${Config.JoshDiscordID}>
            <@${Config.JoshDiscordID}>
`;
            await channel.send(message);
            await interaction.reply({ content: 'Test reminder sent successfully!', ephemeral: true });
        } catch (error) {
            console.error('Error sending test reminder:', error);
            await interaction.reply({ content: 'Failed to send test reminder. Check the logs.', ephemeral: true });
        }
    }
} 