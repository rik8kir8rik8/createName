const path = require('path');
const fs = require('fs');

class EnvironmentConfig {
  constructor() {
    this.loadEnvironmentFiles();
    this.validateRequiredVariables();
  }

  loadEnvironmentFiles() {
    // Load environment files in order of priority (later files override earlier ones)
    const envFiles = [
      '.env',                 // Default settings (loaded first)
      '.env.development',     // Environment specific
      '.env.local'            // Highest priority (local secrets, loaded last to override)
    ];

    envFiles.forEach(file => {
      const envPath = path.resolve(process.cwd(), file);
      if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath, override: true });
        console.log(`📁 Loaded environment file: ${file}`);
      }
    });
  }

  validateRequiredVariables() {
    const requiredVars = {
      'OPENAI_API_KEY': 'OpenAI API key for AI processing',
      'PORT': 'Server port number'
    };

    const conditionalVars = {
      // Dify variables are required only when not using mock
      'DIFY_FLOW1_API_KEY': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow1 API key for scene division workflow'
      },
      'DIFY_FLOW1_WORKFLOW_ID': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow1 (scene division) workflow ID'
      },
      'DIFY_FLOW2_API_KEY': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow2 API key for panel layout workflow'
      },
      'DIFY_FLOW2_WORKFLOW_ID': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow2 (panel layout) workflow ID'
      },
      'DIFY_FLOW3_API_KEY': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow3 API key for composition workflow'
      },
      'DIFY_FLOW3_WORKFLOW_ID': {
        condition: () => process.env.USE_MOCK_DIFY !== 'true',
        description: 'Dify Flow3 (composition) workflow ID'
      }
    };

    const missing = [];
    const warnings = [];

    // Check required variables
    Object.entries(requiredVars).forEach(([key, description]) => {
      if (!process.env[key]) {
        missing.push(`${key} (${description})`);
      }
    });

    // Check conditional variables
    Object.entries(conditionalVars).forEach(([key, config]) => {
      if (config.condition() && !process.env[key]) {
        if (process.env.NODE_ENV === 'production') {
          missing.push(`${key} (${config.description})`);
        } else {
          warnings.push(`${key} (${config.description}) - using mock instead`);
        }
      }
    });

    // Handle missing required variables
    if (missing.length > 0) {
      console.error('\n❌ Missing required environment variables:');
      missing.forEach(item => console.error(`  - ${item}`));
      console.error('\n💡 Please check the setup guide in README.md');
      console.error('💡 Copy .env.local.example to .env.local and configure your API keys\n');
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }

    // Show warnings for development
    if (warnings.length > 0 && process.env.NODE_ENV !== 'production') {
      console.warn('\n⚠️  Missing optional environment variables:');
      warnings.forEach(item => console.warn(`  - ${item}`));
      console.warn('💡 Add these to .env.local for full functionality\n');
    }

    this.logCurrentConfig();
  }

  logCurrentConfig() {
    const usingMock = process.env.USE_MOCK_DIFY === 'true';
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasDifyFlow1 = !!process.env.DIFY_FLOW1_API_KEY;
    const hasDifyFlow2 = !!process.env.DIFY_FLOW2_API_KEY;
    const hasDifyFlow3 = !!process.env.DIFY_FLOW3_API_KEY;

    console.log('🔧 Current configuration:');
    console.log(`  - OpenAI API: ${hasOpenAI ? '✅ Configured' : '❌ Missing'}`);
    if (usingMock) {
      console.log(`  - Dify API: 💡 Mock mode`);
    } else {
      console.log(`  - Dify Flow1: ${hasDifyFlow1 ? '✅ Configured' : '❌ Missing'}`);
      console.log(`  - Dify Flow2: ${hasDifyFlow2 ? '✅ Configured' : '❌ Missing'}`);
      console.log(`  - Dify Flow3: ${hasDifyFlow3 ? '✅ Configured' : '❌ Missing'}`);
    }
    console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
  }

  // Utility methods for safe access
  getOpenAIKey() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }
    return process.env.OPENAI_API_KEY;
  }

  getDifyConfig() {
    if (process.env.USE_MOCK_DIFY === 'true') {
      return {
        useMock: true,
        apiUrl: process.env.DIFY_API_URL || 'https://api.dify.ai/v1',
        flow1ApiKey: null,
        flow2ApiKey: null,
        flow3ApiKey: null,
        flow1Id: null,
        flow2Id: null,
        flow3Id: null
      };
    }

    const flow1ApiKey = process.env.DIFY_FLOW1_API_KEY;
    const flow2ApiKey = process.env.DIFY_FLOW2_API_KEY;
    const flow3ApiKey = process.env.DIFY_FLOW3_API_KEY;
    const flow1Id = process.env.DIFY_FLOW1_WORKFLOW_ID;
    const flow2Id = process.env.DIFY_FLOW2_WORKFLOW_ID;
    const flow3Id = process.env.DIFY_FLOW3_WORKFLOW_ID;

    if (!flow1ApiKey || !flow2ApiKey || !flow3ApiKey || !flow1Id || !flow2Id || !flow3Id) {
      throw new Error('Dify configuration is incomplete. Please check your API keys and workflow IDs.');
    }

    return {
      useMock: false,
      apiUrl: process.env.DIFY_API_URL || 'https://api.dify.ai/v1',
      flow1ApiKey,
      flow2ApiKey,
      flow3ApiKey,
      flow1Id,
      flow2Id,
      flow3Id
    };
  }

  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  isDevelopment() {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }
}

module.exports = new EnvironmentConfig();