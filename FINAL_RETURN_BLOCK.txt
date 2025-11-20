// Copy everything from line 505 to line 1105 and replace with this:

  return (
    <div className="min-h-screen bg-slate-50 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.12),transparent_55%)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl mx-auto rounded-3xl border border-slate-200/80 bg-white/90 p-8 sm:p-9 lg:p-10 shadow-xl shadow-slate-900/5 backdrop-blur">
        {/* Logo Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white shadow-sm">
            T
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900">Trakr</div>
            <div className="text-xs text-slate-500">Audit & compliance workspace</div>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid gap-8 lg:gap-10 md:grid-cols-2 items-start">
          {/* LEFT COLUMN - Auth Form */}
          <div className="w-full">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">
              {authMode === 'login' && 'Sign in to your workspace'}
              {authMode === 'register' && 'Create your Trakr account'}
              {authMode === 'forgot-password' && 'Reset your password'}
            </h2>

            <p className="text-sm text-slate-600">
              {authMode === 'login' && 'Use your company email and password to continue.'}
              {authMode === 'register' && 'Set up your profile using your company email.'}
              {authMode === 'forgot-password' && 'We will send a secure password reset link to your email.'}
            </p>

            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault()
                if (authStatus === 'submitting' || isLocked) return
                if (authMode === 'login') {
                  void handleLogin(e)
                } else if (authMode === 'register') {
                  void handleRegister(e)
                } else {
                  void handleForgotPassword(e)
                }
              }}
              className="mt-6 space-y-4"
            >
              {authMode === 'register' && (
                <div>
                  <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="Jane Doe"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  ref={emailInputRef}
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              {authMode !== 'forgot-password' && (
                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  {authMode === 'register' && (
                    <p className="mt-1 text-xs text-slate-500">
                      Must be 8+ characters with uppercase, lowercase, and numbers.
                    </p>
                  )}
                </div>
              )}

              {authMode === 'register' && (
                <div>
                  <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Re-enter password"
                      autoComplete="new-password"
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {authError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-800">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">!</span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 font-medium text-red-900">{authError.title}</p>
                      <p className="mb-1 text-[11px] text-red-700">
                        {isLocked && lockoutSecondsRemaining > 0
                          ? `Account locked for ${Math.floor(lockoutSecondsRemaining / 60)}:${String(
                              lockoutSecondsRemaining % 60,
                            ).padStart(2, '0')}. Please wait or use "Forgot password" to reset.`
                          : authError.message}
                      </p>
                      {authError.action && !isLocked && (
                        <p className="text-[11px] text-red-700">{authError.action}</p>
                      )}
                      {isLocked && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot-password')}
                          className="mt-1 text-[11px] font-medium text-red-700 hover:text-red-900 underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm">✓</span>
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 font-medium text-emerald-900">{successMessage.title}</p>
                      <p className="text-[11px] text-emerald-700">{successMessage.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {authMode === 'login' && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Remember for 30 days</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rememberMe}
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500/70 focus:ring-offset-1 focus:ring-offset-slate-100 ${
                      rememberMe ? 'bg-primary-500' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        rememberMe ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={authStatus === 'submitting' || isLocked}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-500/40 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
              >
                {authStatus === 'submitting' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-b-transparent" />
                    <span>
                      {authMode === 'login'
                        ? 'Signing in…'
                        : authMode === 'register'
                        ? 'Creating account…'
                        : 'Sending link…'}
                    </span>
                  </>
                ) : isLocked ? (
                  <>
                    <span>🔒</span>
                    <span>Account locked</span>
                  </>
                ) : (
                  (authMode === 'login' && 'Sign in') ||
                  (authMode === 'register' && 'Create account') ||
                  'Send reset link'
                )}
              </button>
            </form>

            {(import.meta.env.DEV || window.location.hostname === 'localhost') &&
              authMode === 'login' && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <div className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Development quick access
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signIn(UserRole.ADMIN)
                          navigate('/dashboard/admin')
                        } catch (e) {
                          logger.error('Quick login failed', e, { context: 'LoginScreen' })
                        }
                      }}
                      className="rounded-md border border-primary-100 bg-primary-50 px-2 py-1.5 text-primary-800 hover:border-primary-200 hover:bg-primary-100"
                    >
                      Login as Admin
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signIn(UserRole.BRANCH_MANAGER)
                          navigate('/dashboard/branch-manager')
                        } catch (e) {
                          logger.error('Quick login failed', e, { context: 'LoginScreen' })
                        }
                      }}
                      className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-emerald-800 hover:border-emerald-200 hover:bg-emerald-100"
                    >
                      Login as Branch Manager
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await signIn(UserRole.AUDITOR)
                          navigate('/dashboard/auditor')
                        } catch (e) {
                          logger.error('Quick login failed', e, { context: 'LoginScreen' })
                        }
                      }}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                    >
                      Login as Auditor
                    </button>
                  </div>
                </div>
              )}

            <div className="mt-6 text-center text-xs text-slate-500">
              {authMode === 'login' ? (
                <div className="space-y-2">
                  <div>
                    Don't have an account?{' '}
                    <button
                      onClick={() => switchMode('register')}
                      className="font-semibold text-primary-600 hover:text-primary-700"
                      type="button"
                    >
                      Sign up
                    </button>
                  </div>
                  <button
                    onClick={() => switchMode('forgot-password')}
                    className="font-medium text-slate-600 hover:text-slate-900"
                    type="button"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : authMode === 'register' ? (
                <div>
                  Already have an account?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="font-semibold text-primary-600 hover:text-primary-700"
                    type="button"
                  >
                    Sign in
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => switchMode('login')}
                  className="font-medium text-slate-600 hover:text-slate-900"
                  type="button"
                >
                  ← Back to login
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - Hero Panel (Hidden on mobile) */}
          <div className="hidden md:flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-5 sm:py-5">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary-700">
                Audit. Prove. Resolve.
              </p>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                Audit and compliance for multi-site teams
              </h3>
              <p className="mt-2 text-xs text-slate-600">
                Run mobile audits, capture section-level evidence, and track corrective actions in one workspace.
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary-500" />
                  <span>Standardized checklists with weighted scoring by section.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Photos, notes, and N/A handling at the exact question where it matters.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-sky-500" />
                  <span>Instant summaries so managers see risk and next actions at a glance.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>Secure by design</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
                <span>Fast and accurate audits</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary-500" />
                <span>Built for branch and field teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
