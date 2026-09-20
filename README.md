# SGAS — Sistema de Gestión ATS

Sistema de Gestión de Análisis de Trabajo Seguro (ATS) para equipos industriales. Permite gestionar fichas ATS, puntos de emergencia, documentos, checklists y equipos/TAG.

## Arquitectura

- **Frontend:** SPA vanilla JS/HTML/CSS — deployado en GitHub Pages
- **Backend:** Node.js + Express + PostgreSQL (Supabase) — deployado en Render
- **Modo dual:** detecta automáticamente si el servidor está disponible. Si no → usa IndexedDB local en el browser.

## Estructura del proyecto

```
├── index.html              # Shell de la SPA
├── css/
│   ├── styles.css          # Estilos principales
│   └── print.css           # Estilos para impresión
├── js/
│   ├── utils.js            # Utilidades globales (escapeHtml, fileToBase64, etc.)
│   ├── storage.js          # Capa de abstracción de datos (RED/LOCAL)
│   ├── app.js              # Router, sidebar, modal, dashboard
│   ├── ats.js              # Fichas ATS — CRUD, PDF, Excel
│   ├── emergencias.js      # Puntos de emergencia
│   ├── documentos.js       # Planos y documentos PDF
│   ├── checklists.js       # Checklists PDF por categorías
│   ├── equipos.js          # Links a Google Sheets (Equipos/TAG)
│   ├── config.js           # Configuración visual
│   ├── exceljs.min.js      # ExcelJS para exportación .xlsx
│   ├── jspdf.umd.min.js    # jsPDF para exportación PDF
│   └── jspdf.plugin.autotable.min.js
├── assets/
│   └── favicon.svg
└── server/
    ├── server.js           # Entry point Express
    ├── database.js         # PostgreSQL schema y conexión
    ├── package.json
    ├── .env.example        # Variables de entorno requeridas
    └── routes/
        ├── ats.js
        ├── categorias.js
        ├── checklists.js
        ├── config.js
        ├── documentos.js
        ├── emergencias.js
        ├── sheets.js
        └── helpers.js
```

## Configurar y correr el servidor localmente

```bash
cd server
cp .env.example .env       # copiar variables de entorno
# editar .env con tus valores reales
npm install
npm start
```

## Variables de entorno requeridas

Ver `server/.env.example` para la lista completa.

## Deploy

- **Frontend:** push a `main` en GitHub → GitHub Pages despliega automáticamente
- **Backend:** push a `main` en GitHub → Render despliega automáticamente (si está conectado al repo)

## Módulos principales

| Módulo | Descripción |
|---|---|
| ATS | Fichas de Análisis de Trabajo Seguro con exportación PDF y Excel |
| Parada de Planta | Fichas ATS específicas para paradas de planta |
| Emergencias | Áreas de emergencia con extintores, duchas y alarmas |
| Documentos | Repositorio de planos y documentos PDF |
| Checklists | Checklists PDF organizados por categorías |
| Equipos/TAG | Links a Google Sheets de equipos |
| Configuración | Personalización visual (colores, fuente, tamaño) |
