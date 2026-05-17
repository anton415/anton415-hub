# Frontend Audit Report: anton415-hub

> Аудит проведён по спецификации `claude_frontend_audit_spec.md`. Анализировался каталог `apps/web/src` — Vite + React 18 + react-router 7 + Tailwind v4 + Radix/shadcn-style примитивы. Бэкенд (Go) в скоупе аудита не находится.

---

## 1. Executive Summary

**Общее состояние.** Фронтенд — компактный (36 файлов, ~5000 строк TS/TSX), типизирован, без явных runtime-багов. Архитектурно это «начинающаяся пагинация»: всё лежит плоско в `apps/web/src/app/components`, под одной папкой — и UI-примитивы, и страницы-«богачи» на 700–1000 строк, которые сами тянут API, держат всё состояние, рисуют header/sidebar/таблицы/диалоги. Модульность пока только декларируется (orchestrator вынесен в отдельную подпапку — правильное направление).

**Главные риски.**
1. `TasksPage.tsx` — 1013 строк, `CalendarPage.tsx` — 763 строки, `FinancesPage.tsx` — 558 строк. Это «AI-hostile»: контекст не помещается, любой агент будет ломать соседние секции.
2. Header + module nav скопирован в 4 разных страницах с расхождениями (Calendar забыл `useAuthGate` guard, Dashboard вообще без модульного nav-bar). При добавлении 5-го модуля придётся править 5 файлов.
3. `CalendarPage.tsx` не делает auth-gate (вызывает `useAuthGate` но не редиректит при `loading`), хранит события только в `useState` — после refresh они исчезают, бэкенда у календаря нет, моковые данные захардкожены в коде.
4. Финансы делают `for (let month = 1; month <= 12; month++) await ...` — последовательные PUT-запросы вместо одного batch. На 12 строк это 12 round-trip.
5. API-клиенты (`AuthApi`, `TodoApi`, `FinanceApi`, `OrchestratorApi`) — четыре копии одного и того же класса с дублированным `request<T>` и envelope-парсингом. Нет 401-редиректа, нет AbortController, нет retry.

**Что уже сделано хорошо.**
- Единая дизайн-система через CSS-переменные (`theme.css`), Tailwind v4, shadcn-стиль примитивов с `cva`.
- Строгий TypeScript (`strict: true`), доменные типы централизованы в `types.ts`, деньги хранятся как `string` и считаются через `bigint` minor units — это профессионально.
- React-router 7 с `RouterProvider`, `StrictMode` включён.
- Auth-gate вынесен в отдельный hook `useAuthGate.ts`, `cancelled` cleanup корректен.
- Orchestrator уже разделён на page + `shared.tsx` с переиспользуемыми кусками — образцовая зона для подражания.

**Готовность к росту.** Проект *сейчас* работоспособен, но при добавлении 2–3 новых модулей (investments, fire, news, обучение) текущая структура развалится: дублирование header'а станет невыносимым, единственный путь — рефакторинг до того, как добавлять features.

### Оценки по областям

| Область | Оценка | Комментарий |
|---|---:|---|
| Performance | 6/10 | Нет очевидных лагов, но последовательные PUT-сейвы в финансах и пересборка `events` массива на каждый рендер в Calendar |
| Stability | 5/10 | TS строгий, но Calendar без guard, события не персистятся, нет error boundary, нет 401-handling |
| UX | 5/10 | Понятная навигация, но Dashboard выглядит как «landing», а Tasks/Finances/Calendar — три разных приложения с разной шапкой |
| UI consistency | 6/10 | Дизайн-токены есть, но `text-danger` / `text-destructive` / `text-success` используются вперемешку; в orchestrator другой стиль кнопок |
| Architecture | 4/10 | Плоская структура, всё в `app/components/*`, никаких слоёв entities/widgets/features |
| Maintainability | 4/10 | Файлы 700–1000 строк, header дублируется 4 раза, mock-данные в коде |
| AI-agent readiness | 3/10 | Большие файлы со смешанными ответственностями, нет AGENTS.md/conventions, неявный контракт «обновляешь TasksPage — перерисуй весь header в Finances» |

---

## 2. Critical Issues

### Issue 1: CalendarPage не имеет auth-guard и теряет данные после refresh

**Severity:** High
**Area:** Stability / UX
**Files:** `apps/web/src/app/components/CalendarPage.tsx`

**Problem.**
- Строка 99: `const { status } = useAuthGate();` — `status` деструктурируется, но никогда не используется. В отличие от Tasks/Finances/Dashboard, нет ветки `if (status === "loading") return ...`. Если пользователь не аутентифицирован, `useAuthGate` делает `navigate('/login')`, но между моментом mount и редиректом успевает отрисоваться календарь со всеми хардкод-данными.
- Строки 106–136: события захардкожены прямо в `useState` со строкой `'2026-05-07'` и т.п. На текущей дате (`2026-05-17`) это уже мусор.
- `setEvents([...events, event])` (строка 213) работает только в памяти — после reload всё сбрасывается. Это создаёт впечатление сломанной фичи у пользователя.

**Why it matters.** Один из четырёх «active» модулей дашборда не работает. Пользователь добавляет событие, перезагружает страницу, событие исчезает — это самый плохой класс UX-багов («баги под вопросом доверия»).

**Recommendation.**
1. Либо честно пометить календарь как `coming-soon` в `Dashboard.tsx:50` и убрать роут до появления API.
2. Либо реализовать `CalendarApi` по образцу `TodoApi` с минимальным `listEvents/createEvent/deleteEvent`.
3. Добавить стандартный `if (status === "loading") return <LoadingScreen />` как в других страницах.
4. Удалить хардкод-события.

**Acceptance criteria.** После refresh события сохраняются (или модуль помечен «скоро»); неавторизованный пользователь не видит UI календаря до редиректа.

---

### Issue 2: Дублирование header'а и модульной навигации в 4 страницах

**Severity:** High
**Area:** Architecture / Maintainability / AI-readiness
**Files:** `TasksPage.tsx:570-625`, `FinancesPage.tsx:253-297`, `CalendarPage.tsx:501-547`, `Dashboard.tsx:75-92`, плюс `OrchestratorFrame` в `orchestrator/shared.tsx:41`

**Problem.** Массив `modules` определён трижды (одинаковый), header с логотипом + nav-баром + кнопкой «Выход» скопирован в Tasks/Finances/Calendar построчно. Dashboard имеет вообще другой header (без nav). Orchestrator имеет свой `OrchestratorFrame`. Пять разных вариантов одного компонента.

**Why it matters.** Добавление нового модуля (investments / news / обучение) требует правки 4–5 файлов и синхронизации `isActive = module.id === "..."` — гарантированный источник пропусков. AI-агенту почти невозможно безопасно изменить такой код: задача «добавь модуль X» затрагивает все страницы.

**Recommendation.** Вынести в `app/layouts/AppShell.tsx`:
- `AppShell` (логотип + nav + logout, принимает `activeModuleId: string`).
- Единый источник списка модулей: `app/config/modules.ts`.
- `Dashboard` использует тот же `AppShell` без `activeModuleId` (или с подсветкой «Хаб»).

**Acceptance criteria.** `modules` определён в одном месте; добавление шестого модуля требует правки только `modules.ts` + создания страницы.

---

### Issue 3: TasksPage — 1013 строк, 12 useState, 4 диалога, всё в одном компоненте

**Severity:** High
**Area:** Architecture / AI-readiness
**Files:** `apps/web/src/app/components/TasksPage.tsx`

**Problem.** Один компонент содержит:
- header + module-nav + mobile sidebar (≈70 строк);
- sidebar со списками и проектами (≈120 строк);
- список задач с рекурсивным `renderTask` (≈80 строк);
- редактирующий Sheet с 8 полями + подзадачами (≈190 строк);
- два Dialog'а: новый проект, редактирование проекта (≈140 строк);
- 12 фрагментов состояния, 9 async-обработчиков;
- логику построения дерева, обработку collapse'ов.

**Why it matters.** Любая правка («хочу добавить теги к задаче») заставляет агента грузить файл целиком. Юнит-тесты невозможны без половины моков. Любое изменение SidebarContent на лету заново создаёт компонент при каждом рендере родителя (строка 522 — это внутренний компонент-функция; на каждый ререндер TasksPage Radix Sheet будет видеть «новый компонент» и потенциально размонтировать поддерево).

