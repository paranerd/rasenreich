# Garden Grinder

Ein deutschsprachiges Casual-Idle-Spiel über den Aufbau eines Rasenpflegebetriebs.

## Enthalten

- Zeitbasierte Aufgaben für Mähen, Bewässern und Wartung
- Offline-Fortschritt mit Rückkehr-Zusammenfassung
- Dauerhafte Kundenverträge und zufällige Angebote
- Globale Technik-Freischaltungen und Anschaffungen pro Grundstück
- Automatisierung durch Mähroboter, Versenksprenger und Serviceteam
- Wetterereignisse, lokale Speicherung und responsive Bedienung

## Technik

Reine Client-Anwendung: Vite, React 19, Tailwind 4 und shadcn/ui. Kein Server,
kein Backend — der Spielstand liegt im `localStorage`. Die Spiellogik in
`lib/game.ts` ist frei von Framework-Abhängigkeiten.

## Entwicklung

```sh
npm install
npm run dev
```

Der Produktionsstand wird mit `npm run build` geprüft (`tsc --noEmit` und
`vite build`).

## Veröffentlichung

Jeder Push auf `main` baut und veröffentlicht über
`.github/workflows/deploy.yml` nach GitHub Pages. Der Unterpfad wird über die
Umgebungsvariable `BASE_PATH` gesetzt:

```sh
BASE_PATH=/garden-grinder/ npm run build   # GitHub Pages
BASE_PATH=./ npm run build                 # relatives Bundle, z. B. für Capacitor
```
