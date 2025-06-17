// Use this for all other commands.

import { SlashCommandBuilder } from 'discord.js';

import { setTimeout as wait } from 'node:timers/promises';

export default {

    data: new SlashCommandBuilder()
        .setName('pinglong')
        .setDescription('Replies with pong after a delay!')
        .addIntegerOption(option => option.setName('seconds')
            .setDescription('How long in seconds to wait')
            .setRequired(true)
        ),

    execute: async (interaction) => {
        const seconds = interaction.options.getInteger('seconds') 
        await interaction.deferReply();
        await wait(seconds * 1000);
        await interaction.editReply('Pong!');
    }
}