**Recommendation.** Разрезать по ответственностям:
- `modules/tasks/TasksPage.tsx` — оркестратор, ~150 строк.
- `modules/tasks/TaskSidebar.tsx` — views + projects + new-project trigger.
- `modules/tasks/TaskList.tsx` + `TaskListItem.tsx` (рекурсивный).
- `modules/tasks/TaskEditSheet.tsx` — Sheet редактирования.
- `modules/tasks/ProjectDialog.tsx` (new + edit как один компонент с режимом).
- `modules/tasks/hooks/useTasks.ts` (загрузка + CRUD) и `useProjects.ts`.
- `modules/tasks/lib/buildTree.ts` (чистые функции `buildProjectTree`, `buildTaskTree`, `formatTaskDate`).

**Acceptance criteria.** Ни один файл в `modules/tasks/` не превышает 250 строк; поведение не изменилось; `SidebarContent` определён вне родителя.

---

### Issue 4: Последовательные PUT-запросы при сохранении финансов

**Severity:** Medium
**Area:** Performance / UX
**Files:** `FinancesPage.tsx:149-178`, `FinancesPage.tsx:188-215`

**Problem.**
```tsx
for (let month = 1; month <= 12; month++) {
  ...
  if (changed) {
    await financeApi.saveExpenseMonth(year, month, { category_amounts: payload });
  }
}
```
Это 1..12 последовательных round-trip'ов. При даже 100 ms latency сохранение года занимает 1.2 сек. Если backend возвращает 4xx посередине, часть месяцев уже сохранена — состояние становится несогласованным.

**Why it matters.** Пользователь видит «Сохраняем…» больше секунды без feedback'а; при ошибке сети — частичный сейв.

**Recommendation.**
- Минимальный фикс: `await Promise.all(monthsToSave.map(m => financeApi.saveExpenseMonth(...)))`.
- Лучше: добавить эндпоинт `PUT /api/v1/finance/expenses/:year` принимающий массив месяцев (нужна синхронизация с бэкендом).
- Показывать `info` per row или общий optimistic update.

**Acceptance criteria.** Сохранение всех 12 месяцев — один сетевой раунд (или N параллельных); если какой-то месяц упал, в UI видно какой именно.

---

### Issue 5: Четыре копии одного и того же API-клиента

**Severity:** Medium
**Area:** Architecture / Stability
**Files:** `authApi.ts`, `todoApi.ts`, `financeApi.ts`, `orchestratorApi.ts`

**Problem.** Каждый клиент:
- определяет свои `DataEnvelope<T>` и `ErrorEnvelope`;
- определяет свой `XxxApiError extends Error`;
- имеет private `async request<T>(path, init)` со 100% идентичной логикой (`credentials: include`, JSON-headers, парсинг envelope);
- в `financeApi` нет ветки `204` — попытка вызвать пустое тело упадёт на `response.json()`.

**Why it matters.** Изменение одного аспекта (например, добавить redirect на `/login` при 401) требует правки в 4 местах. Расхождение между файлами уже есть (`financeApi` без 204-guard).

**Recommendation.** Один базовый `apiClient.ts`:
```ts
export class ApiError extends Error { constructor(public code: string, message: string) { super(message); } }
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> { ... }
```
Каждый «домен-клиент» — это просто набор функций (`todoApi.listTasks = (q) => apiFetch(...)`). Классы лишние, инкапсулировать там нечего, `baseUrl` — модульный const.

**Acceptance criteria.** Одна реализация `request`, обработка 401 централизована, добавление AbortController/retry — правка в одном файле.

---

### Issue 6: Отсутствует Error Boundary и обработка 401 при истечении сессии

**Severity:** Medium
**Area:** Stability
**Files:** `App.tsx`, все API-клиенты, `useAuthGate.ts`

**Problem.** `useAuthGate` редиректит на `/login` только при первом маунте страницы. Если у пользователя сессия истекла во время работы на TasksPage, любой `todoApi.updateTask` вернёт 401 → ошибка покажется как обычный текст в `setError`, пользователь не поймёт что делать. Также: непойманные исключения в render-фазе обрушат всё дерево (нет `<ErrorBoundary>` на уровне App).

**Why it matters.** Базовая стабильность долгоживущего SPA.

**Recommendation.**
- В централизованном `apiFetch` (Issue 5): при `status === 401` — `window.location.href = "/login"` или эмит события на глобальный store.
- Обернуть `RouterProvider` в простую `ErrorBoundary` с fallback'ом «Что-то пошло не так, [перезагрузить]».

**Acceptance criteria.** После прохождения 401 пользователь автоматически попадает на `/login`; runtime-ошибка в одной странице не вешает приложение.

---

### Issue 7: useAuthGate.status имеет только два состояния и блокирует UI

**Severity:** Low
**Area:** Stability / UX
**Files:** `useAuthGate.ts`

