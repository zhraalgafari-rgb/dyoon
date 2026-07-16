/**
 * Design Tokens - نظام التصميم المركزي
 * يضمن تناسقاً كاملاً عبر جميع مكونات التطبيق
 * 
 * Standard: 8px Grid System
 * - All spacing values align to 8px increments
 * - Icon sizes follow semantic 4px increments
 * - Typography meets WCAG AA accessibility (12px minimum)
 */

export const tokens = {
    // Spacing System (8px Grid)
    spacing: {
        xs: 4,      // 4px - minimal gaps
        sm: 8,      // 8px - compact spacing
        md: 16,     // 16px - standard spacing
        lg: 24,     // 24px - comfortable spacing
        xl: 32,     // 32px - section spacing
        '2xl': 48,  // 48px - major sections
        '3xl': 64,  // 64px - page sections
        '4xl': 96,  // 96px - hero spacing
    } as const,

    // Border Radius (aligned to 4px grid)
    radius: {
        sm: 8,      // was 6
        md: 12,     // was 10
        lg: 16,     // was 14
        xl: 20,     // was 20 (kept)
        '2xl': 28,  // was 28 (kept)
        full: 9999,
    } as const,

    // Icon Size System (semantic sizing)
    iconSize: {
        xs: 12,     // tiny badges, indicators
        sm: 14,     // compact lists, metadata
        md: 16,     // standard (default)
        lg: 20,     // prominent actions
        xl: 24,     // CTAs, primary buttons
        '2xl': 32,  // hero elements
    } as const,

    // Component Size Scale
    componentSize: {
        xs: 32,     // size-8 - inline avatars, small icons
        sm: 40,     // size-10 - standard cards
        md: 48,     // size-12 - prominent cards
        lg: 56,     // size-14 - hero elements
        xl: 64,     // size-16 - empty states
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

    // Typography Scale (WCAG AA Compliant)
    typography: {
        xs: '0.75rem',    // 12px - minimum for non-critical labels
        sm: '0.875rem',   // 14px - body secondary
        base: '1rem',     // 16px - BODY MINIMUM (WCAG AA)
        md: '1.125rem',   // 18px - subheadings
        lg: '1.25rem',    // 20px - card titles
        xl: '1.5rem',     // 24px - page headings
        '2xl': '1.875rem', // 30px - hero titles
        '3xl': '2.25rem', // 36px - display text
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
export type IconSize = keyof typeof tokens.iconSize;
export type ComponentSize = keyof typeof tokens.componentSize;

// Helper function to get spacing value
export const getSpacing = (key: Spacing): number => tokens.spacing[key];

// Helper function to get radius value
export const getRadius = (key: Radius): number => tokens.radius[key];

// Helper function to get animation duration
export const getAnimation = (key: Animation): string => tokens.animation[key];

// Helper function to get shadow value
export const getShadow = (key: Shadow): string => tokens.shadows[key];

// Helper function to get icon size
export const getIconSize = (key: IconSize): number => tokens.iconSize[key];

// Helper function to get component size
export const getComponentSize = (key: ComponentSize): number => tokens.componentSize[key];