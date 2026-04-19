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
