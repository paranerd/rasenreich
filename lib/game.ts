export type TaskKind = 'mow' | 'water' | 'maintain';
/** Wartung selbst kann nicht ausfallen — sonst gäbe es keinen Weg zurück. */
export type BreakableKind = 'mow' | 'water';
export const BREAKABLE: BreakableKind[] = ['mow', 'water'];
export type ViewName = 'overview' | 'offers' | 'upgrades';
export type KnowledgeKind = TaskKind | 'fertilizer' | 'weedControl';

export interface EquipmentLevel {
  name: string;
  installCost: number;
  reputation: number;
  speed: number;
  automated?: boolean;
  /** Chance eines Roboter-Mähdurchgangs ohne kurzen manuellen Eingriff. */
  reliability?: number;
  /** Maximal erreichbarer Pflegegrad beim autonomen Mähen. */
  maxCare?: number;
  /** Maximal erreichbarer Bewässerungsgrad. */
  maxWater?: number;
  description: string;
}

/** Welcher Wert einer Aufgabe auf welches Ziel zuläuft. */
export type TaskTargetKey = 'grass' | 'moisture' | 'condition';

/** Was eine Aufgabe über ihre gesamte Laufzeit bewirkt. */
export interface TaskEffect {
  /**
   * Der Wert, den die Arbeit bis zum Ende erreicht. Angesteuert wird das Ziel,
   * nicht eine feste Menge — was der Rasen währenddessen nachwächst, gleicht
   * die Arbeit mit aus und landet am Ende exakt bei 100 %.
   */
  target?: { key: TaskTargetKey; value: number };
  /** Verschleiß am tatsächlich benutzten Gerät über die gesamte Laufzeit. */
  wear?: { kind: BreakableKind; amount: number };
}

export type TaskPhase = 'setup' | 'work' | 'wrapup';

export interface PropertyTask {
  kind: TaskKind;
  /** Beginn des Rüstens. */
  startedAt: number;
  /** Beginn der eigentlichen Arbeit — vorher wird gerüstet. */
  workStartsAt?: number;
  /** Ende der Arbeit — danach wird abgeschlossen. */
  workEndsAt?: number;
  /** Fertig, inklusive Abschluss. */
  endsAt: number;
  automated: boolean;
  /** Belegt waehrend der gesamten Laufzeit einen Mitarbeiter. */
  usesWorker: boolean;
  /** Nullbasiertes Mitarbeiter-Slot, bei Automatik leer. */
  workerId?: number;
  /** Nur für die Migration alter Spielstände. */
  blocksPlayer?: boolean;
  cost: number;
  payoutTotal?: number;
  payoutAccrued?: number;
  /** Zustand vor der Arbeit — die Bewertung am Ende hängt daran, nicht am Endwert. */
  startGrass?: number;
  startMoisture?: number;
  effect?: TaskEffect;
  /** Anteil der Wirkung, der bereits eingeflossen ist (0 bis 1). */
  effectProgress?: number;
  /** Abgebrochen — es läuft nur noch der Abschluss, ohne weitere Wirkung. */
  cancelled?: boolean;
  /** Geplanter einmaliger Stopp eines automatischen Durchgangs. */
  automationInterruptionAt?: number;
  /** Nur für die Migration alter Spielstände. */
  robotInterruptionAt?: number;
}

export interface AutomationIntervention {
  kind: BreakableKind;
  /** Seit wann der automatische Durchgang auf einen Mitarbeiter wartet. */
  pausedAt: number;
  /** Beginn und Ende des kurzen manuellen Eingriffs. */
  startedAt?: number;
  endsAt?: number;
  workerId?: number;
}

export interface ResearchTask {
  kind: KnowledgeKind;
  name: string;
  targetLevel?: number;
  startedAt: number;
  endsAt: number;
  cost: number;
  workerId: number;
}

export interface GardenProperty {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  size: number;
  payout: number;
  growthFactor: number;
  drainage: number;
  customerDemand: number;
  grass: number;
  moisture: number;
  condition: number;
  /** Technischer Wartungszustand je ausfallfähigem Gerät. */
  equipmentCondition: Record<BreakableKind, number>;
  satisfaction: number;
  equipment: Record<TaskKind, number>;
  /** Ausgefallene Geräte. Ein defektes Gerät sperrt nur seine eigene Aufgabe. */
  broken: Record<BreakableKind, boolean>;
  fertilizer: boolean;
  weedControl: boolean;
  tasks: PropertyTask[];
  /** Unabhängig vom technischen Zustand: eine blockierte Automatik. */
  automationIntervention?: AutomationIntervention;
  /** Nur für die Migration alter Spielstände. */
  robotIntervention?: Omit<AutomationIntervention, 'kind'>;
  /** Nur für die Migration alter Spielstände. */
  task?: PropertyTask;
  rescueUntil?: number;
  lifetimeRevenue: number;
  completedJobs: number;
  protected: boolean;
}

export interface ContractOffer {
  id: string;
  name: string;
  subtitle: string;
  type: string;
  size: number;
  payout: number;
  growthFactor: number;
  drainage: number;
  customerDemand: number;
  expiresAt: number;
}

export interface GameEvent {
  id: string;
  type: 'rain' | 'heat' | 'mole' | 'review';
  title: string;
  description: string;
  propertyId?: string;
  actionLabel?: string;
  expiresAt: number;
}

export interface GameLog {
  id: string;
  at: number;
  text: string;
  tone: 'good' | 'neutral' | 'warning';
}

export const SAVE_VERSION = 15;
const SUPPORTED_VERSIONS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  SAVE_VERSION,
];

export const MAX_WORKERS = 4;

export interface WorkerUpgrade {
  workers: number;
  reputation: number;
  cost: number;
}

export const WORKER_UPGRADES: WorkerUpgrade[] = [
  { workers: 2, reputation: 5, cost: 500 },
  { workers: 3, reputation: 15, cost: 2_500 },
  { workers: 4, reputation: 30, cost: 10_000 },
];

export interface GameState {
  version: number;
  /** Aktiver Tutorial-Schritt. `null` bedeutet abgeschlossen oder übersprungen. */
  tutorialStep: number | null;
  money: number;
  reputation: number;
  lifetimeRevenue: number;
  sessionRevenue: number;
  workers: number;
  properties: GardenProperty[];
  offers: ContractOffer[];
  unlocked: Record<TaskKind, number>;
  chemistryUnlocked: {
    fertilizer: boolean;
    weedControl: boolean;
  };
  researchTask?: ResearchTask;
  activeEvent?: GameEvent;
  weather: 'mild' | 'heat' | 'rain';
  weatherUntil: number;
  nextEventAt: number;
  nextOfferAt: number;
  lastUpdatedAt: number;
  logs: GameLog[];
}

export interface OfflineSummary {
  elapsedMs: number;
  earned: number;
  completed: number;
  critical: number;
}

export interface GameResult {
  state: GameState;
  message?: string;
}

