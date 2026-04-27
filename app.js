const CSV_FILE = "ranking.csv";

let spielerAlle = [];
let aktuelleDaten = [];
let eventNamen = [];
let table;

/* ======================================================
   CSV laden & parsen
====================================================== */
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
    const events = eventNamen.map((_, i) => Number(c[i + 4]) || 0);
    return {
      wertung: c[0],
      vorname: c[1],
      nachname: c[2],
      team: c[3],
      events,
      gesamt: besteVier(events)
    };
  });
}

/* ======================================================
   INIT
====================================================== */
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
    info: false,
    autoWidth: false
  });

  /* === EINZEL: Klick auf Nachname === */
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const wertung = document.getElementById("wertungFilter").value;
    if (wertung === "Team Netto" || wertung === "Team Brutto") return;

    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const s = aktuelleDaten[idx];
    if (!s) return;

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(`
      <div class="details">
        ${s.events.map((p, i) => `
          <div class="event-card"
               style="${s.gewerteteEvents.includes(i)
                 ? "border-left-color:#2e7d32;font-weight:600;"
                 : "opacity:0.6;"}">
            <strong>${eventNamen[i]}</strong><br>
            ${p} Punkte
            ${s.gewerteteEvents.includes(i) ? "<br><em>gewertet</em>" : ""}
          </div>
        `).join("")}
      </div>
    `).show();
  });

  /* === TEAM: Klick auf Teamname === */
  $("#rankingTable tbody").on("click", ".teamname", function () {
    const wertung = document.getElementById("wertungFilter").value;
    if (wertung !== "Team Netto" && wertung !== "Team Brutto") return;

    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const team = aktuelleDaten[idx];
    if (!team) return;

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(`
      <div class="details">
        ${team.teamEvents.map((punkte, i) => `
          <div class="event-card"
               style="${team.gewerteteEvents.includes(i)
                 ? "border-left-color:#2e7d32;font-weight:600;"
                 : "opacity:0.6;"}">
            <strong>${eventNamen[i]}</strong><br>
            ${punkte} Team‑Punkte
            ${team.gewerteteEvents.includes(i) ? "<br><em>gewertet</em>" : ""}
          </div>
        `).join("")}
      </div>
    `).show();
  });

  ["wertungFilter", "teamFilter", "eventFilter"]
    .forEach(id =>
      document.getElementById(id).addEventListener("change", update)
    );

  update();
}

/* ======================================================
   UPDATE
====================================================== */
function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const teamFilter = document.getElementById("teamFilter").value;

  const istTeamWertung =
    wertung === "Team Netto" || wertung === "Team Brutto";

  const eventSelect = [...document.getElementById("eventFilter").selectedOptions]
    .map(o => Number(o.value))
    .filter(v => !isNaN(v));

  table.clear();

  const siegerBox = document.getElementById("siegerBox");
  siegerBox.innerHTML = `
    <div class="wertung-hinweis">
      ${istTeamWertung
        ? "Wertung: beste 6 aus Events 1–8 plus Finale (Event 9)"
        : "Wertung: beste 4 Ergebnisse"}
    </div>`;

  /* ---------- EINZELWERTUNGEN ---------- */
  if (!istTeamWertung) {
    aktuelleDaten = spielerAlle
      .filter(s => s.wertung === wertung)
      .filter(s => !teamFilter || s.team === teamFilter)
      .map(s => {
        const alleEvents = s.events.map((p, i) => ({ idx: i, punkte: p }));

        const gewertete =
          eventSelect.length === 0
            ? [...alleEvents]
                .sort((a, b) => b.punkte - a.punkte)
                .slice(0, 4)
                .map(e => e.idx)
            : eventSelect;

        return {
          ...s,
          gewerteteEvents: gewertete,
          punkte: gewertete.reduce((sum, i) => sum + s.events[i], 0)
        };
      })
      .sort((a, b) => b.punkte - a.punkte);

  /* ---------- TEAMWERTUNGEN (CSV-ZEILEN = TEAMS) ---------- */
  } else {
    aktuelleDaten = spielerAlle
      .filter(s => s.wertung === wertung)
      .map(s => {
        const beste6 = s.events
          .slice(0, 8)
          .map((p, i) => ({ idx: i, punkte: p }))
          .sort((a, b) => b.punkte - a.punkte)
          .slice(0, 6);

        const finaleIdx = 8;
        const finalePunkte = s.events[8] || 0;

        return {
          team: s.team,
          teamEvents: s.events,
          gewerteteEvents: [
            ...beste6.map(e => e.idx),
            finaleIdx
          ],
          punkte:
            beste6.reduce((sum, e) => sum + e.punkte, 0) +
            finalePunkte
        };
      })
      .sort((a, b) => b.punkte - a.punkte);
  }

  /* ---------- ex‑aequo ---------- */
  let rang = 0, last = null, pos = 0;
  aktuelleDaten.forEach(s => {
    pos++;
    if (s.punkte !== last) rang = pos;
    s.rang = rang;
    last = s.punkte;
  });

  /* ---------- Tabelle füllen ---------- */
  aktuelleDaten.forEach((s, i) => {
    const row = istTeamWertung
      ? [s.rang, "", "", `<span class="teamname">${s.team}</span>`, s.punkte]
      : [
          s.rang,
          s.vorname,
          `<span class="nachname">${s.nachname}</span>`,
          s.team,
          s.punkte
        ];

    const tr = table.row.add(row).node();
    tr.dataset.idx = i;
  });

  table.draw();

  // Spalten nach draw ein-/ausblenden
  table.column(1).visible(!istTeamWertung); // Vorname
  table.column(2).visible(!istTeamWertung); // Nachname

  table.columns.adjust();

  /* ---------- Siegerbox ---------- */
  aktuelleDaten
    .filter(s => s.rang <= 3)
    .slice(0, 3)
    .forEach((s, i) => {
      siegerBox.innerHTML += `
        <div class="sieger">
          ${["🥇","🥈","🥉"][i]} Platz ${s.rang}<br>
          <strong>${istTeamWertung ? s.team : s.vorname + " " + s.nachname}</strong><br>
          ${s.punkte} Punkte
        </div>`;
    });
}

/* ======================================================
   Helfer
====================================================== */
function besteVier(punkte) {
  return [...punkte]
    .sort((a, b) => b - a)
    .slice(0, 4)
    .reduce((s, p) => s + p, 0);
}