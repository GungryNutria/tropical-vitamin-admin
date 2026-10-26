import { useNavigate } from 'react-router-dom';
import { NotFound as NotFoundState } from '../components/States';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <NotFoundState
      title="Esta página no existe."
      description="Puede que el enlace esté incompleto o que la página se haya movido."
      action={{ label: 'Ir al inicio', onClick: () => navigate('/') }}
    />
  );
}
