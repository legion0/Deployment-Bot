import { Client, EmbedBuilder, GuildTextBasedChannel } from "discord.js";
import { error } from "./logger.js";
import discord_server_config from "../config/discord_server.js";

export async function sendErrorToLogChannel(e: Error, client: Client) {
    error(e);
    const logChannel = await client.channels.fetch(discord_server_config.channels.error_log_channel_id).catch(e => {
        error('Failed to fetch log channel');
        error(e);
    }) as GuildTextBasedChannel;
    await logChannel.send({ content: e.toString() }).catch(e => {
        error('Failed to send error to log channel');
        error(e);
    });
}

export async function sendEmbedToLogChannel(embed: EmbedBuilder, client: Client) {
    const logChannel = await client.channels.fetch(discord_server_config.channels.log_channel_id).catch(e => {
        error('Failed to fetch log channel');
        error(e);
    }) as GuildTextBasedChannel;
    await logChannel.send({ embeds: [embed] }).catch(e => {
        error('Failed to send embed to log channel');
        error(e);
    });
}
