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

Der Rasen wächst über Zeit. Es gibt ein optimales Zeitfenster / eine optimale Graslänge zum Mähen. Wird zu früh gemäht, geht der Mähvorgang zwar schneller, aber der Spieler bekommt auch nur anteilig Geld. Wird zu spät gemäht, dauert es länger, es gibt das volle Geld (nicht mehr), aber die Zufriedenheit des Kunden sinkt und somit die Reputation des Spielers. Außerdem erhöht sich der Verschleiß.

Beispiel:

- **< 60:** Geld anteilig zur Länge, Mähdauer sinkt entsprechend
- **60–80:** 100 % Geld + Zufriedenheitsbonus
- **80–100:** volles Geld, Mähdauer +50 %, Zufriedenheit fällt proportional
- **> 100:** verwildert — doppelte Mähdauer, dreifacher Zufriedenheitsverlust

## Bewässerung

Anfangs wird mit Gartenschlauch bewässert. Diese Tätigkeit bindet den Spieler die gesamte Zeit über (wie manuelles Mähen). Dann können Bügelregner freigeschaltet werden, die manuell an- und ausgestellt werden müssen, aber ansonsten autark arbeiten. Später können automatische Versenkregner eingesetzt werden, die alles automatisieren.

Analog zum Mähen gibt es auch hier einen optimalen Zeitpunkt. Zu früh / zu viel gewässert leidet die Rasenqualität, zu spät / zu wenig lässt ihn vertrocknen

Beispiel:

- **< 30:** vertrocknet — Wachstum halbiert, Zufriedenheit fällt
- **> 85:** matschig — Mähdauer +40 %, Zufriedenheit fällt
- **> 100:** Überschwemmung — Skala läuft bis 150, Zufriedenheitsverlust steigt mit jedem Punkt darüber
- Bei 150 wird automatisch abgeriegelt, das Grundstück bleibt aber für 2 Min. unbearbeitbar

## Wartung

Geräte verschleißen mit der Zeit, mit Nutzung und auch einfach spontan durch unerwartete Events. Wartung kostet Zeit und Geld. Der Spieler kann die Zeit für die Wartung aber durch besseres Werkzeug verkürzen und letztlich auch die Wartung komplett automatisieren durch Beauftragung einer Firma.

Beispiel:

- **< 40:** Ausfallrisiko beginnt
- **< 20:** 15 % Ausfallrisiko pro Nutzung
- Kaputte Geräte blockieren das Grundstück vollständig bis zur Reparatur

## Manuell vs Automatisiert

Zunächst macht der Spieler alles manuell. Mähen, wässern und reparieren. Wenn er auf einem Grundstück mäht, ist er „blockiert“ und kann z.B. nicht auf einem weiteren Grundstück wässern.

Über Upgrades können diese Aufgaben automatisiert werden, sodass sie parallel laufen können.

## Upgrades

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
- Jedes Grundstück besitzt eine eigene Kundenzufriedenheit. Die globale Reputation ergibt sich aus guter Arbeit und schaltet bessere Angebote sowie Technik frei.
- Bei starker Verwahrlosung können Verträge verloren gehen. Das erste Grundstück bleibt immer als Sicherheitsnetz erhalten.
- Während der Offline-Zeit wird kein Vertrag direkt gekündigt. Kritische Verträge erhalten beim nächsten Besuch eine zehnminütige Rettungsfrist.
- Geld kann nie negativ werden.

## Wirtschaft

- Der Kunde bezahlt für das Mähen. Ein optimaler Pflegezeitpunkt erzeugt einen Qualitätsbonus.
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
- Optimale Pflegefenster sind eindeutig sichtbar.
- Der Spielstand wird lokal im Browser gespeichert. Ein Konto oder Backend ist zunächst nicht vorgesehen.
- Musik und Sound gehören nicht zur ersten Version.
