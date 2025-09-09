import puppeteer from 'puppeteer';
import z from 'zod';
import fs from 'fs';

const Schema = z.object({ host: z.url(), password: z.string(), error_severity: z.number(), error_text: z.string() });
const CONFIG = Schema.parse(JSON.parse(fs.readFileSync('./config/router.json', 'utf-8')));

export const routerHasError = async (): Promise<boolean> => {
  console.log('Opening admin panel');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(CONFIG.host);

  console.log('Logging in');
  await page.waitForSelector('#pc-login-password');
  await page.type('#pc-login-password', CONFIG.password);
  await page.keyboard.press('Enter');

  console.log('Checking if another session is active');
  try {
    await new Promise(res => setTimeout(res, 1_000));
    await page.waitForSelector('#confirm-yes', { timeout: 5_000 });
    console.log('Killed other session');
    await page.click('#confirm-yes');
  } catch (dialogError) {
    console.log('No session to kill, continuing...');
  }

  console.log('Opening advanced page');
  await page.waitForSelector('.T_adv');
  await page.click('.T_adv');

  console.log('Opening tools section');
  await page.waitForSelector('#tools');
  await page.click('#tools');

  console.log('Opening logs');
  await new Promise(res => setTimeout(res, 1_000));
  await page.click('xpath=//a[.//text()[contains(., "System Log")]]');

  console.log('Opening severity dropdown');
  await page.waitForSelector('#_severity > .tp-select');
  await page.click('#_severity > .tp-select');

  console.log('Selecting error scope');
  await page.waitForSelector(`#_severity > .tp-select li[data-val="${CONFIG.error_severity}"]`);
  await new Promise(res => setTimeout(res, 1_000));
  await page.click(`#_severity > .tp-select li[data-val="${CONFIG.error_severity}"]`);

  try {
    const rowTexts = await page.$$eval('table#table-log > tbody > tr', rows => rows.map(row => row.textContent.trim() as string));
    return !!rowTexts.find(row => row.includes(CONFIG.error_text));
  } catch (e) {
    console.warn('No logs found');
    return false;
  }
}