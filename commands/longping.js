// Use this for all other commands.

const { SlashCommandBuilder } = require('discord.js');

const wait = require('node:timers/promises').setTimeout;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pinglong')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        await interaction.deferReply();
        await wait(4000);
        await interaction.editReply('Pong!');
    },
};
