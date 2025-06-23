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
        flow1Result = this.difyService.getMockFlow1Output();
      } else {
        flow1Result = await this.difyService.processFlow1(userInput, pageCount);
      }

      console.log('📄 Processing individual pages through Flow 2...');
      const processedScenes = [];
      let previousInstructions = '';

      // First pass: Process all pages through Flow 2
      console.log('📄 Processing all pages through Flow 2...');
      const allPagesFlow2Results = [];

      for (const scene of flow1Result.scene) {
        for (const content of scene.contents) {
          let flow2Result;
          if (this.difyService.useMock || useMockDify) {
            console.log(`💡 Using mock Dify Flow 2 for page ${content.page}`);
            flow2Result = this.difyService.getMockFlow2Output();
          } else {
            flow2Result = await this.difyService.processFlow2(
              content,
              previousInstructions
            );
          }

          allPagesFlow2Results.push({
            sceneIndex: flow1Result.scene.indexOf(scene),
            content: content,
            flow2Result: flow2Result,
          });

          // Update previousInstructions for the next page
          if (flow2Result && flow2Result.instructions) {
            previousInstructions = flow2Result.instructions;
          }

          await this.delay(100);
        }
      }

      // Second pass: Process all panels through Flow 3 with access to previous page data
      console.log('📐 Processing all panels through Flow 3...');
      for (let i = 0; i < allPagesFlow2Results.length; i++) {
        const currentPageData = allPagesFlow2Results[i];
        const previousPagePanelLast =
          i > 0
            ? allPagesFlow2Results[i - 1].flow2Result.panels[
                allPagesFlow2Results[i - 1].flow2Result.panels.length - 1
              ]
            : null;
        const nextPagePanelFirst =
          i < allPagesFlow2Results.length - 1
            ? allPagesFlow2Results[i + 1].flow2Result.panels[0]
            : null;

        console.log(
          `📐 Processing panels for page ${currentPageData.content.page}...`
        );
        const processedPanels = [];
        let flow3Result;

        if (this.difyService.useMock || useMockDify) {
          console.log(`💡 Using mock Dify Flow 3 for page ${currentPageData.content.page}`);
          flow3Result = this.difyService.getMockFlow3Output();
          
          // モックFlow3データ（配列）を各パネルに割り当て
          if (!flow3Result || !Array.isArray(flow3Result) || flow3Result.length === 0) {
            throw new Error('Mock Flow 3 data is invalid or empty');
          }
          
          for (let j = 0; j < currentPageData.flow2Result.panels.length; j++) {
            const panel = currentPageData.flow2Result.panels[j];
            const compositionData = flow3Result[j] || flow3Result[0]; // パネル数より少ない場合は最初のデータを使用
            
            console.log(`💡 Assigning mock composition data to panel ${panel.index}:`, compositionData);
            
            processedPanels.push({
              ...panel,
              composition: compositionData,
            });
          }
          
          console.log(`💡 Mock processed panels count: ${processedPanels.length}`);
        } else {
          for (const panel of currentPageData.flow2Result.panels) {
            console.log(`🔄 Processing real Dify Flow 3 for panel ${panel.index}`);
            flow3Result = await this.difyService.processFlow3(
              currentPageData.flow2Result.panels,
              panel,
              previousPagePanelLast,
              nextPagePanelFirst
            );
            
            processedPanels.push({
              ...panel,
              composition: flow3Result,
            });

            await this.delay(50);
          }
        }

        // Update the flow2Result with processed panels
        currentPageData.flow2Result.panels = processedPanels;
      }

      // Third pass: Reconstruct the scene structure
      console.log('📦 Reconstructing scene structure...');
      for (const scene of flow1Result.scene) {
        const processedContents = [];

        for (const content of scene.contents) {
          const pageData = allPagesFlow2Results.find(
            p =>
              p.sceneIndex === flow1Result.scene.indexOf(scene) &&
              p.content.page === content.page
          );

          if (pageData) {
            processedContents.push({
              ...content,
              panelLayout: pageData.flow2Result,
            });
          }
        }

        processedScenes.push({
          ...scene,
          contents: processedContents,
        });
      }

      const finalResult = {
        originalInput: userInput,
        flow1Output: flow1Result,
        processedScenes,
        metadata: {
          totalPages: processedScenes.reduce(
            (sum, scene) => sum + scene.pagesNum,
            0
          ),
          totalScenes: processedScenes.length,
          processedAt: new Date().toISOString(),
          usedMockDify: this.difyService.useMock || useMockDify,
        },
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
          contents: processedContents,
        });
      }

      return {
        ...difyResult,
        processedScenes,
        metadata: {
          ...difyResult.metadata,
          openAIProcessed: true,
          finalProcessedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('❌ OpenAI post-processing failed:', error);
      return difyResult;
    }
  }

  convertToLegacyFormat(difyResult) {
    const scenes = [];
    let totalPanels = 0;

    for (const scene of difyResult.processedScenes) {
      for (const content of scene.contents) {
        const panels = content.panelLayout.panels.map(panel => {
          console.log(`🔄 Converting panel ${panel.index} - has composition:`, !!panel.composition);
          if (panel.composition) {
            console.log(`🔄 Panel ${panel.index} composition data:`, panel.composition);
          }
          
          return {
            panel_number: panel.index,
            size: this.determinePanelSize(panel.type),
            type: panel.type[0] || 'narration',
            content: {
              dialogue: this.extractDialogue(content.text),
              narration: this.extractNarration(content.text),
              characters: this.createCharacters(content.characterEmotions),
              background: content.place,
            },
            visual_notes: panel.description,
            composition_data: panel.composition
              ? {
                  cameraAngle: panel.composition.cameraAngle,
                  composition: panel.composition.composition,
                  visualEffects: panel.composition.visualEffects,
                  characterDetails: panel.composition.characterDetails,
                  background: panel.composition.background,
                  backgroundDetails: panel.composition.backgroundDetails,
                }
              : null,
          dify_data: {
            original_panel: panel,
            page_info: content,
          },
        };
        });

        scenes.push({
          scene_number: scenes.length + 1,
          description: content.concept,
          emotion_tone: content.characterEmotions.join('、'),
          layout_template: 'dify_generated',
          panels,
        });

        totalPanels += panels.length;
      }
    }

    return {
      scenes,
      overall_pacing: 'Dify生成',
      page_count_estimate: difyResult.metadata.totalPages,
      panels_total: totalPanels,
      scenes_with_rules: scenes.map(scene => ({
        ...scene,
        applied_rules: [],
      })),
      dify_metadata: difyResult.metadata,
    };
  }

  determinePanelSize(types) {
    if (types.includes('turning') || types.includes('event')) return 'large';
    if (types.includes('reaction') || types.includes('situation'))
      return 'medium';
    return 'small';
  }

  extractDialogue(text) {
    const dialogueMatch = text.match(/「([^」]*)」/g);
    return dialogueMatch
      ? dialogueMatch.map(d => d.replace(/[「」]/g, ''))
      : [];
  }

  extractNarration(text) {
    return text.replace(/「[^」]*」/g, '').trim();
  }

  createCharacters(emotions) {
    return emotions.map((emotion, index) => ({
      name: `キャラクター${index + 1}`,
      emotion: emotion,
      position: index === 0 ? 'center' : 'side',
      svg_pattern: this.getEmotionPattern(emotion),
    }));
  }

  getEmotionPattern(emotion) {
    const patterns = {
      joy: 'circle+upward_arc',
      happy: 'circle+upward_arc',
      sad: 'circle+downward_arc',
      painful: 'triangle+downward_line',
      despair: 'square+diagonal_cross',
      fun: 'star+circle',
      anger: 'square+zigzag',
      laughter: 'circle+multiple_arcs',
      tokimeki: 'heart+sparkles',
      irritation: 'triangle+spikes',
      surprise: 'circle+exclamation',
      flat: 'line+horizontal',
    };
    return patterns[emotion] || 'circle+line';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = DifyIntegrationService;
