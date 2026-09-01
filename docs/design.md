# Design

## Spielprinzip

Der Spieler ist freiberuflicher Gartenlandschaftsbauer, spezialisiert auf Rasenpflege.
Zu Beginn des Spiels bekommt er einen ersten Auftrag für ein kleines Grundstück.

Der Spieler hat 3 Aufgaben:

- Mähen
- Bewässern
- Wartung

Mit steigender Reputation erhält der Spieler im Laufe des Spiels Angebote für weitere Aufträge auf größeren Grundstücken. Dabei steigt das Einkommen mit der zu mähenden Fläche, aber die Dauer des Arbeiten wächst nicht 1:1 mit (eine doppelt so große Fläche zu mähen / bewässern / warten dauert nicht doppelt so lange, weil Rüstzeiten nahezu konstant bleiben)

Jedes Grundstück hat seinen eigenen Rasenmäher, Gartenschlauch, etc. Diese Dinge können kaputt gehen und müssen dann repariert werden, was Zeit kostet.

## Mähen

Anfangs mäht der Spieler manuell, dann bekommt er besseres Equipment, damit es einfacher wird und irgendwann automatisiert er die Aufgabe.

Der Rasen wächst über Zeit. Ein optimales Fenster gibt es bewusst nicht: bezahlt wird, was tatsächlich geschnitten wird. Jede Arbeit läuft bis zum Ende durch, also bis der Wert bei 100 % liegt — abgebrochen wird nur von Hand. Die Dauer wächst deshalb mit dem Pensum: langes Gras zu mähen dauert länger, bringt ab einem gewissen Punkt aber kein Geld mehr.

Beispiel:

- **Dauer:** anteilig zum Pensum bis 100 %, dazu Fläche, Gerät und Zustand
- **Ertrag:** anteilig zur geschnittenen Länge, gedeckelt bei 66 Punkten; darüber steigt nur noch der Aufwand
- **> 80:** zäheres Gras, Mähdauer zusätzlich +20 %, erhöhter Verschleiß
- **> 100:** verwildert — zusätzlich +50 % Dauer, deutlich mehr Verschleiß, Reputation sinkt statt zu steigen

## Bewässerung

Anfangs wird mit Gartenschlauch bewässert. Diese Tätigkeit bindet den Spieler die gesamte Zeit über (wie manuelles Mähen). Dann können Bügelregner freigeschaltet werden, die manuell an- und ausgestellt werden müssen, aber ansonsten autark arbeiten. Später können automatische Versenkregner eingesetzt werden, die alles automatisieren.

Analog zum Mähen gibt es auch hier einen optimalen Zeitpunkt. Zu früh / zu viel gewässert leidet die Rasenqualität, zu spät / zu wenig lässt ihn vertrocknen

Beispiel:

- **< 30:** vertrocknet — Wachstum halbiert, Zufriedenheit fällt
- **> 85:** matschig — Mähdauer +40 %, Zufriedenheit fällt
- **> 100:** Überschwemmung — Skala läuft bis 150, Zufriedenheitsverlust steigt mit jedem Punkt darüber
- Bei 150 wird automatisch abgeriegelt, das Grundstück bleibt aber für 2 Min. unbearbeitbar

## Wartung

Geräte verschleißen mit der Zeit, mit Nutzung und auch einfach spontan durch unerwartete Events. Wartung kostet Zeit und Geld und stellt den Zustand immer vollständig her; besseres Werkzeug macht sie schneller, nicht gründlicher. Letztlich lässt sich die Wartung durch Beauftragung einer Firma komplett automatisieren.

Beispiel:

- **< 70:** Ausfallrisiko beginnt und wächst quadratisch mit dem Verschleiß
- **0:** 22 % Ausfallrisiko pro Nutzung
- Mäher und Bewässerung fallen einzeln aus; ein defektes Gerät sperrt nur seine eigene Aufgabe, die übrigen laufen weiter
- Die Reparatur kostet Ersatzteile zusätzlich zur Wartungsrechnung und dauert länger — stetige Pflege ist immer günstiger als ein Ausfall

