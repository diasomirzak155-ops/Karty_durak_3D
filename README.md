# Durak Online — Link Edition 5.0.6

Мобильная карточная игра для игры с друзьями по приглашению-ссылке. Это исходный проект веб-игры, а не готовый Android APK.

## Состав этой редакции

- Подкидной и переводной дурак, комнаты на 2–6 реальных игроков. Ботов нет.
- Создание приватного стола и вход по уникальному коду/ссылке-приглашению.
- Профиль игрока, аватар, личные игровые показатели и достижения с одноразовыми наградами.
- Приветственный бонус 200 000 игровых фишек при регистрации каждого нового аккаунта (один раз на аккаунт).
- Магазин рубашек карт: все покупки только за внутриигровые фишки. Нет донатов, платежей или покупки фишек за реальные деньги.
- Друзья по имени, музыка, отдельная громкость музыки и эффектов, правила игры.
- Спокойное оформление карточного клуба, мобильная раскладка и настройки качества графики.
- Нет переключения языков, турниров и мирового рейтинга.

## Важно о профилях, пароле и бонусе

Регистрация выполняется по уникальному логину и паролю, без SMS и Email. Каждый новый аккаунт получает 200 000 игровых фишек один раз при регистрации. Если игрок забыл пароль, он может зарегистрировать новый аккаунт с другим свободным логином и получить новый приветственный бонус. Старый аккаунт, его фишки и статистика останутся отдельно и автоматически не переносятся. Без Email или телефона восстановить доступ к старому аккаунту нельзя — пароль нужно сохранить. Пароли хранятся в виде хешей scrypt.

## Развёртывание и Android

Сервер Node.js 18+ с Socket.IO должен быть размещён на постоянном публичном HTTPS-адресе, чтобы друзья могли открывать ссылки из мессенджеров. Комнаты находятся в памяти сервера и сбрасываются при перезапуске.

Целевой размер будущего APK — не более 25 МБ. Размер ZIP с исходниками не является размером APK. В этой среде Android SDK/Gradle-сборка не выполнена, поэтому этот архив нельзя считать готовым APK.

## Проверка и запуск

Требуется Node.js 18 или новее.

```bash
npm install
npm run check
npm start
```

Откройте `http://localhost:3000`. Для игры с другом через интернет сервер нужно разместить на хостинге с поддержкой WebSocket/Socket.IO.

## Честный статус Android-сборки

Android APK в этой версии не создан и не протестирован. Для полноценной Android-сборки нужны установленные Capacitor-пакеты, Android SDK/Gradle и проверка на реальном телефоне. Three.js пока загружается с CDN, поэтому приложение ещё не полностью автономно: перед автономной сборкой библиотеку нужно включить локально. Онлайн-игра требует постоянно доступного сервера. Перед публикацией необходимы нагрузочные тесты, проверка переподключения и защита профилей/комнат.

Виртуальные фишки не являются деньгами; платежи не подключены. Специальные правила «Королевской игры» пока не реализованы.

## Compact mobile asset pass (5.0.0-compact.1)

This working copy is an asset-optimized source package targeting a future Android APK of up to 25 MB. Large material textures have been downscaled and recompressed for phone displays; five background music tracks were converted from uncompressed WAV to mono 22.05 kHz MP3 at 48 kbps. Short UI effects remain WAV. The service-worker cache version was changed so clients fetch the compact assets.

This is still a development source package, not a signed or tested APK. It does not claim that all planned Global Ultimate features are complete. Android packaging and on-device testing remain outstanding; email authentication is intentionally deferred until the game update stage is finished.

## Compact 5.0.0 — shop update

This working build adds a server-validated virtual cosmetic shop for card-back styles:
- Classic (free), Premium (25,000 chips), Neon (50,000 chips), Zammler Edition (100,000 chips).
- Purchases and equipped styles are stored in the server profile data.
- The server validates ownership before allowing a style to be equipped or selected for a new room.
- The shop uses virtual chips only; no real-money payments are connected.

Validation: run `npm run check` before deployment. The ZIP is a source archive, not an Android APK. Install dependencies with `npm install` before starting the server with `npm start`.


## Compact 5.0.0 — achievement rewards

- Ten server-tracked achievements now show a virtual-chip reward.
- Players explicitly claim unlocked rewards from the achievements panel.
- The server verifies completion and prevents claiming the same achievement twice; claimed IDs are stored in the player profile.
- Rewards range from 500 to 100,000 virtual chips.

