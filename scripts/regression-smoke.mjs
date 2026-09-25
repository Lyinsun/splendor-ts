import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { addPlayerToLobby, applyGameAction, createLobbyState, startGame } from '../src/game/domain/engine.ts';
import { createElementCounter, emptyTokenBank } from '../src/game/domain/tokens.ts';

const HOST = process.env.SPLENDOR_REGRESSION_HOST ?? '127.0.0.1';
const PORT = Number.parseInt(process.env.SPLENDOR_REGRESSION_PORT ?? '29988', 10);
const BASE_URL = `http://${HOST}:${PORT}`;
// Throwaway room store so the smoke run never touches data/rooms.db.
const DATA_DIR = mkdtempSync(path.join(tmpdir(), 'splendor-regression-'));

const serverLog = [];
let server;

try {
  server = startServer();
  await waitForHealth();
  await assertDashboardShell();
  await assertRoomHttpFlow();
  assertBuyThenEvolveDomainRegression();
  console.log(JSON.stringify({
    status: 'ok',
    checks: [
      'healthz',
      'dashboard-shell',
      'room-http-flow (seat tokens, host-only, hidden reserve)',
      'buy-then-evolve-domain-regression',
    ],
    baseUrl: BASE_URL,
  }, null, 2));
} finally {
  await stopServer();
  rmSync(DATA_DIR, { recursive: true, force: true });
}

function startServer() {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SPLENDOR_HTTP_HOST: HOST,
      SPLENDOR_HTTP_PORT: String(PORT),
      SPLENDOR_DB_PATH: path.join(DATA_DIR, 'rooms.db'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    serverLog.push(String(chunk));
  });
  child.stderr.on('data', (chunk) => {
    serverLog.push(String(chunk));
  });

  return child;
}

async function stopServer() {
  if (server === undefined || server.exitCode !== null) {
    return;
  }
  server.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => server.once('exit', resolve)),
    delay(2500).then(() => {
      if (server.exitCode === null) {
        server.kill('SIGKILL');
      }
    }),
  ]);
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    if (server.exitCode !== null) {
      throw new Error(`Server exited before health check passed.\n${serverLog.join('')}`);
    }
    try {
      const response = await fetch(`${BASE_URL}/healthz`);
      const payload = await response.json();
      if (response.ok && payload.ok === true) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await delay(300);
  }
  throw new Error(`Timed out waiting for ${BASE_URL}/healthz.\n${serverLog.join('')}`);
}

async function assertDashboardShell() {
  const response = await fetch(`${BASE_URL}/`);
  const html = await response.text();
  assert(response.ok, `Dashboard shell returned ${response.status}`);
  assert(html.includes('/dashboard-assets/assets/'), 'Dashboard shell does not reference built assets.');
  assert(html.includes('<div id="root"></div>'), 'Dashboard root element is missing.');
}

async function assertRoomHttpFlow() {
  const created = await request('/v1/rooms', {
    method: 'POST',
    body: { playerName: 'Workflow A', roomName: 'Workflow Regression' },
  });
  const joined = await request(`/v1/rooms/${created.room.roomId}/join`, {
    method: 'POST',
    body: { playerName: 'Workflow B' },
  });
  const roomPath = `/v1/rooms/${created.room.roomId}`;
  await expectStatus(`${roomPath}/start`, { method: 'POST' }, 401);
  await expectStatus(`${roomPath}/start`, { method: 'POST', token: joined.seatToken }, 403);
  const started = await request(`${roomPath}/start`, { method: 'POST', token: created.seatToken });
  assert(started.status === 'playing', `Expected playing room, got ${started.status}`);
  assert(started.board.market[1].length === 4, 'Tier-1 market was not filled.');
  assert(started.board.specialMarket.rare.length === 1, 'Rare special market was not filled.');
  assert(started.board.deckCounts !== undefined && started.board.decks === undefined, 'Deck contents leaked into the room view.');

  const legal = await request(`${roomPath}/legal-actions`, { token: created.seatToken });
  const take = legal.actions.find((entry) => entry.action.kind === 'take_tokens' && entry.action.tokens.length === 3);
  assert(take !== undefined, 'Expected at least one legal 3-token take action.');

  const takeBody = {
    tokens: take.action.tokens,
    ...(take.action.discardTokens === undefined ? {} : { discardTokens: take.action.discardTokens }),
    ...(take.action.evolution === undefined ? {} : { evolution: take.action.evolution }),
  };
  // Seat B may not act for seat A: the acting player comes from the token, and it is not B's turn.
  await expectStatus(`${roomPath}/actions/take-tokens`, { method: 'POST', token: joined.seatToken, body: takeBody }, 409);
  const afterAction = await request(`${roomPath}/actions/take-tokens`, {
    method: 'POST',
    token: created.seatToken,
    body: { ...takeBody, clientActionId: 'regression-take-1' },
  });
  assert(afterAction.currentPlayerId === joined.playerId, 'Turn did not advance to the joined player.');

  const reserved = await request(`${roomPath}/actions/reserve`, {
    method: 'POST',
    token: joined.seatToken,
    body: { source: { kind: 'deck', tier: 1 } },
  });
  const hostView = await request(roomPath, { token: created.seatToken });
  const hiddenForHost = hostView.players.find((entry) => entry.id === joined.playerId).reserved[0];
  assert(hiddenForHost?.hidden === true, 'Blind reserve must stay hidden from other seats.');
  const ownView = reserved.players.find((entry) => entry.id === joined.playerId).reserved[0];
  assert(ownView?.hidden !== true && typeof ownView?.name === 'string', 'Blind reserve must be visible to its owner.');
}

