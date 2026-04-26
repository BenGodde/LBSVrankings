const CSV_FILE = "ranking.csv";

let alleSpieler = [];
let spieler = [];
let events = [];
let table;

fetch(CSV_FILE + "?v=" + Date.now())
  .then(r => r.text())
  .then(parseCSV)
  .then(init);

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.trim().split("\n");
  const d = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(d);

  events = header.slice(5);

  alleSpieler = lines.slice(1).map(l => {
    const c = l.split(d);
    const ev = events.map((_, i) => Number(c[i + 5]) || 0);
    return {
      wertung: c[1],
      vorname: c[2],
      nachname: c[3],
      team: c[4],
      events: ev,
      gesamt: besteVier(ev),
      anzeige: 0
    };
  });
}

function besteVier(p) {
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}

function init() {
  fuelleEventFilter();
  table = $("#rankingTable").DataTable({
    paging:false, info:false,
    language:{
      search:"Suche:",
      zeroRecords:"Keine Einträge",
      emptyTable:"Keine Daten"
    }
  });

  ["wertungFilter","eventFilter","teamFilter"]
    .forEach(id => document.getElementById(id)
      .addEventListener("change", aktualisiereAlles));

  aktualisiereAlles();
}

function fuelleEventFilter() {
  const sel = document.getElementById("eventFilter");
  events.forEach((e,i)=>{
    const o=document.createElement("option");
    o.value=i; o.textContent=e;
    sel.appendChild(o);
  });
}

function aktualisiereAlles() {
  const wertung = document.getElementById("wertungFilter").value;

  // 1️⃣ Spieler nach Wertung filtern
  spieler = alleSpieler.filter(s => s.wertung === wertung);

  // 2️⃣ Team-Filter vollständig zurücksetzen
  const teamFilter = document.getElementById("teamFilter");
  teamFilter.innerHTML = "<option value=''>Alle Teams</option>";
  [...new Set(spieler.map(s => s.team))].sort().forEach(team => {
    const o = document.createElement("option");
    o.value = team;
    o.textContent = team;
    teamFilter.appendChild(o);
  });

  // 3️⃣ Event-Filter zurück auf Gesamtwertung
  const eventFilter = document.getElementById("eventFilter");
  [...eventFilter.options].forEach(o => o.selected = false);
  eventFilter.querySelector("option[value='ALL']").selected = true;

  // 4️⃣ DataTables-Suche & Filter vollständig resetten
  table.search("").columns().search("").draw();

  
  // ✅ HIER GEHÖRT table.order() HIN ✅
  // Erzwingt Sortierung nach Rang (Spalte 0)
  table.order([[0, "asc"]]);

  // 5️⃣ Wertungshinweis aktualisieren
  document.getElementById("wertungHinweis").innerHTML =
    `Rangliste für Wertung: <strong>${wertung}</strong>`;

  // 6️⃣ Tabelle & Siegerbox neu berechnen
  aktualisiereTabelle();
  aktualisiereSiegerbox();
}


function fuelleTeamFilter() {
  const sel=document.getElementById("teamFilter");
  sel.innerHTML="<option value=''>Alle Teams</option>";
  [...new Set(spieler.map(s=>s.team))].sort()
    .forEach(t=>{
      const o=document.createElement("option");
      o.value=t; o.textContent=t;
      sel.appendChild(o);
    });
}

function ausgewaehlteEvents() {
  const opts=[...document.getElementById("eventFilter").selectedOptions];
  if(opts.length===0 || opts.some(o=>o.value==="ALL")) return "ALL";
  return opts.map(o=>Number(o.value));
}

function aktualisiereTabelle() {
  const a=ausgewaehlteEvents();
  spieler.forEach(s=>{
    s.anzeige = a==="ALL" ? s.gesamt : a.reduce((sum,i)=>sum+s.events[i],0);
  });
  spieler.sort((a,b)=>b.anzeige-a.anzeige);

  table.clear();
  spieler.forEach((s,i)=>{
    const rc=i===0?"rank-1":i===1?"rank-2":i===2?"rank-3":"";
    table.row.add([
      `<span class="${rc}">${i+1}</span>`,
      s.vorname, s.nachname, s.team, s.anzeige
    ]);
  });
  table.draw(false);
}

function aktualisiereSiegerbox() {
  const box=document.getElementById("siegerBox");
  box.innerHTML="";
  spieler.slice(0,3).forEach((s,i)=>{
    const medal = ["🥇","🥈","🥉"][i];
    box.innerHTML += `
      <div class="sieger">
        <h3>${medal} Platz ${i+1}</h3>
        ${s.vorname} ${s.nachname}<br>
        <strong>${s.anzeige} Punkte</strong>
      </div>`;
  });
}
``