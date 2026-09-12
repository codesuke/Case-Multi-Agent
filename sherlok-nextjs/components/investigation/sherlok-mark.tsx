import Image from "next/image";

type SherlokMarkProps = {
  variant?: "light" | "brown";
  size?: number;
};

export function SherlokMark({
  variant = "light",
  size = 36,
}: SherlokMarkProps) {
  const source =
    variant === "light"
      ? "/assets/sherlok-logo-minimal.png"
      : "/assets/sherlok-logo-minimal-brown.png";

  return (
    <Image
      src={source}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      aria-hidden="true"
    />
  );
}
