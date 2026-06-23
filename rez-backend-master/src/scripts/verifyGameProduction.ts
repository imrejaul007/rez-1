/**
 * Game Production Readiness Verification Script
 *
 * This script verifies that all game-related features are production-ready:
 * 1. Models are properly defined and exported
 * 2. Database connection works
 * 3. Seed data exists (QuizQuestions, TriviaQuestions)
 * 4. Static methods work correctly
 * 5. Cron jobs are initialized
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { QuizQuestion, TriviaQuestion } from '../models';
import GameSession from '../models/GameSession';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface VerificationReport {
  timestamp: string;
  environment: string;
  database: {
    connected: boolean;
    uri: string;
    connectionTime: number;
  };
  models: {
    QuizQuestion: {
      exists: boolean;
      exported: boolean;
      totalCount: number;
      activeCount: number;
      categories: Record<string, number>;
      difficulties: Record<string, number>;
    };
    TriviaQuestion: {
      exists: boolean;
      exported: boolean;
      totalCount: number;
      activeCount: number;
      categories: Record<string, number>;
      difficulties: Record<string, number>;
    };
    GameSession: {
      exists: boolean;
      exported: boolean;
      totalCount: number;
      statusBreakdown: Record<string, number>;
      gameTypeBreakdown: Record<string, number>;
    };
  };
  staticMethods: {
    QuizQuestion: {
      getRandomQuestions: { tested: boolean; success: boolean; sampleSize: number; error?: string };
      getQuestionsByDifficulty: { tested: boolean; success: boolean; error?: string };
      getQuestionsByCategory: { tested: boolean; success: boolean; error?: string };
    };
    TriviaQuestion: {
      getRandomTrivia: { tested: boolean; success: boolean; sampleSize: number; error?: string };
      getTriviaByCategory: { tested: boolean; success: boolean; error?: string };
    };
    GameSession: {
      expireSessions: { tested: boolean; success: boolean; error?: string };
    };
  };
  cronJobs: {
    sessionCleanup: { file: string; exists: boolean };
    coinExpiry: { file: string; exists: boolean };
  };
  productionReady: boolean;
  issues: string[];
  recommendations: string[];
}

async function verifyGameProduction(): Promise<VerificationReport> {
  const startTime = Date.now();
  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: false,
      uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'NOT_SET',
      connectionTime: 0,
    },
    models: {
      QuizQuestion: {
        exists: false,
        exported: false,
        totalCount: 0,
        activeCount: 0,
        categories: {},
        difficulties: {},
      },
      TriviaQuestion: {
        exists: false,
        exported: false,
        totalCount: 0,
        activeCount: 0,
        categories: {},
        difficulties: {},
      },
      GameSession: {
        exists: false,
        exported: false,
        totalCount: 0,
        statusBreakdown: {},
        gameTypeBreakdown: {},
      },
    },
    staticMethods: {
      QuizQuestion: {
        getRandomQuestions: { tested: false, success: false, sampleSize: 0 },
        getQuestionsByDifficulty: { tested: false, success: false },
        getQuestionsByCategory: { tested: false, success: false },
      },
      TriviaQuestion: {
        getRandomTrivia: { tested: false, success: false, sampleSize: 0 },
        getTriviaByCategory: { tested: false, success: false },
      },
      GameSession: {
        expireSessions: { tested: false, success: false },
      },
    },
    cronJobs: {
      sessionCleanup: { file: 'src/jobs/cleanupExpiredSessions.ts', exists: false },
      coinExpiry: { file: 'src/jobs/expireCoins.ts', exists: false },
    },
    productionReady: false,
    issues: [],
    recommendations: [],
  };

  try {
    console.log('🔍 Starting Game Production Readiness Verification...\n');

    // Step 1: Check MongoDB connection
    console.log('📊 Step 1: Verifying Database Connection...');
    const dbUri = process.env.MONGODB_URI;

    if (!dbUri) {
      report.issues.push('MONGODB_URI not set in environment variables');
      throw new Error('MONGODB_URI environment variable is not set');
    }

    const dbStartTime = Date.now();
    await mongoose.connect(dbUri);
    report.database.connectionTime = Date.now() - dbStartTime;
    report.database.connected = true;
    console.log(`✅ Database connected successfully (${report.database.connectionTime}ms)`);
    console.log(`   URI: ${report.database.uri}\n`);

    // Step 2: Verify QuizQuestion Model
    console.log('📊 Step 2: Verifying QuizQuestion Model...');
    try {
      report.models.QuizQuestion.exists = true;
      report.models.QuizQuestion.exported = typeof QuizQuestion !== 'undefined';

      const totalQuizCount = await QuizQuestion.countDocuments();
      const activeQuizCount = await QuizQuestion.countDocuments({ isActive: true });

      report.models.QuizQuestion.totalCount = totalQuizCount;
      report.models.QuizQuestion.activeCount = activeQuizCount;

      // Get category breakdown
      const categoryAgg = await QuizQuestion.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      categoryAgg.forEach(item => {
        report.models.QuizQuestion.categories[item._id] = item.count;
      });

      // Get difficulty breakdown
      const difficultyAgg = await QuizQuestion.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]);
      difficultyAgg.forEach(item => {
        report.models.QuizQuestion.difficulties[item._id] = item.count;
      });

      console.log(`✅ QuizQuestion Model verified`);
      console.log(`   Total: ${totalQuizCount}, Active: ${activeQuizCount}`);
      console.log(`   Categories:`, report.models.QuizQuestion.categories);
      console.log(`   Difficulties:`, report.models.QuizQuestion.difficulties);

      if (totalQuizCount === 0) {
        report.issues.push('No QuizQuestions found in database. Run seedQuizQuestions.ts');
      } else if (totalQuizCount < 50) {
        report.recommendations.push(`Only ${totalQuizCount} quiz questions. Recommend at least 50 for production.`);
      }
    } catch (error) {
      report.issues.push(`QuizQuestion model verification failed: ${error}`);
      console.error('❌ QuizQuestion verification failed:', error);
    }
    console.log('');

    // Step 3: Verify TriviaQuestion Model
    console.log('📊 Step 3: Verifying TriviaQuestion Model...');
    try {
      report.models.TriviaQuestion.exists = true;
      report.models.TriviaQuestion.exported = typeof TriviaQuestion !== 'undefined';

      const totalTriviaCount = await TriviaQuestion.countDocuments();
      const activeTriviaCount = await TriviaQuestion.countDocuments({ isActive: true });

      report.models.TriviaQuestion.totalCount = totalTriviaCount;
      report.models.TriviaQuestion.activeCount = activeTriviaCount;

      // Get category breakdown
      const categoryAgg = await TriviaQuestion.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]);
      categoryAgg.forEach(item => {
        report.models.TriviaQuestion.categories[item._id] = item.count;
      });

      // Get difficulty breakdown
      const difficultyAgg = await TriviaQuestion.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]);
      difficultyAgg.forEach(item => {
        report.models.TriviaQuestion.difficulties[item._id] = item.count;
      });

      console.log(`✅ TriviaQuestion Model verified`);
      console.log(`   Total: ${totalTriviaCount}, Active: ${activeTriviaCount}`);
      console.log(`   Categories:`, report.models.TriviaQuestion.categories);
      console.log(`   Difficulties:`, report.models.TriviaQuestion.difficulties);

      if (totalTriviaCount === 0) {
        report.issues.push('No TriviaQuestions found in database. Run seedTriviaQuestions.ts');
      } else if (totalTriviaCount < 30) {
        report.recommendations.push(`Only ${totalTriviaCount} trivia questions. Recommend at least 30 for production.`);
      }
    } catch (error) {
      report.issues.push(`TriviaQuestion model verification failed: ${error}`);
      console.error('❌ TriviaQuestion verification failed:', error);
    }
    console.log('');

    // Step 4: Verify GameSession Model
    console.log('📊 Step 4: Verifying GameSession Model...');
    try {
      report.models.GameSession.exists = true;
      report.models.GameSession.exported = typeof GameSession !== 'undefined';

      const totalSessionCount = await GameSession.countDocuments();
      report.models.GameSession.totalCount = totalSessionCount;

      // Get status breakdown
      const statusAgg = await GameSession.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      statusAgg.forEach(item => {
        report.models.GameSession.statusBreakdown[item._id] = item.count;
      });

      // Get game type breakdown
      const gameTypeAgg = await GameSession.aggregate([
        { $group: { _id: '$gameType', count: { $sum: 1 } } },
      ]);
      gameTypeAgg.forEach(item => {
        report.models.GameSession.gameTypeBreakdown[item._id] = item.count;
      });

      console.log(`✅ GameSession Model verified`);
      console.log(`   Total: ${totalSessionCount}`);
      console.log(`   Status:`, report.models.GameSession.statusBreakdown);
      console.log(`   Game Types:`, report.models.GameSession.gameTypeBreakdown);
    } catch (error) {
      report.issues.push(`GameSession model verification failed: ${error}`);
      console.error('❌ GameSession verification failed:', error);
    }
    console.log('');

    // Step 5: Test QuizQuestion Static Methods
    console.log('📊 Step 5: Testing QuizQuestion Static Methods...');

    // Test getRandomQuestions
    try {
      report.staticMethods.QuizQuestion.getRandomQuestions.tested = true;
      const randomQuestions = await QuizQuestion.getRandomQuestions(5);
      report.staticMethods.QuizQuestion.getRandomQuestions.success = true;
      report.staticMethods.QuizQuestion.getRandomQuestions.sampleSize = randomQuestions.length;
      console.log(`✅ getRandomQuestions(5) returned ${randomQuestions.length} questions`);
    } catch (error) {
      report.staticMethods.QuizQuestion.getRandomQuestions.error = String(error);
      report.issues.push(`getRandomQuestions failed: ${error}`);
      console.error(`❌ getRandomQuestions failed:`, error);
    }

    // Test getQuestionsByDifficulty
    try {
      report.staticMethods.QuizQuestion.getQuestionsByDifficulty.tested = true;
      const easyQuestions = await QuizQuestion.getQuestionsByDifficulty('easy', 5);
      report.staticMethods.QuizQuestion.getQuestionsByDifficulty.success = true;
      console.log(`✅ getQuestionsByDifficulty('easy', 5) returned ${easyQuestions.length} questions`);
    } catch (error) {
      report.staticMethods.QuizQuestion.getQuestionsByDifficulty.error = String(error);
      report.issues.push(`getQuestionsByDifficulty failed: ${error}`);
      console.error(`❌ getQuestionsByDifficulty failed:`, error);
    }

    // Test getQuestionsByCategory
    try {
      report.staticMethods.QuizQuestion.getQuestionsByCategory.tested = true;
      const shoppingQuestions = await QuizQuestion.getQuestionsByCategory('shopping', 5);
      report.staticMethods.QuizQuestion.getQuestionsByCategory.success = true;
      console.log(`✅ getQuestionsByCategory('shopping', 5) returned ${shoppingQuestions.length} questions`);
    } catch (error) {
      report.staticMethods.QuizQuestion.getQuestionsByCategory.error = String(error);
      report.issues.push(`getQuestionsByCategory failed: ${error}`);
      console.error(`❌ getQuestionsByCategory failed:`, error);
    }
    console.log('');

    // Step 6: Test TriviaQuestion Static Methods
    console.log('📊 Step 6: Testing TriviaQuestion Static Methods...');

    // Test getRandomTrivia
    try {
      report.staticMethods.TriviaQuestion.getRandomTrivia.tested = true;
      const randomTrivia = await TriviaQuestion.getRandomTrivia(3);
      report.staticMethods.TriviaQuestion.getRandomTrivia.success = true;
      report.staticMethods.TriviaQuestion.getRandomTrivia.sampleSize = randomTrivia.length;
      console.log(`✅ getRandomTrivia(3) returned ${randomTrivia.length} questions`);
    } catch (error) {
      report.staticMethods.TriviaQuestion.getRandomTrivia.error = String(error);
      report.issues.push(`getRandomTrivia failed: ${error}`);
      console.error(`❌ getRandomTrivia failed:`, error);
    }

    // Test getTriviaByCategory
    try {
      report.staticMethods.TriviaQuestion.getTriviaByCategory.tested = true;
      const scienceTrivia = await TriviaQuestion.getTriviaByCategory('science', 3);
      report.staticMethods.TriviaQuestion.getTriviaByCategory.success = true;
      console.log(`✅ getTriviaByCategory('science', 3) returned ${scienceTrivia.length} questions`);
    } catch (error) {
      report.staticMethods.TriviaQuestion.getTriviaByCategory.error = String(error);
      report.issues.push(`getTriviaByCategory failed: ${error}`);
      console.error(`❌ getTriviaByCategory failed:`, error);
    }
    console.log('');

    // Step 7: Test GameSession Static Methods
    console.log('📊 Step 7: Testing GameSession Static Methods...');

    // Test expireSessions
    try {
      report.staticMethods.GameSession.expireSessions.tested = true;
      const expireResult = await GameSession.expireSessions();
      report.staticMethods.GameSession.expireSessions.success = true;
      console.log(`✅ expireSessions() executed successfully (${expireResult.modifiedCount} sessions expired)`);
    } catch (error) {
      report.staticMethods.GameSession.expireSessions.error = String(error);
      report.issues.push(`expireSessions failed: ${error}`);
      console.error(`❌ expireSessions failed:`, error);
    }
    console.log('');

    // Step 8: Check Cron Job Files
    console.log('📊 Step 8: Verifying Cron Job Files...');
    const fs = require('fs');
    const path = require('path');

    const sessionCleanupPath = path.resolve(__dirname, '../jobs/cleanupExpiredSessions.ts');
    const coinExpiryPath = path.resolve(__dirname, '../jobs/expireCoins.ts');

    report.cronJobs.sessionCleanup.exists = fs.existsSync(sessionCleanupPath);
    report.cronJobs.coinExpiry.exists = fs.existsSync(coinExpiryPath);

    if (report.cronJobs.sessionCleanup.exists) {
      console.log(`✅ cleanupExpiredSessions.ts exists at ${sessionCleanupPath}`);
    } else {
      report.issues.push('cleanupExpiredSessions.ts not found');
      console.error(`❌ cleanupExpiredSessions.ts not found at ${sessionCleanupPath}`);
    }

    if (report.cronJobs.coinExpiry.exists) {
      console.log(`✅ expireCoins.ts exists at ${coinExpiryPath}`);
    } else {
      report.issues.push('expireCoins.ts not found');
      console.error(`❌ expireCoins.ts not found at ${coinExpiryPath}`);
    }
    console.log('');

    // Step 9: Check server.ts for cron job initialization
    console.log('📊 Step 9: Checking server.ts for cron job initialization...');
    const serverPath = path.resolve(__dirname, '../server.ts');
    if (fs.existsSync(serverPath)) {
      const serverContent = fs.readFileSync(serverPath, 'utf-8');

      const hasSessionCleanupInit = serverContent.includes('initializeSessionCleanupJob');
      const hasCoinExpiryInit = serverContent.includes('initializeCoinExpiryJob');

      if (hasSessionCleanupInit) {
        console.log('✅ initializeSessionCleanupJob() found in server.ts');
      } else {
        report.issues.push('initializeSessionCleanupJob() not called in server.ts');
        console.error('❌ initializeSessionCleanupJob() not called in server.ts');
      }

      if (hasCoinExpiryInit) {
        console.log('✅ initializeCoinExpiryJob() found in server.ts');
      } else {
        report.issues.push('initializeCoinExpiryJob() not called in server.ts');
        console.error('❌ initializeCoinExpiryJob() not called in server.ts');
      }
    } else {
      report.issues.push('server.ts not found');
      console.error('❌ server.ts not found');
    }
    console.log('');

    // Final Assessment
    report.productionReady = report.issues.length === 0;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 PRODUCTION READINESS REPORT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (report.productionReady) {
      console.log('✅ STATUS: PRODUCTION READY');
      console.log('   All game features are properly configured and working.');
    } else {
      console.log('⚠️  STATUS: NOT PRODUCTION READY');
      console.log(`   ${report.issues.length} issue(s) found:`);
      report.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   Quiz Questions: ${report.models.QuizQuestion.totalCount} total, ${report.models.QuizQuestion.activeCount} active`);
    console.log(`   Trivia Questions: ${report.models.TriviaQuestion.totalCount} total, ${report.models.TriviaQuestion.activeCount} active`);
    console.log(`   Game Sessions: ${report.models.GameSession.totalCount} total`);
    console.log(`   Database Connection: ${report.database.connectionTime}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    report.issues.push(`Fatal error: ${error}`);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed\n');
    }
  }

  return report;
}

// Run verification if executed directly
if (require.main === module) {
  verifyGameProduction()
    .then(report => {
      // Write report to file
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.resolve(__dirname, '../../GAME_PRODUCTION_VERIFICATION_REPORT.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Full report saved to: ${reportPath}\n`);

      process.exit(report.productionReady ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { verifyGameProduction };
