"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Siparis verdikten sonra ne kadar surede teslim edilir?",
    a: "Standart urunler 3-5 is gunu, ozel tasarim urunler ise baski ve kalite kontrol sureci dahil 5-10 is gunu icerisinde kargoya verilir.",
  },
  {
    q: "Parametrik ozellestirme nedir?",
    a: "Parametrik ozellestirme, urunun boyut, sekil ve diger ozelliklerini ihtiyaciniza gore ayarlamaniza olanak tanir. Her urun farkli parametrelerle uretilir.",
  },
  {
    q: "AR (Arttirilmis Gerceklik) nasil calisir?",
    a: "Urun sayfasindaki AR butonuna tiklayarak, urunu kameraniz araciligiyla gercek ortaminizda goruntuleyebilirsiniz. iOS ve Android cihazlarda desteklenir.",
  },
  {
    q: "Hangi 3D baski malzemeleri kullanilmaktadir?",
    a: "PLA, ABS, PETG ve Resin gibi yuksek kaliteli malzemeler kullaniyoruz. Her urunun malzeme bilgisi urun sayfasinda belirtilmistir.",
  },
  {
    q: "Siparis iptali yapabilir miyim?",
    a: "Siparisiniz 'Baskida' asamasina gecmeden once iptal edebilirsiniz. Profil > Siparislerim sayfasindan iptal islemini gerceklestirebilirsiniz.",
  },
  {
    q: "Iade ve degisim politikaniz nedir?",
    a: "Uretim hatali urunlerde ucretsiz iade ve yeniden uretim yapilir. Ozel tasarim urunlerde iade kabul edilmemektedir.",
  },
  {
    q: "Odeme yontemleri nelerdir?",
    a: "Kredi karti ve banka karti ile guvenli odeme yapabilirsiniz. Tum odemeler iyzico altyapisi ile gerceklestirilir.",
  },
  {
    q: "Toplu siparis verebilir miyim?",
    a: "Evet, toplu siparisler icin iletisim sayfamizdan bize ulasin. Ozel fiyatlandirma ve teslimat suresi icin teklifimizi alalim.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-medium text-sm pr-4">{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Sikca Sorulan Sorular</h1>
      <p className="text-muted-foreground mb-8">Merak ettiginiz sorularin yanitlari</p>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <FaqItem key={i} q={faq.q} a={faq.a} />
        ))}
      </div>
    </div>
  );
}
