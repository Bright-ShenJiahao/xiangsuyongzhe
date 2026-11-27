// 像素勇者 · 出招用哪几帧（tools/frames.html 调，调好的结果烤进 s 里）。
// 每招分四段：wu 前摇 → hit 出手（hitT 秒）→ hold 持续（只有占时型）→ rc 后摇。
// 每段是一串帧名（atk0 = 出招第 1 帧，big0 = 大招帧……），按 fps 播放，播完停在最后一帧；hold 循环播。
// 空数组 = 用平常的站立帧。lunge = 出手时往前冲几像素格。
// 本机调试：工具点「保存」会写进 localStorage xsyz-skf，游戏读到就盖过下面的默认值。
window.SKF = (() => {
  const base = { wu: ['atk0'], hit: ['atk1'], hold: ['atk0', 'atk1'], rc: [], hitT: .25, fps: 12, lunge: 3 };
  const big = { wu: ['atk0'], hit: ['big0'], hold: ['big0'], rc: [], hitT: .25, fps: 12, lunge: 0 };
  // 11/22 用新的 30 帧填的默认值；下面 ED 是用户在帧工具里改的（11/22 01:08，01:38 半月斩前摇改蓄力 2），盖在默认值上：前摇 1 帧、出手 1–3 帧、后摇回站立，简洁好读。帧名见 tools/frames.html
  const S = (wu, hit, o = {}) => Object.assign({ wu, hit, hitT: Math.max(.2, hit.length / 12) }, o);
  const s = {
    h_pages: S(['charge0'], ['cast0', 'cast1', 'cast2'], { lunge: 0 }),
    h_water: S(['charge0'], ['cast0', 'cast1', 'cast2'], { lunge: 0 }),
    h_sword: S(['charge0'], ['raise0', 'raise1'], { lunge: 0 }),
    h_smite: S(['charge0'], ['raise0', 'raise1'], { lunge: 0 }),
    h_verdict: S(['charge0'], ['raise0', 'raise1'], { lunge: 0 }),
    h_shield: S(['charge0'], ['guard0', 'guard1'], { lunge: 0 }),
    h_beam: S(['charge0'], ['push0', 'push1'], { lunge: 0 }),
    h_seraph: S(['charge0'], ['big0'], { lunge: 0 }),
    d_grave: S(['charge0'], ['big0'], { lunge: 0 }),
    d_reap: S(['charge0'], ['reap0', 'reap1', 'reap2'], { lunge: 0 }),
    d_blood: S(['charge0'], ['reap0', 'reap1', 'reap2'], { lunge: 0 }),
    d_return: S(['charge0'], ['toss0', 'toss1'], { lunge: 0 }),
    g_bomb: S(['toss0'], ['toss1'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_claw: S(['press0'], ['press1', 'press2'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    d_hook: S(['charge0'], ['hook0', 'hook1'], { lunge: 0 }),
    d_siphon: S(['charge0'], ['hook0', 'hook1'], { lunge: 0 }),
    d_feast: S(['charge0'], ['hook0', 'hook1'], { lunge: 0 }),
    d_curse: S(['charge0'], ['chop0', 'chop1'], { lunge: 0 }),
    d_burst: S(['charge0'], ['chop0', 'chop1'], { lunge: 0 }),
    d_death: S(['charge0'], ['chop0', 'chop1'], { lunge: 0 }),
    d_harvest: S(['charge0'], ['spin0'], { lunge: 0 }),
    g_fast: S(['press0'], ['rapid0', 'rapid1', 'rapid0', 'rapid1'], { rc: ['finish0'], fps: 16, hitT: .25, lunge: 0 }),
    g_spread: S(['charge0'], ['press0', 'press1', 'press2'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_marble: S(['toss0'], ['toss1'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_chomp: S(['charge0'], ['toss0', 'toss1'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_head: S(['aim0'], ['aim1'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_missile: S(['aim0'], ['aim1', 'press1'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_ko: S(['charge0', 'charge1'], ['sky0', 'big0'], { rc: ['finish0'], fps: 8, hitT: .25, lunge: 0 }),
    g_tank: S(['charge0'], ['press0', 'press1', 'press2'], { rc: ['finish0'], fps: 12, hitT: .25, lunge: 0 }),
    g_clear: S(['charge1'], ['rapid0', 'rapid1', 'rapid0', 'rapid1'], { rc: ['finish0'], fps: 16, hitT: .25, lunge: 0 }),
    // 剑
    sword: S(['charge1'], ['slash0', 'slash1', 'slash2'], { lunge: 3 }),
    whirl: S(['charge0'], ['spin0', 'spin1', 'spin0', 'spin1'], { lunge: 0 }),
    guard: S(['charge1'], ['up0'], { lunge: 0 }),
    wave: S(['charge1'], ['slash1', 'slash2'], { lunge: 2 }),
    phantom: S(['charge0'], ['dash0', 'thrust0'], { lunge: 5 }),
    flash: S(['charge0'], ['slash1', 'slash2'], { lunge: 4 }),
    storm: S(['charge0'], [], { hold: ['spin0', 'spin1'], fps: 10 }),
    holysword: S(['charge1'], ['up0'], { rc: ['finish0'], lunge: 0 }),
    // 枪（thrust0 枪头朝后，当横扫起手用）
    spear: S(['charge0'], ['thrust1'], { lunge: 5 }),
    sweep: S(['thrust0'], ['sweep0', 'sweep1', 'sweep2'], { lunge: 2 }),
    javelin: S(['throw0'], ['thrust1'], { lunge: 2 }),
    hundred: S(['charge0'], [], { hold: ['thrust1', 'charge0'], fps: 14 }),
    rising: S(['lift0'], ['lift1'], { lunge: 3 }),
    drill: S(['charge1'], ['thrust1'], { lunge: 4 }),
    leap: S(['jump0'], ['slam0'], { lunge: 0 }),
    dragon: S(['charge1'], [], { hold: ['twirl0', 'twirl1'], fps: 8 }),
    // 弓
    bow: S(['shoot1'], ['shoot2'], { lunge: 0 }),
    fan: S(['side0'], ['shoot2'], { lunge: 0 }),
    homing: S(['shoot1'], ['shoot2'], { lunge: 0 }),
    rain: S(['sky0'], ['sky1'], { lunge: 0 }),
    barrage: S(['shoot1'], [], { hold: ['rapid0', 'shoot2'], fps: 10 }),
    pierce: S(['kneel0'], ['kneel1'], { lunge: -2 }),
    cyclone: S(['side0'], ['shoot2'], { lunge: 0 }),
    starfall: S(['sky0'], [], { hold: ['sky0', 'sky1'], fps: 6 }),
    // 法杖
    staff: S(['charge1'], ['point0', 'point1'], { lunge: 1 }),
    nova: S(['stomp0'], ['stomp1'], { lunge: 0 }),
    chain: S(['palm0'], ['palm1'], { lunge: 1 }),
    pillar: S(['raise0'], ['raise1'], { lunge: 0 }),
    orbs: S(['twirl0', 'twirl1'], ['palm1'], { lunge: 0 }),
    thunder: S(['raise0'], ['raise1'], { lunge: 0 }),
    blizzard: S(['charge1'], [], { hold: ['twirl0', 'twirl1'], fps: 8 }),
    abyss: S(['raise0'], [], { hold: ['raise1'] }),
  };
  const ED = {"guard": {"wu": ["chop0"], "hit": []}, "sword": {"wu": ["charge1"], "hit": ["slash1"]}, "wave": {"wu": ["charge0"], "hit": ["dash0"]}, "phantom": {"wu": ["charge1"], "hit": ["chop1"]}, "flash": {"hit": ["dash0"]}, "holysword": {"wu": ["spin1"], "rc": []}, "spear": {"wu": ["charge1"]}, "javelin": {"wu": ["charge0"], "hit": ["dash0"]}, "hundred": {"hold": ["run2", "atk1"]}, "dragon": {"wu": ["up0"]}, "bow": {"wu": ["side0"], "fps": 14}, "homing": {"wu": ["charge1"]}, "cyclone": {"wu": ["up0"], "hit": ["sky0"], "rc": ["sky1"]}, "orbs": {"wu": ["raise0"], "hit": ["stomp0"]}, "pillar": {"hit": ["stomp1"]}, "abyss": {"wu": ["palm1"], "hold": ["up0", "twirl0"]}, "whirl": {"hit": ["spin1"]}, "sweep": {"hit": ["sweep1"]}, "drill": {"hit": ["dash0"]}, "fan": {"wu": ["charge1"]}, "pierce": {"wu": ["jump0"], "hit": ["slam0"], "rc": ["kneel0"]}, "blizzard": {"wu": ["up0"], "hold": ["palm0", "palm1"]}, "thunder": {"wu": ["jump0"], "hit": ["slam0"]}, "staff": {"hit": ["point1"]}};
  for (const k in ED) s[k] = Object.assign({}, s[k], ED[k]);
  let local = {};
  const readLocal = () => { try { local = JSON.parse(localStorage.getItem('xsyz-skf') || '{}') || {}; } catch (e) { local = {}; } };
  readLocal();
  try { addEventListener('storage', e => { if (e.key === 'xsyz-skf') readLocal(); }); } catch (e) {}
  function get(id) {
    const S = window.DATA && DATA.skills[id] || {};
    return Object.assign({}, S.frame === 'big' ? big : base, s[id] || {}, local[id] || {});
  }
  // 按段和段内时间取帧：返回 [动作名, 第几帧]
  function pick(F, ph, t) {
    const L = F[ph]; if (!L || !L.length) return null;
    let i = Math.floor(t * (F.fps || 12)); i = ph === 'hold' ? i % L.length : Math.min(i, L.length - 1);
    const m = /^([a-z]+)(\d+)$/.exec(L[i]); return m ? [m[1], +m[2]] : null;
  }
  return { base, big, s, get, pick, readLocal, local: () => local };
})();
