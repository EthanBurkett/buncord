import fs, { fstat } from "node:fs";
import { Client, ClientOptions, Command, CommandType } from "../../index.d";
import { Collection } from "@discordjs/collection";
import chalk from "chalk";
import { ApplicationCommand, ApplicationCommandOptionData } from "discord.js";

export default class CommandLoader {
  private _client: Client;
  private _options: ClientOptions;
  public commands: Collection<string, Command> = new Collection();
  constructor(client: Client, options: ClientOptions) {
    const commandsDir = options.commandsDir;
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir);
    }

    this._client = client;
    this._options = options;

    this._readDirectory(commandsDir);

    this._client.on("ready", () => {
      this._updateSlash().then(() => this._client.emit("commandsReady"));
    });
  }

  private async _readDirectory(dir: string): Promise<void> {
    const files = fs.readdirSync(dir, {
      withFileTypes: true,
    });

    // is directory
    for (const file of files) {
      if (file.isDirectory()) {
        this._readDirectory(`${dir}/${file.name}`);
        continue;
      }

      const commandName = file.name.slice(0, file.name.indexOf("."));
      let command = (await import(
        `${process.cwd()}/${dir}/${file.name}`
      )) as any;
      if (command.default) command = command.default as Command;

      this.commands.set(commandName, command);
    }
  }

  private async _updateSlash(): Promise<void> {
    const commands = await this._client.application?.commands.fetch();
    commands?.map(async (command) => {
      if (this.commands.find((c) => c.name === command.name)) return;

      await command.delete();
      this._client.log(
        `Deleted command ${command.name} due to it missing from the file system.`
      );
    });

    this._client.guilds.cache.map(async (guild) => {
      const commands = await guild.commands.fetch();
      commands?.map(async (command) => {
        if (this.commands.find((c) => c.name === command.name)) return;

        await command.delete().catch(() => {});
        this._client.log(
          `Deleted command ${command.name} due to it missing from the file system.`
        );
      });
      if (!commands) return;

      const guildCommands = this.commands.filter(
        (command) =>
          command.testOnly ?? command.guilds?.includes(guild.id) ?? false
      );

      // delete commands that are not in the guildCommands
      commands.map(async (command) => {
        if (!guildCommands.find((c) => c.name == command.name)) {
          await command.delete().catch(() => {});
          this._client.log(
            `Deleted command ${command.name} from guild ${chalk.bold(
              guild.name
            )} (${guild.id}) due to it not being included for testing.`
          );
        }
      });

      for (const [_, command] of this.commands) {
        if (
          command.type == CommandType.MESSAGE &&
          commands.find((c) => c.name == command.name)
        ) {
          const guilds = command.guilds
            ? command.guilds
            : this._options.testServers;

          for (const g of guilds!) {
            await guild.commands.fetch().then(async (cmds) => {
              await cmds
                .find((c) => c.name == command.name)
                ?.delete()
                .catch(() => {});
              return;
            });

            this._client.log(
              `Deleted command ${command.name} from guild ${chalk.bold(
                guild.name
              )} (${guild.id}) due to it being a message command.`
            );
          }
        }
      }

      this.commands.map(async (command) => {
        if (
          !commands.find((c) => c.name === command.name) &&
          command.type == CommandType.SLASH &&
          (command.guilds || command.testOnly)
        ) {
          const guilds = command.guilds
            ? command.guilds
            : this._options.testServers;

          for (const g of guilds!) {
            if (!command || !command.name) return;
            await this._create({
              name: command.name,
              description: command.description,
              options: command.options ?? [],
              guildId: g,
            });
          }
        }
      });
    });

    if (!commands) return;

    // delete commands that are not in the commands

    // create any non existing command
    this.commands.map(async (command) => {
      if (
        !commands.find((c) => c.name === command.name) &&
        command.type == CommandType.SLASH &&
        !command.guilds &&
        !command.testOnly
      ) {
        await this._create({
          name: command.name,
          description: command.description,
          options: command.options ?? [],
        });
        this._client.log(`Created command ${command.name}`);
      }
    });

    for (const [_, command] of this.commands) {
      if (
        command.type == CommandType.MESSAGE &&
        commands.find((c) => c.name == command.name)
      ) {
        await commands.find((c) => c.name == command.name)?.delete();
        this._client.log(
          `Deleted command ${command.name} due to it being a message command.`
        );
      }
    }
  }

  private async _create({
    name,
    description,
    guildId,
    options,
  }: {
    name: string;
    description: string;
    options: ApplicationCommandOptionData[];
    guildId?: string;
  }): Promise<ApplicationCommand<{}> | undefined> {
    let commands;

    if (guildId) commands = this._client.guilds.cache.get(guildId)?.commands;
    else commands = this._client.application?.commands;

    if (!commands) return;

    const cmd = commands.cache.find(
      (cmd) => cmd.name == name
    ) as ApplicationCommand;

    if (cmd) {
      const optionsChanged = this.didOptionsChange(cmd, options);

      if (
        (cmd.options &&
          cmd.description &&
          options &&
          cmd.options.length != options.length!) ||
        cmd.description !== description ||
        optionsChanged
      ) {
        this._client.log(
          `Updating command ${name}${
            guildId
              ? ` for guild ${chalk.bold(
                  this._client.guilds.cache.get(guildId)?.name
                )} (${guildId})`
              : ``
          } due to it being changed.`
        );

        return commands?.edit(cmd.id, {
          name,
          description,
          options,
        });
      }

      return Promise.resolve(cmd);
    }

    if (commands) {
      this._client.log(
        `Created command ${name} for guild ${chalk.bold(
          this._client.guilds.cache.get(guildId!)?.name
        )} (${guildId})`
      );

      const newCommand = await commands.create({
        name,
        description,
        options,
      });

      return newCommand;
    }

    return Promise.resolve(undefined);
  }

  private didOptionsChange(
    command: ApplicationCommand,
    options: ApplicationCommandOptionData[] | any
  ): boolean {
    return (
      command.options?.filter((opt: any, index: any) => {
        return (
          opt?.required !== options[index]?.required &&
          opt?.name !== options[index]?.name &&
          opt?.options?.length !== options.length
        );
      }).length !== 0
    );
  }
}
