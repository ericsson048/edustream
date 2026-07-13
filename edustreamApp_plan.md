# EduStream React Native App — Plan d'implémentation

## Objectif
Créer une application mobile React Native (Expo Router) `edustreamApp/` reprenant le thème exact de l'application web EduStream, avec les fonctionnalités étudiantes clés : auth, dashboard, cours, skill tree, notifications, profil.

## Architecture

### Stack technique
- **Framework**: Expo SDK 52+ avec Expo Router (file-based routing)
- **Navigation**: Tab navigator (bas) + Stack navigator (modaux/écrans détail)
- **HTTP**: Axios (comme le web)
- **Auth**: AsyncStorage + JWT (refresh automatique)
- **Thème**: React Context custom (pas de lib externe)

### Arborescence
```
edustreamApp/
├── app/
│   ├── _layout.tsx           # Root : AuthProvider → ThemeProvider → Stack
│   ├── index.tsx             # Redirection auto login ou tabs
│   ├── (auth)/
│   │   ├── _layout.tsx       # Stack navigator (header caché)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   └── (tabs)/
│       ├── _layout.tsx       # Bottom Tab Navigator
│       ├── dashboard.tsx     # Stats + cours en cours + recommandations
│       ├── courses.tsx       # Mes cours inscrits avec progression
│       └── more.tsx          # Stack secondaire :
│           ├── index.tsx           # Grille d'icônes (skill-tree, focus, assignments, grades, schedule, community, messages, notifications, certificate)
│           ├── skill-tree.tsx
│           ├── focus.tsx
│           ├── assignments.tsx
│           ├── grades.tsx
│           ├── schedule.tsx
│           ├── community.tsx
│           ├── messages.tsx
│           ├── notifications.tsx
│           ├── certificate.tsx
│           └── profile.tsx
├── src/
│   ├── theme/
│   │   └── colors.ts        # Toutes les couleurs light/dark (copiées du web)
│   ├── services/
│   │   ├── apiClient.ts     # Axios instance with interceptors
│   │   ├── auth.ts          # login, register, getMe, refresh, forgotPassword
│   │   ├── courses.ts       # listCourses, getCourse, listEnrollments, listProgress
│   │   ├── learning.ts      # getStats, listAssignments, listSubmissions, getQuiz, submitAttempt, getRecommended
│   │   ├── notifications.ts # list, markRead, markAllRead, unreadCount
│   │   └── skills.ts        # listSkillTrees, generateSkillTree, unlockNextNode
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useNotifications.ts
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── components/
│       ├── ThemedText.tsx
│       ├── ThemedView.tsx
│       ├── StatsCard.tsx
│       ├── CourseCard.tsx
│       ├── Header.tsx
│       ├── NotificationBell.tsx
│       └── SkeletonLoader.tsx
├── app.json
├── package.json
└── tsconfig.json
```

### Thème (copié du web)
```
Page bg:      #f8fafc (light) / #020617 (dark)
Card bg:      #ffffff       / #0f172a
Primary:      #2563eb       / #60a5fa
Text primary: #0f172a       / #f1f5f9
Text secondary: #475569     / #94a3b8
Border:       #e2e8f0       / #1e293b
```

### Implémentation (ordre)
1. `npx create-expo-app@latest edustreamApp --template blank-typescript`
2. Installer dépendances : expo-router, @react-navigation/bottom-tabs, axios, @react-native-async-storage/async-storage, expo-secure-store
3. Créer `src/theme/colors.ts` — palette complète light/dark
4. Créer `src/contexts/ThemeContext.tsx` — provider avec useColorScheme
5. Créer `src/services/apiClient.ts` — Axios avec baseURL, intercepteurs JWT + refresh
6. Créer `src/services/auth.ts` — login, register, getMe
7. Créer `src/contexts/AuthContext.tsx` — state user + tokens
8. Créer `app/_layout.tsx` — providers + redirect
9. Créer `app/(auth)/*.tsx` — login, register, forgot-password
10. Créer `app/(tabs)/_layout.tsx` — bottom tab (Dashboard, Courses, Plus)
11. Créer `app/(tabs)/dashboard.tsx` — stat cards + continuing courses + recommended
12. Créer `app/(tabs)/courses.tsx` — enrolled courses with progress bars
13. Créer `app/(tabs)/more/` — all secondary screens
14. Créer composants partagés (ThemedText, StatsCard, CourseCard, Header, Skeleton)

### Vérification
- `npx expo start` lance le bundler sans erreur
- TypeScript strict sans erreur (`npx tsc --noEmit`)
- Thème dark/light fonctionne avec useColorScheme
- Auth flow fonctionne (login → redirect tabs → logout → login)
- API calls avec token réussissent