export const EQUIPMENT: Record<TaskKind, EquipmentLevel[]> = {
  mow: [
    {
      name: 'Grashüpfer',
      installCost: 0,
      reputation: 0,
      speed: 1,
      reliability: 1,
      maxCare: 100,
      description:
        'Klassischer Schiebemäher: langsam, direkt und unverwüstlich.',
    },
    {
      name: 'Rasen-Rambo',
      installCost: 180,
      reputation: 3,
      speed: 0.8,
      reliability: 1,
      maxCare: 100,
      description:
        'Ein kräftiger Benzinmotor liefert mehr Tempo bei langem Gras.',
    },
    {
      name: 'TurboMow 500',
      installCost: 720,
      reputation: 8,
      speed: 0.625,
      reliability: 1,
      maxCare: 100,
      description:
        'Der Radantrieb zieht den Benzinmäher zügig über mittlere Flächen.',
    },
    {
      name: 'Brumm Brumm 1000',
      installCost: 2_400,
      reputation: 18,
      speed: 0.4,
      reliability: 1,
      maxCare: 100,
      description:
        'Ein kleiner Aufsitzmäher macht größere Flächen bequem beherrschbar.',
    },
    {
      name: 'Mähximus 3000',
      installCost: 5_400,
      reputation: 28,
      speed: 0.286,
      reliability: 1,
      maxCare: 100,
      description:
        'Der Rasentraktor gewinnt mit größerer Mähbreite viel Fläche pro Bahn.',
    },
    {
      name: 'Graszilla Deluxe',
      installCost: 11_250,
      reputation: 40,
      speed: 0.2,
      reliability: 1,
      maxCare: 100,
      description:
        'Ein großer Rasentraktor mit breitem Doppelmähdeck für maximale aktive Leistung.',
    },
    {
      name: 'GreenBot Easy',
      installCost: 19_500,
      reputation: 52,
      speed: 2,
      automated: true,
      reliability: 0.7,
      maxCare: 75,
      description:
        'Arbeitet automatisch, braucht aber noch häufiger kurze Hilfe.',
    },
    {
      name: 'PowerBot Pro',
      installCost: 36_000,
      reputation: 66,
      speed: 1.538,
      automated: true,
      reliability: 0.8,
      maxCare: 85,
      description:
        'Intelligente Navigation verbessert Tempo und Zuverlässigkeit.',
    },
    {
      name: 'SmartCut Deluxe',
      installCost: 67_500,
      reputation: 82,
      speed: 1.25,
      automated: true,
      reliability: 0.9,
      maxCare: 95,
      description:
        'Cut-to-Edge und bürstenloser Motor liefern fast perfekte Pflege.',
    },
    {
      name: 'TerraPilot Ultra',
      installCost: 127_500,
      reputation: 100,
      speed: 1,
      automated: true,
      reliability: 0.95,
      maxCare: 100,
      description:
        'LiDAR und Allradantrieb pflegen jede Fläche vollständig autonom.',
    },
  ],
  water: [
    {
      name: 'Plätscherfix',
      installCost: 0,
      reputation: 0,
      speed: 1,
      reliability: 1,
      maxWater: 100,
      description:
        'Ein klassischer Gartenschlauch bindet einen Mitarbeiter während der gesamten Bewässerung.',
    },
    {
      name: 'BrauseBoost 200',
      installCost: 390,
      reputation: 5,
      speed: 0.769,
      reliability: 1,
      maxWater: 100,
      description:
        'Eine ergonomische Bewässerungsbrause verteilt das Wasser gleichmäßiger und schneller.',
    },
    {
      name: 'HydroBoost 500',
      installCost: 975,
      reputation: 10,
      speed: 0.588,
      reliability: 1,
      maxWater: 100,
      description:
        'Eine Hochdurchflussbrause mit Druckverstärkung bewältigt größere Flächen.',
    },
    {
      name: 'Regenmacher Compact',
      installCost: 2_250,
      reputation: 18,
      speed: 0.455,
      reliability: 1,
      maxWater: 100,
      description:
        'Ein kompakter Bügelregner muss manuell gestartet und wieder abgestellt werden.',
    },
    {
      name: 'Kreisblitz 2000',
      installCost: 4_800,
      reputation: 28,
      speed: 0.333,
      reliability: 1,
      maxWater: 100,
      description:
        'Ein manuell bedienter Impulsregner versorgt große Flächen im Kreis.',
    },
    {
      name: 'Gießzilla Deluxe',
      installCost: 9_750,
      reputation: 40,
      speed: 0.25,
      reliability: 1,
      maxWater: 100,
      description:
        'Mehrere manuell geschaltete Regner bewässern große Grundstücke in parallelen Zonen.',
    },
    {
      name: 'AquaPilot Easy',
      installCost: 16_500,
      reputation: 52,
      speed: 1.667,
      automated: true,
      reliability: 0.7,
      maxWater: 75,
      description:
        'Eine einfache zeitgesteuerte Versenkberegnung startet automatisch.',
    },
    {
      name: 'HydroSense Pro',
      installCost: 30_000,
      reputation: 66,
      speed: 1.25,
      automated: true,
      reliability: 0.8,
      maxWater: 85,
      description:
        'Bodenfeuchtesensoren erkennen, wann einzelne Bereiche Wasser benötigen.',
    },
    {
      name: 'RainMind Deluxe',
      installCost: 57_000,
      reputation: 82,
      speed: 1,
      automated: true,
      reliability: 0.9,
      maxWater: 95,
      description:
        'Wetterdaten und intelligente Zonensteuerung optimieren jeden Durchgang.',
    },
    {
      name: 'TerraFlow Ultra',
      installCost: 105_000,
      reputation: 100,
      speed: 0.8,
      automated: true,
      reliability: 0.95,
      maxWater: 100,
      description:
        'Ein Sensornetz regelt Wassermenge, Druck und Zonen vorausschauend.',
    },
  ],
  maintain: [
    {
      name: 'Werkzeugtasche',
      installCost: 0,
      reputation: 0,
      speed: 1,
      description: 'Alles Nötige für einfache Reparaturen.',
    },
    {
      name: 'Profiwerkzeug',
      installCost: 480,
      reputation: 6,
      speed: 0.72,
      description: 'Präzisere Wartung mit weniger Zeitaufwand.',
    },
    {
      name: 'Akkuwerkzeug',
      installCost: 1_350,
      reputation: 14,
      speed: 0.5,
      description: 'Reparaturen gehen deutlich schneller von der Hand.',
    },
    {
      name: 'Serviceteam',
      installCost: 6_300,
      reputation: 28,
      speed: 0.25,
      automated: true,
      description: 'Kümmert sich automatisch um gefährdete Geräte.',
    },
  ],
};

export const TASK_LABELS: Record<TaskKind, string> = {
  mow: 'Rasenschnitt',
  water: 'Bewässerung',
  maintain: 'Wartung',
};

/** Verben für Schaltflächen und laufende Arbeiten — TASK_LABELS benennt dagegen den Zustand. */
export const ACTION_LABELS: Record<TaskKind, string> = {
  mow: 'Mähen',
  water: 'Bewässern',
  maintain: 'Reparieren',
};

const OFFER_TEMPLATES = [
  {
    minRep: 1,
    type: 'Wohnhaus',
    names: ['Familie Wagner', 'Herr Krüger', 'Familie Neumann'],
    sizes: [140, 180],
    growth: 1,
    drainage: 1,
    demand: 1,
  },
  {
    minRep: 7,
    type: 'Stadtvilla',
    names: ['Villa Lindenhof', 'Haus am Park', 'Familie Seidel'],
    sizes: [260, 420],
    growth: 1.12,
    drainage: 0.9,
    demand: 1.15,
  },
  {
    minRep: 14,
    type: 'Firmengelände',
    names: ['Nordwerk Büropark', 'Klar & Co.', 'Kontor West'],
    sizes: [520, 850],
    growth: 0.92,
    drainage: 1.15,
    demand: 1.05,
  },
  {
    minRep: 24,
    type: 'Landgut',
    names: ['Gut Eichenfeld', 'Hof Rosenau', 'Landhaus Falken'],
    sizes: [900, 1_500],
    growth: 1.2,
    drainage: 1.08,
    demand: 1.25,
  },
  {
    minRep: 38,
    type: 'Parkanlage',
    names: ['Bürgerpark Süd', 'Kurpark Waldheim', 'Campus Grün'],
    sizes: [1_800, 3_200],
    growth: 1.05,
    drainage: 1.2,
    demand: 1.35,
  },
] as const;

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (value: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, value));
const clone = <T>(value: T): T => structuredClone(value);
const nextRandomOfferAt = (now: number) =>
  now + (45 + Math.random() * 135) * 1_000;

const addLog = (
  state: GameState,
  text: string,
  tone: GameLog['tone'] = 'neutral',
  at = Date.now(),
) => {
  state.logs.unshift({ id: uid(), at, text, tone });
  state.logs = state.logs.slice(0, 12);
};

/** Der sichtbare Technikzustand ist der schlechtere der beiden Gerätezustände. */
function syncEquipmentCondition(property: GardenProperty) {
  property.condition = Math.min(
    property.equipmentCondition.mow,
    property.equipmentCondition.water,
  );
}

export function equipmentCondition(
  property: GardenProperty,
  kind?: BreakableKind,
) {
  return kind
    ? property.equipmentCondition[kind]
    : Math.min(
        property.equipmentCondition.mow,
        property.equipmentCondition.water,
      );
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    tutorialStep: 0,
    money: 240,
    reputation: 0,
    lifetimeRevenue: 0,
    sessionRevenue: 0,
    workers: 1,
    properties: [],
    offers: [
      {
        id: 'starter-bergmann',
        name: 'Familie Bergmann',
        subtitle: 'Dein erster Auftrag',
        type: 'Vorgarten',
        size: 120,
        payout: 40,
        growthFactor: 1,
        drainage: 1,
        customerDemand: 0.9,
        // Das Einführungsangebot verfällt nicht, während der Spieler liest.
        expiresAt: now + 365 * 24 * 60 * 60_000,
      },
    ],
    unlocked: { mow: 0, water: 0, maintain: 0 },
    chemistryUnlocked: { fertilizer: false, weedControl: false },
    weather: 'mild',
    weatherUntil: 0,
    nextEventAt: now + 4 * 60_000,
    nextOfferAt: nextRandomOfferAt(now),
    lastUpdatedAt: now,
    logs: [
      {
        id: uid(),
        at: now,
        text: 'Familie Bergmann wartet auf deine Rückmeldung.',
        tone: 'neutral',
      },
    ],
  };
}

/** Wie gut die Feuchtigkeit aus Kundensicht dasteht. */
export function moistureQuality(moisture: number) {
  return clamp(moisture);
}

/**
 * Der Kunde sieht den Schnitt jeden Tag, das Wasser hält den Rasen grün, der
 * Zustand deiner Technik ist eigentlich dein Problem — schlägt aber über
 * Verzögerungen und Ausfälle durch.
 */
