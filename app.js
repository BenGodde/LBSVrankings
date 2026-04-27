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

/* ================= INIT ================= */
function init() {
  // Event-Filter
  const ef = document.getElementById("eventFilter");
  eventNamen.forEach((e, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = e;
    ef.appendChild(o);
  });

  // Team-Filter
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

  // Detail-Klick
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

    row.child(`
      <div class="details">
        ${s.events.map((p, i) => `
          <div class="event-card">
            <strong>${eventNamen[i]}</strong><br>
            ${p} Punkte
          </div>`).join("")}
      </div>
    `).show();
  });

  ["wertungFilter", "teamFilter", "eventFilter"]
    .forEach(id => document.getElementById(id).addEventListener("change", update));

  update();
}

/* ================= UPDATE ================= */
function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const team = document.getElementById("teamFilter").value;

  const eventSelect = [...document.getElementById("eventFilter").selectedOptions]
    .map(o => o.value)
    .filter(v => v !== "ALL");

  table.clear();
  const siegerBox = document.getElementById("siegerBox");
  siegerBox.innerHTML = "";

  const istTeamWertung =
    wertung === "Team Netto" || wertung === "Team Brutto";

  siegerBox.innerHTML =
    `<div class="wertung-hinweis">${
      istTeamWertung
        ? "Wertung: beste 6 aus Events 1–8 plus Finale (Event 9)"
        : "Wertung: beste 4 Ergebnisse"
    }</div>`;

  if (!istTeamWertung) {
    // EINZEL
    aktuelleDaten = spielerAlle
      .filter(s => s.wertung === wertung)
      .filter(s => !team || s.team === team)
      .map(s => ({
        ...s,
        punkte:
          eventSelect.length === 0
            ? s.gesamt
            : eventSelect.reduce((sum, i) => sum + s.events[i], 0)
      }))
      .sort((a, b) => b.punkte - a.punkte);

  } else {
    // TEAM
    const teams = {};

    spielerAlle.forEach(s => {
      if (
        (wertung === "Team Netto" && s.wertung !== "Netto") ||
        (wertung === "Team Brutto" && !s.wertung.startsWith("Brutto"))
      ) return;

      if (!teams[s.team]) teams[s.team] = [];
      teams[s.team].push(s);
    });

    aktuelleDaten = Object.keys(teams).map(teamName => ({
      team: teamName,
      punkte: berechneTeamPunkte(
        teams[teamName].flatMap(s => s.events)
      )
    }))
    .sort((a, b) => b.punkte - a.punkte);
  }

  // ex-aequo
  let rang = 0, last = null, pos = 0;
  aktuelleDaten.forEach(s => {
    pos++;
    if (s.punkte !== last) rang = pos;
    s.rang = rang;
    last = s.punkte;
  });

  // Tabelle
  aktuelleDaten.forEach((s, i) => {
    const row = istTeamWertung
      ? [s.rang, "", "", s.team, s.punkte]
      : [
          s.rang,
          "",
          "",
          s.team,
          s.punkte
        ];

    const tr = table.row.add(row).node();
    tr.dataset.idx = i;
  });

  table.draw();

  // Siegerbox
  aktuelleDaten.filter(s => s.rang <= 3).slice(0, 3).forEach((s, i) => {
    siegerBox.innerHTML += `
      <div class="sieger">
        ${["🥇","🥈","🥉"][i]} Platz ${s.rang}<br>
        <strong>${istTeamWertung ? s.team : s.vorname + " " + s.nachname}</strong><br>
        ${s.punkte} Punkte
      </div>`;
  });
}

/* ================= Helfer ================= */
function besteVier(p) {
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}

function berechneTeamPunkte(events) {
  const beste6 = events.slice(0,8).sort((a,b)=>b-a).slice(0,6);
  return beste6.reduce((s,x)=>s+x,0) + (events[8] || 0);
}