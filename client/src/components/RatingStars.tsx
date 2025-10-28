import { Star } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap: Record<NonNullable<RatingStarsProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function RatingStars({
  value,
  onChange,
  readOnly = true,
  size = "md",
  className,
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const starSize = sizeMap[size];

  if (readOnly || !onChange) {
    const clampedValue = Math.max(0, Math.min(5, value));
    const fillPercentage = (clampedValue / 5) * 100;

    return (
      <div className={clsx("relative inline-flex", className)} aria-hidden>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={`empty-${index}`}
              className={clsx(starSize, "text-muted-foreground/25")}
              strokeWidth={1.3}
            />
          ))}
        </div>
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${fillPercentage}%` }}
        >
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={`filled-${index}`}
                className={clsx(starSize, "text-amber-400 fill-amber-400 drop-shadow-sm")}
                strokeWidth={1.3}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isActive = displayValue >= starValue;

        return (
          <button
            key={starValue}
            type="button"
            className="group rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => setHoverValue(starValue)}
            onMouseLeave={() => setHoverValue(null)}
          >
            <Star
              className={clsx(
                starSize,
                "transition-colors",
                isActive ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
              )}
              strokeWidth={isActive ? 1.2 : 1.4}
            />
          </button>
        );
      })}
    </div>
  );
}

export default RatingStars;
