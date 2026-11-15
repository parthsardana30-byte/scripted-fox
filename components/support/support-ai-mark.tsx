import Image from "next/image";

export function SupportAiMark({ className }: { className?: string }) {
  return (
    <Image
      className={className}
      src="/scripted-fox-support-logo.png"
      alt=""
      width={96}
      height={96}
      priority
      aria-hidden="true"
    />
  );
}
