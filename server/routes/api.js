const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

module.exports = (csvReader) => {
  const aiService = new AIService(csvReader);

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Manga Name Generator API is running' });
  });

  // Get context data
  router.get('/context', (req, res) => {
    const { type } = req.query;
    
    if (type) {
      const contextData = csvReader.getContextByType(type);
      res.json(contextData);
    } else {
      res.json({
        mangaContext: csvReader.getMangaContext(),
        characterPatterns: csvReader.getCharacterPatterns(),
        layoutTemplates: csvReader.getLayoutTemplates()
      });
    }
  });

  // Search context by condition
  router.get('/context/search', (req, res) => {
    const { condition } = req.query;
    
    if (!condition) {
      return res.status(400).json({ error: 'Condition parameter is required' });
    }
    
    const results = csvReader.getContextByCondition(condition);
    res.json(results);
  });

  // Generate manga storyboard
  router.post('/generate-storyboard', async (req, res) => {
    try {
      const { text, useMockAI } = req.body;
      
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Valid text is required' });
      }

      if (text.length > 10000) {
        return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
      }

      console.log('🎨 Generating storyboard for text length:', text.length);
      console.log('📊 Using mock AI:', useMockAI);
      
      const storyboard = await aiService.analyzeStoryText(text, useMockAI);
      
      console.log('✅ Storyboard generated successfully');
      res.json({
        success: true,
        storyboard,
        metadata: {
          input_length: text.length,
          generated_at: new Date().toISOString(),
          panels_count: storyboard.panels_total,
          scenes_count: storyboard.scenes.length
        }
      });

    } catch (error) {
      console.error('❌ Error generating storyboard:', error);
      res.status(500).json({ 
        error: 'Failed to generate storyboard', 
        message: error.message 
      });
    }
  });

  // Reload context data
  router.post('/reload-context', async (req, res) => {
    try {
      await csvReader.reloadData();
      res.json({ message: 'Context data reloaded successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to reload context data', 
        details: error.message 
      });
    }
  });

  return router;
};