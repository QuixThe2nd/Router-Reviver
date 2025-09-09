# Router Reviver
Automatically monitors your TP-Link router for configurable errors such as PPP timeouts and restarts your router and modem using [Philips Hue Smart Plugs](https://www.philips-hue.com/en-au/p/hue-smart-plug/8719514342361).

## What it does
Router Reviver runs in the background and periodically logs into your router's admin panel and checks logs for any errors. When a configured error is detected, it automatically cuts off power to your router and/or modem then re-powers them after 60 seconds. Depending on the type of error you're targeting, you would want to connect the smart plug to either the modem or router (or both).

## Why
Certain internet setups take forever to recover from certain types of downtime despite the line working fine. For example when I face PPP timeouts, my modem goes down for 30 minutes to an hour despite the line recovering almost instantly. Router Reviver aims to speed this process up by forcing a manual restart of your modem.

## Requirements
- Bun.js or Docker
- A TP-Link router with compatible web interface (see compatibility below)
- Philips Hue Bridge and smart plug
- Router connected through the smart plug for power control

## Install
### Manual
```bash
git clone https://github.com/QuixThe2nd/router-reviver
cd router-reviver
bun install
```

### Docker
1. Create a directory for Router Reviver
2. Copy `docker-compose.yml` from this repo to the directory

## Usage
### Manual
```bash
bun src/index.ts
```

### Docker
```bash
docker compose up -d
```

## Configuration
### TP-Link Router
In `./config/router.json`, you can change the router IP and login credentials. You can also configure the error text that triggers a restart as well as the error verbosity to check against. By default the current config should work for standard TP-Link routers and triggers on a PPP error.

### Philips Hue
In `./config/hue.json`, you can optionally configure your Philips Hue devices.

All configuration is optional for advanced users. By default if no configuration is set, you will be guided through the setup process.

## Compatibility
### Web Interface Requirements
This script targets TP-Link routers with the following web interface elements:
- Login field with `#pc-login-password`
- Advanced tab with `.T_adv`
- Tools section with `#tools`
- System Log accessible via `System Log` link text
- Log severity dropdown with `#_severity`

### Confirmed Working Models
- TP-Link VX420-G2v v2 (firmware 2.0.0 0.9 v603c.0)

### To Check Compatibility
1. Open your router's admin in a browser (usually `192.168.0.1` or `192.168.1.1`)
2. Use browser dev tools (F12) to verify the above elements exist
3. Navigate to Advanced > Tools > System Log to ensure the path works

### Likely Compatible
- Other VX420-G2v hardware revisions
- TP-Link routers with similar web interface designs
If your router works, please send a GitHub issue or PR and it'll be added to the list of confirmed working models

## Notes
- Router Reviver initiates a 60 second timer right before powering off your modem/router. This allows for your smart plug to be turned back on despite your bridge being disconnected from WiFi.
- We check logs instead of the routers claimed status to prevent infinite restart loops as logs clear after each restart.
