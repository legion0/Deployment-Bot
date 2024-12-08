import colors from "colors";
import { error, log } from "../utils/logger.js";
import { CommandInteraction, InteractionType, PermissionsBitField } from "discord.js";
import { client } from "../index.js";
import Cooldown from "../classes/Cooldown.js";
import { buildEmbed } from "../utils/embedBuilders/configBuilders.js";
import checkBlacklist from "../utils/interaction/checkBlacklist.js";
import hasRequiredRoles from "../utils/interaction/hasRequiredRoles.js";
import hasRequiredPermissions from "../utils/interaction/hasRequiredPermissions.js";
import checkCooldowns from "../utils/interaction/checkCooldown.js";

export default {
	name: "interactionCreate",
	function: async function (interaction: CommandInteraction) {
		if (interaction.type !== InteractionType.ApplicationCommand) return;
		if (!interaction.isChatInputCommand()) return;

		const command = client.slashCommands.get(interaction.commandName);
		if (!command) return;

		if (await checkBlacklist(interaction, command.blacklistedRoles)) return;
		if (!(await hasRequiredRoles(interaction, command.requiredRoles))) return;
		if (!(await hasRequiredPermissions(interaction, command.permissions))) return;
		if (await checkCooldowns(interaction, client.cooldowns.get(`${interaction.user.id}-${command.name}`))) return;

		try {
			command.function({ interaction, options: interaction.options });
			log(`[Command Ran] ${interaction.commandName} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"}`);
		} catch (e) {
			error(`[Command Error] ${interaction.commandName} ${colors.blue("||")} Author: ${interaction.user.username} ${colors.blue("||")} ID: ${interaction.user.id} ${colors.blue("||")} Server: ${interaction.guild?.name || "DM"} ${colors.red("||")} ${e}`);
			error(e);

			const embed = buildEmbed({ preset: "error" })
				.setDescription(":x: **An error occurred while executing this command!**");

			await interaction.reply({ embeds: [embed], ephemeral: true });
		}

		if (command.cooldown) {
			if (!interaction.inCachedGuild() || !interaction.member!.permissions.has(PermissionsBitField.Flags.Administrator)) {
				client.cooldowns.set(`${interaction.user.id}-${command.name}`, new Cooldown(`${interaction.user.id}-${command.name}`, command.cooldown));
			}
		}
	},
};