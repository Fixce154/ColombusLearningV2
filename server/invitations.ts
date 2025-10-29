import type { Formation, Session } from "@shared/schema";

interface Recipient {
  email: string;
  name?: string | null;
}

interface SessionInviteOptions {
  recipients: Recipient[];
  session: Session;
  formation: Formation;
  reason?: string;
  method?: "REQUEST" | "CANCEL";
  sequence?: number;
}

const DEFAULT_DAY_START = Number(process.env.SESSION_INVITE_DAY_START ?? "9");
const DEFAULT_DAY_END = Number(process.env.SESSION_INVITE_DAY_END ?? "18");

interface SessionSegment {
  index: number;
  start: Date;
  end: Date;
}

const formatDateToICS = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
};

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

const ensureEndAfterStart = (start: Date, end: Date) => {
  if (end <= start) {
    const copy = new Date(start);
    copy.setHours(copy.getHours() + 1);
    return copy;
  }
  return end;
};

const buildSessionSegments = (session: Session): SessionSegment[] => {
  const startDate = new Date(session.startDate);
  const endDate = new Date(session.endDate);

  const segments: SessionSegment[] = [];
  let cursor = startOfDay(startDate);
  const lastDay = startOfDay(endDate);

  while (cursor <= lastDay) {
    const isFirstDay = isSameDay(cursor, startDate);
    const isLastDay = isSameDay(cursor, endDate);

    const segmentStart = new Date(cursor);
    if (isFirstDay) {
      segmentStart.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), 0);
    } else {
      segmentStart.setHours(DEFAULT_DAY_START, 0, 0, 0);
    }

    const segmentEnd = new Date(cursor);
    if (isLastDay) {
      segmentEnd.setHours(endDate.getHours(), endDate.getMinutes(), endDate.getSeconds(), 0);
    } else {
      segmentEnd.setHours(DEFAULT_DAY_END, 0, 0, 0);
    }

    segments.push({
      index: segments.length,
      start: segmentStart,
      end: ensureEndAfterStart(segmentStart, segmentEnd),
    });

    cursor = addDays(cursor, 1);
  }

  return segments;
};

const buildSessionCalendar = (
  session: Session,
  formation: Formation,
  sequence: number,
  method: "REQUEST" | "CANCEL",
  segments: SessionSegment[],
) => {
  const now = new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Colombus Consulting//Learning Management//FR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
  ];

  segments.forEach((segment) => {
    const summarySuffix = segments.length > 1 ? ` - Jour ${segment.index + 1}` : "";
    const summary = escapeIcsText(`${formation.title}${summarySuffix}`);
    const description = escapeIcsText(
      `Session de formation \"${formation.title}\" organisée via Colombus Learning.`,
    );
    const location = session.location ? escapeIcsText(session.location) : undefined;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${session.id}-${segment.index}`,
      `DTSTAMP:${formatDateToICS(now)}`,
      `DTSTART:${formatDateToICS(segment.start)}`,
      `DTEND:${formatDateToICS(segment.end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
    );

    if (location) {
      lines.push(`LOCATION:${location}`);
    }

    lines.push(
      `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
      `SEQUENCE:${sequence}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
};

const formatDateRange = (segment: SessionSegment) => {
  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${dateFormatter.format(segment.start)} • ${timeFormatter.format(segment.start)} → ${timeFormatter.format(segment.end)}`;
};

export const sendSessionInvitationEmail = async (options: SessionInviteOptions) => {
  if (!options.recipients || options.recipients.length === 0) {
    return;
  }

  const segments = buildSessionSegments(options.session);
  const sequence = options.sequence ?? Math.floor(Date.now() / 1000);
  const method = options.method ?? "REQUEST";

  const calendarContent = buildSessionCalendar(
    options.session,
    options.formation,
    sequence,
    method,
    segments,
  );

  const subject = `[Invitation] ${options.formation.title}`;
  const greeting =
    options.recipients.length === 1 && options.recipients[0].name
      ? `Bonjour ${options.recipients[0].name!.split(" ")[0]},`
      : "Bonjour,";

  const segmentsDescription = segments
    .map((segment) => `• ${formatDateRange(segment)}`)
    .join("\n");

  const textLines = [
    greeting,
    "",
    `Vous êtes invité(e) à la session \"${options.formation.title}\".`,
    `Dates :\n${segmentsDescription}`,
  ];

  if (options.session.location) {
    textLines.push(`Lieu : ${options.session.location}`);
  }

  if (options.reason) {
    textLines.push("", options.reason);
  }

  textLines.push(
    "",
    "L'invitation est jointe à cet email pour ajouter l'événement à votre agenda.",
    "",
    "À très vite sur Colombus Learning !",
  );

  const htmlLines = [
    `<p>${greeting}</p>`,
    `<p>Vous êtes invité(e) à la session <strong>${options.formation.title}</strong>.</p>`,
    `<p><strong>Dates :</strong><br/>${segments
      .map((segment) => `<span style="display:block">${formatDateRange(segment)}</span>`)
      .join("")}</p>`,
  ];

  if (options.session.location) {
    htmlLines.push(`<p><strong>Lieu :</strong> ${options.session.location}</p>`);
  }

  if (options.reason) {
    htmlLines.push(`<p>${options.reason}</p>`);
  }

  htmlLines.push(
    "<p>L'invitation en pièce jointe vous permet d'ajouter l'événement à votre agenda.</p>",
    "<p>À très vite sur Colombus Learning !</p>",
  );

  const payload = {
    to: options.recipients.map((recipient) =>
      recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email
    ),
    subject,
    text: textLines.join("\n"),
    html: htmlLines.join(""),
    calendar: calendarContent,
    method,
  };

  console.info("[invitation]", JSON.stringify(payload));
};

export type { SessionSegment };
export { buildSessionSegments };
