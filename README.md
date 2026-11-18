# NEXLOGISTIC by Andrerer – Lager & Logistik

Das **Lagersystem** der NEX-Familie (NEXpay = Kassa, NEXCOUNT = Buchhaltung, NEXLOGISTIC = Lager):
Bestände an mehreren Lagerorten führen, Wareneingang und Inventur buchen – und die Ware gleich
aus dem Lager versenden, mit Touren, Fahrer-App und Tracking-Link. Ausgelegt auf **Österreich**
(§57a-Pickerl, Code 95, UID).

Teil der NEX-Familie – **ein Andrerer-Konto für alle Apps**: Wer schon ein NEXCOUNT-Konto hat,
meldet sich mit denselben Zugangsdaten an.

## Funktionen

| Bereich            | Was es kann |
|--------------------|-------------|
| **Übersicht**      | Lagerwert, Nachbestellliste, heute zu versenden, unterwegs/Probleme, Touren des Tages, letzte Lagerbewegungen, Fälligkeiten |
| **Bestand**        | Lagerartikel mit Nr., EAN, Kategorie, Einheit, Gewicht, Lagerort & Lagerplatz, Mindestbestand, Lieferant, Einkaufswert (gleitender Durchschnitt). Reserviert/verfügbar je Artikel, Filter „Nachbestellen“, Archiv, CSV-Export |
| **Bewegungen**     | Wareneingang und -ausgang mit mehreren Positionen, Umbuchung zwischen Lagerorten, Storno per Gegenbuchung – Bestände werden nie überschrieben, sondern aus Bewegungen berechnet |
| **Inventur**       | Blind-Zählliste drucken, gezählte Mengen je Lagerort eintragen (Zwischenstand bleibt erhalten), alle Differenzen in einem Schritt buchen; Einzelzählung je Artikel |
| **Lagerorte**      | Hauptlager plus beliebige weitere Lager mit Bestand und Lagerwert je Ort |
| **Sendungen**      | Ware aus dem Lager (wird reserviert, beim Abholen/Tourstart automatisch ausgebucht, bei Rücknahme/Storno zurückgebucht), Absender/Empfänger, Packstücke, Zeitfenster, Nachnahme, Service, Statusverlauf, Zustellnachweis |
| **Druck**          | Versandetikett 100×150 mm mit Code-128-Barcode (je Packstück), Lieferschein A4, Ladeliste je Tour |
| **Touren**         | Tagesansicht, Fahrzeug & Fahrer:in zuweisen, Stopps hinzufügen/sortieren, Auslastung (Nutzlast/Volumen), Tour starten → Sendungen „In Zustellung“, Tour abschließen |
| **Meine Tour**     | Handy-Ansicht für Fahrer:innen: Stopps, Navigation, Anrufen, „Zugestellt“ mit Name der übernehmenden Person, „Problem“ mit Grund |
| **Fuhrpark**       | Kennzeichen, Typ, Nutzlast, Laderaum, km-Stand, §57a-Begutachtung und Service mit Fälligkeitswarnung |
| **Fahrer:innen**   | Führerscheinklassen, Ablaufdaten Führerschein & Code 95, Verknüpfung mit Benutzerkonto |
| **Kontakte**       | Kunden, Empfänger, Lieferanten, Partner/Subunternehmer |
| **Team**           | Einladungscode, Rollen **Admin**, **Disposition**, **Lager**, **Fahrer:in** |
| **Tracking**       | Öffentliche Seite `…/?track=NL…` – zeigt nur Status, Orte (PLZ/Ort) und Termin, keine Namen oder Straßen |

Live-Updates zwischen allen Geräten über Supabase Realtime, Hell-/Dunkelmodus, installierbar als App (PWA).

## Technik

| Teil          | Dienst |
|---------------|--------|
| Anmeldung     | **Supabase Auth** – dasselbe Projekt wie NEXCOUNT (`xrzovtfaqthaxucaoale`) |
| Datenbank     | **Supabase Postgres**, eigene Tabellen mit Präfix `nl_` und Row Level Security (`supabase/migrations/`) |
| Live-Updates  | **Supabase Realtime** auf `nl_records` |
| Oberfläche    | **Cloudflare Workers** (statische Dateien aus `public/`), aus GitHub veröffentlicht |

### Datenmodell

- `nl_companies`, `nl_members`, `nl_invites` – Firma, Team, Einladungscode (getrennt von NEXCOUNT).
- `nl_records` – alle Geschäftsdaten als JSON je Sammlung (`articles`, `movements`, `locations`, `shipments`, `tours`,
  `vehicles`, `drivers`, `contacts`, `settings`). Gelöscht wird weich (`deleted = true`), damit Realtime-Ereignisse
  sauber je Firma gefiltert werden. Bewegungen werden nie gelöscht, nur storniert.
