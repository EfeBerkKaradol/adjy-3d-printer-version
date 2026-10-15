interface ProductJsonLdProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
  image?: string | null;
  url: string;
  sku?: string | null;
  stockQty?: number;
  rating?: { average: number; count: number };
  category?: string;
}

/**
 * Google Merchant Center uyumlu Product schema.org yapılandırması.
 * https://developers.google.com/search/docs/appearance/structured-data/product
 */
export function ProductJsonLd({
  name,
  description,
  price,
  currency = "TRY",
  image,
  url,
  sku,
  stockQty = 999,
  rating,
  category,
}: ProductJsonLdProps) {
  // Stok durumunu stockQty'ye göre belirle
  const availability =
    stockQty > 10
      ? "https://schema.org/InStock"
      : stockQty > 0
      ? "https://schema.org/LimitedAvailability"
      : "https://schema.org/OutOfStock";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    ...(image && { image }),
    ...(category && { category }),
    ...(sku && { sku, mpn: sku }),
    brand: {
      "@type": "Brand",
      name: "ADJY",
    },
    offers: {
      "@type": "Offer",
      url,
      price,
      priceCurrency: currency,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "ADJY",
      },
      // Google Merchant Center — Teslimat detayları
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: price >= 500 ? "0" : "29.90",
          currency: "TRY",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 3,
            unitCode: "DAY",
          },
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "TR",
        },
      },
      // Google Merchant Center — İade politikası
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "TR",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
        merchantReturnLink: `${url.split("/products")[0]}/iade-politikasi`,
      },
    },
    ...(rating &&
      rating.count > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.average,
          reviewCount: rating.count,
          bestRating: 5,
          worstRating: 1,
        },
      }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface WebSiteJsonLdProps {
  name: string;
  url: string;
  description: string;
}

export function WebSiteJsonLd({ name, url, description }: WebSiteJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${url}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ==========================================
// KURULUŞ / İŞLETME
//
// Marka aramalarında ("adjy", "adjy shopping") Google'ın
// işletmeyi tanıması ve bilgi panelini doğru kurması için.
// Adres verildiği için Store tipi kullanılır — yerel aramada
// da karşılığı olur.
//
// Çalışma saatleri bilerek yazılmadı: doğrulanmamış bir
// saat bilgisini yapısal veriye koymak, kapalıyken açık
// görünmek demektir.
// ==========================================

interface OrganizationJsonLdProps {
  url: string;
  logo?: string;
}

export function OrganizationJsonLd({ url, logo }: OrganizationJsonLdProps) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${url}#organization`,
    name: "ADJY",
    alternateName: "ADJY Shopping",
    url,
    ...(logo && { logo, image: logo }),
    description:
      "3D baskı, seramik ve alçı ile üretilen dekoratif ve işlevsel tasarım nesneleri. Ölçüsü değiştirilebilen parametrik ürünler.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cihannüma Mahallesi, Salihefendi Sokak, Bıyıkoğlu İşhanı No: 19, Kat 5 Daire 3",
      addressLocality: "Beşiktaş",
      addressRegion: "İstanbul",
      postalCode: "34351",
      addressCountry: "TR",
    },
    areaServed: { "@type": "Country", name: "Türkiye" },
    currenciesAccepted: "TRY",
    paymentAccepted: "Kredi Kartı, Banka Kartı",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ==========================================
// KIRINTI YOLU
//
// Arama sonucunda çıplak URL yerine "Mağaza › Ev & Dekorasyon ›
// Eriyen Duvar Rafı" görünmesini sağlar. Sayfada görsel olarak
// zaten vardı ama Google'ın okuyabileceği biçimde değildi.
// ==========================================

export interface Crumb {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ==========================================
// SORU–CEVAP
//
// SSS sayfasındaki cevapların arama sonucunda doğrudan
// açılabilmesi için. Sayfada görünen metinle birebir aynı
// olmalı; farklı olursa Google yapısal veriyi yok sayar.
// ==========================================

export interface FaqEntry {
  question: string;
  answer: string;
}

export function FaqJsonLd({ items }: { items: FaqEntry[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ==========================================
// ÜRÜN LİSTESİ
//
// Mağaza ve koleksiyon sayfalarındaki sıranın Google
// tarafından liste olarak anlaşılmasını sağlar.
// ==========================================

export interface ListEntry {
  name: string;
  url: string;
}

export function ItemListJsonLd({ items }: { items: ListEntry[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
