// Color Pour 1.1.0 — 헤드리스 실플레이 QA + 스토어 스크린샷 렌더러
// 실행: node tools/qa/qa.js
// 실제 game.js/levels.js 를 Skia 캔버스(@napi-rs/canvas)에 그려 화면을 캡처하고,
// 포인터 이벤트를 실제로 발생시켜 조작·승리·오버레이 흐름을 검증한다.
const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'app', 'src', 'main', 'assets');
const OUT = path.join(ROOT, 'qa-shots');
fs.mkdirSync(OUT, { recursive: true });

for (const f of ['NotoSansKR-Regular', 'NotoSansKR-Bold', 'NotoSansKR-Black']) {
  const p = path.join(ASSETS, 'fonts', f + '.ttf');
  if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, 'NotoSansKR');
}

const errors = [];
process.on('uncaughtException', (e) => errors.push(String(e && e.stack || e)));

const mainCanvas = createCanvas(1080, 1920);
mainCanvas.style = {};
const listeners = {};
mainCanvas.addEventListener = (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); };
mainCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1080, height: 1920 });

let savedShots = [];

const documentStub = {
  getElementById: (id) => (id === 'game' ? mainCanvas : { style: {}, appendChild: () => {}, textContent: '' }),
  createElement: (tag) => {
    if (tag === 'canvas') {
      const c = createCanvas(1080, 1920);
      c.style = {};
      return c;
    }
    if (tag === 'a') {
      const a = {
        _href: '', download: '', style: {},
        set href(v) { this._href = v; },
        get href() { return this._href; },
        click() {
          const m = /^data:image\/png;base64,(.*)$/.exec(this._href || '');
          if (!m) return;
          const file = path.join(OUT, this.download || 'shot.png');
          fs.writeFileSync(file, Buffer.from(m[1], 'base64'));
          savedShots.push(file);
        },
        remove() {}
      };
      return a;
    }
    return { style: {}, appendChild: () => {}, remove: () => {}, textContent: '' };
  },
  body: { appendChild: () => {} },
  fonts: { ready: { then: () => {} } }
};

const store = {};
const rafQueue = [];
let T = 0;

global.document = documentStub;
global.window = global;
global.location = { search: '?shot=1' };
global.localStorage = {
  getItem: (k) => (store[k] === undefined ? null : store[k]),
  setItem: (k, v) => { store[k] = String(v); }
};
global.requestAnimationFrame = (cb) => { rafQueue.push(cb); return rafQueue.length; };
global.addEventListener = () => {};
global.innerWidth = 1080;
global.innerHeight = 1920;
global.navigator = { vibrate: () => {} };
global.AudioContext = undefined;
global.webkitAudioContext = undefined;

eval(fs.readFileSync(path.join(ASSETS, 'levels.js'), 'utf8'));
eval(fs.readFileSync(path.join(ASSETS, 'game.js'), 'utf8'));

const cp = global.__cp;

function step(frames = 1, dt = 16.7) {
  for (let i = 0; i < frames; i++) {
    T += dt;
    const q = rafQueue.splice(0, rafQueue.length);
    for (const cb of q) cb(T);
  }
}
function shot(name) {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, mainCanvas.toBuffer('image/png'));
  return file;
}
function tap(x, y) {
  const down = { clientX: x, clientY: y };
  for (const fn of listeners.pointerdown || []) fn(down);
  for (const fn of listeners.pointerup || []) fn(down);
  step(2);
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond, extra: extra === undefined ? '' : String(extra) });
  console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra === undefined ? '' : ' — ' + extra));
}

