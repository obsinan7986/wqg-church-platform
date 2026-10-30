# TURN Server Setup & Configuration Guide (WebRTC NAT Traversal)

For WebRTC video meetings across different networks (e.g. Host on Wi-Fi, participant on Cellular/Mobile Data or strict corporate firewalls), direct peer-to-peer UDP may be blocked by Symmetric NAT. In that situation, a **TURN (Traversal Using Relays around NAT)** server relays the media packets to maintain 100% connectivity.

---

## 1. Environment Variables in Backend (`.env`)

Add the following environment variables to your backend `.env` file:

```env
# TURN Server Configuration (Comma-separated for multiple transports or endpoints)
TURN_URL=turn:your-turn-domain.com:3478?transport=udp,turn:your-turn-domain.com:3478?transport=tcp,turns:your-turn-domain.com:5349?transport=tcp
TURN_USERNAME=your_turn_username
TURN_CREDENTIAL=your_turn_password_or_token
```

The protected endpoint `GET /api/live/ice-servers` automatically reads these variables and provides them to the meeting client. If `TURN_URL` is omitted, the platform defaults to Google Public STUN servers.

---

## 2. Option A: Using a Cloud TURN Provider (Fastest)

Several cloud providers offer free and paid managed TURN servers with global low-latency edges:

### 1. Metered.ca (Recommended for Quick Setup)
1. Sign up at [https://www.metered.ca/tools/openrelay/](https://www.metered.ca/tools/openrelay/) or create an account.
2. Under **Turn Server**, obtain:
   - URL: `turn:openrelay.metered.ca:80`
   - Username: `openrelayproject`
   - Credential: `openrelayproject`
3. Put these values in your backend `.env`.

### 2. Twilio Network Traversal Service
1. Create an account at [Twilio Console](https://console.twilio.com/).
2. Under **Network Traversal Services**, generate Network Traversal Tokens.
3. Configure `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`.

### 3. Xirsys
1. Create a free tier account at [https://xirsys.com/](https://xirsys.com/).
2. Create an application and navigate to the ICE / TURN credentials panel.
3. Copy the URL, Username, and Secret into `.env`.

---

## 3. Option B: Self-Hosting Your Own Coturn Server (Ubuntu / Debian Linux)

If you have a VPS (Ubuntu/Debian on AWS EC2, DigitalOcean, Hetzner, etc.):

### Step 1: Install coturn
```bash
sudo apt update && sudo apt install -y coturn
```

### Step 2: Enable coturn system service
Edit `/etc/default/coturn`:
```bash
sudo nano /etc/default/coturn
```
Uncomment or add:
```bash
TURNSERVER_ENABLED=1
```

### Step 3: Configure `/etc/turnserver.conf`
Backup original configuration and write a clean configuration:
```bash
sudo mv /etc/turnserver.conf /etc/turnserver.conf.backup
sudo nano /etc/turnserver.conf
```

Paste the following configuration (replace `turn.yourdomain.com`, `YOUR_PUBLIC_IP`, and passwords):
```conf
# Listening ports
listening-port=3478
tls-listening-port=5349

# Public IP of your server
external-ip=YOUR_PUBLIC_IP

# Realm and Server name
realm=turn.yourdomain.com
server-name=turn.yourdomain.com

# Fingerprint for WebRTC compatibility
fingerprint

# Long-term credential mechanism
lt-cred-mech

# Static user credentials: username:password
user=wqguser:SecureChurchTurnPassword2026

# SSL / TLS certificates (optional but recommended for turns://)
# cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem

# Ports for relaying media traffic
min-port=49152
max-port=65535

# Verbose logging
verbose
```

### Step 4: Open Firewall Ports
```bash
# Allow TURN listening ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp

# Allow media relay UDP port range
sudo ufw allow 49152:65535/udp
sudo ufw reload
```

### Step 5: Start & Enable Coturn Service
```bash
sudo systemctl restart coturn
sudo systemctl enable coturn
sudo systemctl status coturn
```

### Step 6: Configure Platform `.env`
In your church platform backend `.env`:
```env
TURN_URL=turn:YOUR_PUBLIC_IP:3478?transport=udp,turn:YOUR_PUBLIC_IP:3478?transport=tcp
TURN_USERNAME=wqguser
TURN_CREDENTIAL=SecureChurchTurnPassword2026
```

---

## 4. Verification & Testing

1. Test your TURN server online at [WebRTC Trickle ICE Test](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/).
   - Enter your `TURN_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`.
   - Click **Gather candidates**.
   - You should see candidate types: `host`, `srflx`, and `relay` (relay candidates confirm TURN is working).
2. Inside the church live platform:
   - Connect Host on PC (Ethernet / Wi-Fi).
   - Connect Participant 1 on mobile data (cellular 4G/5G).
   - Video and audio will connect smoothly through the TURN relay if direct P2P is blocked by carrier NAT!
