import colors from "colors";
import { error, log } from "../utils/logger.js";
import { client } from "../custom_client.js";
import { ButtonInteraction } from "discord.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import Cooldown from "../classes/Cooldown.js";
import checkBlacklist from "../utils/interaction/checkBlacklist.js";
import hasRequiredPermissions from "../utils/interaction/hasRequiredPermissions.js";
import checkCooldowns from "../utils/interaction/checkCooldown.js";
import hasRequiredRoles from "../utils/interaction/hasRequiredRoles.js";

import deleteDeployment from "../buttons/deleteDeployment.js";
import editDeployment from "../buttons/editDeployment.js";
import host from "../buttons/host.js";
import join from "../buttons/join.js";
import leave from "../buttons/leave.js";
import leaveDeployment from "../buttons/leaveDeployment.js";
import newDeployment from "../buttons/newDeployment.js";
import Button from "../classes/Button.js";

const _kButtons: Map<string, Button> = new Map();

_kButtons[deleteDeployment.id] = deleteDeployment;
_kButtons[editDeployment.id] = editDeployment;
_kButtons[host.id] = host;
_kButtons[join.id] = join;
_kButtons[leave.id] = leave;
_kButtons[leaveDeployment.id] = leaveDeployment;
_kButtons[newDeployment.id] = newDeployment;

function getButtonById(id: string): Button | undefined {
	return _kButtons.get(id);
}

export default {
	name: "interactionCreate",
	function: async function (interaction: ButtonInteraction) {
		if (!interaction.isButton()) return;

		const button = getButtonById(interaction.customId) || getButtonById(interaction.customId.split("-")[0]);
		if (!button) return;

		if (await checkBlacklist(interaction, button.blacklistedRoles)) return;
		if (!(await hasRequiredRoles(interaction, button.requiredRoles))) return;
		if (!(await hasRequiredPermissions(interaction, button.permissions))) return;
		if (await checkCooldowns(interaction, client.cooldowns.get(`${interaction.user.id}-${button.id}`))) return;

		try {
			log(`${colors.cyan('[Button Clicked]')} ${colors.yellow(interaction.customId)} ${colors.blue('||')} ${colors.green('Author:')} ${colors.magenta(interaction.user.username)}`);
			button.function({ interaction });
		} catch (e) {
			error(`${colors.red('[Button Error]')} ${colors.yellow(interaction.customId)} ${colors.blue('||')} ${colors.green('Author:')} ${colors.magenta(interaction.user.username)} ${colors.red('||')} ${e}`);
			error(e);

			const embed = buildEmbed({ preset: "error" })
				.setDescription(":x: **An error occurred while executing this command!**");

			await interaction.reply({ embeds: [embed], ephemeral: true });
		}

		if (button.cooldown) {
			client.cooldowns.set(`${interaction.user.id}-${button.id}`, new Cooldown(`${interaction.user.id}-${button.id}`, button.cooldown));
		}
	},
};