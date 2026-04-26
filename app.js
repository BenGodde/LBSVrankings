document.addEventListener("DOMContentLoaded", function () {
  console.log("JS geladen ✅");

  const table = $("#rankingTable").DataTable({
    paging: false,
    info: false
  });

  console.log("DataTable initialisiert ✅");

  table.row.add([
    1,
    "Test",
    "Spieler",
    "Test‑Team",
    42
  ]).draw();

  console.log("Test‑Zeile hinzugefügt ✅");
});