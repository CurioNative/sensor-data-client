# Gait Analysis Dashboard - Code Architecture & Walkthrough

This document explains the inner workings of the **Gait Analysis Dashboard** client. It provides a detailed breakdown of the components, data flows, communication protocols, and visual rendering strategies used to display and record real-time gait telemetry.

---

## 🏗️ System Overview & Architecture

The Gait Analysis Dashboard is a lightweight, frontend-only application that operates on a direct client-server topology via a low-latency network connection:

```mermaid
graph TD
    ESP32[ESP32 Microcontroller<br>sensor-data-firmware] -- "WebSocket (WS) Server (Port 81)" --> WS_Stream
    WS_Stream -- "Raw CSV Strings (time,ch2_acc_x,...)" --> JS_WS[app.js: WebSocket Handler]
    
    subgraph Browser Client (sensor-data-client)
        JS_WS -- "1. Parse String to Numbers" --> Parser[CSV Parser]
        JS_WS -- "2. Accumulate (If Recording)" --> RecBuffer[(Memory Data Buffer)]
        
        Parser -- "3. Stream updates (extendTraces)" --> PlotlyEngine[Plotly.js Chart Engine]
        PlotlyEngine -- "Render" --> ChartDiv[div#graph]
        
        UI_Toggles[Custom Checkbox Panel] -- "restyle visibility" --> PlotlyEngine
        
        RecBuffer -- "4. Save (Trigger Download)" --> CSVBlob[CSV Blob Generator]
        CSVBlob -- "Download Trigger" --> FileSystem[User Disk: GaitData_HH-MM-SS.csv]
    end
```

The system behaves as a high-frequency real-time receiver. The ESP32 acts as the WebSocket server, and the web browser acts as the client. High-frequency sensor values are pushed from the microcontroller as comma-separated values (CSV strings) without any JSON overhead to maximize packet throughput and minimize latency.

---

## 📂 File Structure and Roles

The workspace consists of three core web assets:

