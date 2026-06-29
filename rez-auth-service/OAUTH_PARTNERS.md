# OAuth Partner Configuration

Set these in Render Dashboard > Environment:

## Required Partners

### Rendez
```
PARTNER_RENDEZ_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_RENDEZ_REDIRECT_URI=https://your-rendez-app.com/api/auth/callback
```

### Stay Owen (Hotel OTA)
```
PARTNER_STAY_OWEN_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_STAY_OWEN_REDIRECT_URI=https://your-hotel-app.com/api/auth/callback
```

### AdBazaar
```
PARTNER_ADBAZAAR_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_ADBAZAAR_REDIRECT_URI=https://your-adbazaar-app.com/api/auth/callback
```

## Optional Partners

### NextaBiZ
```
PARTNER_NEXTABIZZ_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_NEXTABIZZ_REDIRECT_URI=https://your-nextabizz-app.com/api/auth/callback
```

### Hotel PMS
```
PARTNER_HOTEL_PMS_CLIENT_SECRET=<generate-with-openssl-rand-hex-64>
PARTNER_HOTEL_PMS_REDIRECT_URI=https://your-hotel-pms.com/api/auth/callback
```
