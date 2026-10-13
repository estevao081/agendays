import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-paper-200 print:min-h-0 print:bg-white">
      <div className="mx-auto min-h-screen w-full max-w-md bg-paper-100 shadow-xl shadow-ink-950/5 sm:my-6 sm:min-h-0 sm:rounded-[1.5rem] print:my-0 print:max-w-2xl print:rounded-none print:bg-white print:shadow-none">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