**Problem.** `AuthGateStatus = "loading" | "authenticated"` — третьего значения `unauthenticated` нет; при провале аутентификации хук *внутри* делает `navigate('/login')`. Это делает hook нечистым (side-effect внутри hook'а), и в каждой странице приходится повторять одно и то же `if (status === "loading") return <Загрузка>`. На медленной сети пользователь видит белый экран «Загрузка...» дольше секунды на каждом переходе.

**Recommendation.** Лучше:
- Превратить auth в провайдер: `<AuthProvider>` грузит `me()` один раз, кладёт в Context.
- Защищённые роуты обёрнуты в `<ProtectedRoute>` который читает Context и редиректит.
- Тогда переходы между Tasks ↔ Finances не перепроверяют `me()`.

**Acceptance criteria.** Сетевой вызов `me()` выполняется один раз за сессию; нет «Загрузка…» при каждой смене страницы.

---

## 3. Performance Findings

| # | Файл | Проблема | Эффект | Исправление | Приоритет |
|---|---|---|---|---|---|
| 1 | `FinancesPage.tsx:149-215` | 12 последовательных `await` в save | 12× round-trip | `Promise.all` или batch-эндпоинт | High |
| 2 | `TasksPage.tsx:522` | `SidebarContent` определён внутри `TasksPage` | Новый тип компонента на каждый рендер, лишние unmount/mount в Radix Sheet | Вынести наверх (или сделать обычный JSX-фрагмент) | High |
| 3 | `CalendarPage.tsx:219-225` | `getEventsForDate` фильтрует весь массив для каждой ячейки | На year-view это `42 * 12 = 504` фильтраций массива | Один раз построить `Map<dateKey, Event[]>` в `useMemo` | Medium |
| 4 | `CalendarPage.tsx:381-411` | Week/Day view: фильтрация по hour и by-day внутри двойного `map` | O(events × hours × days) на ререндер | Префильтровать события на видимый интервал | Low |
| 5 | `useAuthGate.ts` | `me()` вызывается на каждой защищённой странице | Лишний XHR при каждой навигации | Поднять в Context-провайдер | Medium |
| 6 | `routes.tsx` | Нет code-splitting — все страницы в одном бандле | Initial JS включает orchestrator/calendar даже когда нужен login | `lazy()` + `Suspense` для модулей | Low (бандл пока маленький) |
| 7 | `TasksPage.tsx:818-838` | Внутри Sheet: `tasks.filter(t => t.parent_task_id === editingTask.id)` пересчитывается на каждое нажатие клавиши в любом поле | На больших деревьях задач — заметный input lag | `useMemo` + ключ `editingTask.id` | Low |
| 8 | `Dashboard.tsx:12-67` | `modules` массив строится внутри функции компонента | Каждый рендер заново. Тривиально, но это AI-marker | Поднять в module scope или в `useMemo` | Low |

**Хорошие практики, которые уже есть:** `useMemo`/`useCallback` для `buildProjectTree`, `buildTaskTree`, `projectById` в TasksPage — корректное использование. Не нужно «домеморизовывать» всё подряд.

---

## 4. Stability and Error Handling Findings

**Сценарии, которые сломаются:**

1. **Сессия истекла во время сессии в Tasks.** Любой `update` упадёт, `setError(...)` покажет текст, пользователь жмёт ещё раз — снова ошибка. Нет автоматического редиректа на `/login`. (См. Issue 6.)
2. **Backend вернёт 500 без JSON-тела.** `await response.json()` упадёт необработанным исключением — текущий `try/catch` поймает только `Error`, но сообщение будет невнятным. Минимум — обернуть `response.json()` в `try/catch` или проверить `Content-Type`.
3. **Calendar refresh.** Все события созданные в сессии исчезают (см. Issue 1). Особенно болезненно потому что у пользователя нет визуальной подсказки, что это in-memory only.
4. **TasksPage: «удалить проект» когда в нём есть задачи.** `TasksPage:365-378` — backend, видимо, делает каскад, но на фронте нет подтверждения («удалить проект? все задачи будут удалены»). Это destructive action без confirmation.
5. **Финансы: пустой ответ от `expenses.months`.** `buildExpenseGrid(undefined)` создаёт пустые ячейки — корректно. Но `categories: []` и `financeExpenseCategoryCodes` хардкодная константа: если backend добавит/удалит категорию, фронт не синхронизирован.
6. **Очень длинное имя проекта / задачи.** В TasksPage `<span>{project.name}</span>` без `truncate` (строка 430): длинное имя ломает layout sidebar'а.
7. **OAuth провайдеры:** `oauthProviders.filter((p) => p.kind !== "email")` — если backend изменит kind на `"email_link"`, фильтр перестанет работать.
8. **Финансы: ввод нечислового значения в `<Input type="number">`.** На некоторых браузерах `e.target.value` приходит пустой строкой. `Number(row[code] ?? 0)` — `Number("")` это `0`, OK. Но `normalizeDecimalInputOrRaw("abc")` вернёт `"abc"` и улетит на бэкенд — там валидация должна отбить, но фронт не сигнализирует.
9. **CalendarPage: события с одинаковым `Date.now().toString()`** при быстрых кликах — гипотетически возможен коллизионный id (микроскопически). Лучше `crypto.randomUUID()`.
10. **TasksPage Inbox view:** при создании задачи через быстрый input всегда `project_id: scope.kind === "project" ? scope.projectId : null` — задачи попадают в Inbox даже если scope — это «Сегодня» / «С флажком». Без `flagged: true` для view «flagged» это контр-интуитивно: пользователь создаёт задачу в «С флажком», а она пропадает (без `flagged=true`). Нужно ожидать значения скоупа.
11. **Нет error boundary** на уровне маршрутов — рантайм-ошибка в Tasks обвалит всё SPA до белого экрана.

---

## 5. UX Findings

### 5.1 Navigation

- Dashboard — это **выбор модуля**, не «центр». Это противоречит идее «личного хаба» из ТЗ: на главной нет ни задач на сегодня, ни последних расходов, ни виджетов. Пользователь всегда делает 2 клика: открыть hub → выбрать модуль → работать.
- На разных страницах разный header (см. Issue 2). На Tasks/Finances/Calendar есть module-nav-bar, на Dashboard — нет. Пользователь, попав на Dashboard, не понимает что он *уже* в приложении.
- Orchestrator имеет собственный фрейм без module-nav-bar — нельзя из orchestrator одним кликом перейти в задачи.
- Логотип «anton-hub» ведёт на `/` (Dashboard) — это OK, но название проекта в коде *тоже* «anton-hub», а в README «anton415 Hub». Брендовая неконсистентность.

**Рекомендация.** Dashboard должен показывать **сегодняшние данные** (задачи на сегодня, бюджет месяца, события дня), а не список модулей. Список модулей — в боковом меню/верхнем баре, всегда видимом.

### 5.2 User flows

- **Создать задачу:** хорошо — Enter в верхнем input создаёт сразу. Но создание subtask требует открыть Sheet → ввести → клик/Enter. Нет drag-and-drop, нет inline-subtask.
- **Создать событие в календаре:** клик на день → диалог. Норм.
- **Сохранение финансов:** одна кнопка «Сохранить» на всю годовую таблицу — пользователь правит одну ячейку и теряет понимание «что именно изменилось». Нет diff-индикатора.
- **Logout:** иконка `X` на mobile вместо текста «Выход» — иконка `X` обычно «закрыть», семантически не «выйти». Лучше `LogOut` из lucide.

### 5.3 Forms

- Все формы без HTML5-валидации сверх `required`. Email на login: только `type="email"`, нет проверки домена/допустимости.
- В диалоге задачи поле «Ссылка» принимает любую строку без `type="url"` (хотя input.tsx — общий, можно прокидывать `type`).
- В Calendar нет валидации «endDate ≥ startDate», «endTime > startTime».
- Сохранение в Sheet'е задач — кнопка «Сохранить» внизу всегда активна, даже если ничего не изменилось.

### 5.4 Empty states

- Tasks: «Задач нет» — серый текст. OK.
- Calendar/День: «Нет событий». OK.
- Finances: пустые ячейки — `—`. OK.
- Orchestrator: «No workflows yet» / «No artifacts yet» / «No events yet». OK.
- **Но:** empty state не объясняет, что делать. «Задач нет» — без CTA. «No workflows yet» — без кнопки «Create».

### 5.5 Error states

- Все ошибки показываются как однострочный `<p className="text-sm text-danger">` (Tasks, Finances), `text-destructive` (Orchestrator). Разные классы для одного и того же. (См. UI 6.4.)
- Нет retry-кнопки у ошибки в Tasks/Finances (есть только в Orchestrator `ErrorPanel`). Если запрос упал, пользователь должен перезагрузить страницу.
- Нет различения сетевых ошибок (offline) и серверных (500) — оба показываются одинаковым текстом.

### 5.6 Cognitive load

- TasksPage визуально перегружен: 3 уровня вложенности (project tree → task tree → subtasks внутри Sheet) на одной странице.
- FinancesPage: при `min-width: 900px` таблица расходов выкидывает горизонтальный скролл на mobile — пользователь видит обрезанный год и `overflow-x-auto`.
- В Calendar 4 view-mode'а (Year/Month/Week/Day) — для личного хаба избыточно. Year и Week видятся как «потому что мог».

---

## 6. UI Findings

### 6.1 Layout

- 5 разных шапок. Высота header'а отличается: Dashboard `py-4`, Tasks/Finances `py-3 md:py-4`, Calendar `py-3 md:py-4`. Логотип-блок — то `p-1.5 md:p-2`, то `p-2`. Нужен единый компонент.
- Sidebar в Tasks: фиксированная ширина `w-64`, на ноутбуке (1280px) занимает 20% — OK. На широких экранах не растягивается, контент по центру.

### 6.2 Spacing

- В одном файле используются `gap-2 md:gap-3`, `gap-1 md:gap-2`, `gap-3 md:gap-4`, `gap-4 md:gap-6` — без чёткой системы.
- Card имеет встроенный `gap-6` (`card.tsx:10`) — это решение, но в Orchestrator его переопределяют `pb-0` в `CardHeader`, в Finances `CardHeader` контента почти не имеет (только Save-кнопка).

**Правило, которое стоит зафиксировать:**
- Базовый шаг spacing: **4px**.
- Между связанными блоками: **8px** (`gap-2`).
- Между секциями: **24px** (`gap-6`).
- Внешний padding страницы: **16px mobile / 24px desktop** (`p-4 md:p-6`).
- Поля формы: `space-y-2` для пары label+input, `space-y-4` между полями.

### 6.3 Typography

- В `theme.css:158-198` переопределены `h1..h4`, `label`, `button`, `input` на единый размер. Это работает, но создаёт ловушку: `<h2 className="text-lg">` — *Tailwind перебивает*. Авторы пишут `<h2 className="mb-2">` без размера, надеясь на дефолт, и `<h2 className="text-lg sm:text-xl">` — оба варианта используются.
- Размер шрифта меняется через `text-xs sm:text-sm md:text-base` — нет единого «small/body/lg».

**Правило:**
- `h1` (page title): `text-xl font-medium`.
- `h2` (section title): `text-base font-medium`.
- Body: `text-sm` (default).
- Caption/meta: `text-xs text-muted-foreground`.
- Никогда не использовать `text-[10px]` / `text-[11px]` (есть в CalendarPage).

### 6.4 Colors

- **Двойная система ошибок:** `text-danger` / `bg-danger` (определены в theme.css как `--danger: #ef4444`) и `text-destructive` / `variant: "destructive"` (Radix/shadcn convention). В коде:
  - `text-danger` — Tasks/Finances/Login.
  - `text-destructive` — Orchestrator.
  - `Badge variant="destructive"`, `Button variant="destructive"` — везде.

  Это сбивает с толку. Один из них должен умереть. Рекомендую оставить `destructive` (shadcn-стандарт), и удалить `--danger`/`--success`/`--warning` либо использовать их **только** в кастомных компонентах вне button/badge.

- `--chart-1..5` — используются и как color-of-module (Dashboard), и как «цвет события» (Calendar) — разные домены, одинаковые токены. Без документации легко перепутать.

- Hover-состояния не одинаковые: где-то `hover:bg-accent`, где-то `hover:bg-accent/50`. shadcn-button корректен, в TasksPage sidebar — половинная прозрачность.

### 6.5 Components

| Component | Issue |
|---|---|
| `Card` | Используется и как «контейнер с тенью» (Dashboard), и как «обёртка таблицы» (Finances), и как «секция формы» (Orchestrator). Семантика смыта. |
| `CardTitle` | Рендерится как `h4` — конфликт с `h1/h2` иерархией страницы. |
| `Button` (icon size + child) | На mobile в header'е `<Button variant="outline" size="sm">` содержит `<X />` для logout — иконка-семантика «закрыть» |
| `Sheet` vs `Dialog` | В TasksPage Sheet для редактирования задачи, Dialog для создания/редактирования проекта. Логика смешана — задача редактируется в боковой панели, проект — в модалке. Если есть правило (например, «короткие действия — Dialog, длинные — Sheet»), его стоит задокументировать. |
| `Badge` | Использует `text-xs` — при русских словах «архивирован» текст в один ряд не помещается. |
| `Input type="number"` | Используется почти везде где деньги/проценты. Но `type="number"` плохо работает с decimal на iOS Safari и не поддерживает запятую как separator. Лучше `inputMode="decimal"` + `type="text"`. |

### 6.6 Responsive behavior

- `xs:` — Tailwind по дефолту **нет** breakpoint `xs`. В коде встречается `hidden xs:inline` (TasksPage, FinancesPage, CalendarPage) — это «не работает» (или работает только если `xs` определён в Tailwind config; в `tailwind.css` я конфигурации не вижу). Проверить, скорее всего эти классы no-op.
- FinancesPage таблица расходов: `style={{ minWidth: "900px" }}` (строка 348) — на mobile (375px) пользователь скроллит горизонтально на 2.4 экрана.
- CalendarPage Year view: `grid-cols-3 md:grid-cols-4` — на мобильнике 3 колонки = 4 строки месяцев, ячейки превращаются в `text-[10px]`. Нечитаемо.
- TasksPage mobile sidebar: рендерится через Sheet — OK.
- Touch targets: иконки `size-3` / `size-4` (12-16px) в активных кнопках — меньше WCAG-минимума 44×44 (родительская кнопка `h-8` = 32px высоты, тоже маловата).

---

## 7. Frontend Architecture Findings

**Текущая структура:**

```text
apps/web/src/
  main.tsx
  styles/
    index.css, theme.css, tailwind.css
  app/
    App.tsx
    routes.tsx
    api/
      index.ts, types.ts, financeFormat.ts
      authApi.ts, todoApi.ts, financeApi.ts, orchestratorApi.ts
    hooks/
      useAuthGate.ts          ← единственный hook
    components/
      Dashboard.tsx           ← страница
      LoginPage.tsx           ← страница
      TasksPage.tsx           ← страница 1013 строк
      FinancesPage.tsx        ← страница 558 строк
      CalendarPage.tsx        ← страница 763 строки
      orchestrator/           ← начало модуля
        OrchestratorHomePage.tsx
        OrchestratorProjectsPage.tsx
        OrchestratorWorkflowPage.tsx
        OrchestratorPages.tsx    ← barrel
        shared.tsx               ← общие компоненты модуля
      ui/                       ← shadcn примитивы
        button.tsx, card.tsx, dialog.tsx, sheet.tsx, badge.tsx,
        input.tsx, label.tsx, tabs.tsx, select.tsx, textarea.tsx,
        checkbox.tsx, utils.ts
```

**Слабые места:**

1. `components/` смешивает страницы, UI-примитивы и доменные компоненты. Это плоско и понятно сейчас, но при росте до 6 модулей станет каша.
2. Нет границы между shared UI и module UI. Orchestrator уже отделён в подпапку — нужно сделать так же для остальных.
3. Все API-клиенты в `app/api/`, но `financeFormat.ts` — это **бизнес-логика денег**, а не API. Лежит не на своём месте.
4. Нет папки `hooks/` для модульных хуков (есть только `useAuthGate`).
5. Нет папки `lib/` для чистых утилит (date helpers, валидаторы).

**Минимальная целевая структура (под текущий размер проекта):**

```text
apps/web/src/
  main.tsx
  styles/                          ← как есть
  app/
    App.tsx, routes.tsx
    layouts/
      AppShell.tsx                 ← общая шапка + nav (см. Issue 2)
      ProtectedRoute.tsx           ← guard через Auth context
    providers/
      AuthProvider.tsx             ← me() один раз
  shared/
    api/
      client.ts                    ← один apiFetch (Issue 5)
      types.ts                     ← как есть
    ui/                            ← перенести из components/ui
    lib/
      cn.ts, money.ts (бывший financeFormat), dateRu.ts (из CalendarPage)
    config/
      modules.ts                   ← список модулей в одном месте
  modules/
    auth/
      LoginPage.tsx
      api.ts
    dashboard/
      DashboardPage.tsx
    tasks/
      TasksPage.tsx                ← оркестратор
      components/                  ← TaskList, TaskItem, TaskEditSheet, ProjectDialog, TaskSidebar
      hooks/                       ← useTasks, useProjects
      api.ts                       ← todoApi
      types.ts (или re-export из shared)
    finances/
      FinancesPage.tsx
      components/                  ← ExpensesTable, IncomeTable, SettingsTable
      api.ts
    calendar/
      CalendarPage.tsx
      components/                  ← YearView, MonthView, WeekView, DayView, EventDialog
      api.ts
      lib/dateRu.ts (если только календарю нужно)
    orchestrator/                  ← уже так, не трогать
```

**Что не делать:**
- Не вводить FSD/entities/widgets/features во всех слоях. Для 6 модулей это перебор. Хватит `app/ + shared/ + modules/`.
- Не вводить Redux/Zustand сейчас. Локальное состояние + Context для auth достаточно.
- Не пытаться переезжать одним PR. План в разделе 15.

---

## 8. Component Quality Review

| Component | Problem | Suggested refactor | Priority |
|---|---|---|---|
| `TasksPage.tsx` (1013 строк) | Делает всё: header, sidebar, list, edit sheet, 2 dialog'а, CRUD | Разрезать на 7 частей (см. Issue 3) | High |
| `CalendarPage.tsx` (763 строки) | 4 view-renderer'а внутри + dialog + mock data | Вынести `YearView/MonthView/WeekView/DayView/EventDialog`, `formatRu` в `lib/dateRu.ts` | High |
| `FinancesPage.tsx` (558 строк) | Header + 3 таблицы (expenses/income/settings) + save-логика | `ExpensesTable.tsx`, `IncomeTable.tsx`, `SettingsTable.tsx`, hook `useFinanceYear(year)` | High |
| `SidebarContent` внутри TasksPage | Объявлен как локальный компонент-функция | Поднять наверх или сделать обычным JSX, не функцией | High |
| `Dashboard.tsx` | Это «landing-страница», а не хаб | Превратить в дашборд с виджетами (или удалить и сделать `/` = TasksPage) | Medium |
| `orchestrator/shared.tsx` (283 строки) | 14 экспортов одного файла | Разделить на `OrchestratorFrame.tsx`, `tables/*`, `lib/format.ts`, типы | Low |
| `useAuthGate` | Side-effect (navigate) внутри hook'а | `AuthProvider` + `ProtectedRoute` | Medium |
| `Card` | Используется и как контейнер таблицы, и как карточка — разная семантика | Не разделять компонент, но в `frontend-guidelines.md` написать когда применять | Low |
| `Input type="number"` | Запятые/локаль не работают; на iOS клавиатура не decimal | Создать `MoneyInput` (`inputMode="decimal"`, `type="text"`) и использовать в Finances | Medium |
| `BackButton`/`Link to="/"` | Дублируется в 3 шапках | Часть `AppShell` | Medium |

---

## 9. State Management Review

**Что хорошо:**
- Состояние — локальный `useState` в каждом компоненте. Для проекта такого размера это правильный выбор.
- Auth-состояние — единственное «глобальное», и оно живёт в hook'е (хотя и с дублированием me-вызова, см. Issue 7).
- `Scope` в TasksPage и `viewMode` в Calendar — discriminated unions/literal types. Хорошо.

**Что плохо:**
- **Дублирование source-of-truth в финансах.** Есть `expenses` (raw response) и `expenseGrid` (string-формат для inputs). После save вызывается `refresh()` который перетирает оба. Между ними легко рассинхронизироваться (например, при оптимистичных апдейтах). Лучше держать один state и преобразовывать на лету.
- **`tasks` массив и `taskTree` (memo) одновременно** — это OK, потому что tree — derived. Хорошо.
- **Server state ≠ client state.** Сейчас они смешаны: одни и те же `tasks` — это и кэш сервера, и UI-состояние. Нет invalidation strategy, нет background refetch, нет staleness. Для текущего размера терпимо, но если появится 5+ модулей — пора смотреть в сторону **TanStack Query** (React Query). Я бы пока **не** вводил его — преждевременная оптимизация.
- **`HomeState`/`FinanceState`/`TodoState`** в `types.ts` — определены, но не используются (компоненты держат состояние плоско через useState). Мёртвый код.
- **`AppPath`/`AuthState`** в `types.ts` — тоже выглядит неиспользованным.

**Рекомендации:**
1. Не вводить Zustand/Redux.
2. Завести `AuthContext` для auth-state.
3. Удалить мёртвые типы `TodoState`, `FinanceState`, `HomeState`, `AppPath` из `types.ts` (или подтвердить, что они нужны).
4. Когда понадобится cross-page кэш или background refetch — взять TanStack Query, не раньше.

---

## 10. API Integration Review

**Проблемы:**

1. **Четыре копии `request<T>`** (см. Issue 5).
2. **Нет AbortController.** Если пользователь быстро переключает scope в TasksPage, может прилететь старый ответ и перезаписать новый. `cancelled` flag в `useAuthGate` использован, но в `loadTasks` — нет.
3. **Нет retry для transient errors** (5xx, network). Сейчас одна ошибка — финал.
4. **Нет 401-handling** (см. Issue 6).
5. **`apiBaseUrl` в `api/index.ts:7`:** `VITE_API_BASE_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "")`. В проде пустая строка → запросы относительные. Это работает, потому что в проде frontend и API на одном домене (Caddy). Стоит прокомментировать.
6. **`financeApi.request` отличается от других:** нет ветки `204`. Согласовать (см. Issue 5).
7. **Типизация envelope:** `DataEnvelope<T> & ErrorEnvelope` — допускает что в одном ответе есть и `data` и `error`. Лучше discriminated union: `{ data: T } | { error: {...} }`.
8. **DTO === domain model.** `TodoTask` приходит с сервера 1:1. Нормально для текущего размера, но: даты — это `string`, что вынуждает каждый раз парсить. Если бы был слой `mapDto → domain`, можно было бы сделать `Date` и убрать дубли парсеров (`new Date(\`${date}T00:00:00\`)` в TasksPage:141, `parseISO` в Calendar). Не критично сейчас.
9. **`OrchestratorApi` — функции с `.bind(orchestratorApi)`** в `OrchestratorWorkflowPage.tsx:156-188`. Это уродливая часть классового подхода. Будь это free function, `.bind` бы не понадобился.

**Рекомендации:**
- Сделать `shared/api/client.ts` с единым `apiFetch<T>`, поддерживающим `signal: AbortSignal`.
- В каждом модуле — `api.ts` с функциями (не классами).
- Discriminated union для envelope.
- 401 → редирект на login. 5xx → optional retry с jitter (но *не* в этом PR).

---

## 11. Loading / Empty / Error State Matrix

| Screen / Module | Loading | Empty | Error | Recommendation |
|---|---|---|---|---|
| LoginPage | `disabled={loading}` на полях | n/a | `text-danger` | Skeleton отсутствует — OK для логина |
| Dashboard | «Загрузка…» полноэкранный текст | n/a (модули хардкодные) | n/a | Превратить в дашборд с виджетами; добавить skeleton |
| Tasks | «Загрузка…» текст в списке + полноэкранный | «Задач нет» текст | `text-danger` строка, **нет retry** | Добавить retry-кнопку; добавить skeleton 3 task-rows |
| Finances | «Загрузка…» строка над таблицей | `—` в ячейках | `text-danger` строка, **нет retry** | Добавить retry; skeleton-таблицу |
| Calendar | n/a (нет async) | «Нет событий» | n/a | Когда появится API — нужно всё добавить |
| Orchestrator Home | `LoadingScreen` полный | «No workflows» / «No connected projects» | `ErrorPanel` с retry ✓ | Образец — копировать в Tasks/Finances |
| Orchestrator Projects | `LoadingScreen` | «No connected projects» | `ErrorPanel` с retry ✓ | OK |
| Orchestrator Workflow | `LoadingScreen` | «No approvals/artifacts/events» | `ErrorPanel` с retry ✓ | OK |

**Правило (зафиксировать):**
- **Loading**: skeleton всего, что будет (а не «Загрузка…»). Полноэкранный текст — только при первичной проверке auth.
- **Empty**: текст + иконка + кнопка CTA (если применима: «Создать первую задачу»).
- **Error**: компонент `ErrorPanel` из orchestrator с message + retry. Сделать его shared.

---

## 12. Accessibility Baseline

**Проблемы:**

1. **`<button>` vs `<div onClick>`:**
   - `TasksPage.tsx:405-441` — sidebar row с `onClick` на `<div>`, не `<button>`. Не доступно с клавиатуры, screen reader не объявит как кнопку.
   - `TasksPage.tsx:418-425` — collapse chevron на `<span>` с `onClick`. То же самое.
   - `CalendarPage.tsx:320-347` — `<Card onClick>` для дня. Лучше обернуть в `<button>` или `<Card asChild role="button">`.
2. **Нет focus-visible стилей** на самописных кликабельных `div`/`span` (в shadcn-кнопках есть).
3. **`<input type="number">` без `<Label>`** в финансах (`<label>` есть, но не связан через `htmlFor`).
4. **`<img alt>`** — изображений нет, не применимо. Иконки lucide рендерят `<svg>` без `aria-hidden` — для декоративных это нормально, но кнопки-иконки (logout `X`) без `aria-label="Выход"` — невидимы для screen reader. См. `TasksPage:621`: `<X className="size-4 sm:hidden" />` — кнопка вообще без текста на mobile.
5. **Контраст:** `text-muted-foreground` (`#717182` на `#ffffff`) — 4.5:1 borderline; `text-[10px] text-muted-foreground` в CalendarPage — 10px серый текст, не пройдёт WCAG AA по размеру.
6. **Keyboard navigation в кастомных списках** не работает (стрелки/Tab — только нативный таб-ордер, который сломан из-за `<div onClick>`).
7. **Modal focus trap** — Radix Dialog/Sheet это даёт из коробки. OK.

**Минимальный план исправлений (baseline):**
- Заменить все `<div onClick>` / `<span onClick>` на `<button>` с `type="button"`.
- Добавить `aria-label` на icon-only buttons (`logout`, `more`, `collapse`).
- Убедиться, что `<label htmlFor>` соединён со всеми input'ами форм.
- Убрать `text-[10px]` — минимум `text-xs` (12px).

---

## 13. Testing Recommendations

Сейчас тесты **отсутствуют** (см. `package.json:13-14`) — оба скрипта echo. Это нормально для прототипа, но критично перед расширением.

**Top-10 тестов (по соотношению ценность/стоимость):**

| # | Test | Type | Why it matters | Priority |
|---|---|---|---|---|
| 1 | `money.test.ts`: `decimalInputToMinorUnits`, `calculatePercentAdditionAmount`, округление | unit | Деньги — критично, BigInt-арифметика легко ломается | **Critical** |
| 2 | `buildProjectTree` / `buildTaskTree` для разных входов (циклы, orphans, пустой массив) | unit | Защита от обвала sidebar/list | High |
| 3 | `useAuthGate` (или `AuthProvider`): редирект на `/login` при `me()` 401 | unit | Регрессия на основной flow | High |
| 4 | Tasks happy path: открыть → создать → переключить статус → удалить (с mocked fetch) | integration (Playwright или Vitest+jsdom) | Самый важный модуль | High |
| 5 | Finances: ввод суммы → сохранение → отображение (с mocked PUT) | integration | Деньги + UI | High |
| 6 | Login flow: email отправка успешно/с ошибкой, OAuth redirect | integration | Вход — единственная защищённая точка | High |
| 7 | Orchestrator: list → open workflow → approve spec (с mocked API) | integration | Сложный многоэкранный flow | Medium |
| 8 | `formatRu` для всех форматов дат (год, месяц, день недели) | unit | Локализация хрупкая | Medium |
| 9 | E2E smoke (Playwright): открыть `/`, попасть на `/login`, после mock-auth попасть в `/tasks`, создать задачу | e2e | Защита от регрессии «приложение не открывается» | Medium |
| 10 | a11y smoke (Playwright + axe-core) на 4 страницах: критичные нарушения = 0 | accessibility | Гарантия baseline | Low |

**Что НЕ тестировать:**
- shadcn-примитивы (`Button`, `Card`, `Input`) — это тонкая обёртка, тесты дублируют Radix.
- Конкретные tailwind-классы — хрупко и не ценно.
- Layout shifts — лучше визуальная регрессия в Playwright чем jsdom.

**Инструменты (минимум):**
- `vitest` + `@testing-library/react` для unit/integration.
- `playwright` для 1 smoke-e2e.
- `@axe-core/playwright` для a11y.

---

## 14. AI-Agent Readiness Review

### 14.1 What helps AI agents

- **Строгий TypeScript.** Агент видит контракт сразу.
- **Маленький проект (36 файлов).** Helmет полностью помещается в контекст одной задачи.
- **Доменные типы централизованы** в `types.ts` — агент находит контракт без поиска.
- **Russian inline labels** в коде (`'Загрузка…'`, `'Сегодня'`) — агент не путается с i18n.
- **shadcn/ui** — широко известный паттерн, агент знает API из коробки.
- **Vite + react-router 7** — стандартный стек, без экзотики.

### 14.2 What blocks AI agents

- **Файлы 700–1000 строк.** Любая задача про задачи/календарь/финансы заставляет агента читать всё или работать вслепую. Это **главный** AI-блокер.
- **Дублирование header'а в 4 местах** (см. Issue 2) — задача «добавь раздел в nav» = риск пропустить файл.
- **Нет AGENTS.md / CLAUDE.md на уровне `apps/web/`.** Агент не знает правил: «куда класть новые страницы», «использовать класс или функцию», «какой токен ошибки».
- **Двойная система токенов** (`danger` vs `destructive`, см. UI 6.4) — агент будет случайно выбирать.
- **Mock-данные в коде** (`CalendarPage.tsx:106-136`) — агент может думать что это «правильный» паттерн и продолжать так делать.
- **Side-effect в hook'е** (`useAuthGate` navigate) — нетривиальный для понимания паттерн.
- **`bind(orchestratorApi)`** — следствие класса; агент будет копировать паттерн.
- **Магические значения:** `NO_PROJECT_VALUE = "__none__"` в TasksPage — без объяснения почему именно так.

### 14.3 Files that are risky for AI edits

| File | Risk | Reason |
|---|---|---|
| `TasksPage.tsx` | **Critical** | 1013 строк, 12 useState, 4 диалога. Любое локальное изменение может сломать соседнее |
| `CalendarPage.tsx` | **Critical** | 763 строки, 4 view-renderer'а внутри одной функции |
| `FinancesPage.tsx` | **High** | 558 строк, 3 таблицы, save-логика смешана с UI |
| `types.ts` | Medium | 350 строк типов — много, но плоско. Безопасно, пока агент не начнёт «чистить мёртвые типы» (см. State Mgmt) |
| `orchestrator/shared.tsx` | Low | 283 строки, но компоненты маленькие, экспорты атомарны |
| `theme.css` | High | Изменение токена меняет цвет везде, без точечной проверки агент не поймёт что сломал |

### 14.4 Recommended conventions

```text
Naming
- Pages:        modules/<module>/<Module>Page.tsx
- Components:   modules/<module>/components/<Name>.tsx
- Hooks:        modules/<module>/hooks/use<Name>.ts
- API:          modules/<module>/api.ts (free functions, not classes)
- Lib:          shared/lib/<name>.ts (pure, side-effect free)

File size hard limits
- Component file:   ≤ 250 lines (warning at 200)
- Hook file:        ≤ 150 lines
- Page orchestrator: ≤ 200 lines

State
- Server state in component-local useState until 3+ pages share it. Then AuthContext-style provider.
- No Zustand/Redux until 2 modules demand cross-page state.

Styling
- Tailwind utility classes only. No inline styles except dynamic values (event.color).
- Use semantic tokens: bg-primary, text-destructive (NOT text-danger).
- One spacing scale: gap-2 / gap-4 / gap-6.

Errors
- One <ErrorPanel> shared component (today only in orchestrator/shared.tsx).
- Always include retry button.

Empty/Loading
- Skeleton for data fetches >300ms.
- Empty state must include action (CTA).

API
- All requests go through shared/api/client.ts apiFetch<T>.
- 401 → redirect to /login (handled centrally).
- Functions, not classes.
```

### 14.5 Recommended documentation

Минимальный набор (только что реально нужно):

1. **`apps/web/AGENTS.md`** (или `CLAUDE.md`) — правила выше + ссылки на «что где лежит».
2. **`docs/frontend-guidelines.md`** — UI conventions: цвета, типографика, spacing, когда Card/Sheet/Dialog.
3. **`docs/ai-agent-rules.md`** — правила задач и шаблон.
4. Удалить устаревший `anton415-hub-redesign-v1.md`, оставить только v2.

**Не нужно создавать:**
- Storybook (для 6 примитивов перебор).
- Архитектурная вики с диаграммами (плоский AGENTS.md достаточно).
- ADR (Architecture Decision Records) — пока проект персональный, излишне.

### 14.6 Suggested `ai-agent-rules.md`

```markdown
# AI Agent Rules — anton415-hub frontend

## Что ты можешь делать без спроса
- Добавлять новые компоненты внутри существующего модуля.
- Исправлять ошибки TypeScript.
- Добавлять unit-тесты.
- Заменять `<div onClick>` на `<button>`.

## Что требует подтверждения
- Создание нового модуля (`modules/<name>/`).
- Изменение `shared/ui/*` или `theme.css` — затрагивает весь UI.
- Введение новой библиотеки в `package.json`.
- Изменение API-контракта (`shared/api/types.ts`).

## Что запрещено
- Файлы > 250 строк. Если упёрся — разрежь.
- Inline стили (кроме динамических переменных типа `event.color`).
- Классы-сервисы вместо free-функций.
- Захардкоженный mock-data в production-компонентах. Mock — только в тестах.
- Side-effects (navigate, location.href) внутри hook'ов. Только в обработчиках событий и effect'ах.
- Преждевременная мемоизация (`useMemo`/`useCallback` без измеренной проблемы).
- Добавление Zustand/Redux/React Query без явного запроса.

## Перед началом задачи прочитай
1. `apps/web/AGENTS.md`
2. Файлы, перечисленные в задаче `Files to inspect first`.
3. Соответствующий `modules/<x>/api.ts` если задача касается данных.

## Перед PR
- `npm run check` — без ошибок.
- `npm run build` — успешно.
- Если файл стал > 250 строк — разрезать.
- Если задача касается UI — приложить screenshot (даёт человек).

## Не делать
- Не «улучшать» соседний код «по ходу».
- Не переименовывать публичные экспорты без явной просьбы.
- Не удалять «неиспользуемые» типы без `grep -r` и подтверждения.

## Формат задачи (Codex template)
См. `docs/frontend-guidelines.md` → шаблон задачи.
```

---

## 15. Recommended Refactoring Plan

### Phase 1: Safe cleanup (1–2 дня)

**Цель:** убрать самые очевидные риски без изменения поведения.

Задачи:
1. Удалить mock-события из CalendarPage; либо пометить модуль `coming-soon`, либо завести `calendarApi` стаб.
2. Добавить `aria-label` всем icon-only кнопкам (logout, more, collapse).
3. Заменить `<div onClick>` / `<span onClick>` на `<button>` в TasksPage sidebar и chevron'ах.
4. Исправить `text-[10px]` → `text-xs` в CalendarPage Year view.
5. Унифицировать `text-danger` → `text-destructive` (или наоборот) и удалить дубли в theme.css.
6. Добавить простую `ErrorBoundary` на уровне App с fallback'ом.
7. Добавить `aria-label` на logout-X в Tasks/Finances/Calendar.
8. Удалить мёртвые типы (`TodoState`, `FinanceState`, `HomeState`, `AppPath`, `AuthState`) после проверки `grep -r`.
9. Заменить `Number.isFinite` валидацию суммы на проверку через `decimalInputToMinorUnits` для консистентности.

Ожидаемый результат: тот же UI, чище код, безопаснее для агентов.
Риск: низкий. Каждая задача — изолированный коммит.
Критерии готовности: `npm run build` зелёный, ручной обход 5 экранов без регрессий.

---

### Phase 2: Structure and UX stabilization (3–5 дней)

**Цель:** улучшить архитектуру и устранить дублирование без переноса всех модулей.

Задачи:
1. Создать `app/layouts/AppShell.tsx` и `shared/config/modules.ts`. Перенести header из Tasks/Finances/Calendar на AppShell. Dashboard — туда же.
2. Создать `app/providers/AuthProvider.tsx` + `app/layouts/ProtectedRoute.tsx`. Заменить `useAuthGate` на чтение Context. Один `me()` за сессию.
3. Создать `shared/api/client.ts` с `apiFetch<T>` + 401-handling + AbortSignal. Переписать 4 класса как набор free функций.
4. Разрезать TasksPage на TasksPage / TaskSidebar / TaskList / TaskListItem / TaskEditSheet / ProjectDialog / useTasks / useProjects. Без изменения поведения.
5. Разрезать FinancesPage на FinancesPage / ExpensesTable / IncomeTable / SettingsTable / useFinanceYear. Параллелизировать save (`Promise.all`).
6. Разрезать CalendarPage на CalendarPage / YearView / MonthView / WeekView / DayView / EventDialog / formatRu → `shared/lib/dateRu.ts`. Подключить `calendarApi` (или явно временно остановить персистентность с TODO).
7. Создать `shared/ui/ErrorPanel.tsx` (из orchestrator) и применить в Tasks/Finances.
8. Создать `shared/ui/MoneyInput.tsx` с `inputMode="decimal"` и использовать в Finances.

Ожидаемый результат:
- ни одного файла > 250 строк;
- one source of truth для модулей и шапки;
- single API client.

Риск: средний. TasksPage / FinancesPage — большие. Делать по одному PR на модуль.
Критерии готовности:
- Поведение каждого экрана не изменилось (ручной обход).
- `npm run build` зелёный.
- Файлы укладываются в лимит.

---

### Phase 3: AI-friendly architecture (2–3 дня)

**Цель:** сделать проект понятным для агентов и подготовить к росту.

Задачи:
1. Завести структуру `modules/<name>/` (см. раздел 7). Перенести каждый модуль (auth, dashboard, tasks, finances, calendar, orchestrator).
2. Написать `apps/web/AGENTS.md` (или `CLAUDE.md`) с правилами из раздела 14.4.
3. Написать `docs/frontend-guidelines.md` (3–4 страницы: токены, spacing, типографика, когда Card/Sheet/Dialog).
4. Написать `docs/ai-agent-rules.md` (содержание из 14.6).
5. Удалить `apps/web/src/app/components/orchestrator/OrchestratorPages.tsx` (barrel дублирует имя файла).
6. Добавить vitest + 5 unit-тестов (money, buildTree, formatRu).
7. Добавить Playwright smoke (`/` → редирект → `/login` → mock-auth → `/tasks` → создать задачу).
8. Code-splitting роутов через `lazy()` (бонус — не критично).

Ожидаемый результат: новый агент, прочитав AGENTS.md, безопасно делает task < 4 файлов.
Риск: низкий. В основном переименование + документация.
Критерии готовности:
- Все правила задокументированы.
- Тесты в CI.
- Папка `modules/` существует.

---

## 16. Codex-ready Tasks

> 8 задач, отранжированы по соотношению ценность / безопасность. Каждая — на 1–3 файла, безопасная, с явным acceptance.

### Task T1 — Fix CalendarPage auth-guard and remove mock events

```markdown
## Task
Add proper auth-loading guard to CalendarPage and remove hardcoded mock events.

## Context
`CalendarPage.tsx:99` destructures `status` from `useAuthGate` but never uses it.
Other pages (Tasks, Finances, Dashboard) render `<div>Загрузка…</div>` while
`status === "loading"`. Also lines 106–136 hardcode three example events with
dates from May 2026, which already look like stale data.

## Files to inspect first
- apps/web/src/app/components/CalendarPage.tsx
- apps/web/src/app/components/TasksPage.tsx (lines 566–568 for guard pattern)

## Constraints
- Do not introduce calendarApi yet — events should start as empty array.
- Do not change other modules.
- Keep all view-rendering logic intact.

## Expected changes
1. Add `if (status === "loading") return <div ...>Загрузка…</div>;` after destructuring.
2. Change `useState<CalendarEvent[]>([...])` to `useState<CalendarEvent[]>([])`.
3. Replace `Date.now().toString()` event id with `crypto.randomUUID()`.

## Do not change
- View renderers (`renderYearView`, `renderMonthView`, etc.).
- `formatRu` helper.
- Layout / header.

## Acceptance criteria
- Page redirects to /login when unauthenticated (no flash of calendar UI).
- After refresh no fake events appear.
- `npm run build` passes.

## Manual test checklist
- [ ] Open `/calendar` while logged out → redirects to /login.
- [ ] Open `/calendar` while logged in → empty calendar.
- [ ] Click on a day → dialog opens → create event → event appears.
- [ ] Refresh page → event disappears (in-memory, expected for now).
- [ ] No console errors.
```

### Task T2 — Extract AppShell layout and unify module navigation

```markdown
## Task
Replace the duplicated header block in TasksPage, FinancesPage, CalendarPage,
Dashboard with a single `AppShell` layout component reading from a shared
modules config.

## Context
Today the same `<header>` with logo + module nav + logout is copy-pasted four
times with subtle differences. The `modules` array is redeclared in each page.
Adding a new module requires editing 4+ files.

## Files to inspect first
- apps/web/src/app/components/TasksPage.tsx:570-625
- apps/web/src/app/components/FinancesPage.tsx:253-297
- apps/web/src/app/components/CalendarPage.tsx:501-547
- apps/web/src/app/components/Dashboard.tsx:75-92

## Constraints
- Visual output must be pixel-identical (acceptable: 1–2px differences).
- Do not touch orchestrator pages (they have OrchestratorFrame).
- Do not introduce a router-level layout yet — pass `activeModuleId` as prop.

## Expected changes
1. Create `apps/web/src/shared/config/modules.ts` exporting `MODULES`.
2. Create `apps/web/src/app/layouts/AppShell.tsx` accepting
   `{ activeModuleId?: string; children: ReactNode }` rendering header +
   module nav + logout.
3. In TasksPage / FinancesPage / CalendarPage / Dashboard, replace the inline
   `<header>` with `<AppShell activeModuleId="tasks">...content...</AppShell>`.
4. Remove the duplicated `modules` const from each page.

## Do not change
- Page-specific content below the header.
- TasksPage mobile sidebar (Sheet) logic.

## Acceptance criteria
- 4 pages render identical header.
- Changing `MODULES` adds the item to all pages.
- TypeScript passes.

## Manual test checklist
- [ ] Navigate Tasks → Finances → Calendar → Dashboard: header looks the same.
- [ ] Active module is highlighted on each page.
- [ ] Logout works on all pages.
- [ ] Mobile menu on TasksPage still opens.
```

### Task T3 — Centralize API client with single apiFetch and 401 handling

```markdown
## Task
Replace four duplicated API classes (`AuthApi`, `TodoApi`, `FinanceApi`,
`OrchestratorApi`) with one `apiFetch<T>` helper and per-domain function
modules.

## Context
Each class has the same private `request<T>` method with identical envelope
parsing. `financeApi` is missing the 204 branch. No 401 handling anywhere —
on session expiry the user sees a generic error.

## Files to inspect first
- apps/web/src/app/api/authApi.ts
- apps/web/src/app/api/todoApi.ts
- apps/web/src/app/api/financeApi.ts
- apps/web/src/app/api/orchestratorApi.ts
- apps/web/src/app/api/index.ts

## Constraints
- Public API of each module from the consumer side (e.g. `todoApi.listTasks(...)`)
  must remain callable with the same shape — refactor types, keep export names.
- Add 401 handling: on 401, `window.location.href = "/login"`.
- Single `ApiError` class.

## Expected changes
1. Create `apps/web/src/app/api/client.ts` with `apiFetch<T>(path, init)` +
   `ApiError`.
2. Convert each API file into a `const todoApi = { listTasks(...), ... }`
   object using free functions.
3. Remove four `XxxApiError` classes; update imports.
4. Update 4–6 call sites in pages that catch the specific error classes to
   catch `ApiError`.

## Do not change
- API URLs.
- Page-level error UI (just use the renamed `ApiError`).

## Acceptance criteria
- `npm run build` passes.
- Existing flows work.
- A 401 response from any endpoint redirects to /login.

## Manual test checklist
- [ ] Login flow works.
- [ ] Tasks list loads.
- [ ] Finances year loads / saves.
- [ ] Orchestrator workflow opens.
- [ ] (Manual) When session expires (clear cookie, then click "save task")
      → redirected to /login.
```

### Task T4 — Split TasksPage into focused components

```markdown
## Task
Split `TasksPage.tsx` (1013 lines) into a thin orchestrator + 6 focused
components and 2 hooks.

## Context
The file mixes header, sidebar, list rendering, edit-sheet, project dialogs,
and 9 async handlers. It's the single biggest AI-blocker in the codebase.

## Files to inspect first
- apps/web/src/app/components/TasksPage.tsx (read all 1013 lines)

## Constraints
- After Task T2, header is already AppShell — assume that.
- Do not change UX. No new features.
- Do not introduce React Query / Zustand.
- Each new file ≤ 250 lines.

## Expected changes
Create under `apps/web/src/modules/tasks/`:
- `TasksPage.tsx` — orchestrator (~150 lines).
- `components/TaskSidebar.tsx` — views list + projects tree + "New project".
- `components/TaskList.tsx` + `TaskListItem.tsx` (recursive).
- `components/TaskEditSheet.tsx` — the entire edit sheet.
- `components/ProjectDialog.tsx` — both new and edit (mode prop).
- `hooks/useTasks.ts` — tasks state + CRUD.
- `hooks/useProjects.ts` — projects state + CRUD.
- `lib/buildTree.ts` — pure `buildProjectTree`, `buildTaskTree`, `formatTaskDate`.

## Do not change
- API contracts (`todoApi` calls).
- Visual layout.
- Mobile sidebar (Sheet) behavior.

## Acceptance criteria
- No file > 250 lines.
- All existing flows work (create/edit/complete task, create/edit/delete
  project, view filters).
- `npm run build` passes.

## Manual test checklist
- [ ] Inbox view loads tasks.
- [ ] Create task via top input.
- [ ] Open task → edit fields → save → list reflects changes.
- [ ] Create project.
- [ ] Edit project → delete project.
- [ ] Switch views (today, flagged, completed).
- [ ] Mobile sidebar opens and closes.
```

### Task T5 — Parallelize finance save and add per-month error feedback

```markdown
## Task
Replace sequential `await` loop in `handleSaveExpenses` / `handleSaveIncome`
with `Promise.allSettled`.

## Context
`FinancesPage.tsx:149-178` loops 1..12 with `await` — saving a full year is
12 sequential round-trips.

## Files to inspect first
- apps/web/src/app/components/FinancesPage.tsx (handleSaveExpenses,
  handleSaveIncome, handleSaveSettings)

## Constraints
- Don't change the backend contract.
- If a partial save fails, show which months failed.
- Save settings stays as a single call.

## Expected changes
1. Collect months that changed into an array
   `monthsToSave: Array<{month, payload}>`.
2. `const results = await Promise.allSettled(monthsToSave.map(...))`.
3. If all fulfilled → `setInfo("Расходы сохранены")`. Otherwise →
   `setError("Не удалось сохранить месяцы: " + failedMonths.join(", "))`.
4. Same for income.

## Do not change
- Table rendering.
- The `normalizeDecimalInputOrRaw` flow.

## Acceptance criteria
- Saving 12 months happens in parallel (verifiable in Network tab).
- Failure on month N still saves the others and shows month N in error.

## Manual test checklist
- [ ] Edit several months → Save → all save in parallel.
- [ ] Force backend to reject one month → error message lists that month.
- [ ] Other months show updated values.
```

### Task T6 — Replace clickable divs with buttons in TasksPage sidebar

```markdown
## Task
Make sidebar rows and chevron toggles keyboard-accessible.

## Context
`TasksPage.tsx:405-441` uses `<div onClick>` for project rows and
`<span onClick>` for collapse chevrons. Screen readers don't announce them
as buttons; Tab navigation skips them.

## Files to inspect first
- apps/web/src/app/components/TasksPage.tsx (renderProject, renderTask)

## Constraints
- Visual output identical.
- Click-through behavior (chevron stops propagation; row navigates to
  project) preserved.

## Expected changes
1. `<div onClick>` for project row → `<button type="button">` (full width).
2. `<span onClick>` for chevron → `<button type="button">`.
3. Add `aria-label` to chevron button: "Свернуть"/"Развернуть".
4. Inner `<button>` for "more" (MoreHorizontal) already exists — confirm
   it has `type="button"`.

## Do not change
- handlers, classes other than `<div>`/`<span>` → `<button>`.

## Acceptance criteria
- Tab navigates through sidebar items.
- Enter on a project row selects it.
- Enter on chevron toggles collapse.
- Visual style unchanged.

## Manual test checklist
- [ ] Tab through sidebar — every row gets focus ring.
- [ ] Click on chevron does not select project.
- [ ] Click on row selects project.
- [ ] Screen reader announces "button" for each row.
```

### Task T7 — Remove dead types and unused constants from api/types.ts

```markdown
## Task
Delete unused exported types after verifying no references.

## Context
`types.ts` exports `TodoState`, `FinanceState`, `HomeState`, `AppPath`,
`AuthState` (plus `HealthState`/`HealthPayload`) — these look like leftovers
from a previous architecture. Suspected unused.

## Files to inspect first
- apps/web/src/app/api/types.ts

## Constraints
- For each type: run `grep -r "TodoState" apps/web/src`. Only delete if zero
  matches outside the definition file.
- Do not delete types that ARE used.

## Expected changes
1. Verify each candidate via grep.
2. Delete confirmed-unused type definitions.
3. Run `npm run check` to confirm no orphan references.

## Do not change
- Types that are imported anywhere.

## Acceptance criteria
- `types.ts` is smaller.
- `npm run build` passes.
- No new TypeScript errors.

## Manual test checklist
- [ ] App opens and works as before.
- [ ] No build errors.
```

### Task T8 — Add MoneyInput shared component and use in Finances

```markdown
## Task
Create a `<MoneyInput>` that uses `type="text"` + `inputMode="decimal"`;
replace `<Input type="number">` in FinancesPage.

## Context
`<input type="number">` on iOS Safari does not show decimal keyboard;
doesn't accept comma as separator. Current `normalizeDecimalInputOrRaw`
already handles both, but the input restricts entry.

## Files to inspect first
- apps/web/src/app/components/FinancesPage.tsx (all `<Input type="number">`)
- apps/web/src/app/components/ui/input.tsx
- apps/web/src/app/api/financeFormat.ts

## Constraints
- Don't break existing `decimalInputToMinorUnits` parsing.
- Visual style identical to `Input`.

## Expected changes
1. Create `apps/web/src/app/components/ui/money-input.tsx`:
   ```tsx
   export function MoneyInput(props: Omit<React.ComponentProps<"input">, "type">) {
     return <Input type="text" inputMode="decimal" {...props} />;
   }
   ```
2. Replace `<Input type="number">` in FinancesPage with `<MoneyInput>` for
   all amount/percent inputs.

## Do not change
- Other modules.
- Date/time inputs.

## Acceptance criteria
- On mobile, focusing a money field opens a decimal keyboard.
- Pasting "1 234,56" → save → backend receives normalized "1234.56".
- Visual style unchanged.

## Manual test checklist
- [ ] Enter values with comma → save → reload → values render correctly.
- [ ] Enter values with dot → save → reload → values render correctly.
- [ ] On iOS Safari, keyboard shows numeric/decimal layout.
```

---

## 17. Final Recommendation

**Стоит ли сначала исправлять фронтенд или продолжать добавлять фичи?**
Сначала **Phase 1 + Phase 2 рефакторинга**, потом фичи. Сейчас точка инфлексии: добавить ещё один модуль в текущей структуре — значит зацементировать дублирование header'а и плодить TasksPage-подобные монолиты. После AppShell + apiFetch + split TasksPage добавление новых модулей становится 1-задачей.

**Три действия с максимальным эффектом:**
1. **AppShell + единый список модулей** (Task T2). Снимает 80% боли с дублированием.
2. **Разрезать TasksPage** (Task T4). Снимает главный AI-блокер.
3. **Один apiFetch + 401-handling** (Task T3). Снимает класс багов «сессия истекла».

**Где можно переусложнить:**
- Не вводить React Query до второго модуля с server state.
- Не вводить Storybook.
- Не делать собственный design system layer над shadcn.
- Не вводить FSD/feature-sliced design — `app + shared + modules` достаточно.
- Не писать E2E на каждую фичу — одного smoke хватит.

**Где нельзя экономить на качестве:**
- **Деньги.** `decimalInputToMinorUnits` и его тесты — обязательны. BigInt-арифметика без тестов — путь к потерянным копейкам.
- **Auth.** Один источник истины (AuthContext), централизованный 401.
- **Лимит на размер файла.** Без жёсткого лимита проект скатится обратно к 1000-строчным компонентам.
- **TypeScript strict.** Уже включён — никогда не выключать.

**Как двигаться дальше:**
1. Эта неделя: Phase 1 (Tasks T1, T6, T7 + удалить mock'и + унифицировать токены danger/destructive).
2. Следующие 1–2 недели: Phase 2 (T2, T3, T4, T5, T8) — по одному PR на задачу.
3. Затем: Phase 3 (структура `modules/`, AGENTS.md, тесты).
4. **Только после** этого — investments / fire / следующие модули.

Не нужно делать всё одним PR. Каждая задача из раздела 16 — отдельный коммит/PR с явным acceptance.