This is a source project update, not a compiled Android APK. Online profiles in this build still use the current server-side JSON store and are not yet protected by email authentication.


## Compact 5.0.0 — friends management (5.0.0-compact.4)

- Added a dedicated friends screen in the lobby.
- Players can add an existing profile by exact display name, view win totals and current online status, and remove friends.
- Friend lists are stored in the server data store and reloaded on request.
- This is a server-local profile feature; secure cross-device accounts and global persistence still require the planned email authentication/database integration.


## Link Edition 5.0.6 — ограничения проекта

- Игра предназначена для приглашения друзей по ссылке в приватную комнату.
- Глобальный рейтинг и турниры не входят в эту редакцию.
- Ботов нет: за столом играют реальные подключившиеся люди.
- Магазин принимает только игровые фишки; реальные платежи и донаты отсутствуют.
- Каждый новый аккаунт получает 200 000 фишек при регистрации. Если пароль потерян, игрок может создать новый аккаунт с другим логином и получить новый бонус; старый профиль не переносится.
- Целевой размер Android APK — не более 25 МБ; ZIP исходников и размер APK — разные показатели.


## Аккаунты Link Edition 5.0.6

- Регистрация и вход только по логину и паролю, без SMS и электронной почты.
- Логин: 3–20 символов (латиница, цифры, подчёркивание); пароль: 8–72 символа.
- Пароль хранится на сервере как хеш scrypt с уникальной солью, а не открытым текстом.
- При каждой новой регистрации сервер выдаёт ровно 200 000 игровых фишек этому новому аккаунту и ставит флаг бонуса в его профиле. Новый логин создаёт отдельный профиль; старые фишки и статистика не переносятся.
- Локально аккаунты, профили, сессии и прогресс сохраняются в `data.json`; в облачном запуске — в таблице Supabase `durak_state`.
- Для входа с другого устройства используй тот же логин и пароль. Если пароль потерян, восстановить его без привязанной почты/телефона нельзя — храни его надёжно.


## Публикация через GitHub и Render (бесплатный вариант)

1. На GitHub открой уже созданный репозиторий `Karty_durak_3D` и обнови его содержимое файлами из этого архива в корне. Не загружай `node_modules/`, `data.json`, `.env` и секретные ключи.
2. В Supabase Dashboard открой существующий проект `durak-global-ultimate` → SQL Editor и выполни файл `supabase/schema.sql` из этого архива.
3. Скопируй Project URL из Supabase → Connect / Integrations → Data API. В Settings → API Keys создай или скопируй **Secret key** (`sb_secret_...`). Старый `service_role` тоже поддерживается.
4. На Render выбери **New → Blueprint**, подключи GitHub-репозиторий. Render попросит значения `SUPABASE_URL` и `SUPABASE_SECRET_KEY` — введи их прямо в Render, не в GitHub и не в этот чат.
5. Render Free запускает сервер, а Supabase хранит аккаунты, фишки, профили и сессии. `/health` должен показать `"ok": true`, `"storage": "supabase"` и версию `5.0.6`.
6. После публикации проверь создание двух аккаунтов, начисление по 200 000 фишек каждому, повторный вход и игру по приглашению с двух телефонов.

Бесплатный Render выключает неактивный сервер примерно после 15 минут без трафика; при следующем открытии ему может понадобиться около минуты на запуск. Комнаты в оперативной памяти после такого выключения сбрасываются, но аккаунты и фишки в Supabase сохраняются. Бесплатный Supabase может приостановить проект после недели низкой активности; данные при этом сохраняются, проект можно возобновить в Dashboard.

Не публикуй `data.json`, пароли или токены. Перед открытием игры друзьям обязательно проверь реальный URL и работу сохранения аккаунтов.


### Переменные Supabase для Render

- `SUPABASE_URL`: Project URL из Supabase Dashboard → Connect или Integrations → Data API.
- `SUPABASE_SECRET_KEY`: секретный ключ из Settings → API Keys. Старый `service_role` также поддержан. Publishable/anon key для серверного хранилища не подходит.
- Если переменные не заданы, локальный запуск использует `data.json`. Если задана только одна переменная, сервер останавливается, чтобы случайно не запустить игру без постоянного хранилища.
