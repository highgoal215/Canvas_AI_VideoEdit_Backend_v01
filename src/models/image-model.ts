import { pool } from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface GeneratedImage {
  id?: number;
  user_id: number;
  image_url: string;
  prompt: string;
  enhanced_prompt?: string;
  style?: string;
  aspect_ratio?: string;
  size: string;
  is_regenerated?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class ImageModel {
  static async saveGeneratedImage(imageData: GeneratedImage): Promise<number> {
    const connection = await pool.getConnection()
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO generated_images 
         (user_id, image_url, prompt, enhanced_prompt, style, aspect_ratio, size, is_regenerated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          imageData.user_id,
          imageData.image_url,
          imageData.prompt,
          imageData.enhanced_prompt || imageData.prompt,
          imageData.style || 'default',
          imageData.aspect_ratio || 'square',
          imageData.size,
          imageData.is_regenerated || false
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async getUserImages(userId: number, limit: number = 50, offset: number = 0): Promise<GeneratedImage[]> {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM generated_images 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
      return rows as GeneratedImage[];
    } finally {
      connection.release();
    }
  }

  static async getImageById(imageId: number, userId: number): Promise<GeneratedImage | null> {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM generated_images WHERE id = ? AND user_id = ?`,
        [imageId, userId]
      );
      return rows.length > 0 ? rows[0] as GeneratedImage : null;
    } finally {
      connection.release();
    }
  }

  static async deleteImage(imageId: number, userId: number): Promise<boolean> {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute<ResultSetHeader>(
        `DELETE FROM generated_images WHERE id = ? AND user_id = ?`,
        [imageId, userId]
      );
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }
}