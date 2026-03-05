import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Sıkça Sorulan Sorular",
    description:
        "3D baskı, sipariş süreçleri ve teslimat hakkında aklınıza takılan soruların yanıtları.",
    openGraph: {
        title: "SSS | ADJY",
        description: "3D baskı süreci ile ilgili aklınıza takılanlar.",
    },
};

export default function FAQLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // JSON-LD structured data for FAQ
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "Kendi modelimi yükleyip bastırabilir miyim?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Şu anki sistemimizde doğrudan 3D model yükleme özelliği kapalıdır. Yalnızca sunduğumuz parametrik ürünleri özelleştirebilirsiniz.",
                },
            },
            {
                "@type": "Question",
                name: "Kişiselleştirilmiş ürünlerde iade/değişim mümkün mü?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Size özel üretilmiş 3D baskılarda iade kabul edilmemektedir. Ancak baskı hatası tespit edilirse yenisi ücretsiz olarak üretilip gönderilir.",
                },
            },
            {
                "@type": "Question",
                name: "Hangi malzemeleri (materyalleri) kullanıyorsunuz?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Genel kullanım için PLA ve PLA+ kullanılmaktadır. Darbeye dayanıklı parçalar için PETG veya TPU seçeneklerimiz de mevcuttur.",
                },
            },
            {
                "@type": "Question",
                name: "Siparişimin durumunu nasıl takip edebilirim?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Giriş yaptıktan sonra 'Profil -> Siparişlerim' sayfasından baskının hangi aşamada olduğunu anlık görebilirsiniz.",
                },
            },
        ],
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
