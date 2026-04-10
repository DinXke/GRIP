# GRIP — Groei, Routine, Inzicht, Planning

Een app specifiek gebouwd voor kinderen met ADHD, gebaseerd op de **Barkley-methode** (External Executive Function). GRIP fungeert als een externe executieve functie-prothese: het lokt het juiste gedrag op het juiste moment uit via externalisatie, visualisatie en directe bekrachtiging.

## Kernfuncties

### Kind-interface
- **Dagplanning** — Visuele tijdlijn met activiteiten en afspraken, "Nu Doen"-modus
- **Oefeningen** — AI-gegenereerde schooloefeningen (wiskunde, taal, spelling, WO) met adaptieve moeilijkheid
- **Token-beloningen** — Verdien sterren, wissel in voor beloningen, spaarbalk met doelen
- **Emotie check-in** — Hoe voel je je? Met ademhalingsoefening en pauzeknop
- **Vaardigheden** — Zelfstandigheidschecklist per leeftijd
- **Sociale scripts** — Scenario-oefeningen voor sociale situaties
- **Spaarpotje** — Virtueel geld beheren met spaardoelen
- **Recepten** — Stap-voor-stap kookrecepten met timer

### Ouder-interface
- **Dashboard** — Overzicht van alle kinderen met grafieken
- **Schema-editor** — Dagschema's per kind met vakantieperiodes
- **Afspraken** — Kalender met Google Calendar sync en ICS-feed
- **Beloningen beheer** — Tokens configureren, beloningen aanmaken
- **Oefeningen genereren** — AI (Claude Haiku) genereert oefeningen op maat
- **Communicatie** — Berichtenkanalen met hulpverleners
- **Dossier** — Verslagen, IHP, medicatie-log
- **TRMNL** — E-paper display plugin voor dagplanning in de keuken

### Hulpverlener-interface
- **Voortgang** — Inzicht in oefenresultaten en emotiepatronen
- **Communicatie** — Berichten uitwisselen met ouders
- **Dossier** — Verslagen toevoegen en raadplegen

## Tech Stack

| Component | Technologie |
|---|---|
| Frontend | React (Vite), Tailwind CSS, Framer Motion, Zustand, TanStack Query |
| Backend | Node.js (Fastify), TypeScript |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis 7 |
| AI | Claude Haiku (oefeningen, tips) via Anthropic API |
| Hosting | Docker Compose op Proxmox LXC |

## Installatie

### Vereisten
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7

### Quick Start

```bash
git clone https://github.com/DinXke/adhd.git
cd adhd
cp .env.example .env  # Pas aan met je eigen waarden
docker compose up -d
```

De app is beschikbaar op `http://localhost:3080`.

### Omgevingsvariabelen

| Variabele | Beschrijving |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret voor JWT tokens (min 32 chars) |
| `CLAUDE_API_KEY` | Anthropic API key (optioneel, voor AI-functies) |
| `APP_URL` | Publieke URL van de app |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |

## Barkley-compliance

- Externaliseer informatie (alles visueel, niets uit het hoofd)
- Externaliseer motivatie (directe beloning, zichtbaar)
- Externaliseer tijd (tijdbalken, geen klokken)
- Punt van uitvoering = punt van beloning
- Geen straffen, alleen positieve bekrachtiging
- Korte intervallen, frequente feedback
- Vermijd werkgeheugenbelasting (een ding tegelijk)

## Licentie

Prive-project voor de familie Scheepers. Niet bedoeld voor distributie.

## Versie

Huidige versie: **v1.3.0** — Zie [CHANGELOG.md](CHANGELOG.md) voor details.
