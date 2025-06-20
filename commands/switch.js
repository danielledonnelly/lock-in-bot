import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import { getCheckMode, setCheckMode } from './check.js';

export default {
    data: new SlashCommandBuilder()
        .setName('switch')
        .setDescription('Switch between daily and 8-hour mode'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only switch your own check mode!', ephemeral: true });
            return;
        }

        try {
            const currentMode = getCheckMode();
            const newMode = currentMode === 'daily' ? '8hour' : 'daily';
            setCheckMode(newMode);
            console.log(`${interaction.user.tag} switched from ${currentMode} to ${newMode} mode`);

            await interaction.reply(`Switched from ${currentMode === 'daily' ? 'daily' : '8-hour'} mode to ${newMode === 'daily' ? 'daily' : '8-hour'} mode.`);
            await interaction.followUp('Running check with new mode...');

            // Run a check with the new mode
            const Check = (await import('./check.js')).default;
            await Check.execute(interaction, true);
        } catch (error) {
            console.error('Switch command error:', error.message);
            await interaction.reply({ content: 'Failed to switch mode.', ephemeral: true });
        }
    }
} 