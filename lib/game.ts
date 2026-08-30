export type TaskKind = 'mow' | 'water' | 'maintain';
export type ViewName = 'overview' | 'offers' | 'upgrades';

export interface EquipmentLevel {
  name: string;
  unlockCost: number;
  installCost: number;
  reputation: number;
  speed: number;
  automated?: boolean;
  handsFree?: boolean;
  description: string;
}

export interface PropertyTask {
  kind: TaskKind;
  startedAt: number;
  endsAt: number;
  automated: boolean;
  blocksPlayer: boolean;
  cost: number;
  payoutTotal?: number;
  payoutAccrued?: number;
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
  satisfaction: number;
  equipment: Record<TaskKind, number>;
  fertilizer: boolean;
  weedControl: boolean;
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
  type: 'rain' | 'heat' | 'frost' | 'mole' | 'pipe' | 'review';
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

export interface GameState {
  version: 1;
  money: number;
  reputation: number;
  lifetimeRevenue: number;
  sessionRevenue: number;
  properties: GardenProperty[];
  offers: ContractOffer[];
  unlocked: Record<TaskKind, number>;
  chemistryUnlocked: {
    fertilizer: boolean;
    weedControl: boolean;
  };
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
      name: 'Schiebemäher',
      unlockCost: 0,
      installCost: 0,
      reputation: 0,
      speed: 1,
      description: 'Solider Einstieg, vollständig manuell.',
    },
    {
      name: 'Benzinmäher',
      unlockCost: 120,
      installCost: 180,
      reputation: 3,
      speed: 0.82,
      description: 'Mehr Leistung bei langem Gras.',
    },
    {
      name: 'Mäher mit Antrieb',
      unlockCost: 480,
      installCost: 720,
      reputation: 8,
      speed: 0.62,
      description: 'Spart spürbar Zeit auf mittleren Flächen.',
    },
    {
      name: 'Aufsitzmäher',
      unlockCost: 1_600,
      installCost: 2_400,
      reputation: 18,
      speed: 0.4,
      description: 'Große Flächen werden schnell beherrschbar.',
    },
    {
      name: 'Mähroboter',
      unlockCost: 5_000,
      installCost: 7_500,
      reputation: 32,
      speed: 0.28,
      automated: true,
      description: 'Mäht selbstständig im optimalen Fenster.',
    },
  ],
  water: [
    {
      name: 'Gartenschlauch',
      unlockCost: 0,
      installCost: 0,
      reputation: 0,
      speed: 1,
      description: 'Günstig, bindet dich aber während des Wässerns.',
    },
    {
      name: 'Bügelregner',
      unlockCost: 260,
      installCost: 390,
      reputation: 5,
      speed: 0.62,
      handsFree: true,
      description: 'Schneller und nach dem Start weitgehend selbstständig.',
    },
    {
      name: 'Versenksprenger',
      unlockCost: 2_200,
      installCost: 3_300,
      reputation: 22,
      speed: 0.3,
      automated: true,
      description: 'Bewässert automatisch, sobald der Boden trocken wird.',
    },
  ],
  maintain: [
    {
      name: 'Werkzeugtasche',
      unlockCost: 0,
      installCost: 0,
      reputation: 0,
      speed: 1,
      description: 'Alles Nötige für einfache Reparaturen.',
    },
    {
      name: 'Profiwerkzeug',
      unlockCost: 320,
      installCost: 480,
      reputation: 6,
      speed: 0.72,
      description: 'Präzisere Wartung mit weniger Zeitaufwand.',
    },
    {
      name: 'Akkuwerkzeug',
      unlockCost: 900,
      installCost: 1_350,
      reputation: 14,
      speed: 0.5,
      description: 'Reparaturen gehen deutlich schneller von der Hand.',
    },
    {
      name: 'Serviceteam',
      unlockCost: 4_200,
      installCost: 6_300,
      reputation: 28,
      speed: 0.25,
      automated: true,
      description: 'Kümmert sich automatisch um gefährdete Geräte.',
    },
  ],
};

