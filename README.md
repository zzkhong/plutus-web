# plutus-web

The Telegram Mini App dashboard for [Plutus AI](https://github.com/zzkhong/plutus-ai): spending by month and category, income and savings rate, and a searchable expense list. Data comes from plutus-ai's `/api/web` routes; see [CLAUDE.md](CLAUDE.md).

```bash
cp .env.example .env.local   # set PLUTUS_API_URL
npm install
npm run dev
```

It only works when opened from the bot's Dashboard button, which supplies the signed Telegram login.
