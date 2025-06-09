import { NextFunction } from "connect";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
  user?: any;
}

// @desc Authenticates user and protects routes
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token =
    req.header("Authorization")?.replace("Bearer ", "") ||
    req.header("x-auth-token");

  // Check if token exists
  if (!token) {
    res.status(401).json({ message: "No token, authorization denied" });
    return;
  }

  // Check if JWT_SECRET exists
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  try {
    // Now both token and jwtSecret are guaranteed to be strings
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};



// export interface AuthenticatedRequest extends Request {
//   user?: {
//     id: number;
//     email: string;
//     name: string;
//   };
// }

// export const authenticateToken = (
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({
//       success: false,
//       error: "Access token required",
//     });
//   }

//   jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
//     if (err) {
//       return res.status(403).json({
//         success: false,
//         error: "Invalid or expired token",
//       });
//     }
//     req.user = user;
//     next();
//   });
// };