# Disbun

<p align="center">
  <img src="https://user-images.githubusercontent.com/709451/182802334-d9c42afe-f35d-4a7b-86ea-9985f73f20c3.png" width="200" />
</p>

disbun is a discord js command handler optimized for speed by using native bun functions.

# Getting Started

As bun has built-in typescript compilation, this library will **not** work
with NodeJS. Support may come soon but for now, it is not supported.

# Prerequisites

You will need to have bun installed globally on your machine.

## Installing Bun

### Windows

```bash
npm i -g bun
```

### Linux

```bash
curl -fsSL https://bun.sh/install | bash
```

## Installing disbun CLI

```bash
bun add --global disbun-cli
```

## Initializing a project

Starting a project with disbun is easy. Just run the following command in your terminal:

```sh
disbun
```

# Now the good stuff

Now we'll go through setting up your client, adding commands, setting up middleware, MongoDB, and creating events.

## Setting up the client

It's as simple as this:

```ts
import { Client } from "disbun";

new Client({
  commandsDir: "src/commands",
  intents: ["Guilds", "GuildMessages", "MessageContent"], // Message content intent required if you're using prefixed commands
}).login(process.env.BOT_TOKEN);
```

### All methods on the client class

```ts
import { Client } from "disbun";

const client = new Client({
  commandsDir: "src/commands";
  eventsDir: "src/events";
  middleware: "src/middleware"; // Runs as raw data when interactions or messages are created
  testServers: ["guild id"],
  intents: ["Guilds", "GuildMessages"];
  mongo: {
    uri: "mongo uri" OR {
      username: string;
      password: string;
      host: string;
      port: number;
      database: string;
    };
    options: ConnectionOptions;
  }
}).setPrefix(string)

client.on("event", () => {

})

client.login(string);
```

## Adding commands

Adding commands are almost as easy as setting up the project, just use the following CLI command or create a file and copy the template below.

```sh
disbun-cli add
```

```ts
import { Command, CommandType } from "disbun";

export default {
  name: "ping",
  description: "Returns funny message",
  type: CommandType.SLASH, // Or CommandType.MESSAGE for legacy commands
  run: async ({ interaction }) => {
    return "Pong!";
  },
} as Command;
```

### All command methods

```ts
import { Command, CommandType } from "disbun";

export default {
  name: "pong",
  description: "Returns very unfunny message.",
  type: CommandType.SLASH,
  testOnly: true, // To be used with testServers in client options
  guilds: ["guild id"], // Enable test only for specific guilds without changing testServers
  permission: "Administrator",
  data: {
    my: "custom data :O",
    custom: true,
    command: 1,
    data: [],
  }
  options: [], // For slash command arguments
  run: async ({
    message, // Message object for legacy commands
    interaction, // Interaction object for slash commands
    args,
    client,
    member,
    guild,
    channel,
    author,
    data,
  }) => {
    return `${data.my} ${data.custom} ${data.command} ${data.data}`
  }
} as Command<{
  my: string;
  custom: boolean;
  command: number;
  data: Array<unknown>;
}>;
```

## Adding events

Just like commands, adding events is easy. Not sure how many more times I can say that.

```sh
disbun-cli add
```

```ts
import { Client } from "disbun";

export default (client: Client) => {
  client.on("event", () => {
    // Do stuff
  });
};
```

## Middleware

Middleware is a way to run code before commands are executed. This is useful for things like cooldowns, permissions, and more.

##### NOTE: Middleware MUST return a Middleware code (yes it's just true and false, the enum is for code readability). You can use the Middleware enum to return proper codes.

`middleware/index.ts`

```ts
import { IMiddlewareOptions, Middleware } from "disbun";

export default async ({ client, interaction, message }: IMiddlewareOptions) => {
  if (interaction.isCommand()) return Middleware.SUCCESS;
};
```

> :warning: **This project is currently under development and not ready for a production environment**
