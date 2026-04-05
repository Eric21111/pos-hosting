/**
 * Human-readable rows for Manage Data → PDF / CSV only.
 * Full JSON backup remains unchanged for import/restore.
 */

function fmtDateTime(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}

function fmtDate(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function shortRef(id) {
  if (id == null) return "";
  const s = typeof id === "object" && id?.toString ? id.toString() : String(id);
  return s.length > 10 ? s.slice(-8) : s;
}

/** Plain PHP amounts for CSV/PDF (avoids ₱/encoding issues). */
function formatPhp(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatTransactionItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((i) => {
      const name = (i.itemName || "Item").trim().replace(/\s+/g, " ");
      const q = Math.max(0, Number(i.quantity ?? 1)) || 1;
      const unit = Number(i.price ?? i.itemPrice ?? 0) || 0;
      const lineTotal = Math.round(unit * q * 100) / 100;
      let line = `${q}x ${name}; unit PHP ${formatPhp(unit)}; line PHP ${formatPhp(lineTotal)}`;
      if (i.returnStatus === "Returned") line += "; returned";
      else if (i.returnStatus === "Partially Returned") {
        const rq = i.returnedQuantity != null ? String(i.returnedQuantity) : "";
        line += rq ? `; partial return (${rq})` : "; partial return";
      }
      return line;
    })
    .join(" | ");
}

function formatVoidItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((i) => {
      const name = (i.itemName || "Item").trim().replace(/\s+/g, " ");
      const q = Math.max(0, Number(i.quantity ?? 1)) || 1;
      const unit = Number(i.price ?? 0) || 0;
      const lineTotal = Math.round(unit * q * 100) / 100;
      return `${q}x ${name}; unit PHP ${formatPhp(unit)}; line PHP ${formatPhp(lineTotal)}`;
    })
    .join(" | ");
}

function formatCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((i) => {
      const name = (i.itemName || "Item").trim().replace(/\s+/g, " ");
      const q = Math.max(0, Number(i.quantity ?? 1)) || 1;
      return `${q}x ${name}`;
    })
    .join(" | ");
}

/** Sales export excludes void rows (see Void Logs sheet / collection). */
function isVoidSalesRow(r) {
  const st = String(r.status || "").toLowerCase();
  if (st === "voided") return true;
  if (String(r.paymentMethod || "").toLowerCase() === "void") return true;
  return false;
}

function hasVariantMatrix(sizes) {
  return sizes && typeof sizes === "object" && Object.keys(sizes).length > 0;
}

