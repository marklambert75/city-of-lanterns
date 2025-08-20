
// Beneath the City of Lanterns - Prototype v0.1
// First-person step/turn, lightweight combat, puzzles, merchants, PWA-ready.
// Designed for mobile (iPhone) + desktop.
// Author: GPT-5 Pro (for Mark Lambert)

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// --- Game State ---
const game = {
  map: null,
  tiles: [],
  width: 0, height: 0,
  player: { x: 2, y: 10, dir: 0 }, // dir: 0=N,1=E,2=S,3=W
  flags: { catDoorOpen: false, metWisp: false, ragpickerVisited: false },
  inventory: [{ id: 'ragpicker-hook', name: 'Ragpicker\'s Hook', desc: 'Pull distant levers.', value: 15 }],
  gold: 20,
  party: [
    { id: 'lightbinder', name: 'Lightbinder', hp: 24, hpMax: 24, atk: 5, def: 2, focus: 6, wonder: 6, skills: ['flash'] },
    { id: 'cartomancer', name: 'Cartomancer', hp: 18, hpMax: 18, atk: 3, def: 1, focus: 8, wonder: 7, skills: ['ember-echo'] },
    { id: 'veilrunner', name: 'Veilrunner', hp: 20, hpMax: 20, atk: 4, def: 2, focus: 6, wonder: 3, skills: ['fade'] },
    { id: 'echo-knight', name: 'Echo Knight', hp: 26, hpMax: 26, atk: 6, def: 3, focus: 5, wonder: 2, skills: ['riposte'] },
  ],
  battle: null,
  message: '',
  hint: 'W/A/D to turn & move; L for Lantern; Press Menu for inventory.',
};

// --- Load map ---
async function loadMap(name) {
  const resp = await fetch(`content/${name}.json`);
  const data = await resp.json();
  game.map = data;
  game.tiles = data.tiles.map(r => r.split(''));
  game.width = data.width;
  game.height = data.height;
  game.player.x = data.start.x;
  game.player.y = data.start.y;
  game.player.dir = data.start.dir;
  renderHUD();
  renderView();
  setHint("Find the Ragpicker. Somewhere, a cat watches from shadow.");
}
function setHint(t) { game.hint = t; $('#hint').textContent = t; }

// --- Helpers ---
const DIRS = [
  {dx:0, dy:-1}, // N
  {dx:1, dy:0},  // E
  {dx:0, dy:1},  // S
  {dx:-1, dy:0}, // W
];
function inBounds(x,y) { return x>=0 && y>=0 && x<game.width && y<game.height; }
function tileAt(x,y) {
  if (!inBounds(x,y)) return '#';
  const ch = game.tiles[y][x];
  if (ch==='T') return game.flags.catDoorOpen ? '.' : 'T';
  return ch;
}
function isPassable(ch) {
  return ch!== '#' && ch!=='T';
}

// --- Movement ---
function turnLeft() { game.player.dir = (game.player.dir+3)%4; renderView(); }
function turnRight() { game.player.dir = (game.player.dir+1)%4; renderView(); }
function stepForward() {
  const {dx,dy} = DIRS[game.player.dir];
  const nx = game.player.x + dx;
  const ny = game.player.y + dy;
  const ch = tileAt(nx,ny);
  if (isPassable(ch)) {
    game.player.x = nx; game.player.y = ny;
    enterTile(ch, nx, ny);
  } else {
    setHint("A wall interrupts your intentions.");
  }
  renderView();
}
function stepBack() {
  const {dx,dy} = DIRS[(game.player.dir+2)%4];
  const nx = game.player.x + dx;
  const ny = game.player.y + dy;
  const ch = tileAt(nx,ny);
  if (isPassable(ch)) {
    game.player.x = nx; game.player.y = ny;
    enterTile(ch, nx, ny);
  } else {
    setHint("Something resists your retreat.");
  }
  renderView();
}

// --- Tile interactions ---
function enterTile(ch, x, y) {
  if (ch==='B') startBattle(randomEncounter());
  if (ch==='M') openMerchant('Ragpicker King');
  if (ch==='S') shrine();
  if (ch==='E') wispEvent();
  if (ch==='D') setHint("A heavy gate. Perhaps a lever nearby?");
  if (ch==='P') setHint("Lantern glyphs ring this alcove. Press L to cast a familiar silhouette.");
}

