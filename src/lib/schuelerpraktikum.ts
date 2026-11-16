/**
 * Erkennt aus Titel/Beschreibung, ob es um ein Schülerpraktikum geht
 * (Klassen 8–10 / Schulpraktikum), nicht Werkstudent oder Hochschule.
 */
export function isSchuelerpraktikumOffer(
  title: string,
  description = "",
  professions: string[] = [],
): boolean {
  const blob = [title, description, ...professions].join(" \n ");

  // Explizite Treffer
  if (
    /sch[üu]ler[\s\-]?praktikum|schulpraktikum|betriebspraktikum|ferienpraktikum|schnupperpraktikum|pflichtpraktikum/i.test(
      blob,
    )
  ) {
    return true;
  }

  if (
    /f[üu]r\s+sch[üu]ler|sch[üu]ler\/innen|sch[üu]lerinnen|klasse\s*(8|9|10|11)|jahrgangsstufe|sekundarstufe|realschule|gymnasium|gesamtschule|hauptschule|mittelschule/i.test(
      blob,
    )
  ) {
    return true;
  }

  // Klar Hochschule / Werkstudent → kein Schülerpraktikum
  if (
    /werkstudent|working\s*student|duales?\s+studium|hochschule|universit[äa]t|bachelor|master|fachhochschule/i.test(
      blob,
    ) &&
    !/sch[üu]ler/i.test(blob)
  ) {
    return false;
  }

  return false;
}
