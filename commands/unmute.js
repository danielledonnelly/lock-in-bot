import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Manually unmute yourself'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only unmute yourself!', ephemeral: true });
            return;
        }

        try {
            const guild = await interaction.client.guilds.fetch(Config.ServerID);
            const member = await guild.members.fetch(Config.DiscordUserID);
            
            await member.timeout(null); // Remove timeout
            await interaction.reply('You have been manually unmuted for debugging purposes.');
            
        } catch (error) {
            console.error('Error unmuting:', error);
            await interaction.reply({ content: 'Failed to unmute you. Please check the logs.', ephemeral: true });
        }
    }
} 