const CSV_FILE = "ranking.csv";

let spielerAlle = [];
let aktuelleDaten = [];
let eventNamen = [];
let table;

/* ======================================================
   CSV laden und parsen
====================================================== */
fetch(CSV_FILE)
  .then(r => r.text())
  .then(parseCSV)
  .then(init)
  .catch(err => console.error("CSV-Ladefehler:", err));

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const lines = text.trim().split("\n");
  const delimiter = lines[0].includes(";") ? ";" : ",";

  const header = lines[0].split(delimiter);
  eventNamen = header.slice(4);

  spielerAlle = lines.slice(1).map(line => {
    const c = line.split(delimiter);
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

/* ======================================================
   Initialisierung
====================================================== */
function init() {
  /* Event-Filter füllen */
  const ef = document.getElementById("eventFilter");
  eventNamen.forEach((e, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = e;
    ef.appendChild(o);
  });

  /* Team-Filter füllen */
  const tf = document.getElementById("teamFilter");
  [...new Set(spielerAlle.map(s => s.team))]
    .sort()
    .forEach(team => {
      const o = document.createElement("option");
      o.value = team;
      o.textContent = team;
      tf.appendChild(o);
    });

  /* DataTable */
  table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  /* Klick auf Nachname → Einzelergebnisse */
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const spieler = aktuelleDaten[idx];

    if (!spieler) return;

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(
      `<div class="details">
        ${spieler.events.map((p, i) => `
          <div class="event-card">
            <strong>${eventNamen[i]}</strong><br>
            ${p} Punkte
          </div>
        `).join("")}
      </div>`
    ).show();
  });

  /* Filter-Listener */
  ["wertungFilter", "teamFilter", "eventFilter"]
    .forEach(id =>
      document.getElementById(id).addEventListener("change", update)
    );

  update();
}

/* ======================================================
   Zentrale Update-Funktion
====================================================== */
function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const team = document.getElementById("teamFilter").value;
  const eventSel = document.getElementById("eventFilter").value;

  table.clear();
  document.getElementById("siegerBox").innerHTML = "";

  /* ✅ einziges Arbeitsarray */
  aktuelleDaten = spielerAlle
    .filter(s => s.wertung === wertung)
    .filter(s => !team || s.team === team)
    .map(s => ({
      ...s,
      punkte:
        eventSel === "ALL"
          ? s.gesamt
          : (s.events[Number(eventSel)] || 0)
    }))
    .sort((a, b) => b.punkte - a.punkte);

  /* Tabelle füllen */
  aktuelleDaten.forEach((s, i) => {
    const node = table.row.add([
      i + 1,
      s.vorname,
      `<span class="nachname">${s.nachname}</span>`,
      s.team,
      s.punkte
    ]).node();

    node.dataset.idx = i; // ✅ Index im aktuellen Datenarray
  });

  table.draw();

  /* Siegerbox (gleiche Datenbasis!) */
  aktuelleDaten.slice(0, 3).forEach((s, i) => {
    document.getElementById("siegerBox").innerHTML += `
      <div class="sieger">
        ${["🥇", "🥈", "🥉"][i]} Platz ${i + 1}<br>
        <strong>${s.vorname} ${s.nachname}</strong><br>
        ${s.punkte} Punkte
      </div>`;
  });
}

/* ======================================================
   Hilfsfunktionen
====================================================== */
function besteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((sum, p) => sum + p, 0);
}