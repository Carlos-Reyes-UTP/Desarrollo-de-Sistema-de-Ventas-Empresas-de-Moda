const TailwindTest = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        Prueba de Tailwind CSS
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <p className="text-red-800 font-medium">Este es un cuadro rojo</p>
        </div>
        
        <div className="bg-green-100 p-4 rounded-lg shadow">
          <p className="text-green-800 font-medium">Este es un cuadro verde</p>
        </div>
        
        <div className="bg-blue-100 p-4 rounded-lg shadow">
          <p className="text-blue-800 font-medium">Este es un cuadro azul</p>
        </div>
      </div>
      
      <button className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded transition-colors">
        Botón con Hover
      </button>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500">
         Diosmio funciona tailwind 
        </p>
      </div>
    </div>
  );
};

export default TailwindTest;