// --- Pseudo-3D Renderer ---
const canvas = $('#view');
const ctx = canvas.getContext('2d');
function renderView() {
  // Clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Sky / floor
  const grad = ctx.createLinearGradient(0,0,0,canvas.height);
  grad.addColorStop(0,'#0b0f14');
  grad.addColorStop(1,'#151b23');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Draw depths 1..6
  for (let depth=6; depth>=1; depth--) {
    drawDepth(depth);
  }

  renderHUD();
}

function drawDepth(depth) {
  const {x,y,dir} = game.player;
  const fdx = DIRS[dir].dx, fdy = DIRS[dir].dy;
  const ldx = DIRS[(dir+3)%4].dx, ldy = DIRS[(dir+3)%4].dy;
  const rdx = DIRS[(dir+1)%4].dx, rdy = DIRS[(dir+1)%4].dy;

  const tx = x + fdx*depth;
  const ty = y + fdy*depth;
  const center = tileAt(tx,ty);
  const left = tileAt(tx + ldx, ty + ldy);
  const right = tileAt(tx + rdx, ty + rdy);

  const scale = 1.0 / depth;
  const w = canvas.width, h = canvas.height;
  const wallW = w * 0.9 * scale;
  const wallH = h * 0.9 * scale;
  const cx = w/2, cy = h/2 + (h*0.05)*scale;

  // Side walls (left/right)
  function wallColor(ch, side=false) {
    if (ch==='#' || ch==='T') return side ? '#15202b' : '#192734';
    if (ch==='D') return '#2b3a4b';
    return null;
  }
  const lc = wallColor(left, true);
  if (lc) {
    ctx.fillStyle = lc;
    ctx.fillRect(cx - wallW - (w*0.06)*scale, cy - wallH/2, wallW*0.6, wallH);
  }
  const rc = wallColor(right, true);
  if (rc) {
    ctx.fillStyle = rc;
    ctx.fillRect(cx + (w*0.06)*scale, cy - wallH/2, wallW*0.6, wallH);
  }

  // Front wall/door
  const fc = wallColor(center, false);
  if (fc) {
    ctx.fillStyle = fc;
    ctx.fillRect(cx - wallW/2, cy - wallH/2, wallW, wallH);
    // Door slats
    if (center==='D') {
      ctx.fillStyle = '#3b4e63';
      ctx.fillRect(cx - wallW/2 + wallW*0.4, cy - wallH*0.4, wallW*0.2, wallH*0.8);
    }
  } else {
    // Corridor: draw floor perspective lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(cx - wallW/2, cy + wallH/2);
    ctx.lineTo(cx, cy + wallH*0.2);
    ctx.lineTo(cx + wallW/2, cy + wallH/2);
    ctx.stroke();
  }
}

// --- HUD ---
function renderHUD() {
  const p = game.party.map(u => {
    const hpPct = Math.max(0, Math.min(1, u.hp/u.hpMax));
    return `<div class="unit"><strong>${u.name}</strong> <span class="tag">${u.hp}/${u.hpMax} HP</span>
      <div class="healthbar"><span style="width:${(hpPct*100).toFixed(0)}%"></span></div>
    </div>`;
  }).join('');
  $('#party').innerHTML = p;
  $('#status').innerHTML = `💰 ${game.gold} • 📍 ${game.map?.name || ''}`;
  $('#hint').textContent = game.hint || '';
}

// --- Input ---
window.addEventListener('keydown', (e) => {
  if ($('#battle') && !$('#battle').classList.contains('hidden')) return; // block during battle
  if ($('#merchant') && !$('#merchant').classList.contains('hidden')) return;
  if ($('#menu') && !$('#menu').classList.contains('hidden')) return;
  const k = e.key.toLowerCase();
  if (k==='a' || e.key === 'ArrowLeft') { turnLeft(); }
  else if (k==='d' || e.key === 'ArrowRight') { turnRight(); }
  else if (k==='w' || e.key === 'ArrowUp') { stepForward(); }
  else if (k==='s' || e.key === 'ArrowDown') { stepBack(); }
  else if (k==='l') { useLantern(); }
  else if (k==='m') { openMenu(); }
  else if (k==='x') { saveGame(); }
});
$('#controls').addEventListener('click', (e) => {
  const act = e.target.getAttribute('data-action');
  if (!act) return;
  if (act==='turn-left') turnLeft();
  if (act==='turn-right') turnRight();
  if (act==='step-forward') stepForward();
  if (act==='step-back') stepBack();
  if (act==='lantern') useLantern();
  if (act==='menu') openMenu();
  if (act==='save') saveGame();
});

