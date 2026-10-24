const $=id=>document.getElementById(id), DB_NAME='moi-ilizarov-db', DB_STORE='app-state', KEY='main';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const fmt=d=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(d);
const shortDate=d=>new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(d);
const kindInfo={hospitalization:{label:'Госпитализация',color:'#9b51d2',symbol:'H'},operation:{label:'Операция',color:'#bd5b58',symbol:'✚'},dressing:{label:'Перевязка',color:'#4c83b9',symbol:'▦'},turn:{label:'Крутка',color:'#287451',symbol:'↻'}};
const defaults=()=>({wake:'08:00',first:'12:00',bed:'00:00',dailyTarget:1,totalGoal:30,dailyPlans:{},completed:{},turnLogs:[],interval:2,horizon:14,month:iso(new Date()).slice(0,7),selected:iso(new Date()),events:[{id:'e1',date:'2026-10-16',title:'Госпитализация',detail:'Поступление в стационар',kind:'hospitalization'},{id:'e2',date:'2026-10-17',title:'День операции',detail:'Операция, установка аппарата Илизарова',kind:'operation'},{id:'e3',date:'2026-10-18',title:'Первая перевязка',detail:'Первая перевязка после операции',kind:'dressing'},{id:'e4',date:'2026-10-20',title:'Выписка · вторая перевязка',detail:'Выписка из стационара',kind:'dressing'},{id:'e5',date:'2026-10-23',title:'Первая крутка · третья перевязка',detail:'Начало коррекции; третья перевязка',kind:'turn'}]});
let state=defaults(),db=null;
function openDB(){return new Promise(resolve=>{if(!('indexedDB'in window)){resolve(null);return}const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null)})}
function dbRead(){return new Promise(resolve=>{if(!db){resolve(null);return}const r=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(KEY);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null)})}
function save(){try{localStorage.setItem('moi-ilizarov-pwa-v2',JSON.stringify(state))}catch{}if(db){try{db.transaction(DB_STORE,'readwrite').objectStore(DB_STORE).put(state,KEY)}catch{}}}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function expectedDayKey(){const d=new Date();if(d.getHours()<7)d.setDate(d.getDate()-1);return iso(d)}
function dayKey(){return state.activeDay||expectedDayKey()}
function refreshDayPrompt(){
 const expected=expectedDayKey(),active=state.activeDay||expected,prompt=$('newDayPrompt');
 const previous=iso(parseISO(expected));const prevDate=parseISO(expected);prevDate.setDate(prevDate.getDate()-1);const yesterday=iso(prevDate);
 const todayDone=Array.isArray(state.completed?.[expected])?state.completed[expected]:[];
 const yesterdayHasData=(state.completed?.[yesterday]?.length||0)>0||!!state.dailyPlans?.[yesterday];
 const recovery=active===expected&&todayDone.length===4;
 if(prompt){prompt.classList.toggle('hidden',active===expected&&!recovery);const heading=prompt.querySelector('div');const copy=prompt.querySelector('.sub');const button=$('beginDay');
  if(recovery){if(heading)heading.textContent='Проверь дату отметок';if(yesterdayHasData){if(copy)copy.textContent=`На ${fmt(parseISO(expected))} отмечены все четыре крутки, а запись за ${fmt(parseISO(yesterday))} уже существует. Если сегодняшние отметки попали сюда по ошибке, можно очистить только ${fmt(parseISO(expected))}; вчерашняя запись останется нетронутой.`;if(button)button.textContent='Очистить отметки за сегодня';}else{if(copy)copy.textContent=`На ${fmt(parseISO(expected))} сохранены все четыре отметки, а за вчера нет записи. Если это вчерашние крутки, можно перенести их на ${fmt(parseISO(yesterday))} и начать сегодняшний день с нуля. Ничего не изменится без твоего подтверждения.`;if(button)button.textContent='Перенести отметки на вчера';}}
  else {if(heading)heading.textContent='Пора начать новый день';if(copy)copy.textContent=`Текущая запись: ${fmt(parseISO(active))}. Вчерашние отметки останутся в истории. Откроется отдельная запись за ${fmt(parseISO(expected))}.`;if(button)button.textContent='Начать новый день';}
  prompt.dataset.recovery=recovery?(yesterdayHasData?'clear':'move'):'false';
 }
 if($('todayHeading'))$('todayHeading').textContent=`Крутки · ${fmt(parseISO(active))}`;
}
function beginNewDay(){
 const expected=expectedDayKey(),current=dayKey();
 if(current===expected){
  if($('newDayPrompt')?.dataset.recovery==='move'||$('newDayPrompt')?.dataset.recovery==='clear'){
   const mode=$('newDayPrompt').dataset.recovery;const prevDate=parseISO(expected);prevDate.setDate(prevDate.getDate()-1);const yesterday=iso(prevDate);
   const message=mode==='move'?`Перенести четыре отметки с ${fmt(parseISO(expected))} на ${fmt(parseISO(yesterday))} и оставить сегодняшний день пустым?`:`Удалить только отметки за ${fmt(parseISO(expected))}? Запись за ${fmt(parseISO(yesterday))} и остальные дни останутся нетронутыми.`;
   if(!confirm(message+' Проверь дату перед подтверждением.'))return;
   if(mode==='move'){const slots=[...(state.completed[expected]||[])];state.completed[yesterday]=slots;if(state.dailyPlans[expected])state.dailyPlans[yesterday]={...state.dailyPlans[expected]};state.turnLogs=(state.turnLogs||[]).map(l=>l.date===expected?{...l,date:yesterday,id:`${yesterday}-${l.slot}`}:l);}
   delete state.completed[expected];state.turnLogs=(state.turnLogs||[]).filter(l=>l.date!==expected);
   state.activeDay=expected;state.selected=expected;
   if(!state.dailyPlans[expected])state.dailyPlans[expected]={wake:state.wake,first:state.first,bed:state.bed,dailyTarget:Number(state.dailyTarget)||1};
   save();renderAll();return;
  }
  refreshDayPrompt();return;
 }
 state.activeDay=expected;state.selected=expected;
 if(!state.dailyPlans[expected])state.dailyPlans[expected]={wake:state.wake,first:state.first,bed:state.bed,dailyTarget:Number(state.dailyTarget)||1};
 save();renderAll();
}function mins(t){if(!/^\d\d:\d\d$/.test(t||''))return null;const [h,m]=t.split(':').map(Number);return h<24&&m<60?h*60+m:null}function clock(m){m=(m%1440+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function turnTimes(date=dayKey()){const p=state.dailyPlans?.[date];const first=p?.first||state.first,bed=p?.bed||state.bed;const a=mins(first),b=mins(bed);if(a===null||b===null)return null;const end=b<=a?b+1440:b;if(end<=a)return null;return [0,1,2,3].map(i=>clock(Math.round(a+(end-a)*i/3)))}
function planFor(date){return state.dailyPlans?.[date]||{dailyTarget:Number(state.dailyTarget)||1,first:state.first,bed:state.bed,wake:state.wake}}
function totalProgress(){let total=0;for(const [date,slots] of Object.entries(state.completed||{})){const p=planFor(date);total+=(Math.max(.1,Number(p.dailyTarget)||1)*Math.min(4,slots.length))/4}return Math.round(total*10)/10}
function doneArray(date=dayKey()){return state.completed[date]||[]}
function renderTurns(){
 const today=dayKey(),done=doneArray(),target=Math.max(.1,Number(planFor(today).dailyTarget)||Number(state.dailyTarget)||1),progress=Math.min(100,done.length/4*100),amount=Math.round(done.length/4*target*10)/10,total=totalProgress(),goal=Math.max(.1,Number(state.totalGoal)||30),overall=Math.min(100,total/goal*100);
 $('headerDate').textContent=fmt(parseISO(today))+' · твой путь';refreshDayPrompt();
 $('wake').value=state.wake;$('first').value=state.first;$('bed').value=state.bed;$('dailyTarget').value=state.dailyTarget;
 $('totalValue').textContent=Number.isInteger(total)?total.toFixed(0):total.toFixed(1);$('totalGoalLabel').textContent=goal;$('totalPercent').textContent=`${Math.round(overall)}%`;$('totalText').textContent=total===0?'Первый день начинается с маленького шага':total>=goal?'Ты достигла своей установленной цели':`Каждый завершённый шаг складывается в твой путь`;
 $('progressValue').textContent=Number.isInteger(amount)?amount.toFixed(0):amount.toFixed(1);
 $('progressText').textContent=done.length===4?'Все четыре отметки на сегодня сделаны':done.length?`Осталось ${4-done.length} ${plural(4-done.length,'крутка','крутки','круток')}`:'Сегодня можно начать с первой отметки';
 $('progressFill').style.width=overall+'%';$('doneCount').textContent=`${done.length} из 4`;$('targetLabel').textContent=`${target} мм`;
 const celebration=$('celebration');celebration.classList.toggle('hidden',done.length!==4);celebration.textContent=done.length===4?`Сегодняшний план завершён. По твоему плану за день: ${amount} мм. Можно спокойно отдыхать.`:'';$('finishScreen').classList.add('hidden');$('finishScreen').dataset.shown='';
 $('finishCopy').textContent=`Сегодняшний план завершён. По твоему плану это ${amount} мм. Завтра начнётся новый день, а сегодняшний останется в истории. Отдыхай, ты сделала свой шаг.`;document.querySelector('.progress-card')?.classList.toggle('complete',done.length===4);
 const times=turnTimes(),grid=$('ringGrid');grid.innerHTML='';
 for(let i=0;i<4;i++){const isDone=done.includes(i),time=times?.[i]||'—',item=document.createElement('div');item.className='turn'+(isDone?' done':'');item.innerHTML=`<button aria-label="Крутка ${i+1}, ${isDone?'выполнена':'отметить выполненной'}"><span class="turn-icon">${isDone?'✓':String(i+1).padStart(2,'0')}</span><span><span class="turn-num">Крутка ${i+1}</span><span class="turn-name" style="display:block">${isDone?'Отмечена':'Отметить выполнение'}</span></span></button><div class="turn-time">${time}</div><span class="status ${isDone?'done':''}">${isDone?'Готово':'По плану'}</span>`;
 item.querySelector('button').onclick=()=>{let arr=doneArray();const wasDone=arr.length===4;if(!state.dailyPlans[today])state.dailyPlans[today]={wake:state.wake,first:state.first,bed:state.bed,dailyTarget:Number(state.dailyTarget)||1};state.completed[today]=arr.includes(i)?arr.filter(n=>n!==i):[...arr,i].sort((a,b)=>a-b);const logs=state.turnLogs.filter(l=>!(l.date===today&&l.slot===i));if(!arr.includes(i))logs.push({id:`${today}-${i}`,date:today,slot:i,time:new Date().toISOString()});state.turnLogs=logs;save();renderTurns();renderTurnHistory();if(!wasDone&&state.completed[today].length===4){$('finishScreen').classList.remove('hidden');$('finishScreen').dataset.shown='true';}};
 grid.append(item)}
 const t=times;$('intervalNote').textContent=t?`Сегодняшний ритм: ${t.join(' · ')}. Измени время первой крутки или отбоя, и расписание пересчитается.`:'Проверь время первой крутки и отбоя.';
}
function plural(n,a,b,c){const n10=n%10,n100=n%100;return n100>=11&&n100<=14?c:n10===1?a:n10>=2&&n10<=4?b:c}
function renderTurnHistory(){
 const host=$('turnHistory');
 const dates=[...new Set([...Object.keys(state.completed||{}),...Object.keys(state.dailyPlans||{})])]
   .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d))
   .sort((a,b)=>b.localeCompare(a));
 host.innerHTML='';
 if(!dates.length){host.innerHTML='<div class="empty">История появится после первой сохранённой отметки или плана дня.</div>';return}
 dates.slice(0,60).forEach(date=>{
   const slots=Array.isArray(state.completed[date])?state.completed[date]:[];
   const count=slots.length, target=Math.max(.1,Number(planFor(date).dailyTarget)||1);
   const amount=Math.round(count/4*target*10)/10,el=document.createElement('div');
   el.className='history-item';
   el.innerHTML=`<div class="history-marker">${count===4?'✓':count||'·'}</div><div class="history-main"><div class="history-date">${fmt(parseISO(date))}${date===expectedDayKey()?' · сегодня':''}</div><div class="history-title">${count} из 4 круток · расчётно ${amount} мм</div><div class="history-detail">${count?slots.map(n=>`№${n+1}`).join(' · ')+(count===4?' · дневной план выполнен':''):'День сохранён, отметок пока нет'}</div></div><button class="secondary history-open" data-date="${date}" style="align-self:center;white-space:nowrap">Открыть</button>`;
   el.querySelector('.history-open').onclick=()=>{state.activeDay=date;state.selected=date;save();renderAll();switchTab('turns');window.scrollTo({top:0,behavior:'smooth'})};
   host.append(el);
 });
}
function lastDressing(){const ev=state.events.filter(e=>e.kind==='dressing').sort((a,b)=>a.date.localeCompare(b.date));return ev.length?parseISO(ev[ev.length-1].date):null}
function forecastDates(){const last=lastDressing();if(!last)return[];const result=[],today=parseISO(iso(new Date())),step=Math.max(1,Number(state.interval)||2);for(let i=1;i<=Math.ceil(Number(state.horizon)/step)+2;i++){const d=new Date(last);d.setDate(d.getDate()+i*step);if(d>=today&&d<=new Date(today.getTime()+Number(state.horizon)*86400000))result.push(iso(d))}return result}
function monthDate(){const [y,m]=state.month.split('-').map(Number);return new Date(y,m-1,1,12)}
function renderCalendar(){const month=monthDate(),y=month.getFullYear(),m=month.getMonth(),title=new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric'}).format(month);$('monthTitle').textContent=title.charAt(0).toLocaleUpperCase('ru-RU')+title.slice(1);const grid=$('calendar');grid.innerHTML='';['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(d=>{const e=document.createElement('div');e.className='weekday';e.textContent=d;grid.append(e)});const offset=(new Date(y,m,1).getDay()+6)%7;for(let i=0;i<offset;i++)grid.append(document.createElement('div'));const count=new Date(y,m+1,0).getDate(),forecast=forecastDates();for(let day=1;day<=count;day++){const key=iso(new Date(y,m,day,12)),ev=state.events.filter(e=>e.date===key),isForecast=forecast.includes(key),btn=document.createElement('button');btn.className='day'+(state.selected===key?' selected':'')+(key===dayKey()?' today':'')+(isForecast?' forecast':'');const dots=[...new Set(ev.map(e=>e.kind))].slice(0,3).map(k=>`<i class="dot" style="background:${kindInfo[k].color}"></i>`).join('');btn.innerHTML=`${day}<span class="dots">${dots}${isForecast?'<i class="dot" style="background:#fff;border:1px solid #287451"></i>':''}</span>`;btn.onclick=()=>{state.selected=key;save();renderCalendar()};grid.append(btn)}const selected=state.events.filter(e=>e.date===state.selected),forecastSelected=forecast.includes(state.selected);$('selectedDayNote').innerHTML=`<strong>${fmt(parseISO(state.selected))}</strong><div class="month-event">${selected.length?selected.map(e=>`${kindInfo[e.kind].symbol} ${escapeHTML(e.title)}`).join('<br>'):'Нет записанных событий.'}${forecastSelected?'<br>◌ Прогнозная дата перевязки':''}</div>${forecastSelected?'<button class="primary" id="markDressing" style="margin-top:10px">Отметить перевязку</button>':''}`;const mark=$('markDressing');if(mark)mark.onclick=()=>{if(!state.events.some(e=>e.date===state.selected&&e.kind==='dressing'))state.events.push({id:crypto.randomUUID?.()||String(Date.now()),date:state.selected,title:'Перевязка',detail:'Отмечено выполненной',kind:'dressing'});save();renderAll()}}
function renderEvents(){const list=$('eventList');list.innerHTML='';[...state.events].sort((a,b)=>b.date.localeCompare(a.date)).forEach(e=>{const row=document.createElement('div');row.className='history-item';row.innerHTML=`<div class="history-marker" style="background:${kindInfo[e.kind].color}18;color:${kindInfo[e.kind].color}">${kindInfo[e.kind].symbol}</div><div class="history-main"><div class="history-date">${fmt(parseISO(e.date))}</div><div class="history-title">${escapeHTML(e.title||kindInfo[e.kind].label)}</div><div class="history-detail">${escapeHTML(e.detail||kindInfo[e.kind].label)}</div></div><div class="history-actions"><button class="icon-btn" aria-label="Действия с событием" title="Действия">···</button><div class="menu hidden"><button data-action="edit">Редактировать</button><button class="danger" data-action="delete">Удалить событие</button></div></div>`;const toggle=row.querySelector('.icon-btn'),menu=row.querySelector('.menu');toggle.onclick=()=>{document.querySelectorAll('.menu').forEach(m=>{if(m!==menu)m.classList.add('hidden')});menu.classList.toggle('hidden')};menu.querySelector('[data-action="edit"]').onclick=()=>{menu.classList.add('hidden');openEvent(e)};menu.querySelector('[data-action="delete"]').onclick=()=>{menu.classList.add('hidden');if(confirm(`Удалить событие «${e.title}»?`)){state.events=state.events.filter(x=>x.id!==e.id);save();renderAll()}};list.append(row)});if(!state.events.length)list.innerHTML='<div class="empty">История событий пока пуста.</div>';$('nextDate').textContent=forecastDates()[0]?`Следующая предполагаемая дата: ${fmt(parseISO(forecastDates()[0]))}`:'Добавь запись о перевязке, чтобы увидеть прогноз.'}
function renderAll(){renderTurns();renderTurnHistory();renderCalendar();renderEvents()}
function switchTab(which){const turns=which==='turns';$('turnsPanel').classList.toggle('hidden',!turns);$('dressingsPanel').classList.toggle('hidden',turns);$('tabTurns').classList.toggle('active',turns);$('tabDressings').classList.toggle('active',!turns)}
function openEvent(e){$('dialogTitle').textContent=e?'Редактировать событие':'Новое событие';$('editId').value=e?.id||'';$('eventDate').value=e?.date||state.selected;$('eventKind').value=e?.kind||'dressing';$('eventTitle').value=e?.title||'';$('eventDetail').value=e?.detail||'';$('eventDialog').showModal()}
$('beginDay')?.addEventListener('click',beginNewDay);$('finishClose').onclick=()=>$('finishScreen').classList.add('hidden');$('tabTurns').onclick=()=>switchTab('turns');$('tabDressings').onclick=()=>switchTab('dressings');function saveTodayPlan(){state.dailyPlans=state.dailyPlans||{};state.dailyPlans[dayKey()]={wake:state.wake,first:state.first,bed:state.bed,dailyTarget:Number(state.dailyTarget)||1};}
$('wake').onchange=e=>{state.wake=e.target.value;saveTodayPlan();save();renderTurns()};
$('first').onchange=e=>{state.first=e.target.value;saveTodayPlan();save();renderTurns()};
$('bed').onchange=e=>{state.bed=e.target.value;saveTodayPlan();save();renderTurns()};
$('dailyTarget').onchange=e=>{state.dailyTarget=Math.max(.1,Math.min(10,Number(e.target.value)||1));saveTodayPlan();save();renderTurns();renderTurnHistory()};
$('totalGoal').onchange=e=>{state.totalGoal=Math.max(.1,Number(e.target.value)||30);save();renderTurns()};$('resetTurns').onclick=()=>{if(confirm('Снять все отметки за сегодня?')){delete state.completed[dayKey()];state.turnLogs=state.turnLogs.filter(l=>l.date!==dayKey());save();renderTurns();renderTurnHistory()}};$('interval').onchange=e=>{state.interval=Number(e.target.value);save();renderCalendar();renderEvents()};$('horizon').onchange=e=>{state.horizon=Number(e.target.value);save();renderCalendar();renderEvents()};$('prevMonth').onclick=()=>{const d=monthDate();d.setMonth(d.getMonth()-1);state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;save();renderCalendar()};$('nextMonth').onclick=()=>{const d=monthDate();d.setMonth(d.getMonth()+1);state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;save();renderCalendar()};$('addEvent').onclick=()=>openEvent();$('cancelEvent').onclick=()=>$('eventDialog').close();$('eventForm').onsubmit=e=>{e.preventDefault();const id=$('editId').value||crypto.randomUUID?.()||String(Date.now()),obj={id,date:$('eventDate').value,kind:$('eventKind').value,title:$('eventTitle').value.trim()||kindInfo[$('eventKind').value].label,detail:$('eventDetail').value.trim()};const idx=state.events.findIndex(x=>x.id===id);if(idx>=0)state.events[idx]=obj;else state.events.push(obj);state.events.sort((a,b)=>a.date.localeCompare(b.date));state.selected=obj.date;save();$('eventDialog').close();renderAll()};
function exportJSON(){const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),app:'Мой Илизаров',state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`moi-ilizarov-backup-${dayKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}$('exportData').onclick=exportJSON;$('exportAll').onclick=exportJSON;

// Reminder support: browser notifications can be checked while this app is open.
let notifiedSlots=new Set();
function updateReminderStatus(){const el=$('reminderStatus');if(!el)return;const enabled=!!state.remindersEnabled;el.textContent=!('Notification'in window)?'Этот браузер не поддерживает уведомления.':Notification.permission==='denied'?'Уведомления запрещены в настройках браузера.':enabled?'Напоминания включены. Для надёжности держи приложение открытым; iPhone не гарантирует фоновые уведомления без push-сервера.':'Включи, чтобы получать уведомления о времени круток, пока приложение открыто.';}
async function setReminders(enabled){if(enabled&&'Notification'in window&&Notification.permission==='default'){try{await Notification.requestPermission()}catch{}}state.remindersEnabled=enabled&&('Notification'in window)&&Notification.permission==='granted';save();if($('remindersEnabled'))$('remindersEnabled').checked=state.remindersEnabled;updateReminderStatus();}
if($('remindersEnabled'))$('remindersEnabled').onchange=e=>setReminders(e.target.checked);
function checkDueReminders(){if(!state.remindersEnabled||!('Notification'in window)||Notification.permission!=='granted')return;const date=dayKey(),times=turnTimes(date),done=state.completed[date]||[],now=new Date();if(!times)return;times.forEach((t,i)=>{const key=date+'-'+i;if(done.includes(i)||notifiedSlots.has(key))return;const n=mins(t);if(n===null)return;const nowM=now.getHours()*60+now.getMinutes();if(nowM>=n&&nowM<n+3){try{new Notification('Время крутки',{body:`Крутка ${i+1} по твоему плану · ${t}`,icon:'./icon-180.png'});notifiedSlots.add(key)}catch{}}});}
setInterval(checkDueReminders,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDueReminders()});

(async()=>{db=await openDB();let stored=await dbRead();if(!stored){try{stored=JSON.parse(localStorage.getItem('moi-ilizarov-pwa-v2')||localStorage.getItem('moi-ilizarov-pwa-v1')||'null')}catch{stored=null}}if(stored){state={...defaults(),...stored,completed:stored.completed||{},dailyPlans:stored.dailyPlans||{},totalGoal:stored.totalGoal||30,interval:Math.max(1,Number(stored.interval)||2),events:(stored.events||defaults().events).map((e,i)=>({...e,id:e.id||`legacy-${i}`})),turnLogs:stored.turnLogs||[]};if(stored.completed&&!stored.turnLogs){state.turnLogs=Object.entries(stored.completed).flatMap(([date,slots])=>slots.map(slot=>({id:`${date}-${slot}`,date,slot,time:null})))}}else state=defaults();
// Always open the current day's workspace on startup. Historical records remain keyed by their own dates and can be opened from history.
const expected=expectedDayKey();
state.activeDay=expected;
state.selected=state.selected||expected;
if(!state.dailyPlans[expected])state.dailyPlans[expected]={wake:state.wake,first:state.first,bed:state.bed,dailyTarget:Number(state.dailyTarget)||1};
save();$('interval').value=state.interval;$('horizon').value=state.horizon;if($('remindersEnabled'))$('remindersEnabled').checked=!!state.remindersEnabled;updateReminderStatus();renderAll()})();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
