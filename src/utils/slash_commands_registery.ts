import Command, { CommandV2 } from "../classes/Command.js";
import clear_queue from "../commands/clear_queue.js";
import panel from "../commands/panel.js";
import queue_panel from "../commands/queue_panel.js";
import remove from "../commands/remove.js";
import { SetDeploymentTimeCommand } from "../commands/set_deployment_time.js";
import togglestrikemode from "../commands/togglestrikemode.js";

const _kCommands: Map<string, Command> = new Map();

_kCommands.set(clear_queue.name, clear_queue);
_kCommands.set(panel.name, panel);
_kCommands.set(queue_panel.name, queue_panel);
_kCommands.set(remove.name, remove);
_kCommands.set(togglestrikemode.name, togglestrikemode);

const _kCommandsV2: Map<string, CommandV2> = new Map();
const setDeploymentTimeCommand = new SetDeploymentTimeCommand();
_kCommandsV2.set(setDeploymentTimeCommand.name, setDeploymentTimeCommand);

export function getSlashCommand(name: string): Command | CommandV2 {
    const command = _kCommands.get(name) || _kCommandsV2.get(name);
    if (!command) {
        throw new Error(`Command: ${name} not found!`);
    }
    return command;
}

export function getAllSlashCommands(): Array<Command | CommandV2> {
    const res: Array<Command | CommandV2> = [];
    return res.concat(Array.from(_kCommands.values())).concat(Array.from(_kCommandsV2.values()));
}
