const CSV_FILE = "ranking.csv";

let spielerAlle = [];
let eventNamen = [];
let table;

/* ===== CSV laden ===== */
fetch(CSV_FILE)
  .then(r => r.text())
  .then(parseCSV)
  .then(init);

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.trim().split("\n");
  const d = lines[0].includes(";") ? ";" : ",";

  const header = lines[0].split(d);
  eventNamen = header.slice(4);

  spielerAlle = lines.slice(1).map(l => {
    const c = l.split(d);
    const ev = eventNamen.map((_, i) => Number(c[i + 4]) || 0);
    return {
      wertung: c[0],
      vorname: c[1],
      nachname: c[2],
      team: c[3],
      events: ev,
      gesamt: besteVier(ev)
    };
  });
}

/* ===== Init ===== */
function init() {
  // Event-Filter füllen
  const ef = document.getElementById("eventFilter");
  eventNamen.forEach((e, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = e;
    ef.appendChild(o);
  });

  // Team-Filter füllen
  const tf = document.getElementById("teamFilter");
  [...new Set(spielerAlle.map(s => s.team))].sort().forEach(t => {
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    tf.appendChild(o);
  });

  table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  // Klick auf Nachname → Karten
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const s = spielerAlle[idx];

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(
      `<div class="details">
        ${s.events.map((p, i) => `
          <div class="event-card">
            <strong>${eventNamen[i]}</strong><br>${p} Punkte
          </div>`).join("")}
      </div>`
    ).show();
  });

  ["wertungFilter", "teamFilter", "eventFilter"]
    .forEach(id =>
      document.getElementById(id).addEventListener("change", update)
    );

  update();
}

/* ===== Update ===== */
function update() {
  const w = document.getElementById("wertungFilter").value;
  const t = document.getElementById("teamFilter").value;
  const e = document.getElementById("eventFilter").value;

  table.clear();
  document.getElementById("siegerBox").innerHTML = "";

  const daten = spielerAlle
    .filter(s => s.wertung === w)
    .filter(s => !t || s.team === t)
    .map(s => ({
      ...s,
      punkte: e === "ALL" ? s.gesamt : (s.events[e] || 0)
    }))
    .sort((a, b) => b.punkte - a.punkte);

  daten.forEach((s, i) => {
    const node = table.row.add([
      i + 1,
      s.vorname,
      `<span class="nachname">${s.nachname}</span>`,
      s.team,
      s.punkte
    ]).node();
    node.dataset.idx = spielerAlle.indexOf(s);
  });

  table.draw();

  // Siegerbox
  daten.slice(0, 3).forEach((s, i) => {
    document.getElementById("siegerBox").innerHTML += `
      <div class="sieger">
        ${["🥇","🥈","🥉"][i]} Platz ${i+1}<br>
        <strong>${s.vorname} ${s.nachname}</strong><br>
        ${s.punkte} Punkte
      </div>`;
  });
}

/* ===== Helper ===== */
function besteVier(p) {
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}