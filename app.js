const CSV_FILE = "ranking.csv";

let spieler = [];
let events = [];
let table;

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

  spieler = lines.slice(1).map(line => {
    const c = line.split(d);
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

function besteVier(p) {
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}

function init() {
  // Event-Filter füllen
  const ef = document.getElementById("eventFilter");
  events.forEach((e,i)=>{
    const o=document.createElement("option");
    o.value=i; o.textContent=e;
    ef.appendChild(o);
  });

  table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  $("#rankingTable tbody").on("click", ".nachname", function () {
    const tr = $(this).closest("tr");
    const row = table.row(tr);

    if (row.child.isShown()) {
      row.child.hide();
      return;
    }

    const idx = tr.data("index");
    const s = spieler[idx];

    row.child(
      `<div class="details">
        ${s.events.map((p,i)=>`${events[i]}: ${p}`).join("<br>")}
      </div>`
    ).show();
  });

  document.getElementById("wertungFilter").addEventListener("change", update);
  document.getElementById("eventFilter").addEventListener("change", update);

  update();
}

function update() {
  const wertung = document.getElementById("wertungFilter").value;
  const evSel = [...document.getElementById("eventFilter").selectedOptions]
    .map(o => o.value);

  table.clear();

  spieler
    .filter(s => s.wertung === wertung)
    .sort((a,b)=>b.gesamt-a.gesamt)
    .forEach((s,i)=>{
      table.row.add([
        i+1,
        s.vorname,
        `<span class="nachname">${s.nachname}</span>`,
        s.team,
        s.gesamt
      ]).node().dataset.index = spieler.indexOf(s);
    });

  table.draw();
}