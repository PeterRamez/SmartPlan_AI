/**
 * OCR integration boundary. This intentionally does not pretend OCR has run.
 * Implement a provider (e.g. Tesseract worker or managed OCR) and return extracted text.
 */
export interface OcrProvider { extract(buffer: Buffer, mimeType: string): Promise<{ text: string; pages?: number }> }
export async function runOcr(_buffer: Buffer, _mimeType: string): Promise<never> {
  throw new Error("OCR provider is not configured. Document remains marked needs_ocr.");
}
