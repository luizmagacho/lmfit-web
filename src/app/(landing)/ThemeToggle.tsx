"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "./icons";

/** Ilha client isolada: só o botão de tema precisa de estado/localStorage, não a página inteira. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("kivo-theme");
    const resolved = savedTheme === "dark" ? "dark" : "light";
    setTheme(resolved);
    setMounted(true);
    // O shell (Server Component) sempre renderiza com a classe "kivo-light" (tema padrão) no
    // primeiro paint, pra bater com o HTML do servidor sem flash; aqui só corrige pra escuro se
    // for o tema salvo — sem precisar levantar esse estado pra um wrapper client de página inteira.
    if (resolved === "dark") {
      document.querySelector(".kivo-landing")?.classList.remove("kivo-light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("kivo-theme", nextTheme);
    document.querySelector(".kivo-landing")?.classList.toggle("kivo-light", nextTheme === "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="kivo-theme-toggle"
      aria-label="Alternar tema"
      title={mounted && theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
    >
      {mounted && theme === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
