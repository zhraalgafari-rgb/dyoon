/**
 * Design Tokens - نظام التصميم المركزي
 * يضمن تناسقاً كاملاً عبر جميع مكونات التطبيق
 */

export const tokens = {
    // Spacing System
    spacing: {
        xs: 2,
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        '2xl': 24,
        '3xl': 32,
        '4xl': 48,
    } as const,

    // Border Radius
    radius: {
        sm: 6,
        md: 10,
        lg: 14,
        xl: 20,
        '2xl': 28,
        full: 9999,
    } as const,

    // Animation Durations
    animation: {
        fast: '150ms',
        normal: '250ms',
        slow: '400ms',
        slower: '600ms',
    } as const,

    // Easing Functions
    easing: {
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 2, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    } as const,

    // Shadows
    shadows: {
        card: '0 1px 3px 0 oklch(0.55 0.13 240 / 0.08), 0 1px 2px -1px oklch(0.55 0.13 240 / 0.08)',
        elevated: '0 10px 30px -12px oklch(0.55 0.13 240 / 0.18)',
        glow: '0 8px 24px -8px var(--primary-glow)',
        inner: 'inset 0 2px 4px 0 oklch(0.55 0.13 240 / 0.05)',
        none: 'none',
    } as const,

    // Typography Scale
    typography: {
        xs: '0.75rem',    // 12px
        sm: '0.8125rem',  // 13px
        base: '0.875rem', // 14px
        md: '1rem',       // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
    } as const,

    // Font Weights
    fontWeight: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
        black: 900,
    } as const,

    // Line Heights
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    } as const,

    // Z-Index Scale
    zIndex: {
        base: 0,
        dropdown: 1000,
        sticky: 1100,
        fixed: 1200,
        modalBackdrop: 1300,
        modal: 1400,
        popover: 1500,
        tooltip: 1600,
        toast: 1700,
    } as const,

    // Breakpoints (for reference)
    breakpoints: {
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
    } as const,
} as const;

export type Tokens = typeof tokens;
export type Spacing = keyof typeof tokens.spacing;
export type Radius = keyof typeof tokens.radius;
export type Animation = keyof typeof tokens.animation;
export type Shadow = keyof typeof tokens.shadows;

// Helper function to get spacing value
export const getSpacing = (key: Spacing): number => tokens.spacing[key];

// Helper function to get radius value
export const getRadius = (key: Radius): number => tokens.radius[key];

// Helper function to get animation duration
export const getAnimation = (key: Animation): string => tokens.animation[key];

// Helper function to get shadow value
export const getShadow = (key: Shadow): string => tokens.shadows[key];