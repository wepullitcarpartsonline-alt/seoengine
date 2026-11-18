export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-extrabold text-gray-900">404 — Part Not Found</h1>
      <p className="mt-2 text-gray-500">
        This listing may have been removed, or the URL is incorrect.
      </p>
      <a
        href="/"
        className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Back to Parts Search
      </a>
    </main>
  );
}
