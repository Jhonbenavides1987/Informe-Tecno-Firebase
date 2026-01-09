# Blueprint del Módulo de Carga y Análisis de Datos

## 1. Propósito y Capacidades

Proporcionar una herramienta robusta y escalable para la carga y el análisis del estado de implementación de puntos de venta (PDV) para diferentes líneas de negocio. La aplicación utiliza una arquitectura de datos denormalizada para un rendimiento óptimo y costos mínimos.

## 2. Arquitectura General

La aplicación se basa en una arquitectura de **"denormalización en la escritura"**. Realizamos el trabajo de cruzar y enriquecer los datos una sola vez, en el momento en que se cargan o se actualizan las metas. Los datos resultantes se almacenan en un formato ya "pre-analizado".

- **Beneficio Principal:** Los dashboards leen datos listos para ser visualizados, lo que resulta en una carga casi instantánea, una experiencia de usuario fluida y un costo de lectura de datos significativamente menor.

---

## 3. Módulos Implementados

### 3.1. Módulo Pospago
- **Colecciones:** `Base Pospago`, `Implementacion Pospago`.
- **Automatización:** Cloud Function `markAsImplemented` que actualiza `Base Pospago`.
- **Interfaz:** `Cargar Datos Pospago`, `Dashboard Pospago`.

### 3.2. Módulo Prepago
- **Colecciones:** `Base Prepago`, `Implementacion Prepago`.
- **Automatización:** Cloud Function `markAsImplementedPrepago` que actualiza `Base Prepago`.
- **Interfaz:** `Cargar Datos Prepago`, `Dashboard Prepago`.

### 3.3. Módulo Durable
- **Colecciones:** Usa `Base Prepago` como base maestra. `Implementacion Durable`.
- **Lógica:** Introduce el campo `implementado_durable` en `Base Prepago` para no interferir con otros módulos.
- **Automatización:** Cloud Function `markAsImplementedDurable` que actualiza `Base Prepago`.
- **Interfaz:** `Cargar Datos Durable`, `Dashboard Durable`.

### 3.4. Módulo Aliados
- **Colecciones:** Usa `Base Prepago` como base maestra. `Implementacion Aliados`.
- **Lógica:** Introduce el campo `implementado_aliados` en `Base Prepago` para no interferir con otros módulos.
- **Automatización:** Cloud Function `markAsImplementedAliados` que actualiza `Base Prepago`.
- **Interfaz:** `Cargar Datos Aliados`, `Dashboard Aliados`.

### 3.5. Módulo Calendarios
- **Colecciones de Datos:**
  - `MetasCalendarios`: Almacena las metas de implementación por sucursal.
  - `ImplementacionCalendarios`: Registro de entrada para los archivos de implementación de calendarios.
  - `ProgresoCalendarios`: Colección denormalizada que almacena el progreso agregado (meta, implementados, porcentaje) por sucursal.
- **Automatización (Cloud Function):**
  - **Nombre:** `calculateCalendariosProgress`.
  - **Disparador:** Se activa al crear/modificar documentos en `MetasCalendarios` o `ImplementacionCalendarios`.
  - **Lógica:** Recalcula el progreso para la sucursal afectada y escribe el resultado en `ProgresoCalendarios`.
- **Páginas de la Interfaz:**
  - `Dashboard Calendarios` (`/dashboard-calendarios`): Visualiza el progreso en tiempo real desde `ProgresoCalendarios`.
  - `Cargar Datos Calendarios` (`/upload-calendarios`): Permite subir el archivo de implementación.
  - `Definir Metas Calendarios` (`/meta-calendarios`): Interfaz para establecer las metas por sucursal.

### 3.6. Módulo Porta Afiches
- **Colecciones de Datos:**
  - `MetasPortaAfiches`: Almacenará las metas de implementación por sucursal.
  - `ImplementacionPortaAfiches`: Será el registro de entrada para los archivos de implementación.
  - `ProgresoPortaAfiches`: Colección denormalizada que almacenará el progreso agregado.
- **Automatización (Cloud Function):**
  - **Nombre:** `calculatePortaAfichesProgress`.
  - **Disparador:** Se activará al crear/modificar documentos en `MetasPortaAfiches` o `ImplementacionPortaAfiches`.
  - **Lógica:** Recalculará el progreso para la sucursal afectada y escribirá el resultado en `ProgresoPortaAfiches`.
- **Páginas de la Interfaz (A crear):**
  - `Dashboard Porta Afiches` (`/dashboard-porta-afiches`).
  - `Cargar Datos Porta Afiches` (`/upload-porta-afiches`).
  - `Definir Metas Porta Afiches` (`/meta-porta-afiches`).

---

## 4. Navegación y Acceso
- **Componente:** `Navbar.jsx`
- **Diseño:** Barra de navegación superior con menús desplegables para cada módulo.

## 5. Flujo de Trabajo para el Usuario
El flujo se mantiene consistente a través de los módulos, asegurando una experiencia de usuario predecible.
