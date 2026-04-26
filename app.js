const CSV_FILE = "ranking.csv";

let alleSpieler = [];
let events = [];
let table = null;

/* ---------- CSV laden ---------- */
fetch(CSV_FILE)
  .then(r => r.text())
  .then(parseCSV)
  .then(init);

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.trim().split("\n");
  const d = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(d);

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
      gesamt: besteVier(ev)
    };
  });
}

/* ---------- Initialisierung ---------- */
function init() {
  // Eventfilter füllen
  const ef = document.getElementById("eventFilter");
  events.forEach((e, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = e;
    ef.appendChild(opt);
  });

  table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  // Klick auf Nachname → Karten anzeigen
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const s = alleSpieler[idx];

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(
      `<div class="details">
        ${s.events.map((p, i) => `
          <div class="event-card">
            <strong>${events[i]}</strong><br>
            ${p} Punkte
          </div>
        `).join("")}
      </div>`
    ).show();
  });

  ["wertungFilter", "eventFilter", "teamFilter"]
    .forEach(id => document.getElementById(id).addEventListener("change", update));

  update();
}

/* ---------- Update (ZENTRAL!) ---------- */
function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const team = document.getElementById("teamFilter").value;
  const eventSel = document.getElementById("eventFilter").value;

  table.clear();
  document.getElementById("siegerBox").innerHTML = "";

  // ✅ ZENTRALES Arbeitsarray
  let daten = alleSpieler
    .filter(s => s.wertung === wertung)
    .filter(s => !team || s.team === team)
    .map(s => ({
      ...s,
      punkte:
        eventSel === "ALL"
          ? s.gesamt
          : s.events[Number(eventSel)] || 0
    }))
    .sort((a, b) => b.punkte - a.punkte);

  // ✅ Teamfilter nur neu befüllen, wenn leer
  const tf = document.getElementById("teamFilter");
  if (!tf.dataset.filled) {
    tf.innerHTML = "<option value=''>Alle Mannschaften</option>";
    [...new Set(daten.map(s => s.team))].sort().forEach(t => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      tf.appendChild(o);
    });
    tf.dataset.filled = "true";
  }

  // ✅ Tabelle füllen
  daten.forEach((s, i) => {
    const node = table.row.add([
      i + 1,
      s.vorname,
      `<span class="nachname">${s.nachname}</span>`,
      s.team,
      s.punkte
    ]).node();

    node.dataset.idx = alleSpieler.indexOf(s);
  });

  table.draw();

  // ✅ Siegerbox (gleiche Datenbasis!)
  daten.slice(0, 3).forEach((s, i) => {
    document.getElementById("siegerBox").innerHTML += `
      <div class="sieger">
        ${["🥇", "🥈", "🥉"][i]} Platz ${i + 1}<br>
        <strong>${s.vorname} ${s.nachname}</strong><br>
        ${s.punkte} Punkte
      </div>`;
  });
}

/* ---------- Helfer ---------- */
function besteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((s, p) => s + p, 0);
}