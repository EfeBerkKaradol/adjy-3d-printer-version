export function OrderConfirmationEmail(orderNumber: string, customerName: string, itemsDetails: { name: string, quantity: number, price: number }[], grandTotal: number) {
    const itemsHtml = itemsDetails.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toFixed(2)} ₺</td>
    </tr>
  `).join("");

    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 20px 0; background-color: #f8f9fa; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; color: #0f172a;">ADJY</h1>
        <p style="margin: 5px 0 0 0; color: #64748b;">3D İnovasyon Merkezi</p>
      </div>

      <div style="padding: 30px 20px;">
        <h2 style="color: #0f172a;">Siparişiniz Alındı! 🎉</h2>
        <p>Merhaba <strong>${customerName}</strong>,</p>
        <p>Siparişiniz için teşekkür ederiz. <strong>#${orderNumber}</strong> numaralı siparişinizi başarıyla aldık ve işlem sürecine başladık. Sipariş sürecinizi sitemizdeki panelinizden takip edebilirsiniz.</p>
        
        <h3 style="margin-top: 30px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Sipariş Özeti</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr>
              <th style="text-align: left; padding: 10px; background-color: #f1f5f9;">Ürün</th>
              <th style="padding: 10px; background-color: #f1f5f9;">Adet</th>
              <th style="text-align: right; padding: 10px; background-color: #f1f5f9;">Fiyat</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Genel Toplam:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #0f172a;">${grandTotal.toFixed(2)} ₺</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 40px; padding: 20px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <h4 style="margin-top: 0; color: #1e293b;">Baskı Süreci Hakkında</h4>
          <p style="margin-bottom: 0; font-size: 14px;">Ürünlerinizin basımı tamamlandığında ve kargoya teslim edildiğinde size ayrıca bir bilgilendirme maili göndereceğiz. Herhangi bir sorunuz varsa bu maili doğrudan yanıtlayabilirsiniz.</p>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        <p>© 2026 ADJY 3D Printer. Tüm hakları saklıdır.</p>
        <p>Teknoloji Geliştirme Bölgesi, İstanbul</p>
      </div>
    </div>
  `;
}
