import {
    ActionRowBuilder,
    ModalBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import Button from "../classes/Button.js";
import Deployment from "../tables/Deployment.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import config from "../config.js";
import {action, error, warn} from "../utils/logger.js";
import { DateTime, Duration } from "luxon";

export default new Button({
    id: "editDeployment",
    cooldown: config.buttonCooldown,
    permissions: [],
    requiredRoles: [],
    blacklistedRoles: [...config.blacklistedRoles],
    callback: async function ({ interaction }) {
        action(`User ${interaction.user.tag} attempting to edit deployment`, "EditDeployment");
        
        const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });

        if (!deployment) {
            error("Deployment not found", "EditDeployment");
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Deployment not found");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (deployment.user !== interaction.user.id) {
            warn(`Unauthorized edit attempt by ${interaction.user.tag}`, "EditDeployment");
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You do not have permission to edit this deployment");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if(deployment.noticeSent) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You can't edit a deployment after the notice has been sent!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const now = DateTime.now();
        const deploymentStartTime = DateTime.fromMillis(Number(deployment.startTime));

        if (now >= deploymentStartTime) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("You can't edit a deployment that has already started!");

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const timeUntilStart = deploymentStartTime.diff(now, 'minutes');
        const editLeadTime = Duration.fromObject({'minutes': config.deployment_edit_lead_time_minutes});
        
        if (timeUntilStart < editLeadTime) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription(`You can't edit a deployment within ${editLeadTime.toHuman()} of its start time!\nThis deployment starts in ${timeUntilStart.toHuman()}.`);
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const selectmenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder().setCustomId("editDeployment").setPlaceholder("Select an option").setMaxValues(4).addOptions(
                { label: "Title", value: "title", emoji: config.editEmoji },
                { label: "Difficulty", value: "difficulty", emoji: config.editEmoji },
                { label: "Description", value: "description", emoji: config.editEmoji },
                { label: "Start Time", value: "startTime", emoji: config.editEmoji }
            )
        );

        await interaction.reply({ content: "Select an option to edit", components: [selectmenu], ephemeral: true });

        const selectmenuInteraction: StringSelectMenuInteraction = await interaction.channel.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id && i.customId === "editDeployment",
            time: 120000
        }).catch(() => null);

        if (!selectmenuInteraction) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Selection timed out");

            return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
        }

        // Delete the select menu message
        await interaction.deleteReply();

        const rows = [];

        if (!selectmenuInteraction.values || !Array.isArray(selectmenuInteraction.values)) {
            const errorEmbed = buildEmbed({ preset: "error" })
                .setDescription("Invalid selection");

            return await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => null);
        }

        for (const choice of selectmenuInteraction.values) {
            switch (choice) {
                case "title":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("title").setLabel("Title").setPlaceholder("Deployment Title").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50).setValue(deployment.title)
                        )
                    );
                    break;
                case "difficulty":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("difficulty").setLabel("Difficulty").setPlaceholder("Deployment Difficulty").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(15).setValue(deployment.difficulty)
                        )
                    );
                    break;
                case "description":
                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("description").setLabel("Description").setPlaceholder("Deployment Description").setRequired(true).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setValue(deployment.description)
                        )
                    );
                    break;
                case "startTime":
                    const date = new Date(Number(deployment.startTime));

                    rows.push(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder().setCustomId("startTime").setLabel("Start Time").setPlaceholder("YYYY-MM-DD HH UTC+2").setRequired(true).setStyle(TextInputStyle.Short).setMaxLength(50).setValue(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()} ${date.getUTCHours()}:${date.getUTCMinutes()} UTC+0`)
                        )
                    );
                    break;
            }
        }

        const modal = new ModalBuilder().setTitle("Edit Deployment").setCustomId(`editDeployment-${deployment.id}`).addComponents(rows)

        await selectmenuInteraction.showModal(modal);
    }
})
