import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import { MESSAGES } from './encourage.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lockout')
        .setDescription('Lock yourself out for an hour to focus on committing. Or go touch grass. It\'s up to you.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(null),
    
    execute: async (interaction) => {
        console.log('Lockout command triggered by user:', interaction.user.tag);

        if (interaction.user.id !== Config.DiscordUserID) {
            console.log('Unauthorized user tried to use lockout:', interaction.user.id);
            console.log('Expected user ID:', Config.DiscordUserID);
            await interaction.reply({ content: 'You can only lock yourself out!', ephemeral: true });
            return;
        }

        try {
            console.log('Fetching guild and member...');
            const guild = await interaction.client.guilds.fetch(Config.ServerID);
            const member = await guild.members.fetch(Config.DiscordUserID);
            console.log('Found member:', member.user.tag, 'in guild:', guild.name);
            
            console.log('Setting 1-hour timeout...');
            // 1 hour timeout
            await member.timeout(60 * 60 * 1000, 'Self-imposed lockout to focus');
            console.log('Timeout successfully set');
            
            // Get a random encouragement message
            console.log('Selecting random encouragement message...');
            const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            console.log('Selected message:', randomMessage);
            
            await interaction.reply(`You've been locked out for 1 hour. Use this time to focus and commit!\n\n${randomMessage}`);
            console.log(`${member.user.tag} locked themselves out for an hour`);
        } catch (error) {
            console.error('Error in lockout command:', error);
            console.error('Full error details:', {
                message: error.message,
                stack: error.stack,
                guild: interaction.guild?.id,
                channel: interaction.channel?.id
            });
            await interaction.reply({ content: 'Failed to set lockout. Please check bot permissions.', ephemeral: true });
        }
    }
} 