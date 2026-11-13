
const QRCode = require('C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-promo-en/node_modules/qrcode');
QRCode.toFile('C:/个人/学习/ENT207/Homestay AI assistant/video/staycraft-demo-promo/public/brand/qr-staycraft.png', 'https://staycraft.online', { width: 1024, margin: 2, color: { dark: '#303039', light: '#ffffff' }, errorCorrectionLevel: 'M' }, (err) => { if (err) { console.error(err); process.exit(1); } console.log('QR OK'); });