const SATISFACTION_WEIGHTS: Record<TaskKind, number> = {
  mow: 0.55,
  water: 0.35,
  maintain: 0.1,
};

/** Wie zufrieden der Kunde bei diesem Zustand auf Dauer wäre. */
export function satisfactionTarget(property: GardenProperty) {
  return (
    propertyMetricPercent(property, 'mow') * SATISFACTION_WEIGHTS.mow +
    moistureQuality(property.moisture) * SATISFACTION_WEIGHTS.water +
    equipmentCondition(property) * SATISFACTION_WEIGHTS.maintain
  );
}

/** Anteil der Lücke zum Zielwert, der je Minute geschlossen wird. */
const SATISFACTION_RATE = 0.3;

export function isBroken(property: GardenProperty, kind?: TaskKind) {
  if (kind) return kind !== 'maintain' && property.broken[kind];
  return BREAKABLE.some((entry) => property.broken[entry]);
}

export function brokenCount(property: GardenProperty) {
  return BREAKABLE.filter((entry) => property.broken[entry]).length;
}

/**
 * Ausfallrisiko eines Geräts bei einem Einsatz. Ab Zustand 70 ist es null und
 * wächst darunter quadratisch — wer regelmäßig wartet, erlebt keine Ausfälle.
 */
export function failureRisk(property: GardenProperty, kind: TaskKind) {
  if (kind === 'maintain' || property.broken[kind]) return 0;
  const wear = Math.max(0, 70 - equipmentCondition(property, kind)) / 70;
  return 0.22 * wear * wear;
}

/**
 * Ersatzteile für ein ausgefallenes Gerät. Sie kommen zur normalen
 * Wartungsrechnung dazu und machen den Ausfall deutlich teurer als jede Pflege
 * davor — die Instandhaltung ist mit 0,70 € pro Zustandspunkt linear.
 */
const PARTS_BASE: Record<BreakableKind, number> = { mow: 90, water: 60 };

export function partsCost(property: GardenProperty, kind: BreakableKind) {
  return Math.round(PARTS_BASE[kind] * Math.pow(property.size / 120, 0.4));
}

/**
 * Rüst- und Abschlusszeiten bleiben konstant: sie hängen weder an der Fläche
 * noch am Gerät. Genau das macht große Grundstücke lohnender als viele kleine.
 * Automatik rüstet nicht — der Roboter fährt einfach los.
 */
const SETUP_SECONDS: Record<TaskKind, number> = {
  mow: 6,
  water: 5,
  maintain: 8,
};
const WRAPUP_SECONDS: Record<TaskKind, number> = {
  mow: 5,
  water: 4,
  maintain: 6,
};

export function taskSetupDuration(property: GardenProperty, kind: TaskKind) {
  return isAutomated(property, kind) ? 0 : SETUP_SECONDS[kind];
}

export function taskWrapUpDuration(property: GardenProperty, kind: TaskKind) {
  return isAutomated(property, kind) ? 0 : WRAPUP_SECONDS[kind];
}

/** Rüsten, Arbeiten und Abschließen zusammen — was in der Anzeige steht. */
export function taskTotalDuration(property: GardenProperty, kind: TaskKind) {
  return (
    taskSetupDuration(property, kind) +
    taskDuration(property, kind) +
    taskWrapUpDuration(property, kind)
  );
}

export function taskWorkWindow(task: PropertyTask) {
  return {
    from: task.workStartsAt ?? task.startedAt,
    to: task.workEndsAt ?? task.endsAt,
  };
}

/**
 * Die Uhr läuft flüssig, simuliert wird aber im Takt. Der Abschluss beginnt
 * deshalb erst, wenn die Wirkung auch wirklich verbucht ist — sonst stünde
 * „Abschluss" schon da, während der letzte Takt den Wert noch anhebt.
 */
export function taskPhase(task: PropertyTask, now = Date.now()): TaskPhase {
  const { from, to } = taskWorkWindow(task);
  if (now < from) return 'setup';
  if (now < to) return 'work';
  if (!task.cancelled && (task.effectProgress ?? 1) < 1) return 'work';
  return 'wrapup';
}

/** Nur die Arbeitszeit selbst, ohne Rüsten und Abschluss. */
export function taskDuration(property: GardenProperty, kind: TaskKind) {
  const base = kind === 'mow' ? 30 : kind === 'water' ? 45 : 60;
  const sizeFactor = Math.pow(property.size / 120, 0.56);
  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  // Die Arbeit läuft bis 100 %, die Dauer wächst also mit dem Weg dorthin.
  const load = taskWorkload(property, kind) / REFERENCE_WORKLOAD[kind];
  const relevantCondition =
    kind === 'maintain'
      ? equipmentCondition(property)
      : equipmentCondition(property, kind);
  let conditionFactor = 1 + Math.max(0, 55 - relevantCondition) / 100;
  // Langes und nasses Gras ist zäher, nicht nur mehr.
  if (kind === 'mow' && property.grass > 100) conditionFactor *= 1.5;
  else if (kind === 'mow' && property.grass > 80) conditionFactor *= 1.2;
  // Eine Reparatur dauert länger als die reine Pflege.
  if (kind === 'maintain') conditionFactor *= 1 + brokenCount(property) * 0.6;
  return Math.max(
    8,
    Math.round(base * sizeFactor * equipment.speed * conditionFactor * load),
  );
}

export function maintenanceCost(property: GardenProperty) {
  const upkeep = Math.max(
    8,
    Math.round(
      BREAKABLE.reduce(
        (sum, kind) => sum + (100 - equipmentCondition(property, kind)),
        0,
      ) *
        0.42 *
        Math.pow(property.size / 120, 0.25),
    ),
  );
  return (
    upkeep +
    BREAKABLE.reduce(
      (sum, kind) =>
        property.broken[kind] ? sum + partsCost(property, kind) : sum,
      0,
    )
  );
}

/**
 * Bezahlt wird, was tatsächlich geschnitten wird — kein Optimalfenster mehr.
 * Ein Schnitt nimmt höchstens 66 Punkte Graslänge ab; wer den Rasen darüber
 * hinaus wachsen lässt, verdient nichts mehr dazu, zahlt aber mit Zeit,
 * Verschleiß, Reputation und der Zufriedenheit des Kunden.
 * `grass` ist übergebbar, weil der Lohn beim Start eingefroren wird.
 */
export const MAX_CUT = 66;

/** Graslänge, bei der die Anzeige genau 100 % erreicht — dort endet ein Schnitt. */
export const GRASS_FLOOR = 20;

/** Ziel-Graslänge des installierten Mähers, abgeleitet vom maximalen Pflegegrad. */
export function mowingTargetGrass(property: GardenProperty) {
  const maxCare = EQUIPMENT.mow[property.equipment.mow].maxCare ?? 100;
  return 150 - maxCare * 1.3;
}

/** Ziel der installierten Bewässerungstechnik. */
export function wateringTarget(property: GardenProperty) {
  return EQUIPMENT.water[property.equipment.water].maxWater ?? 100;
}

/**
 * Wie viele Punkte eine Arbeit zurückzulegen hat, bis ihr Wert bei 100 % liegt.
 * Jede Arbeit läuft bis dahin durch; abgebrochen wird nur von Hand.
 */
export function taskWorkload(property: GardenProperty, kind: TaskKind) {
  if (kind === 'mow')
    return Math.max(0, property.grass - mowingTargetGrass(property));
  if (kind === 'water')
    return Math.max(0, wateringTarget(property) - property.moisture);
  return Math.max(0, 100 - equipmentCondition(property));
}

/** Pensum, bei dem die Arbeit genau die Grundzeit dauert. */
const REFERENCE_WORKLOAD: Record<TaskKind, number> = {
  mow: MAX_CUT,
  water: 50,
  maintain: 58,
};

export function mowingPayout(property: GardenProperty, grass = property.grass) {
  const qualityBase = property.weedControl ? 1.08 : 1;
  const cut = Math.max(
    0,
    Math.min(MAX_CUT, grass - mowingTargetGrass(property)),
  );
  return Math.round(property.payout * 1.2 * (cut / MAX_CUT) * qualityBase);
}

/** Bewaessern ist bezahlte Arbeitszeit — der Lohn steigt mit dem tatsaechlichen Wasserbedarf. */
export function wateringPayout(property: GardenProperty) {
  const deficit = Math.max(0, wateringTarget(property) - property.moisture);
  return Math.round(property.payout * 0.6 * Math.min(1, deficit / 60));
}

/** Ertrag einer Aufgabe — Wartung kostet, statt zu zahlen. */
export function taskPayout(property: GardenProperty, kind: TaskKind) {
  if (kind === 'mow') return mowingPayout(property);
  if (kind === 'water') return wateringPayout(property);
  return 0;
}

/**
 * Anteil am bestmöglichen Schnitt-Ertrag in Prozent. Die Anzeige spricht damit
 * dieselbe Sprache wie die Gauges: 100 % ist optimal, 0 % ist schlecht.
 */
