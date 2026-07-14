/* ================= 카카오맵 설정 =================
  1) https://developers.kakao.com 접속 → 로그인 → 내 애플리케이션 → 앱 추가
     (WBTI 등 기존에 만들어둔 앱이 있다면 새로 만들 필요 없이 그 앱을 그대로 써도 됩니다.
      단, 그 앱의 "제품 설정"에서 지도(Maps)를 활성화해야 합니다.)
  2) 앱 키 메뉴에서 JavaScript 키를 복사
  3) 플랫폼 메뉴 → Web 플랫폼 등록 → 이 사이트를 배포할 도메인 등록
     (예: https://xxxx.vercel.app, 로컬 테스트용으로 http://localhost 도 등록해두면 편해요)
  4) 아래 KAKAO_APP_KEY 자리에 키를 붙여넣기
  ※ 키가 비어있으면 자동으로 손그림 개념도 지도로 표시됩니다 (에러 없이 동작)
==================================================== */
const KAKAO_APP_KEY = '';

let mapMode = 'concept';
let kakaoMap = null;
let kakaoGeocoder = null;
let kakaoOverlays = [];
let kakaoPolyline = null;
const coordCache = {};

(function loadKakaoSDK(){
  if(!KAKAO_APP_KEY){
    console.info('[카카오맵] KAKAO_APP_KEY가 비어있어 손그림 지도로 표시합니다.');
    return;
  }
  const s = document.createElement('script');
  s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' + KAKAO_APP_KEY + '&autoload=false&libraries=services';
  s.onload = ()=>{
    try{
      kakao.maps.load(()=>{
        try{
          kakaoGeocoder = new kakao.maps.services.Geocoder();
          mapMode = 'kakao';
          console.info('[카카오맵] 연동 성공');
          if(document.getElementById('screen-itinerary').classList.contains('active')){
            renderMap(currentItinDay);
          }
        }catch(err){
          console.error('[카카오맵] 초기화 중 오류 - 도메인 등록/키 종류를 확인하세요:', err);
          mapMode = 'concept';
        }
      });
    }catch(err){
      console.error('[카카오맵] SDK load() 실행 오류:', err);
      mapMode = 'concept';
    }
  };
  s.onerror = (e)=>{
    console.error('[카카오맵] SDK 스크립트 로드 실패 (네트워크 또는 키 오류):', e);
    mapMode = 'concept';
  };
  document.head.appendChild(s);
})();

function geocodeAddress(address){
  return new Promise((resolve)=>{
    if(!address){ resolve(null); return; }
    if(coordCache[address]){ resolve(coordCache[address]); return; }
    kakaoGeocoder.addressSearch(address, (result, status)=>{
      if(status === kakao.maps.services.Status.OK && result[0]){
        const coord = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
        coordCache[address] = coord;
        resolve(coord);
      } else {
        resolve(null);
      }
    });
  });
}

