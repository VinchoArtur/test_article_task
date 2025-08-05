# 📚 Articles API - NestJS REST API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/NestJS-11.0-red.svg" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-blue.svg" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-red.svg" alt="Redis" />
  <img src="https://img.shields.io/badge/JWT-Auth-orange.svg" alt="JWT" />
</p>

## 🎯 Описание проекта

REST API для управления статьями, построенное на NestJS. Включает JWT аутентификацию, CRUD операции, кэширование с Redis и покрытие тестами.

### ✨ Основные возможности

- 🔐 **JWT Аутентификация** - регистрация и авторизация пользователей
- 📝 **CRUD операции** - полное управление статьями
- 🗃️ **PostgreSQL + TypeORM** - хранение данных с миграциями
- ⚡ **Redis кэширование** - высокая производительность чтения
- 🔍 **Фильтрация и пагинация** - поиск статей
- 🛡️ **Валидация данных** - защита от некорректных запросов
- 🧪 **Unit тесты** - покрытие кода тестами
- 📖 **Swagger документация** - интерактивная документация API
- 🐳 **Docker** - контейнеризация для легкого развертывания

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js** 18+
- **Docker** и **Docker Compose**
- **npm** или **yarn**

### Установка и запуск одной командой

```bash
# 1. Клонируйте репозиторий
git clone <repository-url>
cd test_task

# 2. Установите зависимости
npm install

# 3. Запустите весь проект одной командой! 🎉
npm run dev
```

Эта команда автоматически:
- ✅ Поднимет PostgreSQL и Redis в Docker
- ✅ Подождет готовности сервисов
- ✅ Выполнит миграции базы данных
- ✅ Протестирует соединения
- ✅ Запустит приложение в режиме разработки

## 📋 Доступные команды

### 🔧 Развертывание

```bash
# Полная настройка с нуля (первый запуск)
npm run dev

# Быстрый перезапуск (если Docker уже запущен)
npm run quick

# Только инфраструктура (без запуска приложения)
npm run setup:full

# Полная очистка и новая настройка
npm run reset
```

### 🐳 Управление Docker

```bash
npm run docker:up      # Поднять контейнеры
npm run docker:down    # Остановить контейнеры
npm run docker:logs    # Просмотр логов
npm run docker:restart # Перезапуск контейнеров
```

### 🗄️ Работа с базой данных

```bash
npm run migration:generate # Создать миграцию
npm run migration:run      # Выполнить миграции
npm run migration:revert   # Отменить последнюю миграцию
npm run test:db           # Тестировать подключение к БД
```

### 🧪 Тестирование

```bash
npm run test         # Unit тесты
npm run test:watch   # Тесты в режиме наблюдения
npm run test:cov     # Тесты с покрытием
npm run test:e2e     # End-to-end тесты
```

## 🏗️ Архитектура проекта

```
src/
├── auth/                 # Модуль аутентификации
│   ├── controllers/      # REST контроллеры
│   ├── services/         # Бизнес-логика
│   ├── dto/             # Data Transfer Objects
│   ├── guards/          # JWT Guards
│   └── strategies/      # Passport стратегии
├── users/               # Модуль пользователей
│   ├── entities/        # TypeORM сущности
│   ├── services/        # Сервисы пользователей
│   └── dto/            # DTO для пользователей
├── articles/            # Модуль статей
│   ├── controllers/     # CRUD контроллеры
│   ├── services/        # Бизнес-логика статей
│   ├── entities/        # Сущность статьи
│   └── dto/            # DTO для статей
├── common/              # Общие компоненты
│   ├── decorators/      # Кастомные декораторы
│   └── exceptions/      # Обработчики исключений
├── config/              # Конфигурация
└── database/            # Настройки БД и миграции
```

## 📊 База данных

### Схема таблиц

**Users (Пользователи)**
- `id` - UUID (Primary Key)
- `email` - Email (Unique)
- `password` - Хешированный пароль
- `firstName` - Имя
- `lastName` - Фамилия
- `createdAt`, `updatedAt` - Временные метки

**Articles (Статьи)**
- `id` - UUID (Primary Key)
- `title` - Название статьи
- `description` - Описание статьи
- `publishedAt` - Дата публикации
- `authorId` - ID автора (Foreign Key → Users)
- `createdAt`, `updatedAt` - Временные метки

## 🔌 API Endpoints

### 🔐 Аутентификация

```http
POST /api/v1/auth/register  # Регистрация пользователя
POST /api/v1/auth/login     # Вход в систему
```

### 📝 Статьи

```http
GET    /api/v1/articles        # Получить список статей (с фильтрами)
GET    /api/v1/articles/:id    # Получить статью по ID
POST   /api/v1/articles        # Создать статью (требует авторизации)
PUT    /api/v1/articles/:id    # Обновить статью (только автор)
DELETE /api/v1/articles/:id    # Удалить статью (только автор)
```

### 🔍 Параметры фильтрации статей

```http
GET /api/v1/articles?page=1&limit=10&search=nodejs&authorId=123&publishedFrom=2024-01-01&publishedTo=2024-12-31
```

## 📖 Документация API

После запуска приложения документация Swagger доступна по адресу:
- **Swagger UI**: http://localhost:3000/api/docs

## ⚡ Кэширование

Проект использует Redis для кэширования:

- **Списки статей** - кэшируются на 1 час
- **Отдельные статьи** - кэшируются на 1 час
- **Автоматическая инвалидация** при создании/обновлении/удалении

## 🛡️ Безопасность

### Реализованные меры безопасность:

- ✅ **JWT токены** для аутентификации
- ✅ **Bcrypt хеширование** паролей
- ✅ **Helmet** для HTTP заголовков безопасности
- ✅ **Rate limiting** - защита от DDoS
- ✅ **CORS** настройка
- ✅ **Валидация входных данных**
- ✅ **Авторизация на уровне ресурсов**

Запуск тестов:
```bash
npm run test:cov  # С отчетом о покрытии
```

## 🔧 Конфигурация

### Переменные окружения (.env)

```bash
# База данных
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=articles_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=24h

# Приложение
PORT=3000
NODE_ENV=development
```

## 🐳 Docker

Проект включает Docker конфигурацию:

```yaml
# docker-compose.yaml содержит:
# - PostgreSQL 16
# - Redis 7
# - Настроенные volumes для персистентности данных
```

## 📈 Производительность

### Оптимизации:

- ✅ **Redis кэширование** запросов чтения
- ✅ **Индексы БД** на часто используемых полях
- ✅ **Пагинация** для больших списков
- ✅ **Compression** HTTP ответов
- ✅ **Query Builder** для сложных запросов

## 🤝 Разработка

### Код-стайл

Проект использует:
- **ESLint** + **Prettier** для форматирования
- **TypeScript** в строгом режиме
- **Conventional Commits** для сообщений коммитов

### Запуск в режиме разработки

```bash
npm run start:dev  # Режим разработки с hot-reload
npm run start:debug  # Режим отладки
```
