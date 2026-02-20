#!/usr/bin/env node

const fs = require('fs');
const path = '/tmp/clawdbot-state/clawdbot.json';

try {
  // Read the current config
  const config = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  // Disable web search and memory search tools that require external APIs
  if (!config.tools) {
    config.tools = {};
  }
  
  // Disable problematic tools
  config.tools.disabled = [
    "web_search",
    "memory_search", 
    "memory_get"
  ];
  
  // Also disable web-related skills if they exist
  if (!config.skills) {
    config.skills = {};
  }
  
  config.skills.disabled = [
    "web-search",
    "google-search",
    "brave-search"
  ];
  
  // Write back the config
  fs.writeFileSync(path, JSON.stringify(config, null, 2));
  console.log('✅ Disabled web search and memory tools that require external APIs');
  console.log('✅ Your AI assistant will now use local tools only');
  console.log('✅ Configuration updated successfully!');
  
} catch (error) {
  console.error('❌ Error updating configuration:', error.message);
}