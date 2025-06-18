import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lockout')
        .setDescription('Lock yourself out for an hour to focus on committing. Or go touch grass. It\'s up to you.'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only lock yourself out!', ephemeral: true });
            return;
        }

        try {
            const guild = await interaction.client.guilds.fetch(Config.ServerID);
            const member = await guild.members.fetch(Config.DiscordUserID);
            
            // 1 hour timeout
            await member.timeout(60 * 60 * 1000, 'Self-imposed lockout to focus');
            
            // Get a random encouragement message from the encourage command
            const Encourage = (await import('./encourage.js')).default;
            const messages = Encourage.MESSAGES;
            const randomMessage = messages[Math.floor(Math.random() * messages.length)];
            
            await interaction.reply(`You've been locked out for 1 hour. Use this time to focus and commit!\n\n${randomMessage}`);
            console.log(`${member.user.tag} locked themselves out for an hour`);
        } catch (error) {
            console.error('Error setting lockout:', error);
            await interaction.reply({ content: 'Failed to set lockout. Please check bot permissions.', ephemeral: true });
        }
    }
} 