## Manuell vs Automatisiert

Der Spieler leitet den Betrieb als Geschäftsführer und weist die Arbeiten seinen Mitarbeitern zu. Der Betrieb beginnt mit einem Mitarbeiter und kann über Upgrades auf höchstens vier Mitarbeiter erweitert werden. Jeder Mitarbeiter kann gleichzeitig eine manuelle Arbeit oder eine Weiterbildung übernehmen.

Auf einem Grundstück dürfen Mähen, Bewässern und Wartung parallel laufen; dieselbe Aufgabenart kann dort aber nicht mehrfach gleichzeitig gestartet werden.

Freihändige und automatische Technik belegt keinen Mitarbeiter. Vollautomatische Technik startet eine Aufgabe zusätzlich selbstständig, sobald Bedarf entsteht.

## Upgrades

- Mitarbeiter
  - 2. Mitarbeiter: Reputation 5, 500 €
  - 3. Mitarbeiter: Reputation 15, 2.500 €
  - 4. Mitarbeiter: Reputation 30, 10.000 €
- Chemie
  - Dünger (Rasen wächst schneller)
  - Unkrautvernichter
- Rasenmäher
  - Manueller Schiebe-Mäher
  - Benzinmäher
  - Mäher mit Antrieb (schneller)
  - Aufsitzmäher
  - Mähroboter (Automation)
    - Ausbau
      - Zuverlässigkeit
      - Kantenschnitt
      - Mähbreite
- Bewässerung
  - Gartenschlauch
  - Bügelregner
  - Versenksprenger (Automation)
    - Ausbau
      - Zuverlässigkeit
      - Frostschutz
- Wartung
  - Einfache Werkzeugtasche
  - Besseres Werkzeug
  - Akkuwerkzeug (schneller)
  - Serviceteam (Automation)
    - Ausbau
      - Rund-um-die-Uhr Service
      - Schneller
      - Bessere Qualität

## Events

Es können verschiedene Ereignisse auftreten, die die Arbeit positiv oder negativ beeinflussen

- Frost
- Maulwurf (kann manuell „entfernt“ werden)
- Hitzewelle (Rasen vertrocknet schneller, es muss mehr gewässert werden)
- Geplatztes Wasserrohr (Überwässerung)
- Regenschauer (übernimmt die Bewässerung - kann je nach Bewässerungsstand gut oder schlecht sein)

## Wechselwirkungen

Beispiele:

- Nassen Rasen mähen → längere Dauer, **doppelter** Geräteverschleiß
- Dünger → Wachstum ×1,5, Wasserbedarf ×1,3
- Vertrockneter Rasen → Wachstum halbiert, also seltener Mähgeld
- Mähroboter auf zu langem Gras → höheres Ausfallrisiko

## UI

Der Hauptbildschirm des Spiels soll möglichst „scrollfrei“ sein. Einzelne Elemente können aber natürlich scrollen.

## Technologie

Das Spiel soll auf HTML, TypeScript und SCSS basieren.

## Festgelegte Produktrichtung

