
const express = require("express");
const router = express.Router();
const db = require("./db");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

console.log("Umuturage.rw routes.js loaded");

// ==========================================
// PROFILE PHOTO UPLOAD CONFIGURATION
// ==========================================

const uploadDirectory = path.join(__dirname, "uploads");

// Create uploads folder automatically if it does not exist.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const uniqueName = `profile-${crypto.randomUUID()}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    if (
      allowedTypes.includes(file.mimetype) &&
      allowedExtensions.includes(extension)
    ) {
      return cb(null, true);
    }

    cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
  },
});

// Test API
router.get("/test", (req, res) => {
  res.json({
    message: "Umuturage.rw registration API is ready!",
  });
});

// ==========================================
// CITIZEN REGISTRATION
// ==========================================

router.post("/register", (req, res) => {
  console.log("POST /api/register reached");

  const {
    fullName,
    dateOfBirth,
    gender,
    phone,
    province,
    district,
    sector,
    cell,
    village,
  } = req.body;

  if (
    !fullName?.trim() ||
    !dateOfBirth ||
    !gender ||
    !phone?.trim() ||
    !province?.trim() ||
    !district?.trim() ||
    !sector?.trim() ||
    !cell?.trim() ||
    !village?.trim()
  ) {
    return res.status(400).json({
      message: "Please complete all registration fields.",
    });
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    !Number.isFinite(Date.parse(dateOfBirth)) ||
    new Date(dateOfBirth).toISOString().slice(0, 10) !== dateOfBirth ||
    dateOfBirth > new Date().toISOString().slice(0, 10)
  ) {
    return res.status(400).json({
      message: "Please enter a valid date of birth.",
    });
  }

  if (!["male", "female"].includes(gender)) {
    return res.status(400).json({
      message: "Please select a valid gender.",
    });
  }

  const sql = `
    INSERT INTO citizen_applications
    (
      full_name,
      date_of_birth,
      gender,
      phone,
      province,
      district,
      sector,
      cell,
      village
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    fullName.trim(),
    dateOfBirth,
    gender,
    phone.trim(),
    province.trim(),
    district.trim(),
    sector.trim(),
    cell.trim(),
    village.trim(),
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Application save failed:", err.message);

      return res.status(500).json({
        message: "Could not save your application. Please try again.",
      });
    }

    return res.status(201).json({
      message: "Application received and saved successfully!",
      applicationId: result.insertId,
    });
  });
});

// ==========================================
// SEND PHONE VERIFICATION CODE
// ==========================================

router.post("/send-verification", (req, res) => {
  const { applicationId } = req.body;

  if (!applicationId || !Number.isInteger(Number(applicationId))) {
    return res.status(400).json({
      message: "A valid application reference is required.",
    });
  }

  const code = crypto.randomInt(100000, 1000000).toString();

  const sql = `
    UPDATE citizen_applications
    SET verification_code = ?,
        verification_expires_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE),
        phone_verified = FALSE
    WHERE id = ?
  `;

  db.query(sql, [code, Number(applicationId)], (err, result) => {
    if (err) {
      console.error("Verification code error:", err.message);

      return res.status(500).json({
        message: "Could not generate a verification code.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    // TEST MODE ONLY: display the code for development.
    return res.json({
      message: "Test verification code generated.",
      applicationId: Number(applicationId),
      testCode: code,
      expiresInMinutes: 5,
    });
  });
});

// ==========================================
// VERIFY PHONE NUMBER
// ==========================================

router.post("/verify-phone", (req, res) => {
  const { applicationId, code } = req.body;

  if (!applicationId || !Number.isInteger(Number(applicationId))) {
    return res.status(400).json({
      message: "A valid application reference is required.",
    });
  }

  if (!code || !String(code).trim()) {
    return res.status(400).json({
      message: "A verification code is required.",
    });
  }

  const sql = `
    SELECT verification_code, verification_expires_at, phone_verified
    FROM citizen_applications
    WHERE id = ?
  `;

  db.query(sql, [Number(applicationId)], (err, results) => {
    if (err) {
      console.error("Verify-phone query error:", err.message);

      return res.status(500).json({
        message: "Could not check the verification code. Please try again.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    const row = results[0];

    if (row.phone_verified) {
      return res.status(400).json({
        message: "This phone number has already been verified.",
      });
    }

    if (!row.verification_code || !row.verification_expires_at) {
      return res.status(400).json({
        message: "No verification code has been issued for this application.",
      });
    }

    const now = new Date();
    const expiresAt = new Date(row.verification_expires_at);

    if (now > expiresAt) {
      return res.status(400).json({
        message: "The verification code has expired. Please request a new one.",
      });
    }

    if (String(row.verification_code).trim() !== String(code).trim()) {
      return res.status(400).json({
        message: "The verification code is incorrect.",
      });
    }

    const updateSql = `
      UPDATE citizen_applications
      SET phone_verified = TRUE,
          verification_code = NULL,
          verification_expires_at = NULL
      WHERE id = ?
    `;

    db.query(updateSql, [Number(applicationId)], (updateErr) => {
      if (updateErr) {
        console.error("Verify-phone update error:", updateErr.message);

        return res.status(500).json({
          message: "Verification succeeded but could not update the record. Please try again.",
        });
      }

      return res.json({
        message: "Phone number verified successfully!",
        applicationId: Number(applicationId),
      });
    });
  });
});

// ==========================================
// GENERATE CITIZEN CODE
// ==========================================

router.post("/generate-citizen-code", (req, res) => {
  const { applicationId } = req.body;

  if (!applicationId || !Number.isInteger(Number(applicationId))) {
    return res.status(400).json({
      message: "A valid application reference is required.",
    });
  }

  const sql = `
    SELECT
      full_name,
      DATE_FORMAT(date_of_birth, '%Y') AS birth_year,
      gender,
      phone_verified,
      citizen_code
    FROM citizen_applications
    WHERE id = ?
  `;

  db.query(sql, [Number(applicationId)], (err, results) => {
    if (err) {
      console.error("Citizen code lookup failed:", err.message);

      return res.status(500).json({
        message: "Could not retrieve the application.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "Application not found.",
      });
    }

    const applicant = results[0];

    if (!applicant.phone_verified) {
      return res.status(403).json({
        message: "Please verify your phone number first.",
      });
    }

    if (applicant.citizen_code) {
      return res.json({
        message: "Your citizen code has already been generated.",
        citizenCode: applicant.citizen_code,
      });
    }

    const nameParts = applicant.full_name.trim().split(/\s+/);

    let initials;

    if (nameParts.length >= 2) {
      initials = nameParts[0][0] + nameParts[1][0];
    } else {
      initials = applicant.full_name
        .trim()
        .slice(0, 2)
        .padEnd(2, "X");
    }

    initials = initials.toUpperCase();

    const genderCode =
      applicant.gender === "male" ? "80" : "81";

    const birthYear = String(applicant.birth_year);

    let attempts = 0;

    function createCitizenCode() {
      attempts++;

      const randomDigits = crypto
        .randomInt(0, 1000000)
        .toString()
        .padStart(6, "0");

      const citizenCode =
        initials + birthYear + genderCode + randomDigits;

      const updateSql = `
        UPDATE citizen_applications
        SET citizen_code = ?
        WHERE id = ? AND citizen_code IS NULL
      `;

      db.query(
        updateSql,
        [citizenCode, Number(applicationId)],
        (updateErr, result) => {
          if (updateErr) {
            if (
              updateErr.code === "ER_DUP_ENTRY" &&
              attempts < 10
            ) {
              return createCitizenCode();
            }

            console.error(
              "Citizen code generation failed:",
              updateErr.message
            );

            return res.status(500).json({
              message: "Could not generate your citizen code.",
            });
          }

          if (result.affectedRows === 0) {
            return db.query(
              "SELECT citizen_code FROM citizen_applications WHERE id = ?",
              [Number(applicationId)],
              (checkErr, checkResults) => {
                if (checkErr || !checkResults.length) {
                  return res.status(500).json({
                    message: "Could not confirm your citizen code.",
                  });
                }

                return res.json({
                  message: "Your citizen code is ready.",
                  citizenCode: checkResults[0].citizen_code,
                });
              }
            );
          }

          return res.status(201).json({
            message: "Your Umuturage.rw citizen code has been generated successfully!",
            citizenCode,
          });
        }
      );
    }

    createCitizenCode();
  });
});

// ==========================================
// CREATE CITIZEN ACCOUNT
// ==========================================

router.post("/create-account", async (req, res) => {
  const { citizenCode, password, confirmPassword } = req.body;

  if (!citizenCode?.trim() || !password || !confirmPassword) {
    return res.status(400).json({
      message: "Citizen Code and both password fields are required.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must contain at least 8 characters.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "Passwords do not match.",
    });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    const [applications] = await connection.execute(
      `SELECT *
       FROM citizen_applications
       WHERE citizen_code = ?
       FOR UPDATE`,
      [citizenCode.trim().toUpperCase()]
    );

    if (applications.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Citizen Code not found.",
      });
    }

    const application = applications[0];

    if (!application.phone_verified) {
      await connection.rollback();

      return res.status(403).json({
        message: "Please verify your phone number first.",
      });
    }

    if (application.password_hash) {
      await connection.rollback();

      return res.status(409).json({
        message: "An account already exists for this Citizen Code. Please log in.",
      });
    }

    const [existingAccounts] = await connection.execute(
      `SELECT id
       FROM citizens
       WHERE application_id = ? OR citizen_code = ?
       LIMIT 1`,
      [application.id, application.citizen_code]
    );

    if (existingAccounts.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        message: "An account already exists for this Citizen Code. Please log in.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await connection.execute(
      `INSERT INTO citizens (
        application_id,
        citizen_code,
        full_name,
        email,
        phone,
        password_hash,
        account_status,
        province,
        district,
        sector,
        cell,
        village,
        phone_verified,
        password_set
      )
      VALUES (?, ?, ?, NULL, ?, ?, 'active', ?, ?, ?, ?, ?, 1, 1)`,
      [
        application.id,
        application.citizen_code,
        application.full_name,
        application.phone,
        passwordHash,
        application.province,
        application.district,
        application.sector,
        application.cell,
        application.village,
      ]
    );

    await connection.execute(
      `UPDATE citizen_applications
       SET password_hash = ?,
           account_created_at = NOW()
       WHERE id = ?`,
      [passwordHash, application.id]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Your Umuturage.rw account has been created successfully!",
      citizen: {
        id: result.insertId,
        citizenCode: application.citizen_code,
        fullName: application.full_name,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Account rollback failed:", rollbackError.message);
      }
    }

    console.error("Account creation failed:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "An account already exists for this Citizen Code.",
      });
    }

    return res.status(500).json({
      message: "Could not create your account. Please try again.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// CITIZEN LOGIN
// ==========================================

router.post("/login", (req, res) => {
  const { citizenCode, password } = req.body;

  if (!citizenCode?.trim() || !password) {
    return res.status(400).json({
      message: "Citizen Code and password are required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing from server environment.");

    return res.status(500).json({
      message: "Authentication is not configured correctly.",
    });
  }

  const sql = `
    SELECT
      id,
      application_id,
      citizen_code,
      full_name,
      email,
      phone,
      password_hash,
      account_status
    FROM citizens
    WHERE citizen_code = ?
      AND phone_verified = 1
      AND password_set = 1
      AND account_status = 'active'
    LIMIT 1
  `;

  db.query(
    sql,
    [citizenCode.trim().toUpperCase()],
    async (err, results) => {
      if (err) {
        console.error("Login lookup failed:", err.message);

        return res.status(500).json({
          message: "Login could not be completed. Please try again.",
        });
      }

      if (results.length === 0) {
        return res.status(401).json({
          message: "Invalid Citizen Code or password.",
        });
      }

      const citizen = results[0];

      try {
        const passwordMatches = await bcrypt.compare(
          password,
          citizen.password_hash
        );

        if (!passwordMatches) {
          return res.status(401).json({
            message: "Invalid Citizen Code or password.",
          });
        }

        const token = jwt.sign(
          {
            citizenId: citizen.id,
            applicationId: citizen.application_id,
            citizenCode: citizen.citizen_code,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        return res.json({
          message: "Login successful!",
          token,
          citizen: {
            id: citizen.id,
            applicationId: citizen.application_id,
            citizenCode: citizen.citizen_code,
            fullName: citizen.full_name,
            email: citizen.email,
            phone: citizen.phone,
          },
        });
      } catch (loginError) {
        console.error(
          "Login authentication failed:",
          loginError.message
        );

        return res.status(500).json({
          message: "Could not complete login. Please try again.",
        });
      }
    }
  );
});

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "Authentication is not configured correctly.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        message: "Invalid or expired session.",
      });
    }

    if (!user.citizenId || !Number.isInteger(Number(user.citizenId))) {
      return res.status(403).json({
        message: "Invalid citizen session.",
      });
    }

    req.user = user;
    next();
  });
}

// ==========================================
// PROFILE PHOTO UPLOAD ERROR HANDLER
// ==========================================

function handleProfilePhotoUpload(req, res, next) {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          message: "Your photo must not exceed 5 MB.",
        });
      }

      return res.status(400).json({
        message: error.message || "Could not upload your photo.",
      });
    }

    next();
  });
}

// ==========================================
// UPLOAD LOGGED-IN CITIZEN PROFILE PHOTO
// ==========================================

router.post(
  "/profile/photo",
  authenticateToken,
  handleProfilePhotoUpload,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select a photo to upload.",
      });
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    try {
      const [result] = await db.promise().execute(
        `UPDATE citizens
         SET profile_photo_url = ?
         WHERE id = ?`,
        [photoUrl, req.user.citizenId]
      );

      if (result.affectedRows === 0) {
        fs.unlink(req.file.path, () => {});

        return res.status(404).json({
          message: "Citizen account not found.",
        });
      }

      return res.json({
        message: "Profile photo uploaded successfully!",
        profilePhotoUrl: photoUrl,
      });
    } catch (error) {
      fs.unlink(req.file.path, () => {});

      console.error("Profile photo upload error:", error.message);

      return res.status(500).json({
        message: "Could not save your profile photo.",
      });
    }
  }
);

// ==========================================
// GET LOGGED-IN CITIZEN PROFILE
// ==========================================

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.promise().execute(
      `SELECT
        c.id,
        c.citizen_code AS citizenCode,
        c.full_name AS fullName,
        c.email,
        c.phone,
        c.marital_status AS maritalStatus,
        c.emergency_name AS emergencyName,
        c.emergency_relationship AS emergencyRelationship,
        c.emergency_phone AS emergencyPhone,
        c.profile_photo_url AS profilePhotoUrl,
        c.account_status AS accountStatus,
        DATE_FORMAT(a.date_of_birth, '%Y-%m-%d') AS dateOfBirth,
        a.gender,
        c.province,
        c.district,
        c.sector,
        c.cell,
        c.village
      FROM citizens c
      LEFT JOIN citizen_applications a ON a.id = c.application_id
      WHERE c.id = ?
      LIMIT 1`,
      [req.user.citizenId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Citizen profile not found.",
      });
    }

    return res.json({
      profile: rows[0],
    });
  } catch (error) {
    console.error("Profile loading error:", error.message);

    return res.status(500).json({
      message: "Could not load your profile.",
    });
  }
});

// ==========================================
// UPDATE LOGGED-IN CITIZEN PROFILE
// ==========================================

router.put("/profile", authenticateToken, async (req, res) => {
  const {
    fullName,
    dateOfBirth,
    gender,
    maritalStatus,
    phone,
    email,
    province,
    district,
    sector,
    cell,
    village,
    emergencyName,
    emergencyRelationship,
    emergencyPhone,
  } = req.body;

  if (!fullName || !fullName.trim() || !phone || !phone.trim()) {
    return res.status(400).json({
      message: "Full name and phone number are required.",
    });
  }

  if (gender && !["male", "female"].includes(gender.toLowerCase())) {
    return res.status(400).json({
      message: "Gender must be male or female.",
    });
  }

  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return res.status(400).json({
      message: "Date of birth must use YYYY-MM-DD format.",
    });
  }

  const cleanEmail = email && email.trim() ? email.trim() : null;

  if (
    cleanEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      message: "Please enter a valid email.",
    });
  }

  let connection;

  try {
    connection = await db.promise().getConnection();
    await connection.beginTransaction();

    if (cleanEmail) {
      const [existingEmail] = await connection.execute(
        "SELECT id FROM citizens WHERE email = ? AND id != ? LIMIT 1",
        [cleanEmail, req.user.citizenId]
      );

      if (existingEmail.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          message: "This email address is already used by another account.",
        });
      }
    }

    const [citizens] = await connection.execute(
      `UPDATE citizens SET
        full_name = ?,
        email = ?,
        phone = ?,
        marital_status = ?,
        emergency_name = ?,
        emergency_relationship = ?,
        emergency_phone = ?,
        province = ?,
        district = ?,
        sector = ?,
        cell = ?,
        village = ?
      WHERE id = ?`,
      [
        fullName.trim(),
        cleanEmail,
        phone.trim(),
        maritalStatus || null,
        emergencyName?.trim() || null,
        emergencyRelationship?.trim() || null,
        emergencyPhone?.trim() || null,
        province || null,
        district || null,
        sector || null,
        cell || null,
        village || null,
        req.user.citizenId,
      ]
    );

    if (citizens.affectedRows === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Citizen account not found.",
      });
    }

    const [accounts] = await connection.execute(
      "SELECT application_id FROM citizens WHERE id = ? LIMIT 1",
      [req.user.citizenId]
    );

    const applicationId = accounts[0]?.application_id;

    if (applicationId) {
      await connection.execute(
        `UPDATE citizen_applications SET
          full_name = ?,
          phone = ?,
          province = ?,
          district = ?,
          sector = ?,
          cell = ?,
          village = ?,
          date_of_birth = ?,
          gender = ?
        WHERE id = ?`,
        [
          fullName.trim(),
          phone.trim(),
          province || null,
          district || null,
          sector || null,
          cell || null,
          village || null,
          dateOfBirth || null,
          gender ? gender.toLowerCase() : null,
          applicationId,
        ]
      );
    }

    await connection.commit();

    return res.json({
      message: "Your profile has been updated successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "That email address is already in use.",
      });
    }

    console.error("Profile update error:", error.message);

    return res.status(500).json({
      message: "Could not update your profile.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// ==========================================
// FINANCE MODULE — STAGE 1
// FINANCIAL PROVIDERS AND ACCOUNTS
// ==========================================

// GET ALL AVAILABLE FINANCIAL PROVIDERS
router.get("/finance/providers", authenticateToken, async (req, res) => {
  try {
    const [providers] = await db.promise().execute(
      `SELECT
        id,
        provider_code AS providerCode,
        provider_name AS providerName,
        provider_type AS providerType,
        country,
        is_active AS isActive,
        integration_status AS integrationStatus
      FROM financial_providers
      WHERE is_active = 1
      ORDER BY provider_type, provider_name`
    );

    return res.json({
      message: "Financial providers loaded successfully.",
      providers,
    });
  } catch (error) {
    console.error("Finance providers error:", error.message);

    return res.status(500).json({
      message: "Could not load financial providers.",
    });
  }
});


// GET ALL ACCOUNTS BELONGING TO THE LOGGED-IN CITIZEN
router.get("/finance/accounts", authenticateToken, async (req, res) => {
  try {
    const [accounts] = await db.promise().execute(
      `SELECT
        a.id,
        a.account_name AS accountName,
        a.account_type AS accountType,
        a.account_number_masked AS accountNumberMasked,
        a.currency,
        a.current_balance AS currentBalance,
        a.connection_status AS connectionStatus,
        a.last_synced_at AS lastSyncedAt,
        a.created_at AS createdAt,
        p.provider_name AS providerName,
        p.provider_type AS providerType,
        p.integration_status AS integrationStatus
      FROM financial_accounts a
      INNER JOIN financial_providers p
        ON p.id = a.provider_id
      WHERE a.citizen_id = ?
      ORDER BY a.created_at DESC`,
      [req.user.citizenId]
    );

    return res.json({
      message: "Financial accounts loaded successfully.",
      totalAccounts: accounts.length,
      accounts,
    });
  } catch (error) {
    console.error("Finance accounts error:", error.message);

    return res.status(500).json({
      message: "Could not load your financial accounts.",
    });
  }
});


// ADD A BANK OR MOBILE MONEY ACCOUNT FOR THE LOGGED-IN CITIZEN
router.post("/finance/accounts", authenticateToken, async (req, res) => {
  const {
    providerId,
    accountName,
    accountType,
    accountNumberLast4,
  } = req.body;

  const validAccountTypes = [
    "bank",
    "mobile_money",
    "savings",
    "other",
  ];

  if (
    !Number.isInteger(Number(providerId)) ||
    Number(providerId) <= 0 ||
    !accountName ||
    typeof accountName !== "string" ||
    !accountName.trim() ||
    !validAccountTypes.includes(accountType)
  ) {
    return res.status(400).json({
      message: "Please provide a valid provider, account name and account type.",
    });
  }

  if (
    accountNumberLast4 !== undefined &&
    accountNumberLast4 !== null &&
    !/^\d{4}$/.test(String(accountNumberLast4))
  ) {
    return res.status(400).json({
      message: "Account number must contain only its last four digits.",
    });
  }

  try {
    const [providers] = await db.promise().execute(
      `SELECT id, provider_type, is_active
       FROM financial_providers
       WHERE id = ?
       LIMIT 1`,
      [Number(providerId)]
    );

    if (providers.length === 0 || !providers[0].is_active) {
      return res.status(404).json({
        message: "Financial provider not found or unavailable.",
      });
    }

    const provider = providers[0];

    if (
      provider.provider_type === "mobile_money" &&
      accountType !== "mobile_money"
    ) {
      return res.status(400).json({
        message: "Please select the mobile money account type for this provider.",
      });
    }

    if (
      provider.provider_type === "bank" &&
      accountType === "mobile_money"
    ) {
      return res.status(400).json({
        message: "A bank provider cannot be registered as a mobile money account.",
      });
    }

    const maskedNumber = accountNumberLast4
      ? `****${String(accountNumberLast4)}`
      : null;

    const [result] = await db.promise().execute(
      `INSERT INTO financial_accounts (
        citizen_id,
        provider_id,
        account_name,
        account_type,
        account_number_masked,
        currency,
        current_balance,
        connection_status
      )
      VALUES (?, ?, ?, ?, ?, 'RWF', 0.00, 'disconnected')`,
      [
        req.user.citizenId,
        Number(providerId),
        accountName.trim(),
        accountType,
        maskedNumber,
      ]
    );

    return res.status(201).json({
      message: "Financial account added successfully.",
      account: {
        id: result.insertId,
        providerId: Number(providerId),
        accountName: accountName.trim(),
        accountType,
        accountNumberMasked: maskedNumber,
        currency: "RWF",
        currentBalance: "0.00",
        connectionStatus: "disconnected",
      },
      note: "This account is currently for manual financial tracking. Live provider connection is not configured.",
    });
  } catch (error) {
    console.error("Add financial account error:", error.message);

    return res.status(500).json({
      message: "Could not add your financial account.",
    });
  }
});


// GET ONE ACCOUNT — ONLY IF IT BELONGS TO THE LOGGED-IN CITIZEN
router.get("/finance/accounts/:id", authenticateToken, async (req, res) => {
  const accountId = Number(req.params.id);

  if (!Number.isInteger(accountId) || accountId <= 0) {
    return res.status(400).json({
      message: "Invalid account ID.",
    });
  }

  try {
    const [accounts] = await db.promise().execute(
      `SELECT
        a.id,
        a.account_name AS accountName,
        a.account_type AS accountType,
        a.account_number_masked AS accountNumberMasked,
        a.currency,
        a.current_balance AS currentBalance,
        a.connection_status AS connectionStatus,
        a.last_synced_at AS lastSyncedAt,
        a.created_at AS createdAt,
        p.provider_name AS providerName,
        p.provider_type AS providerType,
        p.integration_status AS integrationStatus
      FROM financial_accounts a
      INNER JOIN financial_providers p
        ON p.id = a.provider_id
      WHERE a.id = ?
        AND a.citizen_id = ?
      LIMIT 1`,
      [accountId, req.user.citizenId]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    return res.json({
      message: "Account details loaded successfully.",
      account: accounts[0],
    });
  } catch (error) {
    console.error("Account details error:", error.message);

    return res.status(500).json({
      message: "Could not load account details.",
    });
  }
});

// ==========================================
// UMUTURAGE.RW - FINANCE: INCOME SOURCES
// ==========================================

// Add a new income source
router.post("/finance/income-sources", authenticateToken, async (req, res) => {
  try {
    const citizenId = req.user.citizenId;

    const {
      sourceName,
      sourceType,
      description
    } = req.body;

    const allowedTypes = [
      "salary",
      "business",
      "farming",
      "freelance",
      "rental",
      "investment",
      "remittance",
      "government",
      "other"
    ];

    if (!sourceName || !sourceName.trim()) {
      return res.status(400).json({
        message: "Income source name is required."
      });
    }

    if (!sourceType || !allowedTypes.includes(sourceType)) {
      return res.status(400).json({
        message: "Please provide a valid income source type."
      });
    }

    const [result] = await db.promise().execute(
      `INSERT INTO income_sources
       (citizen_id, source_name, source_type, description)
       VALUES (?, ?, ?, ?)`,
      [
        citizenId,
        sourceName.trim(),
        sourceType,
        description ? description.trim() : null
      ]
    );

    return res.status(201).json({
      message: "Income source added successfully.",
      incomeSource: {
        id: result.insertId,
        sourceName: sourceName.trim(),
        sourceType,
        description: description || null,
        isActive: 1
      }
    });

  } catch (error) {
    console.error("Add income source error:", error);

    return res.status(500).json({
      message: "Unable to add income source."
    });
  }
});


// Get all income sources belonging to the logged-in citizen
router.get("/finance/income-sources", authenticateToken, async (req, res) => {
  try {
    const citizenId = req.user.citizenId;

    const [sources] = await db.promise().execute(
      `SELECT
         id,
         source_name AS sourceName,
         source_type AS sourceType,
         description,
         is_active AS isActive,
         created_at AS createdAt
       FROM income_sources
       WHERE citizen_id = ?
       ORDER BY created_at DESC`,
      [citizenId]
    );

    return res.json({
      message: "Income sources loaded successfully.",
      totalSources: sources.length,
      incomeSources: sources
    });

  } catch (error) {
    console.error("Get income sources error:", error);

    return res.status(500).json({
      message: "Unable to load income sources."
    });
  }
});

/* ==========================================
   UMUTURAGE.RW - FINANCE: RECORD INCOME
========================================== */

// Record income and update account balance
router.post("/finance/income", authenticateToken, async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    const citizenId = req.user.citizenId;

    const {
      accountId,
      incomeSourceId,
      amount,
      description,
      transactionDate
    } = req.body;

    // Validate required information
    if (!accountId || !incomeSourceId || amount === undefined) {
      return res.status(400).json({
        message: "Account, income source and amount are required."
      });
    }

    const incomeAmount = Number(amount);

    if (!Number.isFinite(incomeAmount) || incomeAmount <= 0) {
      return res.status(400).json({
        message: "Income amount must be greater than zero."
      });
    }

    if (!Number.isSafeInteger(Number(accountId)) ||
        !Number.isSafeInteger(Number(incomeSourceId))) {
      return res.status(400).json({
        message: "Invalid account or income source."
      });
    }

    // Validate transaction date
    let date = new Date();

    if (transactionDate) {
      date = new Date(transactionDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: "Invalid transaction date."
        });
      }
    }

    await connection.beginTransaction();

    // Lock and verify account ownership
    const [accounts] = await connection.execute(
      `SELECT id, currency
       FROM financial_accounts
       WHERE id = ? AND citizen_id = ?
       FOR UPDATE`,
      [Number(accountId), citizenId]
    );

    if (accounts.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Financial account not found."
      });
    }

    // Verify income source ownership
    const [sources] = await connection.execute(
      `SELECT id
       FROM income_sources
       WHERE id = ?
       AND citizen_id = ?
       AND is_active = 1`,
      [Number(incomeSourceId), citizenId]
    );

    if (sources.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: "Income source not found or inactive."
      });
    }

    const currency = accounts[0].currency || "RWF";

    // Save income transaction
    const [result] = await connection.execute(
      `INSERT INTO financial_transactions
       (
         citizen_id,
         account_id,
         income_source_id,
         transaction_reference,
         transaction_type,
         category,
         description,
         amount,
         currency,
         transaction_status,
         transaction_date
       )
       VALUES (?, ?, ?, ?, 'income', ?, ?, ?, ?, 'completed', ?)`,
      [
        citizenId,
        Number(accountId),
        Number(incomeSourceId),
        `INC-${require("crypto").randomUUID()}`,
        "Income",
        description ? String(description).trim() : "Income received",
        incomeAmount.toFixed(2),
        currency,
        date
      ]
    );

    // Update account balance
    await connection.execute(
      `UPDATE financial_accounts
       SET current_balance = current_balance + ?
       WHERE id = ? AND citizen_id = ?`,
      [incomeAmount.toFixed(2), Number(accountId), citizenId]
    );

    // Retrieve updated balance
    const [updatedAccounts] = await connection.execute(
      `SELECT current_balance
       FROM financial_accounts
       WHERE id = ? AND citizen_id = ?`,
      [Number(accountId), citizenId]
    );

    await connection.commit();

    return res.status(201).json({
      message: "Income recorded successfully.",
      transaction: {
        id: result.insertId,
        accountId: Number(accountId),
        incomeSourceId: Number(incomeSourceId),
        transactionType: "income",
        amount: incomeAmount.toFixed(2),
        currency,
        status: "completed",
        transactionDate: date,
        newAccountBalance: updatedAccounts[0].current_balance
      }
    });

  } catch (error) {
    await connection.rollback();

    console.error("Record income error:", error);

    return res.status(500).json({
      message: "Unable to record income."
    });

  } finally {
    connection.release();
  }
});


// Get financial transactions belonging to logged-in citizen
router.get("/finance/transactions", authenticateToken, async (req, res) => {
  try {
    const citizenId = req.user.citizenId;

    const [transactions] = await db.promise().execute(
      `SELECT
         t.id,
         t.account_id AS accountId,
         a.account_name AS accountName,
         t.income_source_id AS incomeSourceId,
         s.source_name AS incomeSourceName,
         t.transaction_reference AS transactionReference,
         t.transaction_type AS transactionType,
         t.category,
         t.description,
         t.amount,
         t.currency,
         t.transaction_status AS transactionStatus,
         t.transaction_date AS transactionDate,
         t.created_at AS createdAt
       FROM financial_transactions t
       INNER JOIN financial_accounts a
         ON a.id = t.account_id
       LEFT JOIN income_sources s
         ON s.id = t.income_source_id
       WHERE t.citizen_id = ?
       ORDER BY t.transaction_date DESC, t.id DESC`,
      [citizenId]
    );

    return res.json({
      message: "Financial transactions loaded successfully.",
      totalTransactions: transactions.length,
      transactions
    });

  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      message: "Unable to load financial transactions."
    });
  }
});

/* ==========================================
   UMUTURAGE.RW - FINANCE: EXPENSES
========================================== */

// Record a new expense
router.post("/finance/expenses", authenticateToken, async (req, res) => {
  const connection = await db.promise().getConnection();

  let transactionStarted = false;

  try {
    const citizenId = req.user.citizenId;

    const {
      accountId,
      amount,
      category,
      description,
      transactionDate
    } = req.body;

    if (!accountId || amount === undefined || !category) {
      return res.status(400).json({
        message: "Account, amount and expense category are required."
      });
    }

    const numericAccountId = Number(accountId);
    const expenseAmount = Number(amount);

    if (!Number.isSafeInteger(numericAccountId) || numericAccountId <= 0) {
      return res.status(400).json({
        message: "Invalid account ID."
      });
    }

    if (!Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        message: "Expense amount must be greater than zero."
      });
    }

    // Validate and normalize money to two decimal places
    const amountInCents = Math.round(expenseAmount * 100);

    if (!Number.isSafeInteger(amountInCents) ||
        Math.abs(expenseAmount * 100 - amountInCents) > 0.000001) {
      return res.status(400).json({
        message: "Expense amount must have no more than two decimal places."
      });
    }

    const allowedCategories = [
      "Food",
      "Transport",
      "Housing",
      "Education",
      "Healthcare",
      "Shopping",
      "Utilities",
      "Entertainment",
      "Business",
      "Other"
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: "Invalid expense category."
      });
    }

    let date = new Date();

    if (transactionDate) {
      date = new Date(transactionDate);

      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({
          message: "Invalid transaction date."
        });
      }
    }

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the citizen's account while checking its balance
    const [accounts] = await connection.execute(
      `SELECT id, currency, current_balance
       FROM financial_accounts
       WHERE id = ? AND citizen_id = ?
       FOR UPDATE`,
      [numericAccountId, citizenId]
    );

    if (accounts.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        message: "Financial account not found."
      });
    }

    const account = accounts[0];
    const currentBalance = Number(account.current_balance);

    if (!Number.isFinite(currentBalance) ||
        currentBalance < expenseAmount) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(400).json({
        message: "Insufficient recorded account balance.",
        availableBalance: account.current_balance,
        requestedAmount: expenseAmount.toFixed(2)
      });
    }

    const currency = account.currency || "RWF";

    // Record the expense
    const [result] = await connection.execute(
      `INSERT INTO financial_transactions
       (
         citizen_id,
         account_id,
         transaction_reference,
         transaction_type,
         category,
         description,
         amount,
         currency,
         transaction_status,
         transaction_date
       )
       VALUES (?, ?, ?, 'expense', ?, ?, ?, ?, 'completed', ?)`,
      [
        citizenId,
        numericAccountId,
        `EXP-${require("crypto").randomUUID()}`,
        category,
        description ? String(description).trim() : `${category} expense`,
        (amountInCents / 100).toFixed(2),
        currency,
        date
      ]
    );

    // Deduct the amount from the account
    await connection.execute(
      `UPDATE financial_accounts
       SET current_balance = current_balance - ?
       WHERE id = ? AND citizen_id = ?`,
      [
        (amountInCents / 100).toFixed(2),
        numericAccountId,
        citizenId
      ]
    );

    const [updatedAccounts] = await connection.execute(
      `SELECT current_balance
       FROM financial_accounts
       WHERE id = ? AND citizen_id = ?`,
      [numericAccountId, citizenId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: "Expense recorded successfully.",
      expense: {
        id: result.insertId,
        accountId: numericAccountId,
        transactionType: "expense",
        category,
        description: description || `${category} expense`,
        amount: (amountInCents / 100).toFixed(2),
        currency,
        status: "completed",
        transactionDate: date,
        newAccountBalance: updatedAccounts[0].current_balance
      }
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Record expense error:", error);

    return res.status(500).json({
      message: "Unable to record expense."
    });

  } finally {
    connection.release();
  }
});


// Retrieve expense history
router.get("/finance/expenses", authenticateToken, async (req, res) => {
  try {
    const citizenId = req.user.citizenId;

    const [expenses] = await db.promise().execute(
      `SELECT
         t.id,
         t.account_id AS accountId,
         a.account_name AS accountName,
         t.transaction_reference AS transactionReference,
         t.category,
         t.description,
         t.amount,
         t.currency,
         t.transaction_status AS transactionStatus,
         t.transaction_date AS transactionDate,
         t.created_at AS createdAt
       FROM financial_transactions t
       INNER JOIN financial_accounts a
         ON a.id = t.account_id
       WHERE t.citizen_id = ?
         AND t.transaction_type = 'expense'
       ORDER BY t.transaction_date DESC, t.id DESC`,
      [citizenId]
    );

    return res.json({
      message: "Expense history loaded successfully.",
      totalExpenses: expenses.length,
      expenses
    });

  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
      message: "Unable to load expense history."
    });
  }
});
// ==========================================
// UMUTURAGE.RW - FINANCE: BUDGETS
// ==========================================

const budgetSummaryQuery = `
  SELECT
    b.id,
    b.budget_name AS budgetName,
    b.category,
    b.budget_amount AS budgetAmount,
    b.currency,
    b.period_type AS periodType,
    DATE_FORMAT(b.start_date, '%Y-%m-%d') AS startDate,
    DATE_FORMAT(b.end_date, '%Y-%m-%d') AS endDate,
    b.budget_status AS budgetStatus,
    b.created_at AS createdAt,
    COALESCE((
      SELECT SUM(t.amount)
      FROM financial_transactions t
      WHERE t.citizen_id = b.citizen_id
        AND t.transaction_type = 'expense'
        AND t.transaction_status = 'completed'
        AND LOWER(TRIM(t.category)) = LOWER(TRIM(b.category))
        AND t.currency = b.currency
        AND DATE(t.transaction_date) >= b.start_date
        AND (
          b.end_date IS NULL
          OR DATE(t.transaction_date) <= b.end_date
        )
    ), 0) AS amountSpent
  FROM budgets b
`;

function isValidBudgetDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function formatBudget(budget) {
  const amount = Number(budget.budgetAmount);
  const spent = Number(budget.amountSpent);
  const remaining = amount - spent;

  return {
    ...budget,
    budgetAmount: amount.toFixed(2),
    amountSpent: spent.toFixed(2),
    remainingAmount: remaining.toFixed(2),
    spendingPercentage:
      amount > 0
        ? Number(((spent / amount) * 100).toFixed(2))
        : 0,
    isOverBudget: spent > amount,
  };
}
// CREATE A BUDGET
router.post("/finance/budgets", authenticateToken, async (req, res) => {
  const {
    budgetName,
    category,
    budgetAmount,
    currency,
    periodType,
    startDate,
    endDate,
  } = req.body;

  const amount = Number(budgetAmount);
  const selectedCurrency = currency || "RWF";
  const selectedPeriod = periodType || "monthly";

  const allowedPeriods = ["weekly", "monthly", "yearly", "custom"];

  if (
    typeof budgetName !== "string" ||
    !budgetName.trim() ||
    typeof category !== "string" ||
    !category.trim() ||
    budgetAmount === undefined ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      message: "Please provide a valid budget name, category and amount.",
    });
  }

  if (
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) {
    return res.status(400).json({
      message: "Budget amount must have no more than two decimal places.",
    });
  }

  if (!/^[A-Za-z]{3}$/.test(selectedCurrency)) {
    return res.status(400).json({
      message: "Currency must be a valid three-letter code, such as RWF.",
    });
  }

  if (!allowedPeriods.includes(selectedPeriod)) {
    return res.status(400).json({
      message: "Please select a valid budget period.",
    });
  }

  if (!isValidBudgetDate(startDate)) {
    return res.status(400).json({
      message: "Please provide a valid start date.",
    });
  }

  if (endDate && !isValidBudgetDate(endDate)) {
    return res.status(400).json({
      message: "Please provide a valid end date.",
    });
  }

  if (endDate && endDate < startDate) {
    return res.status(400).json({
      message: "End date cannot be earlier than start date.",
    });
  }

  try {
    const [result] = await db.promise().execute(
      `INSERT INTO budgets (
        citizen_id,
        budget_name,
        category,
        budget_amount,
        currency,
        period_type,
        start_date,
        end_date,
        budget_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        req.user.citizenId,
        budgetName.trim(),
        category.trim(),
        amount.toFixed(2),
        selectedCurrency.toUpperCase(),
        selectedPeriod,
        startDate,
        endDate || null,
      ]
    );

    return res.status(201).json({
      message: "Budget created successfully.",
      budgetId: result.insertId,
    });
  } catch (error) {
    console.error("Create budget error:", error.message);

    return res.status(500).json({
      message: "Could not create your budget.",
    });
  }
});
// GET ALL CITIZEN BUDGETS
router.get("/finance/budgets", authenticateToken, async (req, res) => {
  try {
    const [budgets] = await db.promise().execute(
      `${budgetSummaryQuery}
       WHERE b.citizen_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.citizenId]
    );

    const formattedBudgets = budgets.map(formatBudget);

    return res.json({
      message: "Budgets loaded successfully.",
      totalBudgets: formattedBudgets.length,
      budgets: formattedBudgets,
    });
  } catch (error) {
    console.error("Get budgets error:", error.message);

    return res.status(500).json({
      message: "Could not load your budgets.",
    });
  }
});
// GET ONE BUDGET — VERIFY CITIZEN OWNERSHIP
router.get("/finance/budgets/:id", authenticateToken, async (req, res) => {
  const budgetId = Number(req.params.id);

  if (!Number.isSafeInteger(budgetId) || budgetId <= 0) {
    return res.status(400).json({
      message: "Invalid budget ID.",
    });
  }

  try {
    const [budgets] = await db.promise().execute(
      `${budgetSummaryQuery}
       WHERE b.id = ?
         AND b.citizen_id = ?
       LIMIT 1`,
      [budgetId, req.user.citizenId]
    );

    if (budgets.length === 0) {
      return res.status(404).json({
        message: "Budget not found.",
      });
    }

    return res.json({
      message: "Budget details loaded successfully.",
      budget: formatBudget(budgets[0]),
    });
  } catch (error) {
    console.error("Get budget details error:", error.message);

    return res.status(500).json({
      message: "Could not load budget details.",
    });
  }
});
// UPDATE A BUDGET
router.put("/finance/budgets/:id", authenticateToken, async (req, res) => {
  const budgetId = Number(req.params.id);

  const {
    budgetName,
    category,
    budgetAmount,
    currency,
    periodType,
    startDate,
    endDate,
  } = req.body;

  const amount = Number(budgetAmount);
  const selectedCurrency = currency || "RWF";
  const selectedPeriod = periodType || "monthly";
  const allowedPeriods = ["weekly", "monthly", "yearly", "custom"];

  if (!Number.isSafeInteger(budgetId) || budgetId <= 0) {
    return res.status(400).json({
      message: "Invalid budget ID.",
    });
  }

  if (
    typeof budgetName !== "string" ||
    !budgetName.trim() ||
    typeof category !== "string" ||
    !category.trim() ||
    budgetAmount === undefined ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) {
    return res.status(400).json({
      message: "Please provide valid budget details.",
    });
  }

  if (
    !/^[A-Za-z]{3}$/.test(selectedCurrency) ||
    !allowedPeriods.includes(selectedPeriod) ||
    !isValidBudgetDate(startDate) ||
    (endDate && !isValidBudgetDate(endDate)) ||
    (endDate && endDate < startDate)
  ) {
    return res.status(400).json({
      message: "Please check the currency, period and budget dates.",
    });
  }

  try {
    const [result] = await db.promise().execute(
      `UPDATE budgets
       SET budget_name = ?,
           category = ?,
           budget_amount = ?,
           currency = ?,
           period_type = ?,
           start_date = ?,
           end_date = ?
       WHERE id = ?
         AND citizen_id = ?
         AND budget_status = 'active'`,
      [
        budgetName.trim(),
        category.trim(),
        amount.toFixed(2),
        selectedCurrency.toUpperCase(),
        selectedPeriod,
        startDate,
        endDate || null,
        budgetId,
        req.user.citizenId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await db.promise().execute(
        `SELECT id, budget_status
         FROM budgets
         WHERE id = ? AND citizen_id = ?
         LIMIT 1`,
        [budgetId, req.user.citizenId]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          message: "Budget not found.",
        });
      }

      return res.status(400).json({
        message: "Only active budgets can be edited.",
      });
    }

    return res.json({
      message: "Budget updated successfully.",
    });
  } catch (error) {
    console.error("Update budget error:", error.message);

    return res.status(500).json({
      message: "Could not update your budget.",
    });
  }
});
// UPDATE BUDGET STATUS
router.patch(
  "/finance/budgets/:id/status",
  authenticateToken,
  async (req, res) => {
    const budgetId = Number(req.params.id);
    const { budgetStatus } = req.body;

    const allowedStatuses = ["active", "completed", "cancelled"];

    if (!Number.isSafeInteger(budgetId) || budgetId <= 0) {
      return res.status(400).json({
        message: "Invalid budget ID.",
      });
    }

    if (!allowedStatuses.includes(budgetStatus)) {
      return res.status(400).json({
        message: "Invalid budget status.",
      });
    }

    try {
      const [result] = await db.promise().execute(
        `UPDATE budgets
         SET budget_status = ?
         WHERE id = ? AND citizen_id = ?`,
        [budgetStatus, budgetId, req.user.citizenId]
      );

      if (result.affectedRows === 0) {
        const [existing] = await db.promise().execute(
          `SELECT id FROM budgets
           WHERE id = ? AND citizen_id = ?
           LIMIT 1`,
          [budgetId, req.user.citizenId]
        );

        if (existing.length === 0) {
          return res.status(404).json({
            message: "Budget not found.",
          });
        }
      }

      return res.json({
        message: "Budget status updated successfully.",
        budgetStatus,
      });
    } catch (error) {
      console.error("Budget status error:", error.message);

      return res.status(500).json({
        message: "Could not update budget status.",
      });
    }
  }
);
module.exports = router;
