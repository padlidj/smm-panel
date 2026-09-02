# Deploy Steps

## 1. DNS
Buat A record `smm.kuygas.my.id` → `43.129.57.93`

## 2. Copy systemd units
```bash
sudo cp deploy/smm-panel.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smm-panel
systemctl status smm-panel
```

## 3. Copy cron timers
```bash
for f in deploy/cron-*.service deploy/cron-*.timer; do
  sudo cp "$f" /etc/systemd/system/
done
sudo systemctl daemon-reload
for f in deploy/cron-*.timer; do
  timer=$(basename "$f" .timer)
  sudo systemctl enable --now "$timer"
done
systemctl list-timers | grep cron
```

## 4. Nginx + SSL
```bash
# Create log dir
sudo mkdir -p /home/padsu/logs/nginx

# Copy nginx config
sudo cp deploy/nginx-smm.kuygas.my.id.conf /etc/nginx/sites-enabled/

# Get SSL cert (replace with your method)
# Option A: certbot
sudo certbot --nginx -d smm.kuygas.my.id

# Option B: manual self-signed + Cloudflare proxy
# (just point Cloudflare proxy on, let CF handle SSL)

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Build & restart
```bash
cd /home/padsu/scripts/smm-panel
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart smm-panel
journalctl -u smm-panel -n 30 --no-pager
```

## 6. Verify
- https://smm.kuygas.my.id — landing page
- /auth/login — login form
- /admin — admin login (admin/admin123)
- /dashboard — user dashboard