import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Bize Ulaşın",
    description:
        "3D baskı projeniz, toptan siparişleriniz veya aklınıza takılan herhangi bir soru için bizimle iletişime geçin.",
    openGraph: {
        title: "Bize Ulaşın | ADJY",
        description: "3D baskı projeleriniz için ADJY ile iletişime geçin.",
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
