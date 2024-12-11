import fs from "fs/promises";
import { DateTime, Duration } from "luxon";
import { startQueuedGameImpl } from "./startQueuedGame.js";
import { sendErrorToLogChannel } from "./log_channel.js";
import { Client } from "discord.js";
import updateQueueMessages from "./updateQueueMessage.js";

async function readDeploymentInterval() {
    return Duration.fromMillis(Number(await fs.readFile("./deploymentTime.txt", "utf-8")));
};

async function writeDeploymentInterval(deploymentInterval: Duration) {
    await fs.writeFile("../deploymentTime.txt", deploymentInterval.toMillis().toString(), "utf-8");
};


export class HotDropQueue {
    public constructor(client: Client) {
        this._client = client;
    }
    public async init() {
        this._deploymentInterval = await readDeploymentInterval();
        this._nextGame = DateTime.now().plus(this._deploymentInterval);
        this._timeout = setTimeout(() => {
            this._startNewGames();
        }, this._deploymentInterval.toMillis()).unref();
    }

    // Set the next hot drop or strike to start duration into the future.
    // For hot drops, this becomes the new duration between hot drops.
    public async setDeploymentTime(deploymentInterval: Duration) {
        await writeDeploymentInterval(deploymentInterval);
        this._deploymentInterval = deploymentInterval;
        this._nextGame = DateTime.now().plus(this._deploymentInterval);

        clearTimeout(this._timeout);
        this._timeout = setTimeout(() => {
            this._startNewGames();
        }, this._deploymentInterval.toMillis()).unref();

        await this.updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);

    }

    public async toggleStrikeMode() {
        this._strikeModeEnabled = !this._strikeModeEnabled;
        this.updateMessage(/*notEnoughPlayers=*/true, /*deploymentCreated=*/false);
    }

    public async updateMessage(notEnoughPlayers: boolean, deploymentCreated: boolean) {
        return updateQueueMessages(notEnoughPlayers, this._nextGame.toMillis(), deploymentCreated);
    }

    private async _startNewGames() {
        let deploymentCreated = false;
        try {
            deploymentCreated = await startQueuedGameImpl(this.strikeModeEnabled);
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
        this._nextGame = this._nextGame.plus(this._deploymentInterval);
        this._strikeModeEnabled = false;
        try {
            await this.updateMessage(/*notEnoughPlayers=*/!deploymentCreated, /*deploymentCreated=*/deploymentCreated);
        } catch (e: any) {
            await sendErrorToLogChannel(e, this._client);
        }
    }

    public get strikeModeEnabled() {
        return this._strikeModeEnabled;
    }
    public get nextGame() {
        return this._nextGame;
    }

    private _client: Client;
    private _timeout: NodeJS.Timeout;
    private _deploymentInterval: Duration;
    private _strikeModeEnabled: boolean;
    private _nextGame: DateTime;
}

let _kHotDropQueue: HotDropQueue = null;

export async function startHotDropQueue(client: Client) {
    _kHotDropQueue = new HotDropQueue(client);
    _kHotDropQueue.init();
}

export function getHotDropQueue() {
    return _kHotDropQueue;
}
