# Gait Analysis Dashboard - Live Telemetry Client

A lightweight, real-time telemetry dashboard designed to receive, visualize, and record gait data from an ESP32 sensor system via WebSockets.

---

## 🚀 Features

- **Real-Time Data Visualization**: Plots high-frequency sensor data dynamically using Plotly.js.
- **Dynamic Channels / Traces**: Supports toggling individual trace visibility (IMU Accelerometer/Gyroscope and Flex sensors).
- **Live WebSocket Streaming**: Connects directly to an ESP32 access point or local network IP on port `81`.
- **Data Recording & Export**: Record live streams and download them as CSV files formatted with timestamps.
- **Zero Dependencies**: Pure HTML5, CSS3, and JavaScript—no local compilation or `npm install` required!

---

## 🛠️ Installation

Since the dashboard is a static web page, no heavy installation or build steps are required. 

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/sensor-data-client.git
   cd sensor-data-client
   ```
2. **No dependencies to install**: The client loads Plotly.js directly via CDN.

---

## 🏃 How to Run

You can run the dashboard using one of the following methods:

### Option A: Local Web Server (Recommended)
Running through a web server avoids potential browser security restrictions (CORS/file origin limitations) and guarantees smooth performance.

- **Using Python 3**:
  ```bash
  python3 -m http.server 8000
  ```
  Then open [http://localhost:8000](http://localhost:8000) in your web browser.

- **Using Node.js (`npx` / HTTP Server)**:
  ```bash
  npx http-server -p 8000
  ```
  Then open [http://localhost:8000](http://localhost:8000) in your web browser.

- **VS Code "Live Server" Extension**:
  If using VS Code, right-click `index.html` and select **"Open with Live Server"**.

### Option B: Direct File Execution
Simply double-click [index.html](file:///home/vaishnav/Documents/sensor-data-client/index.html) or drag and drop it into any modern web browser.

---

## 🔌 Connecting to the ESP32

1. Make sure your ESP32 is powered on and broadcasting a WebSocket server on port `81`.
2. Connect your PC to the same network/Wi-Fi access point as the ESP32.
3. Enter the ESP32's IP address (default: `192.168.4.1`) in the input field.
4. Click **"Connect to ESP32"**.
5. Once connected, the status indicator will turn green: **Connected (Live)**.

---

## 📊 Expected Data Format

The client expects comma-separated values (CSV strings) streamed over the WebSocket. The index mapped to each trace is as follows:

| Index | Sensor Trace Name | Initial Visibility Status |
|---|---|---|
| 0 | `Time` | *Skipped in Graph plotting* |
| 1-3 | `CH2 Accel X`, `CH2 Accel Y`, `CH2 Accel Z` | Hidden (Toggleable) |
| 4-6 | `CH2 Gyro X`, `CH2 Gyro Y`, `CH2 Gyro Z` | Hidden (Toggleable) |
| 7-9 | `CH3 Accel X`, `CH3 Accel Y`, `CH3 Accel Z` | Hidden (Toggleable) |
| 10-12 | `CH3 Gyro X`, `CH3 Gyro Y`, `CH3 Gyro Z` | Hidden (Toggleable) |
| 13-15 | `CH4 Accel X`, `CH4 Accel Y`, `CH4 Accel Z` | Hidden (Toggleable) |
| 16-18 | `CH4 Gyro X`, `CH4 Gyro Y`, `CH4 Gyro Z` | Hidden (Toggleable) |
| 19 | `Flex Right Toe` | **Visible** |
| 20 | `Flex Right Heel` | **Visible** |
| 21 | `Flex Left Toe` | **Visible** |
| 22 | `Flex Left Heel` | **Visible** |

---

## 📝 Recording & CSV Export

1. Click **▶ Start Recording** to begin buffering received WebSocket messages in memory.
2. The UI will indicate that it is recording live data.
3. Click **⏹ Stop & Save CSV** to halt recording.
4. The dashboard will automatically bundle the trace header and recorded samples, triggering a file download (e.g., `GaitData_17-21-30.csv`).