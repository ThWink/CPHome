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

If the backend has `API_TOKEN` configured, enter the same token on the Settings page before using data pages.

After the API address is reachable, open the home page and enter the setup page to initialize the one-couple deployment.

For a clean local walkthrough, seed readable demo data from the repo root:

```bash
corepack pnpm --filter @couple-life/api seed:demo
```

Then verify the local backend flow before opening WeChat DevTools:

```bash
corepack pnpm verify:local
```

Current local MVP pages:

- Home: backend status, binding status, dashboard cards.
- Setup: initialize the one-couple deployment.
- Meals: takeout recommendations, roulette, and meal memory confirmation.
- Weather: online weather with local fallback advice for takeout and errands.
- Water: record today's drink counts and create/complete drink-water reminders.
- Parcels: publish parcels with ownership, mark them picked, or cancel mistaken entries.
- Expenses: record categorized shared expenses with payer selection and monthly summary.
- Todos: create shared tasks with assignee and due date, then mark them complete.
- Anniversaries: track one-time or yearly important dates with reminder days.
- Assistant: ask the local life assistant, with optional LLM provider support from the API.
- Settings: API address, API token, health check, AI memory and taste preference management.
