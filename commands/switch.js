import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import { getCheckMode, setCheckMode } from './check.js';

export default {
    data: new SlashCommandBuilder()
        .setName('switch')
        .setDescription('Switch between daily and 8-hour mode')
        .setDMPermission(false)
        .setDefaultMemberPermissions(null),
    
    execute: async (interaction) => {
        console.log('Switch command triggered by user:', interaction.user.tag);
        
        if (interaction.user.id !== Config.DiscordUserID) {
            console.log('Unauthorized user tried to use switch:', interaction.user.id);
            console.log('Expected user ID:', Config.DiscordUserID);
            await interaction.reply({ content: 'You can only switch your own check mode!', ephemeral: true });
            return;
        }

        try {
            const currentMode = getCheckMode();
            console.log('Current mode:', currentMode);
            
            const newMode = currentMode === 'daily' ? '8hour' : 'daily';
            console.log('Switching to new mode:', newMode);
            
            setCheckMode(newMode);
            console.log('Mode successfully updated');

            await interaction.reply(`Switched from ${currentMode === 'daily' ? 'daily' : '8-hour'} mode to ${newMode === 'daily' ? 'daily' : '8-hour'} mode.`);
            console.log('Sent mode switch confirmation');
            
            await interaction.followUp('Running check with new mode...');
            console.log('Running check with new mode...');

            // Run a check with the new mode
            const Check = (await import('./check.js')).default;
            await Check.execute(interaction, true);
            console.log('Check command completed after mode switch');
        } catch (error) {
            console.error('Error in switch command:', error);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack
            });
            await interaction.reply({ content: 'Failed to switch mode.', ephemeral: true });
        }
    }
} 