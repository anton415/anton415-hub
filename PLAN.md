# Frontend Refactoring Plan: anton415-hub

> План задач на основе [ANALYSIS.md](ANALYSIS.md). Каждая задача — отдельный пункт с приоритетом и чекбоксом. Задачи отсортированы по фазам (Phase 1 → 2 → 3), внутри фазы — по приоритету.
>
> **Легенда приоритетов:**
> - 🔴 **Critical** — блокирует пользователей или агентов прямо сейчас
> - 🟠 **High** — даёт максимальный эффект, делать первыми
> - 🟡 **Medium** — заметное улучшение, делать после high
> - 🟢 **Low** — полезное, но не срочное
>
> **Конвенция:** одна задача = один PR. Не объединять задачи в коммиты, чтобы каждое изменение было обратимо.

---

## Phase 1: Safe cleanup (1–2 дня)

> Цель: убрать очевидные риски без изменения поведения. Каждая задача независима, ломает мало.

### P1.1 Mock-данные и сломанные модули

- [x] ✅ 🔴 **P1.1.1** Удалить хардкод-события из `CalendarPage.tsx` и добавить auth-guard
  - Файл: `apps/web/src/app/components/CalendarPage.tsx` (строки 99, 106–136)
  - Источник: Critical Issue 1, Task T1
  - Acceptance: после refresh нет фейковых событий; неавторизованный пользователь не видит UI до редиректа

- [x] ✅ 🟡 **P1.1.2** Заменить `Date.now().toString()` на `crypto.randomUUID()` для id событий
  - Файл: `CalendarPage.tsx:202`
  - Источник: Stability Finding 9
  - Acceptance: id уникальны, нет коллизий при быстрых кликах

- [ ] 🟢 **P1.1.3** Решить судьбу календаря: либо `coming-soon` в Dashboard, либо стаб `calendarApi`
  - Файлы: `Dashboard.tsx:50`, новый `apps/web/src/app/api/calendarApi.ts` или удаление роута
  - Источник: Critical Issue 1
  - Acceptance: пользователь не видит «фантомных» сохранений или модуль явно помечен «скоро»

### P1.2 Accessibility baseline

- [ ] 🟠 **P1.2.1** Заменить `<div onClick>` / `<span onClick>` на `<button>` в TasksPage sidebar
  - Файл: `TasksPage.tsx:405-441` (renderProject, chevron)
  - Источник: Accessibility 1, Task T6
  - Acceptance: Tab навигация по sidebar работает, focus ring виден, screen reader объявляет «button»

- [ ] 🟠 **P1.2.2** Заменить `<Card onClick>` на `<button>` (или `Card asChild role="button"`) в CalendarPage
  - Файл: `CalendarPage.tsx:320-347`
  - Источник: Accessibility 1
  - Acceptance: ячейки дня кликаются с клавиатуры

- [ ] 🟠 **P1.2.3** Добавить `aria-label` всем icon-only кнопкам
  - Файлы: `TasksPage.tsx:621` (logout X), `TasksPage.tsx:507-515` (more), `TasksPage.tsx:432-440` (project more), chevron'ы
  - Источник: Accessibility 4
  - Acceptance: каждая иконочная кнопка имеет текстовое описание

- [ ] 🟡 **P1.2.4** Исправить `text-[10px]` → `text-xs` в CalendarPage Year view
  - Файл: `CalendarPage.tsx:253, 271`
  - Источник: Accessibility 5, UI 6.6
  - Acceptance: минимальный размер текста 12px

- [ ] 🟡 **P1.2.5** Связать `<Label>` с `<Input>` через `htmlFor` в финансах
  - Файл: `FinancesPage.tsx` (все Input в таблицах)
  - Источник: Accessibility 3
  - Acceptance: клик на label фокусирует input

### P1.3 Чистка дизайн-токенов

