import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { parseCvText } from "@/lib/cv-parser";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Bitte eine Datei (PDF oder DOCX) hochladen." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Datei ist zu groß (max. 8 MB)." },
        { status: 400 },
      );
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text =
          typeof result === "string"
            ? result
            : ((result as { text?: string }).text ?? "");
      } finally {
        await parser.destroy();
      }
    } else if (
      name.endsWith(".docx") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else {
      return NextResponse.json(
        { error: "Nur PDF oder DOCX werden unterstützt." },
        { status: 400 },
      );
    }

    text = text.replace(/\r/g, "").trim();
    if (text.length < 20) {
      return NextResponse.json(
        {
          error:
            "Aus der Datei konnte kaum Text gelesen werden. Bitte prüfe die Datei oder fülle das Profil manuell aus.",
        },
        { status: 422 },
      );
    }

    const profile = parseCvText(text);

    // Wichtig: Datei wird nicht gespeichert – nur temporär im Speicher verarbeitet.
    return NextResponse.json({
      profile,
      privacyNote:
        "Dein Lebenslauf wurde nur kurz im Arbeitsspeicher gelesen und nicht auf dem Server gespeichert.",
    });
  } catch (error) {
    console.error("parse-cv error", error);
    return NextResponse.json(
      {
        error:
          "Lebenslauf konnte nicht gelesen werden. Bitte versuche es erneut oder trage das Profil manuell ein.",
      },
      { status: 500 },
    );
  }
}
