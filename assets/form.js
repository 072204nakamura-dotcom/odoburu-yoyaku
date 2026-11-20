(function () {
  var SHOP = window.SHOP_KEY, API = (window.SHOPS[SHOP] || {}).api;
  var app = document.getElementById('app');
  var cfg = null, sel = { date: '', time: '', qty: 1, items: {} }, rid = Math.random().toString(16).slice(2, 12);
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function dl(s) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yen(n) { return Number(n).toLocaleString('ja-JP') + '円'; }
  function call(action, data) {
    var u = API + '?action=' + action + (data ? '&data=' + encodeURIComponent(JSON.stringify(data)) : '');
    return fetch(u).then(function (r) { return r.json(); });
  }
  // 追加商品（ピザなど）。GASが古いとき・商品がないときは空で、今までどおりの画面になる
  function exs() { return (cfg && cfg.extras) || []; }
  function exTitle() { return cfg.extraTitle || 'ピザ'; }
  function exUnit() { return cfg.extraUnit || '枚'; }
  function exNum(x) { return sel.items[x.id] || 0; }
  function exCount() { return exs().reduce(function (n, x) { return n + exNum(x); }, 0); }
  function total() { return cfg.price * sel.qty + exs().reduce(function (n, x) { return n + x.price * exNum(x); }, 0); }
  // 注文の中身を1行ずつ（HTML用にエスケープ済み）
  function lines() {
    var a = [];
    if (sel.qty > 0) a.push(esc(cfg.product) + ' × ' + sel.qty + esc(cfg.unit));
    exs().forEach(function (x) { if (exNum(x) > 0) a.push(esc(x.name) + ' × ' + exNum(x) + esc(exUnit())); });
    return a;
  }
  function load() {
    app.innerHTML = '<p class="sub">読み込んでいます…</p>';
    call('config').then(function (c) {
      if (!c || !c.dates) throw new Error('config');
      cfg = c; if (!sel.date && c.dates.length === 1) sel.date = c.dates[0]; if (location.hash === '#cancel') cancelView(); else form();
    }).catch(function () { app.innerHTML = '<p class="err">読み込めませんでした。電波の良い所でページを開き直してください。</p>'; });
  }
  function slotLeft(d, t) { var v = cfg.slots[d + ' ' + t]; return v === null || v === undefined ? Infinity : v; }
  function head() {
    return '<div class="shop">' + esc(cfg.shop) + '</div><h1>' + esc(cfg.product) + ' ご予約</h1>' +
      '<div class="card"><div>' + esc(cfg.desc) + '</div><div class="price">' + yen(cfg.price) + '<span class="sub">（税込）／1' + esc(cfg.unit) + '</span></div>' +
      '<div class="sub">お渡し：' + cfg.dates.map(dl).join('・') + '　' + esc(cfg.place) + '</div>' +
      (cfg.open ? '<div class="sub">' + (cfg.remain > 0 ? '残り ' + cfg.remain + esc(cfg.unit) : esc(cfg.product) + 'は予定数に達しました') + '</div>' : '') + '</div>';
  }
  function foot() {
    return '<p class="sub" style="text-align:center;margin-top:24px"><a href="#cancel" id="cl">ご予約のキャンセルはこちら</a></p>';
  }
  function form(msg) {
    if (!cfg.open) {
      app.innerHTML = head() + '<div class="card"><b>' + (cfg.stopped ? '現在、Webでのご予約は受け付けていません。' : '予定数に達したため、受付を終了しました。') + '</b>' +
        '<p>お問い合わせはお電話で：<b>' + esc(cfg.tel) + '</b></p></div>' + foot(); bindFoot(); return;
    }
    var ex = exs(), max = Math.min(cfg.maxPer, cfg.remain), min = ex.length ? 0 : 1, qo = '';
    if (sel.qty > max) sel.qty = max;
    if (sel.qty < min) sel.qty = min;
    for (var i = min; i <= max; i++) qo += '<option' + (i === sel.qty ? ' selected' : '') + '>' + i + '</option>';
    var qtyLabel = cfg.unit === '台' ? '台数' : '個数';
    var exHtml = '';
    if (ex.length) {
      var exMax = cfg.extraMax || 10;
      exHtml = '<label>' + esc(exTitle()) + '</label>' +
        (cfg.remain > 0 ? '<div class="sub">' + esc(cfg.product) + 'なしで、' + esc(exTitle()) + 'だけのご予約もできます</div>' : '') +
        ex.map(function (x) {
          var o = '';
          for (var k = 0; k <= exMax; k++) o += '<option value="' + k + '"' + (k === exNum(x) ? ' selected' : '') + '>' + k + esc(exUnit()) + '</option>';
          return '<div class="exrow"><div><b>' + esc(x.name) + '</b>　' + yen(x.price) + '<span class="sub">（税込）</span>' +
            (x.desc ? '<br><span class="sub">' + esc(x.desc) + '</span>' : '') + '</div>' +
            '<select data-ex="' + esc(x.id) + '" aria-label="' + esc(x.name) + 'の数">' + o + '</select></div>';
        }).join('') +
        '<div class="sub">' + exMax + esc(exUnit()) + 'より多いときはお電話でご相談ください</div>' +
        '<p class="sum">合計 ' + yen(total()) + '<span class="sub">（税込）</span></p>';
    }
    var dates = cfg.dates.map(function (d) { return '<button type="button" class="chip" data-date="' + d + '" aria-pressed="' + (sel.date === d) + '">' + dl(d) + '</button>'; }).join('');
    var times = sel.date ? cfg.times.map(function (t) {
      var left = slotLeft(sel.date, t), full = left < sel.qty;
      return '<button type="button" class="chip" data-time="' + esc(t) + '" aria-pressed="' + (sel.time === t) + '"' + (full ? ' disabled' : '') + '>' + esc(t) + (left !== Infinity && !full ? '<span class="sub">（残' + left + '）</span>' : '') + '</button>';
    }).join('') : '<span class="sub">先に受取日を選んでください</span>';
    app.innerHTML = head() + '<form class="card" id="f">' +
      '<label for="qty">' + (ex.length ? esc(cfg.product) + 'の' : '') + esc(qtyLabel) + '</label><select id="qty">' + qo + '</select>' +
      (max > 0 ? '<div class="sub">' + cfg.maxPer + esc(cfg.unit) + 'より多いときはお電話でご相談ください</div>' : '') +
      exHtml +
      '<label>受取日</label><div class="chips">' + dates + '</div>' +
      '<label>受取時間</label><div class="chips">' + times + '</div>' +
      '<label for="nm">お名前</label><input id="nm" autocomplete="name" value="' + esc(sel.name || '') + '">' +
      '<label for="tel">電話番号</label><input id="tel" type="tel" inputmode="numeric" autocomplete="tel" placeholder="09012345678" value="' + esc(sel.tel || '') + '">' +
      '<label for="note">ご要望（任意）</label><textarea id="note" maxlength="200">' + esc(sel.note || '') + '</textarea>' +
      '<p class="sub">お支払い：' + esc(cfg.pay) + '</p>' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      '<button class="btn" type="submit">確認する</button></form>' + foot();
    bindFoot();
    var f = document.getElementById('f');
    f.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b || b.disabled) return; keep();
      if (b.dataset.date) { sel.date = b.dataset.date; sel.time = ''; } else sel.time = b.dataset.time;
      form();
    });
    document.getElementById('qty').addEventListener('change', function () { keep(); form(); });
    f.querySelectorAll('select[data-ex]').forEach(function (s) { s.addEventListener('change', function () { keep(); form(); }); });
    f.addEventListener('submit', function (e) { e.preventDefault(); keep(); check(); });
  }
  function keep() {
    var q = document.getElementById('qty'); if (q) sel.qty = +q.value;
    app.querySelectorAll('select[data-ex]').forEach(function (s) { sel.items[s.dataset.ex] = +s.value; });
    ['nm', 'tel', 'note'].forEach(function (id) { var el = document.getElementById(id); if (el) sel[id === 'nm' ? 'name' : id] = el.value.trim(); });
    if (sel.time && slotLeft(sel.date, sel.time) < sel.qty) sel.time = '';
  }
  function check() {
    var tel = (sel.tel || '').replace(/[^\d]/g, '');
    if (sel.qty < 1 && !exCount()) return form(cfg.product + 'か' + exTitle() + 'の数を選んでください');
    if (!sel.date) return form('受取日を選んでください');
    if (!sel.time) return form('受取時間を選んでください');
    if (!sel.name) return form('お名前を入れてください');
    if (tel.length < 10 || tel.length > 11) return form('電話番号を確認してください');
    var items = {};
    exs().forEach(function (x) { if (exNum(x) > 0) items[x.id] = exNum(x); });
    app.innerHTML = head() + '<div class="card"><b>ご予約内容の確認</b><table>' +
      '<tr><th>商品</th><td>' + lines().join('<br>') + '</td></tr>' +
      '<tr><th>金額</th><td>' + yen(total()) + '（税込）</td></tr>' +
      '<tr><th>受取</th><td>' + dl(sel.date) + ' ' + esc(sel.time) + '<br>' + esc(cfg.place) + '</td></tr>' +
      '<tr><th>お名前</th><td>' + esc(sel.name) + ' 様</td></tr><tr><th>電話番号</th><td>' + esc(tel) + '</td></tr>' +
      (sel.note ? '<tr><th>ご要望</th><td>' + esc(sel.note) + '</td></tr>' : '') + '</table>' +
      '<button class="btn" id="go">この内容で予約する</button><button class="btn sub2" id="back">戻って直す</button></div>';
    document.getElementById('back').onclick = function () { form(); };
    document.getElementById('go').onclick = function () {
      this.disabled = true; this.textContent = '送信しています…';
      var data = { qty: sel.qty, date: sel.date, time: sel.time, name: sel.name, tel: tel, note: sel.note, rid: rid };
      if (exCount()) data.items = items;
      call('reserve', data)
        .then(function (r) {
          if (!r.ok) { return call('config').then(function (c) { if (c && c.dates) cfg = c; sel.time = r.code === 'slotfull' ? '' : sel.time; form(r.error); }); }
          app.innerHTML = head() + '<div class="card"><p>ご予約を承りました。ありがとうございます。</p>' +
            '<p class="sub">受付番号</p><p class="big">' + esc(r.no) + '</p>' +
            '<p>' + dl(sel.date) + ' ' + esc(sel.time) + ' に ' + esc(cfg.place) + ' でお渡しします。<br>' +
            (exCount() ? lines().join('<br>') + '<br>合計 ' : lines().join('') + '　') + yen(total()) + '（税込）</p>' +
            '<p class="sub">この画面を保存（スクリーンショット）しておいてください。' + (cfg.telCancel ? 'キャンセルは、このページを開き直して下の「ご予約のキャンセルはこちら」から、お電話番号とお名前でできます。変更はお電話で：' : '変更・キャンセルはお電話で：') + esc(cfg.tel) + '</p></div>';
        })
        .catch(function () { form('送信できたか確認できませんでした。お手数ですがお電話（' + cfg.tel + '）でご確認ください。'); });
    };
  }
  function bindFoot() { var a = document.getElementById('cl'); if (a) a.onclick = function (e) { e.preventDefault(); cancelView(); }; }
  var cx = { no: '', tel: '', name: '' };
  function what(r) { return [r.qty > 0 ? esc(r.product) + ' × ' + r.qty + esc(r.unit) : '', esc(r.extra || '')].filter(String).join('<br>'); }
  function cancelView(msg) {
    app.innerHTML = head() + '<form class="card" id="cf"><b>ご予約のキャンセル</b>' +
      '<p class="sub">' + (cfg.telCancel ? 'ご予約のときのお電話番号とお名前を入れてください。受付番号がわかる場合は、受付番号も入れてください。' : 'ご予約のときに出た受付番号と、ご予約のお電話番号を入れてください。') +
      (cfg.cancelBy ? '<br>フォームからのキャンセルは ' + esc(cfg.cancelBy) + ' までです。' : '') +
      '<br>前払いいただいたご予約は、お電話（' + esc(cfg.tel) + '）でご連絡ください。</p>' +
      '<label for="c-tel">電話番号</label><input id="c-tel" type="tel" inputmode="numeric" placeholder="09012345678" value="' + esc(cx.tel) + '">' +
      (cfg.telCancel ? '<label for="c-nm">お名前</label><input id="c-nm" autocomplete="name" placeholder="ご予約のときと同じ書き方で" value="' + esc(cx.name) + '">' : '') +
      '<label for="c-no">受付番号' + (cfg.telCancel ? '（わかる場合だけ）' : '') + '</label><input id="c-no" placeholder="例：N1109-001" autocapitalize="characters" value="' + esc(cx.no) + '">' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      '<button class="btn">ご予約を確認する</button><button class="btn sub2" type="button" id="cb">予約の画面に戻る</button></form>';
    document.getElementById('cb').onclick = function () { form(); };
    document.getElementById('cf').onsubmit = function (e) {
      e.preventDefault();
      cx.no = document.getElementById('c-no').value.trim(); cx.tel = document.getElementById('c-tel').value.trim();
      var nmEl = document.getElementById('c-nm'); cx.name = nmEl ? nmEl.value.trim() : '';
      if (cfg.telCancel && !cx.no && !cx.name) return cancelView('お名前を入れてください');
      var btn = this.querySelector('.btn'); btn.disabled = true; btn.textContent = '確認しています…';
      lookup();
    };
  }
  function lookup() {
    call('lookup', { no: cx.no, tel: cx.tel, name: cx.name }).then(function (r) {
      if (!r.ok) return cancelView(r.error);
      if (r.many) return chooseView(r);
      confirmView(r);
    }).catch(function () { cancelView('読み込めませんでした。電波の良い所でもう一度お試しください。'); });
  }
  // 同じ電話番号のご予約が2件以上あるとき：どれを取り消すか選んでもらう
  function chooseView(r) {
    app.innerHTML = head() + '<div class="card"><b>この電話番号のご予約が ' + r.list.length + '件あります</b>' +
      '<p class="sub">キャンセルするご予約を選んでください。</p>' +
      r.list.map(function (x, i) {
        x.unit = r.unit; x.product = r.product;
        return '<table><tr><th>受付番号</th><td>' + esc(x.no) + '</td></tr>' +
          '<tr><th>内容</th><td>' + what(x) + '　' + yen(x.amount) + '</td></tr>' +
          '<tr><th>受取</th><td>' + dl(x.date) + ' ' + esc(x.time || '時間未定') + '</td></tr></table>' +
          '<button class="btn sub2" data-pick="' + i + '">このご予約を選ぶ</button>';
      }).join('') + '<button class="btn sub2" id="cno">やめる</button></div>';
    document.getElementById('cno').onclick = function () { form(); };
    app.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () { cx.no = r.list[+b.dataset.pick].no; b.disabled = true; b.textContent = '確認しています…'; lookup(); };
    });
  }
  function confirmView(r) {
    cx.no = r.no; // ここから先は受付番号で1件に決める
    app.innerHTML = head() + '<div class="card"><b>このご予約をキャンセルしますか？</b><table>' +
      '<tr><th>受付番号</th><td>' + esc(r.no) + '</td></tr>' +
      '<tr><th>内容</th><td>' + what(r) + '　' + yen(r.amount) + '</td></tr>' +
      '<tr><th>受取</th><td>' + dl(r.date) + ' ' + esc(r.time || '時間未定') + '</td></tr></table>' +
      '<button class="btn" id="cgo" style="background:var(--ng)">キャンセルする</button><button class="btn sub2" id="cno">やめる</button></div>';
    document.getElementById('cno').onclick = function () { form(); };
    document.getElementById('cgo').onclick = function () {
      this.disabled = true; this.textContent = '送信しています…';
      call('cancel', { no: cx.no, tel: cx.tel, name: cx.name }).then(function (r2) {
        if (!r2.ok) return cancelView(r2.error);
        cx.no = '';
        app.innerHTML = head() + '<div class="card"><p><b>' + esc(r2.no) + ' のご予約をキャンセルしました。</b></p>' +
          '<p class="sub">またのご利用をお待ちしております。</p><button class="btn sub2" id="cbk">予約の画面に戻る</button></div>';
        document.getElementById('cbk').onclick = function () { load(); };
      }).catch(function () { cancelView('送信できたか確認できませんでした。お手数ですがお電話（' + cfg.tel + '）でご確認ください。'); });
    };
  }
  load();
})();
