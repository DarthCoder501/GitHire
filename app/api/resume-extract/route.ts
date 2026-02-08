// ---------------------------------------------------------------------------
// POST /api/resume-extract — extract text from resume file (PDF or DOCX)
// Body: multipart/form-data with field "file"
// Returns { text: string }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing or invalid file. Send a single file as 'file'." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5 MB." },
        { status: 400 },
      );
    }

    const name = (file as File).name?.toLowerCase() ?? "";
    let text: string;

    if (name.endsWith(".pdf")) {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text ?? "";
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value ?? "";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF (.pdf) or Word (.docx)." },
        { status: 400 },
      );
    }

    const trimmed = (text || "").trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "No text could be extracted from the file." },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: trimmed });
  } catch (err) {
    console.error("[resume-extract]", err);
    const msg = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
