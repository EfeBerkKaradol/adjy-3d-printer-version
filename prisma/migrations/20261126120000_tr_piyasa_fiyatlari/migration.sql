-- Mağaza ürünlerinin fiyatları Türkiye ortalamasına çekildi (KDV dâhil, ₺).
--
-- Fiyatlar benzer 3B baskı / alçı ürünlerin Türkiye'deki pazar yeri
-- ortalamasına göre seçildi. Bazı ürünler piyasanın iki katında
-- (sarkıt abajurlar, tütsülükler), deneme verisinden kalanlar ise
-- maliyetin altında (19–45 ₺) duruyordu.
--
-- Yalnızca slug'ı listede olan ürüne dokunulur; listede olmayan (ör.
-- müşteri modelleri, yönetim panelinden sonradan eklenenler) aynen
-- kalır. "Kendin Tasarla" ürünleri (tasarla-…) burada değil: fiyatları
-- koddan gelir (src/lib/tasarim/pricing.ts) ve satırları açılışta
-- eşitlenir.
--
-- Fiyatı değişen üründe üstü çizili eski fiyat temizlenir: eski
-- fiyat yeni fiyatın üstünde kalırsa olmayan bir indirim gösterilir.

UPDATE "products" AS p
SET "basePrice" = v.fiyat,
    "compareAtPrice" = NULL,
    "updatedAt" = NOW()
FROM (VALUES
  ('sarkit-abajur-elmas', 899),
  ('sarkit-abajur-teras', 999),
  ('sarkit-abajur-burgu', 1049),
  ('sarkit-abajur-lamel', 1149),
  ('sarkit-abajur-sevron', 999),
  ('sarkit-abajur-yelpaze', 1049),
  ('sandik-tutsuluk', 449),
  ('besik-palo-santo-tablasi', 349),
  ('mantar-tutsuluk', 399),
  ('peri-bacasi-geri-akis-tutsuluk', 499),
  ('amfi-cubuk-tutsuluk', 299),
  ('kul-tutuculu-tutsuluk', 349),
  ('heykelsi-samdan', 449),
  ('comlek-dokulu-vazo', 449),
  ('cizgili-fistolu-vazo', 449),
  ('berberi-motifli-kabartma-saksi', 449),
  ('ayakli-saksi', 449),
  ('kendinden-sulamali-saksi', 399),
  ('cam-tuplu-koklendirme-standi', 349),
  ('fiyonk-agac-tepeligi', 299),
  ('isme-ozel-sus-seti', 249),
  ('findikkiran-asker-figuru', 399),
  ('isikli-masaustu-yilbasi-agaci', 649),
  ('isikli-minyatur-ev', 449),
  ('sarilan-cift-heykeli', 449),
  ('minimal-kedi-biblo-seti', 299),
  ('hediye-kutulu-alci-boyama-seti', 399),
  ('boyanabilir-alci-figur-seti', 449),
  ('ay-gece-lambasi', 649),
  ('fotografli-litofan-gece-lambasi', 749),
  ('mantar-masa-lambasi', 899),
  ('oyun-kolu-standi', 299),
  ('kulaklik-standli-masa-duzenleyici', 649),
  ('tablet-standi', 249),
  ('delikli-duvar-paneli', 349),
  ('skadis-ikea-voronoi-duzenleyici', 299),
  ('istiflenebilir-depolama-kutusu', 199),
  ('kose-rafi', 249),
  ('rafa-raf', 199),
  ('dekoratif-kup-duvar-rafi', 299),
  ('kabartmali-dekoratif-kase', 299),
  ('dekoratif-depolama-tabagi', 199)
) AS v(slug, fiyat)
WHERE p."slug" = v.slug;
