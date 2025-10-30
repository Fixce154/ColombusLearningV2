import { cn } from "@/lib/utils";
import type { DashboardInformationSettings } from "@shared/schema";
import type { ReactNode } from "react";

interface DashboardInformationCardProps {
  settings: DashboardInformationSettings;
  showWhenDisabled?: boolean;
  className?: string;
}

const tonePalettes: Record<
  DashboardInformationSettings["tone"],
  {
    container: string;
    label: string;
    title: string;
    body: string;
    imageFrame: string;
  }
> = {
  neutral: {
    container:
      "border border-border/60 bg-white/90 text-[#00313F] shadow-sm backdrop-blur",
    label: "text-[#00313F]/70",
    title: "text-[#00313F]",
    body: "text-[#00313F]/75",
    imageFrame: "bg-white/80 border border-white/60 shadow-sm",
  },
  accent: {
    container: "border border-primary/20 bg-primary/10 text-[#00313F] shadow-sm",
    label: "text-primary/70",
    title: "text-[#00313F]",
    body: "text-[#00313F]/80",
    imageFrame: "bg-white border border-primary/20 shadow-sm",
  },
  highlight: {
    container: "border border-[#00313F] bg-[#00313F] text-white shadow-xl",
    label: "text-white/70",
    title: "text-white",
    body: "text-white/80",
    imageFrame: "bg-white/10 border border-white/15",
  },
};

function renderBody(body: string, bodyClass: string): ReactNode {
  if (!body) {
    return null;
  }

  return body
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph, index) => {
      const lines = paragraph.split(/\n/);
      return (
        <p key={index} className={cn("text-sm leading-relaxed", bodyClass)}>
          {lines.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line}
              {lineIndex < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      );
    });
}

export function DashboardInformationCard({
  settings,
  showWhenDisabled = false,
  className,
}: DashboardInformationCardProps) {
  if (!settings.enabled && !showWhenDisabled) {
    return null;
  }

  const tone = settings.tone ?? "neutral";
  const palette = tonePalettes[tone];
  const hasImage = Boolean(settings.imageUrl && settings.imageUrl.length > 0);
  const layout = hasImage ? settings.layout : "text-only";
  const imageDimensions =
    layout === "image-top" ? "h-40 w-full" : "h-32 w-full sm:h-36 sm:w-40";

  const imageNode = hasImage ? (
    <div className={cn("overflow-hidden rounded-xl", palette.imageFrame, imageDimensions)}>
      <img
        src={settings.imageUrl}
        alt={settings.title || "Information"}
        className="h-full w-full object-cover"
      />
    </div>
  ) : null;

  const textContent = (
    <div className="space-y-3">
      {settings.title ? (
        <h3 className={cn("text-lg font-semibold tracking-tight", palette.title)}>
          {settings.title}
        </h3>
      ) : null}
      {renderBody(settings.body, palette.body)}
    </div>
  );

  let content: ReactNode;
  switch (layout) {
    case "image-left":
      content = (
        <div className="flex flex-col gap-4 sm:flex-row">
          {imageNode ? <div className="sm:w-40">{imageNode}</div> : null}
          <div className="flex-1">{textContent}</div>
        </div>
      );
      break;
    case "image-right":
      content = (
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          <div className="flex-1">{textContent}</div>
          {imageNode ? <div className="sm:w-40">{imageNode}</div> : null}
        </div>
      );
      break;
    case "image-top":
      content = (
        <div className="space-y-4">
          {imageNode}
          {textContent}
        </div>
      );
      break;
    default:
      content = textContent;
      break;
  }

  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-shadow duration-300",
        palette.container,
        !settings.enabled && showWhenDisabled ? "opacity-60" : "",
        className
      )}
    >
      <div className="mb-3">
        <span className={cn("text-[0.7rem] font-semibold uppercase tracking-wide", palette.label)}>
          Information
        </span>
      </div>
      {content}
    </div>
  );
}

export default DashboardInformationCard;
