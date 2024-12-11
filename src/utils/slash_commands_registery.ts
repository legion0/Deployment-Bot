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

_kCommands.set(bugreport.name, bugreport);
_kCommands.set(clear_queue.name, clear_queue);
_kCommands.set(deployment_search.name, deployment_search);
_kCommands.set(deployments.name, deployments);
_kCommands.set(panel.name, panel);
_kCommands.set(queue_panel.name, queue_panel);
_kCommands.set(remove.name, remove);
_kCommands.set(set_deployment_time.name, set_deployment_time);
_kCommands.set(togglestrikemode.name, togglestrikemode);

export function getSlashCommand(name: string): Slashcommand {
    return _kCommands.get(name);
}

export function getAllSlashCommands() {
    return Array.from(_kCommands.values());
}