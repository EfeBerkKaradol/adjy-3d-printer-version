interface ProductJsonLdProps {
  name: string;
  description: string;
  price: number;
  currency?: string;
  image?: string | null;
  url: string;
  rating?: { average: number; count: number };
  category?: string;
}

export function ProductJsonLd({
  name,
  description,
  price,
  currency = "TRY",
  image,
  url,
  rating,
  category,
}: ProductJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    ...(image && { image }),
    ...(category && { category }),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
    },
    ...(rating &&
      rating.count > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: rating.average,
          reviewCount: rating.count,
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
