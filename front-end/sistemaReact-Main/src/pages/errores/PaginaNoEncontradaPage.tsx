import { Link } from 'react-router-dom';

const PaginaNoEncontradaPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Página no encontrada</h1>
        <p className="text-gray-600 mb-6">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
        <Link to="/" className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default PaginaNoEncontradaPage;
