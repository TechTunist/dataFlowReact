import { createContext, useState, useMemo, useEffect } from "react";
import { createTheme } from "@mui/material/styles";

// Named premium theme presets. Original "night" (blue dark) and "day" are 100% unchanged.
// New ones crafted for world-class polish: refined neutrals, better contrast, calmer surfaces,
// subtle shifts in accent saturation for each aesthetic.

const nightTokens = {
  grey: {
    100: "#e0e0e0",
    200: "#c2c2c2",
    300: "#a3a3a3",
    400: "#858585",
    500: "#666666",
    600: "#525252",
    700: "#3d3d3d",
    800: "#292929",
    900: "#141414",
  },
  primary: {
    100: "#d0d1d5",
    200: "#a1a4ab",
    300: "#727681",
    400: "#1F2A40",
    500: "#111729",
    600: "#101624",
    700: "#0c101b",
    800: "#080b12",
    900: "#040509",
  },
  greenAccent: {
    100: "#dbf5ee",
    200: "#b7ebde",
    300: "#94e2cd",
    400: "#70d8bd",
    500: "#4cceac",
    600: "#3da58a",
    700: 'rgba(70, 70, 70, 0.18)',
    800: "#1e5245",
    900: "#0f2922",
  },
  redAccent: {
    100: "#f8dcdb",
    200: "#f1b9b7",
    300: "#e99592",
    400: "#e2726e",
    500: "#db4f4a",
    600: "#af3f3b",
    700: "#832f2c",
    800: "#58201e",
    900: "#2c100f",
  },
  blueAccent: {
    100: "#e1e2fe",
    200: "#c3c6fd",
    300: "#a4a9fc",
    400: "#868dfb",
    500: "#6870fa",
    600: "#535ac8",
    700: "#3e4396",
    800: "#2a2d64",
    900: "#151632",
  },
};

