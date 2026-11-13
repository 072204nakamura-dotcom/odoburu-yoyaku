(function () {
  var SHOP = window.SHOP_KEY, API = (window.SHOPS[SHOP] || {}).api;
  var app = document.getElementById('app');
  var VIEW = 'res', P = null, basis = 'make';
  var KEY = 'odoburu-pass-' + SHOP, pass = '', D = null, filt = { date: '', q: '', hide: true }, editNo = '';
  try { pass = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function dl(s) { var p = String(s).split('-'); if (p.length < 3) return s; var d = new Date(+p[0], +p[1] - 1, +p[2]); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yen(n) { return Number(n).toLocaleString('ja-JP') + '円'; }
  function call(data) {
    data.pass = pass;
    return fetch(API + '?action=admin&data=' + encodeURIComponent(JSON.stringify(data))).then(function (r) { return r.json(); });
  }
  function login(msg) {
    app.innerHTML = '<h1>予約の管理</h1><form class="card" id="lf"><label for="pw">パスワード</label><input id="pw" type="password" autocomplete="current-password">' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') + '<button class="btn">開く</button></form>';
    document.getElementById('lf').onsubmit = function (e) { e.preventDefault(); pass = document.getElementById('pw').value; load(); };
  }
  function load() {
    app.innerHTML = '<p class="sub">読み込んでいます…</p>';
    call({ op: 'list' }).then(function (r) {
      if (!r.ok) { if (r.code === 'auth') { pass = ''; return login(r.error); } app.innerHTML = '<p class="err">' + esc(r.error) + '</p>'; return; }
      try { sessionStorage.setItem(KEY, pass); } catch (e) {}
      D = r; render();
    }).catch(function () { app.innerHTML = '<p class="err">読み込めませんでした。電波を確認して開き直してください。</p>'; });
  }
  function render() {
    var c = D.cfg, live = D.list.filter(function (x) { return x.state !== '取消'; });
    var sales = live.reduce(function (n, x) { return n + x.amount; }, 0);
    var paid = live.filter(function (x) { return x.paid !== '未'; }).reduce(function (n, x) { return n + x.amount; }, 0);
    var handed = live.filter(function (x) { return x.state === '受渡済'; }).reduce(function (n, x) { return n + x.qty; }, 0);
    var u = esc(c.unit);
    var slotRows = c.times.concat(['時間未定']).map(function (t) {
      return '<tr><td>' + esc(t) + '</td>' + c.dates.map(function (d) {
        var n = t === '時間未定' ? live.filter(function (x) { return x.date === d && !x.time; }).reduce(function (a, x) { return a + x.qty; }, 0) : (D.slots[d + ' ' + t] || 0);
        return '<td class="r">' + n + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var list = D.list.slice().reverse().filter(function (x) {
      if (filt.hide && x.state === '取消') return false;
      if (filt.date && x.date !== filt.date) return false;
      if (filt.q && (x.name + x.tel + x.no).indexOf(filt.q) < 0) return false;
      return true;
    });
    var opts = c.dates.map(function (d) { return '<option value="' + d + '">' + dl(d) + '</option>'; }).join('');
    var topts = '<option value="">時間未定</option>' + c.times.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    app.innerHTML =
      nav() + '<div class="row"><div><div class="shop">' + esc(c.shop) + '</div><h1>' + esc(c.product) + ' 予約管理</h1></div>' +
      '<div style="flex:0 0 auto" class="row"><button class="mini" id="rl">更新</button><button class="mini" id="op">' + (c.stopped ? 'Web受付を再開' : 'Web受付を停止') + '</button><button class="mini" id="tl">LINEテスト</button></div></div>' +
      '<div class="card"><div class="stats">' +
      '<div>予約数<b>' + D.total + ' / ' + D.cap + u + '</b></div><div>残り<b>' + Math.max(0, D.cap - D.total) + u + '</b></div>' +
      '<div>売上（税込）<b>' + yen(sales) + '</b></div><div>支払い済<b>' + yen(paid) + '</b></div><div>未払い<b>' + yen(sales - paid) + '</b></div><div>受渡済<b>' + handed + u + '</b></div>' +
      '</div><p class="sub">Web受付：' + (c.stopped ? '<span class="pill ng">停止中</span>' : c.open ? '<span class="pill ok">受付中</span>' : '<span class="pill ng">上限に達した</span>') + '</p></div>' +
      '<div class="card scroll"><b>受取時間ごとの数</b><table><tr><th>時間</th>' + c.dates.map(function (d) { return '<th class="r">' + dl(d) + '</th>'; }).join('') + '</tr>' + slotRows + '</table></div>' +
      '<details class="card"><summary><b>電話・店頭・LINEの予約を入力する</b></summary><form id="af">' +
      '<div class="row"><div><label for="a-via">受付方法</label><select id="a-via"><option>電話</option><option>店頭</option><option>LINE</option></select></div>' +
      '<div><label for="a-qty">数</label><input id="a-qty" type="number" min="1" value="1"></div></div>' +
      '<div class="row"><div><label for="a-date">受取日</label><select id="a-date">' + opts + '</select></div><div><label for="a-time">受取時間</label><select id="a-time">' + topts + '</select></div></div>' +
      '<div class="row"><div><label for="a-name">お名前</label><input id="a-name"></div><div><label for="a-tel">電話番号</label><input id="a-tel" type="tel" inputmode="numeric"></div></div>' +
      '<label><input type="checkbox" id="a-paid" style="width:auto"> 前払いでいただいた</label>' +
      '<label for="a-note">ご要望</label><input id="a-note"><label for="a-memo">店のメモ</label><input id="a-memo">' +
      '<p class="err" id="a-err"></p><button class="btn">予約を登録</button></form></details>' +
      (editNo ? editRow(D.list.filter(function (y) { return y.no === editNo; })[0]) : '') +
      '<div class="card"><div class="row"><select id="f-date"><option value="">すべての受取日</option>' + opts + '</select><input id="f-q" placeholder="名前・電話・受付番号で探す" value="' + esc(filt.q) + '">' +
      '<label style="flex:0 0 auto;margin:0;font-weight:400"><input type="checkbox" id="f-hide" style="width:auto"' + (filt.hide ? ' checked' : '') + '> 取消を隠す</label></div>' +
      '<div class="scroll"><table><tr><th>受付番号</th><th>受取</th><th>お名前・電話</th><th class="r">数</th><th>支払い</th><th>状態</th><th></th></tr>' +
      list.map(function (x) {
        return '<tr class="' + (x.state === '受渡済' ? 'done' : x.state === '取消' ? 'cancel' : '') + '"><td>' + esc(x.no) + '<br><span class="sub">' + esc(x.via) + '</span></td>' +
          '<td>' + dl(x.date) + '<br>' + esc(x.time || '時間未定') + '</td>' +
          '<td>' + esc(x.name) + '<br><a href="tel:' + esc(x.tel) + '">' + esc(x.tel) + '</a>' + (x.note ? '<br><span class="sub">要望：' + esc(x.note) + '</span>' : '') + (x.memo ? '<br><span class="sub">メモ：' + esc(x.memo) + '</span>' : '') + '</td>' +
          '<td class="r">' + x.qty + '<br><span class="sub">' + yen(x.amount) + '</span></td>' +
          '<td><select class="mini" data-pay="' + esc(x.no) + '">' + ['未', '前払い済', '当日払い済'].map(function (p) { return '<option' + (p === x.paid ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></td>' +
          '<td>' + (x.state === '取消' ? '<span class="pill ng">取消</span>' : '<button class="mini" data-hand="' + esc(x.no) + '">' + (x.state === '受渡済' ? '受渡済 ✓' : '受け渡す') + '</button>') + '</td>' +
          '<td>' + (x.state === '取消' ? '' : '<button class="mini" data-edit="' + esc(x.no) + '">変更</button> <button class="mini" data-memo="' + esc(x.no) + '">メモ</button> <button class="mini" data-cancel="' + esc(x.no) + '">取消</button>') + '</td></tr>';
      }).join('') + '</table></div><p class="sub">' + list.length + '件</p></div>';
    document.getElementById('f-date').value = filt.date;
    bind();
  }
  function editRow(x) {
    var c = D.cfg;
    var dO = c.dates.map(function (d) { return '<option value="' + d + '"' + (d === x.date ? ' selected' : '') + '>' + dl(d) + '</option>'; }).join('');
    var tO = '<option value="">時間未定</option>' + c.times.map(function (t) { return '<option' + (t === x.time ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
    if (!x) return '';
    return '<form class="card" id="ef" style="border-color:var(--main)"><b>' + esc(x.no) + ' を変更</b>' +
      '<div class="row"><div><label for="e-qty">数</label><input id="e-qty" type="number" min="1" value="' + x.qty + '"></div>' +
      '<div><label for="e-date">受取日</label><select id="e-date">' + dO + '</select></div><div><label for="e-time">受取時間</label><select id="e-time">' + tO + '</select></div></div>' +
      '<div class="row"><div><label for="e-name">お名前</label><input id="e-name" value="' + esc(x.name) + '"></div><div><label for="e-tel">電話番号</label><input id="e-tel" type="tel" value="' + esc(x.tel) + '"></div></div>' +
      '<label for="e-note">ご要望</label><input id="e-note" value="' + esc(x.note) + '">' +
      '<p class="err" id="e-err"></p><div class="row"><button class="btn" style="margin-top:8px">保存する</button><button class="btn sub2" type="button" id="e-no" style="margin-top:8px">やめる</button></div></form>';
  }
  function nav() {
    return '<div class="tabs noprint"><button class="tab' + (VIEW === 'res' ? ' on' : '') + '" data-view="res">予約</button>' +
      '<button class="tab' + (VIEW === 'plan' ? ' on' : '') + '" data-view="plan">仕込み予定</button></div>';
  }
  function bindNav() {
    app.querySelectorAll('[data-view]').forEach(function (b) {
      b.onclick = function () { VIEW = b.dataset.view; if (VIEW === 'plan') loadPlan(); else load(); };
    });
  }
  function loadPlan() {
    app.innerHTML = nav() + '<p class="sub">読み込んでいます…</p>'; bindNav();
    call({ op: 'plan' }).then(function (r) {
      if (!r.ok) { if (r.code === 'auth') { pass = ''; return login(r.error); } app.innerHTML = nav() + '<p class="err">' + esc(r.error) + '</p>'; bindNav(); return; }
      P = r; renderPlan();
    }).catch(function () { app.innerHTML = nav() + '<p class="err">読み込めませんでした。電波を確認して開き直してください。</p>'; bindNav(); });
  }
  function dkey(d) { var m = String(d).match(/(\d+)\D(\d+)/); return m ? (+m[1]) * 100 + (+m[2]) : 9999; }
  function amount(per, unit, n) {
    var v = per * n;
    if (unit === 'g' && v >= 1000) return (Math.round(v / 100) / 10).toLocaleString('ja-JP') + 'kg';
    if (unit === 'ml' && v >= 1000) return (Math.round(v / 100) / 10).toLocaleString('ja-JP') + 'L';
    return Math.round(v).toLocaleString('ja-JP') + unit;
  }
  function renderPlan() {
    var n = basis === 'make' ? P.make : P.total, u = esc(P.unit);
    var days = {};
    P.list.slice().sort(function (a, b) { return dkey(a.date) - dkey(b.date) || a.order - b.order; })
      .forEach(function (x) { (days[x.date] = days[x.date] || []).push(x); });
    var done = P.list.filter(function (x) { return x.done; }).length;
    app.innerHTML = nav() +
      '<div class="shop">' + esc(P.shop) + '</div><h1>' + esc(P.product) + ' 仕込み予定</h1>' +
      '<div class="card"><div class="row"><div><b>必要量は ' + n + u + ' 分で計算</b><br><span class="sub">仕込み数 ' + P.make + u + '／今の予約 ' + P.total + u + '／販売上限 ' + P.cap + u + '　完了 ' + done + '/' + P.list.length + '</span></div>' +
      '<div class="noprint" style="flex:0 0 auto"><button class="mini" id="bs">' + (basis === 'make' ? '今の予約数で計算' : '仕込み数で計算') + '</button> <button class="mini" id="pr">印刷する</button> <button class="mini" id="rl">更新</button></div></div></div>' +
      Object.keys(days).map(function (d) {
        return '<div class="card day"><h2 class="dh">' + esc(d) + '</h2><table><tr><th class="ck">済</th><th>作業</th><th class="r">必要量</th><th class="noprint"></th></tr>' +
          days[d].map(function (x) {
            return '<tr class="' + (x.done ? 'done' : '') + '"><td class="ck"><input type="checkbox" class="noprint" data-done="' + esc(x.id) + '"' + (x.done ? ' checked' : '') + '><span class="box printonly">' + (x.done ? '✓' : '') + '</span></td>' +
              '<td>' + esc(x.task) + (x.done && x.doneAt ? '<br><span class="sub noprint">済 ' + esc(x.doneAt) + '</span>' : '') + (x.memo ? '<br><span class="sub">' + esc(x.memo) + '</span>' : '') + '</td>' +
              '<td class="r num">' + (x.per ? amount(x.per, x.unit, n) + '<br><span class="sub">1' + u + ' ' + x.per + esc(x.unit) + '</span>' : '') + '</td>' +
              '<td class="noprint"><button class="mini" data-del="' + esc(x.id) + '">削除</button></td></tr>';
          }).join('') + '</table></div>';
      }).join('') +
      '<details class="card noprint"><summary><b>作業を追加する</b></summary><form id="pf"><div class="row">' +
      '<div><label for="p-date">日付</label><input id="p-date" placeholder="12/30"></div>' +
      '<div><label for="p-per">1' + u + 'あたりの量（任意）</label><input id="p-per" type="number" step="any"></div>' +
      '<div><label for="p-unit">単位</label><input id="p-unit" placeholder="g"></div></div>' +
      '<label for="p-task">作業</label><input id="p-task" placeholder="例：ローストビーフ 真空"><p class="err" id="p-err"></p><button class="btn">追加する</button></form></details>';
    bindNav();
    document.getElementById('bs').onclick = function () { basis = basis === 'make' ? 'now' : 'make'; renderPlan(); };
    document.getElementById('pr').onclick = function () { window.print(); };
    document.getElementById('rl').onclick = loadPlan;
    app.querySelectorAll('[data-done]').forEach(function (b) {
      b.onchange = function () { b.disabled = true; call({ op: 'planDone', id: b.dataset.done, done: b.checked }).then(function (r) { if (!r.ok) alert(r.error); loadPlan(); }); };
    });
    app.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { if (confirm('この作業を消しますか？')) call({ op: 'planDel', id: b.dataset.del }).then(loadPlan); };
    });
    document.getElementById('pf').onsubmit = function (e) {
      e.preventDefault();
      var v = function (id) { return document.getElementById(id).value.trim(); };
      call({ op: 'planAdd', date: v('p-date'), task: v('p-task'), per: v('p-per'), unit: v('p-unit') }).then(function (r) {
        if (!r.ok) { document.getElementById('p-err').textContent = r.error; return; }
        loadPlan();
      });
    };
  }
  function upd(d, done) { call(Object.assign({ op: 'update' }, d)).then(function (r) { if (!r.ok) alert(r.error); load(); }); }
  function bind() {
    bindNav();
    document.getElementById('rl').onclick = load;
    document.getElementById('tl').onclick = function () { call({ op: 'testLine' }).then(function (r) { alert(r.ok ? 'LINEに送りました' : r.error); }); };
    document.getElementById('op').onclick = function () { call({ op: 'setOpen', open: D.cfg.stopped }).then(load); };
    document.getElementById('f-date').onchange = function () { filt.date = this.value; render(); };
    document.getElementById('f-q').oninput = function () { filt.q = this.value.trim(); var p = this.selectionStart; render(); var el = document.getElementById('f-q'); el.focus(); el.setSelectionRange(p, p); };
    document.getElementById('f-hide').onchange = function () { filt.hide = this.checked; render(); };
    app.querySelectorAll('[data-pay]').forEach(function (s) { s.onchange = function () { upd({ no: s.dataset.pay, paid: s.value }); }; });
    app.querySelectorAll('[data-hand]').forEach(function (b) { b.onclick = function () { var x = D.list.filter(function (y) { return y.no === b.dataset.hand; })[0]; upd({ no: x.no, state: x.state === '受渡済' ? '予約' : '受渡済' }); }; });
    app.querySelectorAll('[data-cancel]').forEach(function (b) { b.onclick = function () { if (confirm(b.dataset.cancel + ' を取り消しますか？（元に戻せません）')) upd({ no: b.dataset.cancel, state: '取消' }); }; });
    app.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editNo = editNo === b.dataset.edit ? '' : b.dataset.edit; render(); var f = document.getElementById('ef'); if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    var ef = document.getElementById('ef');
    if (ef) {
      document.getElementById('e-no').onclick = function () { editNo = ''; render(); };
      ef.onsubmit = function (e) {
        e.preventDefault();
        var v = function (id) { return document.getElementById(id).value.trim(); };
        var btn = ef.querySelector('.btn'); btn.disabled = true; btn.textContent = '保存しています…';
        call({ op: 'edit', no: editNo, qty: +v('e-qty'), date: v('e-date'), time: v('e-time'), name: v('e-name'), tel: v('e-tel'), note: v('e-note') })
          .then(function (r) {
            if (!r.ok) { btn.disabled = false; btn.textContent = '保存する'; document.getElementById('e-err').textContent = r.error; return; }
            if (r.over) alert('保存しました。※合計が上限数を超えています');
            editNo = ''; load();
          });
      };
    }
    app.querySelectorAll('[data-memo]').forEach(function (b) { b.onclick = function () { var x = D.list.filter(function (y) { return y.no === b.dataset.memo; })[0]; var m = prompt('店のメモ', x.memo); if (m !== null) upd({ no: x.no, memo: m }); }; });
    document.getElementById('af').onsubmit = function (e) {
      e.preventDefault();
      var v = function (id) { return document.getElementById(id).value.trim(); };
      var btn = this.querySelector('.btn'); btn.disabled = true;
      call({ op: 'add', via: v('a-via'), qty: +v('a-qty'), date: v('a-date'), time: v('a-time'), name: v('a-name'), tel: v('a-tel'),
        paid: document.getElementById('a-paid').checked, note: v('a-note'), memo: v('a-memo'), rid: Math.random().toString(16).slice(2, 12) })
        .then(function (r) {
          if (!r.ok) { btn.disabled = false; document.getElementById('a-err').textContent = r.error; return; }
          alert('登録しました：' + r.no + (r.over ? '\n※上限数を超えています' : '')); load();
        });
    };
  }
  if (!API || API.indexOf('http') !== 0) { app.innerHTML = '<p class="err">assets/shops.js にGASのURLが入っていません。</p>'; return; }
  pass ? load() : login();
})();
