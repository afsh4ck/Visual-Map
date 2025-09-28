# Visual Map

Visual Map es una plataforma web Next.js que te permite subir escaneos XML de Nmap y visualizar hosts, puertos abiertos y servicios de una manera gráfica y amigable.

Esta aplicación incluye un módulo de inteligencia artificial para priorizar los hosts más vulnerables, facilitando la identificación y solución de riesgos de seguridad en grandes escaneos de red.

## Características

- **Carga y Análisis:** Arrastra y suelta archivos XML de Nmap para un análisis y visualización instantáneos.
- **Dashboard Interactivo:** Visualiza estadísticas resumidas, una lista clasificada de hosts vulnerables y una tabla detallada de todos los hosts escaneados.
- **Puntuación de Riesgo:** Un sistema impulsado por IA puntúa y clasifica los hosts por vulnerabilidad, con explicaciones para los hosts de mayor riesgo.
- **Vista Detallada de Host:** Haz clic en cualquier host para ver sus puertos abiertos, servicios, versiones y los resultados de los scripts de NSE.
- **Modo Claro y Oscuro:** Un selector de tema persistente y fácil de usar para tu comodidad visual.
- **Diseño Adaptable:** Totalmente adaptable y accesible, diseñado para su uso tanto en escritorio como en dispositivos móviles.
- **Procesamiento Local:** Todo el procesamiento se realiza en tu navegador. Tus datos de escaneo nunca salen de tu máquina.

## Instalación

```bash
# Clona el repositorio
git clone https://github.com/afsh4ck/Visual-Map.git
cd Visual-Map

# Instalar dependencias
npm install

# Configurar tu API de Gemini 
# Necesario para generar descripción de cada host y pasos de pentesting
nano .env
GEMINI_API_KEY={your-gemini-api-key}

# Ejecuta el servidor de desarrollo
npm run dev
```

## Generación del XML con Nmap

```bash
# Escaneo de infraestructura completa
sudo nmap -v -A 10.0.0.0/24 -oX scan.xml

# Escaneo de host completo
sudo nmap -v -A 10.0.0.1 -oX scan.xml
```

Abre [http://localhost:9002](http://localhost:9002) en tu navegador para ver el resultado.

## Cómo Usar

### Subida de escaneo XML
**Sube un archivo XML de Nmap:** Arrastra y suelta tu archivo de resultados de escaneo de Nmap (en formato `.xml`) en la zona de carga, o haz clic para seleccionar un archivo.
<img width="3834" height="1802" alt="image" src="https://github.com/user-attachments/assets/f4b3b5a2-1804-4d18-b2e7-cc5853f6ea3f" />

### Dashboard Principal
**Visualiza el Dashboard:** Una vez que el archivo se procesa, aparecerá el dashboard mostrando un resumen del escaneo.
<img width="3840" height="1926" alt="image" src="https://github.com/user-attachments/assets/daa47370-376e-42cc-96a3-32c700dede32" />

### Hosts más vulnerables
**Analiza las Vulnerabilidades Principales:** El panel "Hosts Más Vulnerables" muestra los hosts con las puntuaciones de riesgo más altas. Haz clic en un host para ver una explicación generada por IA de sus vulnerabilidades.
<img width="3840" height="1810" alt="image" src="https://github.com/user-attachments/assets/cde9cd7c-b02e-4908-92eb-af0d8433f4fb" />

### Todos los hosts
**Explora Todos los Hosts:** Utiliza la tabla principal para navegar, ordenar y buscar entre todos los hosts del escaneo.
<img width="3840" height="1802" alt="image" src="https://github.com/user-attachments/assets/e7d3ae5f-51be-49ac-b6b1-bc8e6634e1d9" />

### Detalles de host
**Consulta los Detalles de cada Host:** Haz clic en cualquier host de la tabla para abrir una vista detallada con todos sus puertos y servicios asociados.
<img width="3840" height="1808" alt="image" src="https://github.com/user-attachments/assets/ad07f01e-0228-4885-bff6-92d7a5d536d6" />

### Puertos abiertos
6. **Consulta todos los puertos abiertos:** Haz clic en la tarjeta de Puertos Abiertos para consultar todos los puertos abiertos de la infraestructura.
<img width="3840" height="1808" alt="image" src="https://github.com/user-attachments/assets/c22d33b3-bd0b-486f-a2e3-f82aa4872890" />

### Servicios expuestos
**Consulta todos los servicios expuestos:** Haz clic en la tarjeta de Servicios Únicos para consultar todos los servicios expuestos de la infraestructura.
<img width="3840" height="1806" alt="image" src="https://github.com/user-attachments/assets/8f1368a1-7f11-43c2-bcb2-f043e208f93c" />

### Exporta los resultados
**Exportación en JSON, HTML o PDF:** Haz clic en los botones del panel lateral para exportar los resultados.
<img width="3840" height="1812" alt="image" src="https://github.com/user-attachments/assets/5d3cf96a-671b-4167-b7ca-bd24f8d1979e" />