/* ---------------- 여행 데이터 ---------------- */
const TRIP = {
  1: [
    {time:'아침', name:'하남휴게소', cat:'rest', addr:null, link:null},
    {time:'', name:'추억의 청춘 뮤지엄', cat:'sight', addr:'경기 양평군 용문면 용문산로 620', link:'https://search.naver.com/search.naver?where=nexearch&sm=top_sug.pre&fbm=0&acr=1&acq=%EC%B6%94%EC%96%B5%EC%9D%98+%EC%B2%AD%EC%B6%98+%EB%AE%A4%EC%A7%80%EC%97%84&qdt=0&ie=utf8&query=%EC%B6%94%EC%96%B5%EC%9D%98+%EC%B2%AD%EC%B6%98%EB%AE%A4%EC%A7%80%EC%97%84&ackey=j91to076'},
    {time:'점심', name:'양평진선미가', cat:'food', addr:'경기 양평군 양평읍 중앙로 369 1층', link:'https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&ssc=tab.nx.all&query=%EC%96%91%ED%8F%89%EC%A7%84%EC%84%A0%EB%AF%B8%EA%B0%80&oquery=%EC%B6%94%EC%96%B5%EC%9D%98+%EC%B2%AD%EC%B6%98%EB%AE%A4%EC%A7%80%EC%97%84&tqi=jDh4NdqpulossRWO0PV-062858&ackey=eb92ht40'},
    {time:'카페', name:'소금산 소금빵', cat:'cafe', addr:'강원 원주시 지정면 간현로 177', link:'https://search.naver.com/search.naver?sm=tab_sug.top&where=nexearch&ssc=tab.nx.all&query=%EC%9B%90%EC%A3%BC+%EC%86%8C%EA%B8%88%EC%82%B0+%EC%86%8C%EA%B8%88%EB%B9%B5&oquery=%EC%86%8C%EA%B8%88%EC%82%B0+%EC%86%8C%EA%B8%88%EB%B9%B5&tqi=jDh4ClqpulossRWPpTw-411846&acq=%EC%86%8C%EA%B8%88%EC%82%B0+%EC%86%8C%EA%B8%88%EB%B9%B5&acr=2&qdt=0&ackey=xei5fkzp'},
    {time:'숙소', name:'포레스트리솜', cat:'lodge', addr:'충북 제천시 백운면 금봉로 365', link:null},
    {time:'', name:'용추폭포유리전망대', cat:'sight', addr:'충북 제천시 모산동 581', link:'https://search.naver.com/search.naver?sm=tab_sug.top&where=nexearch&ssc=tab.nx.all&query=%EC%9A%A9%EC%B6%94%ED%8F%AD%ED%8F%AC+%EC%9C%A0%EB%A6%AC%EC%A0%84%EB%A7%9D%EB%8C%80&oquery=%EC%9B%90%EC%A3%BC+%EC%86%8C%EA%B8%88%EC%82%B0+%EC%86%8C%EA%B8%88%EB%B9%B5&tqi=jDh4FdqpulossRWPp2h-254894&acq=%EC%9A%A9%EC%B6%94%ED%8F%AD%ED%8F%AC%EC%9C%A0%EB%A6%AC%EC%A0%84%EB%A7%9D%EB%8C%80&acr=1&qdt=0&ackey=jrx67zo6'},
    {time:'저녁', name:'의림지 칼국수', cat:'food', addr:'충북 제천시 의림대로47길 10 1,2층', link:'https://map.naver.com/p/search/%EC%A0%9C%EC%B2%9C%20%EC%9D%98%EB%A6%BC%EC%A7%80%20%EC%B9%BC%EA%B5%AD%EC%88%98/place/2016545646'}
  ],
  2: [
    {time:'숙소', name:'포레스트리솜', cat:'lodge', addr:'충북 제천시 백운면 금봉로 365', link:null},
    {time:'', name:'충주아쿠아리움', cat:'sight', addr:'충북 충주시 옻갓길 73-1', link:'https://map.naver.com/p/search/%EC%B6%A9%EC%A3%BC%EC%95%84%EC%BF%A0%EC%95%84%EB%A6%AC%EC%9B%80/place/2006306200'},
    {time:'점심', name:'숲속장수촌 충주시청본점', cat:'food', addr:'충북 충주시 쇠저울1길 36', link:'https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&ssc=tab.nx.all&query=%EC%88%B2%EC%86%8D%EC%9E%A5%EC%88%98%EC%B4%8C+%EC%B6%A9%EC%A3%BC%EC%8B%9C%EC%B2%AD%EB%B3%B8%EC%A0%90&tqi=jDh5tlqpulossRWPYol-042030'},
    {time:'', name:'활옥동굴', cat:'sight', addr:'충북 충주시 목벌안길 26', link:'https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&ssc=tab.nx.all&query=%ED%99%9C%EC%98%A5%EB%8F%99%EA%B5%B4&tqi=jDh5vsqpulossRWPY9G-443912'},
    {time:'카페', name:'활옥미분공장 Cafe & Grocery', cat:'cafe', addr:'충북 충주시 목벌안길 26', link:'https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&ssc=tab.nx.all&query=%ED%99%9C%EC%98%A5%EB%AF%B8%EB%B6%84%EA%B3%B5%EC%9E%A5+Cafe+%26+Grocery&tqi=jDh5blqpulossRWPw9h-479311'},
    {time:'', name:'해브나인 웰니스 스파', cat:'sight', addr:'충북 제천시 백운면 금봉로 365', link:null},
    {time:'저녁', name:'더진지', cat:'food', addr:'충북 제천시 백운면 북부로 585', link:'https://search.naver.com/search.naver?sm=tab_sug.top&where=nexearch&ssc=tab.nx.all&query=%EC%A0%9C%EC%B2%9C+%EB%8D%94%EC%A7%84%EC%A7%80&tqi=jDh55wqpulossRWQBiK-107980'}
  ],
  3: [
    {time:'숙소', name:'포레스트리솜', cat:'lodge', addr:'충북 제천시 백운면 금봉로 365', link:null},
    {time:'', name:'청풍호반케이블카', cat:'sight', addr:'충북 제천시 백운면 북부로 585 (전망대 카페 있음)', link:'https://search.naver.com/search.naver?sm=tab_sug.top&where=nexearch&ssc=tab.nx.all&query=%EC%B2%AD%ED%92%8D%ED%98%B8%EB%B0%98+%EC%BC%80%EC%9D%B4%EB%B8%94%EC%B9%B4&tqi=jDh5MwqpulossRWPzld-041686'},
    {time:'점심', name:'청풍황금떡갈비', cat:'food', addr:'충북 제천시 청풍면 청풍호로 1682', link:'https://search.naver.com/search.naver?sm=tab_hty.top&where=nexearch&ssc=tab.nx.all&query=%EC%B2%AD%ED%92%8D%ED%99%A9%EA%B8%88%EB%96%A1%EA%B0%88%EB%B9%84&tqi=jDh5flqpulossRWQBjo-045123'}
  ]
};
const PASSWORD = '2026';

