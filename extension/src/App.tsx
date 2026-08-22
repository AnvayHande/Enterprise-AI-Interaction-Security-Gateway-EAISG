import { Shield, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

function App() {
  return (
    <div className="flex flex-col w-full h-full min-h-[400px] bg-white border-x border-b border-slate-200">
      <header className="bg-slate-900 text-white p-4 flex items-center space-x-3 shadow-md">
        <Shield className="w-6 h-6 text-emerald-400" />
        <h1 className="font-semibold text-lg tracking-wide">EAISG Gateway</h1>
      </header>
      
      <main className="flex-1 p-5 space-y-6">
        <section className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-emerald-900 font-medium">Protection Active</h2>
            <p className="text-emerald-700 text-sm mt-1">
              Your AI interactions are being monitored according to company policy.
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {/* Placeholder activity items */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-md">
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">chatgpt.com</span>
              </div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Sanitized</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-md">
              <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">claude.ai</span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Approved</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center text-xs text-slate-500">
        <span>Connected to Gateway (localhost)</span>
        <a href="http://localhost:5173" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
          Dashboard ↗
        </a>
      </footer>
    </div>
  );
}

export default App;
