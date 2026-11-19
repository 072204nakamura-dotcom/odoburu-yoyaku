// 紙の予約表（店頭・電話用）。商品名・値段・受取日は「設定」「追加商品」シートから読むので、いつも予約フォームと同じ内容になる
(function () {
  var SHOP = window.SHOP_KEY, API = (window.SHOPS[SHOP] || {}).api;
  var app = document.getElementById('app');
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  function dl(s) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD[d.getDay()] + ')'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function yen(n) { return Number(n).toLocaleString('ja-JP') + '円'; }
  function boxes() { // 電話番号：1マスに1数字（3-4-4）
    var h = '';
    for (var i = 0; i < 11; i++) { if (i === 3 || i === 7) h += '<i class="gap">-</i>'; h += '<i></i>'; }
    return '<div class="tel">' + h + '</div>';
  }
  function slip(c) {
    var ex = c.extras || [], u = esc(c.unit), eu = esc(c.extraUnit || '枚');
    var rows = '<tr><td>' + esc(c.product) + '</td><td class="p">' + yen(c.price) + '</td><td class="q">' + u + '</td><td class="s">円</td></tr>' +
      ex.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="p">' + yen(x.price) + '</td><td class="q">' + eu + '</td><td class="s">円</td></tr>'; }).join('');
    return '<section class="slip">' +
      '<div class="hd"><div><div class="shop">' + esc(c.shop) + '</div><h1>' + esc(c.product) + (ex.length ? '・' + esc(c.extraTitle || 'ピザ') : '') + ' ご予約票</h1></div>' +
      '<div class="no">受付番号<b></b></div></div>' +
      '<div class="line"><span class="lb">受付</span><span class="small">　　月　　日</span><div class="chk"><span>店頭</span><span>電話</span><span>LINE</span></div><span class="small">受けた人</span><span class="fill"></span></div>' +
      '<div class="line"><span class="lb">お名前<br><span class="small">（カタカナ）</span></span><span class="fill"></span><span>様</span></div>' +
      '<div class="line"><span class="lb">電話番号</span>' + boxes() + '<span class="small">1マスに1数字</span></div>' +
      '<div class="line"><span class="lb">受取日<br><span class="small">（○で囲む）</span></span><div class="opt">' + c.dates.map(function (d) { return '<span>' + dl(d) + '</span>'; }).join('') + '</div></div>' +
      '<div class="line"><span class="lb">受取時間<br><span class="small">（○で囲む）</span></span><div class="opt">' + c.times.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '<table><tr><th>ご注文</th><th>1' + u + (ex.length ? '・1' + eu : '') + 'の値段（税込）</th><th>数</th><th>小計</th></tr>' + rows +
      '<tr class="sum"><td colspan="3" style="text-align:right">合計（税込）</td><td class="s">円</td></tr></table>' +
      '<div class="line"><span class="lb">お支払い</span><div class="chk"><span>前払い済</span><span>当日払い</span></div><span class="lb" style="flex-basis:14mm">ご要望</span><span class="fill"></span></div>' +
      '<div class="ft"><div class="note">店のメモ</div><div class="chk"><span>管理画面に登録した</span></div>' +
      '<div>お渡し：' + esc(c.place) + '　TEL ' + esc(c.tel) + '</div></div>' +
      '</section>';
  }
  if (!API) { app.innerHTML = '<p class="err">assets/shops.js にGASのURLが入っていません。</p>'; return; }
  app.innerHTML = '<p class="err" style="color:#444">読み込んでいます…</p>';
  fetch(API + '?action=config').then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.dates) throw new Error('config');
    document.title = c.product + ' 紙の予約表｜' + c.shop;
    app.innerHTML = '<div class="bar"><button id="pr">印刷する</button><span>A4たて・1枚に2件分。まん中の点線で切って使います。倍率は100%（実際のサイズ）で印刷してください。</span></div>' +
      '<div class="page">' + slip(c) + slip(c) + '</div>';
    document.getElementById('pr').onclick = function () { window.print(); };
  }).catch(function () { app.innerHTML = '<p class="err">読み込めませんでした。電波の良い所でページを開き直してください。</p>'; });
})();
