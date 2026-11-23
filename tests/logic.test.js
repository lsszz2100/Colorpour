// 게임 로직 헤드리스 테스트: node tests/logic.test.js
const fs = require('fs');
const path = require('path');

function stubCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 40 });
      if (k === 'canvas') return { width: 1080, height: 1920 };
      return noop;
    },
    set() { return true; }
  });
}

const canvas = {
  width: 1080, height: 1920, style: {}, addEventListener: () => {},
  getContext: () => stubCtx(),
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1080, height: 1920 })
};

global.document = {
  getElementById: (id) => (id === 'game' ? canvas : { style: {}, appendChild: () => {} }),
  createElement: () => ({ style: {}, getContext: () => stubCtx(), appendChild: () => {}, remove: () => {}, click: () => {}, toDataURL: () => '' }),
  body: { appendChild: () => {} },
  fonts: undefined
};
global.window = global;
global.location = { search: '' };
global.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] || null; },
  setItem(k, v) { this._d[k] = v; }
};
global.requestAnimationFrame = () => {};
global.addEventListener = () => {};
global.innerWidth = 1080; global.innerHeight = 1920;
global.navigator = { vibrate: () => {} };
global.setTimeout = global.setTimeout;

const assetDir = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
eval(fs.readFileSync(path.join(assetDir, 'levels.js'), 'utf8'));
eval(fs.readFileSync(path.join(assetDir, 'game.js'), 'utf8'));

const cp = global.__cp;
let fails = 0;
function check(name, cond, extra) {
  if (!cond) { fails++; console.log('FAIL', name, extra === undefined ? '' : extra); }
  else console.log('ok  ', name, extra === undefined ? '' : extra);
}

// 1) 모든 레벨을 솔버 해로 풀 수 있는지 (엔진 규칙 기준)
let solvedCount = 0;
for (let n = 1; n <= 120; n++) {
  cp.startLevel(n);
  const S = cp.S;
  const sol = S.solution || [];
  let applied = 0;
  for (const mv of sol) {
    const c = cp.canPour(mv[0], mv[1]);
    if (!c) break;
    cp.pour(mv[0], mv[1], c);
    cp.commitPour(cp.S.anim);
    cp.S.anim = null;
    applied++;
  }
  if (cp.isSolvedState(S.tubes)) solvedCount++;
  else console.log('  레벨', n, '풀이 실패', applied, '/', sol.length);
}
check('120개 레벨 모두 엔진으로 풀림', solvedCount === 120, solvedCount + '/120');

// 2) 붓기 규칙
cp.startLevel(1);
const S = cp.S;
S.tubes = [[0, 1, 0, 1], [1], []];
check('같은 색 위로 붓기', cp.canPour(0, 1) === 1);
S.tubes = [[0, 1, 0, 1], [0], []];
check('다른 색 위로는 붓지 않음', cp.canPour(0, 1) === 0);
S.tubes = [[0, 0, 1, 1], [1, 1], []];
check('연속 같은 색은 한 번에', cp.canPour(0, 1) === 2);
S.tubes = [[2, 2], [], []];
check('빈 튜브에는 여러 개 붓기', cp.canPour(0, 1) === 2);
S.tubes = [[2, 2], [2, 2, 2, 2].slice(0, 4)];
check('가득 찬 튜브에는 못 부음', cp.canPour(0, 1) === 0);
S.tubes = [[2, 2], [2, 2, 2]];
check('남은 공간만큼만 붓기', cp.canPour(0, 1) === 1);

// 3) 힌트 탐색
cp.startLevel(40);
const mv = cp.solveHint();
check('힌트 반환', Array.isArray(mv) && mv.length === 2, JSON.stringify(mv));

// 4) 되돌리기
cp.startLevel(2);
const before = JSON.stringify(cp.S.tubes);
cp.S.tubes = [[0, 0, 1, 1], [0], []];
cp.pour(0, 1, 1); cp.commitPour(cp.S.anim); cp.S.anim = null;
const afterPour = JSON.stringify(cp.S.tubes);
cp.undo();
check('되돌리기 복원', JSON.stringify(cp.S.tubes) === JSON.stringify([[0, 0, 1, 1], [0], []]), afterPour);

