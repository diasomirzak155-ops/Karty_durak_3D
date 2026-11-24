# Durak Online — Link Edition 5.0.0-link.2

Мобильная карточная игра для игры с друзьями по приглашению-ссылке. Это исходный проект веб-игры, а не готовый Android APK.

## Состав этой редакции

- Подкидной и переводной дурак, комнаты на 2–6 реальных игроков. Ботов нет.
- Создание приватного стола и вход по уникальному коду/ссылке-приглашению.
- Профиль игрока, аватар, личные игровые показатели и достижения с одноразовыми наградами.
- Одноразовый приветственный бонус 200 000 игровых фишек после первого сохранения профиля.
- Магазин рубашек карт: все покупки только за внутриигровые фишки. Нет донатов, платежей или покупки фишек за реальные деньги.
- Друзья по имени, музыка, отдельная громкость музыки и эффектов, правила игры.
- Спокойное оформление карточного клуба, мобильная раскладка и настройки качества графики.
- Нет переключения языков, турниров и мирового рейтинга.

## Важно о профилях и бонусе

Сейчас используется гостевой идентификатор, сохранённый в браузере. Поэтому бонус 200 000 выдаётся один раз на этот идентификатор, а не на подтверждённый Email-аккаунт; очистка данных браузера может создать новый гостевой профиль. Полноценную Email-регистрацию и надёжную защиту от повторного получения бонуса следует подключить перед публичным запуском.

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


## Link Edition 5.0.0-link.2 — ограничения проекта

- Игра предназначена для приглашения друзей по ссылке в приватную комнату.
- Глобальный рейтинг и турниры не входят в эту редакцию.
- Ботов нет: за столом играют реальные подключившиеся люди.
- Магазин принимает только игровые фишки; реальные платежи и донаты отсутствуют.
- Новому профилю при первом завершении заполнения профиля начисляется 200 000 фишек один раз. Текущий гостевой идентификатор хранится на устройстве; полноценная Email-регистрация и защита от создания новых гостевых профилей будут отдельным этапом.
- Целевой размер Android APK — не более 25 МБ; ZIP исходников и размер APK — разные показатели.


## Аккаунты Link Edition 5.0.0-link.3

- Регистрация и вход только по логину и паролю, без SMS и электронной почты.
- Логин: 3–20 символов (латиница, цифры, подчёркивание); пароль: 8–72 символа.
- Пароль хранится на сервере как хеш scrypt с уникальной солью, а не открытым текстом.
- При первой регистрации сервер выдаёт ровно 200 000 игровых фишек и ставит флаг бонуса в профиле.
- Аккаунты, профили, сессии и прогресс сохраняются в `data.json` в каталоге `DATA_DIR`. Для постоянного хранения на хостинге настрой постоянный диск.
- Для входа с другого устройства используй тот же логин и пароль. Если пароль потерян, восстановить его без привязанной почты/телефона нельзя — храни его надёжно.
