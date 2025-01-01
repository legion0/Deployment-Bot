import { PermissionFlagsBits } from "discord.js";
import Command from "../classes/Command.js";
import { buildSuccessEmbed } from "../embeds/embed.js";
import { HotDropQueue } from "../utils/hot_drop_queue.js";
import { action, success } from "../utils/logger.js";

export default new Command({
    name: "clear-queue",
    description: "Clear the queue",
    permissions: {
        requiredPermissions: [PermissionFlagsBits.Administrator]
    },
    options: [],
    callback: async function ({ interaction }) {
        action(`${interaction.user.tag} clearing queue`, "QueueClear");
        
        await HotDropQueue.getHotDropQueue().clear();
        success(`Queue cleared by ${interaction.user.tag}`, "QueueClear");

        const embed = buildSuccessEmbed()
            .setTitle("Queue cleared")
            .setDescription("The queue has been cleared");

        await interaction.reply({ embeds: [embed], ephemeral: true });

    }
})
