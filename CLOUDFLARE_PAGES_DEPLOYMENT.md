# StudyBud — Cloudflare Pages Deployment Guide

**Target Domain:** `https://studybud.prathamh.com`  
**Frontend:** Cloudflare Pages (Free Tier)  
**Backend:** Supabase (Free Tier - keep as-is)  
**Video Gen:** Separate server (keep as-is)  

---

## 📋 Pre-Deployment Checklist

### 1. DNS Configuration (Cloudflare Dashboard)
```
Type    Name        Content                    Proxy
CNAME   studybud    studybud.pages.dev         🟠 Proxied
TXT     _acme-challenge.studybud  <auto>       🟠 Proxied (for SSL)
```
- Add custom domain `studybud.prathamh.com` in Cloudflare Pages > Custom Domains
- Cloudflare will auto-provision SSL cert

### 2. Cloudflare Pages Project Settings
| Setting | Value |
|---------|-------|
| **Project Name** | `studybud` |
| **Build Command** | `npm run build` |
| **Build Output Directory** | `dist` |
| **Root Directory** | `/` (repo root) |
| **Node.js Version** | `20` (set `NODE_VERSION=20` in env vars) |

### 3. Environment Variables (Cloudflare Pages Dashboard > Settings > Environment Variables)

#### Production Environment
```bash
VITE_APP_URL=https://studybud.prathamh.com
VITE_SUPABASE_URL=https://pibmsdpxvqkbvgdjpips.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_GEMINI_API_KEY=<your-gemini-key>
VITE_OPENAI_API_KEY=<your-openai-key>
VITE_RAZORPAY_KEY_ID=rzp_live_<your-live-key>  # LIVE key for production!
VITE_VIDEO_GEN_URL=https://<your-video-gen-domain>/api/generate
```

#### Preview Environment (optional)
```bash
VITE_APP_URL=https://<branch>.studybud.pages.dev
VITE_SUPABASE_URL=https://pibmsdpxvqkbvgdjpips.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_GEMINI_API_KEY=<your-gemini-key>
VITE_OPENAI_API_KEY=<your-openai-key>
VITE_RAZORPAY_KEY_ID=rzp_test_<your-test-key>
VITE_VIDEO_GEN_URL=https://<your-video-gen-domain>/api/generate
```

---

## 🔧 Required Code Changes (Already Done)

### ✅ Completed
- [x] `public/_headers` - Security headers, caching, SW MIME type
- [x] `public/_redirects` - SPA fallback routing
- [x] `wrangler.toml` - Pages configuration reference
- [x] `env.template` - Updated with production domain references
- [x] `.env` - Local dev with production domain comments
- [x] `src/hooks/usePayment.ts` - Dynamic Supabase URL from env
- [x] `studybud-mobile/.env.example` - Mobile env vars for production
- [x] PWA icons (`favicon.ico`, `apple-touch-icon.png`, `masked-icon.svg`)

### ⚠️ Still Needed (Manual Steps)

#### 1. Google OAuth Redirect URIs (Google Cloud Console)
Add to **Authorized Redirect URIs**:
```
https://studybud.prathamh.com/auth/callback
https://studybud.prathamh.com (for popups)
http://localhost:5173/auth/callback (dev)
```

#### 2. Supabase Auth Settings (Supabase Dashboard > Authentication > URL Configuration)
```
Site URL: https://studybud.prathamh.com
Redirect URLs: 
  - https://studybud.prathamh.com/auth/callback
  - https://studybud.prathamh.com/**
  - http://localhost:5173/** (dev)
```
**Project:** `pibmsdpxvqkbvgdjpips` (Dashboard: https://supabase.com/dashboard/project/pibmsdpxvqkbvgdjpips)

#### 3. Razorpay Webhook URL (Razorpay Dashboard > Webhooks)
```
https://pibmsdpxvqkbvgdjpips.supabase.co/functions/v1/razorpay-webhook
```
(Updated to new Supabase project)

#### 4. PayPal Webhook URL (PayPal Developer Dashboard)
```
https://pibmsdpxvqkbvgdjpips.supabase.co/functions/v1/paypal-webhook
```
(Updated to new Supabase project)

#### 5. Video Generation Server
- Deploy separately (Docker/VPS/Cloudflare Workers AI if rewritten)
- Update `VITE_VIDEO_GEN_URL` in Cloudflare Pages env vars

---

## 🚀 Deployment Commands

### Local Build Test
```bash
npm run build
# Verify dist/ folder looks correct
npx serve dist  # Test locally
```

### Push to Deploy (Auto-deploy on push to main)
```bash
git add .
git commit -m "feat: Cloudflare Pages deployment ready"
git push origin main
```

### Manual Deploy (if not connected to Git)
```bash
# Install Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy dist --project-name=studybud
```

---

## 💰 Free Tier Limits (More than enough for 10 users/day)

| Service | Free Tier | StudyBud Usage |
|---------|-----------|----------------|
| **Cloudflare Pages** | Unlimited requests, 500 builds/mo | ~300 requests/day ✅ |
| **Cloudflare Workers** | 100K requests/day | N/A (not used) |
| **Supabase** | 500MB DB, 1GB storage, 2M Edge fn/mo | ~300 requests/day ✅ |
| **Supabase Auth** | 2M MAU | 10 users ✅ |
| **Supabase Realtime** | 200 concurrent | 10 users ✅ |
| **Supabase Storage** | 1GB | Videos/avatars ✅ |

---

## 🔄 CI/CD Pipeline (Optional - GitHub Actions)

```yaml
# .github/workflows/deploy-pages.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          projectName: studybud
          directory: dist
          branch: main
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **404 on refresh** | Ensure `_redirects` has `/* /index.html 200` |
| **Service Worker not registering** | Check `_headers` serves `/sw.js` as `application/javascript` |
| **Google OAuth fails** | Verify redirect URIs in Google Cloud + Supabase match exactly |
| **Payments fail** | Check Supabase Edge Function logs; verify Razorpay/PayPal webhook URLs |
| **Video gen fails** | Verify `VITE_VIDEO_GEN_URL` is accessible from browser (CORS) |
| **PWA not installable** | Verify all icons exist, manifest.webmanifest served correctly |

---

## 📞 Support Commands

```bash
# Check build output
ls -la dist/

# Test headers locally
npx serve dist -l 5173

# View Cloudflare Pages deployment logs
wrangler pages deployment list --project-name=studybud

# Tail logs
wrangler pages deployment tail --project-name=studybud
```

---

*Generated for StudyBud migration to `studybud.prathamh.com` on Cloudflare Pages*