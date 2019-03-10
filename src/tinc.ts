import { execFile } from 'child_process';
import { promisify } from 'util';
import cfg from '../config.json';

// Wrap NodeJS execfile callback into a promise so we can use the async/await syntax sugar.
const tincProcess = async (params: string[]): Promise<{ stdout: string; stderr: string }> => {
  const exec = promisify(execFile);
  const args = cfg.tinc.params.concat(params);
  return exec(cfg.tinc.bin, args);
};

// Return stdout from invoked tinc process and log stderr to console.
export const tincCmd = async (params: string[]): Promise<string> => {
  try {
    const cmdExec = await tincProcess(params);
    return cmdExec.stdout.trim();
  } catch (e) {
    console.error(e);
    return e.stderr.trim();
  }
};

// Return pending invite link and name as arrays in an object.
export const dumpInv = async (): Promise<{ invites: string[]; names: string[] }> => {
  const invExec = await tincCmd(['dump', 'invitations']);
  const parseInv = invExec.replace(/\n/g, ' ').split(' ');
  const invites = parseInv.filter((_val, idx) => idx % 2 === 0);
  const names = parseInv.filter((_val, idx) => idx % 2 !== 0);
  return { invites, names };
};

// Query online nodes which tinc established meta connections with.
// Returns key-value pairs { [NodeName]: IP:Port }
export const dumpReachableNodes = async (): Promise<{ [key: string]: string }> => {
  const reachableNodesExec = await tincCmd(['dump', 'reachable', 'nodes']);
  const parseNodes = reachableNodesExec.split('\n');
  const nodeNames = parseNodes.map(val => val.split(' ')[0]);
  const nodeAddr = parseNodes.map(val => `${val.split(' ')[4]}:${val.split(' ')[6]}`);
  return nodeNames.reduce((acc, key, idx) => ({ ...acc, [key]: nodeAddr[idx] }), {});
};

// Return total count of reachable nodes.
export const numOnline = async (): Promise<number> => {
  const numQuery = await dumpReachableNodes();
  return Object.keys(numQuery).length;
};

// Return true/false whether a node is already invited or not.
export const isInvited = async (user: string): Promise<boolean> => {
  const invQuery = await dumpInv();
  return !!(invQuery.names.includes(user));
};

// Create a new invitation for a given node name.
export const Invite = async (user: string): Promise<string> => {
  // Tinc creates duplicate invites for same name which might be undesirable.
  if (cfg.tinc.noDuplicateInvites) if (await isInvited(user)) return 'Invite has not expired.\nUse your last invite first.';
  const inv = await tincCmd(['invite', user]);

  // Append underscore to name and retry invite if node/host is already defined.
  if (inv.match(/^.*host.*exists/) || inv.match(/^.*name.*known/)) {
    console.warn(`${user} already exists! Appending underscore to nick...`);
    return Invite(`${user}_`);
  }

  // Check if invitation is returned, e.g (host.name:655/invitation)
  if (inv.match(/^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])(:(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])(\/)|\/)(.*)$/)) return inv;
  return cfg.request.inviteError;
};
