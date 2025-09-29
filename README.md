# Visual Map

Visual Map es una plataforma web Next.js que te permite subir escaneos XML de Nmap y visualizar hosts, puertos abiertos y servicios de una manera gráfica y amigable. Esta aplicación incluye un módulo de inteligencia artificial con la API de Gemini para priorizar los hosts más vulnerables, facilitando la identificación y solución de riesgos de seguridad en grandes escaneos de red.

<img width="3799" height="1724" alt="image" src="https://github.com/user-attachments/assets/cfe8f3c9-42eb-4fdb-8321-15068aae8443" />

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

# Ejecuta el servidor de desarrollo
npm run dev
```

## Configuración de la API de Gemini
Esta herramienta utiliza un módulo de inteligencia artificial a través de la API de Gemini que permite hacer una descripción avanzada de cada host encontrado, buscando vulnerabilidades y dándonos los pasos de explotación de la máquina. Puedes configurar tu API de Gemini aqui: https://aistudio.google.com/


```bash
# Añade tu clave API en .env
nano .env
GEMINI_API_KEY={your-gemini-api-key}
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

<img width="3838" height="1670" alt="image" src="https://github.com/user-attachments/assets/da301ac1-65e4-4414-88e9-7c0690b412ca" />

### Dashboard Principal
**Visualiza el Dashboard:** Una vez que el archivo se procesa, aparecerá el dashboard mostrando un resumen del escaneo.

<img width="3799" height="1724" alt="image" src="https://github.com/user-attachments/assets/d96b135b-549f-4626-a35f-136e7eacd0b3" />

### Hosts más vulnerables
**Analiza las Vulnerabilidades Principales:** El panel "Hosts Más Vulnerables" muestra los hosts con las puntuaciones de riesgo más altas. Haz clic en un host para ver una explicación generada por IA de sus vulnerabilidades.

<img width="3796" height="1724" alt="image" src="https://github.com/user-attachments/assets/356fd4a6-3b54-46ab-947d-44134d4defd6" />

### Todos los hosts
**Explora Todos los Hosts:** Utiliza la tabla principal para navegar, ordenar y buscar entre todos los hosts del escaneo.

<img width="3798" height="1725" alt="image" src="https://github.com/user-attachments/assets/45ee819a-fb73-4f2d-910a-ed5f629b1c74" />

### Detalles de host
**Consulta los Detalles de cada Host:** Haz clic en cualquier host de la tabla para abrir una vista detallada con todos sus puertos y servicios asociados.

<img width="3802" height="1713" alt="image" src="https://github.com/user-attachments/assets/32b59ca0-46bc-45a7-a274-0ecc84c75c70" />

También generará con IA los próximos pasos del pentesting en base a las vulnerabilidades encontradas:

<img width="2436" height="1316" alt="image" src="https://github.com/user-attachments/assets/4d6e27ad-59a9-44a4-94ab-8ce283d6cefa" />

### Puertos abiertos
6. **Consulta todos los puertos abiertos:** Haz clic en la tarjeta de Puertos Abiertos para consultar todos los puertos abiertos de la infraestructura.

<img width="3805" height="1715" alt="image" src="https://github.com/user-attachments/assets/212a6d01-6eee-4787-aeb7-b7f15c913a59" />

### Servicios expuestos
**Consulta todos los servicios expuestos:** Haz clic en la tarjeta de Servicios Únicos para consultar todos los servicios expuestos de la infraestructura.

<img width="3799" height="1722" alt="image" src="https://github.com/user-attachments/assets/1ad6bbeb-b012-44e9-b3f0-46feecb4858f" />

### Exporta los resultados
**Exportación en JSON, HTML o PDF:** Haz clic en los botones del panel lateral para exportar los resultados en JSON, PDF o HTML navegable. En el directorio /examples encontrarás informes de ejemplo, y un XML demo que puedes importar para ver los datos.