/** @type {Record<string, (r: Record<string, unknown>) => Record<string, string | number>>} */
const TRANSFORMERS = {
  transactions: (r) => {
    const ref =
      r.receiptNo ||
      r.referenceNo ||
      (r._id ? `TX-${shortRef(r._id)}` : "");
    const orig = r.originalTransactionId
      ? shortRef(r.originalTransactionId)
      : "";
    return {
      "Receipt / Ref": String(ref || ""),
      "Date & Time": fmtDateTime(r.checkedOutAt || r.createdAt),
      Cashier: String(r.performedByName || ""),
      Status: String(r.status || ""),
      "Payment Method": String(r.paymentMethod || ""),
      Items: formatTransactionItems(r.items),
      Subtotal:
        r.subtotal != null && r.subtotal !== ""
          ? Number(r.subtotal)
          : "",
      Discount: Number(r.discount ?? r.discountAmount ?? 0) || 0,
      "Total (PHP)": Number(r.totalAmount ?? 0) || 0,
      "Amount Received": Number(r.amountReceived ?? 0) || 0,
      "Change Given": Number(r.changeGiven ?? 0) || 0,
      "Original Sale Ref": orig ? `…${orig}` : ""
    };
  },

  products: (r) => ({
    SKU: String(r.sku || ""),
    "Item Name": String(r.itemName || ""),
    Category: String(r.category || ""),
    Subcategory: String(r.subCategory || ""),
    Brand: String(r.brandName || ""),
    Variant: String(r.variant || ""),
    "Food Subtype": String(r.foodSubtype || ""),
    Size: String(r.size || ""),
    "Unit of Measure": String(r.unitOfMeasure || ""),
    "Selling Price": Number(r.itemPrice ?? 0) || 0,
    "Cost Price": Number(r.costPrice ?? 0) || 0,
    "Current Stock": Number(r.currentStock ?? 0) || 0,
    "Reorder Level": Number(r.reorderNumber ?? 0) || 0,
    Supplier: String(r.supplierName || ""),
    "Supplier Contact": String(r.supplierContact || ""),
    "Display in Terminal": r.displayInTerminal !== false ? "Yes" : "No",
    Archived: r.isArchived ? "Yes" : "No",
    "Expiration Date": r.expirationDate ? fmtDate(r.expirationDate) : "",
    "Has Variant Matrix": hasVariantMatrix(r.sizes) ? "Yes" : "No",
    "Date Added": r.dateAdded ? fmtDateTime(r.dateAdded) : ""
  }),

  stockMovements: (r) => ({
    "Date & Time": fmtDateTime(r.createdAt),
    SKU: String(r.sku || ""),
    "Item Name": String(r.itemName || ""),
    Category: String(r.category || ""),
    Brand: String(r.brandName || ""),
    Type: String(r.type || ""),
    Quantity: Number(r.quantity ?? 0) || 0,
    "Stock Before": Number(r.stockBefore ?? 0) || 0,
    "Stock After": Number(r.stockAfter ?? 0) || 0,
    Reason: String(r.reason || ""),
    "Handled By": String(r.handledBy || ""),
    Notes: String(r.notes || "")
  }),

  categories: (r) => ({
    Name: String(r.name || ""),
    Type: String(r.type || ""),
    "Parent Category": String(r.parentCategory || ""),
    Status: String(r.status || ""),
    "Show on POS": r.showOnPos !== false ? "Yes" : "No",
    "Date Created": r.dateCreated ? fmtDateTime(r.dateCreated) : ""
  }),

  discounts: (r) => ({
    Title: String(r.title || ""),
    Code: String(r.discountCode || ""),
    "Discount Type": String(r.discountType || ""),
    Value: Number(r.discountValue ?? 0) || 0,
    "Applies To": String(r.appliesTo || ""),
    Category: String(r.category || ""),
    Subcategory: String(r.subCategory || ""),
    "Valid From": r.validFrom ? fmtDate(r.validFrom) : "",
    "Valid To": r.validTo ? fmtDate(r.validTo) : "",
    "No Expiration": r.noExpiration ? "Yes" : "No",
    "Min Purchase": Number(r.minPurchaseAmount ?? 0) || 0,
    "Max Purchase":
      r.maxPurchaseAmount != null ? Number(r.maxPurchaseAmount) : "",
    "Usage Limit":
      r.usageLimit != null ? Number(r.usageLimit) : "",
    "Usage Count": Number(r.usageCount ?? 0) || 0,
    Status: String(r.status || ""),
    Description: String(r.description || "")
  }),

  brandPartners: (r) => ({
    "Brand Name": String(r.brandName || ""),
    Email: String(r.email || ""),
    "Contact Number": String(r.contactNumber || ""),
    "Contact Person": String(r.contactPerson || ""),
    Status: String(r.status || ""),
    "Created At": r.createdAt ? fmtDateTime(r.createdAt) : ""
  }),

  voidLogs: (r) => ({
    "Void ID": String(r.voidId || ""),
    "Voided At": fmtDateTime(r.voidedAt || r.createdAt),
    "Void Reason": String(r.voidReason || ""),
    "Voided By": String(r.voidedByName || r.voidedBy || ""),
    "Approved By": String(r.approvedBy || ""),
    "Approver Role": String(r.approvedByRole || ""),
    "Total Amount": Number(r.totalAmount ?? 0) || 0,
    Items: formatVoidItems(r.items),
    Source: String(r.source || ""),
    Notes: String(r.notes || "")
  }),

  archives: (r) => ({
    "Item Name": String(r.itemName || ""),
    SKU: String(r.sku || ""),
    Category: String(r.category || ""),
    Brand: String(r.brandName || ""),
    Variant: String(r.variant || ""),
    Size: String(r.selectedSize || ""),
    Quantity: Number(r.quantity ?? 0) || 0,
    "Item Price": Number(r.itemPrice ?? 0) || 0,
    "Cost Price": Number(r.costPrice ?? 0) || 0,
    Reason: String(r.reason || ""),
    "Return Reason": String(r.returnReason || ""),
    Source: String(r.source || ""),
    "Archived By": String(r.archivedBy || ""),
    "Archived At": r.archivedAt ? fmtDateTime(r.archivedAt) : "",
    Notes: String(r.notes || "")
  }),

  carts: (r) => ({
    "Staff / User Id": String(r.userId || ""),
    "Line Count": Array.isArray(r.items) ? r.items.length : 0,
    Items: formatCartItems(r.items),
    "Updated At": r.updatedAt ? fmtDateTime(r.updatedAt) : ""
  }),

  employees: (r) => ({
    Name: String(r.name || ""),
    Email: String(r.email || ""),
    Role: String(r.role || ""),
    "Contact No": String(r.contactNo || ""),
    Status: String(r.status || ""),
    "Date Joined": r.dateJoined ? fmtDate(r.dateJoined) : "",
    "POS Terminal": r.permissions?.posTerminal !== false ? "Yes" : "No",
    Inventory: r.permissions?.inventory ? "Yes" : "No",
    "View Transactions": r.permissions?.viewTransactions !== false ? "Yes" : "No",
    "Generate Reports": r.permissions?.generateReports ? "Yes" : "No",
    "Last Login": r.lastLogin ? fmtDateTime(r.lastLogin) : "",
    "Requires PIN Reset": r.requiresPinReset ? "Yes" : "No"
  }),

  merchantSettings: (r) => ({
    "Merchant Name": String(r.merchantName || ""),
    Active: r.isActive ? "Yes" : "No",
    Environment: String(r.environment || ""),
    "Payment Expiry (min)": Number(r.paymentExpiryMinutes ?? 0) || 0,
    "Webhook URL": String(r.webhookUrl || ""),
    "Configured By": String(r.configuredByName || r.configuredBy || ""),
    "App ID (masked)":
      r.appId && String(r.appId).length > 6
        ? `…${String(r.appId).slice(-4)}`
        : String(r.appId || ""),
    "Public Key (masked)":
      r.publicKey && String(r.publicKey).length > 12
        ? `${String(r.publicKey).slice(0, 8)}…`
        : String(r.publicKey || ""),
    "Updated At": r.updatedAt ? fmtDateTime(r.updatedAt) : ""
  })
};

/**
 * @param {string} collectionKey
 * @param {Record<string, unknown>[]} records
 * @returns {Record<string, string | number>[]}
 */
export function recordsForBusinessExport(collectionKey, records) {
  if (!Array.isArray(records) || records.length === 0) return [];
  const fn = TRANSFORMERS[collectionKey];
  if (!fn) return [];
  let list = records;
  if (collectionKey === "transactions") {
    list = records.filter((rec) => !isVoidSalesRow(rec));
  }
  if (list.length === 0) return [];
  return list.map((rec) => fn(rec));
}

export function hasBusinessExportSchema(collectionKey) {
  return Object.prototype.hasOwnProperty.call(TRANSFORMERS, collectionKey);
}

export { TRANSFORMERS };