1. [index.html](file:///home/abin/Documents/Github/sensor-data-client/index.html): Defines the structure of the dashboard layout, imports the Plotly.js library via CDN, creates placeholders for controls, toggles, and charts, and links the stylesheet and JavaScript logic.
2. [styles.css](file:///home/abin/Documents/Github/sensor-data-client/styles.css): Styles the dashboard using a modern, clean card-based layout (`.panel`), dynamic responsive grids for toggling sensor traces, and standard styles for interactive buttons and inputs.
3. [app.js](file:///home/abin/Documents/Github/sensor-data-client/app.js): Contains the application state, configuration arrays, Plotly initialization, WebSocket lifecycle event handling, data parsing, rendering loop optimization, and CSV export logic.

---

## 📝 Detailed Analysis of Client Components

### 1. Structure & Layout: [index.html](file:///home/abin/Documents/Github/sensor-data-client/index.html)
The layout has two primary visual panels:
- **Control Panel ([index.html:L16-32](file:///home/abin/Documents/Github/sensor-data-client/index.html#L16-L32))**:
  - Connection options (ESP32 IP input and Connect button).
  - Session recording controls (Start/Stop Recording and status outputs).
  - A dynamic grid placeholder (`#checkbox-container`) where checkboxes are injected for each toggleable sensor channel.
- **Graph Container ([index.html:L34](file:///home/abin/Documents/Github/sensor-data-client/index.html#L34))**:
  - A single dedicated `div` with id `#graph` where Plotly renders the multi-channel time-series graph.

### 2. Stylesheet: [styles.css](file:///home/abin/Documents/Github/sensor-data-client/styles.css)
- Layout elements utilize CSS flexbox and grid layouts.
- [styles.css:L15-22](file:///home/abin/Documents/Github/sensor-data-client/styles.css#L15-L22) defines a dynamic checkbox grid (`.grid`) that adapts columns automatically based on screen space using `repeat(auto-fill, minmax(180px, 1fr))`.
- Interactive buttons utilize transitions (`transition: 0.2s`) and state styles (`button:disabled`) to provide clear visual feedback during recording.

### 3. Application State & Orchestration: [app.js](file:///home/abin/Documents/Github/sensor-data-client/app.js)

#### 📊 Data Configuration and Schema
The dashboard manages a dataset with 23 specific telemetry channels. The array [traceNames](file:///home/abin/Documents/Github/sensor-data-client/app.js#L7-L13) defines the sequence expected from the ESP32 packet:
- Index `0`: `Time` (internal/timestamp baseline, not graphed on the y-axis directly but used for documentation).
- Indexes `1-18`: IMU Data (Accelerometer & Gyroscope coordinates X, Y, Z for channels `CH2`, `CH3`, and `CH4`).
- Indexes `19-22`: Flex sensors corresponding to gait contacts (Right/Left Toe and Heel).

#### 📈 Dynamic Visualization & Optimizations
- **Initial Setup**: The dashboard dynamically constructs checkboxes and Plotly trace objects inside a `for` loop ([app.js:L22-39](file:///home/abin/Documents/Github/sensor-data-client/app.js#L22-L39)).
- **Default Visibility**: To keep the dashboard clean upon launch, IMU data traces are set to `'legendonly'` (meaning they exist in Plotly but are hidden by default), while Flex sensor traces are set to `true` (fully visible) because gait cycles are heavily characterized by toe and heel flexure.
- **Interactive Checkbox Handler**:
  ```javascript
  document.querySelectorAll('.trace-toggle').forEach(checkbox => {
      checkbox.addEventListener('change', function () {
          const traceIndex = parseInt(this.value) - 1;
          const visibility = this.checked ? true : 'legendonly';
          Plotly.restyle('graph', { visible: visibility }, [traceIndex]);
      });
  });
  ```
  Using `Plotly.restyle` allows the application to toggle trace visibility instantaneously without rebuilding the entire graph layout.

#### 🔌 WebSocket Telemetry Lifecycle
The function [connectWS](file:///home/abin/Documents/Github/sensor-data-client/app.js#L58-L102) handles establishing connection and processing high-frequency data packages:
1. **Instantiation**: Creates a new WebSocket connection to `ws://<ESP32_IP>:81/`.
2. **Lifecycle Events**:
   - `onopen`: Sets the status label to "Connected (Live)" in green.
   - `onclose`: Sets the status label to "Disconnected" in red.
   - `onerror`: Dispatches connectivity errors to the browser console.
3. **High-Frequency Parsing & Graph Extension (`onmessage`)**:
   ```javascript
   ws.onmessage = (event) => {
       const dataStr = event.data;
       
       if (isRecording) {
           recordedData.push(dataStr);
       }
       
       const values = dataStr.split(',').map(Number);
       const updateY = [];
       const traceIndices = [];
       
       for (let i = 1; i < values.length && i <= traces.length; i++) {
           updateY.push([values[i]]);
           traceIndices.push(i - 1);
       }
       
       Plotly.extendTraces('graph', { y: updateY }, traceIndices, maxDataPoints);
   };
   ```
   - **Optimization**: Splitting strings and casting to numbers is fast.
   - **Visual Performance**: Rather than using `Plotly.react` or updating the full data array, [Plotly.extendTraces](file:///home/abin/Documents/Github/sensor-data-client/app.js#L100) is used to append the latest values directly onto the existing traces.
   - **Rolling Window Limit**: The fourth argument of `extendTraces` (`maxDataPoints = 150`) instructs Plotly to act as a rolling buffer. When the graph reaches 150 data points, older points are shifted out of the view automatically, ensuring constant memory and render-time footprints.

#### ⏺️ Recording & CSV File Assembly
Data logging runs completely client-side in system memory:
- **Starting**: When [startRecording](file:///home/abin/Documents/Github/sensor-data-client/app.js#L105-L112) is called, `isRecording` is toggled to `true` and the storage array `recordedData` is emptied.
- **Buffering**: During the active recording state, the raw incoming CSV string (`dataStr`) is appended directly to the array `recordedData`.
- **Exporting**: When [stopRecording](file:///home/abin/Documents/Github/sensor-data-client/app.js#L114-L138) runs, it:
  1. Compiles the file string by joining all recorded rows with a newline delimiter (`\n`), prepending the pre-formatted `csvHeader` row.
  2. Wraps the data inside a binary text-encoded Object (`Blob` with MIME type `text/csv`).
  3. Creates an object URL via `window.URL.createObjectURL(blob)`.
  4. Dynamically injects an anchor tag `<a>`, configures it with the current timestamp filename, programmatic fires a click event to trigger the browser's download dialog, and immediately cleans up references to release client memory.

---

## 📡 ESP32 Telemetry String Contract

The application operates under a strict communication contract where the indices of the comma-separated WebSocket messages map to the physical sensors:

| Index | Value Variable | Component | Description / Coordinate |
| :---: | :--- | :--- | :--- |
| **0** | `Time` | ESP32 Clock | Microcontroller runtime timestamp (skipped in charts) |
| **1** | `CH2 Accel X` | IMU Channel 2 | Acceleration along X-axis |
| **2** | `CH2 Accel Y` | IMU Channel 2 | Acceleration along Y-axis |
| **3** | `CH2 Accel Z` | IMU Channel 2 | Acceleration along Z-axis |
| **4** | `CH2 Gyro X` | IMU Channel 2 | Angular velocity about X-axis |
| **5** | `CH2 Gyro Y` | IMU Channel 2 | Angular velocity about Y-axis |
| **6** | `CH2 Gyro Z` | IMU Channel 2 | Angular velocity about Z-axis |
| **7** | `CH3 Accel X` | IMU Channel 3 | Acceleration along X-axis |
| **8** | `CH3 Accel Y` | IMU Channel 3 | Acceleration along Y-axis |
| **9** | `CH3 Accel Z` | IMU Channel 3 | Acceleration along Z-axis |
| **10** | `CH3 Gyro X` | IMU Channel 3 | Angular velocity about X-axis |
| **11** | `CH3 Gyro Y` | IMU Channel 3 | Angular velocity about Y-axis |
| **12** | `CH3 Gyro Z` | IMU Channel 3 | Angular velocity about Z-axis |
| **13** | `CH4 Accel X` | IMU Channel 4 | Acceleration along X-axis |
| **14** | `CH4 Accel Y` | IMU Channel 4 | Acceleration along Y-axis |
| **15** | `CH4 Accel Z` | IMU Channel 4 | Acceleration along Z-axis |
| **16** | `CH4 Gyro X` | IMU Channel 4 | Angular velocity about X-axis |
| **17** | `CH4 Gyro Y` | IMU Channel 4 | Angular velocity about Y-axis |
| **18** | `CH4 Gyro Z` | IMU Channel 4 | Angular velocity about Z-axis |
| **19** | `Flex Right Toe` | Flex Resistive | Flexure sensor under right toe joint |
| **20** | `Flex Right Heel`| Flex resistive | Flexure sensor under right heel joint |
| **21** | `Flex Left Toe`  | Flex Resistive | Flexure sensor under left toe joint |
| **22** | `Flex Left Heel` | Flex Resistive | Flexure sensor under left heel joint |

> [!NOTE]
> The index allocation sequence must be preserved on the ESP32 transmitter firmware. Adding or removing elements from the middle of the transmitted payload will cause the dashboard indices to align to the wrong fields.

---

## ⚡ Architectural Strengths & Performance Considerations

- **Visual Performance**: Utilizing `Plotly.extendTraces` prevents the browser from doing full-layout repaints, allowing 20+ channels to stream concurrently at 50Hz–100Hz on most hardware.
- **Low Memory Overhead**: By setting `maxDataPoints = 150`, Plotly does not accumulate an infinite size array for rendering. Only the recording buffer `recordedData` increases in size during recording, saving CPU cycles.
- **Zero-Dependency Portability**: Running pure web code loads faster, can run on local servers offline, and requires no complicated developer setup.

> [!TIP]
> If high telemetry data rates (e.g. >100Hz) are used, consider adjusting `maxDataPoints` or decreasing the rate at which Plotly updates to prevent browser UI blocking.
