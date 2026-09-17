# ⚽ ArgenBot

<p align="center">
  <img src="" alt="ArgenBot Banner" width="600" />
</p>

<p align="center">
  <b>Simulador y juego de cartas coleccionables de argentine para Discord.</b><br>
  Construido sobre <b>Bun</b>, <b>discord.js v14</b>, <b>Prisma ORM</b> (SQLite / Bun-SQLite) y renderizado con <b>Sharp</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Runtime-Bun-black?style=flat&logo=bun" alt="Bun" />
  <img src="https://img.shields.io/badge/Discord.js-v14.26-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord.js" />
  <img src="https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Image%20Engine-Sharp-FF9900?style=flat" alt="Sharp" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 🌟 Características Principales

- 🎴 **Colección y Sobres (Packs)**: Abrí sobres con diferentes probabilidades y rarezas para conseguir jugadores, personalidades y cartas especiales.
- 📋 **Plantilla y Titulares**: Armá tu alineación titular interactiva de 5 posiciones con renderizado de imagen dinámico en tiempo real vía **Sharp**.
- 🧩 **Desafíos de Creación de Plantilla (SBC / NBC)**: Intercambiá combinaciones de cartas cumpliendo requisitos de química, nacionalidad, tipo o rating para desbloquear cartas exclusivas y sobres.
- 🏪 **Mercado de Transferencias**: Comprá y vendé cartas entre usuarios utilizando la moneda del bot (*Godeanos*).
- ⚔️ **Duelos Tácticos y Ruleta**: Desafía a otros usuarios apostando dinero. Las probabilidades se calculan matemáticamente en base al promedio de media de cada plantilla con compensación *underdog* y animación visual interactiva de ruleta.
- 💰 **Economía Integrada**: Ganá dinero con comandos diarios (`daily`), trabajos seguros (`work`), actividades de riesgo moderado (`slut`) o atracos de alto riesgo (`crime`).
- 🏆 **Leaderboards y Rankings**: Tablas de clasificación en vivo por valor de plantilla, cantidad de cartas coleccionadas y fortuna en Godeanos.
- 🌐 **CDN de Assets Automático**: Sincronización y distribución de cartas en alta resolución usando jsDelivr/GitHub con sistema de hash MD5 para invalidación de caché.

---

## 📂 Estructura del Proyecto

```text
argenbot/
├── assets/                     # JSONs de cartas, catálogos y fondos locales
│   ├── cartas.json             # Registro de cartas y sus metadatos
│   ├── catalogo.json           # Mapeo de portadas del catálogo
│   └── fondo.json              # Mapeo de fondos para las imágenes
├── commands/                   # Comandos divididos por categoría
│   ├── admin/                  # Herramientas de administración (dar sobres, godeanos, etc.)
│   ├── club/                   # Gestión del club, plantilla, sobres, descarte, mercado y SBCs
│   ├── duel/                   # Sistema de apuestas y ruleta de duelos
│   ├── economy/                # Comandos financieros (daily, work, slut, crime)
│   ├── info/                   # Comandos de información, ayuda, catálogo y tienda
│   └── top/                    # Clasificaciones (media, coleccionistas, millonarios)
├── events/                     # Manejadores de eventos de Discord
│   ├── client/ready.js         # Inicio de sesión y seeds de base de datos
│   └── server/messageCreate.js # Enrutamiento y procesamiento de comandos con prefijo
├── handlers/                   # Cargadores dinámicos de módulos
│   ├── cdn.js                  # Sincronización de assets al CDN remoto
│   ├── command.js              # Carga e indexación de comandos
│   └── events.js               # Registro de eventos de Discord
├── models/                     # Base de datos y persistencia
│   ├── schema.prisma           # Esquema de Prisma (SQLite)
│   └── db.js                   # Instancia del cliente de Prisma
├── utils/                      # Utilidades matemáticas, seeds y validadores
│   ├── calcularMedia.js        # Lógica de cálculo de media, probabilidades y bonus underdog
│   ├── formatNumber.js         # Formateador visual de números (K, M, B)
│   ├── seedJugadores.js        # Inserción inicial de cartas a la DB
│   ├── seedNBCS.js             # Inserción de desafíos SBC/NBC
│   ├── seedPacks.js            # Inserción de paquetes y contenidos
│   └── validarNBC.js           # Validador de condiciones para desafíos SBC
├── Dockerfile                  # Contenedor para producción con Bun
├── prisma.config.js            # Configuración de Prisma ORM
└── index.js                    # Punto de entrada principal del bot
```

---

## 🎮 Lista de Comandos

El prefijo por defecto es configurable mediante variable de entorno (`PREFIX`, típicamente `ar!` o `t!`).

### ⚽ Club & Colección (`commands/club`)
| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `registro <nombre>` | `registrar`, `crear` | Crea tu club oficial y recibes tu sobre inicial de bienvenida. |
| `plantilla` | `alineacion`, `titulares` | Visualiza tu plantilla titular de 5 cartas generada en imagen compuesta. |
| `cartas [página]` | `inventario`, `mis-cartas` | Explora todas las cartas que tienes en tu club. |
| `canjear <número>` | `abrir`, `open` | Abre un sobre disponible en tu inventario. |
| `packs` | `sobres`, `mis-packs` | Muestra los sobres sin abrir que tienes guardados. |
| `descartar <carta>` | `vender` | Descarta una carta a cambio de su valor base en Godeanos. |
| `mercado` | `market`, `transferencias` | Compra y vende cartas directamente a otros jugadores del servidor. |
| `nbc` | `sbc`, `desafios` | Menú interactivo de Desafíos de Creación de Plantilla (SBC). |
| `media` | `overall` | Consulta el promedio de valoración general de tus titulares activos. |

