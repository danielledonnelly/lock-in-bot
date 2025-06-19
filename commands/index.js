// import LongPing from './longping.js';
// import Ping from './ping.js';
import Check from './check.js';
import Switch from './switch.js';
import Encourage from './encourage.js';
import Lockout from './lockout.js';

import { Collection, REST, Routes } from 'discord.js';
import Config from '../util/config.js';

const commands = [
    // LongPing,
    // Ping,
    Check,
    Switch,
    Encourage,
    Lockout,
];

export default {

    // This will initialize all the commands supplied in the array above
    init: async (client) => {
        const rest = new REST().setToken(Config.BotToken);

        // This loads all the commands in the commands folder
        client.commands = new Collection();

        const applicationCommands = [];
        for (const command of commands) {
            // Set a new item in the Collection with the key as the command name and the value as the exported module
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                applicationCommands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }

        // The put method is used to fully refresh all commands in the guild or globally
        const commandRoute = Config.Debug ? Routes.applicationGuildCommands(Config.ClientID, Config.ServerID) : Routes.applicationCommands(Config.ClientID)
        const data = await rest.put(
            commandRoute,
            { body: applicationCommands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
}