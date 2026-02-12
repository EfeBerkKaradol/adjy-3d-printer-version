export default async function CustomizePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">3D Ozellestirme</h1>
      <p className="text-muted-foreground mb-8">Urun ID: {productId}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">
            3D Model Viewer burada goruntulenecek
          </p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Parametreler</h2>
          <p className="text-muted-foreground">
            Parametre kontrolleri burada goruntulenecek. (Gelistirme asamasinda)
          </p>
        </div>
      </div>
    </div>
  );
}
