const DifyService = require('./difyService');

class DifyIntegrationService {
  constructor(csvReader) {
    this.difyService = new DifyService();
    this.csvReader = csvReader;
  }

  async processUserInput(userInput, useMockDify = false, pageCount) {
    try {
      console.log('🚀 Starting Dify workflow processing...');
      
      let flow1Result;
      if (this.difyService.useMock || useMockDify) {
        console.log('💡 Using mock Dify Flow 1');
        flow1Result = this.difyService.getMockFlow1Output(userInput, pageCount);
      } else {
        flow1Result = await this.difyService.processFlow1(userInput, pageCount);
      }

      console.log('📄 Processing individual pages through Flow 2...');
      const processedScenes = [];
      let previousInstructions = '';

      for (const scene of flow1Result.scene) {
        const processedContents = [];
        
        for (const content of scene.contents) {
          let flow2Result;
          if (this.difyService.useMock || useMockDify) {
            console.log(`💡 Using mock Dify Flow 2 for page ${content.page}`);
            flow2Result = this.difyService.getMockFlow2Output(content, previousInstructions);
          } else {
            flow2Result = await this.difyService.processFlow2(content, previousInstructions);
          }

          processedContents.push({
            ...content,
            panelLayout: flow2Result
          });

          // Update previousInstructions for the next page
          if (flow2Result && flow2Result.instructions) {
            previousInstructions = flow2Result.instructions;
          }

          await this.delay(100);
        }

        processedScenes.push({
          ...scene,
          contents: processedContents
        });
      }

      const finalResult = {
        originalInput: userInput,
        flow1Output: flow1Result,
        processedScenes,
        metadata: {
          totalPages: processedScenes.reduce((sum, scene) => sum + scene.pagesNum, 0),
          totalScenes: processedScenes.length,
          processedAt: new Date().toISOString(),
          usedMockDify: this.difyService.useMock || useMockDify
        }
      };

      console.log('✅ Dify workflow processing completed successfully');
      return finalResult;

    } catch (error) {
      console.error('❌ Dify workflow processing failed:', error);
      throw new Error(`Difyワークフロー処理に失敗しました: ${error.message}`);
    }
  }

  async postProcessWithOpenAI(difyResult, openAIService) {
    try {
      console.log('🤖 Post-processing with OpenAI...');

      const processedScenes = [];
      for (const scene of difyResult.processedScenes) {
        const processedContents = [];
        
        for (const content of scene.contents) {
          const enhancedContent = await this.enhanceContentWithOpenAI(
            content, 
            openAIService
          );
          processedContents.push(enhancedContent);
        }

        processedScenes.push({
          ...scene,
          contents: processedContents
        });
      }

      return {
        ...difyResult,
        processedScenes,
        metadata: {
          ...difyResult.metadata,
          openAIProcessed: true,
          finalProcessedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ OpenAI post-processing failed:', error);
      return difyResult;
    }
  }

  async enhanceContentWithOpenAI(content, openAIService) {
    try {
      const prompt = this.buildOpenAIEnhancementPrompt(content);
      
      const completion = await openAIService.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは漫画制作の専門家です。Difyで生成されたコマワリ情報を元に、より詳細な描画指示を生成してください。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const enhancement = JSON.parse(completion.choices[0].message.content);
      
      return {
        ...content,
        openAIEnhancement: enhancement
      };

    } catch (error) {
      console.warn(`OpenAI enhancement failed for page ${content.page}:`, error);
      return content;
    }
  }

  buildOpenAIEnhancementPrompt(content) {
    return `以下のコマワリ情報を元に、より詳細な描画指示を生成してください:

ページ情報:
- ページ番号: ${content.page}
- テキスト: ${content.text}
- コンセプト: ${content.concept}
- 場所: ${content.place}
- 要素: ${content.elements.join(', ')}
- キャラクター感情: ${content.characterEmotions.join(', ')}

パネル情報:
${content.panelLayout.panels.map(panel => 
  `- パネル${panel.index}: ${panel.description} (タイプ: ${panel.type.join(', ')})`
).join('\n')}

指示: ${content.panelLayout.instructions || ''}

以下のJSON形式で回答してください:
{
  "visualDirections": [
    {
      "panelIndex": 1,
      "cameraAngle": "カメラアングル",
      "composition": "構図の説明",
      "visualEffects": "視覚効果",
      "characterDetails": "キャラクター詳細",
      "backgroundDetails": "背景詳細"
    }
  ],
  "overallTone": "全体のトーン",
  "suggestedImprovements": "改善提案"
}`;
  }

  convertToLegacyFormat(difyResult) {
    const scenes = [];
    let totalPanels = 0;

    for (const scene of difyResult.processedScenes) {
      for (const content of scene.contents) {
        const panels = content.panelLayout.panels.map(panel => ({
          panel_number: panel.index,
          size: this.determinePanelSize(panel.type),
          type: panel.type[0] || 'narration',
          content: {
            dialogue: this.extractDialogue(content.text),
            narration: this.extractNarration(content.text),
            characters: this.createCharacters(content.characterEmotions),
            background: content.place
          },
          visual_notes: panel.description,
          dify_data: {
            original_panel: panel,
            page_info: content
          }
        }));

        scenes.push({
          scene_number: scenes.length + 1,
          description: content.concept,
          emotion_tone: content.characterEmotions.join('、'),
          layout_template: "dify_generated",
          panels
        });

        totalPanels += panels.length;
      }
    }

    return {
      scenes,
      overall_pacing: "Dify生成",
      page_count_estimate: difyResult.metadata.totalPages,
      panels_total: totalPanels,
      scenes_with_rules: scenes.map(scene => ({
        ...scene,
        applied_rules: []
      })),
      dify_metadata: difyResult.metadata
    };
  }

  determinePanelSize(types) {
    if (types.includes('turning') || types.includes('event')) return 'large';
    if (types.includes('reaction') || types.includes('situation')) return 'medium';
    return 'small';
  }

  extractDialogue(text) {
    const dialogueMatch = text.match(/「([^」]*)」/g);
    return dialogueMatch ? dialogueMatch.map(d => d.replace(/[「」]/g, '')) : [];
  }

  extractNarration(text) {
    return text.replace(/「[^」]*」/g, '').trim();
  }

  createCharacters(emotions) {
    return emotions.map((emotion, index) => ({
      name: `キャラクター${index + 1}`,
      emotion: emotion,
      position: index === 0 ? 'center' : 'side',
      svg_pattern: this.getEmotionPattern(emotion)
    }));
  }

  getEmotionPattern(emotion) {
    const patterns = {
      'joy': 'circle+upward_arc',
      'happy': 'circle+upward_arc',
      'sad': 'circle+downward_arc',
      'painful': 'triangle+downward_line',
      'despair': 'square+diagonal_cross',
      'fun': 'star+circle',
      'anger': 'square+zigzag',
      'laughter': 'circle+multiple_arcs',
      'tokimeki': 'heart+sparkles',
      'irritation': 'triangle+spikes',
      'surprise': 'circle+exclamation',
      'flat': 'line+horizontal'
    };
    return patterns[emotion] || 'circle+line';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DifyIntegrationService;