// Package imports
import config from "./config.js";
import {error, log} from "./utils/logger.js";
import {ActivityType, Client, Collection, GatewayIntentBits} from "discord.js";

// Handlers & Database
import eventHandler from "./handlers/eventHandler.js";
import idkHowToCallThisHandler from "./handlers/interactionHandler.js";
import database from "./handlers/databaseHandler.js";

// Type imports
import Cooldown from "./classes/Cooldown.js";
import Slashcommand from "./classes/Slashcommand.js";
import SelectMenu from "./classes/SelectMenu.js";
import Button from "./classes/Button.js";
import Modal from "./classes/Modal.js";
import ContextMenu from "./classes/ContextMenu.js";
import Command from "./classes/Command.js";
import fs from "fs/promises";
import {startQueuedGame} from "./utils/startQueuedGame.js";
import gracefulShutdown from "./utils/gracefulShutdown.js";

// Define a new class that extends Client
class CustomClient extends Client {
    commands: Collection<String, Command> = new Collection();
    cooldowns: Collection<String, Cooldown> = new Collection();
    slashCommands: Collection<String, Slashcommand> = new Collection();
    selectMenus: Collection<String, SelectMenu> = new Collection();
    modals: Collection<String, Modal> = new Collection();
    contextMenus: Collection<String, ContextMenu> = new Collection();
    buttons: Collection<String, Button> = new Collection();
    queueJoinTimes: Collection<String, Date> = new Collection<String, Date>();
    battalionStrikeMode: boolean = false;
    nextGame: Date;
    interval: NodeJS.Timeout;
}

// Initialize the extended client
export const client = new CustomClient({
    // Invite link, this defines the permissions the bot has and what it can do.
    // https://discord.com/developers/applications/1312896264475508839/oauth2
    // Move Members
    //   - To set permissions on new voice channels to allow the host to kick out non squad members.
    // Create Instant Invite
    //   - To allow the host to invite others to the voice channel.
    // https://discord.com/oauth2/authorize?client_id=1312896264475508839&permissions=16777217&integration_type=0&scope=bot
    // The bot then must be given the `Manage Channels` permission on the hot drops and strikes VC categories.

    // Intents are the information that is included in the responses from discord, they do not give permissions to do any operations.
    // https://discord.com/developers/docs/events/gateway#list-of-intents
    intents: [
      // For basic bot interaction, including fetching the user id of the user performing the iteraction.
      GatewayIntentBits.Guilds,
      // To read member roles and verify they are allowed to perform bot interactions.
      GatewayIntentBits.GuildMembers,
    ],
});

//Add status when client is ready
client.on('ready', () => {
   client.user?.setActivity(config.satus.text, { type: ActivityType.Watching });
});

export const getDeploymentTime = async () => {
    const deploymentTime = await fs.readFile("./deploymentTime.txt", "utf-8");
    return Number(deploymentTime);
};

if (database.isInitialized) log("Successfully connected to the database");
idkHowToCallThisHandler.init();
eventHandler.function();

// Catching all the errors
process.on("uncaughtException", config.debugMode ? console.error : error);
process.on("unhandledRejection", config.debugMode ? console.error : error);
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

client.login(config.token).catch(error => {
    console.error('Critical error during startup:', error);
    process.exit(1);
});