const blackTokens = {
  grey: {
    100: "#f2f2f2",
    200: "#d9d9d9",
    300: "#b8b8b8",
    400: "#8f8f8f",
    500: "#6e6e6e",
    600: "#4f4f4f",
    700: "#353535",
    800: "#1f1f1f",
    900: "#121212",
  },
  primary: {
    100: "#f5f5f5",
    200: "#d1d1d1",
    300: "#a8a8a8",
    400: "#1c1c1c",
    500: "#050505",
    600: "#0a0a0a",
    700: "#0f0f0f",
    800: "#151515",
    900: "#000000",
  },
  greenAccent: nightTokens.greenAccent,
  redAccent: nightTokens.redAccent,
  blueAccent: {
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
};

const darkGreyTokens = {
  grey: {
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#c4c4c8",
    400: "#9b9ba1",
    500: "#727278",
    600: "#525257",
    700: "#38383d",
    800: "#232327",
    900: "#18181b",
  },
  primary: {
    100: "#f4f4f5",
    200: "#d9d9de",
    300: "#b0b0b7",
    400: "#27272a",
    500: "#18181b",
    600: "#141416",
    700: "#1f1f23",
    800: "#25252a",
    900: "#101013",
  },
  greenAccent: {
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: 'rgba(16, 185, 129, 0.18)',
    800: "#047857",
    900: "#064e3b",
  },
  redAccent: nightTokens.redAccent,
  blueAccent: {
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },
};

const dayTokens = {
  grey: {
    100: "#595959",
    200: "#6e6e6e",
    300: "#838383",
    400: "#989898",
    500: "#adadad",
    600: "#c2c2c2",
    700: "#e6e6e6",
    800: "#ececec",
    900: "#f1f1f1",
  },
  primary: {
    100: "#040509",
    200: "#080b12",
    300: "#0c101b",
    400: "#f2f0f0",
    500: "#dfdfdf ",
    600: "#4f5560",
    700: "#f2f2f2",
    800: "#79808f",
    900: "#8e96a6",
  },
  greenAccent: {
    100: "#0f2922",
    200: "#1e5245",
    300: "#2e7c67",
    400: "#3da58a",
    500: "#4cceac",
    600: "#70d8bd",
    700: 'rgba(70, 70, 70, 0.12)',
    800: "#b7ebde",
    900: "#dbf5ee",
  },
  redAccent: {
    100: "#2c100f",
    200: "#58201e",
    300: "#832f2c",
    400: "#af3f3b",
    500: "#db4f4a",
    600: "#e2726e",
    700: "#e99592",
    800: "#f1b9b7",
    900: "#f8dcdb",
  },
  blueAccent: {
    100: "#151632",
    200: "#2a2d64",
    300: "#3e4396",
    400: "#535ac8",
    500: "#6870fa",
    600: "#868dfb",
    700: "#a4a9fc",
    800: "#c3c6fd",
    900: "#e1e2fe",
  },
};

const dawnTokens = {
  grey: {
    100: "#4f4d48",
    200: "#65625c",
    300: "#7a7771",
    400: "#908d86",
    500: "#a8a59e",
    600: "#c2bdb5",
    700: "#e0d9ce",
    800: "#e8e2d9",
    900: "#f5f2eb",
  },
  primary: {
    100: "#2c2a27",
    200: "#3d3a36",
    300: "#514e48",
    400: "#ede7dc",
    500: "#e5dfcf",
    600: "#6b665f",
    700: "#f2ede3",
    800: "#9a958c",
    900: "#b3ada4",
  },
  greenAccent: {
    100: "#0f2922",
    200: "#1e5245",
    300: "#2e7c67",
    400: "#3da58a",
    500: "#3fb38f",
    600: "#5aa88a",
    700: 'rgba(70, 70, 70, 0.10)',
    800: "#a8d4c2",
    900: "#d8ede3",
  },
  redAccent: {
    100: "#2c100f",
    200: "#58201e",
    300: "#832f2c",
    400: "#af3f3b",
    500: "#c15f5a",
    600: "#d17d78",
    700: "#e2aaa5",
    800: "#f0ccc8",
    900: "#f8e8e6",
  },
  blueAccent: {
    100: "#1e2a44",
    200: "#2f4266",
    300: "#42567f",
    400: "#546a94",
    500: "#5f6db8",
    600: "#7a8ac4",
    700: "#a0acd6",
    800: "#c3cbe5",
    900: "#e0e5f3",
  },
};

// color design tokens export
export const tokens = (modeOrTheme) => {
  // All existing tokens(theme.palette.mode) + tokens('dark'|'light') calls keep working
  // WITHOUT any file changes elsewhere: when a generic mode is passed we substitute the
  // currently active named preset (black/dawn/etc). Specific ids also work.
  let key = modeOrTheme;
  if (typeof key !== "string" || !key) key = activeTheme || "night";
  if (key === "dark" || key === "light") {
    key = activeTheme || (key === "light" ? "day" : "night");
  }
  switch (key) {
    case "black":
      return blackTokens;
    case "darkGrey":
      return darkGreyTokens;
    case "dawn":
      return dawnTokens;
    case "day":
      return dayTokens;
    case "night":
    default:
      return nightTokens;
  }
};

// Public list for menus / pickers
export const availableThemes = [
  { id: "night", label: "Night", group: "dark", description: "Original blue dark" },
  { id: "black", label: "Black", group: "dark", description: "Pure & bold" },
  { id: "darkGrey", label: "Dark Grey", group: "dark", description: "Refined charcoal" },
  { id: "day", label: "Day", group: "light", description: "Classic bright" },
  { id: "dawn", label: "Dawn", group: "light", description: "Soft & warm" },
];

// mui theme settings (receives 'dark' | 'light' for MUI internals + contrast; actual preset is handled in tokens via activeTheme)
export const themeSettings = (mode) => {
  const colors = tokens(mode);
  return {
    palette: {
      mode: mode,
      ...(mode === "dark"
        ? {
            primary: {
              main: colors.primary[500],
            },
            secondary: {
              main: colors.greenAccent[500],
            },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: {
              default: colors.primary[500],
            },
          }
        : {
            primary: {
              main: colors.primary[100],
            },
            secondary: {
              main: colors.greenAccent[500],
            },
            neutral: {
              dark: colors.grey[700],
              main: colors.grey[500],
              light: colors.grey[100],
            },
            background: {
              default: colors.grey[700],
            },
          }),
    },
    typography: {
      fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
      fontSize: 12,
      h1: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 40,
      },
      h2: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 32,
      },
      h3: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 24,
      },
      h4: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 20,
      },
      h5: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 16,
      },
      h6: {
        fontFamily: ["Source Sans Pro", "sans-serif"].join(","),
        fontSize: 14,
      },
    },
  };
};

// Module-level so tokens() can resolve the active named preset without callers changing
// (they still pass palette.mode which remains 'dark'/'light' for logic ternaries)
let activeTheme = "night";

// context for color mode / theme (name kept for minimal import churn in AppControls)
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  setTheme: () => {},
  themeName: "night",
});

export const useMode = () => {
  const [themeName, setThemeName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("cryptological:theme");
      if (saved && ["night", "black", "darkGrey", "day", "dawn"].includes(saved)) return saved;
    }
    return "night";
  });

  // Keep module var + persist
  useEffect(() => {
    activeTheme = themeName;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cryptological:theme", themeName);
    }
  }, [themeName]);

  // muiMode keeps 'dark'/'light' so that every `theme.palette.mode === 'dark'` check across the app
  // (chart colors, text contrast, shadows etc) continues to select the correct branch for all dark variants
  // and all light variants. Specific surface/accent colors come from tokens() which now reads activeTheme.
  const muiMode = themeName === "day" || themeName === "dawn" ? "light" : "dark";

  const colorMode = useMemo(
    () => ({
      // Legacy simple toggle kept (switches between the two "canonical" preserved themes)
      toggleColorMode: () =>
        setThemeName((prev) => (prev === "night" || prev === "black" || prev === "darkGrey" ? "day" : "night")),
      setTheme: (name) => {
        if (["night", "black", "darkGrey", "day", "dawn"].includes(name)) {
          setThemeName(name);
        }
      },
      themeName,
    }),
    [themeName]
  );

  const theme = useMemo(() => {
    activeTheme = themeName;
    return createTheme(themeSettings(muiMode));
  }, [themeName, muiMode]);

  return [theme, colorMode];
};
