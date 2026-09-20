# NutriSight – KI Kalorien- & Nährwert-Tracker (PWA)

Mobile-first Progressive Web App zum Erfassen und Auswerten von Mahlzeiten mit GPT-4o Vision, Next.js, PostgreSQL und Prisma.

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Shadcn-UI-Komponenten, Lucide Icons, Recharts
- **Design:** «Liquid Glass» – translucente Flächen mit Backdrop-Blur, Specular-Kante und Safe-Area-Layout für iPhone und iPad
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
- Scriptable-Widgets für iPhone- und iPad-Home- und -Sperrbildschirm

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

Öffnen: [http://localhost:3333](http://localhost:3333)

1. Account registrieren  
2. Unter **Einstellungen** den OpenAI API Key hinterlegen  
3. Unter **Erfassen** ein Foto analysieren oder manuell speichern  

## Docker (gesamte App)

### Image von GitHub pullen (empfohlen auf dem Server)

Nach jedem Push auf `main` baut die Action ein Image nach  
`ghcr.io/rolfwalker71-commits/aifoodtracker:latest`.

```bash
# einmalig, falls das Package privat ist:
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

cp .env.example .env
# AUTH_SECRET / ENCRYPTION_KEY / AUTH_URL setzen
docker compose pull
docker compose up -d
```

Optional bestimmtes Tag: `IMAGE_TAG=sha-abcdef docker compose pull && docker compose up -d`

### Lokal aus dem Dockerfile bauen

```bash
cp .env.example .env
docker compose up -d --build
```

App: [http://localhost:3333](http://localhost:3333)

**Hinweis:** Unter GitHub → Packages das Image ggf. auf **Public** stellen,  
damit `docker compose pull` ohne Login funktioniert.

## Widgets für iPhone & iPad (Scriptable)

Unter **Einstellungen › Widgets für iPhone & iPad** baut die App ein fertiges
Skript für [Scriptable](https://apps.apple.com/app/scriptable/id1405459188).
Adresse der Instanz und ein persönlicher API-Key werden hineingeschrieben, dann
kopieren oder als Datei sichern und in Scriptable einfügen.

Abgedeckte Grössen:

| Familie | Inhalt |
|---|---|
| Klein | Kalorienring mit Restbudget, Makros als Kurzwerte |
| Mittel | Ring plus Makro-Balken, Mahlzeitenliste oder nur der Ring |
| Gross | Tageskopf, Ring, alle Makros inkl. Ballaststoffe, Mahlzeiten, Serie |
| Extragross (iPad) | Zweispaltig: Tagesübersicht links, 7-Tage-Verlauf, Serie und Gewicht rechts |
| Sperrbildschirm rund | Ring mit verbleibenden Kalorien |
| Sperrbildschirm Zeile | Restkalorien und die drei Makros |
| Sperrbildschirm über der Uhr | Eine Zeile mit den verbleibenden Kalorien |

Widget-Parameter (Widget lange drücken › *Widget bearbeiten* › *Parameter*),
mehrere durch Komma getrennt: `makros`, `mahlzeiten` oder `ring` für den Inhalt,
`hell` bzw. `dunkel` für ein festes Farbschema. Ein Skript reicht damit für
mehrere Widgets.

Das Skript liest `GET /api/v1/widget` mit `Authorization: Bearer ns_…`, cached
die letzte Antwort lokal und zeigt sie offline weiter an. Antippen öffnet die
App, der Erfassen-Chip springt direkt in die Kamera.

Der Skript-Quelltext liegt in `src/lib/scriptable/widget-source.ts`. Da er nur
in Scriptable läuft und hier nicht mitkompiliert wird, prüft ihn ein Smoke-Test
gegen eine nachgebaute Scriptable-Umgebung:

```bash
npm run check:widget
```

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
    scriptable/   Quelltext und Generator für die Scriptable-Widgets
scripts/
  check-widget-script.mjs
```

## API-Überblick

- `POST /api/auth/register` – Registrierung
- `POST /api/analyze` – Bildupload + GPT-4o JSON-Analyse
- `GET/POST /api/meals` – Mahlzeiten listen/anlegen
- `GET/PUT/DELETE /api/meals/:id` – einzelne Mahlzeit
- `GET/PUT /api/profile` – Ziele & API Key
- `GET /api/stats?range=day|week|month` – Aggregationen
- `GET /api/v1/widget` – kompakte Tagesdaten für Widgets (Bearer-Key)

## Hinweise

- Uploads liegen unter `public/uploads/`
- Der Service Worker cached die UI-Shell; API-Calls bleiben network-first
- „Add to Homescreen“ funktioniert über das Web-Manifest im unterstützten Browser
