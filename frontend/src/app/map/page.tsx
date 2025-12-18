'use client'

export default function MapPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-xl font-semibold">Carte interactive</h1>
      </header>
      
      <main className="flex-1">
        {/* TODO: Implémenter la carte Leaflet */}
        {/* - Affichage des POI */}
        {/* - Parcours */}
        {/* - Détails au clic */}
        <div className="flex h-full items-center justify-center bg-gray-100">
          <p className="text-gray-500">Carte à implémenter</p>
        </div>
      </main>
    </div>
  )
}

