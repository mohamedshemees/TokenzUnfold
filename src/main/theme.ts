import { ThemeColors } from "./types";

export const THEMES: { [key: string]: ThemeColors } = {
    'dark': {
        containerFill: { r: 0.13, g: 0.11, b: 0.1 }, // Brownish Dark
        containerStroke: { r: 0.3, g: 0.3, b: 0.3 },
        headerFill: { r: 0.2, g: 0.2, b: 0.2 },
        headerText: { r: 1, g: 1, b: 1 },
        bodyFill: { r: 0.13, g: 0.11, b: 0.1 },
        bodyStroke: { r: 0.3, g: 0.3, b: 0.3 },
        textPrimary: { r: 0.9, g: 0.9, b: 0.9 },
        textSecondary: { r: 0.6, g: 0.6, b: 0.6 },
        prefix: { r: 1, g: 0.72, b: 0.3 }, // Warm Gold
        connector: { r: 0.2, g: 0.6, b: 1 } // Blue
    },
    'light': {
        containerFill: { r: 0.98, g: 0.98, b: 0.98 }, // Near White
        containerStroke: { r: 0.85, g: 0.85, b: 0.85 },
        headerFill: { r: 0.9, g: 0.9, b: 0.9 }, // Light Grey
        headerText: { r: 0.2, g: 0.2, b: 0.2 }, // Dark Grey
        bodyFill: { r: 1, g: 1, b: 1 },
        bodyStroke: { r: 0.9, g: 0.9, b: 0.9 },
        textPrimary: { r: 0.2, g: 0.2, b: 0.2 }, // Dark Grey
        textSecondary: { r: 0.5, g: 0.5, b: 0.5 },
        prefix: { r: 0.8, g: 0.4, b: 0 }, // Burnt Orange
        connector: { r: 0.2, g: 0.2, b: 0.2 } // Dark Grey
    },
    'blueprint': {
        containerFill: { r: 0.05, g: 0.1, b: 0.2 }, // Deep Blue
        containerStroke: { r: 0.2, g: 0.4, b: 0.8 }, // Bright Blue
        headerFill: { r: 0.1, g: 0.2, b: 0.4 },
        headerText: { r: 0.4, g: 0.8, b: 1 }, // Cyan
        bodyFill: { r: 0.05, g: 0.1, b: 0.2 },
        bodyStroke: { r: 0.2, g: 0.4, b: 0.8 },
        textPrimary: { r: 0.8, g: 0.9, b: 1 }, // Light Cyan
        textSecondary: { r: 0.4, g: 0.6, b: 0.8 },
        prefix: { r: 0, g: 1, b: 1 }, // Cyan
        connector: { r: 0, g: 1, b: 1 } // Cyan
    }
};
