import { mkdir, writeFile } from "node:fs/promises";
import { renderBonPdf } from "../src/services/pdfBonService";

const outDir = "artifacts/pdf-preview";
await mkdir(outDir, { recursive: true });

const items = Array.from({ length: 18 }, (_, index) => {
  const quantity = (index % 3) + 1;
  const finalPrice = 125_000 + index * 12_500;
  return {
    productNameSnapshot: index % 4 === 0
      ? `Produk Logam Mulia Seri Panjang ${index + 1} dengan Nama yang Menguji Pembungkusan Teks`
      : `Produk HL ${index + 1}`,
    productTypeSnapshot: index % 2 === 0 ? "LM" : "BR",
    finalPrice,
    quantity,
    subtotal: finalPrice * quantity,
    isBonus: false
  };
});

const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
const normal = await renderBonPdf({
  bonNumber: "BON-20260620-001",
  bonDate: "2026-06-20T00:00:00.000Z",
  status: "PIUTANG",
  settledAt: null,
  shippingCost: 35_000,
  totalAfterDiscount: subtotal,
  totalAmount: subtotal + 35_000,
  description: "Pengiriman ke gudang cabang Surabaya. Mohon hubungi penerima sebelum barang diturunkan.",
  customer: {
    name: "Toko Mitra HL Surabaya",
    code: "PLG-0001",
    phone: "0812-3456-7890",
    address: "Jl. Contoh Usaha No. 88, Surabaya"
  },
  items
});
await writeFile(`${outDir}/sample-bon-normal.pdf`, normal);

const bonus = await renderBonPdf({
  bonNumber: "BONUS-20260620-001",
  bonDate: "2026-06-20T00:00:00.000Z",
  status: "BONUS",
  shippingCost: 0,
  totalAfterDiscount: 0,
  totalAmount: 0,
  description: "Bonus pelanggan berdasarkan akumulasi transaksi lunas.",
  customer: {
    name: "Toko Mitra HL Surabaya",
    code: "PLG-0001",
    phone: "0812-3456-7890",
    address: "Jl. Contoh Usaha No. 88, Surabaya"
  },
  items: items.slice(0, 3).map((item) => ({ ...item, finalPrice: 0, subtotal: 0, isBonus: true }))
});
await writeFile(`${outDir}/sample-bon-bonus.pdf`, bonus);