// --- Lantern action ---
function useLantern() {
  const ch = tileAt(game.player.x, game.player.y);
  if (ch==='P') {
    if (!game.flags.catDoorOpen) {
      game.flags.catDoorOpen = true;
      setHint("Your lantern throws a feline shadow. Somewhere, a hidden gate purrs open.");
      // reveal secret T tile to '.' per tileAt
      renderView();
      // Spawn Wisp event tile if not already met
      if (!game.flags.metWisp) {
        setTimeout(() => setHint("A slithering shade-cat pads nearby..."), 1200);
      }
    } else {
      setHint("Only a thin outline of the cat remains. The secret is already awake.");
    }
  } else {
    setHint("Lantern light pools and recedes, revealing nothing new.");
  }
}

// --- Wisp event ---
function wispEvent() {
  if (game.flags.metWisp) { setHint("You sense soft paws in the dark. Wisp is watching."); return; }
  game.flags.metWisp = true;
  const o = $('#overlay');
  o.classList.remove('hidden');
  o.innerHTML = `
    <div style="max-width:720px;margin:24px auto;background:#10151c;padding:16px;border:1px solid #1f2835;border-radius:8px;">
      <h2>Wisp, the Shade‑Cat</h2>
      <p>A sinuous silhouette coils into being. Eyes like twin embers regard you with patient amusement.</p>
      <p><em>"Curious hands, brighter than you think. Seek the gate that was not made; seek the story that was not told."</em></p>
      <p>Wisp noses a small bundle toward you.</p>
      <ul>
        <li><strong>Got:</strong> <em>Lantern of Stolen Sparks</em> — Solving light puzzles increases max lantern charge.</li>
      </ul>
      <div style="text-align:right;"><button class="btn" id="wisp-ok">Continue</button></div>
    </div>
  `;
  $('#wisp-ok').addEventListener('click', () => {
    o.classList.add('hidden');
    // Add item effect
    if (!game.inventory.find(i => i.id==='lantern-stolen-sparks')) {
      game.inventory.push({ id:'lantern-stolen-sparks', name:'Lantern of Stolen Sparks', desc:'Light puzzles raise max lantern charge.', value: 60 });
    }
    setHint("Wisp vanishes. The air smells faintly of warm dust and secrets.");
  });
}

// --- Shrine ---
function shrine() {
  const o = $('#overlay');
  o.classList.remove('hidden');
  o.innerHTML = `
    <div style="max-width:720px;margin:24px auto;background:#10151c;padding:16px;border:1px solid #1f2835;border-radius:8px;">
      <h2>Lantern Shrine</h2>
      <p>Warm light gathers. Small scars loosen their hold.</p>
      <div style="text-align:right;"><button class="btn" id="shrine-rest">Rest</button></div>
    </div>
  `;
  $('#shrine-rest').addEventListener('click', () => {
    game.party.forEach(u => u.hp = u.hpMax);
    o.classList.add('hidden');
    setHint("You feel steadier. The way ahead clarifies.");
    renderHUD();
  });
}

// --- Merchant ---
const merchants = {
  "Ragpicker King": {
    buyRate: 0.7, sellRate: 1.0,
    stock: [
      { id:'lockpicks', name:'Lockpicks', desc:'Opens simple gates.', value: 10 },
      { id:'map-scrap', name:'Map Scrap', desc:'Reveals a short path.', value: 6 },
      { id:'salve', name:'Mending Salve', desc:'Restore 8 HP.', value: 8 },
    ]
  }
};

