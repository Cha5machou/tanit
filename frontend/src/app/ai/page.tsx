'use client'

export default function AIPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white px-4 py-3">
        <h1 className="text-xl font-semibold">Assistant IA</h1>
      </header>
      
      <main className="flex flex-1 flex-col">
        {/* Zone de messages */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* TODO: Implémenter l'historique des messages */}
        </div>
        
        {/* Zone de saisie */}
        <div className="border-t bg-white p-4">
          {/* TODO: Implémenter l'input et l'envoi */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Posez votre question..."
              className="flex-1 rounded-lg border px-4 py-2"
            />
            <button className="rounded-lg bg-primary-600 px-4 py-2 text-white">
              Envoyer
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

