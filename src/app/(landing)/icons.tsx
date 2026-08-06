// Ícones SVG puros (sem hooks) — importáveis tanto pelo shell servidor da landing quanto pelas
// ilhas client, sem forçar "use client" em quem só precisa deles pra render estático.

export const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

export const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

export const ClothesIcon1 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M20.38 3.46L16 7.83V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2.83L3.62 3.46a1 1 0 0 0-1.41 0 1 1 0 0 0 0 1.41L7 9.66V20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V9.66l4.79-4.79a1 1 0 0 0 0-1.41c-.39-.39-1.02-.39-1.41 0z" />
  </svg>
);

export const ClothesIcon2 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M4 3h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M12 3v6" />
  </svg>
);

export const ClothesIcon3 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22d3ee"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ opacity: 0.8 }}
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);