let currentMerchant = null;
function openMerchant(name) {
  currentMerchant = merchants[name];
  $('#merchant-name').textContent = name;
  const stockHtml = currentMerchant.stock.map(it => `<div class="item"><strong>${it.name}</strong><div class="tag">${it.desc}</div><div>${Math.ceil(it.value/currentMerchant.buyRate)}g</div></div>`).join('');
  $('#merchant-stock').innerHTML = `<h3>Stock</h3>${stockHtml}`;
  const invHtml = game.inventory.map(it => `<div class="item"><strong>${it.name}</strong><div class="tag">${it.desc}</div><div>${Math.floor(it.value*currentMerchant.buyRate)}g</div></div>`).join('');
  $('#merchant-inv').innerHTML = `<h3>Your Pack</h3>${invHtml}`;
  $('#merchant').classList.remove('hidden');
}
$('#merchant').addEventListener('click', (e) => {
  const act = e.target.getAttribute('data-merchant');
  if (!act) return;
  if (act==='leave') { $('#merchant').classList.add('hidden'); return; }
  if (act==='buy') {
    const item = currentMerchant.stock[0];
    const price = Math.ceil(item.value/currentMerchant.buyRate);
    if (game.gold >= price) {
      game.gold -= price;
      game.inventory.push({...item});
      setHint(`Bought ${item.name}.`);
    } else setHint("Not enough coin.");
  }
  if (act==='sell') {
    if (game.inventory.length>0) {
      const item = game.inventory.shift();
      const price = Math.floor(item.value*currentMerchant.buyRate);
      game.gold += price;
      setHint(`Sold ${item.name}.`);
    } else setHint("You have nothing to sell.");
  }
  $('#merchant').classList.add('hidden');
  renderHUD();
});

// --- Battles ---
function randomEncounter() {
  const options = [
    { id:'scavenger', name:'Crazed Scavenger', hp: 14, atk: 4, def: 1, skill: 'rust-fling' },
    { id:'pipe-larva', name:'Pipe Larva', hp: 10, atk: 3, def: 0, skill: 'split' }
  ];
  return options[Math.floor(Math.random()*options.length)];
}
function startBattle(enemy) {
  game.battle = {
    enemy: {...enemy},
    turn: 'player',
    log: ['An enemy approaches!']
  };
  $('#battle').classList.remove('hidden');
  updateBattleUI();
}
function endBattle(won=true) {
  if (won) {
    game.gold += 5;
    setHint("You prevail. Something clinks in the dark (+5g).");
  } else {
    setHint("You slip away, bruised and breathless.");
  }
  $('#battle').classList.add('hidden');
  game.battle = null;
  renderHUD();
}
function updateBattleUI() {
  const b = game.battle;
  $('#battle-log').innerHTML = b.log.map(x => `<div>${x}</div>`).join('');
  $('#battle-enemy').innerHTML = `<div class="item"><strong>${b.enemy.name}</strong><div class="healthbar"><span style="width:${Math.max(0, b.enemy.hp)/20*100}%"></span></div></div>`;
  const phtml = game.party.map(u => {
    const pct = Math.max(0, Math.min(1, u.hp/u.hpMax));
    return `<div class="item"><strong>${u.name}</strong><div class="healthbar"><span style="width:${(pct*100).toFixed(0)}%"></span></div></div>`;
  }).join('');
  $('#battle-party').innerHTML = phtml;
}
function playerAttack() {
  const b = game.battle;
  const dmg = Math.max(1, Math.floor( (avgStat('atk') + rand(1,4)) - b.enemy.def ));
  b.enemy.hp -= dmg;
  b.log.push(`Your party attacks for ${dmg} damage.`);
  if (b.enemy.hp <= 0) { b.log.push('Enemy collapses.'); updateBattleUI(); return endBattle(true); }
  b.turn = 'enemy';
  enemyTurn();
}
function avgStat(stat) {
  const a = game.party.reduce((s,u)=>s+u[stat],0)/game.party.length;
  return Math.round(a);
}
function rand(a,b) { return Math.floor(Math.random()*(b-a+1))+a; }
function playerSkill() {
  const b = game.battle;
  const roll = Math.random();
  if (roll < 0.5) {
    const dmg = Math.max(1, avgStat('focus') + rand(1,3));
    b.enemy.hp -= dmg;
    b.log.push(`Cartomancer's Ember Echo flares for ${dmg}.`);
  } else {
    const debuff = rand(1,2);
    b.log.push(`Lightbinder flashes; enemy defense -${debuff} this round.`);
    b.enemy.def = Math.max(0, b.enemy.def - debuff);
  }
  if (b.enemy.hp <= 0) { b.log.push('Enemy collapses.'); updateBattleUI(); return endBattle(true); }
  b.turn = 'enemy';
  enemyTurn();
}
function playerLight() {
  const b = game.battle;
  const blind = Math.random() < 0.5;
  if (blind) {
    b.log.push('Lantern glare blinds the foe. Their attack misses.');
    b.turn = 'player'; // skip enemy
  } else {
    b.log.push('Light wavers uselessly.');
    b.turn = 'enemy';
    enemyTurn();
  }
  updateBattleUI();
}
function playerItem() {
  const salveIdx = game.inventory.findIndex(i => i.id==='salve');
  if (salveIdx>=0) {
    const u = game.party[0];
    const heal = 8;
    u.hp = Math.min(u.hpMax, u.hp + heal);
    game.inventory.splice(salveIdx,1);
    game.battle.log.push(`You use a Mending Salve on ${u.name} (+${heal}).`);
  } else {
    game.battle.log.push("You fumble for an item you don't have.");
  }
  game.battle.turn = 'enemy';
  enemyTurn();
}
function playerFlee() {
  if (Math.random() < 0.6) return endBattle(false);
  game.battle.log.push("You fail to escape!");
  game.battle.turn = 'enemy';
  enemyTurn();
}
function enemyTurn() {
  const b = game.battle;
  if (!b) return;
  const target = game.party[Math.floor(Math.random()*game.party.length)];
  const dmg = Math.max(1, b.enemy.atk + rand(0,2) - target.def);
  target.hp -= dmg;
  b.log.push(`${b.enemy.name} hits ${target.name} for ${dmg}.`);
  if (target.hp <= 0) {
    b.log.push(`${target.name} falls!`);
  }
  // If all down, respawn at shrine (soft fail)
  if (game.party.every(u => u.hp<=0)) {
    b.log.push("The dark folds around you...");
    $('#battle-log').innerHTML = b.log.map(x => `<div>${x}</div>`).join('');
    setTimeout(()=> {
      $('#battle').classList.add('hidden');
      game.battle = null;
      // Soft fail: revive at shrine position with penalty
      const s = game.map.start; // reuse start as shrine for prototype
      game.player.x = s.x; game.player.y = s.y; game.player.dir = s.dir;
      game.party.forEach(u => u.hp = Math.max(1, Math.floor(u.hpMax*0.6)));
      setHint("You awaken at a shrine, the lantern dimmed but intact.");
      renderView();
    }, 700);
    return;
  }
  b.turn = 'player';
  updateBattleUI();
}
$('#battle-actions').addEventListener('click', (e) => {
  const act = e.target.getAttribute('data-bact');
  if (!act) return;
  if (act==='attack') playerAttack();
  if (act==='skill') playerSkill();
  if (act==='item') playerItem();
  if (act==='light') playerLight();
  if (act==='flee') playerFlee();
  updateBattleUI();
});

