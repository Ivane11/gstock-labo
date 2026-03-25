import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function buildOrderPdf({ labInfo, items, total }) {
  const doc = new jsPDF();
  const title = `Commande Laboratoire - ${labInfo.name || "Nom du laboratoire"}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 105, 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Telephone laboratoire: ${labInfo.phone || "-"}`, 14, 28);
  doc.text(`Adresse: ${labInfo.address || "-"}`, 14, 35);
  doc.text(`Email fournisseur: ${labInfo.supplierEmail || "-"}`, 14, 42);
  doc.text(`Lieu d'expedition: ${labInfo.shippingPlace || "-"}`, 14, 49);
  doc.text(`Ville d'expedition: ${labInfo.shippingCity || "-"}`, 14, 56);
  doc.text(`Reception: ${labInfo.receiverName || "-"}`, 110, 49);
  doc.text(`Contact reception: ${labInfo.receiverPhone || "-"}`, 110, 56);
  doc.text(`Transport / gare: ${labInfo.transportCompany || "-"}`, 14, 63);

  autoTable(doc, {
    startY: 72,
    head: [["Designation", "Categorie", "Quantite", "Prix unitaire", "Montant"]],
    body: items.map((item) => [
      item.name,
      item.category,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(item.amount),
    ]),
    headStyles: {
      fillColor: [13, 94, 166],
      halign: "center",
    },
    styles: {
      fontSize: 10,
      cellPadding: 3,
      valign: "middle",
    },
    bodyStyles: {
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 58 },
      1: { halign: "left", cellWidth: 43 },
      2: { halign: "center", cellWidth: 20 },
      3: { halign: "right", cellWidth: 32 },
      4: { halign: "right", cellWidth: 32 },
    },
    alternateRowStyles: {
      fillColor: [239, 246, 255],
    },
  });

  const lastY = doc.lastAutoTable?.finalY || 70;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Total general: ${formatCurrency(total)}`, 195, lastY + 14, { align: "right" });

  return doc;
}

export function formatCurrency(value) {
  const amount = Math.round(Number(value || 0));
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\u202f/g, ".")
    .replace(/\s/g, ".");

  return `${formatted} FCFA`;
}