- [ ] 🟠 **P1.3.1** Унифицировать `text-danger` → `text-destructive` во всех страницах
  - Файлы: `TasksPage.tsx:658`, `FinancesPage.tsx:325`, `LoginPage.tsx:113`
  - Источник: UI 6.4, AI-readiness 14.2
  - Acceptance: в проекте только `text-destructive` / `variant="destructive"`, никаких `text-danger`

- [ ] 🟢 **P1.3.2** Удалить дубли `--danger`/`--success`/`--warning` из `theme.css` (или оставить только для не-кнопочного использования)
  - Файл: `apps/web/src/styles/theme.css:33-38, 77-82`
  - Источник: UI 6.4
  - Acceptance: одна цветовая система для ошибок

- [ ] 🟢 **P1.3.3** Заменить иконку `<X />` на `<LogOut />` для logout на mobile
  - Файлы: `TasksPage.tsx:621`, `FinancesPage.tsx:293`, `CalendarPage.tsx:543`
  - Источник: UX 5.2, UI 6.5
  - Acceptance: иконка семантически правильная

### P1.4 Стабильность и базовая защита

- [ ] 🟠 **P1.4.1** Добавить `<ErrorBoundary>` на уровне App с fallback'ом
  - Файлы: `apps/web/src/app/App.tsx`, новый `apps/web/src/app/ErrorBoundary.tsx`
  - Источник: Critical Issue 6, Stability 11
  - Acceptance: runtime-ошибка в одной странице не вешает SPA, показан fallback с «Перезагрузить»

- [ ] 🟡 **P1.4.2** Добавить confirmation при удалении проекта
  - Файл: `TasksPage.tsx:365-378` (handleDeleteProject)
  - Источник: Stability 4, UX 5.2
  - Acceptance: перед удалением показывается диалог «Удалить проект? Задачи также будут удалены»

- [ ] 🟢 **P1.4.3** Обернуть `response.json()` в `try/catch` (или проверить Content-Type)
  - Файлы: все четыре API-клиента (`authApi.ts`, `todoApi.ts`, `financeApi.ts`, `orchestratorApi.ts`) — заменится в P2.1.1
  - Источник: Stability 2
  - Acceptance: при пустом/некорректном теле ответа показывается осмысленная ошибка
  - **Примечание:** делать только если P2.1.1 откладывается; иначе пропустить

### P1.5 Чистка мёртвого кода

- [ ] 🟡 **P1.5.1** Удалить мёртвые типы из `api/types.ts` (после grep-проверки)
  - Файл: `apps/web/src/app/api/types.ts`
  - Типы-кандидаты: `TodoState`, `FinanceState`, `HomeState`, `AppPath`, `AuthState`, `HealthState`, `HealthPayload`, `ProductModule`
  - Источник: State Management Review, Task T7
  - Acceptance: `grep -r "TodoState" apps/web/src` пусто; `npm run build` зелёный

- [ ] 🟢 **P1.5.2** Удалить barrel-файл `OrchestratorPages.tsx`, импортировать страницы напрямую
  - Файлы: `apps/web/src/app/components/orchestrator/OrchestratorPages.tsx`, `routes.tsx`
  - Источник: Phase 3 plan, AI-readiness
  - Acceptance: barrel удалён, роутер импортирует страницы напрямую

---

## Phase 2: Structure and UX stabilization (3–5 дней)

> Цель: устранить дублирование, разрезать монолиты, ввести общие абстракции. Каждая задача — отдельный PR.

### P2.1 Единый API-слой

- [ ] 🔴 **P2.1.1** Создать `shared/api/client.ts` с `apiFetch<T>` и централизованным 401-handling
  - Файлы: новый `apps/web/src/app/api/client.ts`, рефакторинг `authApi.ts`/`todoApi.ts`/`financeApi.ts`/`orchestratorApi.ts` в наборы free-функций
  - Источник: Critical Issue 5, Task T3
  - Acceptance: одна реализация request, 401 → редирект на /login, существующие flows работают