- Casual-Idle-Spiel ohne festes Ende; langfristiges Ziel ist immer weiteres Wachstum des Vermögens.
- Die Spielwelt entwickelt sich permanent weiter, auch wenn das Spiel geschlossen ist.
- Eine anfängliche Sitzung kann ein bis zwei Stunden dauern. Später soll ein kurzer täglicher Besuch ausreichen.
- Aufgaben werden gestartet und laufen anschließend für eine sichtbare reale Dauer. Es gibt keine Minispiele und keine Geschwindigkeitsstufen.
- Ein manuell gestarteter Vorgang läuft auch bei geschlossenem Spiel weiter.
- Reise- und Rüstzeiten werden nicht separat dargestellt, sondern sind in den Aufgabendauern enthalten.
- Der Gartenbauer stellt das Equipment auf jedem Grundstück selbst. Freischaltungen gelten global, die Anschaffung erfolgt anschließend pro Grundstück.
- Grundstücke sind dauerhafte Kundenverträge. Angebote können angenommen oder abgelehnt werden.
- Es gibt kein künstliches Vertragslimit. Zu viele Verträge können jedoch zu Überlastung und sinkender Kundenzufriedenheit führen.
- Jedes Grundstück besitzt eine eigene Kundenzufriedenheit. Sie ergibt sich direkt aus den drei Werten — 55 % Rasenschnitt, 35 % Bewässerung, 10 % Wartung — und folgt diesem Zielwert träge, damit sie nicht springt und Zeit zum Gegensteuern bleibt. Anspruchsvolle Kunden sinken schneller, als sie sich erholen.
- Die globale Reputation ergibt sich aus guter Arbeit und schaltet bessere Angebote sowie Technik frei.
- Bei starker Verwahrlosung können Verträge verloren gehen. Das erste Grundstück bleibt immer als Sicherheitsnetz erhalten.
- Während der Offline-Zeit wird kein Vertrag direkt gekündigt. Kritische Verträge erhalten beim nächsten Besuch eine zehnminütige Rettungsfrist.
- Geld kann nie negativ werden.

## Wirtschaft

- Der Kunde bezahlt für das Mähen und für das Bewässern, jeweils anteilig zur geleisteten Arbeit.
- Bewässerung und Wartung sichern zukünftige Mäherträge, bringen aber nicht direkt Geld ein.
- Wartung kostet Geld und Zeit.
- Geldbeträge bleiben als nachvollziehbare Eurobeträge dargestellt und können langfristig bis in den Millionenbereich wachsen.
- Frühes Mähen gegen anteilige Bezahlung ist eine legitime Strategie.

## Grundstücksmerkmale

Grundstücke unterscheiden sich durch:

- Fläche
- Wachstumsgeschwindigkeit
- Wasserspeicherung beziehungsweise Austrocknung
- Kundenanspruch
- Vergütung

Als Progressionsrichtwert startet der Spieler mit einem Grundstück, betreut im mittleren Spiel ungefähr drei bis fünf und kann im späten Spiel zehn bis zwanzig oder mehr verwalten.

## Offline-Fortschritt und Fairness

- Wachstum, Feuchtigkeit, laufende Aufgaben, Verschleiß und automatische Technik werden anhand der vergangenen realen Zeit weiterberechnet.
- Nach der Rückkehr zeigt eine Zusammenfassung Ertrag, erledigte Arbeiten und kritische Grundstücke.
- Negative Folgen sind sanft abgestimmt und sollen keine plötzliche unaufholbare Abwärtsspirale erzeugen.
- Ein gepflegtes Gerät fällt nicht ohne Vorwarnung aus. Ein sichtbares Risiko entsteht erst bei schlechtem Zustand.
- Geschädigter Rasen und Kundenzufriedenheit können sich durch gute Pflege wieder erholen.

## Ereignisse und Jahreszeiten

- Wetter betrifft die gesamte Region und damit grundsätzlich alle Grundstücke.
- Ereignisse treten überraschend auf und verändern Zustände oder erzeugen eine einfache zeitlich begrenzte Reaktion.
- Für die erste Version sind keine vollständigen Jahreszeiten vorgesehen. Frost bleibt zunächst ein seltenes Wetterereignis.

## Oberfläche und Speicherung

- Sachlich-cleanes, deutschsprachiges Dashboard mit passenden Illustrationen.
- Desktop und Mobilgeräte werden gleichwertig unterstützt.
- Der Hauptbildschirm bleibt auf Desktop möglichst ohne Seitenscrollen; einzelne Bereiche können intern scrollen.
- Zustände werden als klar beschriftete Skalen und nicht als realistische Zentimeter- oder Prozentmesswerte kommuniziert.
- Alle Werte laufen auf einer Skala, auf der 100 % das Beste ist.
- Der Spielstand wird lokal im Browser gespeichert. Ein Konto oder Backend ist zunächst nicht vorgesehen.
- Musik und Sound gehören nicht zur ersten Version.
