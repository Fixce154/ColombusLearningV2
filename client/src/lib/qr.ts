const GALOIS_EXP = new Array<number>(512);
const GALOIS_LOG = new Array<number>(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GALOIS_EXP[i] = x;
    GALOIS_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GALOIS_EXP[i] = GALOIS_EXP[i - 255]!;
  }
})();

const MODE_BYTE = 0x4;
const EC_LEVEL_M = 0x00;

const RS_BLOCK_TABLE: number[] = [
  // version 1
  1, 26, 19, 1, 26, 16, 1, 26, 13, 1, 26, 9,
  // version 2
  1, 44, 34, 1, 44, 28, 1, 44, 22, 1, 44, 16,
  // version 3
  1, 70, 55, 1, 70, 44, 2, 35, 17, 2, 35, 13,
  // version 4
  1, 100, 80, 2, 50, 32, 2, 50, 24, 4, 25, 9,
  // version 5
  1, 134, 108, 2, 67, 43, 2, 33, 15, 2, 33, 11,
  // version 6
  2, 86, 68, 4, 43, 27, 4, 43, 19, 4, 43, 15,
];

const VERSION_CAPACITY_M = [14, 26, 42, 62, 84, 106];

const PATTERN_POSITION_TABLE = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

function getTypeInfoBits(ecLevel: number, maskPattern: number) {
  const value = (ecLevel << 3) | maskPattern;
  let bits = value << 10;
  const generator = 0x537;
  while ((bits >> 10) !== 0) {
    const shift = (bits.toString(2).length - generator.toString(2).length);
    bits ^= generator << shift;
  }
  return ((value << 10) | bits) ^ 0x5412;
}

function getRSBlocks(version: number, ecLevel: number) {
  const tableIndex = (version - 1) * 4;
  let offset = 0;
  if (ecLevel === EC_LEVEL_M) {
    offset = tableIndex + 1;
  } else {
    throw new Error("Only EC level M is supported");
  }

  const rsBlock: Array<{ totalCount: number; dataCount: number }> = [];
  const totalCount = RS_BLOCK_TABLE[offset * 3 + 0]!;
  const blockTotal = RS_BLOCK_TABLE[offset * 3 + 1]!;
  const dataCount = RS_BLOCK_TABLE[offset * 3 + 2]!;

  for (let i = 0; i < totalCount; i++) {
    rsBlock.push({ totalCount: blockTotal, dataCount });
  }

  return rsBlock;
}

function glog(n: number) {
  if (n < 1) {
    throw new Error("glog(" + n + ")");
  }
  return GALOIS_LOG[n]!;
}

function gexp(n: number) {
  return GALOIS_EXP[n];
}

class QRPolynomial {
  constructor(public readonly coefficients: number[]) {
    while (this.coefficients.length > 0 && this.coefficients[0] === 0) {
      this.coefficients.shift();
    }
  }

  multiply(other: QRPolynomial) {
    const result: number[] = new Array(this.coefficients.length + other.coefficients.length - 1).fill(0);
    for (let i = 0; i < this.coefficients.length; i++) {
      for (let j = 0; j < other.coefficients.length; j++) {
        result[i + j] ^= gexp(glog(this.coefficients[i]!) + glog(other.coefficients[j]!));
      }
    }
    return new QRPolynomial(result);
  }

  mod(other: QRPolynomial): QRPolynomial {
    if (this.coefficients.length - other.coefficients.length < 0) {
      return this;
    }
    const ratio = glog(this.coefficients[0]!) - glog(other.coefficients[0]!);
    const scaled = other.coefficients.map((c) => gexp(glog(c!) + ratio));
    const buffer = this.coefficients.map((c, idx) => c ^ (scaled[idx] ?? 0));
    return new QRPolynomial(buffer).mod(other);
  }
}

function createGeneratorPolynomial(ecCount: number) {
  let poly = new QRPolynomial([1]);
  for (let i = 0; i < ecCount; i++) {
    poly = poly.multiply(new QRPolynomial([1, gexp(i)]));
  }
  return poly;
}

function createData(version: number, data: number[]): number[] {
  const rsBlocks = getRSBlocks(version, EC_LEVEL_M);
  const buffer: number[] = [];

  let totalDataCount = 0;
  for (const block of rsBlocks) {
    totalDataCount += block.dataCount;
  }

  const dataBuffer: number[] = data.slice(0);
  if (dataBuffer.length !== totalDataCount) {
    throw new Error("Invalid data length");
  }

  let offset = 0;
  const blocks: { data: number[]; ec: number[] }[] = [];
  for (const block of rsBlocks) {
    const blockData = dataBuffer.slice(offset, offset + block.dataCount);
    offset += block.dataCount;
    const ecCount = block.totalCount - block.dataCount;
    const generator = createGeneratorPolynomial(ecCount);
    const raw = blockData.slice();
    while (raw.length < block.totalCount) {
      raw.push(0);
    }
    const mod = new QRPolynomial(raw).mod(generator);
    const ecData = new Array(ecCount).fill(0);
    const modCoefficients = mod.coefficients;
    const padding = ecCount - modCoefficients.length;
    for (let i = 0; i < modCoefficients.length; i++) {
      ecData[i + padding] = modCoefficients[i]!;
    }
    blocks.push({ data: blockData, ec: ecData });
  }

  const maxDataLength = Math.max(...blocks.map((b) => b.data.length));
  const maxEcLength = Math.max(...blocks.map((b) => b.ec.length));

  for (let i = 0; i < maxDataLength; i++) {
    for (const block of blocks) {
      if (i < block.data.length) {
        buffer.push(block.data[i]!);
      }
    }
  }

  for (let i = 0; i < maxEcLength; i++) {
    for (const block of blocks) {
      if (i < block.ec.length) {
        buffer.push(block.ec[i]!);
      }
    }
  }

  return buffer;
}

