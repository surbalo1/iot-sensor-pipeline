import random
import time
from datetime import datetime, UTC
import json
import paho.mqtt.client as mqtt

# MQTT Settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "sensors/temperature"

def on_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker"""
    if rc == 0:
        print("Connected to MQTT broker")
    else:
        print(f"Connection failed with code: {rc}")

def generate_sensor_data():
    """Generate and publish simulated temperature data"""
    # Setup MQTT client
    client = mqtt.Client()
    client.on_connect = on_connect
    
    try:
        # Connect to MQTT broker
        print(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()

        while True:
            try:
                # Generate random temperature between 20-30°C
                temperature = round(random.uniform(20.0, 30.0), 2)
                
                # Create data packet with timezone-aware UTC timestamp
                data = {
                    "temperature": temperature,
                    "timestamp": datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S")
                }
                
                # Convert to JSON string
                json_data = json.dumps(data)
                
                # Publish to MQTT
                client.publish(MQTT_TOPIC, json_data)
                
                # Also print to console for debugging
                print(f"Published: {json_data}")
                
                # Wait 1 second
                time.sleep(1)
                
            except KeyboardInterrupt:
                print("\nStopping sensor simulation...")
                break
    
    finally:
        # Clean up MQTT connection
        client.loop_stop()
        client.disconnect()
        print("Disconnected from MQTT broker")

if __name__ == "__main__":
    print("Temperature Sensor Simulation with MQTT")
    print("Press Ctrl+C to stop\n")
    generate_sensor_data()