### ⚔️ Duelos & Apuestas (`commands/duel`)
| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `duelo @usuario <monto>` | `apostar`, `reto` | Desafía a otro club a un partido con ruleta animada en Discord. Las probabilidades se basan en la diferencia de media de ambas plantillas y cuenta con multiplicador *underdog*. |

### 💰 Economía (`commands/economy`)
| Comando | Alias | Cooldown | Descripción |
| :--- | :--- | :--- | :--- |
| `daily` | `diario` | 24 Horas | Reclama tu recompensa económica diaria asegurada. |
| `work` | `trabajar`, `laburar` | 1 Hora | Trabajo honesto con 100% de probabilidad de éxito. |
| `slut` | `prostituirse` | 30 Minutos | Actividad de riesgo medio con ganancias moderadas o penalización. |
| `crime` | `crimen`, `robar` | 2 Horas | Delito de alto riesgo con grandes ganancias o multas policiales severas. |

### ℹ️ Información & Tienda (`commands/info`)
| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `help` | `ayuda`, `comandos` | Menú interactivo con el catálogo completo de comandos y guías. |
| `tienda` | `shop` | Tienda interactiva con los sobres disponibles para compra con Godeanos. |
| `catalogo` | `album` | Muestra la lista de cartas existentes en el juego y sus rarezas. |
| `ping` | `latencia` | Muestra la latencia del WebSocket del bot hacia Discord. |

### 🏆 Clasificaciones (`commands/top`)
| Comando | Alias | Descripción |
| :--- | :--- | :--- |
| `top` | `ranking`, `leaderboard` | Selector interactivo de tablas de clasificación del servidor. |
| `top media` | `top rating` | Ranking de los usuarios con mayor promedio de valoración en su plantilla. |
| `top coleccionistas` | `top cartas` | Ranking de usuarios con mayor cantidad total de cartas. |
| `top millonarios` | `top dinero` | Ranking de los usuarios con más Godeanos acumulados. |

### 🛡️ Administración (`commands/admin`)
| Comando | Permisos | Descripción |
| :--- | :--- | :--- |
| `godeanos <add/remove/set> @user <cant>` | Administrador | Gestiona el balance económico de un usuario. |
| `dar-packs @user <pack> [cant]` | Administrador | Otorga sobres a un jugador específico. |
| `allplayers` | Administrador | Concede una copia de cada carta existente al administrador. |

---

## ⚙️ Requisitos Previos

- [Bun](https://bun.sh/) (versión 1.1 o superior recomendada)
- Node.js (opcional, en caso de querer usar herramientas auxiliares)
- Una [Aplicación y Bot en Discord Developer Portal](https://discord.com/developers/applications) con los siguientes **Privileged Gateway Intents** activados:
  - `Server Members Intent`
  - `Message Content Intent`

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/lukitaz-r/argenbot.git
cd argenbot
```

### 2. Instalar dependencias
```bash
bun install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto tomando como referencia el siguiente esquema:

```env
# Token del bot de Discord
BOT_TOKEN="TU_DISCORD_BOT_TOKEN"

# Prefijo de comandos (por ejemplo: ar! o t!)
PREFIX="ar!"

# URL de conexión para Prisma (SQLite local)
DATABASE_URL="file:./dev.db"
```

### 4. Generar el Cliente de Prisma y Migraciones
```bash
# Genera los tipos y el cliente de Prisma
bunx prisma generate --schema=models/schema.prisma

# Aplica las migraciones o sincroniza el esquema con la base de datos local
bunx prisma db push --schema=models/schema.prisma
```

### 5. Iniciar el bot
```bash
bun run start
```

Al iniciarse, el bot conectará a la base de datos y ejecutará automáticamente los scripts de **seed** para cargar las cartas (`seedJugadores`), sobres (`seedPacks`) y desafíos SBC (`seedNBCS`).

---

## 🐳 Despliegue con Docker

El proyecto incluye un `Dockerfile` optimizado sobre la imagen oficial de `oven/bun`:

1. **Construir la imagen**:
   ```bash
   docker build -t argenbot:latest .
   ```

2. **Ejecutar el contenedor**:
   ```bash
   docker run -d \
     --name argenbot-prod \
     --env-file .env \
     -v $(pwd)/production.db:/app/db.db \
     argenbot:latest
   ```

---

## 🧠 Mecánicas y Lógica Clave

### 🎛️ Generación de Plantillas con Sharp
A diferencia de alternativas pesadas que consumen excesiva memoria RAM (como Puppeteer o Chromium headless), **ArgenBot** utiliza [Sharp](https://sharp.pixelplumbing.com/) para componer y superponer las cartas titulares sobre el lienzo de la cancha en cuestión de milisegundos, reduciendo drásticamente la latencia de respuesta y el consumo de recursos en el servidor.

### 🎲 Algoritmo de Duelos y Ventaja Underdog
- **Cálculo de probabilidad**: La diferencia de media entre el equipo A y el equipo B se amplifica por un factor de 3 (`50 + (diff * 3)`), garantizando que las plantillas de mayor calificación tengan una ventaja tangible pero no absoluta (con topes entre 10% y 90%).
- **Compensación al Underdog**: Si un equipo con desventaja inicial (< 50% de probabilidad) resulta victorioso, se le recompensa con un **bonus porcentual** adicional sobre el monto apostado (`apuesta * (50 - prob) / 50`), premiando el riesgo y la hazaña táctica.

---

## 📄 Licencia

Este proyecto está bajo la licencia **ISC**. Consulta los detalles en el archivo [package.json](file:///c:/Users/luca/Documents/Proyectos/argenbot/package.json).
