/**
 * ISO/IEC 18004 Standard QR Code Matrix Encoder (Pure ES Module, Zero External Dependencies)
 * Supports UTF-8 Byte Mode, Versions 1..10, Error Correction Levels M (15%) & L (7%),
 * Reed-Solomon GF(256), BCH(15,5) Format & BCH(18,6) Version Info, and full 8-mask penalty evaluation.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function buildRsGeneratorPoly(ecCount) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function computeRsRemainder(data, poly, ecCount) {
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] ^= gfMul(poly[j + 1], factor);
      }
    }
  }
  return rem;
}

// ISO/IEC 18004 Table E.1 Alignment Pattern Center Coordinates (Versions 1..10)
const ALIGNMENT_CENTERS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

// ISO/IEC 18004 Table 9 Error Correction Block Specs: [ecPerBlock, g1Blocks, g1DataCw, g2Blocks, g2DataCw]
const EC_SPECS = {
  M: [
    null,
    [10, 1, 16, 0, 0],   // V1:  16 data + 10 ec = 26
    [16, 1, 28, 0, 0],   // V2:  28 data + 16 ec = 44
    [26, 1, 44, 0, 0],   // V3:  44 data + 26 ec = 70
    [18, 2, 32, 0, 0],   // V4:  64 data + 36 ec = 100
    [24, 2, 43, 0, 0],   // V5:  86 data + 48 ec = 134
    [16, 4, 27, 0, 0],   // V6: 108 data + 64 ec = 172
    [18, 4, 31, 0, 0],   // V7: 124 data + 72 ec = 196
    [22, 2, 38, 2, 39],  // V8: 154 data + 88 ec = 242
    [22, 3, 36, 2, 37],  // V9: 182 data + 110 ec = 292
    [26, 4, 43, 1, 44]   // V10: 216 data + 130 ec = 346
  ],
  L: [
    null,
    [7, 1, 19, 0, 0],    // V1
    [10, 1, 34, 0, 0],   // V2
    [15, 1, 55, 0, 0],   // V3
    [20, 1, 80, 0, 0],   // V4
    [26, 1, 108, 0, 0],  // V5
    [18, 2, 68, 0, 0],   // V6
    [20, 2, 78, 0, 0],   // V7
    [24, 2, 97, 0, 0],   // V8
    [30, 2, 116, 0, 0],  // V9
    [18, 2, 68, 2, 69]   // V10: 274 data + 72 ec = 346
  ]
};

const EC_FORMAT_BITS = { L: 0b01, M: 0b00 };

function computeFormatBits(ecLevel, maskPattern) {
  const data = ((EC_FORMAT_BITS[ecLevel] & 0x3) << 3) | (maskPattern & 0x7);
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) {
      rem ^= 0x537 << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version) {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >> i) & 1) {
      rem ^= 0x1f25 << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function maskCondition(mask, r, c) {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return false;
  }
}

function selectVersionAndEc(byteLength) {
  for (const ecLevel of ['M', 'L']) {
    const table = EC_SPECS[ecLevel];
    for (let v = 1; v <= 10; v++) {
      const [, g1B, g1D, g2B, g2D] = table[v];
      const totalDataBytes = g1B * g1D + g2B * g2D;
      const countBits = v <= 9 ? 8 : 16;
      const maxBytes = Math.floor((totalDataBytes * 8 - 4 - countBits) / 8);
      if (byteLength <= maxBytes) {
        return { version: v, ecLevel, spec: table[v], totalDataBytes, countBits };
      }
    }
  }
  return null;
}

function buildInterleavedCodewords(utf8Bytes, spec, totalDataBytes, countBits) {
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Byte mode indicator (0100) + length + UTF-8 payload
  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, countBits);
  for (let i = 0; i < utf8Bytes.length; i++) {
    pushBits(utf8Bytes[i], 8);
  }

  // Terminator (up to 4 zero bits)
  const capacityBits = totalDataBytes * 8;
  const termLen = Math.min(4, capacityBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Byte alignment
  while (bits.length % 8 !== 0) bits.push(0);

  // Pad bytes 0xEC, 0x11
  const dataBytes = new Uint8Array(totalDataBytes);
  let byteIdx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    dataBytes[byteIdx++] = b;
  }
  let padToggle = 0;
  while (byteIdx < totalDataBytes) {
    dataBytes[byteIdx++] = padToggle % 2 === 0 ? 0xec : 0x11;
    padToggle++;
  }

  // Split into RS blocks & compute EC bytes
  const [ecPerBlock, g1B, g1D, g2B, g2D] = spec;
  const poly = buildRsGeneratorPoly(ecPerBlock);
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;

  for (let i = 0; i < g1B; i++) {
    const block = dataBytes.subarray(offset, offset + g1D);
    offset += g1D;
    dataBlocks.push(block);
    ecBlocks.push(computeRsRemainder(block, poly, ecPerBlock));
  }
  for (let i = 0; i < g2B; i++) {
    const block = dataBytes.subarray(offset, offset + g2D);
    offset += g2D;
    dataBlocks.push(block);
    ecBlocks.push(computeRsRemainder(block, poly, ecPerBlock));
  }

  // Interleave data codewords then EC codewords
  const maxDataLen = Math.max(g1D, g2D);
  const interleaved = [];
  for (let col = 0; col < maxDataLen; col++) {
    for (let b = 0; b < dataBlocks.length; b++) {
      if (col < dataBlocks[b].length) interleaved.push(dataBlocks[b][col]);
    }
  }
  for (let col = 0; col < ecPerBlock; col++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      interleaved.push(ecBlocks[b][col]);
    }
  }
  return interleaved;
}

function writeFormatInfo(modules, isFunction, size, ecLevel, mask) {
  const formatBits = computeFormatBits(ecLevel, mask);
  const getBit = (idx) => (formatBits >>> idx) & 1;

  // Copy 1: Around top-left finder
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i];
    modules[r * size + c] = getBit(14 - i);
    isFunction[r * size + c] = 1;
  }

  // Copy 2: Bottom-left vertical (bits 14..8) + top-right horizontal (bits 7..0)
  for (let i = 0; i < 7; i++) {
    const r = size - 1 - i;
    const c = 8;
    modules[r * size + c] = getBit(14 - i);
    isFunction[r * size + c] = 1;
  }
  for (let i = 0; i < 8; i++) {
    const r = 8;
    const c = size - 8 + i;
    modules[r * size + c] = getBit(7 - i);
    isFunction[r * size + c] = 1;
  }

  // Dark module
  modules[(size - 8) * size + 8] = 1;
  isFunction[(size - 8) * size + 8] = 1;
}

function evaluatePenalty(modules, size) {
  let penalty = 0;

  // N1: Adjacent same-color runs >= 5 in rows and cols
  for (let r = 0; r < size; r++) {
    let runColor = modules[r * size];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      const v = modules[r * size + c];
      if (v === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < size; c++) {
    let runColor = modules[c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      const v = modules[r * size + c];
      if (v === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = v;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // N2: 2x2 blocks of identical color
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = modules[r * size + c];
      if (
        v === modules[r * size + c + 1] &&
        v === modules[(r + 1) * size + c] &&
        v === modules[(r + 1) * size + c + 1]
      ) {
        penalty += 3;
      }
    }
  }

  // N3: 1:1:3:1:1 finder-like pattern preceded/followed by 4 light modules
  const checkLineFinder = (getCell) => {
    for (let i = 0; i <= size - 11; i++) {
      const p1 =
        getCell(i) === 1 && getCell(i + 1) === 0 && getCell(i + 2) === 1 &&
        getCell(i + 3) === 1 && getCell(i + 4) === 1 && getCell(i + 5) === 0 &&
        getCell(i + 6) === 1 && getCell(i + 7) === 0 && getCell(i + 8) === 0 &&
        getCell(i + 9) === 0 && getCell(i + 10) === 0;
      const p2 =
        getCell(i) === 0 && getCell(i + 1) === 0 && getCell(i + 2) === 0 &&
        getCell(i + 3) === 0 && getCell(i + 4) === 1 && getCell(i + 5) === 0 &&
        getCell(i + 6) === 1 && getCell(i + 7) === 1 && getCell(i + 8) === 1 &&
        getCell(i + 9) === 0 && getCell(i + 10) === 1;
      if (p1 || p2) penalty += 40;
    }
  };

  for (let r = 0; r < size; r++) checkLineFinder((c) => modules[r * size + c]);
  for (let c = 0; c < size; c++) checkLineFinder((r) => modules[r * size + c]);

  // N4: Dark module ratio balance
  let darkCount = 0;
  const total = size * size;
  for (let i = 0; i < total; i++) darkCount += modules[i];
  const fivePercentSteps = Math.floor(Math.abs(darkCount * 20 - total * 10) / total);
  penalty += fivePercentSteps * 10;

  return penalty;
}

export function generateQrMatrix(rawText) {
  const cleanText = (rawText && rawText.trim().length > 0)
    ? rawText.trim()
    : 'https://ornekfirma.com.tr';

  let utf8Bytes = new TextEncoder().encode(cleanText);
  let chosen = selectVersionAndEc(utf8Bytes.length);
  let truncated = false;

  if (!chosen) {
    utf8Bytes = utf8Bytes.slice(0, 270);
    chosen = selectVersionAndEc(utf8Bytes.length);
    truncated = true;
  }

  const { version, ecLevel, spec, totalDataBytes, countBits } = chosen;
  const size = version * 4 + 17;
  const baseModules = new Uint8Array(size * size);
  const isFunction = new Uint8Array(size * size);

  const setFunc = (r, c, dark) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    baseModules[r * size + c] = dark ? 1 : 0;
    isFunction[r * size + c] = 1;
  };

  // 1. Finder patterns + 1-module white separators
  const placeFinder = (topR, leftC) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const isRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (isRing || isCenter));
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment patterns
  const centers = ALIGNMENT_CENTERS[version];
  for (let i = 0; i < centers.length; i++) {
    for (let j = 0; j < centers.length; j++) {
      const cr = centers[i];
      const cc = centers[j];
      const overlapsFinder =
        (cr === 6 && cc === 6) ||
        (cr === 6 && cc === size - 7) ||
        (cr === size - 7 && cc === 6);
      if (overlapsFinder) continue;

      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(cr + dr, cc + dc, dist !== 1);
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const dark = i % 2 === 0;
    if (!isFunction[6 * size + i]) setFunc(6, i, dark);
    if (!isFunction[i * size + 6]) setFunc(i, 6, dark);
  }

  // 4. Reserve Format Info & Dark Module
  writeFormatInfo(baseModules, isFunction, size, ecLevel, 0);

  // 5. Version Info for V >= 7
  if (version >= 7) {
    const vBits = computeVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = (vBits >>> i) & 1;
      const a = i % 3;
      const b = Math.floor(i / 3);
      setFunc(size - 11 + a, b, bit === 1);
      setFunc(b, size - 11 + a, bit === 1);
    }
  }

  // 6. Place interleaved data + EC codewords in 2-col zigzag
  const codewords = buildInterleavedCodewords(utf8Bytes, spec, totalDataBytes, countBits);
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing line
    for (let step = 0; step < size; step++) {
      const r = upward ? (size - 1 - step) : step;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!isFunction[r * size + c]) {
          let dark = 0;
          if (bitIndex < totalBits) {
            const cw = codewords[bitIndex >>> 3];
            dark = (cw >>> (7 - (bitIndex & 7))) & 1;
            bitIndex++;
          }
          baseModules[r * size + c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // 7. Evaluate all 8 masks & pick minimum penalty
  let bestMask = 0;
  let bestScore = Infinity;
  let bestModules = null;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = new Uint8Array(baseModules);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const idx = r * size + c;
        if (!isFunction[idx] && maskCondition(mask, r, c)) {
          candidate[idx] ^= 1;
        }
      }
    }
    writeFormatInfo(candidate, isFunction, size, ecLevel, mask);
    const score = evaluatePenalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  let darkModules = 0;
  for (let i = 0; i < bestModules.length; i++) darkModules += bestModules[i];

  return {
    text: cleanText,
    version,
    ecLevel,
    mask: bestMask,
    size,
    quietZone: 3,
    darkModules,
    truncated,
    modules: bestModules,
    get(r, c) {
      if (r < 0 || r >= size || c < 0 || c >= size) return 0;
      return bestModules[r * size + c];
    }
  };
}