/** Anteil am vollen Schnitt in Prozent — 100 heißt: mehr geht nicht. */
export function mowingPayoutShare(
  property: GardenProperty,
  grass = property.grass,
) {
  const full = property.payout * 1.2 * (property.weedControl ? 1.08 : 1);
  return Math.round((mowingPayout(property, grass) / full) * 100);
}

export function isAutomated(property: GardenProperty, kind: TaskKind) {
  return Boolean(EQUIPMENT[kind][property.equipment[kind]].automated);
}

/** Ein Einsatz kann das benutzte Gerät zerlegen — je schlechter gewartet, desto eher. */
function rollFailure(
  state: GameState,
  property: GardenProperty,
  kind: TaskKind,
  at: number,
) {
  if (kind === 'maintain' || property.broken[kind]) return;
  if (Math.random() >= failureRisk(property, kind)) return;
  property.broken[kind] = true;
  property.equipmentCondition[kind] = clamp(
    property.equipmentCondition[kind] - 12,
  );
  syncEquipmentCondition(property);
  addLog(
    state,
    `${property.name}: ${EQUIPMENT[kind][property.equipment[kind]].name} ist ausgefallen und muss repariert werden.`,
    'warning',
    at,
  );
}

/** Verschleiß eines Mähvorgangs — besonders langer Rasen kostet mehr. */
function mowingWear(property: GardenProperty) {
  const longFactor =
    property.grass > 100 ? 2.2 : property.grass > 80 ? 1.45 : 1;
  return 3.2 * Math.pow(property.size / 120, 0.3) * longFactor;
}

/**
 * Die volle Wirkung einer Aufgabe, festgelegt beim Start. Sie fließt über die
 * Laufzeit anteilig ein, damit die Werte während der Arbeit mitlaufen und ein
 * Abbruch die halbe Arbeit behält.
 */
function taskEffect(property: GardenProperty, kind: TaskKind): TaskEffect {
  if (kind === 'mow') {
    return {
      target: { key: 'grass', value: mowingTargetGrass(property) },
      wear: { kind: 'mow', amount: -mowingWear(property) },
    };
  }
  if (kind === 'water')
    return {
      target: { key: 'moisture', value: wateringTarget(property) },
      wear: { kind: 'water', amount: -0.8 },
    };
  return { target: { key: 'condition', value: 100 } };
}

function createTask(
  property: GardenProperty,
  kind: TaskKind,
  at: number,
  automated: boolean,
  usesWorker: boolean,
  cost: number,
  workerId?: number,
): PropertyTask {
  const workStartsAt = at + taskSetupDuration(property, kind) * 1_000;
  const workEndsAt = workStartsAt + taskDuration(property, kind) * 1_000;
  const task: PropertyTask = {
    kind,
    startedAt: at,
    workStartsAt,
    workEndsAt,
    endsAt: workEndsAt + taskWrapUpDuration(property, kind) * 1_000,
    automated,
    usesWorker,
    workerId,
    cost,
    payoutTotal: kind === 'maintain' ? undefined : taskPayout(property, kind),
    payoutAccrued: 0,
    startGrass: property.grass,
    startMoisture: property.moisture,
    effect: taskEffect(property, kind),
    effectProgress: 0,
  };
  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  if (
    equipment.automated &&
    equipment.reliability !== undefined &&
    Math.random() > equipment.reliability
  ) {
    task.automationInterruptionAt =
      workStartsAt + (workEndsAt - workStartsAt) * (0.3 + Math.random() * 0.4);
  }
  return task;
}

/** Lässt die Werte während der Arbeit mitlaufen, statt erst am Ende zu springen. */
function accrueTaskEffect(
  property: GardenProperty,
  task: PropertyTask,
  intervalEnd: number,
) {
  if (
    !task.effect ||
    task.cancelled ||
    property.automationIntervention?.kind === task.kind
  )
    return;
  const { from, to } = taskWorkWindow(task);
  const progress = clamp(
    (Math.min(intervalEnd, to) - from) / Math.max(1, to - from),
    0,
    1,
  );
  const step = progress - (task.effectProgress ?? 0);
  if (step <= 0) return;

  const previous = task.effectProgress ?? 0;
  task.effectProgress = progress;

  const { target, wear } = task.effect;
  if (target) {
    // Anteil der noch offenen Strecke, der in diesem Schritt zurückgelegt wird.
    // Beim letzten Schritt ist er 1, deshalb landet der Wert exakt auf dem Ziel.
    const share = Math.min(1, step / Math.max(1e-9, 1 - previous));
    if (target.key === 'condition') {
      BREAKABLE.forEach((kind) => {
        const current = property.equipmentCondition[kind];
        property.equipmentCondition[kind] = clamp(
          current + (target.value - current) * share,
        );
      });
      syncEquipmentCondition(property);
    } else {
      const current = property[target.key];
      const max = target.key === 'grass' ? 150 : 100;
      property[target.key] = clamp(
        current + (target.value - current) * share,
        0,
        max,
      );
    }
  }
  if (wear) {
    property.equipmentCondition[wear.kind] = clamp(
      property.equipmentCondition[wear.kind] + wear.amount * step,
    );
    syncEquipmentCondition(property);
  }
}

function completeTask(
  state: GameState,
  property: GardenProperty,
  task: PropertyTask,
  at: number,
) {
  // Eine abgebrochene Aufgabe wird nur noch aufgeräumt: kein Restlohn, kein
  // gezählter Schnitt, keine Reputation, keine Reparatur.
  if (task.cancelled) {
    property.tasks = property.tasks.filter((entry) => entry !== task);
    addLog(
      state,
      `${property.name}: ${TASK_LABELS[task.kind]} beendet.`,
      'neutral',
      at,
    );
    return;
  }

  if (task.kind === 'mow') {
    // Der Rasen ist bereits geschnitten; bewertet wird der Zustand von vorher.
    const grassBefore = task.startGrass ?? property.grass;
    const payout = task.payoutTotal ?? mowingPayout(property);
    const remainingPayout = Math.max(0, payout - (task.payoutAccrued ?? 0));

    state.money += remainingPayout;
    state.lifetimeRevenue += remainingPayout;
    state.sessionRevenue += remainingPayout;
    property.lifetimeRevenue += remainingPayout;
    property.completedJobs += 1;

    rollFailure(state, property, 'mow', at);

    // Die Zufriedenheit ergibt sich aus den Werten selbst; hier zaehlt nur noch
    // der Ruf: ein voller Schnitt bringt am meisten, ein verwilderter kostet.
    const share = Math.min(1, mowingPayoutShare(property, grassBefore) / 100);
    if (grassBefore > 100) {
      state.reputation = Math.max(0, state.reputation - 1.5);
    } else {
      state.reputation += 0.5 + 1.5 * share;
    }
    addLog(
      state,
      `${property.name}: Rasen gemäht, ${formatMoney(payout)} verdient.`,
      grassBefore > 100 ? 'warning' : 'good',
      at,
    );
  }

  if (task.kind === 'water') {
    const payout = task.payoutTotal ?? wateringPayout(property);
    const remainingPayout = Math.max(0, payout - (task.payoutAccrued ?? 0));

    state.money += remainingPayout;
    state.lifetimeRevenue += remainingPayout;
    state.sessionRevenue += remainingPayout;
    property.lifetimeRevenue += remainingPayout;
    rollFailure(state, property, 'water', at);
    addLog(
      state,
      `${property.name}: Bewässerung abgeschlossen, ${formatMoney(payout)} verdient.`,
      'neutral',
      at,
    );
  }

  if (task.kind === 'maintain') {
    const repaired = brokenCount(property);
    property.broken = { mow: false, water: false };
    property.equipmentCondition = { mow: 100, water: 100 };
    syncEquipmentCondition(property);
    addLog(
      state,
      repaired > 0
        ? `${property.name}: ${repaired === 1 ? 'Das Gerät ist' : 'Die Geräte sind'} repariert.`
        : `${property.name}: Geräte sind wieder einsatzbereit.`,
      'good',
      at,
    );
  }

  property.tasks = property.tasks.filter((entry) => entry !== task);
}

function accrueTaskRevenue(
  state: GameState,
  property: GardenProperty,
  task: PropertyTask,
  intervalStart: number,
  intervalEnd: number,
) {
  if (
    task.kind === 'maintain' ||
    task.cancelled ||
    property.automationIntervention?.kind === task.kind
  )
    return;

  const payoutTotal = task.payoutTotal ?? taskPayout(property, task.kind);
  const { from, to } = taskWorkWindow(task);
  const effectiveEnd = Math.min(intervalEnd, to);
  const elapsed = clamp((effectiveEnd - from) / Math.max(1, to - from), 0, 1);
  const targetAccrued = Math.floor(payoutTotal * elapsed);
  const alreadyAccrued = task.payoutAccrued ?? 0;
  const increment = Math.max(0, targetAccrued - alreadyAccrued);

  if (effectiveEnd > intervalStart && increment > 0) {
    state.money += increment;
    state.lifetimeRevenue += increment;
    state.sessionRevenue += increment;
    property.lifetimeRevenue += increment;
    task.payoutTotal = payoutTotal;
    task.payoutAccrued = targetAccrued;
  }
}

