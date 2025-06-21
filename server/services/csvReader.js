const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

class CSVReader {
  constructor() {
    this.contextData = {
      mangaContext: [],
      characterPatterns: [],
      layoutTemplates: []
    };
    this.loadAllData();
  }

  async loadAllData() {
    try {
      await Promise.all([
        this.loadMangaContext(),
        this.loadCharacterPatterns(),
        this.loadLayoutTemplates()
      ]);
      console.log('✅ All CSV data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading CSV data:', error);
    }
  }

  loadMangaContext() {
    return new Promise((resolve, reject) => {
      const results = [];
      const filePath = path.join(__dirname, '../data/manga_context.csv');
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.contextData.mangaContext = results;
          console.log(`📚 Loaded ${results.length} manga context rules`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  loadCharacterPatterns() {
    return new Promise((resolve, reject) => {
      const results = [];
      const filePath = path.join(__dirname, '../data/character_patterns.csv');
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.contextData.characterPatterns = results;
          console.log(`👤 Loaded ${results.length} character patterns`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  loadLayoutTemplates() {
    return new Promise((resolve, reject) => {
      const results = [];
      const filePath = path.join(__dirname, '../data/layout_templates.csv');
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          this.contextData.layoutTemplates = results;
          console.log(`📐 Loaded ${results.length} layout templates`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  getMangaContext() {
    return this.contextData.mangaContext;
  }

  getCharacterPatterns() {
    return this.contextData.characterPatterns;
  }

  getLayoutTemplates() {
    return this.contextData.layoutTemplates;
  }

  getContextByType(ruleType) {
    return this.contextData.mangaContext.filter(rule => rule.rule_type === ruleType);
  }

  getContextByCondition(condition) {
    return this.contextData.mangaContext.filter(rule => 
      rule.condition.toLowerCase().includes(condition.toLowerCase())
    );
  }

  getHighPriorityRules() {
    return this.contextData.mangaContext.filter(rule => rule.priority === 'high');
  }

  reloadData() {
    console.log('🔄 Reloading CSV data...');
    return this.loadAllData();
  }
}

module.exports = CSVReader;