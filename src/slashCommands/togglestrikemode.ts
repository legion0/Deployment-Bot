import Slashcommand from "../classes/Slashcommand.js";
import {buildEmbed} from "../utils/embedBuilders/configBuilders.js";
import { getHotDropQueue } from "../utils/hot_drop_queue.js";

export default new Slashcommand({
    name: "togglestrikemode",
    description: "Toggle battalion strike mode - Randomizes the hotdrop queue",
    permissions: ["Administrator"],
    requiredRoles: [],
    blacklistedRoles: [],
    cooldown: 0,
    options: [],
    func: ({ interaction }) => {
        getHotDropQueue().toggleStrikeMode();
        const successEmbed = buildEmbed({ preset: "success" })
            .setTitle("Strike Mode Toggle")
            .setDescription(`Strike mode ${getHotDropQueue().strikeModeEnabled ? "enabled" : "disabled"}!`);
        interaction.reply({ embeds: [successEmbed], ephemeral: true });
    }}
);