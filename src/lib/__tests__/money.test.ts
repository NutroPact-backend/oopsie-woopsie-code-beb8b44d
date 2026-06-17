// Critical money-path tests — run with `bun test src/lib/__tests__`.
// Pure functions only; no DB/network. Keep this fast and deterministic.
import { describe, it, expect } from "bun:test";
import { computeLineTax } from "../invoice.shared";
import { gstr1B2cSummary, gstr3bSummary, hsnSummary } from "../gstr";

describe("computeLineTax — GST split (price is tax-inclusive MRP)", () => {
  it("18% intra-state splits evenly into CGST + SGST, IGST = 0", () => {
    const t = computeLineTax(118, 1, 18, true);
    expect(t.grossLine).toBe(118);
    expect(t.taxableValue).toBe(100);
    expect(t.totalTax).toBe(18);
    expect(t.cgst).toBe(9);
    expect(t.sgst).toBe(9);
    expect(t.igst).toBe(0);
  });

  it("18% inter-state goes fully into IGST", () => {
    const t = computeLineTax(118, 2, 18, false);
    expect(t.grossLine).toBe(236);
    expect(t.taxableValue).toBe(200);
    expect(t.cgst).toBe(0);
    expect(t.sgst).toBe(0);
    expect(t.igst).toBe(36);
  });

  it("0% GST → entire price is taxable, no tax", () => {
    const t = computeLineTax(99, 3, 0, true);
    expect(t.taxableValue).toBe(297);
    expect(t.totalTax).toBe(0);
    expect(t.cgst + t.sgst + t.igst).toBe(0);
  });

  it("rounds to 2 decimals (no float drift)", () => {
    const t = computeLineTax(99.99, 1, 18, true);
    // taxable = 99.99 / 1.18 = 84.7372..., rounds to 84.74
    expect(t.taxableValue).toBe(84.74);
    expect(t.cgst + t.sgst + t.igst).toBeCloseTo(t.totalTax, 2);
  });
});

describe("GSTR aggregations", () => {
  const invoices = [
    {
      invoice_number: "INV-1",
      order_number: "O1",
      issued_at: "2026-06-01",
      snapshot: {
        items: [
          { hsn: "2106", quantity: 1, taxableValue: 100, cgst: 9, sgst: 9, igst: 0, rate: 18 },
        ],
        gst: { sameState: true, placeOfSupply: "27", taxableValue: 100, cgst: 9, sgst: 9, igst: 0 },
      },
    },
    {
      invoice_number: "INV-2",
      order_number: "O2",
      issued_at: "2026-06-02",
      snapshot: {
        items: [
          { hsn: "2106", quantity: 2, taxableValue: 200, cgst: 0, sgst: 0, igst: 36, rate: 18 },
        ],
        gst: { sameState: false, placeOfSupply: "29", taxableValue: 200, cgst: 0, sgst: 0, igst: 36 },
      },
    },
  ];

  it("gstr3bSummary sums outward taxable supplies across invoices", () => {
    const rows = gstr3bSummary(invoices);
    const outward = rows.find((r) => r.section.startsWith("3.1(a)"))!;
    expect(outward.taxable_value).toBe(300);
    expect(outward.cgst).toBe(9);
    expect(outward.sgst).toBe(9);
    expect(outward.igst).toBe(36);
  });

  it("gstr1B2cSummary buckets by place-of-supply + rate", () => {
    const rows = gstr1B2cSummary(invoices);
    expect(rows).toHaveLength(2);
    const r27 = rows.find((r) => r.place_of_supply === "27")!;
    expect(r27.cgst).toBe(9);
    expect(r27.invoice_count).toBe(1);
    const r29 = rows.find((r) => r.place_of_supply === "29")!;
    expect(r29.igst).toBe(36);
  });

  it("hsnSummary aggregates qty + total value per HSN/rate", () => {
    const rows = hsnSummary(invoices);
    expect(rows).toHaveLength(1);
    expect(rows[0].hsn_code).toBe("2106");
    expect(rows[0].total_quantity).toBe(3);
    expect(rows[0].total_value).toBe(354); // 300 taxable + 9+9+36 tax
  });
});