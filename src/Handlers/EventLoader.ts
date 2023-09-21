import { Client, ClientOptions } from "../../index.d";
import fs from "node:fs";

export default class EventLoader {
  private _client: Client;
  private _options: ClientOptions;

  constructor(client: Client, options: ClientOptions) {
    this._client = client;
    this._options = options;

    this._readDirectory(options.eventsDir!);
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
      let event = (await import(`${process.cwd()}/${dir}/${file.name}`)) as any;

      if (event.default) event = event.default;

      event(this._client);
    }
  }
}