export const TASK_LABELS: Record<TaskKind, string> = {
  mow: 'Mähen',
  water: 'Bewässern',
  maintain: 'Wartung',
};

const OFFER_TEMPLATES = [
  {
    minRep: 2,
    type: 'Reihenhausgarten',
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

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const clone = <T,>(value: T): T => structuredClone(value);

const addLog = (
  state: GameState,
  text: string,
  tone: GameLog['tone'] = 'neutral',
  at = Date.now(),
) => {
  state.logs.unshift({ id: uid(), at, text, tone });
  state.logs = state.logs.slice(0, 12);
};

export function createInitialState(now = Date.now()): GameState {
  return {
    version: 1,
    money: 240,
    reputation: 0,
    lifetimeRevenue: 0,
    sessionRevenue: 0,
    properties: [
      {
        id: 'bergmann',
        name: 'Familie Bergmann',
        subtitle: 'Dein erster Stammkunde',
        type: 'Vorgarten',
        size: 120,
        payout: 40,
        growthFactor: 1,
        drainage: 1,
        customerDemand: 0.9,
        grass: 63,
        moisture: 58,
        condition: 94,
        satisfaction: 86,
        equipment: { mow: 0, water: 0, maintain: 0 },
        fertilizer: false,
        weedControl: false,
        lifetimeRevenue: 0,
        completedJobs: 0,
        protected: true,
      },
    ],
    offers: [],
    unlocked: { mow: 0, water: 0, maintain: 0 },
    chemistryUnlocked: { fertilizer: false, weedControl: false },
    weather: 'mild',
    weatherUntil: 0,
    nextEventAt: now + 4 * 60_000,
    nextOfferAt: now + 90_000,
    lastUpdatedAt: now,
    logs: [
      {
        id: uid(),
        at: now,
        text: 'Familie Bergmann hat dich mit der Rasenpflege beauftragt.',
        tone: 'good',
      },
    ],
  };
}

export function taskDuration(property: GardenProperty, kind: TaskKind) {
  const base = kind === 'mow' ? 30 : kind === 'water' ? 45 : 60;
  const sizeFactor = Math.pow(property.size / 120, 0.56);
  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  let conditionFactor = 1 + Math.max(0, 55 - property.condition) / 100;
  if (kind === 'mow' && property.grass > 100) conditionFactor *= 2;
  else if (kind === 'mow' && property.grass > 80) conditionFactor *= 1.5;
  if (kind === 'mow' && property.moisture > 85) conditionFactor *= 1.4;
  return Math.max(8, Math.round(base * sizeFactor * equipment.speed * conditionFactor));
}

export function maintenanceCost(property: GardenProperty) {
  return Math.max(8, Math.round((100 - property.condition) * 0.7 * Math.pow(property.size / 120, 0.25)));
}

export function mowingPayout(property: GardenProperty) {
  const qualityBase = property.weedControl ? 1.08 : 1;
  if (property.grass < 60) return property.payout * (property.grass / 60) * qualityBase;
  if (property.grass <= 80) return property.payout * 1.2 * qualityBase;
  return property.payout * qualityBase;
}

export function isAutomated(property: GardenProperty, kind: TaskKind) {
  return Boolean(EQUIPMENT[kind][property.equipment[kind]].automated);
}

function completeTask(state: GameState, property: GardenProperty, at: number) {
  const task = property.task;
  if (!task) return;

  if (task.kind === 'mow') {
    const grassBefore = property.grass;
    const payout = task.payoutTotal ?? mowingPayout(property);
    const remainingPayout = Math.max(0, payout - (task.payoutAccrued ?? 0));
    const wetFactor = property.moisture > 85 ? 2 : 1;
    const longFactor = grassBefore > 100 ? 2.2 : grassBefore > 80 ? 1.45 : 1;
    const wear = 3.2 * Math.pow(property.size / 120, 0.3) * wetFactor * longFactor;

    state.money += remainingPayout;
    state.lifetimeRevenue += remainingPayout;
    state.sessionRevenue += remainingPayout;
    property.lifetimeRevenue += remainingPayout;
    property.completedJobs += 1;
    property.grass = Math.max(12, grassBefore - 66);
    property.condition = clamp(property.condition - wear);

    const failureRisk = property.condition < 20 ? 0.15 : property.condition < 40 ? 0.04 : 0;
    if (failureRisk > 0 && Math.random() < failureRisk) {
      property.condition = 0;
      addLog(state, `${property.name}: Der Mäher ist ausgefallen und muss repariert werden.`, 'warning', at);
    }

    if (grassBefore >= 60 && grassBefore <= 80) {
      property.satisfaction = clamp(property.satisfaction + 5);
      state.reputation += 2;
    } else if (grassBefore < 60) {
      property.satisfaction = clamp(property.satisfaction - 1.5);
      state.reputation += 0.4;
    } else if (grassBefore <= 100) {
      property.satisfaction = clamp(property.satisfaction - (grassBefore - 80) * 0.3);
      state.reputation += 0.6;
    } else {
      property.satisfaction = clamp(property.satisfaction - 12);
      state.reputation = Math.max(0, state.reputation - 1.5);
    }
    addLog(
      state,
      `${property.name}: Rasen gemäht, ${formatMoney(payout)} verdient.`,
      grassBefore >= 60 && grassBefore <= 80 ? 'good' : 'neutral',
      at,
    );
  }

  if (task.kind === 'water') {
    const before = property.moisture;
    property.moisture = clamp(property.moisture + 48, 0, 150);
    property.condition = clamp(property.condition - 0.8);
    if (before < 30) property.satisfaction = clamp(property.satisfaction + 2);
    if (property.moisture > 100) property.satisfaction = clamp(property.satisfaction - 5);
    addLog(state, `${property.name}: Bewässerung abgeschlossen.`, 'neutral', at);
  }

  if (task.kind === 'maintain') {
    const level = property.equipment.maintain;
    property.condition = clamp(property.condition + 58 + level * 12);
    addLog(state, `${property.name}: Geräte sind wieder einsatzbereit.`, 'good', at);
  }

  property.task = undefined;
  if (property.satisfaction > 20) property.rescueUntil = undefined;
}

function accrueMowingRevenue(
  state: GameState,
  property: GardenProperty,
  intervalStart: number,
  intervalEnd: number,
) {
  const task = property.task;
  if (!task || task.kind !== 'mow') return;

  const payoutTotal = task.payoutTotal ?? mowingPayout(property);
  const duration = Math.max(1, task.endsAt - task.startedAt);
  const effectiveEnd = Math.min(intervalEnd, task.endsAt);
  const elapsed = clamp((effectiveEnd - task.startedAt) / duration, 0, 1);
  const targetAccrued = payoutTotal * elapsed;
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

function startAutomatedTask(state: GameState, property: GardenProperty, kind: TaskKind, at: number) {
  if (property.task) return;
  const cost = kind === 'maintain' ? maintenanceCost(property) : 0;
  if (cost > state.money) return;
  state.money -= cost;
  property.task = {
    kind,
    startedAt: at,
    endsAt: at + taskDuration(property, kind) * 1_000,
    automated: true,
    blocksPlayer: false,
    cost,
    payoutTotal: kind === 'mow' ? mowingPayout(property) : undefined,
    payoutAccrued: 0,
  };
}

function tryAutomation(state: GameState, property: GardenProperty, at: number) {
  if (property.task) return;
  if (isAutomated(property, 'maintain') && property.condition <= 38) {
    startAutomatedTask(state, property, 'maintain', at);
    return;
  }
  if (property.condition <= 0) return;
  if (isAutomated(property, 'water') && property.moisture <= 36) {
    startAutomatedTask(state, property, 'water', at);
    return;
  }
  if (isAutomated(property, 'mow') && property.grass >= 64) {
    startAutomatedTask(state, property, 'mow', at);
  }
}

function advanceNaturalState(state: GameState, property: GardenProperty, seconds: number) {
  const minutes = seconds / 60;
  const fertilizer = property.fertilizer ? 1.5 : 1;
  const fertilizerWater = property.fertilizer ? 1.3 : 1;
  const moistureGrowth = property.moisture < 30 ? 0.5 : property.moisture > 110 ? 0.72 : 1;
  const heatWater = state.weather === 'heat' ? 1.75 : 1;
  const rainGain = state.weather === 'rain' ? 1.35 * minutes : 0;

  property.grass = clamp(
    property.grass + 1.25 * minutes * property.growthFactor * fertilizer * moistureGrowth,
    0,
    150,
  );
  property.moisture = clamp(
    property.moisture - 0.82 * minutes * property.drainage * fertilizerWater * heatWater + rainGain,
    0,
    150,
  );

  if (!property.task) property.condition = clamp(property.condition - 0.006 * minutes);

  let satisfactionDelta = 0;
  if (property.grass > 80) satisfactionDelta -= (property.grass - 80) * 0.0018 * minutes;
  if (property.grass > 100) satisfactionDelta -= 0.07 * minutes;
  if (property.moisture < 30) satisfactionDelta -= (30 - property.moisture) * 0.0016 * minutes;
  if (property.moisture > 85) satisfactionDelta -= (property.moisture - 85) * 0.0014 * minutes;
  if (property.moisture >= 30 && property.moisture <= 85 && property.grass <= 80) {
    satisfactionDelta += 0.018 * minutes;
  }
  property.satisfaction = clamp(
    property.satisfaction + satisfactionDelta * property.customerDemand,
  );
}

function createOffer(state: GameState, now: number): ContractOffer | undefined {
  const available = OFFER_TEMPLATES.filter((template) => state.reputation >= template.minRep);
  if (!available.length) return undefined;
  const template = available[Math.floor(Math.random() * available.length)];
  const size = Math.round(
    template.sizes[0] + Math.random() * (template.sizes[1] - template.sizes[0]),
  );
  const name = template.names[Math.floor(Math.random() * template.names.length)];
  const existingNames = new Set([
    ...state.properties.map((property) => property.name),
    ...state.offers.map((offer) => offer.name),
  ]);
  if (existingNames.has(name)) return undefined;
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

function triggerEvent(state: GameState, now: number) {
  const types: GameEvent['type'][] = ['rain', 'heat', 'frost', 'mole', 'pipe', 'review'];
  const type = types[Math.floor(Math.random() * types.length)];
  const property = state.properties[Math.floor(Math.random() * state.properties.length)];
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
    event.description = 'Die Region wird drei Minuten lang natürlich bewässert.';
  }
  if (type === 'heat') {
    state.weather = 'heat';
    state.weatherUntil = now + 4 * 60_000;
    event.title = 'Hitzewelle';
    event.description = 'Der Boden trocknet vorübergehend deutlich schneller aus.';
  }
  if (type === 'frost') {
    event.title = 'Unerwarteter Frost';
    event.description = 'Empfindliche Bewässerungstechnik hat gelitten.';
    state.properties.forEach((item) => {
      if (item.equipment.water >= 2) item.condition = clamp(item.condition - 10);
    });
  }
  if (type === 'mole') {
    event.title = 'Maulwurf entdeckt';
    event.description = `${property.name}: Frische Hügel stören das gepflegte Bild.`;
    event.propertyId = property.id;
    event.actionLabel = 'Schonend umsiedeln';
    property.satisfaction = clamp(property.satisfaction - 5);
  }
  if (type === 'pipe') {
    event.title = 'Geplatztes Wasserrohr';
    event.description = `${property.name}: Der Boden wird rapide nass.`;
    event.propertyId = property.id;
    property.moisture = clamp(property.moisture + 58, 0, 150);
  }
  if (type === 'review') {
    event.title = 'Herzliche Empfehlung';
    event.description = `${property.name} empfiehlt deinen Betrieb weiter. +2 Reputation`;
    event.propertyId = property.id;
    state.reputation += 2;
    property.satisfaction = clamp(property.satisfaction + 4);
  }

  state.activeEvent = event;
  addLog(state, `${event.title}: ${event.description}`, type === 'review' ? 'good' : 'warning', now);
}

export function simulateGame(source: GameState, now = Date.now(), offline = false) {
  const state = clone(source);
  const previousMoney = state.money;
  const previousJobs = state.properties.reduce((sum, property) => sum + property.completedJobs, 0);
  const elapsedMs = Math.max(0, now - state.lastUpdatedAt);
  let cursor = state.lastUpdatedAt;

  while (cursor < now) {
    const stepEnd = Math.min(now, cursor + 30_000);
    const seconds = (stepEnd - cursor) / 1_000;

    if (state.weather !== 'mild' && stepEnd >= state.weatherUntil) state.weather = 'mild';

    state.properties.forEach((property) => {
      accrueMowingRevenue(state, property, cursor, stepEnd);
      advanceNaturalState(state, property, seconds);
      if (property.task && property.task.endsAt <= stepEnd) completeTask(state, property, property.task.endsAt);
      tryAutomation(state, property, stepEnd);

      if (!property.protected && property.satisfaction <= 10 && !property.rescueUntil) {
        property.rescueUntil = offline ? now + 10 * 60_000 : stepEnd + 10 * 60_000;
      }
    });

    if (!offline) {
      const lost = state.properties.filter(
        (property) => !property.protected && property.rescueUntil && property.rescueUntil <= stepEnd,
      );
      lost.forEach((property) => {
        addLog(state, `${property.name} hat den Pflegevertrag beendet.`, 'warning', stepEnd);
      });
      state.properties = state.properties.filter(
        (property) => property.protected || !property.rescueUntil || property.rescueUntil > stepEnd,
      );
    }
    cursor = stepEnd;
  }

  state.offers = state.offers.filter((offer) => offer.expiresAt > now);
  if (now >= state.nextOfferAt && state.offers.length < 3) {
    const offer = createOffer(state, now);
    if (offer) state.offers.push(offer);
    state.nextOfferAt = now + 2 * 60_000;
  }

  if (now >= state.nextEventAt) {
    triggerEvent(state, now);
    state.nextEventAt = now + (5 + Math.random() * 4) * 60_000;
  }
  if (state.activeEvent && state.activeEvent.expiresAt <= now) state.activeEvent = undefined;

  state.lastUpdatedAt = now;
  const completed =
    state.properties.reduce((sum, property) => sum + property.completedJobs, 0) - previousJobs;
  const summary: OfflineSummary = {
    elapsedMs,
    earned: Math.max(0, state.money - previousMoney),
    completed,
    critical: state.properties.filter(
      (property) => property.satisfaction <= 20 || property.condition <= 20,
    ).length,
  };
  return { state, summary };
}

export function startTask(source: GameState, propertyId: string, kind: TaskKind): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  if (property.task) return { state, message: 'Auf diesem Grundstück läuft bereits eine Aufgabe.' };
  if (property.condition <= 0 && kind !== 'maintain') {
    return { state, message: 'Die Geräte müssen zuerst repariert werden.' };
  }

  const equipment = EQUIPMENT[kind][property.equipment[kind]];
  const automated = Boolean(equipment.automated);
  const blocksPlayer = !automated && !equipment.handsFree;
  const manualBusy = state.properties.some((item) => item.task && taskBlocksPlayer(item.task));
  if (blocksPlayer && manualBusy) {
    return { state, message: 'Du bist bereits mit einer manuellen Aufgabe beschäftigt.' };
  }
  if (kind === 'water' && property.moisture >= 145) {
    return { state, message: 'Der Boden kann aktuell kein weiteres Wasser aufnehmen.' };
  }
  if (kind === 'maintain' && property.condition >= 98) {
    return { state, message: 'Die Geräte sind bereits in bestem Zustand.' };
  }

  const cost = kind === 'maintain' ? maintenanceCost(property) : 0;
  if (state.money < cost) return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= cost;
  const duration = taskDuration(property, kind);
  property.task = {
    kind,
    startedAt: Date.now(),
    endsAt: Date.now() + duration * 1_000,
    automated,
    blocksPlayer,
    cost,
    payoutTotal: kind === 'mow' ? mowingPayout(property) : undefined,
    payoutAccrued: 0,
  };
  addLog(state, `${property.name}: ${TASK_LABELS[kind]} gestartet.`, 'neutral');
  return {
    state,
    message: `${TASK_LABELS[kind]} läuft · ${formatDuration(duration * 1_000)}`,
  };
}

export function taskBlocksPlayer(task: PropertyTask) {
  return task.blocksPlayer ?? !task.automated;
}

export function acceptOffer(source: GameState, offerId: string): GameResult {
  const state = clone(source);
  const offer = state.offers.find((item) => item.id === offerId);
  if (!offer) return { state, message: 'Dieses Angebot ist nicht mehr verfügbar.' };
  state.properties.push({
    id: offer.id,
    name: offer.name,
    subtitle: offer.subtitle,
    type: offer.type,
    size: offer.size,
    payout: offer.payout,
    growthFactor: offer.growthFactor,
    drainage: offer.drainage,
    customerDemand: offer.customerDemand,
    grass: 48 + Math.random() * 30,
    moisture: 42 + Math.random() * 30,
    condition: 88,
    satisfaction: 78,
    equipment: { mow: 0, water: 0, maintain: 0 },
    fertilizer: false,
    weedControl: false,
    lifetimeRevenue: 0,
    completedJobs: 0,
    protected: false,
  });
  state.offers = state.offers.filter((item) => item.id !== offerId);
  addLog(state, `${offer.name} ist jetzt ein neuer Stammkunde.`, 'good');
  return { state, message: `Vertrag mit ${offer.name} angenommen.` };
}

export function declineOffer(source: GameState, offerId: string): GameResult {
  const state = clone(source);
  state.offers = state.offers.filter((offer) => offer.id !== offerId);
  state.nextOfferAt = Math.min(state.nextOfferAt, Date.now() + 45_000);
  return { state, message: 'Angebot abgelehnt. Bald erscheint ein neues.' };
}

export function unlockEquipment(source: GameState, kind: TaskKind): GameResult {
  const state = clone(source);
  const nextLevel = state.unlocked[kind] + 1;
  const item = EQUIPMENT[kind][nextLevel];
  if (!item) return { state, message: 'In diesem Bereich ist bereits alles erforscht.' };
  if (state.reputation < item.reputation) {
    return { state, message: `Dafür brauchst du Reputation ${item.reputation}.` };
  }
  if (state.money < item.unlockCost) return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= item.unlockCost;
  state.unlocked[kind] = nextLevel;
  addLog(state, `${item.name} wurde freigeschaltet.`, 'good');
  return { state, message: `${item.name} kann jetzt angeschafft werden.` };
}

export function installEquipment(
  source: GameState,
  propertyId: string,
  kind: TaskKind,
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  const nextLevel = property.equipment[kind] + 1;
  if (nextLevel > state.unlocked[kind]) {
    return { state, message: 'Diese Technik muss zuerst global freigeschaltet werden.' };
  }
  const item = EQUIPMENT[kind][nextLevel];
  if (!item) return { state, message: 'Hier ist bereits die beste Technik installiert.' };
  if (state.money < item.installCost) return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= item.installCost;
  property.equipment[kind] = nextLevel;
  addLog(state, `${property.name}: ${item.name} wurde installiert.`, 'good');
  return { state, message: `${item.name} ist jetzt auf ${property.name} einsatzbereit.` };
}

export function unlockChemistry(
  source: GameState,
  kind: 'fertilizer' | 'weedControl',
): GameResult {
  const state = clone(source);
  const config =
    kind === 'fertilizer'
      ? { name: 'Dünger', cost: 700, reputation: 8 }
      : { name: 'Unkrautpflege', cost: 1_200, reputation: 15 };
  if (state.chemistryUnlocked[kind]) return { state, message: `${config.name} ist bereits freigeschaltet.` };
  if (state.reputation < config.reputation) {
    return { state, message: `Dafür brauchst du Reputation ${config.reputation}.` };
  }
  if (state.money < config.cost) return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
  state.money -= config.cost;
  state.chemistryUnlocked[kind] = true;
  return { state, message: `${config.name} wurde freigeschaltet.` };
}

export function installChemistry(
  source: GameState,
  propertyId: string,
  kind: 'fertilizer' | 'weedControl',
): GameResult {
  const state = clone(source);
  const property = state.properties.find((item) => item.id === propertyId);
  if (!property) return { state, message: 'Grundstück nicht gefunden.' };
  if (!state.chemistryUnlocked[kind]) return { state, message: 'Diese Behandlung ist noch nicht freigeschaltet.' };
  if (property[kind]) return { state, message: 'Auf diesem Grundstück bereits aktiv.' };
  const cost = kind === 'fertilizer' ? 110 : 180;
  if (state.money < cost) return { state, message: 'Dafür reicht dein Guthaben noch nicht.' };
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
  if (event.type === 'mole' && event.propertyId) {
    const property = state.properties.find((item) => item.id === event.propertyId);
    if (property) property.satisfaction = clamp(property.satisfaction + 6);
    state.reputation += 0.5;
  }
  state.activeEvent = undefined;
  return { state, message: event.actionLabel ? 'Ereignis erfolgreich gelöst.' : 'Hinweis geschlossen.' };
}

export function nextUnlockReputation(reputation: number) {
  const thresholds = [2, 3, 5, 6, 7, 8, 14, 15, 18, 22, 24, 28, 32, 38];
  return thresholds.find((threshold) => threshold > reputation) ?? Math.ceil(reputation / 10) * 10 + 10;
}

export function propertyStatus(property: GardenProperty) {
  if (property.rescueUntil) return { label: 'Kritisch', tone: 'danger' as const };
  if (property.condition <= 20 || property.satisfaction <= 25) {
    return { label: 'Achtung', tone: 'warning' as const };
  }
  if (property.task) return { label: 'In Arbeit', tone: 'info' as const };
  if (property.grass >= 60 && property.grass <= 80) {
    return { label: 'Mähbereit', tone: 'good' as const };
  }
  return { label: 'Im Plan', tone: 'neutral' as const };
}

export function grassHint(value: number) {
  if (value < 60) return 'Noch kurz';
  if (value <= 80) return 'Optimales Fenster';
  if (value <= 100) return 'Zu lang';
  return 'Verwildert';
}

export function moistureHint(value: number) {
  if (value < 30) return 'Vertrocknet';
  if (value <= 70) return 'Gut versorgt';
  if (value <= 85) return 'Feucht';
  if (value <= 100) return 'Matschig';
  return 'Gefahr von Staunässe';
}

export function conditionHint(value: number) {
  if (value < 20) return 'Ausfallgefahr';
  if (value < 40) return 'Wartung fällig';
  if (value < 75) return 'Gebraucht';
  return 'Einsatzbereit';
}

export function formatMoney(value: number, showCents = false) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
}

export function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  if (totalSeconds < 60) return `${totalSeconds} Sek.`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}:${seconds.toString().padStart(2, '0')} Min.` : `${minutes} Min.`;
}

export function humanOfflineDuration(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} Minuten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std. ${minutes % 60} Min.`;
  return `${Math.floor(hours / 24)} Tage ${hours % 24} Std.`;
}
