const CSV_FILE = "ranking.csv";

let spielerAlle = [];
let aktuelleDaten = [];
let eventNamen = [];
let table;

/* ================= CSV ================= */
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

/* ================= INIT ================= */
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

  // Einzelergebnisse
  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);
    const idx = tr.data("idx");
    const s = aktuelleDaten[idx];
    if (!s) return;

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    row.child(
      `<div class="details">
        ${s.events.map((p, i) => `
          <div class="event-card">
            <strong>${eventNamen[i]}</strong><br>${p} Punkte
          </div>
        `).join("")}
      </div>`
    ).show();
  });

  ["wertungFilter", "teamFilter", "eventFilter"]
    .forEach(id => document.getElementById(id).addEventListener("change", update));

  update();
}

/* ================= UPDATE ================= */
function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const team = document.getElementById("teamFilter").value;

  // Mehrfach-Event-Auswahl
  const eventSelect = [...document.getElementById("eventFilter").selectedOptions]
    .map(o => o.value)
    .filter(v => v !== "ALL");

  table.clear();
  document.getElementById("siegerBox").innerHTML = "";

  const istTeamWertung =
    wertung === "Team Netto" || wertung === "Team Brutto";

  const hinweisText = istTeamWertung
    ? "Wertung: beste 6 Ergebnisse aus Events 1–8 plus Finale (Event 9)"
    : "Wertung: beste 4 Ergebnisse";

  document.getElementById("siegerBox").innerHTML =
    `<div class="wertung-hinweis">${hinweisText}</div>`;

  if (!istTeamWertung) {
    // ===== EINZELWERTUNGEN (wie bisher) =====
    aktuelleDaten = spielerAlle
      .filter(s => s.wertung === wertung)
      .filter(s => !team || s.team === team)
      .map(s => {
        const punkte =
          eventSel.length === 0
            ? s.gesamt
            : eventSel.reduce((sum, i) => sum + (s.events[i] || 0), 0);
        return { ...s, punkte };
      })
      .sort((a, b) => b.punkte - a.punkte);

  } else {
    // ===== TEAMWERTUNGEN =====
    const teams = {};

    spielerAlle.forEach(s => {
      // Netto / Brutto Zuordnung (fachlich identisch zu Einzelwertung)
      if (
        (wertung === "Team Netto" && s.wertung !== "Netto") ||
        (wertung === "Team Brutto" && !s.wertung.startsWith("Brutto"))
      ) return;

      if (!teams[s.team]) {
        teams[s.team] = [];
      }
      teams[s.team].push(s);
  });

  aktuelleDaten = Object.keys(teams).map(teamName => {
    const alleEvents = teams[teamName].flatMap(s => s.events);
    return {
      team: teamName,
      punkte: berechneTeamPunkte(alleEvents)
    };
  })
  .sort((a, b) => b.punkte - a.punkte);
}

  /* ✅ ex-aequo-Ränge */
  let rang = 0;
  let zuletzt = null;
  let angezeigt = 0;

  aktuelleDaten.forEach(s => {
    angezeigt++;
    if (s.punkte !== zuletzt) rang = angezeigt;
    s.rang = rang;
    zuletzt = s.punkte;
  });

  /* Tabelle */
  aktuelleDaten.forEach((s, i) => {
    const rang = s.rang || (i + 1);

    const row = istTeamWertung
      ? [
          rang,
          "",               // Vorname leer
          s.team,           // Teamname statt Nachname
          "",               // Team-Spalte leer
          s.punkte
        ]
      : [
          rang,
          s.vorname,
          `<span class="nachname">${s.nachname}</span>`,
          s.team,
          s.punkte
        ];

    table.row.add(row);
  });

  aktuelleDaten.forEach((s, i) => {
    const node = table.row.add([
      s.rang,
      s.vorname,
      `<span class="nachname">${s.nachname}</span>`,
      s.team,
      s.punkte
    ]).node();
    node.dataset.idx = i;
  });

  table.draw();

  /* Siegerbox */
  aktuelleDaten
    .filter(s => s.rang <= 3)
    .slice(0, 3)
    .forEach((s, i) => {
      const nameAnzeige = istTeamWertung
        ? s.team
        : `${s.vorname} ${s.nachname}`;

      document.getElementById("siegerBox").innerHTML += `
        <div class="sieger">
          ${["🥇","🥈","🥉"][i]} Platz ${s.rang}<br>
          <strong>${nameAnzeige}</strong><br>
          ${s.punkte} Punkte
        </div>`;
    });

}

/* ================= Hilfsfunktionen ================= */
function besteVier(p) {
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}

function berechneTeamPunkte(events) {
  // Events 1–8 → Index 0–7
  const ersteAcht = events.slice(0, 8)
    .sort((a, b) => b - a)
    .slice(0, 6);

  // Event 9 → Index 8
  const event9 = events[8] || 0;

  return ersteAcht.reduce((s, p) => s + p, 0) + event9;
}