# Visual Map

Visual Map es una plataforma web Next.js que te permite subir escaneos XML de Nmap y visualizar hosts, puertos abiertos y servicios de una manera gráfica y amigable. Esta aplicación incluye un módulo de inteligencia artificial para priorizar los hosts más vulnerables, facilitando la identificación y solución de riesgos de seguridad en grandes escaneos de red.

<img width="3805" height="1718" alt="image" src="https://github.com/user-attachments/assets/ba48a245-34b5-432b-89be-22b3a159e852" />


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

# Configura la API de Gemini
# Necesario para la generación de la descripción y pasos de pentesting con IA
nano .env
GEMINI_API_KEY={your-gemini-api-key}

# Instalar dependencias
npm install

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

<img width="3838" height="1686" alt="image" src="https://github.com/user-attachments/assets/18023d45-94e1-4840-86ff-f305ef1e16d7" />


### Dashboard Principal
**Visualiza el Dashboard:** Una vez que el archivo se procesa, aparecerá el dashboard mostrando un resumen del escaneo.

<img width="3805" height="1718" alt="image" src="https://github.com/user-attachments/assets/ea5adab6-e8f1-4d45-bd44-73157df858df" />

### Hosts más vulnerables
**Analiza las Vulnerabilidades Principales:** El panel "Hosts Más Vulnerables" muestra los hosts con las puntuaciones de riesgo más altas. Haz clic en un host para ver una explicación generada por IA de sus vulnerabilidades.

<img width="3801" height="1724" alt="image" src="https://github.com/user-attachments/assets/be912c32-1e00-430e-9762-7a650c1413a9" />

### Todos los hosts
**Explora Todos los Hosts:** Utiliza la tabla principal para navegar, ordenar y buscar entre todos los hosts del escaneo.

<img width="3802" height="1724" alt="image" src="https://github.com/user-attachments/assets/6c5f2bcd-4b74-4df3-b825-d399a18e6e95" />

### Detalles de host
**Consulta los Detalles de cada Host:** Haz clic en cualquier host de la tabla para abrir una vista detallada con todos sus puertos y servicios asociados. Además se generará con IA una descripción y los próximos pasos de pentesting (para esto es necesario proporcionar vuestra API de Gemini editando el archivo .env)

<img width="3807" height="1731" alt="image" src="https://github.com/user-attachments/assets/397361ec-b01c-42be-a2e1-b7f9f9b1034f" /> <img width="3802" height="1232" alt="image" src="https://github.com/user-attachments/assets/4cf37f36-88ba-4600-8de2-e2cc176c695e" />

### Puertos abiertos
**Consulta todos los puertos abiertos:** Haz clic en la tarjeta de Puertos Abiertos para consultar todos los puertos abiertos de la infraestructura.

<img width="3805" height="1727" alt="image" src="https://github.com/user-attachments/assets/2ce22aa4-46e4-4354-805c-7e5c714239e5" />

### Servicios expuestos
**Consulta todos los servicios expuestos:** Haz clic en la tarjeta de Servicios Únicos para consultar todos los servicios expuestos de la infraestructura.

<img width="3799" height="1729" alt="image" src="https://github.com/user-attachments/assets/89eb8011-4e7a-454f-a0e5-f0822ea4e808" />

### Exporta los resultados
**Exportación en JSON, HTML o PDF:** Haz clic en los botones del panel lateral para exportar los resultados. Puedes ver informes de prueba en el directorio /examples. Además encontrarás un xml de prueba que puedes importar para ver losa datos.
