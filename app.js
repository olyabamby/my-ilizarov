const $ = id => document.getElementById(id);
const KEY = "moi-ilizarov-pwa-v1";
const fmt = d => new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"long",year:"numeric"}).format(d);
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const parseISO = s => {const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d,12);};
const kindInfo = {
 hospitalization:{label:"Госпитализация",color:"#9b51d2",symbol:"🛏"},
 operation:{label:"Операция",color:"#dc4545",symbol:"✚"},
 dressing:{label:"Перевязка",color:"#4385ee",symbol:"▧"},
 turn:{label:"Крутка",color:"#32945c",symbol:"🔧"}
};
const defaults = () => ({
 wake:"08:00",first:"12:00",bed:"00:00",completed:{},
 interval:2,horizon:14,reminderTime:"09:00",month:"2026-10",selected:"2026-10-23",
 events:[
  {date:"2026-10-16",title:"Госпитализация",detail:"Поступление в стационар",kind:"hospitalization"},
  {date:"2026-10-17",title:"День операции",detail:"Операция, установка аппарата Илизарова",kind:"operation"},
  {date:"2026-10-18",title:"Первая перевязка",detail:"Первая перевязка после операции",kind:"dressing"},
  {date:"2026-10-20",title:"Выписка · вторая перевязка",detail:"Выписка из стационара",kind:"dressing"},
  {date:"2026-10-23",title:"Первая крутка · третья перевязка",detail:"Начало коррекции; третья перевязка",kind:"turn"}
 ]
});
let state = load();
function load(){try{return {...defaults(),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return defaults()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function dayKey(){return iso(new Date())}
function mins(t){if(!/^\d\d:\d\d$/.test(t))return null;const [h,m]=t.split(":").map(Number);return h<24&&m<60?h*60+m:null}
function clock(m){m=(m%1440+1440)%1440;return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`}
function turnTimes(){
 const a=mins(state.first), b=mins(state.bed);
 if(a===null||b===null)return null;
 const end=b<=a?b+1440:b;if(end<=a)return null;
 return [0,1,2,3].map(i=>clock(Math.round(a+(end-a)*i/3)));
}
function ringSVG(done){
 let holes="";
 for(let i=0;i<16;i++){const a=2*Math.PI*i/16;const x=100+76*Math.cos(a),y=62+46*Math.sin(a);holes+=`<circle cx="${x}" cy="${y}" r="3.5" fill="#26322f" stroke="#f6f6f1" stroke-width="1"/>`;}
 let bolts="";
 for(let i=0;i<4;i++){const a=i*Math.PI/2;const x=100+76*Math.cos(a),y=62+46*Math.sin(a);bolts+=`<g transform="translate(${x} ${y})"><rect x="-4" y="-12" width="8" height="24" rx="2" fill="url(#steel)" stroke="#56615e" stroke-width="1"/><circle r="5" fill="url(#steel)" stroke="#48514f" stroke-width="1"/><path d="M-2 -1 L2 1 M-2 2 L2 -2" stroke="#59625f" stroke-width="1"/></g>`;}
 return `<svg viewBox="0 0 200 124" aria-hidden="true"><defs><linearGradient id="metal${done}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${done?"#c5e3cd":"#ffffff"}"/><stop offset=".28" stop-color="${done?"#4f9a6a":"#9ea8a9"}"/><stop offset=".55" stop-color="${done?"#d8f0df":"#e6e9e8"}"/><stop offset="1" stop-color="${done?"#36784f":"#6b7777"}"/></linearGradient><linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#68716f"/><stop offset=".35" stop-color="#f8f9f5"/><stop offset=".65" stop-color="#9ca5a3"/><stop offset="1" stop-color="#4b5553"/></linearGradient></defs><ellipse class="outer" cx="100" cy="62" rx="76" ry="46" fill="none" stroke="url(#metal${done})" stroke-width="10"/><ellipse cx="100" cy="62" rx="76" ry="46" fill="none" stroke="#26322f" stroke-opacity=".35" stroke-width="1.2"/>${holes}${bolts}</svg>`;
}
function renderTurns(){
 $("wake").value=state.wake;$("first").value=state.first;$("bed").value=state.bed;
 $("todayHeading").textContent=`Крутки · ${fmt(new Date())}`;
 const times=turnTimes(),grid=$("ringGrid");
 grid.innerHTML="";
 for(let i=0;i<4;i++){
  const done=!!state.completed[dayKey()]?.includes(i);
  const time=times?.[i]||"—";
  const item=document.createElement("div");item.className="turn";
  item.innerHTML=`<button class="ring-button" aria-label="Крутка ${i+1}, ${done?"выполнена":"ожидает"}"><div class="ring ${done?"done":""}">${ringSVG(done)}<span class="ring-number">${i+1}</span><span class="ring-mark">${done?"✓":"🔧"}</span></div></button><div class="turn-time">${time}</div><div class="turn-name">${["Первая","Вторая","Третья","Четвёртая"][i]} крутка</div><span class="status ${done?"done":""}">${done?"Выполнена":"Ожидает"}</span>`;
  item.querySelector("button").addEventListener("click",()=>{let arr=state.completed[dayKey()]||[];state.completed[dayKey()]=arr.includes(i)?arr.filter(x=>x!==i):[...arr,i];save();renderTurns()});
  grid.append(item);
 }
 const t=times;
 $("intervalNote").textContent=t?`Расчётный интервал между крутками: ${Math.floor(((mins(t[1])-mins(t[0])+1440)%1440)/60)} ч ${((mins(t[1])-mins(t[0])+1440)%1440)%60} мин. Это лишь расчёт времени, не медицинская рекомендация.`:"Проверь время первой крутки и отбоя.";
}
function lastDressing(){
 const ev=state.events.filter(e=>e.kind==="dressing"||(e.kind==="turn"&&/перевяз/i.test(e.title+" "+e.detail))).sort((a,b)=>a.date.localeCompare(b.date));
 return ev.length?parseISO(ev[ev.length-1].date):null;
}
function forecastDates(){
 const last=lastDressing();if(!last)return [];
 const result=[],today=new Date();today.setHours(12,0,0,0);
 for(let i=1;i<=Math.ceil(Number(state.horizon)/Number(state.interval))+1;i++){
  const d=new Date(last);d.setDate(d.getDate()+i*Number(state.interval));
  if(d>=today&&d<=new Date(today.getTime()+Number(state.horizon)*86400000))result.push(iso(d));
 }
 return result;
}
function monthDate(){const [y,m]=state.month.split("-").map(Number);return new Date(y,m-1,1,12)}
function renderCalendar(){
 const month=monthDate(),y=month.getFullYear(),m=month.getMonth(),title=new Intl.DateTimeFormat("ru-RU",{month:"long",year:"numeric"}).format(month);
 $("monthTitle").textContent=title.charAt(0).toLocaleUpperCase("ru-RU")+title.slice(1);
 const grid=$("calendar");grid.innerHTML="";
 ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].forEach(d=>{const e=document.createElement("div");e.className="weekday";e.textContent=d;grid.append(e)});
 const offset=(new Date(y,m,1).getDay()+6)%7;
 for(let i=0;i<offset;i++){const e=document.createElement("div");grid.append(e)}
 const count=new Date(y,m+1,0).getDate(),forecast=forecastDates();
 for(let day=1;day<=count;day++){
  const date=new Date(y,m,day,12),key=iso(date),ev=state.events.filter(e=>e.date===key),isForecast=forecast.includes(key);
  const btn=document.createElement("button");btn.className="day"+(state.selected===key?" selected":"")+(isForecast?" forecast":"");
  const dots=[...new Set(ev.map(e=>e.kind))].slice(0,3).map(k=>`<i class="dot" style="background:${kindInfo[k].color}"></i>`).join("");
  btn.innerHTML=`${day}<span class="dots">${dots}${isForecast?'<i class="dot" style="background:#fff;border:1px solid #2f6b50"></i>':""}</span>`;
  btn.addEventListener("click",()=>{state.selected=key;save();renderCalendar()});grid.append(btn);
 }
 const selectedEvents=state.events.filter(e=>e.date===state.selected);
 const forecastSelected=forecast.includes(state.selected);
 $("selectedDayNote").innerHTML=`<strong>${fmt(parseISO(state.selected))}</strong><div style="margin-top:6px">${selectedEvents.length?selectedEvents.map(e=>`${kindInfo[e.kind].symbol} ${escapeHTML(e.title)}`).join("<br>"):"Нет записанных событий."}${forecastSelected?'<br><span style="color:#2f6b50">◌ Предполагаемая дата перевязки по выбранному интервалу</span>':""}</div>${forecastSelected?`<button class="primary" id="markDressing" style="margin-top:10px">Отметить перевязку выполненной</button>`:""}`;
 const mark=$("markDressing");if(mark)mark.onclick=()=>{if(!state.events.some(e=>e.date===state.selected&&e.kind==="dressing"))state.events.push({date:state.selected,title:"Перевязка",detail:"Отмечено выполненной",kind:"dressing"});save();renderAll()};
}
function renderEvents(){
 const list=$("eventList");list.innerHTML="";
 [...state.events].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
  const row=document.createElement("div");row.className="event";
  row.innerHTML=`<i class="event-dot" style="background:${kindInfo[e.kind].color}"></i><div style="flex:1"><div class="event-date" style="color:${kindInfo[e.kind].color}">${fmt(parseISO(e.date))}</div><div class="event-title">${escapeHTML(e.title)}</div><div class="event-detail">${escapeHTML(e.detail||kindInfo[e.kind].label)}</div></div><button class="secondary" aria-label="Удалить событие" style="padding:5px 9px">×</button>`;
  row.querySelector("button").onclick=()=>{if(confirm("Удалить это событие?")){state.events=state.events.filter(x=>x!==e);save();renderAll()}};
  list.append(row);
 });
 if(!state.events.length)list.innerHTML='<div class="empty">История пока пуста.</div>';
}
function renderNext(){
 const dates=forecastDates(),next=dates[0];
 $("nextDate").textContent=next?fmt(parseISO(next)):"Нет даты прогноза";
 $("nextMeta").textContent=next?`Через ${Math.round((parseISO(next)-new Date(new Date().setHours(12,0,0,0)))/86400000)} дн. · по выбранному интервалу`:"Добавь запись о перевязке, чтобы построить прогноз";
}
function renderAll(){renderTurns();renderCalendar();renderEvents();renderNext()}
$("tabTurns").onclick=()=>switchTab("turns");$("tabDressings").onclick=()=>switchTab("dressings");
function switchTab(which){const turns=which==="turns";$("turnsPanel").classList.toggle("hidden",!turns);$("dressingsPanel").classList.toggle("hidden",turns);$("tabTurns").classList.toggle("active",turns);$("tabDressings").classList.toggle("active",!turns);$("tabTurns").setAttribute("aria-selected",turns);$("tabDressings").setAttribute("aria-selected",!turns)}
["wake","first","bed"].forEach(id=>$(id).addEventListener("change",e=>{state[id]=e.target.value;save();renderTurns()}));
$("resetTurns").onclick=()=>{state.completed[dayKey()]=[];save();renderTurns()};
$("interval").onchange=e=>{state.interval=Number(e.target.value);save();renderAll()};
$("horizon").onchange=e=>{state.horizon=Number(e.target.value);save();renderAll()};
$("prevMonth").onclick=()=>{const d=monthDate();d.setMonth(d.getMonth()-1);state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;save();renderCalendar()};
$("nextMonth").onclick=()=>{const d=monthDate();d.setMonth(d.getMonth()+1);state.month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;save();renderCalendar()};
$("addEvent").onclick=()=>{$("eventDate").value=state.selected;$("eventDialog").showModal()};
$("cancelEvent").onclick=()=>$("eventDialog").close();
$("eventForm").onsubmit=e=>{e.preventDefault();state.events.push({date:$("eventDate").value,kind:$("eventKind").value,title:$("eventTitle").value.trim()||kindInfo[$("eventKind").value].label,detail:$("eventDetail").value.trim()});state.events.sort((a,b)=>a.date.localeCompare(b.date));state.selected=$("eventDate").value;save();$("eventDialog").close();$("eventTitle").value="";$("eventDetail").value="";renderAll()};
$("reminderTime").onchange=e=>{state.reminderTime=e.target.value;save()};
$("enableReminder").onclick=async()=>{
 const status=$("notificationStatus");
 if(!("Notification" in window)){status.textContent="Этот браузер не поддерживает Web Notifications. На iPhone используй установленное веб-приложение и проверь версию iOS.";return}
 try{
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){status.textContent="Разрешение на уведомления не выдано. Прогноз останется в календаре.";return}
  const next=forecastDates()[0];
  status.textContent=next?`Разрешение получено. Веб-демо не гарантирует доставку уведомления в заданное время в закрытом состоянии. Следующая прогнозная дата: ${fmt(parseISO(next))}. Для надёжных напоминаний нужна проверка на iPhone.`:"Разрешение получено, но пока нет прогнозных дат.";
  if(next)new Notification("Мой Илизаров",{body:`Следующая предполагаемая перевязка: ${fmt(parseISO(next))}. Сверься с планом врача.`});
 }catch{status.textContent="Не удалось запросить разрешение. Проверь настройки браузера."}
};
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
renderAll();
