import DiscordJS, {
  Message,
  CacheType,
  ApplicationCommandOptionData,
  Embed,
  MessagePayload,
  MessageCreateOptions,
  GuildMember,
  ChatInputCommandInteraction,
  Guild,
  TextBasedChannel,
  PermissionsString,
  User,
} from "discord.js";
export class Client extends DiscordJS.Client {
  constructor(
    options:
      | (ClientOptions & DiscordJS.ClientOptions)
      | DiscordJS.ClientOptions = {
      intents: ["Guilds", "GuildMembers"],
      commandsDir: "commands",
    }
  ): Client;
  public get commands(): Collection<string, Command>;
  public get prefix(): string;
  public setPrefix(prefix: string): Client;
}

export type Listener<T extends Array<any>> = (...args: T) => void;

export type ClientEvents = {
  ready: [];
  message: [message: string];
  error: [error: Error];
};

export interface IMiddlewareOptions {
  message?: Message<boolean>;
  interaction?: ChatInputCommandInteraction<CacheType>;
  client: Client;
}

export type ClientOptions = {
  commandsDir: string;
  eventsDir?: string;
  testServers?: string[];
  middleware?: string;
  mongo?: {
    uri:
      | string
      | {
          srv: boolean;
          username: string;
          password: string;
          host: string;
          database: string;
          port: number;
        };
    dbOptions?: mongoose.ConnectOptions;
  };
};

export enum CommandType {
  SLASH = 0,
  MESSAGE = 1,
}

type BaseCommand = {
  name: string;
  description: string;
  aliases?: string[];
  type: CommandType;
  guilds?: string[];
  testOnly?: boolean;
  permission?: PermissionsString;
  options?: DiscordJS.ApplicationCommandOptionData[];
};

export enum Middleware {
  SUCCESS = true,
  FAIL = false,
}

export type Command<T extends Object = {}> = {
  data: T;
  run: (
    ctx: CommandContext<T>
  ) => string | EmbedBuilder | MessagePayload | MessageCreateOptions | void;
} & BaseCommand;

export interface CommandContext<T> {
  message: Message<boolean> | null;
  interaction: ChatInputCommandInteraction<CacheType> | null;
  args: (string | number | boolean | undefined)[] | undefined;
  client: Client;
  member: GuildMember;
  guild: Guild;
  channel: TextBasedChannel | null;
  author: User;
  data: T;
}
