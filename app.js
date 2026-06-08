let ws;
let isRecording = false;
let recordedData = [];
const maxDataPoints = 150; // Points shown on screen before scrolling

// Exactly matches the order constructed in the ESP32 code
const traceNames = [
    'Time',
    'CH2 Accel X', 'CH2 Accel Y', 'CH2 Accel Z', 'CH2 Gyro X', 'CH2 Gyro Y', 'CH2 Gyro Z',
    'CH3 Accel X', 'CH3 Accel Y', 'CH3 Accel Z', 'CH3 Gyro X', 'CH3 Gyro Y', 'CH3 Gyro Z',
    'CH4 Accel X', 'CH4 Accel Y', 'CH4 Accel Z', 'CH4 Gyro X', 'CH4 Gyro Y', 'CH4 Gyro Z',
    'Flex Right Toe', 'Flex Right Heel', 'Flex Left Toe', 'Flex Left Heel'
];

// Create the CSV header string (joining the array above, adding a newline)
const csvHeader = traceNames.join(',') + '\n';

// 1. Initialize Plotly Graph and Checkboxes dynamically
const traces = [];
const checkboxContainer = document.getElementById('checkbox-container');

for (let i = 1; i < traceNames.length; i++) { // Start at 1 to skip 'Time'
    // Default visibility: Turn on Flex sensors (last 4), turn off IMUs initially
    const isFlexSensor = i >= traceNames.length - 4;
    const isVisible = isFlexSensor ? true : 'legendonly';

    // Add to graph traces
    traces.push({
        y: [],
        mode: 'lines',
        name: traceNames[i],
        visible: isVisible
    });

    // Add checkbox to UI
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" class="trace-toggle" value="${i}" ${isFlexSensor ? 'checked' : ''}> ${traceNames[i]}`;
    checkboxContainer.appendChild(label);
}

Plotly.newPlot('graph', traces, {
    margin: { t: 30, r: 30, l: 50, b: 40 },
    xaxis: { title: 'Samples (Rolling Window)' },
    yaxis: { title: 'Sensor Value' },
    showlegend: false // Hide internal legend since we have our custom checkboxes
});

// 2. Handle Checkbox Toggles
document.querySelectorAll('.trace-toggle').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
        const traceIndex = parseInt(this.value) - 1; // -1 because traces array doesn't include Time
        const visibility = this.checked ? true : 'legendonly';
        Plotly.restyle('graph', { visible: visibility }, [traceIndex]);
    });
});

// 3. WebSocket Connection Logic
function connectWS() {
    const ip = document.getElementById('wsIp').value;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }

    ws = new WebSocket('ws://' + ip + ':81/');

    ws.onopen = () => {
        document.getElementById('status').innerText = 'Connected (Live)';
        document.getElementById('status').style.color = '#28a745';
    };

    ws.onclose = () => {
        document.getElementById('status').innerText = 'Disconnected';
        document.getElementById('status').style.color = 'red';
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };

    ws.onmessage = (event) => {
        const dataStr = event.data;

        // Push to recording array if active
        if (isRecording) {
            recordedData.push(dataStr);
        }

        // Parse values
        const values = dataStr.split(',').map(Number);
        const updateY = [];
        const traceIndices = [];

        // Map values to traces (skipping index 0 which is Time)
        for (let i = 1; i < values.length && i <= traces.length; i++) {
            updateY.push([values[i]]);
            traceIndices.push(i - 1);
        }

        // Update Graph efficiently
        Plotly.extendTraces('graph', { y: updateY }, traceIndices, maxDataPoints);
    };
}

// 4. Recording Logic
function startRecording() {
    isRecording = true;
    recordedData = []; // Clear old data
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('recStatus').innerText = 'Recording live data...';
    document.getElementById('recStatus').style.color = '#dc3545';
}

function stopRecording() {
    isRecording = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('recStatus').innerText = `Saved ${recordedData.length} samples.`;
    document.getElementById('recStatus').style.color = '#28a745';

    // Create CSV Blob and trigger download
    const blob = new Blob([csvHeader + recordedData.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;

    // Generate filename with timestamp
    const date = new Date();
    const timestamp = `${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
    a.download = `GaitData_${timestamp}.csv`;

    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}