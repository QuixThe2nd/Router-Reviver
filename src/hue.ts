import fs from 'fs';
import z from 'zod';

const configPath = './config/hue.json';
const Schema = z.object({ host: z.union([z.ipv4(), z.ipv6()]).nullable(), plug_id: z.number().nullable(), username: z.string().nullable() });
let CONFIG = Schema.parse(JSON.parse(fs.readFileSync(configPath, 'utf-8')));

const DevicesSchema = z.record(z.string(), z.object({
  state: z.object({
    on: z.boolean()
  }),
  productid: z.union([z.string(), z.undefined()])
}));

type AuthoriseResponse = [
  {
    success: {
      username: string;
    }
  } | {
    error: {
      description: string;
    }
  }
];

type DiscoveryResponse = {
  internalipaddress: string;
}[]

export const discoverBridge = async (): Promise<string | false> => {
  console.log('Discovering bridge');
  if (CONFIG.host !== null) return CONFIG.host;
  const response = await fetch('https://discovery.meethue.com/');
  const result = await response.json() as DiscoveryResponse;
  return result[0]?.internalipaddress ?? false;
}

const fetchSmartPlugs = async (host: string) => {
  const response = await fetch(`http://${host}/api/${CONFIG.username}/lights`);
  const data = DevicesSchema.parse(JSON.parse(await response.text()));
  return Object.entries(data).filter(device => device[1].productid?.startsWith('SmartPlug')).map(device => [Number(device[0]), device[1].state.on] as const);
}

export const discoverPlug = async (host: string) => {
  if (CONFIG.plug_id !== null) return;
  console.warn('Deciding which plug to use - Continue reading these logs for instructions');
  console.warn('MAKE SURE YOUR ROUTER IS NOT USING THE SMART PLUG YET - This process will involve turning off the smart plug and we need WiFi');
  console.warn('If Router Reviver is struggling to find your plug, toggle the plug on/off in the app instead of with the physical button so your bridge gets notified sooner');
  console.warn('!!!! Turn **ON** your smart plug - You have 60 seconds');
  await new Promise(res => setTimeout(res, 60_000))
  const smartPlugs = (await fetchSmartPlugs(host)).filter(plug => plug[1]).map(plug => plug[0]);
  console.log(`Found ${smartPlugs.length} smart plug${smartPlugs.length === 1 ? '' : 's'}`);
  console.warn('!!!! Turn **OFF** your smart plug - You have 30 seconds');
  await new Promise(res => setTimeout(res, 30_000))
  const smartPlugs2 = (await fetchSmartPlugs(host)).filter(plug => !plug[1]).map(plug => plug[0]).filter(plug => smartPlugs.includes(plug));
  console.log(`Found ${smartPlugs2.length} smart plug${smartPlugs2.length === 1 ? '' : 's'}`);
  if (smartPlugs2.length === 0) throw new Error('No smart plugs found - Please restart the program and follow the instructions');
  if (smartPlugs2.length > 1) throw new Error('Too smart plugs found - Please restart the program and make sure only 1 smart plug is toggled on/off during setup');
  console.log('Smart plug found!');
  console.log('!!!! Connect your modem and/or router to your smart plug, the program will begin in 2 minutes');
  await new Promise(res => setTimeout(res, 120_000))
  CONFIG = { ...CONFIG, plug_id: smartPlugs2[0]! };
  fs.writeFileSync(configPath, JSON.stringify(CONFIG));
}

 const authorise = async (host: string): Promise<string | false> => {
  const response = await fetch(`http://${host}/api`, { method: 'POST', body: JSON.stringify({ devicetype: "router_reviver#main",  generateclientkey: true}) });
  const result = (await response.json() as AuthoriseResponse)[0];
  if ('success' in result) return result.success.username;
  if (result.error.description === 'link button not pressed') return false;
  throw new Error('Unexpected response from Philips Hue Bridge: ' + JSON.stringify(result));
}

export const ensureAuthorised = async (host: string) => new Promise(resolve => {
  console.log('Authorising bridge')
  if (CONFIG.username !== null) return resolve(true);
  authorise(host).then(() => {
    const intervalId = setInterval(async () => {
      const username = await authorise(host);
      if (typeof username !== 'string') return console.warn('App not authorised - Press the button on your Philips Hue Bridge');
      console.log('Successfully authorised!');
      CONFIG = { ...CONFIG, username }
      fs.writeFileSync(configPath, JSON.stringify(CONFIG));
      resolve(true);
      clearInterval(intervalId);
    }, 2_000);
  });
});

export const restartModem = async (host: string) => {
  console.log('Scheduling modem power-up');
  const response1 = await fetch(`http://${host}/api/${CONFIG.username}/schedules`, { method: "POST", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "name": "Startup Router", "command": { "address": `/api/${CONFIG.username}/lights/${CONFIG.plug_id}/state`, "method": "PUT", "body": { "on": true } }, "localtime": "PT00:01:00", "status": "enabled" }) })
  if (!response1.ok) throw new Error('Failed to schedule router power up');
  console.log(await response1.text())

  console.log('Powering down modem');
  const response2 = await fetch(`http://${host}/api/${CONFIG.username}/lights/${CONFIG.plug_id}/state`, { method: "PUT", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "on": false }) })
  if (!response2.ok) throw new Error('Failed to power down router');
  console.log(await response2.text())
}
