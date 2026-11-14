// ==========================================
// IYZICO ÖDEME ENTEGRASYONU (REST API)
//
// iyzico Checkout Form (iframe) kullanarak
// güvenli ödeme alma altyapısı.
//
// NPM paketi Turbopack ile uyumsuz olduğundan
// doğrudan REST API kullanılır.
//
// Sandbox: sandbox-api.iyzipay.com
// Production: api.iyzipay.com
// ==========================================

import crypto from "crypto";

const API_KEY = process.env.IYZICO_API_KEY || "";
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || "";
const BASE_URL =
  process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

// Canlıda adres unutulursa ödemeler sessizce test ortamına
// gidiyor ve hiçbiri gerçekten tahsil edilmiyordu. Günlüğe
// açıkça yazılsın ki Vercel loglarında hemen görünsün.
if (
  process.env.VERCEL_ENV === "production" &&
  !process.env.IYZICO_BASE_URL
) {
  console.error(
    "UYARI: IYZICO_BASE_URL ayarlı değil — ödemeler iyzico TEST ortamına (sandbox) gidiyor. Canlı için https://api.iyzipay.com yazılmalı."
  );
}

// ==========================================
// Authorization Header Oluşturma (IYZWSv2)
// ==========================================

function generateAuthHeaders(
  uriPath: string,
  requestBody: string
): { authorization: string; randomKey: string } {
  const randomKey = `${Date.now()}${crypto.randomBytes(4).toString("hex")}`;
  // iyzico belgeleri: payload = randomKey + uriPath + requestBody
  const payload = randomKey + uriPath + requestBody;
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");

  const authorizationString = `apiKey:${API_KEY}&randomKey:${randomKey}&signature:${signature}`;
  const base64Encoded = Buffer.from(authorizationString).toString("base64");

  return {
    authorization: `IYZWSv2 ${base64Encoded}`,
    randomKey,
  };
}

// ==========================================
// iyzico API İstek Gönderme
// ==========================================

