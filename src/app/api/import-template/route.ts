import ExcelJS from "exceljs";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Empty Excel file with the columns the importer expects, plus one example row. */
export async function GET() {
  if (!(await getSessionUserId())) return new Response("Unauthorized", { status: 401 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Orders");
  ws.columns = [
    { header: "Customer name / ناڤێ کڕیاری", width: 28 },
    { header: "Phone / تەلەفون", width: 18 },
    { header: "Order title / ناڤونیشان", width: 28 },
    { header: "Currency (IQD/USD)", width: 18 },
    { header: "Agreed total / کۆیێ گشتی", width: 20 },
    { header: "Already paid / هاتیە دان", width: 20 },
    { header: "Delivery date (dd/mm/yyyy)", width: 22 },
    { header: "Notes / تێبینی", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow(["Example: Ahmed Ali", "0750 123 4567", "Kitchen, 4 m, white MDF", "IQD", 6500000, 2000000, "15/01/2027", "Delete this example row"]);
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="homat-import-template.xlsx"`,
    },
  });
}
