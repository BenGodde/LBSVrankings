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

  // Events ab Spalte 5
  events = header.slice(4);

  alleSpieler = lines.slice(1).map(l => {
    const c = l.split(d);
    const ev = events.map((_, i) => Number(c[i + 4]) || 0);
    return {
      wertung: c[0],
      vorname: c[1],
      nachname: c[2],
      team: c[3],
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
    paging: false,
    info: false,
    columns: [
      { data: "Rang" },
      { data: "Vorname" },
      { data: "Nachname" },
      { data: "Team" },
      { data: "Punkte" }
    ],
    language: {
      search: "Suche:",
      zeroRecords: "Keine Einträge",
      emptyTable: "Keine Daten"
    }
  });

  // Klick nur auf Nachname -> Details
  $("#rankingTable tbody").on("click", ".nachname-click", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);

    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass("shown");
      return;
    }

    const s = row.data()._spieler;
    const html = `
      <div class="event-grid">
        ${s.events.map((p,i)=>`
          <div class="event-card">
            <strong>${events[i]}</strong><br>${p} Punkte
          </div>`).join("")}
      </div>`;
    row.child(html).show();
    tr.addClass("shown");
  });

  ["wertungFilter","eventFilter"].forEach(id =>
    document.getElementById(id).addEventListener("change", aktualisiereAlles)
  );

  document.getElementById("teamFilter").addEventListener("change", () => {
    table.column(3).search(
      document.getElementById("teamFilter").value
    ).draw();
  });

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
  const w = document.getElementById("wertungFilter").value;

  // Wertung filtern
  spieler = alleSpieler.filter(s => s.wertung === w);

  // Teamfilter neu
  const tf = document.getElementById("teamFilter");
  tf.innerHTML = "<option value=''>Alle Teams</option>";
  [...new Set(spieler.map(s=>s.team))].sort().forEach(t=>{
    const o=document.createElement("option");
    o.value=t; o.textContent=t;
    tf.appendChild(o);
  });

  // Eventfilter auf ALL zurück
  const ef = document.getElementById("eventFilter");
  [...ef.options].forEach(o=>o.selected=false);
  ef.querySelector("option[value='ALL']").selected=true;

  table.search("").columns().search("").order([[0,"asc"]]);

  document.getElementById("wertungHinweis").innerHTML =
    `Rangliste für Wertung: <strong>${w}</strong>`;

  aktualisiereTabelle();
  aktualisiereSiegerbox();
}

function ausgewaehlteEvents() {
  const opts=[...document.getElementById("eventFilter").selectedOptions];
  if(opts.length===0 || opts.some(o=>o.value==="ALL")) return "ALL";
  return opts.map(o=>Number(o.value));
}

function aktualisiereTabelle() {
  const a = ausgewaehlteEvents();

  spieler.forEach(s=>{
    s.anzeige = a==="ALL" ? s.gesamt : a.reduce((sum,i)=>sum+s.events[i],0);
  });
  spieler.sort((a,b)=>b.anzeige-a.anzeige);

  table.clear();
  spieler.forEach((s,i)=>{
    const rc=i===0?"rank-1":i===1?"rank-2":i===2?"rank-3":"";
    table.row.add({
      Rang: `<span class="${rc}">${i+1}</span>`,
      Vorname: s.vorname,
      Nachname: `<span class="nachname-click">${s.nachname}</span>`,
      Team: s.team,
      Punkte: s.anzeige,
      _spieler: s
    });
  });
  table.draw(false);
}

function aktualisiereSiegerbox() {
  const box=document.getElementById("siegerBox");
  box.innerHTML="";
  spieler.slice(0,3).forEach((s,i)=>{
    const m=["🥇","🥈","🥉"][i];
    box.innerHTML += `
      <div class="sieger">
        <h3>${m} Platz ${i+1}</h3>
        ${s.vorname} ${s.nachname}<br>
        <strong>${s.anzeige} Punkte</strong>
      </div>`;
  });
}