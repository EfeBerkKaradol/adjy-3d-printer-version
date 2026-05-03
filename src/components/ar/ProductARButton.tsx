"use client";

import { useState, useCallback } from "react";
import { ARButton } from "./ARButton";
import { ARModal } from "./ARModal";
import { extractDimensions } from "@/lib/ar/realSizeCalibration";

interface ProductARButtonProps {
  productId: string;
  productName: string;
  productSlug: string;
  modelFileUrl?: string | null;
  defaultParameters: Record<string, number | string>;
}

/**
 * Urun detay sayfasi icin client component wrapper.
 * Server component'ten gelen varsayilan parametrelerle AR butonunu render eder.
 */
export function ProductARButton({
  productName,
  productSlug,
  modelFileUrl,
  defaultParameters,
}: ProductARButtonProps) {
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arGlbUrl, setArGlbUrl] = useState<string | null>(null);
  const [arUsdzUrl, setArUsdzUrl] = useState<string | null>(null);

  const productType = getProductType(productSlug);
  const dimensions = extractDimensions(defaultParameters, productType);

  const handleActivateAR = useCallback(
    (glbUrl: string, usdzUrl?: string | null) => {
      setArGlbUrl(glbUrl);
      setArUsdzUrl(usdzUrl || null);
      setArModalOpen(true);
    },
    []
  );

  return (
    <>
      <ARButton
        parameters={defaultParameters}
        productType={productType}
        modelFileUrl={modelFileUrl}
        productName={productName}
        onActivateAR={handleActivateAR}
      />

      {arGlbUrl && (
        <ARModal
          isOpen={arModalOpen}
          onClose={() => setArModalOpen(false)}
          glbUrl={arGlbUrl}
          usdzUrl={arUsdzUrl}
          productName={productName}
          dimensions={dimensions}
        />
      )}
    </>
  );
}

function getProductType(slug: string): string {
  if (slug.includes("eriyen"))  return "meltingShelf";
  if (slug.includes("kup") || slug.includes("cubic") || slug.includes("hex")) return "hexShelf";
  if (slug.includes("skadis"))  return "skadisPanel";
  if (slug.includes("kose-rafi") || slug.includes("kose_rafi")) return "cornerShelf";
  if (slug.includes("depolama-kutusu") || slug.includes("storage-basket")) return "storageBasket";
  if (slug.includes("rafa-raf") || slug.includes("shelf-for-shelf")) return "shelfForShelf";
  if (slug.includes("kase") || slug.includes("bowl")) return "ribbedBowl";
  if (slug.includes("dekoratif-depolama") || slug.includes("tabagi") || slug.includes("tabak")) return "decorativeStorage";
  if (slug.includes("vazo"))    return "vase";
  if (slug.includes("stand") || slug.includes("telefon")) return "stand";
  if (slug.includes("anahtarlik")) return "keychain";
  if (slug.includes("lamba") || slug.includes("lamp")) return "lamp";
  if (slug.includes("kalem") || slug.includes("pencil")) return "pencilHolder";
  if (slug.includes("bileklik") || slug.includes("bracelet")) return "bracelet";
  if (slug.includes("disli") || slug.includes("gear")) return "gear";
  if (slug.includes("ejderha") || slug.includes("figur")) return "figure";
  return "vase";
}
