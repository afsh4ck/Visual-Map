# **App Name**: Visual Map

## Core Features:

- Nmap XML Upload and Parsing: Allows users to upload Nmap XML scan files via drag and drop. The application parses the XML data in a background process using a Web Worker to avoid UI blocking. Supports large XML files (10k-50k hosts).
- Interactive Host Map/Cluster: Presents hosts in an interactive map or cluster view, allowing users to visualize the network topology and quickly identify key nodes.
- Virtualized Table View: Displays hosts, ports, and services in a filterable and paginated table using react-window for efficient rendering of large datasets.
- Host Detail View: Provides a detailed view for each host, including open ports, services, banners, and NSE script results. Includes graphical representation of port/service distributions.
- Risk Scoring with Explainability: Uses a machine learning model (TensorFlow.js) to prioritize hosts based on vulnerability risk. The model uses a heuristic and the user can adjust weights or incorporate a TF.js model to find most vulnerable/easy to exploit hosts.
- Risk Ranking Display: Ranks the Top N most vulnerable hosts and explains the factors contributing to their risk scores, such as open ports, service versions, and NSE script output.
- Light/Dark Mode: Offers a toggle to switch between light and dark themes, with persistence to remember user preference.

## Style Guidelines:

- For light theme, background color: Very light gray (#F8FAFC) to provide a clean and spacious feel.
- For light theme, primary color: Deep purple (#5B42D7). This color is vibrant enough to stand out, signaling a tech-forward attitude, while avoiding cliches.
- For light theme, accent color: Light blue (#818CF8). Used for interactive elements and highlights, providing a clear visual distinction from the primary color and background.
- For dark theme, background color: Very dark gray (#0B1220) to reduce eye strain.
- For dark theme, primary color: Soft purple (#8A68E2) as a slightly toned-down variant of the primary color, to offer sufficient contrast against the dark background.
- For dark theme, accent color: Light blue (#A3B8FF) which provides good contrast for highlights without being too harsh against the dark backdrop.
- Body and headline font: 'Inter', a grotesque sans-serif offering a modern and neutral aesthetic suitable for both headlines and body text. 
- Code font: 'Source Code Pro' for displaying code snippets and NSE script results.
- Use simple, clear icons to represent hosts, services, and ports. The monogram 'VM' will be used as the favicon and logo.
- Employs a responsive, mobile-first design. A header contains the logo, app name, theme toggle, and upload button. A collapsible sidebar offers filters, risk weight sliders, and export options. The main area includes a summary, host map, virtualized table, and a drawer/modal for host details. The footer displays the Visual Map version and a link to the local README file.
- Subtle microinteractions and smooth transitions on hover, click, and data loading to enhance UX. Avoid overly complex animations that could impact performance.