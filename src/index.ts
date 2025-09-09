import z from 'zod';
import fs from 'fs';
import { discoverBridge, discoverPlug, ensureAuthorised, restartModem } from './hue';
import { routerHasError } from './router';

const Schema = z.object({ recheck_interval: z.number() });
const ROUTER_CONFIG = Schema.parse(JSON.parse(fs.readFileSync('./config/router.json', 'utf-8')));

const restartIfError = async (bridgeHost: string) => {
  try {
    console.log('Starting check');
    if (!await routerHasError()) {
      console.log('No errors detected');
      return;
    } else {
      console.warn('Error detected');
      await restartModem(bridgeHost);
    }
  } catch (e) {
    console.error('FATAL: RUN THREW EXCEPTION', e);
  }
}

const bridgeHost = await discoverBridge();
if (!bridgeHost) throw new Error('Failed to discover bridge - Ensure you are on the same network as the bridge or configure one manually');
await ensureAuthorised(bridgeHost);
await discoverPlug(bridgeHost);
console.log('Running');
restartIfError(bridgeHost);
setInterval(restartIfError, ROUTER_CONFIG.recheck_interval);
