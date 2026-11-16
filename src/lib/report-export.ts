import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { formatDate, formatPercent, formatRupiah } from "@/lib/money";
import {
  REPORT_PERIOD_LABELS,
  type ReportData,
} from "@/services/report.service";
import type { TransactionView } from "@/services/transaction.service";

const TYPE_LABELS: Record<string, string> = {
  INCOME: "Pemasukan",
  EXPENSE: "Pengeluaran",
  TRANSFER: "Transfer",
  OPENING_BALANCE: "Saldo awal",
  ADJUSTMENT: "Penyesuaian",
  REVERSAL: "Reversal",
};

const STATUS_LABELS: Record<string, string> = {
  POSTED: "Posted",
  VOIDED: "Void",
};

const CURRENCY_FORMAT = '"Rp"#,##0';

function typeLabel(transaction: TransactionView) {
  return TYPE_LABELS[transaction.type] ?? transaction.type;
}

function statusLabel(transaction: TransactionView) {
  return STATUS_LABELS[transaction.status] ?? transaction.status;
}

function accountLabel(transaction: TransactionView) {
  if (transaction.type === "TRANSFER") {
    return `${transaction.sourceAccount?.name ?? "-"} -> ${
      transaction.destinationAccount?.name ?? "-"
    }`;
  }
  return transaction.account?.name ?? "-";
}

function signedPercent(value: number | null) {
  if (value === null) return "-";
  return `${value > 0 ? "+" : ""}${formatPercent(value)}`;
}

function generatedAtLabel() {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
}

function excelColumnWidths(worksheet: ExcelJS.Worksheet) {
  worksheet.getColumn(1).width = 22;
  worksheet.getColumn(2).width = 34;
  worksheet.getColumn(3).width = 18;
}

function styleExcelHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF111827" } },
    };
  });
}

function applyExcelBorders(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFE5E7EB" } },
        left: { style: "hair", color: { argb: "FFE5E7EB" } },
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
        right: { style: "hair", color: { argb: "FFE5E7EB" } },
      };
    });
  });
}

function addSummarySheet(
  workbook: ExcelJS.Workbook,
  report: ReportData,
) {
  const sheet = workbook.addWorksheet("Ringkasan");
  excelColumnWidths(sheet);

  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "RiFinTrack - Laporan Keuangan";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF111827" } };

  sheet.addRow(["Periode", REPORT_PERIOD_LABELS[report.period]]);
  sheet.addRow(["Rentang", report.label]);
  sheet.addRow(["Tanggal acuan", report.anchor]);
  sheet.addRow(["Pemasukan", report.summary.income]);
  sheet.addRow(["Pengeluaran", report.summary.expense]);
  sheet.addRow(["Selisih", report.summary.net]);
  sheet.addRow(["Jumlah transaksi", report.summary.transactionCount]);
  sheet.addRow(["Pembanding", report.comparison.label]);
  sheet.addRow(["Pemasukan pembanding", report.comparison.income]);
  sheet.addRow(["Pengeluaran pembanding", report.comparison.expense]);
  sheet.addRow(["Perubahan pemasukan", signedPercent(report.comparison.incomeDelta)]);
  sheet.addRow(["Perubahan pengeluaran", signedPercent(report.comparison.expenseDelta)]);
  sheet.addRow(["Dibuat", generatedAtLabel()]);

  for (const rowNumber of [5, 6, 7, 10, 11]) {
    sheet.getCell(`B${rowNumber}`).numFmt = CURRENCY_FORMAT;
  }
  for (const rowNumber of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    sheet.getCell(`A${rowNumber}`).font = { bold: true };
  }

  applyExcelBorders(sheet);
}

function addTransactionsSheet(
  workbook: ExcelJS.Workbook,
  report: ReportData,
) {
  const sheet = workbook.addWorksheet("Transaksi");
  sheet.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Tipe", key: "type", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Kategori", key: "category", width: 24 },
    { header: "Rekening", key: "account", width: 30 },
    { header: "Deskripsi", key: "description", width: 42 },
    { header: "Nominal", key: "amount", width: 18 },
  ];

  styleExcelHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const transaction of report.transactions) {
    const row = sheet.addRow({
      date: transaction.transactionDate,
      type: typeLabel(transaction),
      status: statusLabel(transaction),
      category: transaction.category?.name ?? "-",
      account: accountLabel(transaction),
      description: transaction.description ?? "",
      amount: transaction.amount,
    });
    row.getCell("amount").numFmt = CURRENCY_FORMAT;
  }

  sheet.autoFilter = { from: "A1", to: "G1" };
  applyExcelBorders(sheet);
}

function addCategoriesSheet(
  workbook: ExcelJS.Workbook,
  report: ReportData,
) {
  const sheet = workbook.addWorksheet("Kategori");
  sheet.columns = [
    { header: "Kategori", key: "name", width: 32 },
    { header: "Nominal", key: "amount", width: 20 },
    { header: "Porsi", key: "share", width: 14 },
  ];

  styleExcelHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const category of report.expenseByCategory) {
    const row = sheet.addRow({
      name: category.name,
      amount: category.amount,
      share: category.share,
    });
    row.getCell("amount").numFmt = CURRENCY_FORMAT;
    row.getCell("share").numFmt = "0.0%";
  }

  applyExcelBorders(sheet);
}