- [ ] 🟡 **P2.1.2** Добавить `AbortSignal` в `apiFetch` и использовать в `loadTasks` / `loadProjects` / `refresh` (финансы)
  - Файлы: `client.ts`, `TasksPage.tsx`, `FinancesPage.tsx`
  - Источник: API Integration 2
  - Acceptance: быстрое переключение scope не вызывает race condition

- [ ] 🟢 **P2.1.3** Заменить envelope-тип `DataEnvelope<T> & ErrorEnvelope` на discriminated union
  - Файл: `client.ts`
  - Источник: API Integration 7
  - Acceptance: TypeScript не позволяет иметь одновременно `data` и `error`

### P2.2 Layout и shared конфигурация

- [ ] 🔴 **P2.2.1** Создать `AppShell` layout и `shared/config/modules.ts`
  - Файлы: новые `apps/web/src/app/layouts/AppShell.tsx`, `apps/web/src/shared/config/modules.ts`; рефакторинг 4 страниц
  - Источник: Critical Issue 2, Task T2
  - Acceptance: header единый, `modules` определён один раз, добавление 6-го модуля = правка только `modules.ts`

- [ ] 🟠 **P2.2.2** Создать `AuthProvider` + `ProtectedRoute`, заменить `useAuthGate`
  - Файлы: новые `apps/web/src/app/providers/AuthProvider.tsx`, `apps/web/src/app/layouts/ProtectedRoute.tsx`; рефакторинг `useAuthGate.ts` и роутов
  - Источник: Critical Issue 7
  - Acceptance: `me()` вызывается один раз за сессию; нет «Загрузка…» при каждой смене страницы

### P2.3 Разрезание монолитов

- [ ] 🔴 **P2.3.1** Разрезать `TasksPage` (1013 строк) на 7 компонентов + 2 хука
  - Папка: новая `apps/web/src/modules/tasks/`
  - Структура: `TasksPage` / `TaskSidebar` / `TaskList` / `TaskListItem` / `TaskEditSheet` / `ProjectDialog` / `hooks/useTasks` / `hooks/useProjects` / `lib/buildTree`
  - Источник: Critical Issue 3, Task T4
  - Acceptance: ни одного файла > 250 строк, все flow'ы работают, `SidebarContent` вынесен из родителя

- [ ] 🔴 **P2.3.2** Разрезать `CalendarPage` (763 строки) на view-компоненты
  - Папка: новая `apps/web/src/modules/calendar/`
  - Структура: `CalendarPage` / `YearView` / `MonthView` / `WeekView` / `DayView` / `EventDialog` + `shared/lib/dateRu.ts` (вынести `formatRu`)
  - Источник: Component Quality Review
  - Acceptance: ни одного файла > 250 строк, поведение каждого view сохранено

- [ ] 🟠 **P2.3.3** Разрезать `FinancesPage` (558 строк) на таблицы + хук
  - Папка: новая `apps/web/src/modules/finances/`
  - Структура: `FinancesPage` / `ExpensesTable` / `IncomeTable` / `SettingsTable` / `hooks/useFinanceYear`
  - Источник: Component Quality Review
  - Acceptance: ни одного файла > 250 строк, save-логика отделена от UI

- [ ] 🟢 **P2.3.4** Разделить `orchestrator/shared.tsx` (283 строки) на атомарные файлы
  - Папка: `apps/web/src/app/components/orchestrator/` → `OrchestratorFrame.tsx`, `tables/*`, `lib/format.ts`
  - Источник: Component Quality Review
  - Acceptance: каждый компонент в своём файле, экспорты атомарны

### P2.4 Производительность

- [ ] 🟠 **P2.4.1** Параллелизировать save в финансах через `Promise.allSettled`
  - Файл: `FinancesPage.tsx:149-178, 188-215` (внутри новой структуры P2.3.3)
  - Источник: Critical Issue 4, Task T5
  - Acceptance: 12 месяцев сохраняются параллельно; при ошибке одного месяца видно какой именно

