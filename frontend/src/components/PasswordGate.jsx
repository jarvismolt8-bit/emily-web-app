import { useState } from 'react';

export default function PasswordGate({ onAuth }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onAuth(password)) {
      setError('');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="border border-slate-700 bg-gray-800 p-6 md:p-8 shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">🥖</h1>
          <h2 className="text-lg md:text-xl text-slate-300">Emily's Web App</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">Enter Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 md:px-4 py-2 bg-gray-700 text-white border border-slate-600 focus:border-slate-400 focus:outline-none text-base"
              placeholder="Enter password..."
            />
          </div>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full border border-slate-600 hover:bg-slate-700 text-slate-300 py-2 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
