console.log("app.js geladen ✅");

const table = $("#rankingTable").DataTable({
  paging: false,
  info: false
});

console.log("DataTable initialisiert ✅");

table.row.add([
  1,
  "Max",
  "Tester",
  "Team A",
  42
]).draw();

console.log("Testzeile eingefügt ✅");