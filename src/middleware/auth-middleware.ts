import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try to get token from different sources
    let token: string | undefined;

    // 1. Check Authorization header
    console.log("All headers:", req.headers);
    const authHeader = req.headers['authorization'];
    console.log("Auth header received:", authHeader);
    
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // 2. Check request body
    if (!token && req.body && req.body.accessToken) {
      token = req.body.accessToken;
    }

    // 3. Check query parameters
    if (!token && req.query && req.query.accessToken) {
      token = req.query.accessToken as string;
    }

    console.log("Token found:", token ? "Yes" : "No");

    if (!token) {
      console.log("No token found in any location");
      res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log("Decoded token:", decoded);
    
    // Check if user exists and is active
    const user = await User.findByPk(decoded.userId);
    console.log("Found user:", user ? "Yes" : "No");
    
    if (!user || !user.isActive) {
      console.log("User not found or not active");
      res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
      return;
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      email: user.email
    };
    console.log("Authentication successful for user:", user.email);

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};