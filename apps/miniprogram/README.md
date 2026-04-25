# WeChat Mini Program

Native WeChat Mini Program for the couple life assistant.

## Development

Open this directory in WeChat DevTools:

```text
apps/miniprogram
```

Use the Settings page in the Mini Program to configure the API base URL. During local development it defaults to:

```text
http://127.0.0.1:3000
```

When testing on a phone, use the LAN address of the machine or Orange Pi running the API, for example:

```text
http://192.168.1.10:3000
```

After the API address is reachable, open the home page and enter the setup page to initialize the one-couple deployment.

Current local MVP pages:

- Home: backend status, binding status, dashboard cards.
- Setup: initialize the one-couple deployment.
- Meals: takeout recommendations, roulette, and meal memory confirmation.
- Water: record today's drink counts for both people.
- Parcels: publish pending parcels and mark them picked.
- Expenses: record recent shared takeout expenses.
