import { Button } from './ui';

export function LoginPage() {
  const failed = new URLSearchParams(window.location.search).get('error');
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-80 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">Login</h1>
        {failed && <p className="mb-4 text-sm text-red-600">Google login failed, please try again.</p>}
        <a href="/api/auth/google">
          <Button className="w-full">Login with Google</Button>
        </a>
      </div>
    </div>
  );
}
