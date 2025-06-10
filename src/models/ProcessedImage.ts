import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export interface ProcessedImageAttributes {
  id?: number;
  userId: number;
  originalImagePath: string;
  processedImagePath: string;
  outputFormat: string;
  originalSize: number;
  processedSize: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProcessedImageCreationAttributes extends Optional<ProcessedImageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class ProcessedImage extends Model<ProcessedImageAttributes, ProcessedImageCreationAttributes> implements ProcessedImageAttributes {
  public id!: number;
  public userId!: number;
  public originalImagePath!: string;
  public processedImagePath!: string;
  public outputFormat!: string;
  public originalSize!: number;
  public processedSize!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ProcessedImage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    originalImagePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    processedImagePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    outputFormat: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    originalSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    processedSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'processed_images',
    timestamps: true,
  }
); 