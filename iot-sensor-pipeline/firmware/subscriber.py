import paho.mqtt.client as mqtt

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC = "sensors/temperature"

def on_connect(client, userdata, flags, rc):
    print("Connected to MQTT broker")
    client.subscribe(MQTT_TOPIC)

def on_message(client, userdata, msg):
    print(f"Received on {msg.topic}: {msg.payload.decode()}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print(f"Connecting to {MQTT_BROKER}:{MQTT_PORT} and listening to '{MQTT_TOPIC}'")
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()