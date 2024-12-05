import {ApplicationCommandOptionType} from "discord.js";
import Slashcommand from "../classes/Slashcommand.js";
import ms from "ms";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import updateQueueMessages from "../utils/updateQueueMessage.js";
import { client } from "../index.js";
import { startQueuedGame } from "../utils/startQueuedGame.js";
import { Duration } from "luxon";

export default new Slashcommand({
    name: "set-deployment-time",
    description: "Set the deployment time",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [
        {
            name: "time",
            description: "The time of the deployment",
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    func: async function({ interaction }) {
        const hotDropDeploymentIntervalDuration = Duration.fromMillis(ms(interaction.options.getString("time")));

        if (!hotDropDeploymentIntervalDuration || !hotDropDeploymentIntervalDuration.isValid) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setTitle("Invalid time")
                .setDescription("Please provide a valid time");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        await startQueuedGame(hotDropDeploymentIntervalDuration);
        clearInterval(client.interval);
        client.interval = setInterval(() => {
            startQueuedGame(hotDropDeploymentIntervalDuration);
        }, hotDropDeploymentIntervalDuration.toMillis());

        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Deployment time set")
            .setDescription(`The deployment time has been set to ${hotDropDeploymentIntervalDuration.toHuman()}`);

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        await updateQueueMessages(true, client.nextGame.getTime(), false);
    }
})