import express from "express";
import { Login, Signup } from "../control/Auth/auth-controller";
import { body } from "express-validator";

// // Import controllers from
// import { errorUser, getUsers } from "./controllers/user-controller";
// import { verify } from "@/middleware/auth-middleware";

// Setup router
const router = express.Router();

// // Setup all routes for user
// router.get("/", verify, getUsers);

// // Setup all routes for user
// router.get("/error", errorUser);

// Validation middleware for signup
const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim(),
  body('lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
];

router.post("/signup", signupValidation, Signup);
router.post("/login", Login);

// Export router; should always export as default
export default router;
