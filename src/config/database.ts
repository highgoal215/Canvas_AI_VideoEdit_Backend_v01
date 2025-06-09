import mysql from 'mysql2/promise';

const dbConfig = {
host: process.env.DB_HOST || 'localhost',
user: process.env.DB_USER || 'root',
password: process.env.DB_PASSWORD || '',
database: process.env.DB_NAME || 'canvas_ai_db',
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0
};

export const pool = mysql.createPool(dbConfig);

// CREATE TABLE generated_images (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   user_id INT NOT NULL,
//   image_url VARCHAR(500) NOT NULL,
//   prompt TEXT NOT NULL,
//   enhanced_prompt TEXT,
//   style VARCHAR(100),
//   aspect_ratio VARCHAR(50),
//   size VARCHAR(20),
//   is_regenerated BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   INDEX idx_user_id (user_id),
//   INDEX idx_created_at (created_at)
// );