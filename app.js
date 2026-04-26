const CSV_FILE = "ranking.csv";

let alleSpieler = [];
let events = [];
let table = null;

/* =======================================================
   CSV laden
======================================================= */
fetch(CSV_FILE)
  .then(res => res.text())
  .then(parseCSV)
  .then(init)
  .catch(err => {
    console.error("CSV konnte nicht geladen werden", err);
  });

/* =======================================================
   CSV parsen
   Erwartet:
   Wertung,Vorname,Nachname,Team,Event1,Event2,...
======================================================= */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ""); // BOM entfernen
  const lines = text.trim().split("\n");
  const delimiter = lines[0].includes(";") ? ";" : ",";

  const header = lines[0].split(delimiter);
  events = header.slice(4);

  alleSpieler = lines.slice(1).map(line => {
    const c = line.split(delimiter);
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

/* =======================================================
   Initialisierung
======================================================= */
function init() {
  table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  // Klick auf Nachname → Details auf/zu
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    const index = tr.data("idx");
    const s = alleSpieler[index];

    row.child(
      `<div class="details">
        ${s.events.map((p,i)=>`${events[i]}: ${p}`).join("<br>")}
      </div>`
    ).show();
  });

  // Wertungsfilter
  document
    .getElementById("wertungFilter")
    .addEventListener("change", update);

  update(); // Initial anzeigen
}

/* =======================================================
   Tabelle aktualisieren (STABIL)
======================================================= */
function update() {
  const wertung = document.getElementById("wertungFilter").value;

  table.clear();

  alleSpieler
    .filter(s => s.wertung === wertung)
    .sort((a, b) => b.gesamt - a.gesamt) // rein intern
    .forEach((s, i) => {
      const node = table.row.add([
        i + 1,
        s.vorname,
        `<span class="nachname">${s.nachname}</span>`,
        s.team,
        s.gesamt
      ]).node();

      // Index für Detailansicht merken
      node.dataset.idx = alleSpieler.indexOf(s);
    });

  table.draw();
}

/* =======================================================
   Hilfsfunktion: beste 4 Events
======================================================= */
function besteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((s, p) => s + p, 0);
}