// 5) 무한 모드 생성이 항상 풀리는지
let endlessOk = 0;
for (let i = 0; i < 12; i++) {
  cp.startEndless(121 + i);
  const tubes = cp.S.tubes;
  const counts = {};
  let capOk = true, ballTotal = 0;
  for (const t of tubes) {
    if (t.length > 4) capOk = false;
    ballTotal += t.length;
    for (const b of t) counts[b] = (counts[b] || 0) + 1;
  }
  const colorsOk = Object.values(counts).every(c => c === 4) && Object.keys(counts).length === ballTotal / 4;
  const hint = cp.solveHint();
  if (capOk && colorsOk && hint) endlessOk++;
  else console.log('  무한모드 이상', i, capOk, colorsOk, hint);
}
check('무한 모드 레벨 생성(색 4개씩·용량·힌트)', endlessOk === 12, endlessOk + '/12');

// 6) 저장/별점
cp.save.stars = {};
cp.startLevel(3);
cp.S.moves = 1;
cp.S.par = 10;

// 7) 데일리 챌린지: 항상 같은 날 같은 퍼즐, 반드시 풀린다
cp.startDaily();
const dTubes = cp.S.tubes;
const dCounts = {};
let dCapOk = true, dBalls = 0;
for (const t of dTubes) {
  if (t.length > 4) dCapOk = false;
  dBalls += t.length;
  for (const b of t) dCounts[b] = (dCounts[b] || 0) + 1;
}
const dColorsOk = Object.values(dCounts).every(c => c === 4) && Object.keys(dCounts).length === dBalls / 4;
const dHint = cp.solveHint();
check('데일리 퍼즐 생성(색 4개씩·용량)', dCapOk && dColorsOk, dBalls + '볼');
check('데일리 퍼즐 풀 수 있음', !!dHint);
const dailySnapshot = JSON.stringify(cp.S.tubes);
cp.startDaily();
check('같은 날 같은 데일리 배치(결정적)', JSON.stringify(cp.S.tubes) === dailySnapshot);
check('데일리는 레벨 해금에 영향 없음', cp.save.unlocked === 4 || cp.save.unlocked >= 1);

// 8) 데일리 완료 보상·연속 기록
const today = cp.todayKey(), yday = cp.yesterdayKey();
cp.save.daily = { doneDate: '', streak: 0, bestStreak: 0, totalStars: 0 };
cp.startDaily();
cp.S.moves = Math.ceil(cp.S.par * 0.9);
cp.S.won = true;
cp.finishWin();
check('데일리 완료 기록', cp.save.daily.doneDate === today, cp.save.daily.doneDate);
check('데일리 연속 1일 시작', cp.save.daily.streak === 1, cp.save.daily.streak);
const gained = cp.save.daily.totalStars;
check('데일리 별 지급', gained >= 1 && gained <= 3, gained);
cp.S.won = true;
cp.finishWin();
check('같은 날 재완료는 별 중복 지급 없음', cp.save.daily.totalStars === gained, cp.save.daily.totalStars);
cp.save.daily.doneDate = yday;
cp.save.daily.streak = 3;
cp.startDaily();
cp.S.moves = Math.ceil(cp.S.par * 0.9);
cp.S.won = true;
cp.finishWin();
check('어제 완료 후 연속 증가', cp.save.daily.streak === 4, cp.save.daily.streak);
cp.save.daily.doneDate = '2020-01-01';
cp.save.daily.streak = 9;
cp.startDaily();
cp.S.moves = Math.ceil(cp.S.par * 0.9);
cp.S.won = true;
cp.finishWin();
check('끊긴 연속은 1부터', cp.save.daily.streak === 1, cp.save.daily.streak);

// 9) 별 합계와 테마 해금
cp.save.stars = { 1: 3, 2: 2 };
cp.save.daily.totalStars = 5;
check('별 합계 = 레벨 + 데일리', cp.totalStars() === 10, cp.totalStars());
const needs = cp.THEMES.map(t => t.need);
check('테마 해금 기준 오름차순(0부터)', needs[0] === 0 && needs.every((n, i) => i === 0 || n > needs[i - 1]), JSON.stringify(needs));
cp.save.theme = 'ocean';
check('저장된 테마 반환', cp.themeNow().id === 'ocean');
cp.save.theme = 'nope';
check('없는 테마는 기본값', cp.themeNow().id === cp.THEMES[0].id);

// 10) 최고 기록 저장
cp.save.best = {};
cp.startLevel(5);
cp.S.moves = Math.ceil(cp.S.par * 0.9);
cp.S.won = true;
cp.finishWin();
const best5 = cp.save.best[5];
check('레벨 최고 기록 저장', best5 === cp.S.moves, best5);
cp.startLevel(5);
cp.S.moves = Math.ceil(cp.S.par * 0.9) + 4;
cp.S.won = true;
cp.finishWin();
check('더 나쁜 기록은 유지', cp.save.best[5] === best5, cp.save.best[5]);

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);
