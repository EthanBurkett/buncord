import DiscordJS, {
  CacheType,
  ChatInputCommandInteraction,
  Collection,
  EmbedBuilder,
  Interaction,
  Message,
  MessageCreateOptions,
  MessagePayload,
} from "discord.js";
import { Client } from "..";
import { ClientOptions, Command } from "../../index.d";

export default class CommandHandler {
  private _commands: Collection<string, Command> = new Collection();
  private _options: ClientOptions;
  private _client: Client;
  constructor(client: Client, options: ClientOptions) {
    this._commands = client.commands;
    this._options = options;
    this._client = client;

    client.on("interactionCreate", async (interaction) => {
      await this._interaction(
        interaction as ChatInputCommandInteraction<CacheType>
      );
    });

    client.on("messageCreate", async (message) => {
      await this._message(message);
    });
  }

  private async _interaction(
    interaction: ChatInputCommandInteraction<CacheType>
  ) {
    const middleware = await this._middleware({ interaction });

    if (!middleware) return;

    if (!interaction || !interaction.guild || !interaction.isCommand()) return;

    const command = this._commands.get(interaction.commandName);
    if (!command) return;

    const member = await interaction.guild?.members.fetch(interaction.user.id);
    if (!member) return;

    if (command.guilds && !command.guilds.includes(interaction.guildId!))
      return;

    if (
      (command.testOnly || command.guilds) &&
      !this._testServer({ interaction }, command)
    )
      return;

    if (command.permission) {
      const hasPermission = await member.permissions.has(command.permission);
      if (!hasPermission) return;
    }

    const args = interaction.options.data.map((option) => option.value);

    const reply = await command.run({
      message: null,
      interaction,
      author: interaction.user,
      channel: interaction.channel,
      data: command.data,
      guild: interaction.guild,
      args,
      client: this._client,
      member,
    });

    this._replyFromCallback(reply, interaction, interaction.client, command);
  }
  private async _message(message: Message<boolean>) {
    const middleware = await this._middleware({ message });
    if (!middleware) return;

    if (!message || !message.guild) return;

    let prefix = this._client.prefix;
    const cachedPrefixes = this._client.cache.prefixes;

    if (cachedPrefixes)
      if (cachedPrefixes.has(message.guild.id))
        prefix = cachedPrefixes.get(message.guild.id)!;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this._commands.get(commandName);
    if (!command) return;

    const member = await message.guild.members.fetch(message.author.id);
    if (!member) return;

    if (
      (command.guilds || command.testOnly) &&
      !this._testServer({ message }, command)
    )
      return;

    if (command.permission) {
      const hasPermission = await member.permissions.has(command.permission);
      if (!hasPermission) return;
    }

    const reply = await command.run({
      message,
      interaction: null,
      args,
      author: message.author,
      channel: message.channel,
      data: command.data,
      guild: message.guild,
      client: this._client,
      member,
    });

    this._replyFromCallback(reply, message, message.client, command);
  }

  private async _middleware({
    message,
    interaction,
  }: {
    message?: Message<boolean>;
    interaction?: ChatInputCommandInteraction<CacheType>;
  }) {
    if (this._client.middleware) {
      try {
        return await this._client.middleware({
          message,
          interaction,
          client: this._client,
        });
      } catch (e) {
        this._client.error(e);
        return false;
      }
    } else {
      return true;
    }
  }

  private async _testServer(
    {
      message,
      interaction,
    }: {
      message?: Message<boolean>;
      interaction?: ChatInputCommandInteraction<CacheType>;
    },
    command: Command
  ) {
    const msgOrInter = message ? message : interaction;
    const guilds = command.guilds ? command.guilds : this._options.testServers;

    return guilds?.includes(msgOrInter!.guild!.id);
  }

  private _replyFromCallback(
    reply: string | void | MessageCreateOptions | EmbedBuilder | MessagePayload,
    msgOrInter: any,
    client: DiscordJS.Client<boolean>,
    command: Command
  ) {
    if (!reply) return;
    else if (reply instanceof EmbedBuilder) {
      return msgOrInter
        .reply({
          embeds: [reply],
        })
        .catch((e: any) => {
          if (msgOrInter.editReply) {
            msgOrInter.editReply(reply).catch((e: any) => {
              console.log(e);
              client.error(`Failed to reply. Command: ${command.name}`);
            });
          } else {
            console.log(e);
            client.error(`Failed to reply. Command: ${command.name}`);
          }
        });
    } else if (typeof reply == "string") {
      return msgOrInter.reply(reply).catch((e: any) => {
        if (msgOrInter.editReply) {
          msgOrInter.editReply(reply).catch((e: any) => {
            console.log(e);
            client.error(`Failed to reply. Command: ${command.name}`);
          });
        } else {
          console.log(e);
          client.error(`Failed to reply. Command: ${command.name}`);
        }
      });
    } else {
      return msgOrInter.reply(reply).catch((e: any) => {
        if (msgOrInter.editReply) {
          msgOrInter.editReply(reply).catch((e: any) => {
            console.log(e);
            client.error(`Failed to reply. Command: ${command.name}`);
          });
        } else {
          console.log(e);
          client.error(`Failed to reply. Command: ${command.name}`);
        }
      });
    }
  }
}
