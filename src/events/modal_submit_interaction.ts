import colors from "colors";
import { ModalSubmitInteraction } from "discord.js";
import Modal from "../classes/Modal.js";
import bugReport from "../modals/bugReport.js";
import editDeployment from "../modals/editDeployment.js";
import newDeployment from "../modals/newDeployment.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import { error, log } from "../utils/logger.js";

const _kModals: Map<string, Modal> = new Map();

_kModals[bugReport.id] = bugReport;
_kModals[editDeployment.id] = editDeployment;
_kModals[newDeployment.id] = newDeployment;

function getModalById(id: string) {
    return _kModals.get(id);
}

export default {
    name: "interactionCreate",
    function: async function (interaction: ModalSubmitInteraction) {
        if (!interaction.isModalSubmit()) return;

        const modal = getModalById(interaction.customId) || getModalById(interaction.customId.split("-")[0]);
        if (!modal) return;

        try {
            log(`[Modal Submitted] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
        } catch (e) {
            error(`[Modal Error] ${interaction.id} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`)
            error(e);

            const embed = buildEmbed({ preset: "error" })
                .setDescription(":x: **An error occurred while running this command!**");

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        modal.function({ interaction });
    },
} as any;