async function iyzicoRequest<T>(uriPath: string, body: object): Promise<T> {
  const requestBody = JSON.stringify(body);
  const { authorization, randomKey } = generateAuthHeaders(uriPath, requestBody);

  const response = await fetch(`${BASE_URL}${uriPath}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "x-iyzi-rnd": randomKey,
      "Content-Type": "application/json",
    },
    body: requestBody,
  });

  const data = await response.json();
  return data as T;
}

// ==========================================
// Checkout Form Başlatma
// ==========================================

export interface CheckoutFormInitParams {
  conversationId: string;
  price: string;
  paidPrice: string;
  currency: "TRY" | "USD" | "EUR";
  basketId: string;
  paymentGroup: "PRODUCT" | "LISTING" | "SUBSCRIPTION";
  callbackUrl: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    identityNumber: string;
    gsmNumber?: string;
    registrationAddress: string;
    ip: string;
    city: string;
    country: string;
    zipCode?: string;
  };
  shippingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: "PHYSICAL" | "VIRTUAL";
    price: string;
  }>;
  enabledInstallments?: number[];
}

const INIT_PATH =
  "/payment/iyzipos/checkoutform/initialize/auth/ecom";

export async function initializeCheckoutForm(
  params: CheckoutFormInitParams
): Promise<IyzicoCheckoutFormResult> {
  const request = {
    locale: "tr",
    conversationId: params.conversationId,
    price: params.price,
    paidPrice: params.paidPrice,
    currency: params.currency,
    basketId: params.basketId,
    paymentGroup: params.paymentGroup,
    callbackUrl: params.callbackUrl,
    enabledInstallments: params.enabledInstallments || [1],
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      gsmNumber: "+905350000000",
      email: params.buyer.email,
      identityNumber: params.buyer.identityNumber,
      lastLoginDate:
        new Date().toISOString().split("T")[0] + " 00:00:00",
      registrationDate:
        new Date().toISOString().split("T")[0] + " 00:00:00",
      registrationAddress: params.buyer.registrationAddress,
      ip: params.buyer.ip,
      city: params.buyer.city,
      country: params.buyer.country,
      zipCode: "34000",
    },
    shippingAddress: {
      contactName: params.shippingAddress.contactName,
      city: params.shippingAddress.city,
      country: params.shippingAddress.country,
      address: params.shippingAddress.address,
      zipCode: "34000",
    },
    billingAddress: {
      contactName: params.billingAddress.contactName,
      city: params.billingAddress.city,
      country: params.billingAddress.country,
      address: params.billingAddress.address,
      zipCode: "34000",
    },
    basketItems: params.basketItems.map((item) => ({
      id: item.id,
      name: item.name,
      category1: item.category1,
      category2: "",
      itemType: item.itemType,
      price: item.price,
    })),
  };

  return iyzicoRequest<IyzicoCheckoutFormResult>(INIT_PATH, request);
}

// ==========================================
// Checkout Form Sonucu Sorgulama
// ==========================================

const RETRIEVE_PATH =
  "/payment/iyzipos/checkoutform/auth/ecom/detail";

export async function retrieveCheckoutForm(
  token: string
): Promise<IyzicoCheckoutFormRetrieveResult> {
  const request = {
    locale: "tr",
    token,
  };

  return iyzicoRequest<IyzicoCheckoutFormRetrieveResult>(
    RETRIEVE_PATH,
    request
  );
}

// ==========================================
// iyzico Response Tipleri
// ==========================================

export interface IyzicoCheckoutFormResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  locale: string;
  systemTime: number;
  conversationId: string;
  token: string;
  checkoutFormContent: string;
  tokenExpireTime: number;
  paymentPageUrl: string;
}

export interface IyzicoCheckoutFormRetrieveResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  locale: string;
  systemTime: number;
  conversationId: string;
  token: string;
  paymentId: string;
  price: number;
  paidPrice: number;
  currency: string;
  installment: number;
  paymentStatus: string;
  fraudStatus: number;
  merchantCommissionRate: number;
  merchantCommissionRateAmount: number;
  iyziCommissionRateAmount: number;
  iyziCommissionFee: number;
  cardType: string;
  cardAssociation: string;
  cardFamily: string;
  binNumber: string;
  lastFourDigits: string;
  basketId: string;
  itemTransactions: Array<{
    itemId: string;
    paymentTransactionId: string;
    transactionStatus: number;
    price: number;
    paidPrice: number;
  }>;
}

// ==========================================
// 3D SECURE ÖDEME (sitenin kendi kart formu)
//
// Kart bilgisi tarayıcıdan bizim sunucumuza, oradan doğrudan
// iyzico'ya gider. KURAL: kart numarası, son kullanma tarihi
// ve CVC hiçbir yerde loglanmaz, veritabanına yazılmaz, hata
// mesajına konmaz. Bu fonksiyonlar yalnızca iyzico'ya iletir.
// Her ödeme 3D Secure ile yapılır (banka SMS onayı); 3D'siz
// "/payment/auth" ucu bilerek kullanılmaz.
// ==========================================

export interface PaymentCard {
  cardHolderName: string;
  cardNumber: string;
  expireMonth: string;
  expireYear: string;
  cvc: string;
}

const THREEDS_INIT_PATH = "/payment/3dsecure/initialize";
const THREEDS_AUTH_PATH = "/payment/3dsecure/auth";
const BIN_CHECK_PATH = "/payment/bin/check";

export interface ThreeDSInitResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  /** Bankanın 3D doğrulama sayfası (base64 HTML) */
  threeDSHtmlContent?: string;
  paymentId?: string;
}

export async function initializeThreeDS(
  params: Omit<CheckoutFormInitParams, "enabledInstallments">,
  card: PaymentCard
): Promise<ThreeDSInitResult> {
  const request = {
    locale: "tr",
    conversationId: params.conversationId,
    price: params.price,
    paidPrice: params.paidPrice,
    currency: params.currency,
    installment: 1,
    basketId: params.basketId,
    paymentChannel: "WEB",
    paymentGroup: params.paymentGroup,
    callbackUrl: params.callbackUrl,
    paymentCard: { ...card, registerCard: 0 },
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      gsmNumber: "+905350000000",
      email: params.buyer.email,
      identityNumber: params.buyer.identityNumber,
      lastLoginDate: new Date().toISOString().split("T")[0] + " 00:00:00",
      registrationDate: new Date().toISOString().split("T")[0] + " 00:00:00",
      registrationAddress: params.buyer.registrationAddress,
      ip: params.buyer.ip,
      city: params.buyer.city,
      country: params.buyer.country,
      zipCode: "34000",
    },
    shippingAddress: { ...params.shippingAddress, zipCode: "34000" },
    billingAddress: { ...params.billingAddress, zipCode: "34000" },
    basketItems: params.basketItems.map((item) => ({ ...item, category2: "" })),
  };

  // Yanıtta kart verisi yoktur; isteğin kendisi hiçbir yere yazılmaz
  return iyzicoRequest<ThreeDSInitResult>(THREEDS_INIT_PATH, request);
}

export interface ThreeDSAuthResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  conversationId?: string;
  paymentId?: string;
  price?: number;
  paidPrice?: number;
  installment?: number;
  cardType?: string;
  cardAssociation?: string;
  cardFamily?: string;
  binNumber?: string;
  lastFourDigits?: string;
  basketId?: string;
  fraudStatus?: number;
}

/** Banka onayından sonra ödemeyi tamamlar (parayı çeker) */
export async function completeThreeDS(
  paymentId: string,
  conversationId?: string,
  conversationData?: string
): Promise<ThreeDSAuthResult> {
  return iyzicoRequest<ThreeDSAuthResult>(THREEDS_AUTH_PATH, {
    locale: "tr",
    conversationId,
    paymentId,
    ...(conversationData ? { conversationData } : {}),
  });
}

export interface BinCheckResult {
  status: "success" | "failure";
  errorCode?: string;
  errorMessage?: string;
  binNumber?: string;
  /** CREDIT_CARD | DEBIT_CARD | PREPAID_CARD */
  cardType?: string;
  /** VISA | MASTER_CARD | TROY | AMERICAN_EXPRESS */
  cardAssociation?: string;
  /** Bonus, World, Maximum, Axess, Paraf, CardFinans, Advantage, Bankkart Combo… */
  cardFamily?: string;
  bankName?: string;
  bankCode?: number;
  commercial?: number;
}

/** Kartın ilk 6-8 hanesinden banka/program bilgisini sorgular */
export async function checkBin(binNumber: string): Promise<BinCheckResult> {
  return iyzicoRequest<BinCheckResult>(BIN_CHECK_PATH, {
    locale: "tr",
    binNumber,
  });
}