function startAutomatedTask(
  state: GameState,
  property: GardenProperty,
  kind: TaskKind,
  at: number,
) {
  if (property.tasks.some((task) => task.kind === kind)) return;
  const cost = kind === 'maintain' ? maintenanceCost(property) : 0;
  if (cost > state.money) return;
  state.money -= cost;
  property.tasks.push(createTask(property, kind, at, true, false, cost));
}

function tryAutomation(state: GameState, property: GardenProperty, at: number) {
  if (
    isAutomated(property, 'maintain') &&
    (equipmentCondition(property) <= 48 || isBroken(property))
  ) {
    startAutomatedTask(state, property, 'maintain', at);
  }
  if (
    isAutomated(property, 'water') &&
    !property.broken.water &&
    property.moisture <= Math.min(55, wateringTarget(property) - 15)
  ) {
    startAutomatedTask(state, property, 'water', at);
  }
  if (
    isAutomated(property, 'mow') &&
    !property.broken.mow &&
    property.grass >= Math.max(64, mowingTargetGrass(property) + 8)
  ) {
    startAutomatedTask(state, property, 'mow', at);
  }
}

function advanceNaturalState(
  state: GameState,
  property: GardenProperty,
  seconds: number,
) {
  const minutes = seconds / 60;
  const fertilizer = property.fertilizer ? 1.5 : 1;
  const fertilizerWater = property.fertilizer ? 1.3 : 1;
  const moistureGrowth = property.moisture < 50 ? 0.5 : 1;
  const heatWater = state.weather === 'heat' ? 1.75 : 1;
  const rainGain = state.weather === 'rain' ? 3 * minutes : 0;

  property.grass = clamp(
    property.grass +
      1.25 * minutes * property.growthFactor * fertilizer * moistureGrowth,
    0,
    150,
  );
  property.moisture = clamp(
    property.moisture -
      0.82 * minutes * property.drainage * fertilizerWater * heatWater +
      rainGain,
    0,
    100,
  );

  BREAKABLE.forEach((kind) => {
    if (!property.tasks.some((task) => task.kind === kind)) {
      property.equipmentCondition[kind] = clamp(
        property.equipmentCondition[kind] - 0.003 * minutes,
      );
    }
  });
  syncEquipmentCondition(property);

  // Die Zufriedenheit folgt dem Zustand der drei Werte, aber träge. Der
  // Anspruch des Kunden wirkt dabei einseitig: er sinkt schneller, als er sich
  // erholt.
  const target = satisfactionTarget(property);
  const rate =
    target < property.satisfaction
      ? SATISFACTION_RATE * property.customerDemand
      : SATISFACTION_RATE / property.customerDemand;
  const step = Math.min(1, rate * minutes);
  property.satisfaction = clamp(
    property.satisfaction + (target - property.satisfaction) * step,
  );
  // Erholt sich der Kunde wieder, ist die Frist vom Tisch — unabhaengig davon,
  // ob gerade eine Aufgabe fertig geworden ist.
  if (property.rescueUntil && property.satisfaction > 20)
    property.rescueUntil = undefined;
}

function createOffer(state: GameState, now: number): ContractOffer | undefined {
  const available = OFFER_TEMPLATES.filter(
    (template) => state.reputation >= template.minRep,
  );
  if (!available.length) return undefined;
  const existingNames = new Set([
    ...state.properties.map((property) => property.name),
    ...state.offers.map((offer) => offer.name),
  ]);
  const candidates = available.flatMap((template) =>
    template.names
      .filter((name) => !existingNames.has(name))
      .map((name) => ({ template, name })),
  );
  const fallbackTemplate =
    available[Math.floor(Math.random() * available.length)];
  const fallbackBase =
    fallbackTemplate.names[
      Math.floor(Math.random() * fallbackTemplate.names.length)
    ];
  let suffix = 2;
  let fallbackName: string = fallbackBase;
  while (existingNames.has(fallbackName)) {
    fallbackName = `${fallbackBase} ${suffix}`;
    suffix += 1;
  }
  const { template, name } = candidates.length
    ? candidates[Math.floor(Math.random() * candidates.length)]
    : { template: fallbackTemplate, name: fallbackName };
  const size = Math.round(
    template.sizes[0] + Math.random() * (template.sizes[1] - template.sizes[0]),
  );
  const payout = Math.round(40 * Math.pow(size / 120, 0.78) * template.demand);
  return {
    id: uid(),
    name,
    subtitle: `${template.type} in deiner Region`,
    type: template.type,
    size,
    payout,
    growthFactor: template.growth,
    drainage: template.drainage,
    customerDemand: template.demand,
    expiresAt: now + 15 * 60_000,
  };
}

/**
 * Jede neu erreichte Reputationsstufe erzeugt garantiert eine Anfrage. Ist
 * die Liste voll, weicht dafür das Angebot mit der kürzesten Restlaufzeit.
 */
function addLevelUpOffers(
  state: GameState,
  previousReputation: number,
  now: number,
) {
  const gainedLevels = Math.max(
    0,
    Math.floor(state.reputation) - Math.floor(previousReputation),
  );
  for (let index = 0; index < gainedLevels; index += 1) {
    if (state.offers.length >= 3) {
      const oldest = state.offers.reduce((candidate, offer) =>
        offer.expiresAt < candidate.expiresAt ? offer : candidate,
      );
      state.offers = state.offers.filter((offer) => offer.id !== oldest.id);
    }
    const offer = createOffer(state, now);
    if (offer) state.offers.push(offer);
  }
}

function triggerEvent(state: GameState, now: number) {
  const types: GameEvent['type'][] = ['rain', 'heat', 'mole', 'review'];
  const type = types[Math.floor(Math.random() * types.length)];
  const property =
    state.properties[Math.floor(Math.random() * state.properties.length)];
  const event: GameEvent = {
    id: uid(),
    type,
    title: '',
    description: '',
    expiresAt: now + 4 * 60_000,
  };

  if (type === 'rain') {
    state.weather = 'rain';
    state.weatherUntil = now + 3 * 60_000;
    event.title = 'Regenschauer';
    event.description = 'Alle Grundstücke werden natürlich bewässert.';
    state.properties.forEach((item) => {
      item.moisture = clamp(item.moisture + 18, 0, 100);
    });
  }
  if (type === 'heat') {
    state.weather = 'heat';
    state.weatherUntil = now + 4 * 60_000;
    event.title = 'Hitzewelle';
    event.description =
      'Der Boden trocknet vorübergehend deutlich schneller aus.';
  }
  if (type === 'mole') {
    event.title = 'Maulwurf entdeckt';
    event.description = `${property.name}: Frische Hügel stören das gepflegte Bild.`;
    event.propertyId = property.id;
    event.actionLabel = 'Schonend umsiedeln';
    property.satisfaction = clamp(property.satisfaction - 5);
  }
  if (type === 'review') {
    event.title = 'Herzliche Empfehlung';
    event.description = `${property.name} empfiehlt deinen Betrieb weiter. +2 Reputation`;
    event.propertyId = property.id;
    state.reputation += 2;
    property.satisfaction = clamp(property.satisfaction + 4);
  }

  state.activeEvent = event;
  addLog(
    state,
    `${event.title}: ${event.description}`,
    type === 'review' ? 'good' : 'warning',
    now,
  );
}

/**
 * Bringt einen gespeicherten Stand auf die aktuelle Fassung. Version 1 kannte
 * nur den Totalausfall über Zustand 0; daraus werden beide Geräte defekt.
 */
