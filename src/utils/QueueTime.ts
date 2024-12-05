import { Snowflake } from "discord.js";
import { DateTime, Duration } from "luxon";
import discord_server_config from "../config/discord_server.js";

const nextDeploymentInterval: Map<Snowflake, Duration> = new Map();

export function getNextHotDropInterval(guildId: Snowflake) {
    return nextDeploymentInterval.get(guildId) || Duration.fromObject({'seconds': discord_server_config.default_hot_drop_interval_seconds});
}

export function setNextHotDropInterval(guildId: Snowflake, duration: Duration) {
    nextDeploymentInterval.set(guildId, duration);
}
