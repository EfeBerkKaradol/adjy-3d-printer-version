export function OrderStatusEmail(orderNumber: string, customerName: string, newStatus: string, trackingNumber?: string, shippingCompany?: string) {

    const statusLabels: Record<string, string> = {
        CONFIRMED: "Onaylandı",
        PROCESSING: "İşleniyor",
        PRINTING: "Baskıda",
        QUALITY_CHECK: "Kalite Kontrol Aşamasında",
        PACKAGING: "Paketleniyor",
        SHIPPED: "Kargoya Verildi",
        DELIVERED: "Teslim Edildi",
        CANCELLED: "İptal Edildi",
    };

    const statusLabel = statusLabels[newStatus] || newStatus;

    let extraInfo = "";
    if (newStatus === "SHIPPED") {
        extraInfo = `
      <div style="margin-top: 25px; padding: 20px; background-color: #f0fdf4; border-radius: 6px; border-left: 4px solid #22c55e;">
        <h4 style="margin-top: 0; color: #166534; font-size: 16px;">📦 Kargo Bilgileri</h4>
        ${shippingCompany ? `<p style="margin: 5px 0;"><strong>Kargo Firması:</strong> ${shippingCompany}</p>` : ''}
        ${trackingNumber ? `<p style="margin: 5px 0;"><strong>Takip Numarası:</strong> ${trackingNumber}</p>` : ''}
        <p style="margin-top: 10px; font-size: 14px; color: #15803d;">Siparişiniz başarılı bir şekilde yola çıkmıştır.</p>
      </div>
    `;
    } else if (newStatus === "PRINTING") {
        extraInfo = `
      <div style="margin-top: 25px; padding: 20px; background-color: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">Ürünlerinizin 3D baskı işlemi başladı! Cihazlarımız şu an sizin için çalışıyor. En kısa sürede kalite kontrolden geçip kargolanması için hazırlanacak.</p>
      </div>
    `;
    }

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 20px 0; background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #0f172a;">ADJY</h1>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #0f172a;">Sipariş Durumu Güncellendi! 🔔</h2>
        <p>Merhaba <strong>${customerName}</strong>,</p>
        <p><strong>#${orderNumber}</strong> numaralı siparişinizin durumu <strong>"${statusLabel}"</strong> olarak güncellenmiştir.</p>
        
        ${extraInfo}

        <p style="margin-top: 30px;">Durumu detaylı incelemek için sitemizdeki Profil -> Siparişlerim sekmesini ziyaret edebilirsiniz.</p>
      </div>

      <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p>© 2026 ADJY 3D Printer. Tüm hakları saklıdır.</p>
      </div>
    </div>
  `;
}