// --- Menu ---
function openMenu() {
  $('#menu').classList.remove('hidden');
  $('#menu-content').innerHTML = `<p>Party & inventory summary.</p>`;
}
$('#menu').addEventListener('click', (e) => {
  const act = e.target.getAttribute('data-menu');
  if (!act) return;
  if (act==='close') $('#menu').classList.add('hidden');
  if (act==='party') {
    const html = game.party.map(u => `<div class="item"><strong>${u.name}</strong> HP ${u.hp}/${u.hpMax} • ATK ${u.atk} • DEF ${u.def} • FOC ${u.focus} • WON ${u.wonder}</div>`).join('');
    $('#menu-content').innerHTML = html;
  }
  if (act==='inventory') {
    const html = game.inventory.map(u => `<div class="item"><strong>${u.name}</strong><div class="tag">${u.desc}</div></div>`).join('') || '<p>(empty)</p>';
    $('#menu-content').innerHTML = html;
  }
});

// --- Save/Load ---
function saveGame() {
  const payload = {
    mapName: game.map?.id || 'map_sewers',
    tiles: game.tiles.map(r=>r.join('')),
    player: game.player,
    flags: game.flags,
    inventory: game.inventory,
    gold: game.gold,
    party: game.party,
  };
  localStorage.setItem('lanterns-save', JSON.stringify(payload));
  setHint("Saved.");
}
function tryLoadGame() {
  const s = localStorage.getItem('lanterns-save');
  if (!s) return false;
  try {
    const p = JSON.parse(s);
    game.player = p.player;
    game.flags = p.flags;
    game.inventory = p.inventory;
    game.gold = p.gold;
    game.party = p.party;
    // tiles restored, but also load map meta
    fetch(`content/${p.mapName}.json`).then(r=>r.json()).then(meta=>{
      game.map = meta;
      game.width = meta.width; game.height = meta.height;
      game.tiles = p.tiles.map(r=>r.split(''));
      renderView();
      setHint("Save loaded.");
    });
    return true;
  } catch(e) { console.error(e); return false; }
}

// --- Boot ---
loadMap('map_sewers').then(()=>{
  if (!tryLoadGame()) {
    renderView();
  }
});
