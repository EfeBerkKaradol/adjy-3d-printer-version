// three sarmalayıcısı: bkz. ../_adjy/three.js. Bu araç three'yi
// kendi vendor klasöründen alıyor.
import * as T from "./vendor/three/build/three.module.js";
export * from "./vendor/three/build/three.module.js";

export class WebGLRenderer extends T.WebGLRenderer {
  constructor(secenek) {
    super(secenek);
    if (window.ADJY_OLCU) window.ADJY_OLCU.bagla(this, T);
  }
}
