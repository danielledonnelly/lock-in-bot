import { SlashCommandBuilder } from 'discord.js';
import Config from '../util/config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('checkperms')
        .setDescription('Check bot permissions'),
    
    execute: async (interaction) => {
        if (interaction.user.id !== Config.DiscordUserID) {
            await interaction.reply({ content: 'Only the bot owner can use this command!', ephemeral: true });
            return;
        }

        try {
            const guild = interaction.guild;
            const botMember = guild.members.me;
            const botRole = botMember.roles.highest;
            const userMember = await guild.members.fetch(Config.DiscordUserID);
            const userRole = userMember.roles.highest;

            let report = '**Bot Permissions Report**\n\n';
            
            // Check role hierarchy
            report += '**Role Hierarchy**\n';
            report += `Bot's highest role: ${botRole.name} (Position: ${botRole.position})\n`;
            report += `Your highest role: ${userRole.name} (Position: ${userRole.position})\n`;
            report += `Can manage your roles: ${botRole.position > userRole.position ? '✅' : '❌'}\n\n`;

            // Check critical permissions
            const criticalPermissions = [
                'ManageRoles',
                'ManageChannels',
                'ViewChannel',
                'SendMessages',
                'ModerateMembers'
            ];

            report += '**Critical Permissions**\n';
            for (const perm of criticalPermissions) {
                report += `${perm}: ${botMember.permissions.has(perm) ? '✅' : '❌'}\n`;
            }

            // Check permissions in specific channels
            report += '\n**Channel-Specific Permissions**\n';
            
            // Exception Channel
            const exceptionChannel = await guild.channels.fetch(Config.ExceptionChannelID);
            report += `\nException Channel (${exceptionChannel.name}):\n`;
            const exceptionPerms = exceptionChannel.permissionsFor(botMember);
            report += `- ManageRoles: ${exceptionPerms.has('ManageRoles') ? '✅' : '❌'}\n`;
            report += `- ViewChannel: ${exceptionPerms.has('ViewChannel') ? '✅' : '❌'}\n`;
            report += `- SendMessages: ${exceptionPerms.has('SendMessages') ? '✅' : '❌'}\n`;

            // Limit Channel
            const limitChannel = await guild.channels.fetch(Config.LimitChannelID);
            report += `\nLimit Channel (${limitChannel.name}):\n`;
            const limitPerms = limitChannel.permissionsFor(botMember);
            report += `- ManageRoles: ${limitPerms.has('ManageRoles') ? '✅' : '❌'}\n`;
            report += `- ViewChannel: ${limitPerms.has('ViewChannel') ? '✅' : '❌'}\n`;
            report += `- SendMessages: ${limitPerms.has('SendMessages') ? '✅' : '❌'}\n`;

            await interaction.reply({ content: report, ephemeral: true });
        } catch (error) {
            console.error('Error checking permissions:', error);
            await interaction.reply({ 
                content: 'Error checking permissions. Check console for details.', 
                ephemeral: true 
            });
        }
    }
} 