- [ ] 🟡 **P2.4.2** Построить `Map<dateKey, Event[]>` через `useMemo` в `CalendarPage`
  - Файл: `CalendarPage.tsx:219-225` (внутри P2.3.2)
  - Источник: Performance Finding 3
  - Acceptance: `getEventsForDate` — O(1) lookup вместо `.filter` для каждой ячейки

- [ ] 🟢 **P2.4.3** Префильтровать события для week/day view на видимый интервал
  - Файл: `CalendarPage.tsx:381-411` (внутри P2.3.2)
  - Источник: Performance Finding 4
  - Acceptance: O(events × hours) → O(events_in_week × hours)

- [ ] 🟢 **P2.4.4** Мемоизировать `tasks.filter(t => t.parent_task_id === editingTask.id)` в Sheet
  - Файл: `TasksPage.tsx:818-838` (внутри P2.3.1)
  - Источник: Performance Finding 7
  - Acceptance: ввод в любое поле не пересчитывает фильтр subtask'ов

- [ ] 🟢 **P2.4.5** Поднять `modules` массив из тела `Dashboard` в module scope
  - Файл: `Dashboard.tsx:12-67` (или удалить дубликат если P2.2.1 уже сделан)
  - Источник: Performance Finding 8
  - Acceptance: массив не создаётся на каждый рендер

### P2.5 Shared UI компоненты

- [ ] 🟠 **P2.5.1** Создать `shared/ui/ErrorPanel.tsx` и применить в Tasks/Finances
  - Файлы: новый `apps/web/src/shared/ui/ErrorPanel.tsx` (из `orchestrator/shared.tsx`), `TasksPage.tsx:658`, `FinancesPage.tsx:325`
  - Источник: Loading/Empty/Error State Matrix, UX 5.5
  - Acceptance: ошибки в Tasks/Finances имеют retry-кнопку и единый стиль

- [ ] 🟡 **P2.5.2** Создать `shared/ui/MoneyInput.tsx` (`type="text"` + `inputMode="decimal"`)
  - Файлы: новый `apps/web/src/shared/ui/MoneyInput.tsx`, рефакторинг всех `<Input type="number">` в `FinancesPage`
  - Источник: UI 6.5, Task T8
  - Acceptance: на iOS Safari открывается decimal-клавиатура; принимаются и запятая, и точка

- [ ] 🟢 **P2.5.3** Создать `shared/ui/EmptyState.tsx` с поддержкой иконки и CTA
  - Файл: новый `apps/web/src/shared/ui/EmptyState.tsx`; применить в Tasks/Calendar/Orchestrator
  - Источник: UX 5.4
  - Acceptance: «Задач нет» и «No workflows yet» — единый компонент с опциональной кнопкой действия

- [ ] 🟢 **P2.5.4** Создать `shared/ui/Skeleton.tsx` и использовать в Loading-состояниях Tasks/Finances
  - Файл: новый `apps/web/src/shared/ui/Skeleton.tsx`
  - Источник: Loading/Empty/Error State Matrix
  - Acceptance: вместо «Загрузка…» текста — skeleton-блоки на 300+ ms запросах

---

## Phase 3: AI-friendly architecture (2–3 дня)

> Цель: сделать проект понятным для AI-агентов, зафиксировать правила.

### P3.1 Структурный переезд

- [ ] 🟠 **P3.1.1** Перенести `LoginPage` в `modules/auth/`
  - Файлы: `apps/web/src/app/components/LoginPage.tsx` → `apps/web/src/modules/auth/LoginPage.tsx`, `apps/web/src/modules/auth/api.ts`
  - Источник: Architecture 7
  - Acceptance: модуль auth изолирован, имеет свой `api.ts`

- [ ] 🟠 **P3.1.2** Перенести `Dashboard` в `modules/dashboard/`
  - Файлы: `apps/web/src/app/components/Dashboard.tsx` → `apps/web/src/modules/dashboard/DashboardPage.tsx`
  - Источник: Architecture 7
  - Acceptance: страница в своей папке

