import {
    ActionRowBuilder,
    ButtonInteraction,
    Colors,
    ComponentType,
    DiscordjsErrorCodes,
    ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    User
} from "discord.js";
import { DateTime, Duration } from "luxon";
import Button from "../buttons/button.js";
import Modal from "../classes/Modal.js";
import config from "../config.js";
import { buildDeploymentEmbed } from "../embeds/deployment.js";
import { buildInfoEmbed } from "../embeds/embed.js";
import { buildEditDeploymentModal, DeploymentFields, getDeploymentModalValues } from "../modals/deployments.js";
import Deployment from "../tables/Deployment.js";
import { DeploymentDetails, DeploymentManager } from "../utils/deployments.js";
import { editReplyWithError, editReplyWithSuccess } from "../utils/interaction_replies.js";
import { sendErrorToLogChannel } from "../utils/log_channel.js";
import { action } from "../utils/logger.js";
import { DiscordTimestampFormat, formatDiscordTime } from "../utils/time.js";

export const DeploymentEditButton = new Button({
    id: "editDeployment",
    cooldown: Duration.fromDurationLike({ seconds: config.buttonCooldownSeconds }),
    permissions: {
        deniedRoles: config.deniedRoles,
    },
    callback: async function ({ interaction }) {
        await onDeploymentEditButtonPress(interaction);
    }
});

export const DeploymentEditModal = new Modal({
    id: "editDeployment",
    callback: async function ({ interaction }: { interaction: ModalSubmitInteraction<'cached'> }): Promise<void> {
        await onDeploymentEditModalSubmit(interaction);
    }
});

async function onDeploymentEditButtonPress(interaction: ButtonInteraction) {
    action(`User ${interaction.user.tag} attempting to edit deployment`, "EditDeployment");
    await interaction.deferReply({ ephemeral: true });

    const deployment = await _checkCanEditDeployment(interaction);
    if (deployment instanceof Error) {
        await editReplyWithError(interaction, deployment.message);
        return;
    }

    const selectMenuInteraction = await _selectFieldsToEdit(interaction);
    if (selectMenuInteraction instanceof Error) {
        await editReplyWithError(interaction, selectMenuInteraction.message);
        return;
    }
    // Now that we finished all the validation and about to show a modal, delete the select option reply.
    await interaction.deleteReply();

    const title = selectMenuInteraction.values.includes(DeploymentFields.TITLE) ? deployment.title : null;
    const difficulty = selectMenuInteraction.values.includes(DeploymentFields.DIFFICULTY) ? deployment.difficulty : null;
    const description = selectMenuInteraction.values.includes(DeploymentFields.DESCRIPTION) ? deployment.description : null;
    // We do not store the original string the user used or the user time zone and displaying the time in UTC time isn't very helpful.
    // Always show an empty field for start time.
    const startTime = selectMenuInteraction.values.includes(DeploymentFields.START_TIME) ? '' : null;
    const modal = buildEditDeploymentModal(deployment.id, title, difficulty, description, startTime);
    await selectMenuInteraction.showModal(modal);
}

async function _checkCanEditDeployment(interaction: ButtonInteraction): Promise<Deployment | Error> {
    const deployment = await Deployment.findOne({ where: { message: interaction.message.id } });
    if (!deployment) {
        return new Error("Deployment not found");
    }
    if (deployment.user !== interaction.user.id) {
        return new Error("You do not have permission to edit this deployment");
    }
    if (deployment.noticeSent) {
        return new Error("You can't edit a deployment after the notice has been sent!");
    }

    const now = DateTime.now();
    const deploymentStartTime = DateTime.fromMillis(Number(deployment.startTime));
    if (now >= deploymentStartTime) {
        return new Error("You can't edit a deployment that has already started!");
    }

    const timeUntilStart = deploymentStartTime.diff(now, 'minutes');
    const editLeadTime = Duration.fromObject({ 'minutes': config.deployment_edit_lead_time_minutes });
    if (timeUntilStart < editLeadTime) {
        return new Error(`You can't edit a deployment within ${editLeadTime.toHuman()} of its start time!\nThis deployment starts in ${timeUntilStart.toHuman()}.`);
    }
    return deployment;
}

