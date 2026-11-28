// 露米娜 AI 助手（纯前端离线检索：实时索引 DATA 英雄/兵器/技能/宝物/印记/称号 + 游戏机制）
(function () {
  const SYN = {
    '回血': ['生命', '复活', '吸血', '治疗', '恢复'],
    '加血': ['生命', '复活', '吸血', '治疗'],
    '角色': ['英雄', '人物', '阿远', '小凛', '精灵', '吸血鬼', '骷髅', '骑士'],
    '人物': ['英雄', '阿远', '小凛', '精灵', '吸血鬼', '骷髅', '骑士'],
    '武器': ['兵器', '剑', '枪', '弓', '法杖', '魔法书', '掌机', '镰刀'],
    '钱': ['铜钱', '水晶', '商店', '小咕噜'],
    '金币': ['铜钱', '商店'],
    '技能': ['技能书', '招式', '羁绊'],
    '闪避': ['翻滚', '无敌', '暗影步', '身法'],
    '无敌': ['翻滚', '身法'],
    'boss': ['首领', '哥布林王', '红圈', '精英'],
    '大招': ['首领', '红圈', '红线', '精英'],
    '死': ['生命', '续关', '复活', '水晶'],
    '存档': ['口令', '卡带', '续关'],
    '操作': ['基础', '移动', '暂停', '翻滚'],
    '掉落': ['技能书', '水晶', '宝箱', '道具']
  };

  let CACHE = null;
  function buildIndex(helpTopics) {
    if (CACHE) return CACHE;
    const docs = [];
    const add = (cat, title, body, tags = '') => {
      if (!title) return;
      const clean = String(body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      docs.push({ cat, title: String(title), body: clean, raw: String(body || ''), hay: (cat + ' ' + title + ' ' + tags + ' ' + clean).toLowerCase() });
    };

    // 1. 帮助规则词条
    if (Array.isArray(helpTopics)) {
      for (const [t, h] of helpTopics) add('机制', t, h, '规则 帮助 玩法 概念');
    }
    add('机制', '存档与卡带口令', '游戏进度保存在当前浏览器中，可创建多个卡带存档并设置口令。中途关闭游戏，下次进入会回到当前站的开头。', '存档 口令 卡带 进度');
    add('机制', '同系技能书掉落', '击败怪物与开启宝箱掉落技能书时，与当前手持兵器同系的技能书权重更高，更容易凑齐流派羁绊。', '技能书 掉落 权重 同系');
    add('机制', '可破坏场景道具', '战场上会刷新木桶/罐子等可破坏道具，打碎可获得铜钱或补给，且关卡中途会额外刷新一次。', '道具 木桶 破坏 补给');

    const D = window.DATA || {};
    // 2. 英雄
    if (Array.isArray(D.heroes)) {
      for (const h of D.heroes) {
        if (h.locked) continue;
        add('英雄', h.name, `专属被动：${h.perk || '无'}${h.desc ? '。' + h.desc : ''}（不锁兵器，7类兵器均可自由搭配）`, `人物 角色 ${h.id}`);
      }
    }
    // 3. 兵器
    if (D.weapons) {
      const tMap = { str: '力量', agi: '敏捷', int: '智力' };
      for (const [id, w] of Object.entries(D.weapons)) {
        if (!w || w.hidden) continue;
        add('兵器', w.name || id, `主属性：${tMap[w.type] || w.type || '通用'}。${w.desc || ''}`, `武器 ${id}`);
      }
    }
    // 4. 技能书
    if (D.skills) {
      for (const [id, s] of Object.entries(D.skills)) {
        if (!s || s.debugOnly) continue;
        const meta = [s.sys ? s.sys + '系' : '', s.tier ? s.tier + '阶' : '', s.cd ? `冷却${s.cd}s` : ''].filter(Boolean).join(' · ');
        add('技能', s.name || id, `${meta ? '【' + meta + '】' : ''}${s.desc || s.tip || ''}`, `技能书 ${s.sys || ''} ${s.w || ''} ${(s.tags || []).join(' ')}`);
      }
    }
    // 5. 宝物
    if (Array.isArray(D.startItems)) {
      for (const it of D.startItems) {
        add('宝物', it.name || it.id, `${it.desc || ''}${it.price ? `（商店参考价：${it.price}铜钱）` : ''}`, `道具 遗物 ${it.w || ''}`);
      }
    }
    // 6. 身法印记
    if (D.oaths) {
      for (const [id, o] of Object.entries(D.oaths)) {
        if (!o || o.retired) continue;
        add('印记', o.name || id, o.desc || '', `身法 翻滚 ${o.w || ''}`);
      }
    }
    // 7. 流派羁绊
    if (D.sets) {
      for (const [sys, tiers] of Object.entries(D.sets)) {
        const desc = (tiers || []).map(t => `${t[0]}件：${t[1] || ''}`).join('；');
        add('羁绊', `${sys}系羁绊`, desc, `流派 套装 ${sys}`);
      }
    }
    // 8. 称号
    if (Array.isArray(D.titles)) {
      for (const ti of D.titles) {
        add('称号', ti.name || ti.id, `效果：${ti.desc || '无'}${ti.cond ? '；解锁条件：' + ti.cond : ''}`, '成就 称号');
      }
    }

    CACHE = docs;
    return docs;
  }

  function tokenize(q) {
    const s = q.toLowerCase()
      .replace(/[？?！!。，,、：:；;（）()【】\[\]"'“”‘’]/g, ' ')
      .replace(/(请问|告诉我|介绍一下|怎么|什么|有哪些|有什么|哪里|怎么用|怎么看|一下|的|吗|呢|啊|吧)/g, ' ')
      .trim();
    const parts = s.split(/\s+/).filter(Boolean);
    const toks = new Set(parts);
    for (const p of parts) {
      if (p.length >= 2) {
        for (let i = 0; i < p.length - 1; i++) toks.add(p.slice(i, i + 2));
      }
      for (const [k, vals] of Object.entries(SYN)) {
        if (p.includes(k)) vals.forEach(v => toks.add(v));
      }
    }
    return [...toks];
  }

  function search(q, helpTopics) {
    const docs = buildIndex(helpTopics);
    const raw = q.trim().toLowerCase();
    if (!raw) return [];
    const toks = tokenize(raw);
    const scored = [];
    for (const d of docs) {
      let sc = 0;
      const tl = d.title.toLowerCase();
      if (tl === raw) sc += 100;
      else if (tl.includes(raw) || raw.includes(tl)) sc += 45;
      if (d.cat.toLowerCase() === raw) sc += 40;
      for (const tk of toks) {
        if (!tk) continue;
        if (tl.includes(tk)) sc += tk.length >= 2 ? 16 : 6;
        else if (d.cat.toLowerCase().includes(tk)) sc += 14;
        else if (d.hay.includes(tk)) sc += tk.length >= 2 ? 7 : 2;
      }
      if (sc > 0) scored.push({ d, sc });
    }
    scored.sort((a, b) => b.sc - a.sc);
    return scored.slice(0, 5).map(x => x.d);
  }

  function ensureStyle() {
    if (document.getElementById('luminaAiCss')) return;
    const st = document.createElement('style');
    st.id = 'luminaAiCss';
    st.textContent = `
      .lai{display:flex;flex-direction:column;gap:8px;height:100%;min-height:300px;max-height:56vh;font-size:14px}
      .lai-hd{display:flex;align-items:center;gap:10px;padding:6px 8px;background:rgba(42,30,20,.65);border:1px solid #8a6a38;border-radius:4px}
      .lai-hd img{width:40px;height:40px;object-fit:cover;object-position:top;border:2px solid #c89a52;border-radius:4px;image-rendering:pixelated;background:#2a1e14}
      .lai-hd b{color:#ffd890;font-size:15px;display:block}.lai-hd small{color:#cbb998;font-size:12px}
      .lai-chips{display:flex;flex-wrap:wrap;gap:5px}
      .lai-chips button{background:#352619;color:#f2e2c2;border:1px solid #8c6a3a;border-radius:12px;padding:3px 9px;font-size:12px;cursor:pointer}
      .lai-chips button:hover{background:#4d3722;border-color:#ffd890}
      .lai-log{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding:6px;background:rgba(20,13,8,.55);border:1px solid #5e4628;border-radius:4px}
      .lai-msg{display:flex;flex-direction:column;gap:4px;max-width:94%}
      .lai-msg.u{align-self:flex-end;background:#4b351f;color:#fff3d6;padding:6px 10px;border-radius:8px 8px 2px 8px;border:1px solid #a07a44}
      .lai-msg.a{align-self:flex-start;background:#281d14;color:#efe3cb;padding:8px 10px;border-radius:8px 8px 8px 2px;border:1px solid #745834}
      .lai-card{margin-top:4px;padding:5px 8px;background:rgba(255,220,150,.07);border-left:3px solid #c89a52;border-radius:2px}
      .lai-tag{display:inline-block;font-size:11px;padding:0 5px;margin-right:5px;border-radius:3px;background:#6d4e27;color:#ffe6b0}
      .lai-card b{color:#ffd890}.lai-card p{margin:2px 0 0;font-size:12.5px;line-height:1.45;color:#e5d7be}
      .lai-bar{display:flex;gap:6px}
      .lai-bar input{flex:1;padding:6px 10px;background:#1c130c;color:#fff3d8;border:1px solid #9a7642;border-radius:4px;font-size:14px;outline:none}
      .lai-bar input:focus{border-color:#ffd890}
      .lai-bar button{padding:6px 14px;background:#8c5e24;color:#fff6dc;border:1px solid #d4a65a;border-radius:4px;cursor:pointer;font-weight:bold}
      .lai-bar button:hover{background:#a7712c}
    `;
    document.head.appendChild(st);
  }

  function render(container, helpTopics) {
    ensureStyle();
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'lai';
    wrap.innerHTML = `
      <div class="lai-hd">
        <img src="art/portrait/p.webp" alt="露米娜">
        <div><b>露米娜 AI 助手</b><small>卡带世界离线检索 · 实时同步英雄、兵器、技能、宝物与机制</small></div>
      </div>
      <div class="lai-chips"></div>
      <div class="lai-log"></div>
      <div class="lai-bar">
        <input type="text" placeholder="输入关键词提问，例如：阿远、镰刀、怎么回血、水晶、羁绊…" maxlength="40">
        <button type="button">提问</button>
      </div>
    `;
    const chips = wrap.querySelector('.lai-chips');
    const log = wrap.querySelector('.lai-log');
    const inp = wrap.querySelector('input');
    const sendBtn = wrap.querySelector('.lai-bar button');

    const appendMsg = (cls, html) => {
      const m = document.createElement('div');
      m.className = 'lai-msg ' + cls;
      m.innerHTML = html;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
    };

    const ask = (q) => {
      const text = (q || '').trim();
      if (!text) return;
      appendMsg('u', text.replace(/</g, '&lt;'));
      const hits = search(text, helpTopics);
      if (!hits.length) {
        appendMsg('a', `勇者大人，典籍里暂时没有找到「<b>${text.replace(/</g, '&lt;')}</b>」的直接记录。<br>可以试试搜：<b>英雄</b>、<b>兵器</b>、<b>翻滚</b>、<b>羁绊</b>、<b>水晶</b>、<b>称号</b>，或具体技能/角色名。`);
        return;
      }
      const cards = hits.map(h => `<div class="lai-card"><span class="lai-tag">${h.cat}</span><b>${h.title}</b><p>${h.body}</p></div>`).join('');
      appendMsg('a', `勇者大人，我为您检索到 ${hits.length} 条相关设定：${cards}`);
    };

    ['英雄', '兵器', '流派羁绊', '怎么回血', '翻滚与身法', '水晶与宫殿', '镰刀', '称号'].forEach(q => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = q;
      b.onclick = () => ask(q);
      chips.appendChild(b);
    });

    sendBtn.onclick = () => { ask(inp.value); inp.value = ''; inp.focus(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendBtn.click(); } };

    appendMsg('a', '勇者大人您好！我是<b>露米娜 AI 助手</b>。<br>点上方快捷词条，或直接输入任何游戏概念、英雄、武器、技能或道具名，我立刻为您查出来。');
    container.appendChild(wrap);
  }

  window.LUMINA_AI = { render, search };
})();