- [ ] 🟠 **P3.1.3** Перенести orchestrator из `app/components/orchestrator/` в `modules/orchestrator/`
  - Файлы: вся папка `apps/web/src/app/components/orchestrator/` → `apps/web/src/modules/orchestrator/`
  - Источник: Architecture 7
  - Acceptance: orchestrator не отличается структурой от других модулей

- [ ] 🟡 **P3.1.4** Перенести `financeFormat.ts` в `shared/lib/money.ts`
  - Файлы: `apps/web/src/app/api/financeFormat.ts` → `apps/web/src/shared/lib/money.ts`
  - Источник: Architecture 3
  - Acceptance: бизнес-логика денег не лежит в `api/`

- [ ] 🟡 **P3.1.5** Перенести UI-примитивы в `shared/ui/`
  - Файлы: `apps/web/src/app/components/ui/*` → `apps/web/src/shared/ui/`
  - Источник: Architecture 7
  - Acceptance: shared UI отделён от модульного UI

### P3.2 Документация для AI-агентов

- [ ] 🔴 **P3.2.1** Написать `apps/web/AGENTS.md` (или `CLAUDE.md`)
  - Файл: новый `apps/web/AGENTS.md`
  - Содержание: naming conventions, file size limits, state rules, styling rules, API rules (см. AI-readiness 14.4)
  - Источник: AI-readiness 14.5
  - Acceptance: новый агент, прочитав файл, понимает структуру и правила

- [ ] 🔴 **P3.2.2** Написать `docs/frontend-guidelines.md`
  - Файл: новый `docs/frontend-guidelines.md`
  - Содержание: токены (spacing, typography, colors), когда Card / Sheet / Dialog, шаблоны empty/error/loading
  - Источник: AI-readiness 14.5
  - Acceptance: 3–4 страницы с конкретными правилами без воды

- [ ] 🟠 **P3.2.3** Написать `docs/ai-agent-rules.md`
  - Файл: новый `docs/ai-agent-rules.md`
  - Содержание: что можно/нельзя без спроса, шаблон Codex-задачи (см. AI-readiness 14.6)
  - Источник: AI-readiness 14.6
  - Acceptance: правила и шаблон зафиксированы

- [ ] 🟢 **P3.2.4** Удалить устаревший `docs/design/anton415-hub-redesign-v1.md`
  - Файл: `docs/design/anton415-hub-redesign-v1.md`
  - Источник: AI-readiness 14.5
  - Acceptance: остался только v2

### P3.3 Тесты

- [ ] 🔴 **P3.3.1** Настроить vitest + @testing-library/react
  - Файлы: `package.json`, `vitest.config.ts`, `apps/web/test/setup.ts`
  - Источник: Testing 7
  - Acceptance: `npm run test:run` запускается, выполняется хотя бы один smoke-тест

- [ ] 🔴 **P3.3.2** Тесты money-утилит (`decimalInputToMinorUnits`, `calculatePercentAdditionAmount`, округление)
  - Файл: новый `apps/web/src/shared/lib/money.test.ts`
  - Источник: Testing Top-10 #1
  - Acceptance: ≥ 10 кейсов; покрытие критических веток 100%

- [ ] 🟠 **P3.3.3** Тесты `buildProjectTree` / `buildTaskTree` (циклы, orphans, пустой массив)
  - Файл: новый `apps/web/src/modules/tasks/lib/buildTree.test.ts`
  - Источник: Testing Top-10 #2
  - Acceptance: дерево корректно для всех граничных случаев

- [ ] 🟠 **P3.3.4** Тест `AuthProvider`: редирект на /login при me() 401
  - Файл: новый `apps/web/src/app/providers/AuthProvider.test.tsx`
  - Источник: Testing Top-10 #3
  - Acceptance: при mocked 401 происходит редирект

- [ ] 🟡 **P3.3.5** Тесты `formatRu` для всех форматов дат
  - Файл: новый `apps/web/src/shared/lib/dateRu.test.ts`
  - Источник: Testing Top-10 #8
  - Acceptance: все 7 форматов проверены

