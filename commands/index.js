// import LongPing from './longping.js';
// import Ping from './ping.js';
import Check from './check.js';
import Switch from './switch.js';
import Encourage from './encourage.js';
import Lockout from './lockout.js';
import TestReminder from './testreminder.js';
import CheckPerms from './checkperms.js';

import { Collection, REST, Routes } from 'discord.js';
import Config from '../util/config.js';

const commands = [
    // LongPing,
    // Ping,
    Check,
    Switch,
    Encourage,
    Lockout,
    TestReminder,
    CheckPerms,
];

export default {
    // This will initialize all the commands supplied in the array above
    init: async (client) => {
        const rest = new REST().setToken(Config.BotToken);

        try {
            // Now proceed with registering new commands
            client.commands = new Collection();

            const applicationCommands = [];
            for (const command of commands) {
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    applicationCommands.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] The command is missing a required "data" or "execute" property.`);
                }
            }

            // Register new commands (either globally or to guild based on Debug setting)
            // Registration disabled – assume commands are already registered in Discord.
            console.log(`Commands loaded into client collection (${applicationCommands.length}). Registration skipped.`);
        } catch (error) {
            console.error('Error during command setup:', error);
        }
    }
}