/* ---------------- 화면 전환 ---------------- */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
document.getElementById('go-itinerary').addEventListener('click', ()=>{ openItinerary(1); });
document.getElementById('go-navi').addEventListener('click', ()=>{ openNavi(1); });
document.querySelectorAll('[data-back]').forEach(btn=>{
  btn.addEventListener('click', ()=> showScreen('screen-'+btn.dataset.back));
});

/* ---------------- 커버 / 비밀번호 ---------------- */
const pwInput = document.getElementById('pw-input');
const pwError = document.getElementById('pw-error');
const pwBox = document.querySelector('.pw-box');
function tryEnter(){
  if(pwInput.value.trim() === PASSWORD){
    pwError.textContent='';
    showScreen('screen-home');
  } else {
    pwError.textContent = '비밀번호가 틀렸어요, 다시 확인해주세요';
    pwBox.classList.remove('shake');
    void pwBox.offsetWidth;
    pwBox.classList.add('shake');
  }
}
document.getElementById('enter-btn').addEventListener('click', tryEnter);
pwInput.addEventListener('keydown', e=>{ if(e.key==='Enter') tryEnter(); });

/* ---------------- 아이콘 헬퍼 ---------------- */
function iconUse(cat){ return '<svg><use href="#icon-'+cat+'"/></svg>'; }

/* ---------------- DAY 탭 ---------------- */
function renderTabs(container, activeDay, onChange){
  container.innerHTML='';
  [1,2,3].forEach(d=>{
    const btn = document.createElement('div');
    btn.className = 'day-tab' + (d===activeDay ? ' active' : '');
    btn.textContent = 'DAY'+d;
    btn.addEventListener('click', ()=> onChange(d));
    container.appendChild(btn);
  });
}

/* ---------------- 일정보기 ---------------- */
let currentItinDay = 1;
function openItinerary(day){
  currentItinDay = day;
  showScreen('screen-itinerary');
  renderTabs(document.getElementById('itin-tabs'), day, openItinerary);
  renderMap(day);
  renderSheetList(day);
  document.getElementById('sheet').classList.remove('expanded');
  document.getElementById('sheet-title').textContent='위로 올려서 오늘 일정 보기';
}

async function renderMap(day){
  if(mapMode === 'kakao'){
    try{
      await renderKakaoMap(day);
    }catch(err){
      console.error('[카카오맵] 지도 렌더링 실패, 손그림 지도로 전환합니다:', err);
      mapMode = 'concept';
      showToast('지도 연동 실패 - 콘솔(F12)을 확인해주세요');
      renderConceptMap(day);
    }
  } else {
    renderConceptMap(day);
  }
}

