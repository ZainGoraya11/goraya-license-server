const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const app = express();

app.use(express.json());

const PORT =
  process.env.PORT || 3000;

const LICENSE_FILE =
  path.join(
    __dirname,
    'licenses.json'
  );


// ==================================================
// LOAD LICENSES
// ==================================================

function loadLicenses() {

  return JSON.parse(
    fs.readFileSync(
      LICENSE_FILE,
      'utf8'
    )
  );

}


// ==================================================
// SAVE LICENSES
// ==================================================

function saveLicenses(licenses) {

  fs.writeFileSync(
    LICENSE_FILE,
    JSON.stringify(
      licenses,
      null,
      2
    )
  );

}


// ==================================================
// GENERATE DEVICE ID
// ==================================================

function generateDeviceId() {

  return crypto
    .randomBytes(16)
    .toString('hex');

}


// ==================================================
// ACTIVATE LICENSE
// ==================================================

app.post(
  '/activate',
  (req, res) => {

    const {
      licenseKey,
      deviceId
    } = req.body;


    if (!licenseKey) {

      return res.status(400).json({
        valid: false,
        message: 'License key is required'
      });

    }


    const licenses =
      loadLicenses();


    const license =
      licenses[licenseKey];


    if (!license) {

      return res.status(404).json({
        valid: false,
        message: 'Invalid license key'
      });

    }


    // ==================================================
    // ALREADY EXPIRED
    // ==================================================

    if (
      license.expiresAt &&
      new Date(license.expiresAt) <= new Date()
    ) {

      license.status = 'expired';

      saveLicenses(
        licenses
      );


      return res.status(403).json({
        valid: false,
        message: 'License expired'
      });

    }


    // ==================================================
    // ALREADY ACTIVE
    // ==================================================

    if (
      license.status === 'active'
    ) {

      if (
        license.deviceId &&
        license.deviceId !== deviceId
      ) {

        return res.status(403).json({
          valid: false,
          message:
            'License is already activated on another device'
        });

      }


      return res.json({
        valid: true,
        message: 'License already active',
        expiresAt:
          license.expiresAt
      });

    }


    // ==================================================
    // ACTIVATE FOR FIRST TIME
    // ==================================================

    const now =
      new Date();


    const expiration =
      new Date(
        now.getTime() +
        (30 * 24 * 60 * 60 * 1000)
      );


    license.status =
      'active';


    license.activatedAt =
      now.toISOString();


    license.expiresAt =
      expiration.toISOString();


    license.deviceId =
      deviceId || generateDeviceId();


    saveLicenses(
      licenses
    );


    return res.json({

      valid: true,

      message:
        'License activated successfully',

      expiresAt:
        license.expiresAt

    });

  }
);


// ==================================================
// CHECK LICENSE
// ==================================================

app.post(
  '/check',
  (req, res) => {

    const {
      licenseKey,
      deviceId
    } = req.body;


    if (!licenseKey) {

      return res.status(400).json({
        valid: false,
        message: 'License key is required'
      });

    }


    const licenses =
      loadLicenses();


    const license =
      licenses[licenseKey];


    if (!license) {

      return res.status(404).json({
        valid: false,
        message: 'Invalid license key'
      });

    }


    // ==================================================
    // REVOKED
    // ==================================================

    if (
      license.status === 'revoked'
    ) {

      return res.status(403).json({
        valid: false,
        message: 'License revoked'
      });

    }


    // ==================================================
    // DEVICE CHECK
    // ==================================================

    if (
      license.deviceId &&
      deviceId &&
      license.deviceId !== deviceId
    ) {

      return res.status(403).json({
        valid: false,
        message:
          'License belongs to another device'
      });

    }


    // ==================================================
    // EXPIRATION CHECK
    // ==================================================

    if (
      !license.expiresAt ||
      new Date(license.expiresAt) <= new Date()
    ) {

      license.status =
        'expired';


      saveLicenses(
        licenses
      );


      return res.status(403).json({
        valid: false,
        message: 'License expired'
      });

    }


    // ==================================================
    // VALID
    // ==================================================

    return res.json({

      valid: true,

      expiresAt:
        license.expiresAt

    });

  }
);


// ==================================================
// HEALTH CHECK
// ==================================================

app.get(
  '/',
  (req, res) => {

    res.send(
      'License server is running.'
    );

  }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  () => {

    console.log(
      `License server running on port ${PORT}`
    );

  }
);