function buildMatrix(version: number, data: number[]) {
  const size = version * 4 + 17;
  const matrix: Array<Array<number | null>> = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  const setFunctionModule = (row: number, col: number, value: number) => {
    matrix[row]![col] = value;
    isFunction[row]![col] = true;
  };

  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
        const isCore = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        if (isBorder) {
          setFunctionModule(rr, cc, 0);
        } else if (isCore && (r === 0 || r === 6 || c === 0 || c === 6)) {
          setFunctionModule(rr, cc, 1);
        } else if (isCore && r >= 2 && r <= 4 && c >= 2 && c <= 4) {
          setFunctionModule(rr, cc, 1);
        } else if (isCore) {
          setFunctionModule(rr, cc, 0);
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  for (let i = 0; i < size; i++) {
    if (!isFunction[6]![i]) {
      setFunctionModule(6, i, i % 2 === 0 ? 1 : 0);
    }
    if (!isFunction[i]![6]) {
      setFunctionModule(i, 6, i % 2 === 0 ? 1 : 0);
    }
  }

  const positions = PATTERN_POSITION_TABLE[version] || [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = 0; j < positions.length; j++) {
      const row = positions[i]!;
      const col = positions[j]!;
      if (isFunction[row]![col]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const value = Math.max(Math.abs(r), Math.abs(c)) === 1 ? 0 : 1;
          setFunctionModule(row + r, col + c, value);
        }
      }
      setFunctionModule(row, col, 1);
    }
  }

  setFunctionModule(size - 8, 8, 1);

  let bitIndex = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const column = col - c;
        if (isFunction[row]![column]) continue;
        const byte = data[Math.floor(bitIndex / 8)] ?? 0;
        const bit = (byte >>> (7 - (bitIndex % 8))) & 1;
        matrix[row]![column] = bit;
        bitIndex++;
      }
    }
    upward = !upward;
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFunction[row]![col]) continue;
      if (((row + col) & 1) === 0) {
        matrix[row]![col]! ^= 1;
      }
    }
  }

  const typeInfo = getTypeInfoBits(EC_LEVEL_M, 0);
  const formatCoordsA = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [8, 7], [8, 6], [8, 5], [8, 4], [8, 3], [8, 2],
  ];
  const formatCoordsB = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4], [8, size - 5], [8, size - 6], [8, size - 7],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8], [size - 3, 8], [size - 2, 8], [size - 1, 8], [size - 8, 8],
  ];

  for (let i = 0; i < 15; i++) {
    const bit = (typeInfo >> i) & 1;
    const [rA, cA] = formatCoordsA[i]!;
    if (!isFunction[rA]![cA]) {
      setFunctionModule(rA, cA, bit);
    } else {
      matrix[rA]![cA]! = bit;
    }
    const [rB, cB] = formatCoordsB[14 - i]!;
    if (!isFunction[rB]![cB]) {
      setFunctionModule(rB, cB, bit);
    } else {
      matrix[rB]![cB]! = bit;
    }
  }

  return matrix.map((rowValues) => rowValues.map((value) => value === 1));
}

function createBitBuffer(data: number[]) {
  const buffer: number[] = [];
  let bitLength = 0;
  const put = (num: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      buffer.push((num >>> i) & 1);
    }
    bitLength += length;
  };

  put(MODE_BYTE, 4);
  put(data.length, 8);
  for (const byte of data) {
    put(byte, 8);
  }

  return { buffer, bitLength };
}

export function createQrMatrix(text: string) {
  const encoder = new TextEncoder();
  const dataBytes = Array.from(encoder.encode(text));

  let version = 1;
  for (; version <= VERSION_CAPACITY_M.length; version++) {
    if (dataBytes.length <= VERSION_CAPACITY_M[version - 1]!) {
      break;
    }
  }
  if (version > VERSION_CAPACITY_M.length) {
    throw new Error("Message too long for supported QR versions");
  }

  const bitBuffer = createBitBuffer(dataBytes);
  const rsBlocks = getRSBlocks(version, EC_LEVEL_M);
  let totalDataCount = 0;
  for (const block of rsBlocks) {
    totalDataCount += block.dataCount;
  }

  const totalBits = totalDataCount * 8;
  if (bitBuffer.bitLength + 4 <= totalBits) {
    bitBuffer.buffer.push(0, 0, 0, 0);
    bitBuffer.bitLength += 4;
  }

  while (bitBuffer.bitLength % 8 !== 0) {
    bitBuffer.buffer.push(0);
    bitBuffer.bitLength++;
  }

  const data: number[] = [];
  for (let i = 0; i < bitBuffer.buffer.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | (bitBuffer.buffer[i + j] || 0);
    }
    data.push(byte);
  }

  const paddingBytes = [0xec, 0x11];
  let padIndex = 0;
  while (data.length < totalDataCount) {
    data.push(paddingBytes[padIndex % 2]!);
    padIndex++;
  }

  const dataCodewords = createData(version, data);
  return buildMatrix(version, dataCodewords);
}
