const CSV_FILE = "ranking.csv";

let spielerDaten = [];
let eventSpalten = [];
let table;

fetch(CSV_FILE)
  .then(res => res.text())
  .then(parseCSV)
  .then(init);

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  eventSpalten = headers.slice(4);

  spielerDaten = lines.slice(1).map(line => {
    const c = line.split(",");
    const events = eventSpalten.map((_, i) => Number(c[i + 4]) || 0);

    return {
      vorname: c[1],
      nachname: c[2],
      team: c[3],
      events,
      gesamt: besteVier(events),
      anzeige: 0
    };
  });
}

function besteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((s, p) => s + p, 0);
}

function init() {
  fuelleEventFilter();
  fuelleTeamFilter();
  erstelleTabelle();
  aktualisiereTabelle();

  document.getElementById("eventFilter")
    .addEventListener("change", aktualisiereTabelle);

  document.getElementById("teamFilter")
    .addEventListener("change", () => {
      table.column(3).search(
        document.getElementById("teamFilter").value
      ).draw();
    });
}

function fuelleEventFilter() {
  const sel = document.getElementById("eventFilter");
  eventSpalten.forEach((e, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = e;
    sel.appendChild(o);
  });
}

function fuelleTeamFilter() {
  const sel = document.getElementById("teamFilter");
  [...new Set(spielerDaten.map(s => s.team))]
    .sort()
    .forEach(team => {
      const o = document.createElement("option");
      o.value = team;
      o.textContent = team;
      sel.appendChild(o);
    });
}

function ausgewEvents() {
  const opts = [...document.getElementById("eventFilter").selectedOptions];
  if (opts.some(o => o.value === "ALL") || opts.length === 0) {
    document.getElementById("wertungHinweis").textContent =
      "Anzeige: Gesamtwertung (beste 4 Events)";
    return "ALL";
  }

  document.getElementById("wertungHinweis").textContent =
    "Anzeige: Summe der ausgewählten Events";

  return opts.map(o => Number(o.value));
}

function aktualisiereTabelle() {
  const auswahl = ausgewEvents();

  spielerDaten.forEach(s => {
    s.anzeige = auswahl === "ALL"
      ? s.gesamt
      : auswahl.reduce((sum, i) => sum + s.events[i], 0);
  });

  spielerDaten.sort((a, b) => b.anzeige - a.anzeige);

  table.clear();

  spielerDaten.forEach((s, i) => {
    const rClass =
      i === 0 ? "rank-1" :
      i === 1 ? "rank-2" :
      i === 2 ? "rank-3" : "";

    table.row.add([
      `<span class="${rClass}">${i + 1}</span>`,
      s.vorname,
      `<span class="spieler-name" data-i="${i}">${s.nachname}</span>`,
      s.team,
      s.anzeige
    ]);
  });

  table.draw(false);
}

function erstelleTabelle() {
  table = $("#rankingTable").DataTable({
    paging: false,
    info: false,
    language: {
      search: "Suche:",
      zeroRecords: "Keine Einträge gefunden",
      emptyTable: "Keine Daten vorhanden"
    }
  });

  $("#rankingTable tbody").on("click", ".spieler-name", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const s = spielerDaten[this.dataset.i];

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(
      `<div class="details-row">
         <div class="event-grid">
           ${s.events.map((p, i) =>
             `<div class="event-card">
                <strong>${eventSpalten[i]}</strong><br>
                ${p} Punkte
              </div>`
           ).join("")}
         </div>
       </div>`
    ).show();
  });
}