/* ---- 카카오 실제지도 ---- */
async function renderKakaoMap(day){
  const stops = TRIP[day];
  const wrap = document.getElementById('map-wrap');
  wrap.innerHTML = '<div id="kakao-map"></div>';
  kakaoMap = new kakao.maps.Map(document.getElementById('kakao-map'), {
    center: new kakao.maps.LatLng(37.1, 128.0),
    level: 9
  });
  kakaoOverlays = [];
  if(kakaoPolyline){ kakaoPolyline.setMap(null); kakaoPolyline = null; }

  const coords = await Promise.all(stops.map(s => geocodeAddress(s.addr)));
  const bounds = new kakao.maps.LatLngBounds();
  const pathPoints = [];

  stops.forEach((s, i)=>{
    const c = coords[i];
    if(!c) return;
    const pos = new kakao.maps.LatLng(c.lat, c.lng);
    bounds.extend(pos);
    pathPoints.push(pos);

    const el = document.createElement('div');
    el.className = 'kko-pin' + (s.addr ? '' : ' dim');
    el.id = 'pin-'+i;
    el.innerHTML = iconUse(s.cat) + '<div class="num">'+(i+1)+'</div>';
    el.addEventListener('click', ()=>{
      selectStop(i);
      const row = document.querySelector('.stop-row[data-idx="'+i+'"]');
      if(row) row.scrollIntoView({block:'nearest'});
    });

    const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 0.5, xAnchor: 0.5, clickable: true });
    overlay.setMap(kakaoMap);
    kakaoOverlays.push({idx:i, overlay, el});
  });

  if(pathPoints.length > 1){
    kakaoPolyline = new kakao.maps.Polyline({
      path: pathPoints, strokeWeight: 3, strokeColor: '#9FB6C4', strokeOpacity: 0.9, strokeStyle: 'shortdash'
    });
    kakaoPolyline.setMap(kakaoMap);
  }
  if(!bounds.isEmpty()) kakaoMap.setBounds(bounds, 40, 40, 40, 40);
}

/* ---- 손그림 개념도 지도 (카카오 키 없을 때 대체) ---- */
function renderConceptMap(day){
  const stops = TRIP[day];
  const w=320, h=380, pad=42;
  const n=stops.length;
  const pts = stops.map((s,i)=>{
    const y = pad + (h-pad*2) * (n===1?0:i/(n-1));
    const x = (i%2===0) ? w*0.30 : w*0.70;
    return {x: x + Math.sin(i*1.9)*14, y};
  });
  let path='';
  pts.forEach((p,i)=>{
    if(i===0) path += 'M'+p.x+','+p.y;
    else{
      const prev = pts[i-1];
      const mx = (prev.x+p.x)/2;
      path += ' Q'+mx+','+prev.y+' '+p.x+','+p.y;
    }
  });
  let pins='';
  stops.forEach((s,i)=>{
    const p = pts[i];
    const dim = !s.addr ? ' opacity="0.55"' : '';
    pins += '<g class="pin" id="pin-'+i+'" transform="translate('+p.x+','+p.y+')"'+dim+'>'
      + '<circle class="pin-dot" r="16" fill="#3E6E8E" stroke="#FFFDF7" stroke-width="2.5"/>'
      + '<g transform="translate(-9,-9) scale(0.75)" stroke="#FFFDF7"><use href="#icon-'+s.cat+'"/></g>'
      + '<circle r="16" fill="none" stroke="#2A4F66" stroke-width="1"/>'
      + '<text x="18" y="-10" font-size="11" font-weight="900" fill="#2A4F66">'+(i+1)+'</text>'
      + '</g>';
  });
  const svg = '<svg viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg">'
    + '<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="#EAF1EC"/>'
    + '<path d="'+path+'" fill="none" stroke="#9FB6C4" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>'
    + pins + '</svg>';
  document.getElementById('map-wrap').innerHTML = svg;
  document.querySelectorAll('.pin').forEach(p=>{
    p.style.cursor='pointer';
    p.addEventListener('click', ()=>{
      const idx = parseInt(p.id.split('-')[1],10);
      selectStop(idx);
      const row = document.querySelector('.stop-row[data-idx="'+idx+'"]');
      if(row) row.scrollIntoView({block:'nearest'});
    });
  });
}

