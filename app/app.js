/* 그린스캔 체험판 (웹앱 프로토타입)
 * - 데이터: 실물 조사 26개 제품, 점수 v2 (포장에서 확인한 근거만)
 * - 개인정보: 아무것도 서버로 보내지 않아요. 기준·포인트는 이 브라우저(localStorage)에만 저장돼요.
 */
(function () {
  'use strict';

  // ───────── 설정 (구글폼 '체험 연결용 링크'를 받으면 여기에 넣기, VARIANT 자리에 체험 코드가 들어가요)
  var CFG = {
    FORM_PREFILL: 'https://docs.google.com/forms/d/e/1FAIpQLSexvQyWUABNynciclQgYXIoGpo6T-z8-jQ-8pYjpklHF4S6Fg/viewform?usp=pp_url&entry.2093933943=%EB%84%A4,+%EC%B2%B4%ED%97%98%ED%95%B4+%EB%B4%A4%EC%96%B4%EC%9A%94&entry.557099612=VARIANT',
    FORM_PUBLIC: 'https://forms.gle/UNoDptDcptEePu118',
    FREE_SCANS: 3
  };

  var D = window.GS_DATA;
  var P = D.products;
  var byId = {}, byCode = {};
  P.forEach(function (p) { byId[p.id] = p; if (p.barcode) byCode[p.barcode] = p; });
  var W = D.weights;

  // ───────── 상태
  var KEY = 'gs_state_v1';
  var st = (function () {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
    var v = new URLSearchParams(location.search).get('v');
    if (v === 'A' || v === 'B') s.variant = v;
    if (!s.variant) s.variant = Math.random() < 0.5 ? 'A' : 'B';
    s.points = s.points || 0;
    s.views = s.views || [];
    s.reported = s.reported || [];
    s.logged = !!s.logged;
    s.crit = s.crit || null;
    return s;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  save();

  // ───────── 유틸
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var IC = {
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M8 9v6M11 9v6M14 9v6M17 9v6"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s4 1 6 1c2 0 6 2 6-1s-4-3-6 1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
    q: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.4M12 17v.5"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
    recycle: '<path d="M7 19H4l3-5M17 19h3l-3-5M9 5l3-2 3 5"/><path d="M7 19h10M12 3l-5 9M17 14l-5-9"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    compare: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="15.5" cy="7" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M8 17c0-3 2-5 4.5-5S17 14 17 17c0 2-2 3-4.5 2.2C10 20 8 19.5 8 17z"/>',
    tree: '<path d="M12 21v-5M12 3l6 8h-3l4 5H5l4-5H6z"/>',
    wave: '<path d="M3 15c3 0 3-3 6-3s3 3 6 3 3-3 6-3M3 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'
  };
  function ic(n, size, color) {
    return '<svg class="ic" viewBox="0 0 24 24" style="font-size:' + (size || 18) + 'px' + (color ? ';color:' + color : '') + '">' + (IC[n] || '') + '</svg>';
  }
  function grade(t) { return t === 0 ? '정보 없음' : t >= 80 ? '근거 충분' : t >= 60 ? '근거 양호' : t >= 40 ? '근거 보통' : '근거 부족'; }
  var PIL = {
    E: { ko: '환경', en: 'Environment', q: '포장이 쓰레기를 덜 남기나요?' },
    S: { ko: '사회', en: 'Social', q: '동물을 해치지 않고 만들었나요?' },
    G: { ko: '지배구조', en: 'Governance', q: '회사가 근거를 공개하나요?' }
  };
  var CRIT = { vegan: '비건 확인', eco: '친환경 실천', both: '둘 다' };
  function critKey() { return st.crit === 'vegan' ? 'S' : st.crit === 'eco' ? 'E' : null; }
  function avatar(p, size) {
    size = size || 46;
    if (p.photo) return '<img src="../assets/img/' + p.photo + '.png" alt="" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + size * 0.3 + 'px;object-fit:cover;flex:none">';
    return '<div class="ups circ" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + size * 0.3 + 'px;font-family:var(--serif);font-weight:700;color:var(--forest);font-size:' + size * 0.36 + 'px">' + esc(p.brand.charAt(0)) + '</div>';
  }
  function certKey(p) {
    var ev = (p.items.filter(function (i) { return i.k === 'vegan'; })[0] || {}).ev || '';
    return ev.indexOf('weVegan') >= 0 ? 'wevegan' : ev.indexOf('V-Label') >= 0 ? 'vlabel' : '';
  }
  function verdict(p) {
    var s1 = p.items.filter(function (i) { return i.k === 'vegan'; })[0];
    if (p.vegan === '인증 확인') return { cls: 'ok', icon: 'check', t: '비건 인증 확인', s: s1.ev, mark: certKey(p) };
    if (p.vegan.indexOf('표기만') === 0) return { cls: 'neg', icon: 'info', t: '비건 표기만 있어요', s: '인증 기관 이름이 없는 브랜드 자체 표시예요. 누가 확인했는지 알 수 없어요.', mark: 'phrase' };
    if (p.vegan === '동물성 원료 있음') return { cls: 'neg', icon: 'x', t: '동물성 원료가 있어요', s: s1.ev };
    return { cls: 'none', icon: 'q', t: '비건 정보가 없어요', s: '포장에서 비건 표시나 인증을 찾지 못했어요. 비건이 아니라는 뜻은 아니에요.' };
  }
  function gauge(v, size) {
    size = size || 148;
    var r = 56, c = 2 * Math.PI * r, f = Math.max(0, Math.min(100, v)) / 100 * c;
    return '<div style="position:relative;width:' + size + 'px;height:' + size + 'px;flex:none">' +
      '<svg viewBox="0 0 140 140" width="' + size + '" height="' + size + '"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D3E8A8"/><stop offset="1" stop-color="#6E9A7A"/></linearGradient></defs>' +
      '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="#DCE5D9" stroke-width="12"/>' +
      (v > 0 ? '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + f.toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 70 70)"/>' : '') +
      '</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<div class="serif" style="font-size:' + size * 0.3 + 'px;line-height:1">' + v + '<span style="font-size:' + size * 0.11 + 'px;color:var(--mute);font-family:var(--sans);font-weight:500">점</span></div>' +
      '<div style="font-size:12px;font-weight:700;color:' + (v === 0 ? 'var(--mute)' : 'var(--forest)') + ';margin-top:4px">' + grade(v) + '</div></div></div>';
  }
  function bar(v, color) {
    return '<div class="in" style="height:10px;border-radius:5px;flex:1;overflow:hidden"><div style="height:100%;width:' + v + '%;border-radius:5px;background:' + (color || 'linear-gradient(90deg,#D3E8A8,#6E9A7A)') + '"></div></div>';
  }
  function top(title, en, back) {
    return '<header class="top"><button class="ups circ tb-btn" data-back aria-label="뒤로" style="' + (back === false ? 'visibility:hidden' : '') + '">' + ic('back', 18) + '</button>' +
      '<div style="text-align:center"><div style="font-size:15.5px;font-weight:700">' + esc(title) + '</div>' + (en ? '<div class="en" style="font-size:10.5px">' + esc(en) + '</div>' : '') + '</div>' +
      '<span class="pill" style="font-size:11px;font-weight:700;color:var(--forest);background:var(--lime-l);height:24px;padding:0 9px">체험판</span></header>';
  }
  function h1(a, b, en) {
    return (en ? '<div class="en" style="margin-top:6px">' + esc(en) + '</div>' : '') +
      '<h1 class="serif" style="font-size:28px;line-height:1.3;margin:6px 0 0">' + a + (b ? '<br><span class="hl">' + b + '</span>' : '') + '</h1>';
  }
  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }
  function go(h) { location.hash = h; }

  // ───────── 인증 마크 설명 (출처 포함)
  var MARKS = {
    wevegan: {
      name: 'weVegan®', kind: '제3자 비건 인증', img: 'mark_wevegan.jpg',
      who: '글로벌표준인증원(GSC)이 운영하는 비건 인증이에요. 2024년에 도입됐어요.',
      checks: ['동물성 원료를 쓰지 않았는지', '생산 과정에서 동물성 원료가 섞이지 않는지(교차오염)', '동물실험을 하지 않았는지', 'DNA 검사로 동물 유래 성분 확인'],
      how: '상자에 인증 마크가 인쇄돼 있어요. 실물 조사에서 어뮤즈 7개 제품이 이 마크를 달고 있었어요.',
      score: '사회(S)의 \'동물성 원료 없음\' 50점 + \'동물실험 안 함\' 50점으로 반영해요. 따로 가산점은 더하지 않아요.',
      src: [['코스모닝 (2024-06-20)', 'https://cosmorning.com/news/article.html?no=48279']]
    },
    vlabel: {
      name: 'V-Label', kind: '제3자 비건 인증', img: 'mark_vlabel.jpg',
      who: '국제 비건·채식 상표예요. 화장품은 인증 기관(예: SGS)이 현장 심사를 하고, 제품마다 인증서가 나와요.',
      checks: ['원료·첨가물·공정 보조제의 출처', '동물실험 여부', '교차오염을 막는 조치', 'GMO가 있으면 신고', '현장 심사 후 정기 심사로 유지'],
      how: '마크 둘레에 \'V-LABEL INTERNATIONAL\', 아래에 \'VEGAN\'이 적혀 있어요. 실물 조사에서 바닐라코·달바 제품에서 확인했어요.',
      score: '사회(S)의 \'동물성 원료 없음\' 50점 + \'동물실험 안 함\' 50점으로 반영해요.',
      src: [['SGS (2023-01-20)', 'https://www.sgs.com/news/2023/01/v-label-for-cosmetics-personal-care-and-household-products']]
    },
    phrase: {
      name: '\'VEGAN\' 문구·자체 로고', kind: '브랜드 자체 표기', img: 'mark_phrase.jpg',
      who: '\'I\'M VEGAN\', \'Vegan®\' 로고처럼 인증 기관 이름이 없는 표시예요. 브랜드가 직접 쓴 문구라서 누가 확인했는지 알 수 없어요.',
      checks: ['인증 기관 이름이 적혀 있는지 → 없음', '조회할 인증 번호가 있는지 → 없음'],
      how: '실물 조사에서 브링그린 립에센스, 토리든 마스크, 투쿨포스쿨 브러쉬가 이런 표시만 있었어요.',
      score: '\'동물성 원료 없음\' 50점 중 15점만 줘요. 동물실험은 확인할 수 없어 \'정보 없음\'이에요.',
      src: []
    },
    fsc: {
      name: 'FSC', kind: '종이 포장 인증', img: 'mark_wevegan.jpg',
      who: '산림관리협의회(Forest Stewardship Council) 인증이에요. 숲을 책임 있게 관리해서 나온 종이라는 뜻이에요.',
      checks: ['FSC 100%: 전부 인증 숲 원료', 'FSC RECYCLED: 재활용 소재 100%', 'FSC MIX: 인증 숲 원료 + 재활용 소재 + 관리 목재', '라이선스 코드(C로 시작)로 공식 사이트에서 회사·인증 상태 조회'],
      how: '나무 모양 로고 옆의 \'C162700\' 같은 번호를 봐요. 포장재 인증이라 내용물까지 인증된 건 아니에요.',
      score: '환경(E) \'숲을 지킨 종이\' 15점 + 번호로 조회할 수 있어서 지배구조(G) \'인증 번호 조회 가능\' 40점이에요.',
      src: [['비건뉴스 (2026-08-28)', 'https://www.vegannews.co.kr/news/article.html?no=385011']]
    },
    soy: {
      name: 'SOY INK', kind: '콩기름 잉크 인쇄', img: 'mark_wevegan.jpg',
      who: '미국대두협회(ASA)가 라이선스를 주는 마크예요. 잉크 종류별로 정해진 비율 이상 콩기름을 써야 쓸 수 있어요.',
      checks: ['매엽 인쇄 잉크는 콩기름 20% 이상', '히트셋 잉크는 7% 이상 (잉크 종류마다 다름)', '휘발성 유기화합물이 적고, 종이 재활용 때 잉크가 잘 빠진다고 알려져 있어요'],
      how: '콩 모양 공식 로고와 \'SOY INK\' 글자를 봐요. 글자만 있거나 다른 아이콘이면 공식 로고가 아니에요.',
      score: '환경(E) \'콩기름 잉크\' 공식 로고 15점, 문구·다른 아이콘만 있으면 5점이에요.',
      src: [['American Soybean Association', 'https://soygrowers.com/soy-ink-seal/'], ['Soy New Uses (2023-09-21)', 'https://soynewuses.org/blog/soy-based-ink-provides-performance-edge/']]
    },
    grade: {
      name: '재활용 등급 표시', kind: '포장재 재활용 쉬움 등급', img: 'mark_hard.jpg',
      who: '포장재가 얼마나 재활용하기 쉬운지 4단계(최우수·우수·보통·어려움)로 평가해요. \'재활용 어려움\'은 표시해야 해요.',
      checks: ['2022년 한국소비자원 조사: 화장품 294개 중 62.6%가 \'재활용 어려움\' 등급', '최우수·우수 제품 45개 중 등급을 표시한 건 8개(17.8%)뿐'],
      how: '용기나 상자에 \'재활용 어려움\', \'재활용 보통\' 같은 글자를 찾아요. 비건 인증 핸드크림 튜브에서도 \'재활용 어려움\'을 확인했어요.',
      score: '환경(E) 최우수·우수 25점, 보통 12점, 어려움 0점. 그리고 등급을 숨기지 않고 표시하면 좋든 나쁘든 지배구조(G) \'등급 공개\' 30점이에요.',
      src: [['매일신문 (2023-03-28)', 'https://www.imaeil.com/page/view/2023032814313032320']]
    }
  };

  // ───────── 화면들
  var V = {};

  V.start = function () {
    var sel = st._pick || st.crit || 'vegan';
    function disc(k, icon, label, size, sub) {
      var on = sel === k;
      return '<button data-pick="' + k + '" class="' + (on ? 'fill' : 'up') + ' circ" style="width:' + size + 'px;height:' + size + 'px;border:0;flex-direction:column;gap:6px;cursor:pointer;color:' + (on ? '#fff' : 'var(--forest)') + '">' +
        ic(icon, size * 0.22) + '<span class="serif" style="font-size:' + Math.round(size * 0.12) + 'px;color:' + (on ? '#fff' : 'var(--ink)') + '">' + label + '</span>' +
        (sub ? '<span style="font-size:11px;opacity:.85;line-height:1.3">' + sub + '</span>' : '') + '</button>';
    }
    return '<div class="pad">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;height:56px">' + wordmark() + '<a class="mute" href="#/home" data-skip style="font-size:14px;text-decoration:none">건너뛰기</a></div>' +
      h1('어떤 기준으로', '확인할까요?', 'Choose what matters to you') +
      '<p class="ink2" style="font-size:14.5px;margin:10px 0 0">고른 기준을 결과 화면과 비교에서 먼저 보여드려요.</p>' +
      '<div style="position:relative;height:330px;margin-top:26px">' +
      '<div style="position:absolute;left:0;top:0;text-align:center">' + disc('vegan', 'leaf', '비건 확인', 148) + '<div class="ink2" style="font-size:12.5px;margin-top:10px">비건 인증 먼저</div></div>' +
      '<div style="position:absolute;right:0;top:0;text-align:center">' + disc('eco', 'recycle', '친환경 실천', 148) + '<div class="ink2" style="font-size:12.5px;margin-top:10px">포장·재활용 먼저</div></div>' +
      '<div style="position:absolute;left:50%;transform:translateX(-50%);top:206px">' + disc('both', 'spark', '둘 다', 104) + '</div></div>' +
      '<button class="btn fill" data-act="startgo" style="margin-top:20px">이 기준으로 시작하기</button>' +
      '<p class="mute" style="text-align:center;font-size:12.5px;margin:12px 0 0">가입 없이 ' + CFG.FREE_SCANS + '번까지 무료로 볼 수 있어요</p></div>';
  };

  function wordmark() {
    return '<div style="display:flex;align-items:center;gap:8px"><div class="fill circ" style="width:30px;height:30px">' + ic('leaf', 16, '#fff') + '</div><span class="serif" style="font-size:18px">그린스캔</span><span class="en" style="font-size:10px;margin-left:2px">GreenScan</span></div>';
  }

  V.home = function () {
    var recent = st.views.slice(-3).reverse().map(function (id) { return byId[id]; }).filter(Boolean);
    var noinfo = P.filter(function (p) { return p.cov === 0; }).length;
    return '<div class="pad">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;height:56px">' + wordmark() +
      '<a href="#/start" class="pill ups" style="height:32px;padding:0 12px;font-size:12.5px;font-weight:700;text-decoration:none;color:var(--forest)">' + ic(st.crit === 'eco' ? 'recycle' : st.crit === 'both' ? 'spark' : 'leaf', 14) + ' ' + (CRIT[st.crit] || '기준 고르기') + '</a></div>' +
      h1('찍으면 보여요.', '진짜 비건인지, 친환경인지.', 'Scan a barcode, see the proof') +
      '<a href="#/scan" class="up" style="display:flex;align-items:center;gap:16px;padding:18px;margin-top:20px;text-decoration:none;border-radius:28px">' +
      '<div class="lime circ" style="width:64px;height:64px">' + ic('scan', 30, '#fff') + '</div>' +
      '<div style="flex:1"><div style="font-size:17px;font-weight:800">바코드 찍기</div><div class="ink2" style="font-size:13px">카메라로 찍거나, 체험용 제품을 골라요</div></div>' + ic('next', 18, 'var(--mute)') + '</a>' +
      // 점수 기준을 앞으로
      '<div class="up" style="padding:18px;margin-top:18px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline"><div><div class="en">How the score works</div><div class="serif" style="font-size:19px;margin-top:2px">점수는 이렇게 매겨요</div></div><a class="link" href="#/criteria" style="font-size:13px">자세히' + ic('next', 14) + '</a></div>' +
      ['E', 'S', 'G'].map(function (k) {
        return '<div style="display:flex;gap:12px;align-items:center;margin-top:12px"><div class="ups circ" style="width:40px;height:40px;font-weight:800;color:var(--forest)">' + k + '</div>' +
          '<div style="flex:1"><div style="font-size:14px;font-weight:700">' + PIL[k].ko + ' <span class="mute" style="font-weight:500;font-size:12px">' + PIL[k].en + ' · ' + Math.round(W[k] * 100) + '%</span></div><div class="ink2" style="font-size:13px">' + PIL[k].q + '</div></div></div>';
      }).join('') +
      '<div class="in" style="padding:11px 13px;margin-top:14px;font-size:12.5px;color:var(--ink2)">포장과 공식 자료에서 <b>확인한 근거만</b> 점수에 넣어요. 확인 못 하면 0점이고, \'정보 없음\'으로 따로 보여드려요.</div></div>' +
      // 평균
      '<a href="#/list" class="up" style="display:block;padding:18px;margin-top:18px;text-decoration:none">' +
      '<div class="en">Our field data</div><div style="display:flex;align-items:flex-end;gap:10px;margin-top:4px"><div class="serif" style="font-size:40px;line-height:1">' + Math.round(D.avg) + '<span style="font-size:16px">점</span></div>' +
      '<div class="ink2" style="font-size:13px;padding-bottom:4px">직접 산 화장품 ' + P.length + '개의 평균</div></div>' +
      '<div class="ink2" style="font-size:13px;margin-top:8px">' + noinfo + '개는 포장에서 확인할 근거가 하나도 없었어요. <span class="link">전체 보기' + ic('next', 13) + '</span></div></a>' +
      // 처음이라면
      '<a href="#/guide" class="soft" style="display:flex;gap:14px;align-items:center;padding:18px;margin-top:18px;border-radius:26px;text-decoration:none;box-shadow:6px 8px 18px var(--sh),-5px -5px 14px var(--hi)">' +
      '<div class="ups circ" style="width:48px;height:48px;color:var(--lime-d)">' + ic('spark', 22) + '</div><div style="flex:1"><div style="font-size:15.5px;font-weight:800">비건 화장품, 처음이라면?</div><div class="ink2" style="font-size:13px">인증 마크 구분부터 3단계로 알려드려요</div></div>' + ic('next', 18, 'var(--mute)') + '</a>' +
      (recent.length ? '<div class="serif" style="font-size:18px;margin:26px 0 10px">최근 본 제품</div>' + recent.map(row).join('') : '') +
      '<a href="#/done" class="in" style="display:flex;align-items:center;gap:10px;padding:14px 16px;margin-top:22px;text-decoration:none;font-size:13.5px">' + ic('file', 18, 'var(--forest)') + '<span style="flex:1">다 써봤다면 <b>1분 설문</b>에 참여해 주세요</span>' + ic('next', 14, 'var(--mute)') + '</a>' +
      '</div>';
  };

  function row(p) {
    var v = verdict(p);
    return '<a href="#/p/' + p.id + '" class="up" style="display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:12px;text-decoration:none;border-radius:22px">' + avatar(p, 46) +
      '<div style="flex:1;min-width:0"><div class="mute" style="font-size:12px">' + esc(p.brand) + ' · ' + esc(p.cat) + '</div><div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</div>' +
      '<span class="chip ' + v.cls + '" style="margin-top:4px;height:20px;font-size:11px">' + esc(v.t) + '</span></div>' +
      '<div style="text-align:right"><div class="serif" style="font-size:22px">' + p.total + '</div><div class="mute" style="font-size:11px">' + p.cov + '/' + p.n + ' 확인</div></div></a>';
  }

  V.list = function (q) {
    var cat = q.get('c') || '전체';
    var cats = ['전체'].concat(Object.keys(D.catavg));
    var items = P.filter(function (p) { return cat === '전체' || p.cat === cat; }).slice().sort(function (a, b) { return b.total - a.total || b.cov - a.cov; });
    return top('조사한 제품', 'All 26 products') + '<div class="pad">' +
      h1('직접 사서', '하나씩 확인했어요.', 'Field survey · Nov 2026') +
      '<p class="ink2" style="font-size:13.5px;margin:10px 0 14px">창업지원금으로 산 ' + P.length + '개 제품의 상자·용기를 사진으로 확인했어요. 평균 ' + Math.round(D.avg) + '점' + (cat !== '전체' ? ', ' + esc(cat) + ' 평균 ' + Math.round(D.catavg[cat]) + '점' : '') + '이에요.</p>' +
      '<div class="hscroll">' + cats.map(function (c) { return '<a href="#/list?c=' + encodeURIComponent(c) + '" class="pill ' + (c === cat ? 'fill' : 'ups') + '" style="height:34px;padding:0 14px;font-size:13px;font-weight:700;text-decoration:none">' + esc(c) + '</a>'; }).join('') + '</div>' +
      '<div style="margin-top:16px">' + items.map(row).join('') + '</div></div>';
  };

  V.scan = function () {
    var withCode = P.filter(function (p) { return p.barcode; });
    return top('스캔', 'Scan') + '<div class="pad">' +
      h1('바코드를', '비춰 주세요.', 'Point your camera at the barcode') +
      '<div class="in" style="margin-top:18px;border-radius:26px;overflow:hidden;position:relative;aspect-ratio:4/3">' +
      '<div id="reader" style="width:100%;height:100%"></div>' +
      '<div id="camcover" style="position:absolute;inset:0;background:url(../assets/img/scan_photo.jpg) center/cover;display:flex;align-items:flex-end;justify-content:center;padding:16px">' +
      '<button class="btn lime" data-act="cam" style="width:auto;padding:0 22px;height:50px">' + ic('camera', 20, '#fff') + ' 카메라 켜기</button></div></div>' +
      '<p class="mute" style="font-size:12px;margin:8px 4px 0">카메라 영상은 이 기기 안에서만 바코드 인식에 쓰고, 어디에도 저장하거나 보내지 않아요.</p>' +
      '<form data-form="code" class="up" style="display:flex;gap:8px;padding:8px;margin-top:16px;border-radius:22px">' +
      '<input id="codein" inputmode="numeric" autocomplete="off" placeholder="바코드 숫자 13자리 입력" aria-label="바코드 숫자" class="in" style="flex:1;border:0;height:46px;padding:0 14px;font-size:15px;border-radius:16px;color:var(--ink);font-family:inherit">' +
      '<button class="btn fill" style="width:auto;flex:none;white-space:nowrap;padding:0 18px;height:46px;font-size:14px">찾기</button></form>' +
      '<div class="serif" style="font-size:18px;margin:24px 0 4px">체험용 제품</div><p class="mute" style="font-size:12.5px;margin:0 0 12px">실제 제품이 없으면 눌러서 스캔한 것처럼 볼 수 있어요.</p>' +
      withCode.map(function (p) {
        return '<button data-scan="' + p.barcode + '" class="up" style="display:flex;width:100%;gap:12px;align-items:center;padding:12px 14px;margin-bottom:10px;border:0;border-radius:20px;text-align:left;cursor:pointer;color:var(--ink)">' + avatar(p, 40) +
          '<div style="flex:1;min-width:0"><div class="mute" style="font-size:11.5px">' + esc(p.brand) + '</div><div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</div></div>' +
          '<span class="mute" style="font-size:11px;font-variant-numeric:tabular-nums">' + p.barcode.slice(-4) + '</span>' + ic('scan', 18, 'var(--forest)') + '</button>';
      }).join('') + '</div>';
  };

  V.nf = function (code) {
    return top('결과', 'Not found yet') + '<div class="pad">' + h1('아직 그린스캔에', '없는 제품이에요.', 'Not in our database yet') +
      '<p class="ink2" style="font-size:14px">바코드 ' + esc(code) + '는 아직 확인한 근거가 없어요. 상자나 용기의 인증 마크·재활용 표시를 찍어 보내 주시면 확인해서 점수를 만들어요.</p>' +
      '<button class="btn fill" data-act="report" data-id="nf-' + esc(code) + '" style="margin-top:18px">' + ic('camera', 20, '#fff') + ' 사진으로 알려주기 +100P</button>' +
      '<a class="btn sec" href="#/scan" style="margin-top:12px">다시 찍기</a></div>';
  };

  V.product = function (id) {
    var p = byId[id];
    if (!p) return V.nf(id);
    if (st.views.indexOf(id) < 0) { st.views.push(id); st.points += 10; save(); }
    var v = verdict(p);
    var ck = critKey();
    var verdictCard = '<div class="up" style="padding:18px;margin-top:16px">' +
      '<div class="en">' + (st.variant === 'A' ? 'Step 1 · Is it really vegan?' : 'Is it really vegan?') + '</div>' +
      '<div style="display:flex;gap:14px;align-items:center;margin-top:8px"><div class="' + (v.cls === 'ok' ? 'lime' : 'ups') + ' circ" style="width:54px;height:54px;color:' + (v.cls === 'ok' ? '#fff' : v.cls === 'neg' ? 'var(--warn)' : 'var(--mute)') + '">' + ic(v.icon, 26) + '</div>' +
      '<div style="flex:1"><div class="serif" style="font-size:20px">' + esc(v.t) + '</div><div class="ink2" style="font-size:13px;margin-top:2px">' + esc(v.s) + '</div></div></div>' +
      (v.mark ? '<a class="link" href="#/mark/' + v.mark + '" style="font-size:13px;margin-top:12px">이 표시가 뭘 확인한 건지 보기' + ic('next', 14) + '</a>' : '') + '</div>';
    var diff = p.total - Math.round(D.avg);
    var catAvg = Math.round(D.catavg[p.cat]);
    var scoreCard = '<div class="up" style="padding:18px;margin-top:16px">' +
      '<div class="en">' + (st.variant === 'B' ? 'Step 1 · ESG evidence score' : 'ESG evidence score') + '</div>' +
      '<div style="display:flex;gap:16px;align-items:center;margin-top:6px">' + gauge(p.total, 132) +
      '<div style="flex:1;font-size:13px"><div style="font-weight:800;font-size:14px">확인한 근거 ' + p.cov + ' / ' + p.n + '개</div>' +
      '<div class="ink2" style="margin-top:6px">26개 평균 ' + Math.round(D.avg) + '점보다 <b style="color:var(--forest)">' + (diff >= 0 ? '+' + diff : diff) + '</b></div>' +
      '<div class="ink2">같은 ' + esc(p.cat) + ' 평균 ' + catAvg + '점</div>' +
      '<a class="link" href="#/criteria" style="margin-top:8px;font-size:12.5px">점수 기준' + ic('next', 13) + '</a></div></div>' +
      (p.total === 0 ? '<div class="in" style="padding:11px 13px;margin-top:12px;font-size:12.5px;color:var(--ink2)">0점은 \'나쁜 제품\'이 아니라 포장에서 <b>확인할 근거가 없다</b>는 뜻이에요.</div>' : '') +
      ['E', 'S', 'G'].map(function (k) {
        return '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span><b>' + k + ' ' + PIL[k].ko + '</b> <span class="mute">' + PIL[k].q + '</span>' + (ck === k ? ' <span class="chip ok" style="height:18px;font-size:10.5px;padding:0 7px">내 기준</span>' : '') + '</span><b>' + p[k] + '</b></div>' +
          '<div style="display:flex;margin-top:6px">' + bar(p[k]) + '</div></div>';
      }).join('') +
      '<div class="mute" style="font-size:11.5px;margin-top:12px">환경 ' + p.E + ' × ' + Math.round(W.E * 100) + '% + 사회 ' + p.S + ' × ' + Math.round(W.S * 100) + '% + 지배구조 ' + p.G + ' × ' + Math.round(W.G * 100) + '% = ' + p.total + '점</div></div>';
    var why = '<div class="serif" style="font-size:19px;margin:26px 0 4px">왜 이 점수일까요?</div><div class="en" style="margin-bottom:10px">Every point has a reason</div>' +
      ['E', 'S', 'G'].map(function (k) {
        return '<div class="up" style="padding:6px 16px;margin-bottom:12px;border-radius:22px"><div style="font-size:13px;font-weight:800;color:var(--forest);padding:10px 0 4px">' + k + ' ' + PIL[k].ko + ' ' + p[k] + '점</div>' +
          p.items.filter(function (i) { return i.p === k; }).map(function (i, n, arr) {
            var chip = i.st === 'ok' ? '<span class="chip ok">' + ic('check', 12) + ' 확인</span>' : i.st === 'neg' ? '<span class="chip neg">확인 · 해당 없음</span>' : '<span class="chip none">정보 없음</span>';
            var mk = { fsc: 'fsc', soy: 'soy', grade: 'grade', disclose: 'grade', lookup: 'fsc' }[i.k] || (i.k === 'vegan' && v.mark ? v.mark : '');
            return '<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;' + (n < arr.length - 1 ? 'border-bottom:1px solid var(--line)' : '') + '">' +
              '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700">' + esc(i.t) + ' <span class="mute" style="font-weight:500;font-size:12px">' + i.pts + ' / ' + i.max + '</span></div>' +
              '<div class="ink2" style="font-size:12.5px;margin-top:2px">' + esc(i.ev) + (mk && i.st !== 'none' ? ' · <a class="link" href="#/mark/' + mk + '" style="font-size:12px">설명</a>' : '') + '</div></div>' + chip + '</div>';
          }).join('') + '</div>';
      }).join('');
    var first = st.variant === 'A' ? verdictCard + scoreCard : scoreCard + verdictCard;
    var reported = st.reported.indexOf(id) >= 0;
    return top(p.brand, esc(p.cat)) + '<div class="pad">' +
      '<div style="display:flex;gap:14px;align-items:center;margin-top:4px">' + avatar(p, 64) + '<div><div class="mute" style="font-size:12.5px">' + esc(p.brand) + ' · ' + esc(p.cat) + (p.barcode ? ' · ' + p.barcode : '') + '</div><div class="serif" style="font-size:20px;line-height:1.35">' + esc(p.name) + '</div></div></div>' +
      first + why +
      '<div style="display:flex;gap:12px;margin-top:8px">' +
      '<a class="btn sec" href="#/compare?a=' + id + '" style="flex:1;font-size:14.5px">' + ic('compare', 18) + ' 비교하기</a>' +
      '<button class="btn fill" data-act="report" data-id="' + id + '" style="flex:1;font-size:14.5px"' + (reported ? ' disabled' : '') + '>' + ic('camera', 18, '#fff') + (reported ? ' 제보 완료' : ' 사진 제보 +100P') + '</button></div>' +
      '<p class="mute" style="font-size:11.5px;margin:12px 4px 0">확인한 곳: ' + esc(p.seen) + ' (2026년 11월 실물 사진). 정보가 다르면 사진으로 알려주세요. 브랜드 담당자는 정정을 요청할 수 있어요.</p></div>';
  };

  V.mark = function (k) {
    var m = MARKS[k];
    if (!m) return V.criteria();
    return top(m.name, 'What this mark checks') + '<div class="pad">' +
      '<div class="up" style="padding:12px;margin-top:6px;border-radius:26px"><img src="../assets/img/' + m.img + '" alt="' + esc(m.name) + ' 실물 사진" style="width:100%;max-height:260px;object-fit:contain;border-radius:18px;background:#fff"></div>' +
      '<div class="en" style="margin-top:18px">' + esc(m.kind) + '</div><h1 class="serif" style="font-size:26px;margin:4px 0 8px">' + esc(m.name) + '</h1>' +
      '<p class="ink2" style="font-size:14.5px;margin:0">' + esc(m.who) + '</p>' +
      '<div class="up" style="padding:16px 18px;margin-top:16px"><div style="font-weight:800;font-size:14px;margin-bottom:6px">무엇을 확인하나요?</div>' +
      m.checks.map(function (c) { return '<div style="display:flex;gap:8px;font-size:13.5px;padding:5px 0">' + ic('check', 16, 'var(--lime-d)') + '<span>' + esc(c) + '</span></div>'; }).join('') + '</div>' +
      '<div class="up" style="padding:16px 18px;margin-top:14px"><div style="font-weight:800;font-size:14px">포장에서 이렇게 찾아요</div><p class="ink2" style="font-size:13.5px;margin:6px 0 0">' + esc(m.how) + '</p></div>' +
      '<div class="soft" style="padding:16px 18px;margin-top:14px;border-radius:22px"><div style="font-weight:800;font-size:14px">그린스캔 점수에는</div><p class="ink2" style="font-size:13.5px;margin:6px 0 0">' + esc(m.score) + '</p></div>' +
      (m.src.length ? '<p class="mute" style="font-size:12px;margin-top:14px">출처: ' + m.src.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a>'; }).join(' · ') + '</p>' : '') +
      '<a class="btn sec" href="#/criteria" style="margin-top:12px">점수 기준 전체 보기</a></div>';
  };

  V.criteria = function () {
    var items = {};
    P[0].items.forEach(function (i) { (items[i.p] = items[i.p] || []).push(i); });
    var rules = [
      ['확인한 근거만', '포장과 공식 자료에서 확인한 것만 점수에 넣어요.'],
      ['없으면 0점, 하지만 \'정보 없음\'', '확인 못 한 항목은 0점이지만 \'나쁨\'이 아니라 \'정보 없음\'으로 따로 보여드려요.'],
      ['법으로 모두 하는 건 빼요', '전성분·분리배출 표시는 모든 제품이 해야 해서 차이가 없어요. 점수에 넣지 않아요.'],
      ['인증 마크는 항목으로', '마크마다 따로 가산점을 더하지 않고, 그 마크가 확인한 항목 점수로 넣어요. 같은 근거를 두 번 세지 않아요.'],
      ['동점이면', '① 내 기준 점수(비건이면 S, 친환경이면 E) → ② 확인한 근거 수 → ③ 같은 종류 평균과 비교해요.'],
      ['광고와 상관없어요', '광고·제휴를 해도 점수는 바뀌지 않아요. 브랜드는 근거 자료로만 정정을 요청할 수 있어요.']
    ];
    var ex = byId.p01;
    return top('점수 기준', 'Scoring criteria') + '<div class="pad">' +
      h1('점수에는', '모두 이유가 있어요.', 'Every point has a reason') +
      '<p class="ink2" style="font-size:14px;margin:10px 0 0">그린스캔 점수는 제품이 좋다, 나쁘다가 아니라 <b>비건·친환경 근거가 얼마나 확인됐는지</b>를 보여줘요.</p>' +
      ['E', 'S', 'G'].map(function (k) {
        return '<div class="up" style="padding:16px 18px;margin-top:16px"><div style="display:flex;gap:12px;align-items:center"><div class="fill circ" style="width:44px;height:44px;font-weight:800">' + k + '</div>' +
          '<div style="flex:1"><div class="serif" style="font-size:18px">' + PIL[k].ko + ' <span class="en" style="font-size:11px">' + PIL[k].en + '</span></div><div class="ink2" style="font-size:13px">' + PIL[k].q + '</div></div>' +
          '<div style="text-align:right"><div class="serif" style="font-size:22px">' + Math.round(W[k] * 100) + '%</div><div class="mute" style="font-size:11px">비중</div></div></div>' +
          '<div style="margin-top:10px">' + items[k].map(function (i) { return '<div style="display:flex;justify-content:space-between;font-size:13.5px;padding:7px 0;border-top:1px solid var(--line)"><span>' + esc(i.t) + '</span><b>' + i.max + '점</b></div>'; }).join('') + '</div></div>';
      }).join('') +
      '<div class="in" style="padding:13px 15px;margin-top:16px;font-size:12.5px;color:var(--ink2)">비중(환경 45 · 사회 30 · 지배구조 25)은 시안이에요. 설문에서 소비자가 항목별로 중요하다고 답한 정도로 다시 정해요.</div>' +
      '<div class="serif" style="font-size:19px;margin:26px 0 10px">이렇게 계산해요</div>' +
      '<a href="#/p/' + ex.id + '" class="up" style="display:block;padding:16px 18px;text-decoration:none"><div class="mute" style="font-size:12.5px">예시 · ' + esc(ex.brand) + ' ' + esc(ex.name) + '</div>' +
      '<div style="font-size:14px;margin-top:8px;line-height:1.8">환경 <b>' + ex.E + '</b> × 45% = ' + (ex.E * W.E).toFixed(1) + '<br>사회 <b>' + ex.S + '</b> × 30% = ' + (ex.S * W.S).toFixed(1) + '<br>지배구조 <b>' + ex.G + '</b> × 25% = ' + (ex.G * W.G).toFixed(1) + '</div>' +
      '<div class="serif" style="font-size:22px;margin-top:6px">= ' + ex.total + '점 <span style="font-size:14px;color:var(--forest)">' + grade(ex.total) + '</span></div>' +
      '<div class="ink2" style="font-size:12.5px;margin-top:6px">아직 확인 못 한 항목: ' + ex.items.filter(function (i) { return i.st === 'none'; }).map(function (i) { return esc(i.t); }).join(', ') + '. 근거가 확인되면 점수가 올라가요.</div></a>' +
      '<div class="serif" style="font-size:19px;margin:26px 0 10px">원칙 6가지</div>' +
      rules.map(function (r, n) { return '<div style="display:flex;gap:12px;padding:10px 2px"><div class="ups circ" style="width:30px;height:30px;font-size:13px;font-weight:800;color:var(--forest)">' + (n + 1) + '</div><div><div style="font-weight:800;font-size:14px">' + r[0] + '</div><div class="ink2" style="font-size:13px">' + r[1] + '</div></div></div>'; }).join('') +
      '<div class="serif" style="font-size:19px;margin:22px 0 10px">점수 구간</div>' +
      '<div class="up" style="padding:6px 18px">' + [['60점 이상', '근거 양호'], ['40~59점', '근거 보통'], ['1~39점', '근거 부족'], ['0점', '정보 없음']].map(function (g, n) { return '<div style="display:flex;justify-content:space-between;padding:10px 0;font-size:13.5px;' + (n < 3 ? 'border-bottom:1px solid var(--line)' : '') + '"><span>' + g[0] + '</span><b>' + g[1] + '</b></div>'; }).join('') + '</div>' +
      '<div class="serif" style="font-size:19px;margin:22px 0 10px">마크별 설명</div><div class="hscroll">' +
      ['wevegan', 'vlabel', 'phrase', 'fsc', 'soy', 'grade'].map(function (k) { return '<a href="#/mark/' + k + '" class="pill ups" style="height:36px;padding:0 14px;font-size:13px;font-weight:700;text-decoration:none">' + esc(MARKS[k].name) + '</a>'; }).join('') + '</div></div>';
  };

  function tiebreak(a, b) {
    if (a.total !== b.total) return { w: a.total > b.total ? a : b, why: '총점이 더 높아요.' };
    var k = critKey();
    if (k && a[k] !== b[k]) return { w: a[k] > b[k] ? a : b, why: '같은 ' + a.total + '점이지만, 내 기준(' + CRIT[st.crit] + ')에 해당하는 ' + PIL[k].ko + '(' + k + ') 점수가 더 높아요.' };
    if (a.cov !== b.cov) return { w: a.cov > b.cov ? a : b, why: '같은 ' + a.total + '점이지만 확인한 근거가 더 많아요 (' + Math.max(a.cov, b.cov) + '개 vs ' + Math.min(a.cov, b.cov) + '개).' };
    return { w: null, why: '점수와 근거 수가 같아요. 같은 포장을 쓰는 제품일 수 있어요. 가격이나 후기로 골라 보세요.' };
  }

  V.compare = function (q) {
    var a = byId[q.get('a')] || byId.p13, b = byId[q.get('b')] || (a.id === 'p09' ? byId.p13 : byId.p09);
    var res = tiebreak(a, b);
    function opt(sel) { return P.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.brand + ' ' + p.name) + ' (' + p.total + ')</option>'; }).join(''); }
    function col(p) {
      var win = res.w && res.w.id === p.id;
      return '<div class="up" style="flex:1;min-width:0;padding:14px;border-radius:24px;' + (win ? 'box-shadow:0 0 0 2.5px var(--lime),8px 10px 22px var(--sh)' : '') + '">' +
        '<div style="display:flex;justify-content:center">' + gauge(p.total, 104) + '</div>' +
        '<div class="mute" style="font-size:11.5px;margin-top:8px">' + esc(p.brand) + '</div><div style="font-size:13px;font-weight:700;line-height:1.35;height:35px;overflow:hidden">' + esc(p.name) + '</div>' +
        ['E', 'S', 'G'].map(function (k) { return '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>' + k + ' ' + PIL[k].ko + (critKey() === k ? ' ★' : '') + '</span><b>' + p[k] + '</b></div>'; }).join('') +
        '<div style="display:flex;justify-content:space-between;font-size:13px;margin-top:6px"><span>확인한 근거</span><b>' + p.cov + '/' + p.n + '</b></div>' +
        '<div class="chip ' + verdict(p).cls + '" style="margin-top:10px;height:22px;font-size:11px">' + esc(verdict(p).t) + '</div>' +
        (win ? '<div class="chip ok" style="margin-top:8px;height:22px;font-size:11px">' + ic('check', 12) + ' 이쪽 추천</div>' : '') + '</div>';
    }
    return top('비교', 'Compare') + '<div class="pad">' + h1('같은 점수라면', '뭘 보고 고를까요?', 'Tie-breaker, explained') +
      '<p class="ink2" style="font-size:13.5px;margin:10px 0 14px">실제 조사 제품 중 똑같이 24점인 두 제품을 먼저 놓았어요. 다른 제품으로 바꿔 볼 수도 있어요.</p>' +
      '<div style="display:flex;gap:8px"><select data-cmp="a" class="in sel">' + opt(a.id) + '</select><select data-cmp="b" class="in sel">' + opt(b.id) + '</select></div>' +
      '<div style="display:flex;gap:12px;margin-top:14px">' + col(a) + col(b) + '</div>' +
      '<div class="soft" style="padding:16px 18px;margin-top:16px;border-radius:22px"><div style="font-weight:800;font-size:14.5px">' + (res.w ? esc(res.w.brand) + ' 쪽을 먼저 권해요' : '둘 다 비슷해요') + '</div><div class="ink2" style="font-size:13.5px;margin-top:4px">' + esc(res.why) + '</div>' +
      '<div class="mute" style="font-size:12px;margin-top:8px">지금 기준: ' + (CRIT[st.crit] || '고르지 않음') + ' · <a class="link" href="#/start" style="font-size:12px">기준 바꾸기</a></div></div>' +
      '<div class="in" style="padding:12px 14px;margin-top:14px;font-size:12.5px;color:var(--ink2)">동점 규칙: ① 내 기준 점수 → ② 확인한 근거 수 → ③ 같은 종류 평균과 비교</div></div>';
  };

  V.guide = function () {
    var picked = st._quiz;
    var opts = [['A', 'quiz_phrase.jpg', false], ['B', 'quiz_vlabel.jpg', true]];
    var best = {};
    var brands = {};
    P.slice().sort(function (a, b) { return b.total - a.total || b.cov - a.cov; }).forEach(function (p) { if (p.total > 0 && !best[p.cat] && !brands[p.brand]) { best[p.cat] = p; brands[p.brand] = 1; } });
    var tops = Object.keys(best).map(function (c) { return best[c]; }).slice(0, 4);
    return top('처음이라면', 'New to vegan beauty?') + '<div class="pad">' + h1('비건 화장품,', '처음이라면 이렇게.', 'Start in 3 steps') +
      '<div class="up" style="padding:18px;margin-top:18px"><div class="en">Step 1</div><div class="serif" style="font-size:18px;margin-top:2px">어느 쪽이 \'인증\' 마크일까요?</div>' +
      '<div style="display:flex;gap:10px;margin-top:12px">' + opts.map(function (o) {
        var state = picked ? (o[2] ? 'box-shadow:0 0 0 3px var(--lime)' : (picked === o[0] ? 'box-shadow:0 0 0 3px #D7C9A0' : '')) : '';
        return '<button data-quiz="' + o[0] + '" class="ups" style="flex:1;border:0;border-radius:18px;padding:8px;cursor:pointer;' + state + '"><img src="../assets/img/' + o[1] + '" alt="사진 ' + o[0] + '" style="border-radius:12px"><div style="font-weight:800;margin-top:6px;color:var(--ink)">' + o[0] + '</div></button>';
      }).join('') + '</div>' +
      (picked ? '<div class="soft" style="padding:12px 14px;margin-top:12px;border-radius:16px;font-size:13.5px">' + (picked === 'B' ? '<b>정답!</b> ' : '<b>B가 인증 마크예요.</b> ') + 'B는 국제 인증 V-Label이에요. A의 \'I\'M VEGAN\'은 브랜드가 쓴 문구라서 누가 확인했는지 알 수 없어요. <a class="link" href="#/mark/vlabel">V-Label 설명</a></div>' : '') + '</div>' +
      '<a href="#/scan" class="up" style="display:block;padding:18px;margin-top:16px;text-decoration:none"><div class="en">Step 2</div><div class="serif" style="font-size:18px;margin-top:2px">지금 쓰는 제품부터 찍어 보세요</div><div class="ink2" style="font-size:13.5px;margin-top:4px">이미 비건 인증 제품일 수도 있어요. 바꿀지 말지는 그다음에 정해도 돼요.</div><span class="link" style="font-size:13px;margin-top:8px">스캔하기' + ic('next', 14) + '</span></a>' +
      '<div class="up" style="padding:18px;margin-top:16px"><div class="en">Step 3</div><div class="serif" style="font-size:18px;margin-top:2px">같은 종류에서 근거가 많은 제품으로</div><div class="ink2" style="font-size:13.5px;margin:4px 0 12px">조사한 제품 중 종류별로 근거가 가장 많이 확인된 제품이에요. 브랜드는 겹치지 않게 골랐어요.</div>' +
      tops.map(row).join('') + '</div></div>';
  };

  V.points = function () {
    return top('포인트', 'Points') + '<div class="pad">' + h1('정보를 채워 주면', '포인트를 드려요.', 'Why we give points') +
      '<div class="up" style="padding:18px;margin-top:18px;display:flex;align-items:center;gap:16px"><div class="lime circ" style="width:60px;height:60px">' + ic('gift', 28, '#fff') + '</div><div><div class="mute" style="font-size:12.5px">내 포인트 (체험용)</div><div class="serif" style="font-size:32px;line-height:1.1">' + st.points.toLocaleString() + 'P</div></div></div>' +
      '<div class="serif" style="font-size:18px;margin:24px 0 8px">왜 포인트를 주나요?</div>' +
      '<p class="ink2" style="font-size:13.5px;margin:0">\'정보 없음\'을 줄이려면 많은 사람이 포장 사진을 보내 줘야 해요. 포인트는 그 수고에 대한 보상이고, 덕분에 모두의 점수가 더 정확해져요.</p>' +
      [['camera', '포장 사진 제보', '+100P', '인증 마크·재활용 표시 사진을 보내면, 확인해서 \'정보 없음\'을 채워요.'],
       ['scan', '새 제품 스캔', '+10P', '어떤 제품 정보가 필요한지 알 수 있어요. 하루 5번까지.']].map(function (r) {
        return '<div class="up" style="display:flex;gap:12px;align-items:center;padding:14px 16px;margin-top:12px;border-radius:22px"><div class="ups circ" style="width:42px;height:42px;color:var(--forest)">' + ic(r[0], 19) + '</div><div style="flex:1"><div style="font-weight:800;font-size:14px">' + r[1] + '</div><div class="ink2" style="font-size:12.5px">' + r[3] + '</div></div><b style="color:var(--lime-d)">' + r[2] + '</b></div>';
      }).join('') +
      '<div class="serif" style="font-size:18px;margin:24px 0 8px">어디에 쓰나요?</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' + [['wave', '바다', '플라스틱 포장 제품'], ['tree', '숲', 'FSC 종이 제품'], ['paw', '동물', '비건 인증 제품']].map(function (d) {
        return '<div class="up" style="padding:14px 10px;text-align:center;border-radius:22px"><div class="ups circ" style="width:42px;height:42px;margin:0 auto;color:var(--forest)">' + ic(d[0], 20) + '</div><div style="font-weight:800;font-size:14px;margin-top:8px">' + d[1] + ' 기부</div><div class="mute" style="font-size:11px">' + d[2] + '</div></div>';
      }).join('') + '</div>' +
      '<div class="up" style="padding:14px 16px;margin-top:12px;border-radius:22px;display:flex;gap:12px;align-items:center"><div class="ups circ" style="width:42px;height:42px;color:var(--forest)">' + ic('gift', 19) + '</div><div style="flex:1"><div style="font-weight:800;font-size:14px">자주 사는 제품 재구매 할인</div><div class="ink2" style="font-size:12.5px">제휴 브랜드에서 쓸 수 있어요 (준비 중)</div></div></div>' +
      '<p class="mute" style="font-size:12px;margin-top:14px">1,000P = 1,000원 기부 (시안). 체험판 포인트는 이 브라우저에만 저장되고 실제로 쓸 수는 없어요.</p></div>';
  };

  V.my = function () {
    return top('MY', 'My page') + '<div class="pad">' +
      '<div class="up" style="padding:18px;margin-top:6px;display:flex;gap:14px;align-items:center"><div class="fill circ" style="width:56px;height:56px">' + ic('user', 26, '#fff') + '</div><div style="flex:1"><div style="font-weight:800;font-size:16px">' + (st.logged ? '그린스캔 체험 회원' : '로그인 전') + '</div><div class="ink2" style="font-size:13px">기준: ' + (CRIT[st.crit] || '고르지 않음') + ' · ' + st.points + 'P</div></div>' + (st.logged ? '' : '<a href="#/login" class="pill fill" style="height:36px;padding:0 14px;font-weight:700;font-size:13px;text-decoration:none">로그인</a>') + '</div>' +
      menu([['start', 'leaf', '내 기준 바꾸기', CRIT[st.crit] || ''], ['plus', 'spark', '그린스캔 플러스', '준비 중'], ['points', 'gift', '포인트·기부', st.points + 'P'], ['account', 'shield', '계정 · 보안', ''], ['@privacy', 'file', '개인정보 처리방침', ''], ['done', 'file', '설문 참여하기', '1분']]) +
      '<p class="mute" style="font-size:11.5px;margin:16px 4px 0">체험 코드 ' + st.variant + ' · 이 체험판은 개인정보를 서버로 보내지 않아요.</p></div>';
  };
  function menu(list) {
    return '<div class="up" style="padding:4px 16px;margin-top:16px">' + list.map(function (m, n) {
      var href = m[0].charAt(0) === '@' ? '../privacy.html' : '#/' + m[0];
      return '<a href="' + href + '" style="display:flex;gap:12px;align-items:center;height:56px;text-decoration:none;' + (n < list.length - 1 ? 'border-bottom:1px solid var(--line)' : '') + '"><span style="color:var(--forest)">' + ic(m[1], 19) + '</span><span style="flex:1;font-size:14.5px">' + m[2] + '</span><span class="mute" style="font-size:12.5px">' + m[3] + '</span>' + ic('next', 15, 'var(--mute)') + '</a>';
    }).join('') + '</div>';
  }

  V.plus = function () {
    return top('그린스캔 플러스', 'GreenScan Plus') + '<div class="pad">' + h1('내 화장대 전체를', '한 번에 관리해요.', 'Membership · coming soon') +
      '<p class="ink2" style="font-size:13.5px;margin:10px 0 0">비건·친환경 화장품을 꾸준히 쓰는 분을 위한 정기 구독이에요. 가격은 설문 결과로 정해요.</p>' +
      [['list', '내 화장대 점검', '쓰는 제품을 등록하면 내 기준에 안 맞는 제품을 알려줘요.'],
       ['spark', '재구매·리뉴얼 알림', '다 쓸 때쯤, 그리고 포장·인증이 바뀌면 알려줘요.'],
       ['compare', '대체 제품 추천', '같은 종류에서 근거가 더 많은 제품을 골라줘요.'],
       ['file', '월간 리포트', '이번 달 내 선택이 남긴 변화(기부·포장)를 정리해 줘요.']].map(function (r) {
        return '<div class="up" style="display:flex;gap:12px;align-items:center;padding:14px 16px;margin-top:12px;border-radius:22px"><div class="ups circ" style="width:42px;height:42px;color:var(--forest)">' + ic(r[0], 19) + '</div><div style="flex:1"><div style="font-weight:800;font-size:14px">' + r[1] + '</div><div class="ink2" style="font-size:12.5px">' + r[2] + '</div></div></div>';
      }).join('') +
      '<div class="in" style="padding:13px 15px;margin-top:16px;font-size:12.5px;color:var(--ink2)">무료 기능(스캔·점수·근거 보기)은 계속 무료예요. 광고나 제휴는 점수에 영향을 주지 않아요.</div></div>';
  };

  V.login = function () {
    return top('로그인', 'Sign in', true) + '<div class="pad">' + h1('무료 스캔 ' + CFG.FREE_SCANS + '번을', '다 썼어요.', 'Keep going for free') +
      '<p class="ink2" style="font-size:14px;margin:10px 0 0">로그인하면 계속 무료로 쓰고, 기록·포인트가 저장돼요. 비밀번호는 그린스캔에 저장하지 않아요.</p>' +
      '<button data-act="login" class="btn" style="margin-top:26px;background:#FEE500;color:#191919">카카오로 계속하기</button>' +
      '<button data-act="login" class="btn" style="margin-top:12px;background:#03C75A;color:#fff">네이버로 계속하기</button>' +
      '<a href="#/home" class="btn sec" style="margin-top:12px">나중에 할게요</a>' +
      '<p class="mute" style="font-size:12px;text-align:center;margin-top:14px">체험판이라 실제 카카오·네이버 로그인은 하지 않아요.</p></div>';
  };

  V.consent = function () {
    var req = [['age', '[필수] 만 14세 이상이에요'], ['tos', '[필수] 서비스 이용약관'], ['pri', '[필수] 개인정보 수집·이용 (회원 식별값, 닉네임)']];
    var opt = [['mail', '[선택] 이메일로 소식 받기'], ['push', '[선택] 알림 받기']];
    var c = st._consent || {};
    var ok = req.every(function (r) { return c[r[0]]; });
    function line(r) { return '<label style="display:flex;gap:10px;align-items:center;height:46px;font-size:14px;cursor:pointer"><input type="checkbox" data-consent="' + r[0] + '"' + (c[r[0]] ? ' checked' : '') + ' style="width:22px;height:22px;accent-color:#6E9A7A">' + r[1] + '</label>'; }
    return top('가입 동의', 'Consent') + '<div class="pad">' + h1('딱 필요한 것만', '받을게요.', 'Only what we need') +
      '<div class="up" style="padding:8px 16px;margin-top:18px"><label style="display:flex;gap:10px;align-items:center;height:52px;font-size:15px;font-weight:800;border-bottom:1px solid var(--line);cursor:pointer"><input type="checkbox" data-consent="all"' + (ok ? ' checked' : '') + ' style="width:24px;height:24px;accent-color:#6E9A7A">필수 항목 모두 동의</label>' + req.map(line).join('') + opt.map(line).join('') +
      '<a class="link" href="../privacy.html" style="font-size:12.5px;padding:6px 0 10px">개인정보 처리방침 보기' + ic('next', 13) + '</a></div>' +
      '<div class="in" style="padding:13px 15px;margin-top:14px;font-size:12.5px;color:var(--ink2)">' + ic('shield', 15, 'var(--forest)') + ' 이름·전화번호·주소·생년월일·위치·피부 타입은 받지 않아요.</div>' +
      '<button class="btn fill" data-act="agree" style="margin-top:20px"' + (ok ? '' : ' disabled') + '>동의하고 시작하기</button></div>';
  };

  V.account = function () {
    return top('계정 · 보안', 'Account & security') + '<div class="pad">' + h1('내 계정을', '안전하게.', 'Your data, your control') +
      menuStatic([['lock', '비밀번호를 저장하지 않아요', '로그인은 카카오·네이버가 처리해요'], ['shield', '모든 연결은 암호화돼요', 'HTTPS로 주고받아요'], ['user', '연결된 계정', st.logged ? '카카오 (체험)' : '없음']]) +
      '<a class="btn sec" href="../privacy.html" style="margin-top:16px">개인정보 처리방침</a>' +
      '<button class="btn sec" data-act="reset" style="margin-top:12px;color:#8A5A3A">체험 기록 모두 지우기 (탈퇴 체험)</button>' +
      '<p class="mute" style="font-size:12px;margin-top:10px">지우면 이 브라우저에 저장된 기준·포인트·본 제품 기록이 바로 사라져요.</p></div>';
  };
  function menuStatic(list) {
    return '<div class="up" style="padding:4px 16px;margin-top:18px">' + list.map(function (m, n) {
      return '<div style="display:flex;gap:12px;align-items:center;padding:12px 0;' + (n < list.length - 1 ? 'border-bottom:1px solid var(--line)' : '') + '"><div class="ups circ" style="width:38px;height:38px;color:var(--forest)">' + ic(m[0], 17) + '</div><div><div style="font-weight:700;font-size:14px">' + m[1] + '</div><div class="mute" style="font-size:12px">' + m[2] + '</div></div></div>';
    }).join('') + '</div>';
  }

  V.done = function () {
    var code = st.variant + '-' + (st.crit || 'none');
    var url = CFG.FORM_PREFILL ? CFG.FORM_PREFILL.replace('VARIANT', encodeURIComponent(code)) : '';
    return top('설문', 'Survey') + '<div class="pad">' + h1('체험해 주셔서', '고마워요!', 'Thank you for testing') +
      '<p class="ink2" style="font-size:14px;margin:10px 0 0">1분이면 끝나는 설문에 답해 주시면 그린스캔을 고치는 데 바로 써요. 익명이에요.</p>' +
      '<div class="up" style="padding:16px 18px;margin-top:18px;font-size:13.5px"><div style="font-weight:800">지금까지 체험한 것</div><div class="ink2" style="margin-top:6px">본 제품 ' + st.views.length + '개 · 기준 ' + (CRIT[st.crit] || '고르지 않음') + ' · 체험 코드 ' + code + '</div></div>' +
      (url ? '<a class="btn lime" href="' + esc(url) + '" target="_blank" rel="noopener" style="margin-top:20px">' + ic('file', 20, '#fff') + ' 설문하러 가기</a>' :
        '<div class="btn sec" style="margin-top:20px;color:var(--mute)">설문 링크 준비 중이에요</div>') +
      '<a class="btn sec" href="#/home" style="margin-top:12px">더 둘러보기</a></div>';
  };

  // ───────── 라우터
  var scanner = null, sheetTimer = null;
  function stopCam() { if (scanner) { try { scanner.stop().catch(function () {}); } catch (e) {} scanner = null; } }

  function render(keep) {
    stopCam();
    clearTimeout(sheetTimer);
    closeSheet();
    var y = window.scrollY;
    var h = location.hash.replace(/^#\/?/, '');
    var path = h.split('?')[0], q = new URLSearchParams(h.split('?')[1] || '');
    var parts = path.split('/');
    var html, tab = '';
    if (!path) { path = st.crit ? 'home' : 'start'; parts = [path]; }
    switch (parts[0]) {
      case 'start': html = V.start(); break;
      case 'home': html = V.home(); tab = 'home'; break;
      case 'list': html = V.list(q); tab = 'list'; break;
      case 'scan': html = V.scan(); tab = 'scan'; break;
      case 'p': html = V.product(parts[1]); break;
      case 'nf': html = V.nf(parts[1] || ''); break;
      case 'mark': html = V.mark(parts[1]); break;
      case 'criteria': html = V.criteria(); break;
      case 'compare': html = V.compare(q); tab = 'compare'; break;
      case 'guide': html = V.guide(); break;
      case 'points': html = V.points(); tab = 'points'; break;
      case 'my': html = V.my(); tab = 'my'; break;
      case 'plus': html = V.plus(); break;
      case 'login': html = V.login(); break;
      case 'consent': html = V.consent(); break;
      case 'account': html = V.account(); break;
      case 'done': html = V.done(); break;
      default: html = V.home(); tab = 'home';
    }
    var view = document.getElementById('view');
    view.innerHTML = html;
    document.getElementById('tabs').style.display = parts[0] === 'start' ? 'none' : 'flex';
    Array.prototype.forEach.call(document.querySelectorAll('#tabs a'), function (a) { a.classList.toggle('on', a.getAttribute('data-tab') === tab); });
    window.scrollTo(0, keep ? y : 0);
    // 무료 3번 다 보면 로그인 안내 (한 번만)
    if (parts[0] === 'p' && !st.logged && st.views.length >= CFG.FREE_SCANS && !st._sheet) {
      st._sheet = true; save();
      var here = location.hash;
      sheetTimer = setTimeout(function () { if (location.hash === here) sheet(); }, 900);
    }
  }

  function sheet() {
    var s = document.getElementById('sheet');
    s.innerHTML = '<div class="sheet-bg" data-act="sheetclose"></div><div class="sheet-card up"><div class="serif" style="font-size:21px">무료 스캔 ' + CFG.FREE_SCANS + '번을 다 썼어요</div>' +
      '<p class="ink2" style="font-size:13.5px;margin:6px 0 16px">로그인하면 계속 무료로 쓰고 기록이 저장돼요.</p>' +
      '<button data-act="login" class="btn" style="background:#FEE500;color:#191919">카카오로 계속하기</button>' +
      '<button data-act="login" class="btn" style="margin-top:10px;background:#03C75A;color:#fff">네이버로 계속하기</button>' +
      '<button data-act="sheetclose" class="btn sec" style="margin-top:10px">나중에</button></div>';
    s.classList.add('on');
  }
  function closeSheet() { var s = document.getElementById('sheet'); s.classList.remove('on'); s.innerHTML = ''; }

  function lookup(code) {
    code = String(code || '').replace(/\D/g, '');
    if (!code) return;
    var p = byCode[code];
    go(p ? '/p/' + p.id : '/nf/' + code);
  }

  function startCam() {
    var cover = document.getElementById('camcover');
    function run() {
      try {
        var F = window.Html5QrcodeSupportedFormats;
        scanner = new window.Html5Qrcode('reader', { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], verbose: false });
        scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: function (w, h) { return { width: Math.min(300, w * 0.85), height: Math.min(150, h * 0.5) }; } },
          function (text) { stopCam(); if (navigator.vibrate) navigator.vibrate(60); lookup(text); }, function () {})
          .then(function () { if (cover) cover.style.display = 'none'; })
          .catch(function () { toast('카메라를 열 수 없어요. 숫자를 입력하거나 체험용 제품을 눌러 주세요.'); });
      } catch (e) { toast('카메라를 열 수 없어요. 숫자를 입력해 주세요.'); }
    }
    if (window.Html5Qrcode) return run();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
    s.onload = run;
    s.onerror = function () { toast('스캐너를 불러오지 못했어요. 숫자를 입력해 주세요.'); };
    document.head.appendChild(s);
  }

  // ───────── 이벤트
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-back],[data-pick],[data-act],[data-scan],[data-quiz],[data-skip]');
    if (!t) return;
    if (t.hasAttribute('data-back')) { e.preventDefault(); if (history.length > 1) history.back(); else go('/home'); return; }
    if (t.hasAttribute('data-skip')) { if (!st.crit) { st.crit = 'both'; save(); } return; }
    if (t.hasAttribute('data-pick')) { st._pick = t.getAttribute('data-pick'); render(true); return; }
    if (t.hasAttribute('data-scan')) { st.scanned = (st.scanned || 0) + 1; save(); lookup(t.getAttribute('data-scan')); return; }
    if (t.hasAttribute('data-quiz')) { st._quiz = t.getAttribute('data-quiz'); render(true); return; }
    var a = t.getAttribute('data-act');
    if (a === 'startgo') { st.crit = st._pick || 'vegan'; delete st._pick; save(); go('/home'); }
    else if (a === 'cam') startCam();
    else if (a === 'report') {
      var id = t.getAttribute('data-id');
      if (st.reported.indexOf(id) < 0) { st.reported.push(id); st.points += 100; save(); }
      toast('고마워요! +100P (체험판이라 사진은 받지 않아요)');
      if (id.indexOf('nf-') !== 0) render(true);
    }
    else if (a === 'login') { closeSheet(); go('/consent'); }
    else if (a === 'agree') { st.logged = true; delete st._consent; save(); toast('가입 완료! 이제 계속 무료로 쓸 수 있어요'); go('/home'); }
    else if (a === 'sheetclose') closeSheet();
    else if (a === 'reset') { try { localStorage.removeItem(KEY); } catch (e2) {} st = { variant: st.variant, points: 0, views: [], reported: [], logged: false, crit: null }; save(); toast('체험 기록을 모두 지웠어요'); go('/start'); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-cmp')) {
      var q = new URLSearchParams((location.hash.split('?')[1]) || '');
      q.set(t.getAttribute('data-cmp'), t.value);
      if (!q.get('a')) q.set('a', 'p13');
      go('/compare?' + q.toString());
    }
    if (t.hasAttribute('data-consent')) {
      var k = t.getAttribute('data-consent');
      st._consent = st._consent || {};
      if (k === 'all') ['age', 'tos', 'pri'].forEach(function (x) { st._consent[x] = t.checked; });
      else st._consent[k] = t.checked;
      render(true);
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.getAttribute('data-form') === 'code') { e.preventDefault(); lookup(document.getElementById('codein').value); }
  });
  window.addEventListener('hashchange', function () { render(false); });
  render();
})();
