import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

// Menos de 900 px: barra superior, cajón y filas compactas. Menos de 1200 px: la edición de tour
// apila el riel y Guardar pasa a la barra inferior fija.
export const useIsMobile = () => useMediaQuery(useTheme().breakpoints.down('md'), { noSsr: true });
export const useIsStacked = () => useMediaQuery(useTheme().breakpoints.down('lg'), { noSsr: true });
