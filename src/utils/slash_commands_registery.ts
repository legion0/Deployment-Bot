import Slashcommand from "../classes/Slashcommand.js";
import bugreport from "../slashCommands/bugreport.js";
import clear_queue from "../slashCommands/clear_queue.js";
import deployment_search from "../slashCommands/deployment_search.js";
import deployments from "../slashCommands/deployments.js";
import panel from "../slashCommands/panel.js";
import queue_panel from "../slashCommands/queue_panel.js";
import remove from "../slashCommands/remove.js";
import set_deployment_time from "../slashCommands/set_deployment_time.js";
import togglestrikemode from "../slashCommands/togglestrikemode.js";

const _kCommands: Map<string, Slashcommand> = new Map();

_kCommands[bugreport.name] = bugreport;
_kCommands[clear_queue.name] = clear_queue;
_kCommands[deployment_search.name] = deployment_search;
_kCommands[deployments.name] = deployments;
_kCommands[panel.name] = panel;
_kCommands[queue_panel.name] = queue_panel;
_kCommands[remove.name] = remove;
_kCommands[set_deployment_time.name] = set_deployment_time;
_kCommands[togglestrikemode.name] = togglestrikemode;

export function getSlashCommand(name: string): Slashcommand {
    return _kCommands.get(name);
}

export function getAllSlashCommands() {
    return Array.from(_kCommands.values());
}