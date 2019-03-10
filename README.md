# tinc-discord

TincVPN 1.1+ invite bot for [Discord](discordapp.com) (Eris) written in Typescript.

Tinc implements [invitations](https://www.tinc-vpn.org/documentation-1.1/How-invitations-work.html#How-invitations-work) in 1.1+ branch which streamline public key and config exchange.
An example use case is in a hybrid/star topology network where one client acts as server "supernode" which can issue invites to introduce nodes to the network.
TincVPN (in switch mode), DHCP server and tinc-discord run on this machine which connecting nodes use to discover themselves and obtain network information to connect directly when needed.

So, the bot can help you quickly set up LAN parties or similar for your discord guild without you needing to create invites for every player manually.

Note that [it is not recommended](https://www.tinc-vpn.org/pipermail/tinc/2017-May/004864.html) to allow untrusted nodes into a network.
For mission critical / production you probably do not want to use this. (or invites / tinc pre-release for that matter)

## Prep

Login to discord and create a new [application](https://discordapp.com/developers/applications). Note your `Client ID` after you're done with the form.
You'll want to convert it to a bot account as well, this gives you the auth token to use in tinc-discord's config.

To invite the bot to your server use your Client ID from the last step in this link:

https://discordapp.com/oauth2/authorize?scope=bot&permissions=268445760&client_id=YOUR_CLIENT_ID

You need to have Administrator/Manage server privilidges for the server you want to add the bot to as well, of course.

## Usage

_NOTE: Instructions assume you're on a NodeJS 8.0+ GNU/Linux environment and Tinc service is started before the bot is._

Download/Clone the repository:
```bash
git clone https://github.com/Teteros/tinc-discord.git && cd tinc-discord
```
Insert your `token` into `config.json.example` and configure the `bin` filepath and `params` array for your running tinc process.

For example `"params": ["--net=my_network", "--no-detach"],` if your used `tincd --net=my_network --no-detach`.

Lastly save the config as `config.json` and build the bot:
```bash
yarn install # or npm install
yarn build # or npm run-script build
yarn start # or npm run-script start
```
If all goes well bot will start and report active number of reachable (online) nodes in its _Playing_ status.
Unless you create a `blacklistRoleName`, bot will listen to any **guild** member for a `!request` command.
Then generate an invite link for that username and send it via a direct message.

Setting `redirectToWhitelistedChannel` to `true` will delete requests sent in the wrong channel (assuming you set a `whitelistChannelName`).

When `VPNRoleName` is defined the role will be added to the member post invite.

## Demo

You can see the bot in action on our Zero Hour Contra mod [discord](https://discord.gg/RPvgWh5), probably not much use for you unless you also want to [play](https://github.com/ThePredatorBG/contra-launcher) with us [too](https://www.moddb.com/mods/contra) :)