function addTrendSheet(
  workbook: ExcelJS.Workbook,
  report: ReportData,
) {
  const sheet = workbook.addWorksheet("Arus Kas");
  sheet.columns = [
    { header: "Periode", key: "label", width: 22 },
    { header: "Pemasukan", key: "income", width: 20 },
    { header: "Pengeluaran", key: "expense", width: 20 },
  ];

  styleExcelHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const point of report.trend) {
    const row = sheet.addRow({
      label: point.label,
      income: point.income,
      expense: point.expense,
    });
    row.getCell("income").numFmt = CURRENCY_FORMAT;
    row.getCell("expense").numFmt = CURRENCY_FORMAT;
  }

  applyExcelBorders(sheet);
}

export async function buildReportExcel(report: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RiFinTrack";
  workbook.created = new Date();

  addSummarySheet(workbook, report);
  addTransactionsSheet(workbook, report);
  addCategoriesSheet(workbook, report);
  addTrendSheet(workbook, report);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

const PDF_MARGIN = 40;
const PDF_ROW_HEIGHT = 19;
const PDF_COLORS = {
  ink: "#111827",
  muted: "#64748b",
  border: "#d1d5db",
  header: "#f1f5f9",
  zebra: "#f8fafc",
  income: "#047857",
  expense: "#b91c1c",
};

const PDF_COLUMNS = [
  { label: "Tanggal", width: 62 },
  { label: "Tipe", width: 70 },
  { label: "Status", width: 50 },
  { label: "Kategori", width: 105 },
  { label: "Rekening", width: 135 },
  { label: "Deskripsi", width: 226 },
  { label: "Nominal", width: 112, align: "right" as const },
];

const PDF_TABLE_WIDTH = PDF_COLUMNS.reduce(
  (total, column) => total + column.width,
  0,
);

function pdfSafe(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(
      /[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g,
      "?",
    )
    .trim();
}

function fitPdfText(doc: PDFKit.PDFDocument, value: string, width: number) {
  const text = pdfSafe(value);
  if (doc.widthOfString(text) <= width) return text;

  let shortened = text;
  while (
    shortened.length > 0 &&
    doc.widthOfString(`${shortened}...`) > width
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}...`;
}

function drawPdfSummary(doc: PDFKit.PDFDocument, report: ReportData) {
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(PDF_COLORS.ink)
    .text("RiFinTrack", PDF_MARGIN, PDF_MARGIN);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(PDF_COLORS.muted)
    .text(
      `Laporan ${REPORT_PERIOD_LABELS[report.period]} - ${report.label}`,
      PDF_MARGIN,
      PDF_MARGIN + 25,
    );

  doc
    .fontSize(9)
    .text(
      `Dibuat ${generatedAtLabel()}`,
      PDF_MARGIN,
      PDF_MARGIN,
      { width: PDF_TABLE_WIDTH, align: "right" },
    );

  const cards = [
    { label: "Pemasukan", value: formatRupiah(report.summary.income) },
    { label: "Pengeluaran", value: formatRupiah(report.summary.expense) },
    { label: "Selisih", value: formatRupiah(report.summary.net) },
    { label: "Transaksi", value: String(report.summary.transactionCount) },
  ];

  const cardY = PDF_MARGIN + 52;
  const cardGap = 10;
  const cardWidth = (PDF_TABLE_WIDTH - cardGap * 3) / 4;

  cards.forEach((card, index) => {
    const x = PDF_MARGIN + index * (cardWidth + cardGap);
    doc
      .save()
      .rect(x, cardY, cardWidth, 46)
      .fillAndStroke("#ffffff", PDF_COLORS.border)
      .restore();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(PDF_COLORS.muted)
      .text(card.label, x + 9, cardY + 8, {
        width: cardWidth - 18,
        lineBreak: false,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(PDF_COLORS.ink)
      .text(card.value, x + 9, cardY + 22, {
        width: cardWidth - 18,
        lineBreak: false,
      });
  });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(PDF_COLORS.muted)
    .text(
      `Pembanding ${report.comparison.label}: pemasukan ${formatRupiah(
        report.comparison.income,
      )} (${signedPercent(report.comparison.incomeDelta)}), pengeluaran ${formatRupiah(
        report.comparison.expense,
      )} (${signedPercent(report.comparison.expenseDelta)})`,
      PDF_MARGIN,
      cardY + 58,
      { width: PDF_TABLE_WIDTH },
    );

  let y = cardY + 78;
  if (report.expenseByCategory.length > 0) {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(PDF_COLORS.ink)
      .text("Pengeluaran per kategori", PDF_MARGIN, y);
    y += 15;

    const half = Math.ceil(report.expenseByCategory.length / 2);
    report.expenseByCategory.forEach((category, index) => {
      const column = index < half ? 0 : 1;
      const row = index < half ? index : index - half;
      const x = PDF_MARGIN + column * (PDF_TABLE_WIDTH / 2 + 10);
      const width = PDF_TABLE_WIDTH / 2 - 10;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(PDF_COLORS.muted)
        .text(
          fitPdfText(
            doc,
            `${category.name} - ${formatRupiah(category.amount)} (${formatPercent(
              category.share,
            )})`,
            width,
          ),
          x,
          y + row * 12,
          { width, lineBreak: false },
        );
    });
    y += half * 12 + 8;
  }

  return y + 6;
}

function drawPdfTableHeader(doc: PDFKit.PDFDocument, y: number) {
  doc
    .save()
    .rect(PDF_MARGIN, y, PDF_TABLE_WIDTH, PDF_ROW_HEIGHT)
    .fill(PDF_COLORS.header)
    .restore();

  let x = PDF_MARGIN;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(PDF_COLORS.ink);
  for (const column of PDF_COLUMNS) {
    doc.text(column.label, x + 4, y + 6, {
      width: column.width - 8,
      align: column.align ?? "left",
      lineBreak: false,
    });
    x += column.width;
  }

  doc
    .save()
    .moveTo(PDF_MARGIN, y + PDF_ROW_HEIGHT)
    .lineTo(PDF_MARGIN + PDF_TABLE_WIDTH, y + PDF_ROW_HEIGHT)
    .strokeColor(PDF_COLORS.border)
    .stroke()
    .restore();

  return y + PDF_ROW_HEIGHT;
}

function drawPdfTransactionRow(
  doc: PDFKit.PDFDocument,
  transaction: TransactionView,
  y: number,
  index: number,
) {
  if (index % 2 === 1) {
    doc
      .save()
      .rect(PDF_MARGIN, y, PDF_TABLE_WIDTH, PDF_ROW_HEIGHT)
      .fill(PDF_COLORS.zebra)
      .restore();
  }

  const values = [
    formatDate(transaction.transactionDate),
    typeLabel(transaction),
    statusLabel(transaction),
    transaction.category?.name ?? "-",
    accountLabel(transaction),
    transaction.description ?? "",
    formatRupiah(transaction.amount),
  ];

  let x = PDF_MARGIN;
  doc.font("Helvetica").fontSize(8);
  values.forEach((value, columnIndex) => {
    const column = PDF_COLUMNS[columnIndex];
    const color =
      columnIndex === 6 && transaction.type === "INCOME"
        ? PDF_COLORS.income
        : columnIndex === 6 && transaction.type === "EXPENSE"
          ? PDF_COLORS.expense
          : PDF_COLORS.ink;

    doc.fillColor(color).text(
      fitPdfText(doc, value, column.width - 8),
      x + 4,
      y + 6,
      {
        width: column.width - 8,
        align: column.align ?? "left",
        lineBreak: false,
      },
    );
    x += column.width;
  });
}

function startPdfTablePage(
  doc: PDFKit.PDFDocument,
  continuation: boolean,
  startY = PDF_MARGIN,
) {
  if (continuation) {
    doc.addPage({ size: "A4", layout: "landscape", margin: PDF_MARGIN });
  }

  let y = continuation ? PDF_MARGIN : startY;
  if (continuation) {
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(PDF_COLORS.ink)
      .text("RiFinTrack - Laporan Keuangan (lanjutan)", PDF_MARGIN, y);
    y += 26;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(PDF_COLORS.ink)
    .text("Transaksi pada periode", PDF_MARGIN, y);
  y += 18;

  return drawPdfTableHeader(doc, y);
}

function drawPdfFooters(doc: PDFKit.PDFDocument) {
  const range = doc.bufferedPageRange();
  const generated = generatedAtLabel();

  for (let index = 0; index < range.count; index++) {
    doc.switchToPage(range.start + index);
    doc.font("Helvetica").fontSize(8).fillColor(PDF_COLORS.muted);
    doc.text(`Dibuat ${generated}`, PDF_MARGIN, doc.page.height - 28, {
      width: 320,
      lineBreak: false,
    });
    doc.text(`Halaman ${index + 1} dari ${range.count}`, 0, doc.page.height - 28, {
      width: doc.page.width - PDF_MARGIN,
      align: "right",
      lineBreak: false,
    });
  }
}

export async function buildReportPdf(report: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: PDF_MARGIN,
    bufferPages: true,
    info: {
      Title: `RiFinTrack - Laporan ${REPORT_PERIOD_LABELS[report.period]}`,
      Author: "RiFinTrack",
      Subject: report.label,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  let y = drawPdfSummary(doc, report);
  y = startPdfTablePage(doc, false, y);

  if (report.transactions.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(PDF_COLORS.muted)
      .text("Tidak ada transaksi pada periode ini.", PDF_MARGIN, y + 10);
  } else {
    report.transactions.forEach((transaction, index) => {
      if (y + PDF_ROW_HEIGHT > doc.page.height - 48) {
        y = startPdfTablePage(doc, true);
      }
      drawPdfTransactionRow(doc, transaction, y, index);
      y += PDF_ROW_HEIGHT;
    });
  }

  drawPdfFooters(doc);
  doc.end();

  return completed;
}
