import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import { MESSAGES } from './encourage.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lockout')
        .setDescription('Lock yourself out for an hour to focus on committing or go touch grass'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only lock yourself out!', ephemeral: true });
            return;
        }

        try {
            const guild = await interaction.client.guilds.fetch(Config.ServerID);
            const member = await guild.members.fetch(Config.DiscordUserID);
            
            // 1-hour role lockout instead of timeout
            // Add Locked Out role
            if (!member.roles.cache.has(Config.LockedOutRoleID)) {
                await member.roles.add(Config.LockedOutRoleID, 'Self-imposed lockout to focus');
            }

            // Schedule removal after 1 hour
            setTimeout(async () => {
                try {
                    const refreshedMember = await guild.members.fetch(Config.DiscordUserID);
                    if (refreshedMember.roles.cache.has(Config.LockedOutRoleID)) {
                        await refreshedMember.roles.remove(Config.LockedOutRoleID, 'Lockout duration ended');
                        console.log('Self-lockout role removed after 1 hour');
                    }
                } catch (err) {
                    console.error('Error removing lockout role after 1h:', err);
                }
            }, 60 * 60 * 1000);

            // Get a random encouragement message
            const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            
            await interaction.reply(`You've been locked out for 1 hour. Use this time to focus and commit!\n\n${randomMessage}`);
            console.log(`${member.user.tag} locked themselves out for an hour`);
        } catch (error) {
            console.error('Lockout command error:', error.message);
            await interaction.reply({ content: 'Failed to set lockout. Please check bot permissions.', ephemeral: true });
        }
    }
} 