- [ ] 🟡 **P3.3.6** Playwright smoke: `/` → `/login` → mock-auth → `/tasks` → создать задачу
  - Файлы: `playwright.config.ts`, `apps/web/e2e/smoke.spec.ts`
  - Источник: Testing Top-10 #9
  - Acceptance: тест проходит локально и в CI

- [ ] 🟢 **P3.3.7** Integration test: Tasks happy path с mocked fetch
  - Файл: `apps/web/src/modules/tasks/TasksPage.test.tsx`
  - Источник: Testing Top-10 #4
  - Acceptance: создание → переключение статуса → удаление

- [ ] 🟢 **P3.3.8** Integration test: Finances ввод суммы → сохранение → отображение
  - Файл: `apps/web/src/modules/finances/FinancesPage.test.tsx`
  - Источник: Testing Top-10 #5
  - Acceptance: суммы корректно нормализуются и сохраняются

- [ ] 🟢 **P3.3.9** a11y smoke (Playwright + axe-core) на 4 страницах
  - Файл: `apps/web/e2e/a11y.spec.ts`
  - Источник: Testing Top-10 #10
  - Acceptance: критические нарушения = 0

### P3.4 Оптимизации

- [ ] 🟢 **P3.4.1** Code-splitting роутов через `lazy()` + `Suspense`
  - Файл: `apps/web/src/app/routes.tsx`
  - Источник: Performance Finding 6
  - Acceptance: initial JS не включает orchestrator/calendar

- [ ] 🟢 **P3.4.2** Прокомментировать `apiBaseUrl` про прод-режим в `api/index.ts`
  - Файл: `apps/web/src/app/api/index.ts:7` (или `shared/api/client.ts` после P2.1.1)
  - Источник: API Integration 5
  - Acceptance: комментарий объясняет почему пустая строка в проде — это OK

---

## Сводная таблица по приоритетам

| Приоритет | Phase 1 | Phase 2 | Phase 3 | Итого |
|---|---:|---:|---:|---:|
| 🔴 Critical | 1 | 3 | 2 | 6 |
| 🟠 High | 4 | 6 | 4 | 14 |
| 🟡 Medium | 5 | 5 | 4 | 14 |
| 🟢 Low | 5 | 5 | 5 | 15 |
| **Всего задач** | **15** | **19** | **15** | **49** |

---

## Прогресс по фазам

- [ ] **Phase 1 завершён** — все 15 задач отмечены, `npm run build` зелёный
- [ ] **Phase 2 завершён** — ни один файл не превышает 250 строк, единый API-клиент, единый layout
- [ ] **Phase 3 завершён** — структура `modules/` на месте, AGENTS.md написан, smoke-тесты в CI

---

## Не делать в этом плане

Решено явно **не** включать (см. ANALYSIS.md раздел 17):

- ❌ React Query / TanStack Query — пока не нужно
- ❌ Zustand / Redux — локального state достаточно
- ❌ Storybook — для 6 примитивов перебор
- ❌ Feature-Sliced Design (entities/widgets/features) — `app + shared + modules` достаточно
- ❌ Собственный design system layer над shadcn
- ❌ E2E на каждую фичу — одного smoke-теста хватит

Эти пункты пересматриваются **только** при появлении 5+ модулей или кросс-страничного server state.

---

## Как использовать этот файл

1. Брать задачи **по порядку фаз** (Phase 1 → 2 → 3) и **по приоритету внутри фазы**.
2. Один PR = одна задача. Не объединять.
3. После мёрджа PR — отметить чекбокс `[x]` и закоммитить обновлённый PLAN.md.
4. Если задача оказалась больше ожидаемого — разрезать её на под-задачи прямо в этом файле.
5. Если задача больше неактуальна — не удалять, а перечеркнуть и добавить причину: `~~P1.1.1~~ (отменено: причина)`.
6. Новые задачи, найденные в процессе — добавлять в конец соответствующей секции с продолжением нумерации.
