#!/usr/bin/env node

/**
 * Database Backup and Monitoring Script for ExamGuard
 * 
 * This script provides database backup functionality and monitoring
 * for production MongoDB Atlas deployments.
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const DatabaseConfig = require('../config/database');

class DatabaseBackup {
     constructor() {
          this.backupDir = path.join(__dirname, '../backups');
          this.maxBackups = 7; // Keep last 7 backups
     }

     /**
      * Create database backup
      */
     async createBackup() {
          console.log('💾 Starting database backup...');

          try {
               await DatabaseConfig.connect();

               // Ensure backup directory exists
               await this.ensureBackupDirectory();

               // Create backup filename with timestamp
               const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
               const backupFile = path.join(this.backupDir, `examguard-backup-${timestamp}.json`);

               // Export all collections
               const backup = await this.exportAllCollections();

               // Write backup to file
               await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

               console.log(`✅ Backup created: ${backupFile}`);
               console.log(`📊 Backup size: ${this.formatBytes((await fs.stat(backupFile)).size)}`);

               // Clean up old backups
               await this.cleanupOldBackups();

               return backupFile;

          } catch (error) {
               console.error('❌ Backup failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Restore database from backup
      */
     async restoreBackup(backupFile) {
          console.log(`🔄 Restoring database from: ${backupFile}`);

          try {
               await DatabaseConfig.connect();

               // Read backup file
               const backupData = JSON.parse(await fs.readFile(backupFile, 'utf8'));

               // Validate backup format
               if (!backupData.metadata || !backupData.collections) {
                    throw new Error('Invalid backup file format');
               }

               console.log(`📅 Backup created: ${backupData.metadata.createdAt}`);
               console.log(`📊 Collections: ${Object.keys(backupData.collections).length}`);

               // Confirm restoration in production
               if (process.env.NODE_ENV === 'production') {
                    if (process.env.CONFIRM_RESTORE !== 'YES_RESTORE_DATABASE') {
                         console.log('❌ Database restore cancelled. Set CONFIRM_RESTORE=YES_RESTORE_DATABASE to proceed.');
                         return;
                    }
               }

               const db = mongoose.connection.db;

               // Restore each collection
               for (const [collectionName, documents] of Object.entries(backupData.collections)) {
                    if (documents.length > 0) {
                         console.log(`🔄 Restoring ${collectionName}: ${documents.length} documents`);

                         // Clear existing collection
                         await db.collection(collectionName).deleteMany({});

                         // Insert backup data
                         await db.collection(collectionName).insertMany(documents);

                         console.log(`✅ Restored ${collectionName}`);
                    }
               }

               console.log('✅ Database restore completed');

          } catch (error) {
               console.error('❌ Restore failed:', error.message);
               throw error;
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Export all collections to backup format
      */
     async exportAllCollections() {
          const db = mongoose.connection.db;
          const collections = await db.listCollections().toArray();

          const backup = {
               metadata: {
                    createdAt: new Date().toISOString(),
                    version: '1.0.0',
                    database: db.databaseName,
                    collections: collections.length
               },
               collections: {}
          };

          for (const collection of collections) {
               const collectionName = collection.name;
               console.log(`📦 Exporting ${collectionName}...`);

               const documents = await db.collection(collectionName).find({}).toArray();
               backup.collections[collectionName] = documents;

               console.log(`✅ Exported ${collectionName}: ${documents.length} documents`);
          }

          return backup;
     }

     /**
      * Ensure backup directory exists
      */
     async ensureBackupDirectory() {
          try {
               await fs.access(this.backupDir);
          } catch (error) {
               await fs.mkdir(this.backupDir, { recursive: true });
               console.log(`📁 Created backup directory: ${this.backupDir}`);
          }
     }

     /**
      * Clean up old backup files
      */
     async cleanupOldBackups() {
          try {
               const files = await fs.readdir(this.backupDir);
               const backupFiles = files
                    .filter(file => file.startsWith('examguard-backup-') && file.endsWith('.json'))
                    .map(file => ({
                         name: file,
                         path: path.join(this.backupDir, file),
                         stat: null
                    }));

               // Get file stats
               for (const file of backupFiles) {
                    file.stat = await fs.stat(file.path);
               }

               // Sort by creation time (newest first)
               backupFiles.sort((a, b) => b.stat.mtime - a.stat.mtime);

               // Remove old backups
               if (backupFiles.length > this.maxBackups) {
                    const filesToDelete = backupFiles.slice(this.maxBackups);

                    for (const file of filesToDelete) {
                         await fs.unlink(file.path);
                         console.log(`🗑️  Removed old backup: ${file.name}`);
                    }
               }

          } catch (error) {
               console.warn('⚠️  Failed to cleanup old backups:', error.message);
          }
     }

     /**
      * List available backups
      */
     async listBackups() {
          try {
               await this.ensureBackupDirectory();
               const files = await fs.readdir(this.backupDir);

               const backupFiles = files
                    .filter(file => file.startsWith('examguard-backup-') && file.endsWith('.json'))
                    .map(file => ({
                         name: file,
                         path: path.join(this.backupDir, file)
                    }));

               if (backupFiles.length === 0) {
                    console.log('📁 No backups found');
                    return [];
               }

               console.log(`📋 Found ${backupFiles.length} backup(s):`);

               for (const file of backupFiles) {
                    const stat = await fs.stat(file.path);
                    const size = this.formatBytes(stat.size);
                    const date = stat.mtime.toISOString();
                    console.log(`  📦 ${file.name} (${size}, ${date})`);
               }

               return backupFiles;

          } catch (error) {
               console.error('❌ Failed to list backups:', error.message);
               return [];
          }
     }

     /**
      * Monitor database health
      */
     async monitorHealth() {
          console.log('🔍 Monitoring database health...');

          try {
               await DatabaseConfig.connect();

               const db = mongoose.connection.db;

               // Get database stats
               const stats = await db.stats();
               const serverStatus = await db.admin().serverStatus();

               // Connection info
               const connectionInfo = {
                    host: mongoose.connection.host,
                    port: mongoose.connection.port,
                    database: mongoose.connection.name,
                    readyState: mongoose.connection.readyState
               };

               // Performance metrics
               const metrics = {
                    connections: serverStatus.connections,
                    memory: serverStatus.mem,
                    operations: serverStatus.opcounters,
                    network: serverStatus.network
               };

               // Database statistics
               const dbStats = {
                    collections: stats.collections,
                    dataSize: this.formatBytes(stats.dataSize),
                    storageSize: this.formatBytes(stats.storageSize),
                    indexes: stats.indexes,
                    avgObjSize: this.formatBytes(stats.avgObjSize)
               };

               // Health report
               console.log('\n📊 Database Health Report');
               console.log('==========================');
               console.log(`🔗 Connection: ${connectionInfo.host}:${connectionInfo.port}`);
               console.log(`📊 Database: ${connectionInfo.database}`);
               console.log(`📈 Collections: ${dbStats.collections}`);
               console.log(`💾 Data Size: ${dbStats.dataSize}`);
               console.log(`🗂️  Storage Size: ${dbStats.storageSize}`);
               console.log(`🔍 Indexes: ${dbStats.indexes}`);
               console.log(`🔌 Active Connections: ${metrics.connections.current}`);
               console.log(`💾 Memory Usage: ${this.formatBytes(metrics.memory.resident * 1024 * 1024)}`);

               // Performance warnings
               if (metrics.connections.current > 100) {
                    console.warn('⚠️  High connection count detected');
               }

               if (stats.dataSize > 500 * 1024 * 1024) { // 500MB
                    console.warn('⚠️  Large database size detected');
               }

               return {
                    connection: connectionInfo,
                    metrics,
                    stats: dbStats,
                    healthy: true
               };

          } catch (error) {
               console.error('❌ Health monitoring failed:', error.message);
               return {
                    healthy: false,
                    error: error.message
               };
          } finally {
               await DatabaseConfig.disconnect();
          }
     }

     /**
      * Format bytes to human-readable format
      */
     formatBytes(bytes) {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
     }
}

// Command line interface
if (require.main === module) {
     const command = process.argv[2] || 'backup';
     const backup = new DatabaseBackup();

     switch (command) {
          case 'backup':
               backup.createBackup().catch(error => {
                    console.error('💥 Backup failed:', error);
                    process.exit(1);
               });
               break;

          case 'restore':
               const backupFile = process.argv[3];
               if (!backupFile) {
                    console.error('❌ Please specify backup file to restore');
                    console.log('Usage: node backup-database.js restore <backup-file>');
                    process.exit(1);
               }
               backup.restoreBackup(backupFile).catch(error => {
                    console.error('💥 Restore failed:', error);
                    process.exit(1);
               });
               break;

          case 'list':
               backup.listBackups().catch(error => {
                    console.error('💥 List failed:', error);
                    process.exit(1);
               });
               break;

          case 'monitor':
               backup.monitorHealth().catch(error => {
                    console.error('💥 Monitoring failed:', error);
                    process.exit(1);
               });
               break;

          default:
               console.log('Usage: node backup-database.js [backup|restore|list|monitor]');
               console.log('');
               console.log('Commands:');
               console.log('  backup           Create database backup');
               console.log('  restore <file>   Restore from backup file');
               console.log('  list             List available backups');
               console.log('  monitor          Monitor database health');
               process.exit(1);
     }
}

module.exports = DatabaseBackup;