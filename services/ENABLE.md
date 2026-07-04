sudo systemctl daemon-reload
sudo systemctl enable --now soundhouse
sudo systemctl status soundhouse
journalctl -u soundhouse -f # live logs

npx npm-check-updates -u && npm install

sudo systemctl enable --now soundhouse-update.timer