function renderSheetList(day){
  const stops = TRIP[day];
  let html='';
  stops.forEach((s,i)=>{
    const hasLink = !!s.link;
    html += '<div class="stop-row" data-idx="'+i+'">'
      + '<div class="stop-num'+(s.addr?'':' dim')+'">'+(i+1)+'</div>'
      + '<div class="stop-info">'
        + (s.time ? '<div class="time">'+s.time+'</div>' : '')
        + '<div class="name">'+s.name+'</div>'
      + '</div>'
      + (hasLink ? '<a class="go-btn" href="'+s.link+'" target="_blank" rel="noopener">바로가기</a>' : '')
      + '</div>';
  });
  document.getElementById('sheet-list').innerHTML = html;
  document.querySelectorAll('.stop-row').forEach(row=>{
    row.addEventListener('click', (e)=>{
      if(e.target.closest('.go-btn')) return;
      selectStop(parseInt(row.dataset.idx,10));
    });
  });
}

function selectStop(idx){
  document.querySelectorAll('.stop-row').forEach(r=> r.classList.toggle('active', parseInt(r.dataset.idx,10)===idx));
  selectPin(idx);
}

function selectPin(idx){
  if(mapMode === 'kakao'){
    kakaoOverlays.forEach(o=> o.el.classList.remove('selected'));
    const target = kakaoOverlays.find(o=>o.idx===idx);
    if(target) target.el.classList.add('selected');
    return;
  }
  document.querySelectorAll('.pin').forEach(p=>{
    const circle = p.querySelector('circle.pin-dot');
    circle.setAttribute('fill', '#3E6E8E');
    circle.setAttribute('r','16');
    const label = p.querySelector('text');
    if(label) label.setAttribute('font-size','11');
  });
  const target = document.getElementById('pin-'+idx);
  if(target){
    const circle = target.querySelector('circle.pin-dot');
    circle.setAttribute('fill','#E8784F');
    circle.setAttribute('r','20');
    const label = target.querySelector('text');
    if(label) label.setAttribute('font-size','13');
    target.parentNode.appendChild(target);
  }
}

const sheet = document.getElementById('sheet');
function toggleSheet(){
  sheet.classList.toggle('expanded');
  document.getElementById('sheet-title').textContent = sheet.classList.contains('expanded')
    ? '아래로 내려서 지도 보기' : '위로 올려서 오늘 일정 보기';
}
document.getElementById('sheet-handle').addEventListener('click', toggleSheet);
document.getElementById('sheet-title').addEventListener('click', toggleSheet);

/* ---------------- 네비주소모음.zip ---------------- */
let currentNaviDay = 1;
function openNavi(day){
  currentNaviDay = day;
  showScreen('screen-navi');
  renderTabs(document.getElementById('navi-tabs'), day, openNavi);
  const stops = TRIP[day].filter(s => s.addr);
  const excluded = TRIP[day].length - stops.length;
  document.getElementById('navi-note').textContent = excluded>0
    ? '※ 주소 정보가 없는 장소 '+excluded+'곳은 목록에서 제외했어요' : '';
  let html='';
  stops.forEach((s,i)=>{
    html += '<div class="navi-card">'
      + '<div class="row1">'
        + '<div class="badge">'+(i+1)+'</div>'
        + '<div class="caticon">'+iconUse(s.cat)+'</div>'
        + '<h4>'+s.name+'</h4>'
      + '</div>'
      + '<p class="addr">'+s.addr+'</p>'
      + '<button class="copy-btn" data-addr="'+encodeURIComponent(s.addr)+'">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>'
        + '<span>주소 복사</span>'
      + '</button>'
      + '</div>';
  });
  document.getElementById('navi-list').innerHTML = html;
  document.querySelectorAll('.copy-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> copyAddr(btn));
  });
}

function copyAddr(btn){
  const text = decodeURIComponent(btn.dataset.addr);
  const done = ()=>{
    showToast('복사되었어요!');
    btn.classList.add('copied');
    const span = btn.querySelector('span');
    const prev = span.textContent;
    span.textContent='복사 완료';
    setTimeout(()=>{ btn.classList.remove('copied'); span.textContent=prev; }, 1400);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, cb){
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
  cb();
}

/* ---------------- 토스트 ---------------- */
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 1600);
}
