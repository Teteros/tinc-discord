import { CommandClient, GuildChannel } from 'eris';
import { slugify } from 'transliteration';
import { numOnline, Invite } from './tinc';
import cfg from '../config.json';

// Tinc node names must use alphanumerical characters (a-zA-Z0-9_) and are case sensitive.
// while Discord usernames are unicode (2-32 characters long) so transliteration is needed.
// Slugify strips _ from start/end so we add an extra ones to preserve _ if a username has one.
const alphanumerize = (name: string): string => slugify(`_${name}_`, {
  separator: '_',
  lowercase: false,
  allowedChars: 'a-zA-Z0-9_',
});

const bot = new CommandClient(cfg.token, {}, {
  prefix: cfg.prefix,
  defaultHelpCommand: false,
  defaultCommandOptions: {
    caseInsensitive: true,
    cooldown: 1000,
    guildOnly: true,
  },
});

bot.registerCommand('request', async (msg): Promise<void> => {
  if (msg.member) {
    try {
      // Slugify can return empty string if it cannot convert the unicode characters.
      // Use snowflake ID as fallback to make sure there's always something to use for node name.
      const alphanumName = alphanumerize(msg.member.username);
      const parsedUser = alphanumName.length > 0 ? alphanumName : msg.member.id;

      // Generate the invite link and prepare the invite message.
      const dm = await msg.member.user.getDMChannel();
      console.info(`Invite request for: ${parsedUser}`);
      const invLink = await Invite(parsedUser);
      console.log(invLink);
      const invMsg = cfg.request.inviteMessage.replace('{INVITE_LINK}', invLink);

      // Attempt to direct message requestee, add confirm reaction after.
      await dm.createMessage(invMsg);
      await msg.addReaction(cfg.request.inviteReaction);

      // If defined, add desired role name after invite link was sent to guild member.
      if (msg.channel instanceof GuildChannel) {
        const vpnRole = msg.channel.guild.roles.find(role => role.name === cfg.VPNRoleName);
        await msg.member.addRole(vpnRole.id, 'TincVPN invite request');
      }
    } catch (e) {
      // When member has privacy settings set -- does not allow direct messages from server members.
      if (e.code === 50007 || e.message.includes('Cannot send')) {
        const invErrMsg = `${msg.member.mention} ${cfg.request.inviteErrorDM}`;
        msg.channel.createMessage(invErrMsg);
      }
      console.error(e);
    }
  }
}, {
  aliases: cfg.request.aliases,
  description: cfg.request.desc,
  fullDescription: cfg.request.fullDesc,
  requirements: {
    custom: (msg): boolean => {
      const operatingChan = (channel: GuildChannel, name: string): boolean => {
        const whitelistedChan = channel.guild.channels.find(ch => ch.name === name.replace('#', ''));
        if (channel.name === whitelistedChan.name) return true;
        return false;
      };

      const restrictedRole = (channel: GuildChannel, name: string): boolean => {
        const memberRole = channel.guild.roles.find(role => role.name === name);
        if (msg.member ? msg.member.roles.includes(memberRole.id) : false) return true;
        return false;
      };

      if (msg.channel instanceof GuildChannel) {
        const isOperatingChan = (cfg.whitelistChannelName
          ? operatingChan(msg.channel, cfg.whitelistChannelName) : false);
        const isRestrictedRole = (cfg.request.blacklistRoleName
          ? restrictedRole(msg.channel, cfg.request.blacklistRoleName) : false);
        return isOperatingChan && !isRestrictedRole;
      }
      return false;
    },
  },
});

bot.on('ready', (): void => {
  const plyrStatus = async function onlinePlayersStatusTimer(this: NodeJS.Timeout): Promise<void> {
    const plyrNum = await numOnline();

    // Tinc is not configured properly if least one node is not reachable.
    if (plyrNum > 0) {
      // Subtract the tinc "supernode" from the total players online.
      bot.editStatus('online', { name: `${plyrNum - 1} player(s) online` });
    } else {
      // FIXME: Timer does not ever restart if TincVPN ever fails thus bot needs to be restarted.
      bot.editStatus('idle', { name: 'Offline' });
      clearInterval(this);
    }
  };

  // Update "Playing:" status with reachable nodes count on VPN every nth second.
  if (cfg.refreshPlayingStatusSec) setInterval(plyrStatus, 1000 * cfg.refreshPlayingStatusSec);
  console.info('Ready!');
});

bot.on('messageCreate', async (msg): Promise<void> => {
  // If true, notify users they are posting in the wrong channel if whitelistChannelName is set.
  if (cfg.redirectToWhitelistedChannel) {
    if (msg.author.bot) return;
    if (msg.channel instanceof GuildChannel) {
      if (msg.cleanContent && msg.cleanContent.includes('!req')) {
        try {
          const redirectChan = msg.channel.guild.channels.find(ch => ch.name === cfg.whitelistChannelName.replace('#', ''));
          if (msg.channel.name === redirectChan.name) return;
          await msg.delete('Wrong channel for VPN invite request'); // Will fail if bot does not have "Manage Messages" permissions.
          await msg.channel.createMessage(`${msg.member ? msg.member.mention : ''} \`!request\` 📝👉 ${redirectChan.mention}`);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
});

bot.connect();
