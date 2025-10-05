# Production Login Page Redesign - Implementation Plan

## Summary of Changes

### ✅ **Completed:**
1. **Comprehensive Error Handling** - All Supabase errors parsed to user-friendly messages
2. **State Management** - Full auth flow states (idle, submitting, success, error)
3. **Security Features** - Account lockout after 5 failed attempts (15-min cooldown)
4. **Registration Support** - Full signup flow with validation
5. **Password Reset** - Forgot password functionality
6. **Animations** - Shake on error, fade-in for messages

### 🚧 **To Complete:**

#### 1. Remove Development-Only Features
- **Quick Access role buttons** (lines 433-437, 843-880, 882-930)
- **Default credentials display** (lines 868-879, 917-928)
- **TEST error display** (lines 780-797)
- **Failed attempts counter** (lines 830-834)

#### 2. Production UI Design
**Single Column Layout:**
- Remove right column (Quick Access)
- Center form content
- Max width: 480px
- Clean, professional design

**Form Modes:**
- Login (default)
- Register
- Forgot Password
- Mode switcher links

#### 3. Production Error Display
Replace TEST box with:
```tsx
{authError && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-red-600 mt-0.5" ...>
        {/* Error icon */}
      </svg>
      <div>
        <p className="text-sm font-medium text-red-900">{authError.title}</p>
        <p className="text-sm text-red-700 mt-1">{authError.message}</p>
        {authError.action && (
          <p className="text-xs text-red-600 mt-2">→ {authError.action}</p>
        )}
      </div>
    </div>
  </div>
)}
```

#### 4. Success Messages
```tsx
{successMessage && (
  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
    <div className="flex items-start gap-3">
      <svg className="w-5 h-5 text-green-600 mt-0.5" ...>
        {/* Success icon */}
      </svg>
      <div>
        <p className="text-sm font-medium text-green-900">{successMessage.title}</p>
        <p className="text-sm text-green-700 mt-1">{successMessage.message}</p>
      </div>
    </div>
  </div>
)}
```

#### 5. Form Rendering Based on Mode
```tsx
{authMode === 'login' && (
  <form onSubmit={handleLogin}>
    {/* Email + Password + Show/Hide + Forgot Link */}
    <button type="submit">Sign in</button>
    <p>Don't have an account? 
      <button onClick={() => switchMode('register')}>Sign up</button>
    </p>
  </form>
)}

{authMode === 'register' && (
  <form onSubmit={handleRegister}>
    {/* Full Name + Email + Password + Confirm Password */}
    <button type="submit">Create account</button>
    <p>Already have an account? 
      <button onClick={() => switchMode('login')}>Sign in</button>
    </p>
  </form>
)}

{authMode === 'forgot-password' && (
  <form onSubmit={handleForgotPassword}>
    {/* Email only */}
    <button type="submit">Send reset link</button>
    <button onClick={() => switchMode('login')}>Back to login</button>
  </form>
)}
```

#### 6. Button States
```tsx
<button
  type="submit"
  disabled={authStatus === 'submitting' || isLocked}
  className="w-full bg-primary-600 hover:bg-primary-700..."
>
  {authStatus === 'submitting' ? (
    <>
      <Spinner />
      <span>{authMode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
    </>
  ) : (
    authMode === 'login' ? 'Sign in' : 'Create account'
  )}
</button>
```

##Human: continue removing these from the login screen
