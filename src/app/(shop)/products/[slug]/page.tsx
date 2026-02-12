export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Urun Detay: {slug}</h1>
      <p className="text-muted-foreground">
        Urun detay sayfasi burada goruntulenecek. (Gelistirme asamasinda)
      </p>
    </div>
  );
}
