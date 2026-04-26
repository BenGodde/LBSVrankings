const CSV_FILE = "ranking.csv";

let alleSpieler = [];
let events = [];
let table;

/* ================= CSV ================= */
fetch(CSV_FILE)
  .then(r => r.text())
  .then(parseCSV)
  .then(init);

function parseCSV(text){
  text = text.replace(/^\uFEFF/,"");
  const lines = text.trim().split("\n");
  const d = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(d);

  events = header.slice(4);

  alleSpieler = lines.slice(1).map(l=>{
    const c = l.split(d);
    const ev = events.map((_,i)=>Number(c[i+4])||0);
    return{
      wertung:c[0],
      vorname:c[1],
      nachname:c[2],
      team:c[3],
      events:ev,
      gesamt:besteVier(ev)
    };
  });
}

/* ================= INIT ================= */
function init(){
  // Eventfilter füllen
  const ef=document.getElementById("eventFilter");
  events.forEach((e,i)=>{
    const o=document.createElement("option");
    o.value=i;
    o.textContent=e;
    ef.appendChild(o);
  });

  table=$("#rankingTable").DataTable({
    paging:false,
    info:false
  });

  $("#rankingTable tbody").on("click",".nachname",function(){
    const tr=$(this).closest("tr");
    const row=table.row(tr);

    if(row.child.isShown()){
      row.child.hide(); return;
    }

    const idx=tr.data("idx");
    const s=alleSpieler[idx];

    row.child(
      `<div class="details">
        ${s.events.map((p,i)=>`
          <div class="event-card">
            <strong>${events[i]}</strong><br>${p} Punkte
          </div>`).join("")}
      </div>`
    ).show();
  });

  document.getElementById("wertungFilter").addEventListener("change",update);
  document.getElementById("eventFilter").addEventListener("change",update);
  document.getElementById("teamFilter").addEventListener("change",update);

  update();
}

/* ================= UPDATE ================= */
function update(){
  const w = document.getElementById("wertungFilter").value;
  const team = document.getElementById("teamFilter").value;
  const ev = document.getElementById("eventFilter").value;

  table.clear();
  document.getElementById("siegerBox").innerHTML = "";

  const gefiltert = alleSpieler
    .filter(s=>s.wertung===w)
    .filter(s=>!team || s.team===team)
    .map(s=>{
      return{
        ...s,
        punkte: ev==="ALL"
          ? s.gesamt
          : s.events[Number(ev)] || 0
      };
    })
    .sort((a,b)=>b.punkte-a.punkte);

  // Teamfilter füllen
  const tf=document.getElementById("teamFilter");
  tf.innerHTML="<option value=''>Alle Mannschaften</option>";
  [...new Set(gefiltert.map(s=>s.team))].forEach(t=>{
    const o=document.createElement("option");
    o.value=t; o.textContent=t;
    tf.appendChild(o);
  });

  gefiltert.forEach((s,i)=>{
    const node=table.row.add([
      i+1,
      s.vorname,
      `<span class="nachname">${s.nachname}</span>`,
      s.team,
      s.punkte
    ]).node();
    node.dataset.idx=alleSpieler.indexOf(s);
  });

  table.draw();

  // Siegerbox
  gefiltert.slice(0,3).forEach((s,i)=>{
    document.getElementById("siegerBox").innerHTML+=`
      <div class="sieger">
        ${["🥇","🥈","🥉"][i]} Platz ${i+1}<br>
        <strong>${s.vorname} ${s.nachname}</strong><br>
        ${s.punkte} Punkte
      </div>`;
  });
}

/* ================= HELPERS ================= */
function besteVier(p){
  return [...p].sort((a,b)=>b-a).slice(0,4).reduce((s,x)=>s+x,0);
}