# ORIVÈA Social Agent

Losstaande Node.js-agent voor ORIVÈA socialmediaconcepten. Dit project staat apart van de webshop en publiceert standaard niets automatisch.

## Installatie

```bash
npm install
```

## Scripts

```bash
npm run generate:daily -- --date=2026-06-18
npm run generate:week -- --start=2026-06-15
npm run check
```

## Werkwijze

De agent maakt conceptposts voor Instagram, Facebook en TikTok. Nieuwe posts komen in `drafts/` of, bij complianceproblemen of sterke duplicatie, in `rejected/`. De kalender wordt bijgewerkt in `content-calendar/YYYY-MM.json` en acties worden gelogd in `audit-log.json`.

Statussen beheer je via:

```bash
node src/status-manager.js approve <post-id> <naam>
node src/status-manager.js reject <post-id> <naam> "reden"
node src/status-manager.js schedule <post-id> <naam> 2026-06-20T10:00:00+02:00
node src/status-manager.js published <post-id> <naam>
```

## Veiligheidsregels

- `autoPublish` staat standaard uit.
- Handmatige goedkeuring is verplicht.
- Geen parfumvergelijkingen met bestaande merken.
- Geen inkomensgaranties of medische claims.
- Partnerposts bevatten een advertentie/samenwerking-disclosure.
- Duplicaten binnen 30 dagen worden geweigerd bij 80% of meer overlap.

## Configuratie

Hoofdconfiguratie staat in `config/social-agent-config.json`. Verboden woorden en zinnen staan in `config/forbiddenPhrases.json`. Seizoensmomenten staan in `config/seasonalEvents.json`.

API-sleutels horen alleen in `.env`, nooit in Git. Gebruik `.env.example` als voorbeeld.
