**IoT Sensor Pipeline**

Demo project: sensor simulator → MQTT (Mosquitto) → Backend (Node.js) → PostgreSQL → Dashboard (Chart.js + WebSocket)

---

### Quick Start (local)

1. Start containers:

   ```bash
   docker-compose up --build -d
   ```

2. Activate the virtual environment and run the simulator:

   ```bash
   source venv/Scripts/activate
   python firmware/sensor_sim.py
   ```

3. Open the dashboard:
   [http://localhost:3000/](http://localhost:3000/)

---

### Credentials

**Postgres**

* user: `iotuser`
* password: `iotpass`
* database: `iotdata`
* host (from container): `db`
* port: `5432`

**pgAdmin**

* user: `admin@admin.com`
* password: `admin`

---

### Backup

To create a backup from the host machine:

```bash
docker exec -i pgdb pg_dump -U iotuser -Fc iotdata > ./backup_iotdata_YYYY-MM-DD.dump
```

---

**License:** MIT
