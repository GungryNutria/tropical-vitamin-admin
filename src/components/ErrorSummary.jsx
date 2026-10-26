import { Box, Link } from '@mui/material';
import Banner from './Banner';

// "Revisa N campos" con un enlace por campo (REQ-10/AC-UX-4). errors = [{ id, label }]: `id` es el id del campo.
// El llamador le da el foco al llamar a focus() (forwardRef no hace falta: se envuelve en un div enfocable).
export default function ErrorSummary({ errors, wrapperRef }) {
  if (!errors.length) return null;
  const goTo = (id) => document.getElementById(id)?.focus();
  return (
    <Box ref={wrapperRef} tabIndex={-1} sx={{ outline: 'none', mb: 3 }}>
      <Banner title={`Revisa ${errors.length} ${errors.length === 1 ? 'campo' : 'campos'}`}>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {errors.map((e) => (
            <li key={e.id}>
              <Link component="button" type="button" onClick={() => goTo(e.id)} sx={{ color: 'inherit', textAlign: 'left' }}>
                {e.label}
              </Link>
            </li>
          ))}
        </Box>
      </Banner>
    </Box>
  );
}