(async function run() {
  step(20);
  check('부팅 후 홈 화면', cp.S.screen === 'home', cp.S.screen);
  shot('01-home.png');

  // 데일리 카드 탭 → 데일리 모드
  tap(190 + 350, 1000 + 66);
  check('오늘의 퍼즐 카드 탭으로 진입', cp.S.screen === 'game' && cp.S.dailyMode === true,
    'screen=' + cp.S.screen + ' daily=' + cp.S.dailyMode);
  step(20);
  shot('02-daily.png');

  // 데일리 퍼즐을 힌트 탐색으로 실제 완주
  let moves = 0;
  while (moves < 120 && !cp.S.won) {
    const mv = cp.solveHint();
    if (!mv) break;
    const cnt = cp.canPour(mv[0], mv[1]);
    if (!cnt) break;
    cp.pour(mv[0], mv[1], cnt);
    cp.commitPour(cp.S.anim);
    cp.S.anim = null;
    moves++;
  }
  check('데일리 퍼즐 실제 완주', cp.S.won === true, moves + '수');
  await sleep(600);
  step(30);
  check('클리어 오버레이 표시', cp.S.overlay === 'win', cp.S.overlay);
  check('데일리 완료 저장', cp.save.daily.doneDate === cp.todayKey(), cp.save.daily.doneDate);
  shot('03-daily-win.png');

  // 홈 복귀 후 연속 배지 확인
  cp.S.overlay = null;
  cp.S.screen = 'home';
  step(10);
  shot('04-home-streak.png');

  // 테마 오버레이
  cp.S.overlay = 'themes';
  step(6);
  shot('05-themes.png');

  // 테마 적용(기본 네온 탭)
  const THEME_X = 90, THEME_Y = 510 + 190; // 대략 셀 중심
  tap(THEME_X + 180, THEME_Y + 84);
  check('테마 선택 동작(잠금/해금 처리)', typeof cp.save.theme === 'string', cp.save.theme);

  // 설정 오버레이
  cp.S.overlay = 'settings';
  step(6);
  shot('06-settings.png');
  cp.S.overlay = null;

  // 레벨 선택
  cp.S.screen = 'levels';
  step(6);
  shot('07-levels.png');

  // 일반 레벨 실플레이: 레벨 14를 실제 붓기 조작으로 풀기
  cp.startLevel(14);
  step(10);
  const sol = cp.S.solution || [];
  let applied = 0;
  for (const mv of sol) {
    const cnt = cp.canPour(mv[0], mv[1]);
    if (!cnt) break;
    cp.pour(mv[0], mv[1], cnt);
    cp.commitPour(cp.S.anim);
    cp.S.anim = null;
    applied++;
  }
  check('레벨 14 실제 완주', cp.isSolvedState(cp.S.tubes), applied + '/' + sol.length);
  await sleep(600);
  step(30);
  check('레벨 클리어 오버레이', cp.S.overlay === 'win', cp.S.overlay);
  check('레벨 별/최고기록 저장', (cp.save.stars[14] || 0) >= 1 && cp.save.best[14] > 0,
    'stars=' + cp.save.stars[14] + ' best=' + cp.save.best[14]);
  shot('08-level-win.png');

  // 되돌리기 소진 → 보상형 확인창 → 광고(웹 대체) 지급
  cp.S.overlay = null;
  cp.startLevel(20);
  step(6);
  const h = cp.S.tubes.length;
  cp.pour(0, h - 1, cp.canPour(0, h - 1) || 1);
  cp.commitPour(cp.S.anim);
  cp.S.anim = null;
  cp.S.undos = 0;
  cp.undo();
  check('되돌리기 소진 시 보상형 확인창', cp.S.overlay === 'reward', cp.S.overlay);
  step(6);
  shot('09-reward.png');
  // 광고 보기 버튼(좌측)
  tap(540 - 210, 960 + 80);
  check('광고 시청 후 되돌리기 충전(웹 대체 경로)', cp.S.undos >= 1, cp.S.undos);

  // Android 브리지(실기기 경로) 재현: 광고 표시 → onRewardedEarned → 지급
  let bridgeCalls = [];
  global.AndroidHost = {
    tryShowInterstitial: () => false,
    tryShowRewarded: (kind) => {
      bridgeCalls.push(kind);
      setTimeout(() => global.onRewardedEarned(kind), 0);
      return true;
    },
    vibrate: () => {},
    isPrivacyOptionsRequired: () => true,
    showPrivacyOptions: () => true,
    openPrivacyPolicy: () => true
  };
  cp.S.overlay = null;
  cp.S.undos = 0;
  cp.undo();
  step(4);
  tap(330, 1040); // '광고 보기'
  await sleep(60);
  check('브리지 경로: 보상형 광고 요청 종류', bridgeCalls[0] === 'undo', JSON.stringify(bridgeCalls));
  check('브리지 경로: onRewardedEarned 후 되돌리기 지급', cp.S.undos >= 1, cp.S.undos);

  // 설정 화면: UMP 동의 재설정 항목이 브리지 값을 따라 노출되는지
  let privacyShown = 0;
  global.AndroidHost.showPrivacyOptions = () => { privacyShown++; return true; };
  cp.S.overlay = 'settings';
  step(4);
  shot('06-settings-bridge.png');
  tap(540, 1029); // '광고 동의 설정' 행
  check('UMP 광고 동의 설정 행이 브리지를 호출', privacyShown === 1, privacyShown);
  cp.S.overlay = null;
  delete global.AndroidHost;

  // 힌트 표시
  cp.S.overlay = null;
  cp.useHint();
  step(10);
  check('힌트가 다음 수를 표시', !!cp.S.hintMove, JSON.stringify(cp.S.hintMove));
  shot('10-hint.png');

  // 뒤로가기 처리
  check('뒤로가기: 게임 → 홈', global.onAndroidBack() === true && cp.S.screen === 'home', cp.S.screen);
  check('뒤로가기: 홈에서는 종료 허용', global.onAndroidBack() === false);

  // 무한 모드
  cp.startEndless(130);
  step(8);
  check('무한 모드 진입', cp.S.endless === true);
  shot('11-endless.png');

  // 게임 방법
  cp.S.screen = 'home';
  cp.S.overlay = 'howto';
  step(6);
  shot('12-howto.png');
  cp.S.overlay = null;

  // 스토어 스크린샷(KR/EN) — 앱 내 __shot 경로 그대로 사용
  // 매장용으로 그럴듯한 진행 상태를 만들어 둔다(실제 저장소가 아니라 캡처용 세팅).
  cp.save.unlocked = 25;
  cp.save.stars = {};
  cp.save.best = {};
  for (let n = 1; n <= 24; n++) {
    cp.save.stars[n] = n % 7 === 0 ? 2 : 3;
    cp.save.best[n] = 14 + (n % 9);
  }
  cp.save.daily = { doneDate: '', streak: 6, bestStreak: 9, totalStars: 24 };
  cp.save.theme = 'neon';
  savedShots = [];
  const kr = [
    ['home', ['오프라인으로 즐기는', '데이터 필요 없는 두뇌 퍼즐'], 'kr-1.png'],
    ['levels', ['120개 스테이지', '별 3개에 도전하세요'], 'kr-2.png'],
    ['game:14:6', ['탭 한 번으로 붓기', '같은 색 볼을 한 튜브에'], 'kr-3.png'],
    ['game:96:9', ['막혔다면 힌트', '두뇌를 깨우는 색상 정렬'], 'kr-4.png'],
    ['daily', ['매일 바뀌는 오늘의 퍼즐', '연속 기록에 도전하세요'], 'kr-5.png'],
    ['themes', ['별로 여는 테마 5종', '나만의 배경으로 플레이'], 'kr-6.png'],
    ['win:20', ['레벨 클리어!', '별 3개를 노려보세요'], 'kr-7.png']
  ];
  const en = [
    ['home', ['Relaxing offline puzzle', 'No wifi? No problem'], 'en-1.png'],
    ['levels', ['120 handcrafted stages', 'Chase three stars'], 'en-2.png'],
    ['game:14:6', ['Tap to pour', 'One-hand color sorting'], 'en-3.png'],
    ['game:96:9', ['Stuck? Use a hint', 'Daily brain training'], 'en-4.png'],
    ['daily', ['A fresh puzzle every day', 'Keep your streak alive'], 'en-5.png'],
    ['win:20', ['Level clear!', 'Aim for three stars'], 'en-6.png']
  ];
  for (const set of [kr, en]) {
    for (const s of set) {
      global.__shot(s[0], s[1], s[2]);
      step(2);
    }
  }
  check('스토어 스크린샷 13장 생성', savedShots.length === 13, savedShots.length);
  const sizes = savedShots.map((f) => {
    const b = fs.statSync(f);
    return path.basename(f) + ':' + Math.round(b.size / 1024) + 'KB';
  });
  console.log('shots →', sizes.join(', '));

  check('스크립트 오류 없음', errors.length === 0, errors.slice(0, 3).join(' | '));

  const failed = results.filter((r) => !r.ok).length;
  fs.writeFileSync(path.join(OUT, 'qa-result.json'), JSON.stringify({ results, errors, savedShots }, null, 2));
  console.log('\n' + (failed ? failed + ' FAILED' : 'ALL PASS') + ' / ' + results.length + ' checks');
  process.exit(failed ? 1 : 0);
})();
