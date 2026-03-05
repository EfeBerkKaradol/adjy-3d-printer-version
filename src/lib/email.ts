import nodemailer from "nodemailer";

// SMTP Konfigürasyonu
// Geliştirme aşamasında Ethereal Email (ücretsiz test SMTP sunucusu) kullanılabilir 
// veya bir Gmail App Password oluşturularak gerçek gönderim yapılabilir.

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: process.env.EMAIL_SERVER_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER, // E-posta adresiniz (örn: username@gmail.com)
    pass: process.env.EMAIL_SERVER_PASSWORD, // Şifre veya Gmail App Password
  },
});

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  // Eğer env variables boşsa uyarı ver ve development logu bas
  if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
    console.warn("⚠️ E-posta gönderilemedi! EMAIL_SERVER_USER veya EMAIL_SERVER_PASSWORD .env dosyasında tanımlı değil.");
    console.log("Gönderilmek istenen e-posta içeriği:\nTo:", to, "\nSubject:", subject);
    // Development ortamında uygulamanın çökmesini engellemek için başarılı dönüyoruz
    return { success: true, messageId: "dev-mock-id" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ADJY 3D Printer'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_SERVER_USER}>`,
      to,
      subject,
      html,
    });

    console.log("E-posta gönderildi: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("E-posta gönderim hatası:", error);
    return { success: false, error };
  }
}

import { OrderConfirmationEmail } from "@/components/emails/order-confirmation";
import { OrderStatusEmail } from "@/components/emails/order-status";

export async function sendOrderConfirmation(
  to: string,
  customerName: string,
  orderNumber: string,
  itemsDetails: { name: string, quantity: number, price: number }[],
  grandTotal: number
) {
  const html = OrderConfirmationEmail(orderNumber, customerName, itemsDetails, grandTotal);
  return sendEmail({
    to,
    subject: `Siparişiniz Alındı - #${orderNumber}`,
    html,
  });
}

export async function sendStatusUpdate(params: {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderId: string;
  oldStatus?: string;
  newStatus: string;
  notes?: string;
  trackingNumber?: string;
  carrier?: string;
}) {
  const html = OrderStatusEmail(
    params.orderNumber,
    params.customerName,
    params.newStatus,
    params.trackingNumber,
    params.carrier
  );

  return sendEmail({
    to: params.customerEmail,
    subject: `Sipariş Durumunuz Güncellendi - #${params.orderNumber}`,
    html,
  });
}