function assertBuyThenEvolveDomainRegression() {
  const lobby = createLobbyState('room_workflow_buy_evolve', 'Buy Evolve', { id: 'p1', name: 'Ada' });
  const joined = addPlayerToLobby(lobby, { id: 'p2', name: 'Blaise' });
  const game = startGame(joined, 'p1');
  const player = game.players[0];
  assert(player !== undefined, 'Missing fixture player.');

  const from = testCard('bulbasaur-source', 1, 'Bulbasaur', 'grass', 0, {}, {
    pokemonId: 'bulbasaur',
    evolvesTo: { pokemonId: 'ivysaur', requirement: { grass: 2 } },
  });
  const existingGrass = testCard('existing-grass', 1, 'Existing Grass', 'grass', 0, {});
  const purchased = testCard('grass-bonus-card', 1, 'Grass Bonus', 'grass', 0, { fire: 1 });
  const target = testCard('ivysaur-target', 2, 'Ivysaur', 'grass', 3, {}, { pokemonId: 'ivysaur' });

  player.tableau = [from, existingGrass];
  player.bonuses = { ...createElementCounter(), grass: 1 };
  player.tokens = { ...emptyTokenBank(), fire: 1 };
  game.board.market[1][0] = purchased;
  game.board.market[2][0] = target;

  const next = applyGameAction(game, {
    kind: 'buy_card',
    playerId: 'p1',
    source: { kind: 'market', tier: 1, cardId: purchased.id },
    evolution: {
      fromCardId: from.id,
      to: { kind: 'market', tier: 2, cardId: target.id },
    },
  });
  const updated = next.players.find((entry) => entry.id === 'p1');
  assert(updated !== undefined, 'Missing updated player.');
  assert(updated.tableau.some((card) => card.id === purchased.id), 'Purchased card is missing from tableau.');
  assert(updated.tableau.some((card) => card.id === target.id), 'Evolution target is missing from tableau.');
  assert(!updated.tableau.some((card) => card.id === from.id), 'Evolution source card was not replaced.');
  assert(updated.evolutionRecords.length === 1, 'Expected exactly one evolution record.');
}

async function request(path, options = {}) {
  const { response, text } = await send(path, options);
  assert(response.ok, `${options.method ?? 'GET'} ${path} returned ${response.status}: ${text}`);
  return text === '' ? null : JSON.parse(text);
}

async function expectStatus(path, options, status) {
  const { response, text } = await send(path, options);
  assert(response.status === status, `${options.method ?? 'GET'} ${path} returned ${response.status}, expected ${status}: ${text}`);
}

async function send(path, options = {}) {
  const headers = {};
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return { response, text: await response.text() };
}

function testCard(id, tier, name, element, points, cost, extras = {}) {
  return {
    id,
    tier,
    name,
    element,
    points,
    cost,
    species: name,
    ...extras,
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
