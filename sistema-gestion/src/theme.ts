import { createTheme } from '@mui/material/styles';

const FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif";

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1E40AF',
      light: '#3B82F6',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#0F766E',
      light: '#14B8A6',
      dark: '#115E59',
      contrastText: '#FFFFFF'
    },
    background: {
      default: '#F1F5F9',
      paper: '#FFFFFF'
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B'
    },
    divider: '#E2E8F0'
  },
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily: FONT,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700, letterSpacing: '-0.03em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 600, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.005em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F1F5F9',
          scrollbarColor: '#CBD5E1 transparent',
          '& ::-webkit-scrollbar': { width: 8, height: 8 },
          '& ::-webkit-scrollbar-thumb': { backgroundColor: '#CBD5E1', borderRadius: 4 },
          '& ::-webkit-scrollbar-thumb:hover': { backgroundColor: '#94A3B8' }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
          border: '1px solid #E2E8F0'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' }
        },
        containedPrimary: {
          boxShadow: '0 1px 2px rgba(30, 64, 175, 0.3)',
          '&:hover': {
            backgroundColor: '#1E3A8A',
            boxShadow: '0 2px 6px rgba(30, 64, 175, 0.35)'
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#94A3B8'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: '#475569',
          backgroundColor: '#F8FAFC',
          fontSize: '0.78rem',
          letterSpacing: '0.03em',
          textTransform: 'uppercase'
        },
        root: {
          borderColor: '#E2E8F0'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600
        }
      }
    }
  }
});