- Rechte (Funktion `nl_can_write`, erzwungen in der Datenbank): Lesen nur innerhalb der eigenen Firma.
  Admin & Disposition dürfen alles; **Lager** Artikel, Bewegungen, Lagerorte, Kontakte und Sendungen (Kommissionierung);
  **Fahrer:innen** Sendungen und Touren ändern sowie Bewegungen anlegen (Warenausgang beim Tourstart).
- `nl_next_number` vergibt fortlaufende Nummern (S-00001, T-00001), `nl_track` liefert die öffentliche Tracking-Ansicht.

## GitHub ⇄ Cloudflare ⇄ Supabase

```
git push (main)
   ├─ .github/workflows/deploy.yml    → prüft die Skripte, veröffentlicht zu Cloudflare → https://nexlogistic.andrerer.org
   └─ .github/workflows/supabase.yml  → spielt neue Dateien aus supabase/migrations/ in Supabase ein
```

**Warum ein eigenes Migrationsskript?** NEXCOUNT nutzt im selben Supabase-Projekt `supabase db push`.
Die CLI führt *eine* Migrationsliste pro Datenbank und würde die Migrationen der jeweils anderen App
als „fehlend“ melden. NEXLOGISTIC protokolliert deshalb in `nexlogistic_meta.migrations` und spielt
neue Dateien über die Supabase Management-API ein ([`scripts/migrate.mjs`](scripts/migrate.mjs)).
Die beiden Apps kommen sich so nicht in die Quere.

### Einmalige Einrichtung

1. **Secrets** im Repo (*Settings → Secrets and variables → Actions → New repository secret*):
   - `SUPABASE_ACCESS_TOKEN` – Supabase → *Account → Access Tokens* (derselbe Token wie bei NEXCOUNT geht)
   - `CLOUDFLARE_API_TOKEN` – Cloudflare → *My Profile → API Tokens* → Vorlage **„Edit Cloudflare Workers“**
   - `CLOUDFLARE_ACCOUNT_ID` – Cloudflare-Dashboard, Kontoübersicht

   Danach unter **Actions → „Supabase-Datenbank“ → Run workflow** die Datenbank einrichten.
   Alternative ohne Token: Inhalt von `supabase/migrations/20261118210000_nexlogistic_init.sql`
   und danach `…_nexlogistic_lager.sql` einmal im Supabase **SQL Editor** ausführen (beide Dateien sind wiederholbar).
2. **Domain:** `wrangler.jsonc` legt `nexlogistic.andrerer.org` beim ersten Deploy als Custom Domain an
   (die Zone `andrerer.org` muss im selben Cloudflare-Konto liegen).
3. **Supabase → Authentication → URL Configuration → Redirect URLs:** zusätzlich
   `https://nexlogistic.andrerer.org/**` eintragen (für Bestätigungs- und Passwort-Mails).
   Die *Site URL* bleibt bei NEXCOUNT – Links aus NEXLOGISTIC geben ihre Adresse selbst mit.
4. [`public/config.js`](public/config.js) enthält *Project URL* und *Publishable key* – beide sind öffentlich
   gedacht. Niemals den `secret`/`service_role` Key ins Repo schreiben!

## Lokal entwickeln

```bash
npm install
npm run dev                                  # http://localhost:8789 – nutzt das Supabase-Projekt aus config.js
SUPABASE_ACCESS_TOKEN=… npm run migrate      # Migrationen von lokal aus einspielen
```

Für lokale Tests `http://localhost:8789/**` unter *Redirect URLs* eintragen.
Supabase-Bibliothek aktualisieren: `npm update @supabase/supabase-js && npm run vendor`.
Neue Datenbank-Änderung: neue Datei `supabase/migrations/<JJJJMMTThhmmss>_<name>.sql` anlegen und pushen –
bestehende Migrationen nie nachträglich ändern.

## Hinweise

- Supabase verschickt im kostenlosen Plan nur wenige E-Mails pro Stunde – für den Echtbetrieb einen eigenen
  SMTP-Server unter *Authentication → Emails* eintragen (gilt für alle NEX-Apps gemeinsam).
- Kostenlose Supabase-Projekte pausieren nach einer Woche ohne Aktivität.
- Fälligkeiten (§57a, Service, Führerschein, Code 95) sind eine Erinnerungshilfe und ersetzen keine Fristenkontrolle.
