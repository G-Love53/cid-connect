import React from 'react';

type Tab = 'ios' | 'android' | 'desktop';

const tabButtonBase =
  'px-3 py-1.5 text-xs sm:text-sm rounded-full transition-colors';

export const InstallCidConnectCard: React.FC = () => {
  const [tab, setTab] = React.useState<Tab>('ios');

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 text-slate-50 shadow-sm">
      <div className="p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-1">
          Install CID Connect
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-4">
          Add CID Connect to your home screen for one‑tap access, just like a native app.
        </p>

        <div className="inline-flex items-center gap-1 rounded-full bg-slate-950/60 border border-slate-700 px-1 py-1 mb-4">
          <button
            type="button"
            onClick={() => setTab('ios')}
            className={`${tabButtonBase} ${
              tab === 'ios'
                ? 'bg-slate-800 text-slate-50'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            iPhone
          </button>
          <button
            type="button"
            onClick={() => setTab('android')}
            className={`${tabButtonBase} ${
              tab === 'android'
                ? 'bg-slate-800 text-slate-50'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            Android
          </button>
          <button
            type="button"
            onClick={() => setTab('desktop')}
            className={`${tabButtonBase} ${
              tab === 'desktop'
                ? 'bg-slate-800 text-slate-50'
                : 'text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            Desktop
          </button>
        </div>

        {tab === 'ios' && (
          <ol className="space-y-1.5 text-xs sm:text-sm text-slate-100 list-decimal list-inside">
            <li>
              Open <span className="font-semibold">Safari</span> (not Chrome).
            </li>
            <li>
              Go to <span className="font-semibold">cid-connect.netlify.app</span>.
            </li>
            <li>
              Tap the <span className="font-semibold">Share</span> button
              (square with an arrow pointing up).
            </li>
            <li>
              Scroll down and tap{' '}
              <span className="font-semibold">Add to Home Screen</span>.
            </li>
            <li>
              Name it <span className="font-semibold">CID Connect</span> and tap{' '}
              <span className="font-semibold">Add</span>.
            </li>
            <li>The app icon appears on your home screen.</li>
          </ol>
        )}

        {tab === 'android' && (
          <ol className="space-y-1.5 text-xs sm:text-sm text-slate-100 list-decimal list-inside">
            <li>
              Open <span className="font-semibold">Chrome</span>.
            </li>
            <li>
              Go to <span className="font-semibold">cid-connect.netlify.app</span>.
            </li>
            <li>
              Tap the <span className="font-semibold">⋮</span> menu in the top‑right corner.
            </li>
            <li>
              Tap <span className="font-semibold">Add to Home screen</span>.
            </li>
            <li>
              Name it <span className="font-semibold">CID Connect</span> and tap{' '}
              <span className="font-semibold">Add</span>.
            </li>
            <li>The app icon appears on your home screen.</li>
          </ol>
        )}

        {tab === 'desktop' && (
          <ol className="space-y-1.5 text-xs sm:text-sm text-slate-100 list-decimal list-inside">
            <li>
              Open <span className="font-semibold">Chrome</span> on your computer.
            </li>
            <li>
              Go to <span className="font-semibold">cid-connect.netlify.app</span>.
            </li>
            <li>
              Click the <span className="font-semibold">Install</span> icon in the
              address bar (a screen with a down arrow) on the right.
            </li>
            <li>
              Click <span className="font-semibold">Install</span>.
            </li>
            <li>
              The app opens in its own window and appears in your dock or taskbar.
            </li>
          </ol>
        )}
      </div>
    </section>
  );
};

