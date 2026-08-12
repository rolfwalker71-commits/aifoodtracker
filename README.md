# NutriSight – KI Kalorien- & Nährwert-Tracker (PWA)

Mobile-first Progressive Web App zum Erfassen und Auswerten von Mahlzeiten mit GPT-4o Vision, Next.js, PostgreSQL und Prisma.

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn-UI-Komponenten, Lucide Icons, Recharts
- **Backend:** Next.js API Routes
- **Auth:** Auth.js / NextAuth (Credentials + JWT)
- **DB:** PostgreSQL + Prisma ORM 7
- **KI:** OpenAI Vision (`gpt-4o`) mit JSON-Antwort
- **PWA:** `manifest.webmanifest`, Service Worker (`/sw.js`), App-Icons
- **Deploy:** Docker Multi-Stage Build + `docker-compose`

## Features

- Registrierung, Login, Session-Schutz
- Profil mit Tageszielen (Kalorien, Makros, Mikros)
- Persönlicher OpenAI API Key (verschlüsselt gespeichert)
- Foto-Analyse inkl. Live-Korrektur vor dem Speichern
- Portionsabfrage, wenn die KI die Menge nicht sicher erkennt (Werte werden umgerechnet)
- Lebensmittelsuche über [Open Food Facts](https://world.openfoodfacts.org) (Markenprodukte wie „Findus Lasagne“)
- KI-Schätzung für freie Gerichte + automatisches Ausfüllen nach Portionsangabe
- Dashboard + Statistiken (Tag / Woche / Monat)
- Dark / Light Mode
- Offline-Caching der UI-Shell (PWA)

## Schnellstart (lokal)

### Voraussetzungen

- Node.js 22+
- Docker (für PostgreSQL) oder eigene Postgres-Instanz

### 1. Abhängigkeiten

```bash
npm install
cp .env.example .env
```

### 2. Datenbank starten

```bash
docker compose up -d db
npm run db:migrate
```

### 3. App starten

```bash
npm run dev
```

Öffnen: [http://localhost:3000](http://localhost:3000)

1. Account registrieren  
2. Unter **Einstellungen** den OpenAI API Key hinterlegen  
3. Unter **Erfassen** ein Foto analysieren oder manuell speichern  

## Docker (gesamte App)

```bash
cp .env.example .env
# AUTH_SECRET / ENCRYPTION_KEY setzen
docker compose up --build
```

App: [http://localhost:3000](http://localhost:3000)

## Wichtige Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL Connection String |
| `AUTH_SECRET` | Secret für Auth.js Sessions |
| `AUTH_URL` / `NEXTAUTH_URL` | App-URL |
| `ENCRYPTION_KEY` | Schlüssel zur Verschlüsselung der User-API-Keys |
| `OPENAI_API_KEY` | Optionaler Fallback, falls Nutzer keinen eigenen Key hat |

## Projektstruktur

```text
prisma/
  schema.prisma
  migrations/
public/
  icons/
  manifest.webmanifest
  sw.js
  uploads/
src/
  app/
    (auth)/login|register
    (app)/dashboard|meals|stats|settings
    api/auth|analyze|meals|profile|stats
  components/
    ui/ layout/ meals/ dashboard/ stats/ pwa/
  lib/
    auth.ts prisma.ts openai.ts crypto.ts nutrition.ts stats.ts
```

## API-Überblick

- `POST /api/auth/register` – Registrierung
- `POST /api/analyze` – Bildupload + GPT-4o JSON-Analyse
- `GET/POST /api/meals` – Mahlzeiten listen/anlegen
- `GET/PUT/DELETE /api/meals/:id` – einzelne Mahlzeit
- `GET/PUT /api/profile` – Ziele & API Key
- `GET /api/stats?range=day|week|month` – Aggregationen

## Hinweise

- Uploads liegen unter `public/uploads/`
- Der Service Worker cached die UI-Shell; API-Calls bleiben network-first
- „Add to Homescreen“ funktioniert über das Web-Manifest im unterstützten Browser