export function migrateState(raw: GameState): GameState | undefined {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.properties))
    return undefined;
  if (!SUPPORTED_VERSIONS.includes(raw.version)) return undefined;
  const state = clone(raw);
  state.workers = Math.min(
    MAX_WORKERS,
    Math.max(1, Math.floor(state.workers ?? 1)),
  );
  // Bestehende Betriebe werden nicht nachträglich in die Einführung geschickt.
  state.tutorialStep = raw.version < 5 ? null : (state.tutorialStep ?? null);
  // Version 7 hatte den einzigen Mähroboter auf Stufe 5. Er wird zum neuen
  // GreenBot Easy auf Stufe 7 verschoben, damit bestehende Automatik erhalten bleibt.
  if (raw.version < 8 && state.unlocked.mow >= 4) state.unlocked.mow += 2;
  // Die frühere dreistufige Bewässerung wird auf ihre direkten Nachfolger
  // abgebildet: Schlauch, manueller Bügelregner und automatische Anlage.
  if (raw.version < 14) {
    state.unlocked.water =
      state.unlocked.water === 0 ? 0 : state.unlocked.water === 1 ? 3 : 6;
  }
  state.properties.forEach((property) => {
    property.moisture = clamp(property.moisture, 0, 100);
    if (raw.version < 8 && property.equipment.mow >= 4)
      property.equipment.mow += 2;
    if (raw.version < 14) {
      property.equipment.water =
        property.equipment.water === 0
          ? 0
          : property.equipment.water === 1
            ? 3
            : 6;
    }
    if (raw.version < 15 && property.robotIntervention) {
      property.automationIntervention = {
        ...property.robotIntervention,
        kind: 'mow',
      };
      delete property.robotIntervention;
    }
    property.equipmentCondition ??= {
      mow: clamp(property.condition ?? 88),
      water: clamp(property.condition ?? 88),
    };
    syncEquipmentCondition(property);
    property.broken ??= {
      mow: property.condition <= 0,
      water: property.condition <= 0,
    };
    const legacyTask = property.task;
    property.tasks ??= legacyTask ? [legacyTask] : [];
    delete property.task;
    // Vor Version 3 sprangen die Werte erst am Ende; laufende Aufgaben
    // bekommen ihre Wirkung nachtraeglich und tragen sie ueber die Restzeit ab.
    property.tasks.forEach((task) => {
      if (raw.version < 15 && task.robotInterruptionAt !== undefined) {
        task.automationInterruptionAt = task.robotInterruptionAt;
        delete task.robotInterruptionAt;
      }
      task.startGrass ??= property.grass;
      task.startMoisture ??= property.moisture;
      task.effectProgress ??= 0;
      task.usesWorker ??= task.blocksPlayer ?? !task.automated;
      if (task.usesWorker) task.workerId ??= 0;
      // Vor Version 4 trug die Wirkung feste Mengen statt eines Ziels.
      if (
        raw.version < 8 ||
        (raw.version < 14 && task.kind === 'water') ||
        !task.effect?.target
      ) {
        task.effect = taskEffect(property, task.kind);
      }
    });
  });
  const legacyEventType = (state.activeEvent as { type?: string } | undefined)
    ?.type;
  if (legacyEventType === 'pipe' || legacyEventType === 'frost') {
    state.activeEvent = undefined;
  }
  if (raw.version < 6) state.researchTask = undefined;
  if (
    raw.version < 8 &&
    state.researchTask?.kind === 'mow' &&
    state.researchTask.targetLevel === 4
  ) {
    state.researchTask.targetLevel = 6;
    state.researchTask.name = EQUIPMENT.mow[6].name;
  }
  if (
    raw.version < 13 &&
    state.researchTask?.kind === 'mow' &&
    state.researchTask.targetLevel !== undefined
  ) {
    state.researchTask.name =
      EQUIPMENT.mow[state.researchTask.targetLevel]?.name ??
      state.researchTask.name;
  }
  if (
    raw.version < 14 &&
    state.researchTask?.kind === 'water' &&
    state.researchTask.targetLevel !== undefined
  ) {
    state.researchTask.targetLevel =
      state.researchTask.targetLevel === 0
        ? 0
        : state.researchTask.targetLevel === 1
          ? 3
          : 6;
    state.researchTask.name =
      EQUIPMENT.water[state.researchTask.targetLevel].name;
  }
  // Seit Version 11 kostet Lernen nur noch Zeit. Eine beim Speichern bereits
  // bezahlte laufende Weiterbildung wird deshalb vollständig erstattet.
  if (raw.version < 11 && state.researchTask?.cost) {
    state.money += state.researchTask.cost;
    state.researchTask.cost = 0;
  }
  if (state.researchTask) state.researchTask.workerId ??= 0;
  state.version = SAVE_VERSION;
  return state;
}

/**
 * Ende des nächsten Simulationsschritts. Der Schritt endet spätestens nach 30
 * Sekunden, bricht aber genau auf jeder Phasengrenze ab: nur so ist die
 * Wirkung einer Aufgabe exakt am Ende der Arbeit vollständig und rückt nicht
 * erst im Abschluss nach. Vorbereiten und Abschließen ändern den Zustand damit
 * nachweislich nicht.
 */
function nextStepEnd(state: GameState, cursor: number, now: number) {
  let stepEnd = Math.min(now, cursor + 30_000);
  if (
    state.researchTask?.endsAt &&
    state.researchTask.endsAt > cursor &&
    state.researchTask.endsAt < stepEnd
  ) {
    stepEnd = state.researchTask.endsAt;
  }
  state.properties.forEach((property) => {
    property.tasks.forEach((task) => {
      if (property.automationIntervention?.kind === task.kind) return;
      const { from, to } = taskWorkWindow(task);
      for (const boundary of [
        from,
        task.automationInterruptionAt,
        to,
        task.endsAt,
      ]) {
        if (boundary === undefined) continue;
        if (boundary > cursor && boundary < stepEnd) stepEnd = boundary;
      }
    });
    const interventionEnd = property.automationIntervention?.endsAt;
    if (
      interventionEnd &&
      interventionEnd > cursor &&
      interventionEnd < stepEnd
    ) {
      stepEnd = interventionEnd;
    }
  });
  return stepEnd;
}

const AUTOMATION_INTERVENTION_SECONDS = 8;

function triggerAutomationIntervention(
  state: GameState,
  property: GardenProperty,
  task: PropertyTask,
  at: number,
) {
  if (
    task.kind === 'maintain' ||
    property.automationIntervention ||
    task.automationInterruptionAt === undefined ||
    task.automationInterruptionAt > at
  )
    return;
  property.automationIntervention = {
    kind: task.kind,
    pausedAt: task.automationInterruptionAt,
  };
  task.automationInterruptionAt = undefined;
  const equipment = EQUIPMENT[task.kind][property.equipment[task.kind]].name;
  addLog(
    state,
    `${property.name}: ${equipment} wartet auf einen kurzen manuellen Eingriff.`,
    'warning',
    at,
  );
}

function completeAutomationIntervention(
  state: GameState,
  property: GardenProperty,
  at: number,
) {
  const intervention = property.automationIntervention;
  if (!intervention?.endsAt || intervention.endsAt > at) return;
  const task = property.tasks.find((entry) => entry.kind === intervention.kind);
  if (task) {
    const pauseDuration = intervention.endsAt - intervention.pausedAt;
    if (task.workEndsAt) task.workEndsAt += pauseDuration;
    task.endsAt += pauseDuration;
  }
  const equipment =
    EQUIPMENT[intervention.kind][property.equipment[intervention.kind]].name;
  property.automationIntervention = undefined;
  addLog(state, `${property.name}: ${equipment} arbeitet wieder.`, 'good', at);
}

function completeResearch(state: GameState, at: number) {
  const task = state.researchTask;
  if (!task) return;
  if (task.kind === 'fertilizer' || task.kind === 'weedControl') {
    state.chemistryUnlocked[task.kind] = true;
  } else if (task.targetLevel !== undefined) {
    state.unlocked[task.kind] = Math.max(
      state.unlocked[task.kind],
      task.targetLevel,
    );
  }
  addLog(state, `${task.name} wurde freigeschaltet.`, 'good', at);
  state.researchTask = undefined;
}

export function simulateGame(
  source: GameState,
  now = Date.now(),
  offline = false,
) {
  const state = clone(source);
  state.money = Math.round(state.money);
  const previousMoney = state.money;
  const previousReputation = state.reputation;
  const previousJobs = state.properties.reduce(
    (sum, property) => sum + property.completedJobs,
    0,
  );
  const elapsedMs = Math.max(0, now - state.lastUpdatedAt);
  let cursor = state.lastUpdatedAt;

  while (cursor < now) {
    const stepEnd = nextStepEnd(state, cursor, now);
    const seconds = (stepEnd - cursor) / 1_000;

    state.properties.forEach((property) => {
      const activeTasks = [...property.tasks];
      activeTasks.forEach((task) => {
        accrueTaskRevenue(state, property, task, cursor, stepEnd);
        accrueTaskEffect(property, task, stepEnd);
      });
      advanceNaturalState(state, property, seconds);
      completeAutomationIntervention(state, property, stepEnd);
      activeTasks.forEach((task) =>
        triggerAutomationIntervention(state, property, task, stepEnd),
      );
      activeTasks.forEach((task) => {
        if (
          task.endsAt <= stepEnd &&
          property.automationIntervention?.kind !== task.kind
        )
          completeTask(state, property, task, task.endsAt);
      });
      tryAutomation(state, property, stepEnd);

      if (
        !property.protected &&
        property.satisfaction <= 10 &&
        !property.rescueUntil
      ) {
        property.rescueUntil = offline
          ? now + 10 * 60_000
          : stepEnd + 10 * 60_000;
      }
    });
    if (state.researchTask && state.researchTask.endsAt <= stepEnd) {
      completeResearch(state, state.researchTask.endsAt);
    }
    // Der auslaufende Wetterabschnitt wirkt noch bis exakt zu seiner Grenze.
    if (state.weather !== 'mild' && stepEnd >= state.weatherUntil)
      state.weather = 'mild';

    if (!offline) {
      const lost = state.properties.filter(
        (property) =>
          !property.protected &&
          property.rescueUntil &&
          property.rescueUntil <= stepEnd,
      );
      lost.forEach((property) => {
        addLog(
          state,
          `${property.name} hat den Pflegevertrag beendet.`,
          'warning',
          stepEnd,
        );
      });
      state.properties = state.properties.filter(
        (property) =>
          property.protected ||
          !property.rescueUntil ||
          property.rescueUntil > stepEnd,
      );
    }
    cursor = stepEnd;
  }

  state.offers = state.offers.filter((offer) => offer.expiresAt > now);
  const tutorialActive = state.tutorialStep !== null;
  if (!tutorialActive && now >= state.nextOfferAt && state.offers.length < 3) {
    const offer = createOffer(state, now);
    if (offer) state.offers.push(offer);
    state.nextOfferAt = nextRandomOfferAt(now);
  }

  if (
    !tutorialActive &&
    now >= state.nextEventAt &&
    state.properties.length > 0
  ) {
    triggerEvent(state, now);
    state.nextEventAt = now + (5 + Math.random() * 4) * 60_000;
  }
  if (!tutorialActive) addLevelUpOffers(state, previousReputation, now);
  if (state.activeEvent && state.activeEvent.expiresAt <= now)
    state.activeEvent = undefined;

  state.lastUpdatedAt = now;
  const completed =
    state.properties.reduce(
      (sum, property) => sum + property.completedJobs,
      0,
    ) - previousJobs;
  const summary: OfflineSummary = {
    elapsedMs,
    earned: Math.max(0, state.money - previousMoney),
    completed,
    critical: state.properties.filter(
      (property) =>
        property.satisfaction <= 20 || equipmentCondition(property) <= 20,
    ).length,
  };
  return { state, summary };
}

