/**********************************************************
 * Konfiguration
 **********************************************************/
const CSV_FILE = "ranking.csv";

/**********************************************************
 * Globale Zustände
 **********************************************************/
let alleSpieler = [];
let aktiveSpieler = [];
let eventNamen = [];
let table = null;

/**********************************************************
 * CSV laden & starten
 **********************************************************/
fetch(CSV_FILE + "?v=" + Date.now())
  .then(res => res.text())
  .then(parseCSV)
  .then(initUI)
  .catch(err => {
    console.error("Fehler beim Laden der CSV:", err);
    alert("CSV-Datei konnte nicht geladen werden.");
  });

/**********************************************************
 * CSV PARSEN
 * Erwartet:
 * Wertung,First Name,Last Name,Team Name,Event1,Event2,...
 **********************************************************/
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, ""); // BOM entfernen
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV enthält keine Daten");

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delimiter);

  // Events ab Spalte 5
  eventNamen = header.slice(4);

  alleSpieler = lines.slice(1).map(line => {
    const c = line.split(delimiter);
    const events = eventNamen.map((_, i) => Number(c[i + 4]) || 0);
    return {
      wertung: c[0],
      vorname: c[1],
      nachname: c[2],
      team: c[3],
      events,
      gesamt: berechneBesteVier(events),
      anzeigePunkte: 0
    };
  });
}

/**********************************************************
 * UI Initialisierung
 **********************************************************/
function initUI() {
  fuelleEventFilter();

  table = $("#rankingTable").DataTable({
    paging: false,
    info: false,
    order: [[0, "asc"]], // Rang immer aufsteigend
    columnDefs: [
      { targets: 0, orderable: false } // Rang nicht klick-sortierbar
    ],
    columns: [
      { data: "Rang" },
      { data: "Vorname" },
      { data: "Nachname" },
      { data: "Team" },
      { data: "Punkte" }
    ],
    language: {
      search: "Suche:",
      zeroRecords: "Keine Einträge gefunden",
      emptyTable: "Keine Daten vorhanden"
    },
    createdRow: function (row, data) {
      if (data.Rang === 1) row.classList.add("rank-1");
      if (data.Rang === 2) row.classList.add("rank-2");
      if (data.Rang === 3) row.classList.add("rank-3");
    }
  });

  // Klick auf Nachnamen → Details auf/zu
  $("#rankingTable tbody").on("click", ".nachname-click", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    if (!row.data()) return;

    if (row.child.isShown()) {
      row.child.hide();
      tr.removeClass("shown");
      return;
    }

    const spieler = row.data()._spieler;

    const detailsHTML =
      `<div class="event-grid">
        ${spieler.events.map((p, i) => `
          <div class="event-card">
            <strong>${eventNamen[i]}</strong><br>
            ${p} Punkte
          </div>
        `).join("")}
      </div>`;

    row.child(detailsHTML).show();
    tr.addClass("shown");
  });

  // Filter
  document.getElementById("wertungFilter")
    .addEventListener("change", aktualisiereAlles);

  document.getElementById("eventFilter")
    .addEventListener("change", aktualisiereAlles);

  document.getElementById("teamFilter")
    .addEventListener("change", () => {
      table.column(3)
        .search(document.getElementById("teamFilter").value)
        .draw();
    });

  aktualisiereAlles();
}

/**********************************************************
 * Filter & Aktualisierung
 **********************************************************/
function aktualisiereAlles() {
  const wertung = document.getElementById("wertungFilter").value;

  // Spieler nach Wertung
  aktiveSpieler = alleSpieler.filter(s => s.wertung === wertung);

  // Team-Filter neu füllen
  const teamFilter = document.getElementById("teamFilter");
  teamFilter.innerHTML = "<option value=''>Alle Teams</option>";
  [...new Set(aktiveSpieler.map(s => s.team))].sort().forEach(team => {
    const o = document.createElement("option");
    o.value = team;
    o.textContent = team;
    teamFilter.appendChild(o);
  });

  // Event-Filter zurücksetzen
  const eventFilter = document.getElementById("eventFilter");
  [...eventFilter.options].forEach(o => o.selected = false);
  eventFilter.querySelector("option[value='ALL']").selected = true;

  // Tabelle resetten
  table.search("").columns().search("").order([[0, "asc"]]);

  // Hinweis
  document.getElementById("wertungHinweis").innerHTML =
    `Rangliste für Wertung: <strong>${wertung}</strong>`;

  aktualisiereTabelle();
  aktualisiereSiegerbox();
}

/**********************************************************
 * Tabelle neu aufbauen
 **********************************************************/
function aktualisiereTabelle() {
  const eventAuswahl = ausgewaehlteEvents();

  // Punkte berechnen
  aktiveSpieler.forEach(s => {
    s.anzeigePunkte =
      eventAuswahl === "ALL"
        ? s.gesamt
        : eventAuswahl.reduce((sum, i) => sum + s.events[i], 0);
  });

  // intern nach Punkten sortieren (für Rang)
  aktiveSpieler.sort((a, b) => b.anzeigePunkte - a.anzeigePunkte);

  table.clear();

  aktiveSpieler.forEach((s, index) => {
    const rang = index + 1;
    table.row.add({
      Rang: rang, // ✅ echte Zahl!
      Vorname: s.vorname,
      Nachname: `<span class="nachname-click">${s.nachname}</span>`,
      Team: s.team,
      Punkte: s.anzeigePunkte,
      _spieler: s
    });
  });

  table.order([[0, "asc"]]).draw(false);
}

/**********************************************************
 * Siegerbox
 **********************************************************/
function aktualisiereSiegerbox() {
  const box = document.getElementById("siegerBox");
  box.innerHTML = "";

  aktiveSpieler.slice(0, 3).forEach((s, i) => {
    const medal = ["🥇", "🥈", "🥉"][i];
    box.innerHTML += `
      <div class="sieger">
        <h3>${medal} Platz ${i + 1}</h3>
        ${s.vorname} ${s.nachname}<br>
        <strong>${s.anzeigePunkte} Punkte</strong>
      </div>`;
  });
}

/**********************************************************
 * Hilfsfunktionen
 **********************************************************/
function ausgewaehlteEvents() {
  const opts = [...document.getElementById("eventFilter").selectedOptions];
  if (opts.length === 0 || opts.some(o => o.value === "ALL")) {
    return "ALL";
  }
  return opts.map(o => Number(o.value));
}

function fuelleEventFilter() {
  const sel = document.getElementById("eventFilter");
  eventNamen.forEach((e, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = e;
    sel.appendChild(o);
  });
}

function berechneBesteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((s, p) => s + p, 0);
}