async function _selectFieldsToEdit(interaction: ButtonInteraction): Promise<StringSelectMenuInteraction | Error> {
    const selectmenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder().setCustomId("editDeployment").setPlaceholder("Select an option").setMaxValues(4).addOptions(
            { label: "Title", value: DeploymentFields.TITLE, emoji: config.editEmoji },
            { label: "Difficulty", value: DeploymentFields.DIFFICULTY, emoji: config.editEmoji },
            { label: "Description", value: DeploymentFields.DESCRIPTION, emoji: config.editEmoji },
            { label: "Start Time", value: DeploymentFields.START_TIME, emoji: config.editEmoji }
        )
    );
    await interaction.editReply({ content: "Select an option to edit", components: [selectmenu], embeds: [] });

    let selectMenuResponse: StringSelectMenuInteraction;
    try {
        selectMenuResponse = await interaction.channel.awaitMessageComponent({
            componentType: ComponentType.StringSelect,
            time: Duration.fromDurationLike({ minutes: 1 }).toMillis(),
            filter: i => i.user.id === interaction.user.id && i.customId === "editDeployment",
        });
    } catch (e: any) {
        if (e.code == DiscordjsErrorCodes.InteractionCollectorError && e.message.includes('time')) {
            return new Error("Selection timed out");
        }
        throw e;
    }
    if (!selectMenuResponse.values || !Array.isArray(selectMenuResponse.values)) {
        return new Error("Invalid selection");
    }
    return selectMenuResponse;
}

async function onDeploymentEditModalSubmit(interaction: ModalSubmitInteraction<'cached'>) {
    action(`User ${interaction.user.tag} editing deployment`, "EditDeployment");
    await interaction.deferReply({ ephemeral: true });
    try {
        const details = getDeploymentModalValues(interaction.fields);
        if (details instanceof Error) {
            await editReplyWithError(interaction, details.message);
            return;
        }
        const deploymentId = Number(interaction.customId.split("-")[1]);

        const { newDetails, oldDetails } = await DeploymentManager.get().update(deploymentId, details);
        const embed = buildDeploymentEmbed(newDetails, Colors.Green, /*started=*/false);
        await newDetails.message.edit({ embeds: [embed] });

        if (newDetails.startTime.diff(oldDetails.startTime, 'minutes').minutes > 0) {
            await _notifyStartTimeChange(oldDetails.signups.map(s => s.guildMember.user).concat(oldDetails.backups.map(b => b.guildMember.user)), oldDetails, newDetails);
        }

        await editReplyWithSuccess(interaction, 'Deployment edited successfully');
    } catch (e: any) {
        await editReplyWithError(interaction, 'Failed to edit deployment');
        throw e;
    }
}

async function _notifyStartTimeChange(users: User[], oldDetails: DeploymentDetails, newDetails: DeploymentDetails) {
    const embed = _buildStartTimeChangeNoticeEmbed(oldDetails, newDetails);
    await Promise.all(users.map(async user => {
        // Catch individial message failures so we don't interrupt the other messages from being sent.
        try {
            await user.send({ embeds: [embed] });
        } catch (e) {
            await sendErrorToLogChannel(e, user.client);
        }
    }));
}

function _buildStartTimeChangeNoticeEmbed(oldDetails: DeploymentDetails, newDetails: DeploymentDetails) {
    const signupLink = `https://discord.com/channels/${newDetails.channel.guild.id}/${newDetails.channel.id}/${newDetails.message.id}`;
    return buildInfoEmbed()
        .setColor(Colors.Orange)
        .setTitle("Deployment Start Time changed!")
        .setDescription(`A deployment you are signed up for has changed it's start time.
Deployment Name: ${newDetails.title}
Previous Start Time: ${formatDiscordTime(oldDetails.startTime)}
New Start Time: ${formatDiscordTime(newDetails.startTime)} which is in: ${formatDiscordTime(newDetails.startTime, DiscordTimestampFormat.RELATIVE_TIME)}
Signup: ${signupLink}
`);
}
