(function () {
  var SHOP = window.SHOP_KEY, API = (window.SHOPS[SHOP] || {}).api;
  var app = document.getElementById('app');
  var cfg = null, sel = { date: '', time: '', qty: 1 }, rid = Math.random().toString(16).slice(2, 12);
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function dl(s) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yen(n) { return Number(n).toLocaleString('ja-JP') + '円'; }
  function call(action, data) {
    var u = API + '?action=' + action + (data ? '&data=' + encodeURIComponent(JSON.stringify(data)) : '');
    return fetch(u).then(function (r) { return r.json(); });
  }
  function load() {
    app.innerHTML = '<p class="sub">読み込んでいます…</p>';
    call('config').then(function (c) { cfg = c; if (!sel.date && c.dates.length === 1) sel.date = c.dates[0]; form(); })
      .catch(function () { app.innerHTML = '<p class="err">読み込めませんでした。電波の良い所でページを開き直してください。</p>'; });
  }
  function slotLeft(d, t) { var v = cfg.slots[d + ' ' + t]; return v === null || v === undefined ? Infinity : v; }
  function head() {
    return '<div class="shop">' + esc(cfg.shop) + '</div><h1>' + esc(cfg.product) + ' ご予約</h1>' +
      '<div class="card"><div>' + esc(cfg.desc) + '</div><div class="price">' + yen(cfg.price) + '<span class="sub">（税込）／1' + esc(cfg.unit) + '</span></div>' +
      '<div class="sub">お渡し：' + cfg.dates.map(dl).join('・') + '　' + esc(cfg.place) + '</div>' +
      (cfg.open ? '<div class="sub">残り ' + cfg.remain + esc(cfg.unit) + '</div>' : '') + '</div>';
  }
  function form(msg) {
    if (!cfg.open) {
      app.innerHTML = head() + '<div class="card"><b>' + (cfg.stopped ? '現在、Webでのご予約は受け付けていません。' : '予定数に達したため、受付を終了しました。') + '</b>' +
        '<p>お問い合わせはお電話で：<b>' + esc(cfg.tel) + '</b></p></div>'; return;
    }
    var max = Math.min(cfg.maxPer, cfg.remain), qo = '';
    for (var i = 1; i <= max; i++) qo += '<option' + (i === sel.qty ? ' selected' : '') + '>' + i + '</option>';
    var dates = cfg.dates.map(function (d) { return '<button type="button" class="chip" data-date="' + d + '" aria-pressed="' + (sel.date === d) + '">' + dl(d) + '</button>'; }).join('');
    var times = sel.date ? cfg.times.map(function (t) {
      var left = slotLeft(sel.date, t), full = left < sel.qty;
      return '<button type="button" class="chip" data-time="' + esc(t) + '" aria-pressed="' + (sel.time === t) + '"' + (full ? ' disabled' : '') + '>' + esc(t) + (left !== Infinity && !full ? '<span class="sub">（残' + left + '）</span>' : '') + '</button>';
    }).join('') : '<span class="sub">先に受取日を選んでください</span>';
    app.innerHTML = head() + '<form class="card" id="f">' +
      '<label for="qty">' + esc(cfg.unit === '台' ? '台数' : '個数') + '</label><select id="qty">' + qo + '</select>' +
      '<div class="sub">' + cfg.maxPer + esc(cfg.unit) + 'より多いときはお電話でご相談ください</div>' +
      '<label>受取日</label><div class="chips">' + dates + '</div>' +
      '<label>受取時間</label><div class="chips">' + times + '</div>' +
      '<label for="nm">お名前</label><input id="nm" autocomplete="name" value="' + esc(sel.name || '') + '">' +
      '<label for="tel">電話番号</label><input id="tel" type="tel" inputmode="numeric" autocomplete="tel" placeholder="09012345678" value="' + esc(sel.tel || '') + '">' +
      '<label for="note">ご要望（任意）</label><textarea id="note" maxlength="200">' + esc(sel.note || '') + '</textarea>' +
      '<p class="sub">お支払い：' + esc(cfg.pay) + '</p>' +
      (msg ? '<p class="err">' + esc(msg) + '</p>' : '') +
      '<button class="btn" type="submit">確認する</button></form>';
    var f = document.getElementById('f');
    f.addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b || b.disabled) return; keep();
      if (b.dataset.date) { sel.date = b.dataset.date; sel.time = ''; } else sel.time = b.dataset.time;
      form();
    });
    document.getElementById('qty').addEventListener('change', function () { keep(); form(); });
    f.addEventListener('submit', function (e) { e.preventDefault(); keep(); check(); });
  }
  function keep() {
    var q = document.getElementById('qty'); if (q) sel.qty = +q.value;
    ['nm', 'tel', 'note'].forEach(function (id) { var el = document.getElementById(id); if (el) sel[id === 'nm' ? 'name' : id] = el.value.trim(); });
    if (sel.time && slotLeft(sel.date, sel.time) < sel.qty) sel.time = '';
  }
  function check() {
    var tel = (sel.tel || '').replace(/[^\d]/g, '');
    if (!sel.date) return form('受取日を選んでください');
    if (!sel.time) return form('受取時間を選んでください');
    if (!sel.name) return form('お名前を入れてください');
    if (tel.length < 10 || tel.length > 11) return form('電話番号を確認してください');
    app.innerHTML = head() + '<div class="card"><b>ご予約内容の確認</b><table>' +
      '<tr><th>商品</th><td>' + esc(cfg.product) + ' × ' + sel.qty + esc(cfg.unit) + '</td></tr>' +
      '<tr><th>金額</th><td>' + yen(cfg.price * sel.qty) + '（税込）</td></tr>' +
      '<tr><th>受取</th><td>' + dl(sel.date) + ' ' + esc(sel.time) + '<br>' + esc(cfg.place) + '</td></tr>' +
      '<tr><th>お名前</th><td>' + esc(sel.name) + ' 様</td></tr><tr><th>電話番号</th><td>' + esc(tel) + '</td></tr>' +
      (sel.note ? '<tr><th>ご要望</th><td>' + esc(sel.note) + '</td></tr>' : '') + '</table>' +
      '<button class="btn" id="go">この内容で予約する</button><button class="btn sub2" id="back">戻って直す</button></div>';
    document.getElementById('back').onclick = function () { form(); };
    document.getElementById('go').onclick = function () {
      this.disabled = true; this.textContent = '送信しています…';
      call('reserve', { qty: sel.qty, date: sel.date, time: sel.time, name: sel.name, tel: tel, note: sel.note, rid: rid })
        .then(function (r) {
          if (!r.ok) { cfg = null; return call('config').then(function (c) { cfg = c; sel.time = r.code === 'slotfull' ? '' : sel.time; form(r.error); }); }
          app.innerHTML = head() + '<div class="card"><p>ご予約を承りました。ありがとうございます。</p>' +
            '<p class="sub">受付番号</p><p class="big">' + esc(r.no) + '</p>' +
            '<p>' + dl(sel.date) + ' ' + esc(sel.time) + ' に ' + esc(cfg.place) + ' でお渡しします。<br>' + esc(cfg.product) + ' × ' + sel.qty + esc(cfg.unit) + '　' + yen(cfg.price * sel.qty) + '（税込）</p>' +
            '<p class="sub">この画面を保存（スクリーンショット）しておいてください。変更・キャンセルはお電話で：' + esc(cfg.tel) + '</p></div>';
        })
        .catch(function () { form('送信できたか確認できませんでした。お手数ですがお電話（' + cfg.tel + '）でご確認ください。'); });
    };
  }
  load();
})();
