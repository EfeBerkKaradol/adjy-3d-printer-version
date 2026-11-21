// ==========================================
// three sarmalayıcısı (import map'te "three" buraya yönlenir)
//
// three'nin kendisi, tek fark: WebGLRenderer kurulunca ölçü
// çizgileri katmanı (olcu.js) ona bağlanır. Eklentiler de "three"
// adını buradan aldığı için sayfada tek bir three örneği kalır.
// ==========================================
import * as T from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
export * from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";

export class WebGLRenderer extends T.WebGLRenderer {
  constructor(secenek) {
    super(secenek);
    if (window.ADJY_OLCU) window.ADJY_OLCU.bagla(this, T);
  }
}
