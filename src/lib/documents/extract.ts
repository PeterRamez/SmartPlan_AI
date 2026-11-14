import mammoth from "mammoth";
import pdf from "pdf-parse";
export type ExtractResult = { text: string; pages?: number; needsOcr: boolean };
export async function extractDocument(buffer: Buffer, mime: string, filename: string): Promise<ExtractResult> {
  const ext = filename.toLowerCase().split(".").pop();
  let text = "", pages: number | undefined;
  if (mime === "application/pdf" || ext === "pdf") {
    const result = await pdf(buffer, {
      pagerender: async (pageData) => {
        const content = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
        let lastY: number | undefined;
        let rendered = `\n\n[[PAGE:${pageData.pageNumber}]]\n`;
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = "transform" in item && Array.isArray(item.transform) ? item.transform[5] : undefined;
          if (lastY !== undefined && y !== undefined && y !== lastY) rendered += "\n";
          rendered += item.str;
          lastY = y;
        }
        return rendered;
      },
    }); text = result.text; pages = result.numpages;
  } else if (mime.includes("word") || ext === "docx") {
    const result = await mammoth.extractRawText({ buffer }); text = result.value;
  } else if (mime.startsWith("text/") || ext === "txt") {
    text = buffer.toString("utf8");
  } else {
    throw new Error(`Unsupported file format: ${ext ?? mime}`);
  }
  const normalized = text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
  return { text: normalized, pages, needsOcr: normalized.length < 80 && (ext === "pdf" || mime === "application/pdf") };
}