export function taskUsesWorker(task: PropertyTask) {
  return task.usesWorker ?? task.blocksPlayer ?? !task.automated;
}

export interface WorkerAssignment {
  workerId: number;
  propertyId?: string;
  propertyName?: string;
  task?: PropertyTask;
  researchTask?: ResearchTask;
  automationIntervention?: AutomationIntervention;
}

export function workerAssignments(state: GameState): WorkerAssignment[] {
  const assignments = Array.from({ length: state.workers }, (_, workerId) => ({
    workerId,
  })) as WorkerAssignment[];
  state.properties.forEach((property) => {
    property.tasks.forEach((task) => {
      if (!taskUsesWorker(task) || task.workerId === undefined) return;
      assignments[task.workerId] = {
        workerId: task.workerId,
        propertyId: property.id,
        propertyName: property.name,
        task,
      };
    });
  });
  if (state.researchTask) {
    assignments[state.researchTask.workerId] = {
      workerId: state.researchTask.workerId,
      researchTask: state.researchTask,
    };
  }
  state.properties.forEach((property) => {
    const intervention = property.automationIntervention;
    if (intervention?.workerId === undefined || !intervention.endsAt) return;
    assignments[intervention.workerId] = {
      workerId: intervention.workerId,
      propertyId: property.id,
      propertyName: property.name,
      automationIntervention: intervention,
    };
  });
  return assignments;
}

export function availableWorkerId(state: GameState) {
  return workerAssignments(state).find(
    (assignment) =>
      !assignment.task &&
      !assignment.researchTask &&
      !assignment.automationIntervention,
  )?.workerId;
}

export function startAutomationIntervention(
  source: GameState,
  propertyId: string,
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property?.automationIntervention)
    return { state, message: 'Die Automatik braucht gerade keine Hilfe.' };
  if (property.automationIntervention.endsAt)
    return { state, message: 'Ein Mitarbeiter kümmert sich bereits darum.' };
  const workerId = availableWorkerId(state);
  if (workerId === undefined)
    return {
      state,
      message: 'Dafür wird kurz ein freier Mitarbeiter benötigt.',
    };
  const now = Date.now();
  const intervention = property.automationIntervention;
  intervention.startedAt = now;
  intervention.endsAt = now + AUTOMATION_INTERVENTION_SECONDS * 1_000;
  intervention.workerId = workerId;
  const equipment =
    EQUIPMENT[intervention.kind][property.equipment[intervention.kind]].name;
  addLog(
    state,
    `${property.name}: Mitarbeiter ${workerId + 1} kümmert sich kurz um ${equipment}.`,
    'neutral',
    now,
  );
  return { state, message: 'Kurzer Eingriff gestartet.' };
}

export function startTask(
  source: GameState,
  propertyId: string,
  kind: TaskKind,
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  if (property.tasks.some((task) => task.kind === kind))
    return {
      state,
      message: 'Diese Aufgabe läuft auf dem Grundstück bereits.',
    };
  if (isBroken(property, kind)) {
    const name = EQUIPMENT[kind][property.equipment[kind]].name;
    return { state, message: `${name} ist ausgefallen — erst reparieren.` };
  }

  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  const automated = Boolean(equipment.automated);
  const usesWorker = !automated;
  const workerId = usesWorker ? availableWorkerId(state) : undefined;
  if (usesWorker && workerId === undefined) {
    return {
      state,
      message: 'Alle Mitarbeiter sind bereits beschäftigt.',
    };
  }
  if (kind === 'mow' && property.grass <= mowingTargetGrass(property)) {
    return {
      state,
      message: isAutomated(property, 'mow')
        ? 'Der Roboter hat seinen maximalen Pflegegrad bereits erreicht.'
        : 'Der Rasen ist bereits kurz genug.',
    };
  }
  if (kind === 'water' && property.moisture >= wateringTarget(property)) {
    return {
      state,
      message: isAutomated(property, 'water')
        ? 'Die Anlage hat ihren maximalen Bewässerungsgrad bereits erreicht.'
        : 'Der Boden ist bereits optimal gewässert.',
    };
  }
  if (
    kind === 'maintain' &&
    BREAKABLE.every((entry) => equipmentCondition(property, entry) >= 98) &&
    !isBroken(property)
  ) {
    return { state, message: 'Die Geräte sind bereits in bestem Zustand.' };
  }

  const cost = kind === 'maintain' ? maintenanceCost(property) : 0;
  if (state.money < cost)
    return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= cost;
  property.tasks.push(
    createTask(
      property,
      kind,
      Date.now(),
      automated,
      usesWorker,
      cost,
      workerId,
    ),
  );
  addLog(state, `${property.name}: ${TASK_LABELS[kind]} gestartet.`, 'neutral');
  return { state };
}

/**
 * Bricht die laufende Aufgabe ab. Die bis dahin geleistete Arbeit und der
 * anteilige Lohn bleiben; erstattet wird nur der noch nicht gearbeitete Teil
 * der Vorkasse. Die Boni am Ende — Zufriedenheit und Reputation — verfallen.
 */
export function cancelTask(
  source: GameState,
  propertyId: string,
  kind: TaskKind,
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  const task = property?.tasks.find((entry) => entry.kind === kind);
  if (!property || !task)
    return { state, message: 'Hier läuft gerade keine Aufgabe.' };
  const now = Date.now();
  if (taskPhase(task, now) === 'wrapup') {
    return { state, message: 'Der Abschluss lässt sich nicht mehr abbrechen.' };
  }

  const { from, to } = taskWorkWindow(task);
  const worked = clamp(
    (Math.min(now, to) - from) / Math.max(1, to - from),
    0,
    1,
  );
  const refund = Math.round(task.cost * (1 - worked));
  state.money += refund;

  // Aufgeräumt wird trotzdem: die Aufgabe springt in den Abschluss und friert
  // Wirkung und Lohn auf dem erreichten Stand ein.
  task.cancelled = true;
  task.workEndsAt = Math.min(now, to);
  task.workStartsAt = Math.min(from, task.workEndsAt);
  task.endsAt = now + taskWrapUpDuration(property, task.kind) * 1_000;
  if (property.automationIntervention?.kind === task.kind)
    property.automationIntervention = undefined;

  addLog(
    state,
    `${property.name}: ${TASK_LABELS[task.kind]} abgebrochen.`,
    'warning',
  );
  return {
    state,
    message:
      refund > 0
        ? `Abgebrochen · ${formatMoney(refund)} zurück.`
        : 'Abgebrochen.',
  };
}

export function acceptOffer(source: GameState, offerId: string): GameResult {
  const state = clone(source);
  const offer = state.offers.find((item) => item.id === offerId);
  if (!offer)
    return { state, message: 'Dieses Angebot ist nicht mehr verfügbar.' };
  const starter = offer.id === 'starter-bergmann';
  state.properties.push({
    id: starter ? 'bergmann' : offer.id,
    name: offer.name,
    subtitle: starter ? 'Dein erster Stammkunde' : offer.subtitle,
    type: offer.type,
    size: offer.size,
    payout: offer.payout,
    growthFactor: offer.growthFactor,
    drainage: offer.drainage,
    customerDemand: offer.customerDemand,
    grass: starter ? 63 : 48 + Math.random() * 30,
    moisture: starter ? 88 : 42 + Math.random() * 30,
    condition: starter ? 94 : 88,
    equipmentCondition: {
      mow: starter ? 94 : 88,
      water: starter ? 94 : 88,
    },
    satisfaction: 78,
    equipment: { mow: 0, water: 0, maintain: 0 },
    broken: { mow: false, water: false },
    tasks: [],
    fertilizer: false,
    weedControl: false,
    lifetimeRevenue: 0,
    completedJobs: 0,
    protected: starter,
  });
  const added = state.properties[state.properties.length - 1];
  added.satisfaction = satisfactionTarget(added);
  state.offers = state.offers.filter((item) => item.id !== offerId);
  addLog(state, `${offer.name} ist jetzt ein neuer Stammkunde.`, 'good');
  return { state, message: `Vertrag mit ${offer.name} angenommen.` };
}

