function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58A8.98 8.98 0 0 0 9 0 9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  );
}

export function LoginPage() {
  const failed = new URLSearchParams(window.location.search).get('error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <div className="flex w-full max-w-[496px] flex-col items-center justify-center rounded-[10px] border border-[#E5E7EB] px-6 py-10 sm:h-[494px] sm:px-0 sm:py-0">
        <div className="flex w-full max-w-[380px] flex-col gap-7">
          <h1 className="text-center text-3xl font-semibold leading-none text-[#1C1C1C] sm:text-[38px]">Login</h1>

          {failed && <p className="text-center text-sm text-red-600">Google login failed, please try again.</p>}

          <div className="flex w-full flex-col gap-6">
            <a
              href="/api/auth/google"
              className="flex h-[54px] items-center justify-center gap-3 rounded-[10px] bg-[#E5F6EC] text-sm font-medium text-[#1C1C1C]"
            >
              <GoogleIcon />
              Login with Google
            </a>
            <div className="flex items-center gap-3 text-xs text-[#636970]">
              <span className="h-px flex-1 bg-[#E5E7EB]" />
              or sign up through email
              <span className="h-px flex-1 bg-[#E5E7EB]" />
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <input
              type="email"
              placeholder="Email ID"
              disabled
              title="This build only supports Google login"
              className="h-14 w-full rounded-[10px] bg-[#F4F7F5] px-2 text-sm text-[#636970] placeholder:text-[#636970] disabled:cursor-not-allowed"
            />
            <input
              type="password"
              placeholder="Password"
              disabled
              title="This build only supports Google login"
              className="h-14 w-full rounded-[10px] bg-[#F4F7F5] px-2 text-sm text-[#636970] placeholder:text-[#636970] disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="button"
            disabled
            title="This build only supports Google login"
            className="h-12 w-full rounded-xl bg-[#00A63E] text-base font-normal tracking-[-0.3px] text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
