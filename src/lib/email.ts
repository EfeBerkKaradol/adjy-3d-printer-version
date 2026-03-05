import nodemailer from "nodemailer";

// ==========================================
// E-POSTA BİLDİRİM SİSTEMİ
// Sipariş onayı, durum güncellemesi, kargo bildirimi
// ==========================================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM || "ADJY 3D <noreply@adjy.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// E-posta gönderim durumunu kontrol et
function isEmailConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Genel e-posta şablonu
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#09090b;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:4px;">ADJY</h1>
          <p style="margin:4px 0 0;color:#a1a1aa;font-size:12px;">3D Baskı Mağazası</p>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #e4e4e7;">
          <p style="margin:0;color:#71717a;font-size:12px;">
            Bu e-posta ADJY 3D tarafından otomatik olarak gönderilmiştir.
          </p>
          <p style="margin:8px 0 0;color:#a1a1aa;font-size:11px;">
            &copy; 2026 ADJY. Tüm hakları saklıdır.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Durum renkleri
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  CONFIRMED: "#3b82f6",
  PROCESSING: "#6366f1",
  PRINTING: "#a855f7",
  QUALITY_CHECK: "#06b6d4",
  PACKAGING: "#14b8a6",
  SHIPPED: "#f97316",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PROCESSING: "İşleniyor",
  PRINTING: "Baskıda",
  QUALITY_CHECK: "Kalite Kontrol",
  PACKAGING: "Paketleniyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

// ==========================================
// 1. SİPARİŞ ONAYI E-POSTASI
// ==========================================
interface OrderConfirmationData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderId: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  shippingCost: number;
  grandTotal: number;
  shippingAddress: string;
}

export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    console.warn("[Email] UYARI: SMTP yapilandirmamis! Siparis onay e-postasi gonderilemedi:", data.orderNumber);
    if (process.env.NODE_ENV === "production") {
      console.warn("[Email] Production'da SMTP_USER ve SMTP_PASS ayarlayin.");
    }
    return { sent: false };
  }

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;text-align:right;">${item.lineTotal.toFixed(2)} TL</td>
    </tr>`
    )
    .join("");

  const content = `
    <h2 style="margin:0 0 8px;color:#09090b;font-size:20px;">Siparişiniz Alındı!</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
      Merhaba ${data.customerName}, siparişiniz başarıyla oluşturuldu.
    </p>

    <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;color:#71717a;font-size:12px;">Sipariş Numarası</p>
      <p style="margin:4px 0 0;color:#09090b;font-size:18px;font-weight:700;font-family:monospace;">${data.orderNumber}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr style="background:#f4f4f5;">
        <th style="padding:8px;text-align:left;font-size:12px;color:#71717a;">Ürün</th>
        <th style="padding:8px;text-align:center;font-size:12px;color:#71717a;">Adet</th>
        <th style="padding:8px;text-align:right;font-size:12px;color:#71717a;">Tutar</th>
      </tr>
      ${itemsHtml}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:4px 0;color:#71717a;font-size:13px;">Ara Toplam</td>
        <td style="padding:4px 0;text-align:right;font-size:13px;">${data.totalAmount.toFixed(2)} TL</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#71717a;font-size:13px;">Kargo</td>
        <td style="padding:4px 0;text-align:right;font-size:13px;">${data.shippingCost === 0 ? "Ücretsiz" : data.shippingCost.toFixed(2) + " TL"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0 0;font-weight:700;font-size:15px;border-top:2px solid #e4e4e7;">Toplam</td>
        <td style="padding:8px 0 0;text-align:right;font-weight:700;font-size:15px;border-top:2px solid #e4e4e7;">${data.grandTotal.toFixed(2)} TL</td>
      </tr>
    </table>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:24px;">
      <p style="margin:0;color:#166534;font-size:13px;">
        <strong>Teslimat Adresi:</strong> ${data.shippingAddress}
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${APP_URL}/orders/${data.orderId}" style="display:inline-block;background:#09090b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        Siparişimi Takip Et
      </a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Sipariş Onayı - ${data.orderNumber}`,
      html: baseTemplate(content),
    });
    console.log("[Email] Sipariş onay e-postası gönderildi:", data.orderNumber);
    return { sent: true };
  } catch (error) {
    console.error("[Email] Sipariş onay e-postası gönderilemedi:", error);
    return { sent: false };
  }
}

// ==========================================
// 2. SİPARİŞ DURUM GÜNCELLEMESİ E-POSTASI
// ==========================================
interface StatusUpdateData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
}

export async function sendStatusUpdate(data: StatusUpdateData): Promise<{ sent: boolean }> {
  if (!isEmailConfigured()) {
    console.warn("[Email] UYARI: SMTP yapilandirmamis! Durum guncelleme e-postasi gonderilemedi:", data.orderNumber);
    if (process.env.NODE_ENV === "production") {
      console.warn("[Email] Production'da SMTP_USER ve SMTP_PASS ayarlayin.");
    }
    return { sent: false };
  }

  const statusLabel = STATUS_LABELS[data.newStatus] || data.newStatus;
  const statusColor = STATUS_COLORS[data.newStatus] || "#71717a";

  let extraContent = "";

  if (data.newStatus === "SHIPPED" && data.trackingNumber) {
    extraContent = `
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;color:#9a3412;font-size:13px;font-weight:600;">Kargo Bilgileri</p>
        ${data.carrier ? `<p style="margin:0;color:#9a3412;font-size:13px;">Firma: ${data.carrier}</p>` : ""}
        <p style="margin:4px 0 0;color:#9a3412;font-size:13px;">Takip No: <strong>${data.trackingNumber}</strong></p>
      </div>`;
  }

  if (data.newStatus === "DELIVERED") {
    extraContent = `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#166534;font-size:13px;">
          Siparişiniz teslim edilmiştir. Ürünlerimizi beğendiyseniz değerlendirme yapabilirsiniz!
        </p>
      </div>`;
  }

  if (data.newStatus === "CANCELLED") {
    extraContent = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:13px;">
          Siparişiniz iptal edilmiştir. Ödemeniz iade sürecine alınacaktır.
        </p>
      </div>`;
  }

  const content = `
    <h2 style="margin:0 0 8px;color:#09090b;font-size:20px;">Sipariş Durumu Güncellendi</h2>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
      Merhaba ${data.customerName}, <strong>${data.orderNumber}</strong> numaralı siparişinizin durumu güncellendi.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:${statusColor}20;border:2px solid ${statusColor};border-radius:12px;padding:16px 32px;">
        <p style="margin:0;color:${statusColor};font-size:22px;font-weight:700;">${statusLabel}</p>
      </div>
    </div>

    ${data.notes ? `<p style="color:#52525b;font-size:13px;background:#f4f4f5;padding:12px;border-radius:8px;margin-bottom:16px;"><strong>Not:</strong> ${data.notes}</p>` : ""}
    ${extraContent}

    <div style="text-align:center;margin-top:24px;">
      <a href="${APP_URL}/orders/${data.orderId}" style="display:inline-block;background:#09090b;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        Siparişi Görüntüle
      </a>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Sipariş Durumu: ${statusLabel} - ${data.orderNumber}`,
      html: baseTemplate(content),
    });
    console.log("[Email] Durum güncelleme e-postası gönderildi:", data.orderNumber, data.newStatus);
    return { sent: true };
  } catch (error) {
    console.error("[Email] Durum güncelleme e-postası gönderilemedi:", error);
    return { sent: false };
  }
}
