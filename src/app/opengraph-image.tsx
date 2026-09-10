import { ImageResponse } from "next/og";

// ==========================================
// PAYLAŞIM GÖRSELİ
//
// Site bir yere paylaşıldığında (WhatsApp, X, LinkedIn)
// önizleme kartında görünen kare. Daha önce hiç yoktu:
// twitter:card "summary_large_image" ilan ediliyordu ama
// görsel verilmediği için her bağlantı boş gri bir kutu
// olarak çıkıyordu — yani tam tavsiye edildiğin anda.
//
// Kart, sitenin kendi paletiyle çizilir ve derleme sırasında
// üretilir; ayrıca bir dosya tutmaya gerek yok.
// ==========================================

export const alt = "ADJY — parametrik 3D baskı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#F5F4F0";
const FOREGROUND = "#171717";
const MUTED = "#6F6F6F";
const BORDER = "#E2E0D9";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BACKGROUND,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: 18,
              fontWeight: 800,
              color: FOREGROUND,
            }}
          >
            ADJY
          </div>
          <div
            style={{
              marginTop: 18,
              height: 1,
              width: 132,
              background: FOREGROUND,
              display: "flex",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              // Satori birden çok çocuğu olan her kutuda açık
              // display bekler; satırlar <br> yerine ayrı kutular.
              display: "flex",
              flexDirection: "column",
              fontSize: 72,
              lineHeight: 1.05,
              letterSpacing: -2.4,
              color: FOREGROUND,
              maxWidth: 900,
            }}
          >
            <div style={{ display: "flex" }}>Ölçüsünü sen seç,</div>
            <div style={{ display: "flex" }}>ADJY üretsin.</div>
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 27,
              lineHeight: 1.4,
              color: MUTED,
              maxWidth: 760,
            }}
          >
            Parametrik 3D baskı nesneleri. Bir fotoğraftan kendi ürününü
            oluştur, odanda gör, ürettir.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 26,
            fontSize: 23,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>adjyshopping.com</div>
          <div style={{ display: "flex", letterSpacing: 2 }}>
            MAĞAZA · YAPILANDIR · ÜRET
          </div>
        </div>
      </div>
    ),
    size
  );
}
