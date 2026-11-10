import type { ToolSlug } from "../lib/config";

const P: Record<ToolSlug | "search" | "check" | "ext" | "wallet" | "chev", string> = {
  units: "M4 8h12M12 4l4 4-4 4M20 16H8M12 12l-4 4 4 4",
  hash: "M9 4 7 20M17 4l-2 16M4 9h16M3.5 15h16",
  abi: "M8 7 3 12l5 5M16 7l5 5-5 5M13.5 5l-3 14",
  address: "M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10zM12 8v6M9 11h6",
  time: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4.5l3 2",
  gas: "M5 20V5h8v15M5 11h8M13 9h3l2 2v6.5M16 17.5V14M3 20h12",
  network: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4 12h16M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16",
  sign: "M4 20h5l11-11-5-5L4 15zM12.5 6.5l5 5",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  check: "M5 12.5l4.5 4.5L19 7.5",
  ext: "M9 5H5v14h14v-4M13 5h6v6M19 5l-8 8",
  wallet: "M4 7h14v12H4zM4 7l11-3v3M14 13h4",
  chev: "M7 10l5 5 5-5",
};

export function Icon({ name, size = 18 }: { name: keyof typeof P; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true" focusable="false">
      <path d={P[name]} />
    </svg>
  );
}

/** BOT Toolbox mark: a hexagon with a prompt chevron and an underscore. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 3.5 34.3 11.75v16.5L20 36.5 5.7 28.25v-16.5Z" fill="#141414" />
      <path d="M14 14.5l6 5.5-6 5.5" fill="none" stroke="#FF4F1F" strokeWidth="3.2" strokeLinecap="square" />
      <path d="M22 26h5" stroke="#FAFAF7" strokeWidth="3.2" />
    </svg>
  );
}

/** The BOT Chain logo is not bundled; the footer links to botchain.ai with a text lockup until you supply the official asset. */
