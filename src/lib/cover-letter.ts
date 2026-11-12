import { getFieldById } from "./fields";
import type { InternshipOffer, StudentProfile } from "./types";

export function draftCoverLetter(
  offer: InternshipOffer,
  profile: StudentProfile | null,
): string {
  const name = profile?.name?.trim() || "[Dein Name]";
  const strengths =
    profile?.strengths?.slice(0, 3).join(", ") ||
    "Motivation, Zuverlässigkeit und Lernbereitschaft";
  const subjects =
    profile?.schoolSubjects?.slice(0, 3).join(", ") ||
    "meinen Schulfächern";
  const skills =
    profile?.skills?.slice(0, 3).join(", ") || "meinen Kenntnissen";
  const fields =
    offer.fieldHints
      .map((id) => getFieldById(id)?.label)
      .filter(Boolean)
      .slice(0, 2)
      .join(" und ") || "diesem Bereich";

  const intro = offer.isInitiative
    ? `sehr geehrte Damen und Herren der Firma ${offer.company},`
    : `sehr geehrte Damen und Herren,`;

  const aboutOffer = offer.isInitiative
    ? `ich interessiere mich sehr für ein Schülerpraktikum in Ihrem Betrieb und bewerbe mich initiativ um einen Praktikumsplatz.`
    : `mit großem Interesse habe ich Ihre Ausschreibung „${offer.title}“ gelesen und bewerbe mich um diesen Praktikumsplatz.`;

  return `Betreff: Bewerbung um ein Schülerpraktikum${offer.isInitiative ? " (Initiativ)" : ""} – ${offer.company}

${intro}

${aboutOffer}

Ich gehe aktuell zur Schule (Klasse 8–10) und interessiere mich besonders für ${fields}. In der Schule liegen mir unter anderem ${subjects}. Zu meinen Stärken zählen ${strengths}. Außerdem bringe ich Kenntnisse in ${skills} mit.

Über die Möglichkeit, bei ${offer.company} Einblicke in den Berufsalltag zu bekommen${
    offer.locationLabel ? ` am Standort ${offer.locationLabel}` : ""
  }, würde ich mich sehr freuen. Gerne unterstütze ich tatkräftig im Team und lerne neue Aufgaben schnell.

Für ein Vorstellungsgespräch stehe ich gerne zur Verfügung.

Mit freundlichen Grüßen
${name}

—
Hinweis: Dies ist ein automatisch erstellter Entwurf. Bitte prüfe und personalisiere ihn vor dem Absenden.`;
}
