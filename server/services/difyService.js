const envConfig = require('../config/env');
const fetch = require('node-fetch');

class DifyService {
  constructor() {
    try {
      const difyConfig = envConfig.getDifyConfig();
      this.difyApiUrl = difyConfig.apiUrl;
      this.flow1ApiKey = difyConfig.flow1ApiKey;
      this.flow2ApiKey = difyConfig.flow2ApiKey;
      this.flow1WorkflowId = difyConfig.flow1Id;
      this.flow2WorkflowId = difyConfig.flow2Id;
      this.useMock = difyConfig.useMock;
    } catch (error) {
      console.warn('⚠️ Dify not configured:', error.message);
      this.useMock = true;
    }
  }

  async callDifyWorkflow(workflowId, inputs, user = 'user-001', apiKey = null) {
    if (this.useMock || !apiKey) {
      throw new Error('Dify API is not configured or in mock mode');
    }

    const payload = {
      workflow_id: workflowId,
      inputs: inputs,
      response_mode: 'blocking',
      user: user
    };

    const response = await fetch(`${this.difyApiUrl}/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Dify API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    return result;
  }

  async processFlow1(userInput, userInput_num) {
    try {
      console.log('🔄 Processing Flow 1 (Scene Division):', userInput.substring(0, 100) + '...');
      
      const result = await this.callDifyWorkflow(
        this.flow1WorkflowId, 
        { 
          plot: userInput,
          totalPagesNum: userInput_num
        },
        'user-001',
        this.flow1ApiKey
      );

      console.log('🔄 Flow 1 raw result:', JSON.stringify(result, null, 2));
      console.log('🔄 Flow 1 outputs:', result.data?.outputs);

      let parsedData;
      try {
        parsedData = typeof result.data.outputs === 'string' 
          ? JSON.parse(result.data.outputs) 
          : result.data.outputs;
      } catch (parseError) {
        console.error('❌ Failed to parse Flow 1 outputs:', parseError);
        console.log('Raw outputs type:', typeof result.data.outputs);
        console.log('Raw outputs content:', result.data.outputs);
        throw parseError;
      }

      console.log('🔍 Parsed data structure:', JSON.stringify(parsedData, null, 2));
      
      // Transform Dify output to expected structure if needed
      let transformedData;
      try {
        transformedData = this.transformDifyFlow1Output(parsedData);
        console.log('🔄 Transformed data structure:', JSON.stringify(transformedData, null, 2));
      } catch (transformError) {
        console.error('❌ Transformation failed:', transformError);
        throw new Error(`Data transformation failed: ${transformError.message}`);
      }
      
      try {
        this.validateFlow1Output(transformedData);
      } catch (validationError) {
        console.error('❌ Validation failed after transformation:', validationError);
        console.log('Validation failed on data:', JSON.stringify(transformedData, null, 2));
        throw validationError;
      }
      
      console.log('✅ Flow 1 completed successfully');
      return transformedData;
    } catch (error) {
      console.error('❌ Flow 1 error:', error);
      throw new Error(`シーン分割処理に失敗しました: ${error.message}`);
    }
  }

  async processFlow2(pageData, previousInstructions = '') {
    try {
      console.log(`🔄 Processing Flow 2 (Panel Layout) for page ${pageData.page}...`);
      const result = await this.callDifyWorkflow(
        this.flow2WorkflowId, 
        {
          elements: pageData.elements.join(','),
          characterEmotions: pageData.characterEmotions.join(','),
          text: pageData.text,
          concept: pageData.concept,
          place: pageData.place,
          page: pageData.page,
          previousPage: JSON.stringify(pageData),
          instructions: previousInstructions
        },
        'user-001',
        this.flow2ApiKey
      );

      console.log('🔄 Flow 2 result:', result.data.outputs.page_panels);

      const parsedData = typeof result.data.outputs.page_panels === 'string' 
        ? JSON.parse(result.data.outputs.page_panels) 
        : result.data.outputs.page_panels;

      this.validateFlow2Output(parsedData);
      
      console.log(`✅ Flow 2 completed for page ${pageData.page}`);
      return parsedData;
    } catch (error) {
      console.error(`❌ Flow 2 error for page ${pageData.page}:`, error);
      throw new Error(`コマワリ処理に失敗しました (ページ${pageData.page}): ${error.message}`);
    }
  }

  async processFlow3(panels, panel, nextPanelData) {
    try {
      console.log(`🔄 Processing Flow 3 (Panel) for page ${panel.index}...`);
      
      const result = await this.callDifyWorkflow(
        this.flow3WorkflowId, 
        {
          index: panel.index,
          description: panel.description,
          type: panel.type,
          nextPanel: panel.index !== panels.length ? panels.find(p => p.index === panel.index + 1) : null,
          previousPanel: panel.index === 1 ? null : panels.find(p => p.index === panel.index - 1),
          place: panel.place,
        },
        'user-001',
        this.flow3ApiKey
      );

      console.log('🔄 Flow 3 result:', result.data.outputs);

      const parsedData = typeof result.data.outputs.structured_output === 'string' 
        ? JSON.parse(result.data.outputs.structured_output) 
        : result.data.outputs.structured_output;

      this.validateFlow2Output(parsedData);
      
      console.log(`✅ Flow 3 completed for panel ${panel}`);
      return parsedData;
    } catch (error) {
      console.error(`❌ Flow 3 error for panel ${panel.index}:`, error);
      throw new Error(`コマ構図決定処理に失敗しました (コマ${panel.index}): ${error.message}`);
    }
  }

  transformDifyFlow1Output(data) {
    // Transform the Dify output structure to match expected validation structure
    console.log('🔄 Transforming data:', JSON.stringify(data, null, 2));
    
    if (!data || typeof data !== 'object') {
      console.warn('⚠️ Invalid data type, creating default structure');
      return { scene: [] };
    }

    // Handle the specific Dify output structure: { scenes: { scene: [...] } }
    if (data.scenes && data.scenes.scene && Array.isArray(data.scenes.scene)) {
      console.log('✅ Found Dify scenes.scene structure, extracting...');
      return { scene: data.scenes.scene };
    }

    // Check if data already has the expected structure
    if (data.scene && Array.isArray(data.scene)) {
      console.log('✅ Data already has scene array, checking contents...');
      return data;
    }

    // Handle other possible structures from Dify
    let scenes = [];
    
    if (Array.isArray(data)) {
      // If data is directly an array, treat as scenes
      scenes = data;
    } else if (data.scenes && Array.isArray(data.scenes)) {
      // If data has 'scenes' property as array
      scenes = data.scenes;
    } else {
      console.warn('⚠️ Unexpected Dify output structure:', Object.keys(data));
      console.warn('Creating fallback structure...');
      scenes = [data]; // Treat entire data as single scene
    }

    console.log('🔄 Processing scenes:', scenes.length);
    return { scene: this.processScenes(scenes) };
  }

  ensureContentsStructure(data) {
    return {
      scene: data.scene.map(scene => this.processScene(scene))
    };
  }

  processScenes(scenes) {
    return scenes.map(scene => this.processScene(scene));
  }

  processScene(scene) {
    // If the scene already has properly structured contents, return as-is
    if (scene.contents && scene.contents.length > 0 && scene.contents[0].page !== undefined) {
      console.log('✅ Scene already has proper contents structure');
      return scene;
    }

    // Transform scene-level data to content-level structure
    const pageCount = scene.pagesNum || 1;
    const scenePlace = scene.place || '場所未設定';
    
    console.log(`🔄 Creating ${pageCount} content items for scene at ${scenePlace}`);
    
    const contents = Array.from({ length: pageCount }, (_, i) => ({
      page: i + 1,
      elements: scene.elements || ["introduction", "development", "climax", "resolution"],
      characterEmotions: scene.characterEmotions || ["neutral"],
      text: scene.text || `ページ${i + 1}のテキスト`,
      concept: scene.concept || `ページ${i + 1}の概念`,
      place: scenePlace
    }));

    return {
      ...scene,
      contents: contents
    };
  }

  validateFlow1Output(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Flow 1 output: not an object');
    }
    
    if (!Array.isArray(data.scene)) {
      throw new Error('Invalid Flow 1 output: scene must be an array');
    }

    data.scene.forEach((scene, index) => {
      if (typeof scene.pagesNum !== 'number') {
        throw new Error(`Invalid Flow 1 output: scene[${index}].pagesNum must be a number`);
      }
      

      if (!Array.isArray(scene.contents)) {
        throw new Error(`Invalid Flow 1 output: scene[${index}].contents must be an array`);
      }

      if (![0, 1].includes(scene.isExcitement)) {
        throw new Error(`Invalid Flow 1 output: scene[${index}].isExcitement must be 0 or 1`);
      }

      scene.contents.forEach((content, contentIndex) => {
        const requiredFields = ['page', 'elements', 'characterEmotions', 'text', 'concept'];
        requiredFields.forEach(field => {
          if (!(field in content)) {
            throw new Error(`Invalid Flow 1 output: scene[${index}].contents[${contentIndex}].${field} is required`);
          }
        });
      });
    });
  }

  validateFlow2Output(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Flow 2 output: not an object');
    }
    
    if (!Array.isArray(data.panels)) {
      throw new Error('Invalid Flow 2 output: panels must be an array');
    }

    if (typeof data.page !== 'number') {
      throw new Error('Invalid Flow 2 output: page must be a number');
    }

    data.panels.forEach((panel, index) => {
      if (typeof panel.index !== 'number') {
        throw new Error(`Invalid Flow 2 output: panels[${index}].index must be a number`);
      }
      
      if (typeof panel.description !== 'string') {
        throw new Error(`Invalid Flow 2 output: panels[${index}].description must be a string`);
      }

      if (!Array.isArray(panel.type)) {
        throw new Error(`Invalid Flow 2 output: panels[${index}].type must be an array`);
      }
    });
  }

  getMockFlow1Output(userInput, totalPagesNum = 8) {
    const sentences = userInput.split(/[。！？\n]/).filter(s => s.trim());
    const pageCount = totalPagesNum;
    
    return {
      scene: [{
        pagesNum: pageCount,
        contents: Array.from({ length: pageCount }, (_, i) => ({
          page: i + 1,
          elements: ["introduction", "stimulation", "problem", "solution"],
          characterEmotions: ["happy", "surprise", "sad", "joy"],
          text: sentences.slice(i * 4, (i + 1) * 4).join('。'),
          concept: `ページ${i + 1}の概念`,
          place: "場所設定"
        })),
        isExcitement: Math.random() > 0.5 ? 1 : 0
      }]
    };
  }

  getMockFlow2Output(pageData, previousInstructions = '') {
    const baseInstructions = `${pageData.place}でのシーンを${pageData.characterEmotions.join('、')}の感情で表現する`;
    const continuityNote = previousInstructions ? `前ページ指示: ${previousInstructions}` : '';
    
    return {
      panels: [
        {
          index: 1,
          description: `${pageData.concept}の導入シーン`,
          type: ["event", "situation"]
        },
        {
          index: 2,
          description: "キャラクターの反応",
          type: ["reaction"]
        },
        {
          index: 3,
          description: "展開の転換点",
          type: ["turning"]
        },
        {
          index: 4,
          description: "アクションシーン",
          type: ["move", "event"]
        }
      ],
      page: pageData.page,
      instructions: continuityNote ? `${baseInstructions}（${continuityNote}）` : baseInstructions
    };
  }
}

module.exports = DifyService;