import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';

const headCell = { p: 0, height: 40, fontSize: 13, fontWeight: 600, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'border.subtle' };
const bodyCell = { p: 0, height: 52, borderBottom: '1px solid', borderColor: 'border.subtle', verticalAlign: 'middle' };
const srOnly = { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };
const frame = { border: '1px solid', borderColor: 'border.subtle', borderRadius: '8px', bgcolor: 'background.paper', overflow: 'hidden' };

// Tabla de la vista (Categorías, Idiomas) y, a 390, una lista de tarjetas con el mismo contenido.
// columns = [{ key, label, width?, align?, srOnly?, render(row) }]. renderCard(row) solo se usa en móvil.
export default function DataTable({ label, columns, rows, getKey, mobile, renderCard, onRowClick, highlightId }) {
  if (mobile) {
    return (
      <Box component="ul" aria-label={label} sx={{ ...frame, listStyle: 'none', m: 0, p: 0 }}>
        {rows.map((row) => (
          <Box
            component="li"
            key={getKey(row)}
            sx={{ p: 2, borderBottom: '1px solid', borderColor: 'border.subtle', '&:last-child': { borderBottom: 0 }, ...(highlightId === getKey(row) && { bgcolor: 'bg.selected' }) }}
          >
            {renderCard(row)}
          </Box>
        ))}
      </Box>
    );
  }
  return (
    <Box sx={frame}>
      <Table sx={{ tableLayout: 'fixed', width: '100%' }} aria-label={label}>
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <TableHead>
          <TableRow>
            {columns.map((c, i) => (
              <TableCell key={c.key} scope="col" align={c.align} sx={{ ...headCell, ...(i === 0 && { pl: 2 }) }}>
                {c.srOnly ? <Box component="span" sx={srOnly}>{c.label}</Box> : c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                '&:hover': { bgcolor: 'bg.raised' },
                '&:last-child td': { borderBottom: 0 },
                ...(highlightId === getKey(row) && { bgcolor: 'bg.selected', '&:hover': { bgcolor: 'bg.selected' } }),
              }}
            >
              {columns.map((c, i) => (
                <TableCell key={c.key} align={c.align} sx={{ ...bodyCell, ...(i === 0 && { pl: 2 }), pr: 1 }}>
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
