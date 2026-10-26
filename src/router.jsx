import { createBrowserRouter } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TourList from './pages/tours/TourList';
import TourEdit from './pages/tours/TourEdit';
import LanguageList from './pages/languages/LanguageList';
import CategoryList from './pages/categories/CategoryList';
import NotFound from './pages/NotFound';
import Layout from './components/Layout';

// Router de datos (D-7): useBlocker (cambios sin guardar) solo funciona con él.
const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <Layout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'tours', element: <TourList /> },
      { path: 'tours/new', element: <TourEdit /> },
      { path: 'tours/:id', element: <TourEdit /> },
      { path: 'categories', element: <CategoryList /> },
      { path: 'languages', element: <LanguageList /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export default router;
