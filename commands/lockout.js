import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';
import { MESSAGES } from './encourage.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lockout')
        .setDescription('Give yourself the Locked Out role for 1 hour to focus'),

    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'You can only lock yourself out!', ephemeral: true });
            return;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = await interaction.client.guilds.fetch(Config.ServerID);
            const member = await guild.members.fetch(Config.DiscordUserID);

            // Add role if not present
            if (!member.roles.cache.has(Config.LockedOutRoleID)) {
                console.log('Adding Locked Out role via /lockout');
                await member.roles.add(Config.LockedOutRoleID, 'Self-imposed lockout');
            }

            // Schedule removal after 1 hour (3600 000 ms)
            setTimeout(async () => {
                try {
                    const refreshed = await guild.members.fetch(Config.DiscordUserID);
                    if (refreshed.roles.cache.has(Config.LockedOutRoleID)) {
                        await refreshed.roles.remove(Config.LockedOutRoleID, 'Lockout duration ended');
                        console.log('Locked Out role automatically removed after 1h via /lockout');
                    }
                } catch (err) {
                    console.error('Error removing Locked Out role after 1h:', err);
                }
            }, 60 * 60 * 1000);

            const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            await interaction.editReply(`Locked Out role applied for 1 hour. Focus time!\n\n${randomMessage}`);
        } catch (error) {
            console.error('Lockout command error:', error);
            await interaction.editReply({ content: 'Failed to apply Locked Out role. Check bot permissions or role hierarchy.', ephemeral: true });
        }
    }
}; 