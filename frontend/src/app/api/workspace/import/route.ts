import { unzipSync } from "fflate";
import { parsePropertyText } from "@/lib/property-profile";
import { boundedBody, requireSameOrigin, verifiedAccount, WorkspaceError, workspaceFailure } from "@/lib/workspace-access";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); await verifiedAccount();
    const bytes = await boundedBody(request, 2 * 1024 * 1024 + 65536);
    const form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new WorkspaceError("empty_file", 400);
    if (file.size > 2 * 1024 * 1024) throw new WorkspaceError("file_too_large", 413);
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["txt", "md", "csv", "pdf", "docx"].includes(ext ?? "")) throw new WorkspaceError("unsupported_file", 400);
    const content = new Uint8Array(await file.arrayBuffer()); let text: string;
    try {
      if (ext === "pdf") {
        if (!new TextDecoder().decode(content.slice(0, 5)).startsWith("%PDF-")) throw new Error("invalid_pdf");
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(content);
        try {
          if (pdf.numPages > 40) throw new WorkspaceError("too_many_pages", 400);
          text = (await extractText(pdf, { mergePages: true })).text;
        } finally { await pdf.loadingTask.destroy(); }
      } else if (ext === "docx") {
        let size = 0; let count = 0;
        const files = unzipSync(content, { filter: file => {
          size += file.originalSize; count++;
          if (size > 6 * 1024 * 1024 || count > 1000) throw new Error("oversized_docx");
          return file.name === "word/document.xml";
        } });
        if (!files["word/document.xml"]) throw new Error("invalid_docx");
        const xml = new TextDecoder("utf-8", { fatal: true }).decode(files["word/document.xml"]);
        if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("invalid_docx");
        text = xml.replace(/<\/w:p>/g, "\n").replace(/<[^>]*>/g, "").replace(/&(?:amp|lt|gt|quot|apos);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" })[entity]!);
      } else text = new TextDecoder("utf-8", { fatal: true }).decode(content);
      if (!text.trim()) throw new WorkspaceError("no_readable_text", 400);
      const result = parsePropertyText(text, ext === "csv");
      return Response.json({ ...result, filename: file.name.slice(0, 160) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      throw new WorkspaceError("unreadable_file", 400);
    }
  } catch (error) { return workspaceFailure(error); }
}
