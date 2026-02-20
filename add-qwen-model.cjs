#!/usr/bin/env node

const fs = require('fs');
const path = '/tmp/clawdbot-state/clawdbot.json';

try {
  // Read the current config
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  // Add the qwen2.5:7b model with correct context window
  const newModel = {
    "id": "qwen2.5:7b",
    "name": "Qwen 2.5 7B",
    "reasoning": false,
    "input": ["text"],
    "cost": {
      "input": 0,
      "output": 0,
      "cacheRead": 0,
      "cacheWrite": 0
    },
    "contextWindow": 32768,
    "maxTokens": 32768
  };
  
  // Find the ollama provider and add the model
  if (config.models && config.models.providers && config.models.providers.ollama) {
    // Check if model already exists
    const existingModelIndex = config.models.providers.ollama.models.findIndex(m => m.id === "qwen2.5:7b");
    
    if (existingModelIndex >= 0) {
      // Update existing model
      config.models.providers.ollama.models[existingModelIndex] = newModel;
      console.log('Updated existing qwen2.5:7b model configuration');
    } else {
      // Add new model
      config.models.providers.ollama.models.push(newModel);
      console.log('Added qwen2.5:7b model configuration');
    }
    
    // Write back the config
    fs.writeFileSync(path, JSON.stringify(config, null, 2));
    console.log('Configuration updated successfully!');
  } else {
    console.error('Ollama provider not found in configuration');
  }
  
} catch (error) {
  console.error('Error updating configuration:', error.message);
}