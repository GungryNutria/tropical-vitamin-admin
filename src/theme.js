import { createTheme } from '@mui/material/styles';

// Tema "Mesa negra" (spec 004, handoff R1 secciones 2 y 4). Los hex viven solo aquí:
// el resto del código usa las claves de la paleta (p. ej. 'primary.main', 'bg.raised').
const color = {
  bgBase: '#0A0A0A',
  bgSurface: '#141414',
  bgRaised: '#1C1C1C',
  bgSelected: '#2A2519',
  borderSubtle: '#262626',
  borderControl: '#6B6B6B',
  textPrimary: '#FAFAFA',
  textSecondary: '#A0A0A0',
  textTertiary: '#8A8A8A',
  accent: '#F4B942',
  accentHover: '#FFD166',
  onAccent: '#0A0A0A',
  success: '#4ADE80',
  successBg: '#1B2C21',
  danger: '#F87171',
  dangerSolid: '#DC2626',
  dangerBg: '#2F1F1F',
  warning: '#FB923C',
  warningBg: '#302319',
  neutralChip: '#262626',
  neutralChipOnSelected: '#333333',
};

export const FONT_FAMILY = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';

// Cifras tabulares para precio, duración y conteos.
export const numeric = { fontVariantNumeric: 'tabular-nums' };

const focusRing = { outline: `2px solid ${color.accent}`, outlineOffset: '2px' };

// Controles de 44 px por debajo de 900 px (AC-UX-12) y de 40 desde ahí.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: color.accent, light: color.accentHover, contrastText: color.onAccent },
    secondary: { main: color.textSecondary },
    success: { main: color.success, contrastText: color.onAccent },
    error: { main: color.danger, dark: color.dangerSolid, contrastText: '#FFFFFF' },
    warning: { main: color.warning, contrastText: color.onAccent },
    background: { default: color.bgBase, paper: color.bgSurface },
    text: { primary: color.textPrimary, secondary: color.textSecondary, disabled: color.textTertiary },
    divider: color.borderSubtle,
    // Claves propias (se usan como bgcolor: 'bg.raised', borderColor: 'border.control', etc.).
    bg: { base: color.bgBase, surface: color.bgSurface, raised: color.bgRaised, selected: color.bgSelected },
    border: { subtle: color.borderSubtle, control: color.borderControl },
    tertiary: color.textTertiary,
    statusBg: { success: color.successBg, danger: color.dangerBg, warning: color.warningBg },
    neutral: { chip: color.neutralChip, chipOnSelected: color.neutralChipOnSelected },
    dangerSolid: color.dangerSolid,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontSize: 24, lineHeight: '32px', fontWeight: 600 }, // type/page-title
    h2: { fontSize: 16, lineHeight: '24px', fontWeight: 600 }, // type/section
    h3: { fontSize: 18, lineHeight: '28px', fontWeight: 600 }, // type/dialog-title
    body1: { fontSize: 15, lineHeight: '22px', fontWeight: 400 }, // type/body
    body2: { fontSize: 14, lineHeight: '20px', fontWeight: 400 }, // type/table
    subtitle2: { fontSize: 13, lineHeight: '18px', fontWeight: 500 }, // type/label
    caption: { fontSize: 13, lineHeight: '18px', fontWeight: 400 }, // type/help
    button: { fontSize: 14, lineHeight: '20px', fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: color.bgBase },
        '*:focus-visible': focusRing,
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
      styleOverrides: { root: { '&.Mui-focusVisible': focusRing } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme: t }) => ({
          minHeight: 40,
          borderRadius: 6,
          padding: '8px 16px',
          [t.breakpoints.down('md')]: { minHeight: 44 },
          '&.Mui-disabled': { backgroundColor: color.neutralChip, color: color.textTertiary, borderColor: color.neutralChip },
        }),
        containedPrimary: { '&:hover': { backgroundColor: color.accentHover } },
        containedError: { backgroundColor: color.dangerSolid, color: '#FFFFFF', '&:hover': { backgroundColor: '#B91C1C' } },
        outlined: {
          color: color.textPrimary,
          borderColor: color.borderControl,
          '&:hover': { backgroundColor: color.bgRaised, borderColor: color.borderControl },
        },
        text: { color: color.textPrimary, '&:hover': { backgroundColor: color.bgRaised } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          width: 40,
          height: 40,
          [t.breakpoints.down('md')]: { width: 44, height: 44 },
          '&:hover': { backgroundColor: color.bgRaised },
        }),
      },
    },
    MuiTextField: { defaultProps: { variant: 'outlined' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          minHeight: 40,
          borderRadius: 6,
          [t.breakpoints.down('md')]: { minHeight: 44 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: color.borderControl },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: color.borderControl },
          // Foco = anillo amarillo; el borde no cambia.
          '&.Mui-focused': focusRing,
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color.borderControl, borderWidth: 1 },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: color.danger, borderWidth: 1.5 },
          '&.Mui-disabled': { backgroundColor: color.bgBase },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: color.borderSubtle },
        }),
        // 44 px por debajo de 900 px: el propio input mide lo que el control.
        input: ({ theme: t }) => ({ padding: '9px 12px', height: 22, boxSizing: 'content-box', [t.breakpoints.down('md')]: { padding: '11px 12px' } }),
        multiline: { padding: 0 },
        inputMultiline: ({ theme: t }) => ({ padding: '9px 12px', [t.breakpoints.down('md')]: { padding: '11px 12px' } }),
      },
    },
    // El select usa min-height 1.4375em (21.56 px): sin esto el control mide 39.56 px y no llega a 40.
    MuiSelect: { styleOverrides: { select: { minHeight: 22 } } },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: 13, lineHeight: '18px', marginLeft: 0, color: color.textTertiary, '&.Mui-error': { color: color.danger } } },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 40, height: 24, padding: 0, overflow: 'visible' },
        switchBase: {
          padding: 2,
          color: color.textTertiary,
          '&.Mui-checked': { transform: 'translateX(16px)', color: color.onAccent },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: color.success, borderColor: color.success, opacity: 1 },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: 0.4 },
        },
        thumb: { width: 20, height: 20, boxShadow: 'none' },
        track: { borderRadius: 12, backgroundColor: color.bgSurface, border: `1px solid ${color.borderControl}`, opacity: 1, boxSizing: 'border-box' },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 2, backgroundColor: color.textPrimary },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: 'none',
          fontWeight: 400,
          color: color.textSecondary,
          '&.Mui-selected': { color: color.textPrimary, fontWeight: 600 },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { height: 24, borderRadius: 999, fontSize: 13, fontWeight: 600 } },
    },
    MuiBackdrop: {
      styleOverrides: { root: { backgroundColor: 'rgba(0, 0, 0, 0.6)' } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: color.bgRaised, border: `1px solid ${color.borderSubtle}`, borderRadius: 8 },
      },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: color.bgRaised } },
    },
    MuiSkeleton: {
      defaultProps: { animation: false },
      styleOverrides: { root: { backgroundColor: color.bgRaised } },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottomColor: color.borderSubtle } },
    },
  },
});

export default theme;
