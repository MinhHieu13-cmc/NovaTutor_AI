# 🔧 Login Fix v2 - Auth Page Using authService

**Issue**: Auth page was calling `fetch('/api/v1/login')` directly instead of using `authService`  
**Root Cause**: Hard-coded relative URLs in auth page  
**Fix**: Changed auth page to use `authService.login()` and `authService.register()`  
**Status**: 🔄 Building now

---

## 🐛 Problem Discovery

After first fix, login still failed. Investigation showed:

```javascript
// In built auth/page.js:
fetch("/api/v1/login", { // ❌ Still hard-coded!
  method: "POST",
  ...
})
```

**Why first fix didn't work**:
- Dockerfile had correct API_URL
- But auth/page.tsx wasn't using it
- Page called `fetch()` directly, not through authService

---

## ✅ Solution Applied

### Changes Made

**File**: `frontend/src/app/auth/page.tsx`

1. **Added import**:
```typescript
import { authService } from '@/services/authService';
```

2. **Fixed handleRegister**:
```typescript
// Before ❌
const response = await fetch('/api/v1/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, full_name: fullName, role }),
});

// After ✅
const response = await authService.register({ 
  email, password, full_name: fullName, role 
});
```

3. **Fixed handleLogin**:
```typescript
// Before ❌
const response = await fetch('/api/v1/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

// After ✅
const data = await authService.login({ email, password });
```

---

## 🎯 Why This Fix Works

### authService Implementation
```typescript
// authService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/login`, { // ✅ Uses full URL
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // ... handle response
}
```

**Benefits**:
- ✅ Uses `NEXT_PUBLIC_API_URL` environment variable
- ✅ Constructs full URL: `https://backend.../api/v1/login`
- ✅ Handles token storage automatically
- ✅ Consistent error handling
- ✅ Type-safe with TypeScript

---

## 📊 Build Status

```
🔄 Step 1: Rebuild with fixed auth page
   - Removed .next folder
   - Building Docker image with API_URL
   - Tag: gcr.io/novatotorai-489214/novatutor-frontend:fixed2

⏳ Step 2: Push to GCR (after build completes)

⏳ Step 3: Deploy to Cloud Run

⏳ Step 4: Test login
```

---

## ✅ Expected Result

After deployment:

```javascript
// Frontend will call:
fetch('https://novatutor-backend-366729322781.us-central1.run.app/api/v1/login', {
  method: 'POST',
  ...
})

// ✅ Correct backend URL
// ✅ Should return 200 OK
// ✅ Login successful
```

---

## 📝 Files Modified

1. ✅ `frontend/src/app/auth/page.tsx`
   - Added `authService` import
   - Changed `handleRegister` to use `authService.register()`
   - Changed `handleLogin` to use `authService.login()`

2. ✅ `frontend/Dockerfile` (from previous fix)
   - Has `ARG NEXT_PUBLIC_API_URL`
   - Bakes API_URL into build

---

## 🎓 Lessons Learned

### Issue 1: Environment Variable Not Used
- **Problem**: `NEXT_PUBLIC_API_URL` was in Dockerfile
- **But**: Auth page didn't use it
- **Lesson**: Check all pages use centralized services

### Issue 2: Direct fetch() Calls
- **Problem**: Pages calling `fetch()` directly
- **Solution**: Always use service layer
- **Benefit**: Single source of truth for API URLs

### Best Practice
```typescript
// ❌ Don't do this in pages:
fetch('/api/v1/endpoint')

// ✅ Do this instead:
import { authService } from '@/services/authService';
authService.method()
```

---

## 🔄 Next Steps

1. ⏳ Wait for build to complete (~2 minutes)
2. ⏳ Push image to GCR
3. ⏳ Deploy to Cloud Run
4. ⏳ Test login with teacher04@example.com

---

**Status**: 🔄 **Building fixed version**  
**ETA**: ~5 minutes  
**Tag**: `fixed2` (v2 of fix)

---

**Updated**: 2026-03-10  
**Fix v2**: Auth page now uses authService properly

