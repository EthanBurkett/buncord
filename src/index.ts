import { ClientOptions, IMiddlewareOptions } from "../index.d";
import DiscordJS from "discord.js";
import CommandLoader from "./Handlers/CommandLoader";
import chalk from "chalk";
import CommandHandler from "./Handlers/CommandHandler";
import mongoose from "mongoose";
import EventLoader from "Handlers/EventLoader";

declare module "discord.js" {
  interface Client {
    log: (...message: any[]) => void;
    error: (...message: any[]) => void;
    cache: {
      prefixes: DiscordJS.Collection<string, string>;
    };
    middleware: (ctx: IMiddlewareOptions) => Promise<boolean>;
  }
  interface ClientEvents {
    commandsReady: [];
  }
}

export class Client extends DiscordJS.Client {
  private _commandLoader: CommandLoader;
  private _commandHandler?: CommandHandler;
  private _eventLoader?: EventLoader;
  private _prefix: string = "!";
  constructor(
    options:
      | (ClientOptions & DiscordJS.ClientOptions)
      | DiscordJS.ClientOptions = {
      intents: ["Guilds", "GuildMembers"],
      commandsDir: "commands",
    }
  ) {
    super(options);
    this.cache = {
      prefixes: new DiscordJS.Collection(),
    };
    this.log = (...message: any[]) => {
      console.log(chalk.bgBlackBright(chalk.greenBright("[LOG]")), ...message);
    };
    this.error = (...message: any[]) => {
      console.log(chalk.bgBlackBright(chalk.red("[ERROR]")), ...message);
    };
    this._commandLoader = new CommandLoader(this, options as ClientOptions);
    this.on("commandsReady", () => {
      this._commandHandler = new CommandHandler(this, options as ClientOptions);
    });

    const opts = options as ClientOptions;

    if (opts.eventsDir)
      this._eventLoader = new EventLoader(this, options as ClientOptions);

    if (opts.middleware) {
      import(`${process.cwd()}/${(options as ClientOptions).middleware}`)
        .then((middleware) => {
          this.middleware = middleware.default
            ? middleware.default
            : middleware;
        })
        .catch((e) => this.error(e));
    }
    if (opts.mongo) {
      this._mongo(opts);
    }

    return this;
  }
  private async _mongo(options: ClientOptions) {
    mongoose.set("strictQuery", true);
    try {
      // @ts-ignore
      await mongoose.connect(options.mongo?.uri!, options.mongo?.dbOptions);

      this.log(`Connected to MongoDB.`);
    } catch (e: any) {
      this.error(`Failed to connect to MongoDB: ${e}`);
      process.exit(0);
    }
  }

  public get commands() {
    return this._commandLoader.commands;
  }
  public get prefix() {
    return this._prefix;
  }
  public setPrefix(prefix: string) {
    this._prefix = prefix;
    return this;
  }
}
