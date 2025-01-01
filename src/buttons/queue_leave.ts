import { Duration } from "luxon";
import config from "../config.js";
import { buildErrorEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import Button from "./button.js";

export default new Button({
    id: "leave",
    cooldown: Duration.fromDurationLike({ seconds: 0 }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        await interaction.deferUpdate();

        const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null as null);
        if (!member) {
            const errorEmbed = buildErrorEmbed()
                .setDescription("Failed to fetch your guild member data");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }


        const error = await HotDropQueue.getHotDropQueue().leave(interaction.user.id);
        if (error instanceof Error) {
            const errorEmbed = buildErrorEmbed().setDescription(error.toString());
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        await interaction.user.send({
            content: 'You left the Hot Drop Queue'
        });
    }
})