export function declineOffer(source: GameState, offerId: string): GameResult {
  const state = clone(source);
  if (offerId === 'starter-bergmann') {
    return { state, message: 'Dieser erste Auftrag wartet auf deine Zusage.' };
  }
  state.offers = state.offers.filter((offer) => offer.id !== offerId);
  state.nextOfferAt = Math.min(
    state.nextOfferAt,
    nextRandomOfferAt(Date.now()),
  );
  return { state, message: 'Angebot abgelehnt. Bald erscheint ein neues.' };
}

export function hireWorker(source: GameState): GameResult {
  const state = clone(source);
  const upgrade = WORKER_UPGRADES.find(
    (entry) => entry.workers === state.workers + 1,
  );
  if (!upgrade)
    return { state, message: 'Dein Team ist bereits vollständig ausgebaut.' };
  if (state.reputation < upgrade.reputation) {
    return {
      state,
      message: `Dafür brauchst du Reputation ${upgrade.reputation}.`,
    };
  }
  if (state.money < upgrade.cost)
    return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= upgrade.cost;
  state.workers = upgrade.workers;
  addLog(state, `${state.workers}. Mitarbeiter eingestellt.`, 'good');
  return {
    state,
    message: `Dein Betrieb hat jetzt ${state.workers} Mitarbeiter.`,
  };
}

export function unlockEquipment(source: GameState, kind: TaskKind): GameResult {
  const state = clone(source);
  const nextLevel = state.unlocked[kind] + 1;
  const item = EQUIPMENT[kind][nextLevel];
  if (!item)
    return { state, message: 'In diesem Bereich ist bereits alles erforscht.' };
  if (state.reputation < item.reputation) {
    return {
      state,
      message: `Dafür brauchst du Reputation ${item.reputation}.`,
    };
  }
  if (state.researchTask)
    return { state, message: 'Es läuft bereits eine Weiterbildung.' };
  const workerId = availableWorkerId(state);
  if (workerId === undefined) {
    return {
      state,
      message: 'Alle Mitarbeiter sind bereits beschäftigt.',
    };
  }
  const now = Date.now();
  const duration = researchDurationMs(item.reputation);
  state.researchTask = {
    kind,
    name: item.name,
    targetLevel: nextLevel,
    startedAt: now,
    endsAt: now + duration,
    cost: 0,
    workerId,
  };
  addLog(state, `${item.name}: Lernen begonnen.`, 'neutral', now);
  return { state };
}

export function installEquipment(
  source: GameState,
  propertyId: string,
  kind: TaskKind,
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  const targetLevel = state.unlocked[kind];
  if (targetLevel <= property.equipment[kind]) {
    return {
      state,
      message: 'Diese Technik muss zuerst global freigeschaltet werden.',
    };
  }
  const item = EQUIPMENT[kind][targetLevel];
  if (!item)
    return {
      state,
      message: 'Hier ist bereits die beste Technik installiert.',
    };
  if (state.money < item.installCost)
    return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= item.installCost;
  property.equipment[kind] = targetLevel;
  if (kind !== 'maintain') {
    property.equipmentCondition[kind] = 100;
    property.broken[kind] = false;
    syncEquipmentCondition(property);
  }
  addLog(state, `${property.name}: ${item.name} wurde installiert.`, 'good');
  return {
    state,
    message: `${item.name} ist jetzt auf ${property.name} einsatzbereit.`,
  };
}

export function unlockChemistry(
  source: GameState,
  kind: 'fertilizer' | 'weedControl',
): GameResult {
  const state = clone(source);
  const config =
    kind === 'fertilizer'
      ? { name: 'Dünger', reputation: 8 }
      : { name: 'Unkrautpflege', reputation: 15 };
  if (state.chemistryUnlocked[kind])
    return { state, message: `${config.name} ist bereits freigeschaltet.` };
  if (kind === 'weedControl' && !state.chemistryUnlocked.fertilizer) {
    return {
      state,
      message: 'Schalte zuerst Dünger frei.',
    };
  }
  if (state.reputation < config.reputation) {
    return {
      state,
      message: `Dafür brauchst du Reputation ${config.reputation}.`,
    };
  }
  if (state.researchTask)
    return { state, message: 'Es läuft bereits eine Weiterbildung.' };
  const workerId = availableWorkerId(state);
  if (workerId === undefined) {
    return {
      state,
      message: 'Alle Mitarbeiter sind bereits beschäftigt.',
    };
  }
  const now = Date.now();
  const duration = researchDurationMs(config.reputation);
  state.researchTask = {
    kind,
    name: config.name,
    startedAt: now,
    endsAt: now + duration,
    cost: 0,
    workerId,
  };
  addLog(state, `${config.name}: Lernen begonnen.`, 'neutral', now);
  return { state };
}

export function installChemistry(
  source: GameState,
  propertyId: string,
  kind: 'fertilizer' | 'weedControl',
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  if (!state.chemistryUnlocked[kind])
    return {
      state,
      message: 'Diese Behandlung ist noch nicht freigeschaltet.',
    };
  if (property[kind])
    return { state, message: 'Auf diesem Grundstück bereits aktiv.' };
  const cost = kind === 'fertilizer' ? 110 : 180;
  if (state.money < cost)
    return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= cost;
  property[kind] = true;
  return {
    state,
    message: `${kind === 'fertilizer' ? 'Dünger' : 'Unkrautpflege'} ist jetzt aktiv.`,
  };
}

export function resolveEvent(source: GameState): GameResult {
  const state = clone(source);
  const event = state.activeEvent;
  if (!event) return { state };
  const previousReputation = state.reputation;
  if (event.type === 'mole' && event.propertyId) {
    const property = state.properties.find(
      (item) => item.id === event.propertyId,
    );
    if (property) property.satisfaction = clamp(property.satisfaction + 6);
    state.reputation += 0.5;
  }
  addLevelUpOffers(state, previousReputation, Date.now());
  state.activeEvent = undefined;
  // Das Ereignis verschwindet sichtbar — eine zusaetzliche Meldung waere Laerm.
  return { state };
}

export function propertyStatus(property: GardenProperty) {
  if (property.rescueUntil || property.satisfaction <= 25) {
    return { label: 'Kritisch', tone: 'danger' as const };
  }
  if (
    property.automationIntervention &&
    !property.automationIntervention.endsAt
  )
    return { label: 'Blockiert', tone: 'danger' as const };
  if (property.tasks.length > 0 || property.automationIntervention)
    return { label: 'In Arbeit', tone: 'info' as const };
  if (isBroken(property))
    return { label: 'Blockiert', tone: 'danger' as const };
  if (
    equipmentCondition(property) < 50 ||
    property.moisture < 50 ||
    property.grass >= 60
  ) {
    return { label: 'Fällig', tone: 'warning' as const };
  }
  return { label: 'Gepflegt', tone: 'good' as const };
}

export function propertyMetricPercent(
  property: GardenProperty,
  kind: TaskKind,
) {
  if (kind === 'mow') {
    return Math.min(100, Math.max(0, ((150 - property.grass) / 130) * 100));
  }
  return kind === 'water' ? property.moisture : equipmentCondition(property);
}

export function grassHint(value: number) {
  if (value >= 85) return 'Frisch gemäht';
  if (value >= 70) return 'Noch kurz';
  if (value >= 45) return 'Mähbereit';
  if (value >= 10) return 'Zu lang';
  return 'Verwildert';
}

export function moistureHint(value: number) {
  if (value < 25) return 'Vertrocknet';
  if (value < 60) return 'Trocken';
  return 'Optimal gewässert';
}

/** Die Schwellen folgen `failureRisk`: ab 70 ist ein Ausfall ausgeschlossen. */
export function conditionHint(value: number) {
  if (value < 20) return 'Akute Ausfallgefahr';
  if (value < 45) return 'Hohes Ausfallrisiko';
  if (value < 70) return 'Wartung fällig';
  return 'Einsatzbereit';
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Lernzeiten bleiben kurz genug für eine Spielsitzung, steigen aber mit der Wissensstufe. */
export function researchDurationMs(reputation: number) {
  return (20 + reputation * 2) * 1_000;
}

export function humanOfflineDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std. ${minutes % 60} Min.`;
  return `${Math.floor(hours / 24)} Tage ${hours % 24} Std.`;
}
