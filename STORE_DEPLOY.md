# LOCVIA — Guia pra App Store & Google Play Store

LOCVIA já está rodando como **PWA instalável** no iOS Safari e Android Chrome. Esse documento cobre a Fase 2 (empacotar como app nativa pras lojas).

## 📦 Estado atual (Fase 1 — PWA)

✅ Manifest.json + service worker + ícones
✅ Apple touch icons + splash screens  
✅ Meta tags `apple-mobile-web-app-capable`
✅ Theme color dark mode (#0b1120)
✅ `viewportFit: cover` (suporte a notch)

**Como instalar no celular agora:**
- iOS: Safari → botão compartilhar → "Adicionar à Tela de Início"
- Android: Chrome → menu → "Instalar app"

## 🚀 Fase 2 — App nativa (Capacitor)

O LOCVIA usa Next.js com API routes serverless, então a abordagem é **Capacitor com `server.url` apontando pro Vercel** (em vez de build estático local).

### Setup (já feito)

- ✅ `capacitor.config.json` com `server.url: https://locvia.vercel.app`
- ✅ App ID: `app.locvia.app`
- ✅ Theme color #0b1120
- ✅ Background splash + status bar

### Próximos passos (precisam ser feitos por você)

#### 1. Instalar Capacitor

```bash
cd "/Volumes/LovonHD/LOCVIA OK/LOCVIA"
npm install --save-dev @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar
```

> **Nota:** O `webDir: "out"` está configurado mas não vamos usar build local
> (Capacitor vai apontar direto pro Vercel via `server.url`).

#### 2. Adicionar plataformas

```bash
npx cap add ios        # Requer Xcode (só macOS)
npx cap add android    # Requer Android Studio
npx cap sync
```

#### 3. iOS — Xcode setup

1. Abra `ios/App/App.xcworkspace` no Xcode
2. **Signing & Capabilities:**
   - Team: seu Apple Developer Team ID
   - Bundle ID: `app.locvia.app`
   - Capabilities: Push Notifications (se quiser), Associated Domains
3. **Info.plist:**
   - Adicionar `NSLocationWhenInUseUsageDescription` = "Usamos sua localização pra mostrar imóveis próximos"
   - Adicionar `NSAppTransportSecurity` com exceções se precisar chamar APIs HTTP
4. **Icons & Launch Screen:**
   - Xcode 14+ usa o asset catalog `ios/App/App/Assets.xcassets`
   - Substitua os ícones placeholder pelos PNGs gerados em `public/icons/apple-touch-icon*.png`
5. **Build:**
   - Product → Archive → Distribute App → App Store Connect
   - Submit pra review (Apple review: 1-3 dias úteis)

#### 4. Android — Android Studio setup

1. Abra `android/` no Android Studio
2. **app/build.gradle:**
   - `applicationId "app.locvia.app"`
   - `versionCode 1`, `versionName "1.0.0"`
3. **AndroidManifest.xml:**
   - `<uses-permission android:name="android.permission.INTERNET" />`
   - `<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />` (se for usar geolocation)
4. **Ícones:**
   - Substitua em `android/app/src/main/res/mipmap-*/ic_launcher.png` pelos PNGs gerados
5. **Build:**
   - Build → Generate Signed Bundle / APK → Android App Bundle (.aab)
   - Upload no Google Play Console

#### 5. Antes de submeter (checklist)

- [ ] Conta **Apple Developer** ativa ($99/ano) — https://developer.apple.com
- [ ] Conta **Google Play Console** ativa ($25 one-time) — https://play.google.com/console
- [ ] Ícones 1024x1024 prontos pra stores (gere a partir de `public/icons/icon-512.png`)
- [ ] Screenshots: 6.7" (iPhone 14 Pro Max), 6.5" (iPhone 11 Pro Max), iPad 12.9", Android phone, Android 7" tablet
- [ ] Descrição PT-BR + EN
- [ ] Política de privacidade (URL pública)
- [ ] Classificação etária (Google Play) — provavelmente "L" (Livre)
- [ ] Termos de uso

## 🔄 Updates

Como o `server.url` aponta pro Vercel:
- **Mudanças no código → push no GitHub → Vercel redeploy → app atualiza automaticamente**
- Só precisa rebuildar a app nativa se mudar:
  - Plugins Capacitor
  - Ícones / splash
  - Permissões nativas
  - App ID / versão

## 🆘 Alternativa: PWABuilder (mais fácil pra Android)

Se o objetivo é **só Play Store** (sem iOS), use https://www.pwabuilder.com:

1. Aponta pro `https://locvia.vercel.app`
2. Gera APK/AAB com TWA (Trusted Web Activity)
3. Sem precisar de Capacitor ou Android Studio
4. **Limitação:** App Store rejeita TWA, então iOS fica só como PWA (Safari)

---

**TL;DR:**
- PWA já tá pronto e instalável
- Pra lojas: Capacitor + Xcode + Android Studio
- Se for só Android: PWABuilder é mais rápido
