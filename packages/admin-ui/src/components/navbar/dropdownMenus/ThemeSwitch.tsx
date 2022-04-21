import { BsSunFill, BsMoonFill } from "react-icons/bs";
import React from "react";
import "./themeSwitch.scss";
import { ThemeContext } from "App";

export default function ThemeSwitch({
  toggleTheme
}: {
  toggleTheme: () => void;
}) {
  // get context provider
  const { theme } = React.useContext(ThemeContext);
  return (
    <button onClick={toggleTheme}>
      {theme === "light" ? <BsMoonFill /> : <BsSunFill />}
    </button>
  );
}
