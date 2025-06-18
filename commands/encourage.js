import { SlashCommandBuilder } from 'discord.js';

// yes these are ai-generated
// they're supposed to be terrible
// leave me alone
export const MESSAGES = [
    "🔐 Time to lock in, King. This ain't the moment to fumble the keys—you're about to unlock greatness.",
    "🧠 Brain? Engaged. Focus? Bolted. Let's get it, King. No distractions, just domination.",
    "💼 You've got the master key, King—now lock down those goals like the boss you are.",
    "🚪 The only thing you're unlocking today is potential. Everything else? Locked out.",
    "🔒 Lock it up, King! No open tabs, no wandering thoughts—just tunnel vision and pure hustle.",
    "👑 Kings don't wait for permission. Secure the bag, seal the deal, snap the deadbolt. Let's gooo.",
    "🚫 No time for breaks, flakes, or fakes. Lock yourself in the vault of focus, King.",
    "🔑 That \"click\" you hear? That's the sound of you locking in on your purpose. Grind time.",
    "👁️‍🗨️ Eyes on the prize. Padlock your mindset, toss the key, and let your work speak.",
    "🛠️ You built this. Now lock it down like the King of consistency you are."
];

export default {
    data: new SlashCommandBuilder()
        .setName('encourage')
        .setDescription('Get a motivational message to help you lock in'),
    execute: async (interaction) => {
        try {
            const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
            await interaction.reply(randomMessage);
            console.log('Sent encouragement to', interaction.user.tag);
        } catch (error) {
            console.error('Encourage command error:', error.message);
            await interaction.reply({ content: 'Failed to send encouragement message.', ephemeral: true });
        }
    }
}