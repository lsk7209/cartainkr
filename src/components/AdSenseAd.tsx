import { useEffect, useRef } from "react";

interface AdSenseAdProps {
  /** AdSense ad unit slot ID (e.g. "1234567890"). Leave undefined to reserve space only. */
  slot?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical";
  className?: string;
  style?: React.CSSProperties;
}

const AdSenseAd = ({ slot, format = "auto", className = "", style }: AdSenseAdProps) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!slot || initialized.current) return;
    initialized.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense blocked or not loaded
    }
  }, [slot]);

  // No slot ID — auto-ads handles placement; render nothing to avoid blank space
  if (!slot) return null;

  const minHeight = format === "horizontal" ? 90 : 250;

  return (
    <div
      className={`overflow-hidden text-center ${className}`}
      style={{ minHeight, ...style }}
      aria-hidden="true"
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-3050601904412736"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseAd;
