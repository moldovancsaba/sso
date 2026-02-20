#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function colorize(text, color) {
  return `${color}${text}${COLORS.RESET}`;
}

function log(message, color = COLORS.RESET) {
  console.log(colorize(message, color));
}

async function startOllama() {
  try {
    const { stdout } = await execAsync('ps aux | grep -v grep | grep ollama');
    if (stdout.trim().length > 0) {
      log('✅ Ollama is already running', COLORS.GREEN);
      return true;
    }
  } catch (error) {
    // Ollama not running, try to start it
  }
  
  log('🚀 Starting Ollama...', COLORS.YELLOW);
  try {
    const child = spawn('ollama', ['serve'], { 
      detached: true, 
      stdio: 'ignore' 
    });
    child.unref();
    
    // Wait a moment and check if it started
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { stdout } = await execAsync('ps aux | grep -v grep | grep ollama');
    if (stdout.trim().length > 0) {
      log('✅ Ollama started successfully', COLORS.GREEN);
      return true;
    } else {
      log('❌ Failed to start Ollama', COLORS.RED);
      return false;
    }
  } catch (error) {
    log(`❌ Error starting Ollama: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function startClawdbot() {
  try {
    const { stdout } = await execAsync('CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot gateway status --json');
    const statusData = JSON.parse(stdout);
    if (statusData.service.runtime.status === 'running') {
      log('✅ Clawdbot Gateway is already running', COLORS.GREEN);
      return true;
    }
  } catch (error) {
    // Continue to start
  }
  
  log('🚀 Starting Clawdbot Gateway...', COLORS.YELLOW);
  try {
    await execAsync('CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot gateway start');
    log('✅ Clawdbot Gateway started successfully', COLORS.GREEN);
    return true;
  } catch (error) {
    log(`❌ Error starting Clawdbot Gateway: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function startMoltbotUI() {
  try {
    const { stdout } = await execAsync('lsof -i :4000 | grep LISTEN');
    if (stdout.trim().length > 0) {
      log('✅ Moltbot UI is already running on port 4000', COLORS.GREEN);
      return true;
    }
  } catch (error) {
    // Continue to start
  }
  
  log('🚀 Starting Moltbot UI on port 4000...', COLORS.YELLOW);
  try {
    const child = spawn('npm', ['start'], {
      cwd: '/Users/moldovancsaba/Projects/moltbot',
      env: { ...process.env, PORT: '4000' },
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    
    // Wait a moment and check if it started
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { stdout } = await execAsync('lsof -i :4000 | grep LISTEN');
    if (stdout.trim().length > 0) {
      log('✅ Moltbot UI started successfully', COLORS.GREEN);
      return true;
    } else {
      log('❌ Failed to start Moltbot UI', COLORS.RED);
      return false;
    }
  } catch (error) {
    log(`❌ Error starting Moltbot UI: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function stopClawdbot() {
  log('🛑 Stopping Clawdbot Gateway...', COLORS.YELLOW);
  try {
    await execAsync('CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot gateway stop');
    log('✅ Clawdbot Gateway stopped successfully', COLORS.GREEN);
    return true;
  } catch (error) {
    log(`❌ Error stopping Clawdbot Gateway: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function stopMoltbotUI() {
  log('🛑 Stopping Moltbot UI...', COLORS.YELLOW);
  try {
    await execAsync('pkill -f "node.*server.js"');
    log('✅ Moltbot UI stopped successfully', COLORS.GREEN);
    return true;
  } catch (error) {
    log(`❌ Error stopping Moltbot UI: ${error.message}`, COLORS.RED);
    return false;
  }
}

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    log(colorize('\n🤖 MOLTBOT MANAGER', COLORS.BOLD));
    log(colorize('================', COLORS.BOLD));
    log('Usage: node moltbot-manager.js <command>');
    log('');
    log('Commands:');
    log('  start-all    - Start all services (Ollama, Clawdbot, Moltbot UI)');
    log('  stop-all     - Stop Clawdbot and Moltbot UI');
    log('  start-ollama - Start Ollama service');
    log('  start-clawdbot - Start Clawdbot Gateway');
    log('  start-ui     - Start Moltbot UI');
    log('  stop-clawdbot - Stop Clawdbot Gateway');
    log('  stop-ui      - Stop Moltbot UI');
    log('  status       - Check status of all services');
    log('');
    return;
  }
  
  switch (command) {
    case 'start-all':
      log(colorize('\n🚀 STARTING ALL SERVICES', COLORS.BOLD));
      log(colorize('========================', COLORS.BOLD));
      await startOllama();
      await startClawdbot();
      await startMoltbotUI();
      log(colorize('\n🎉 Startup complete! Check status with: node moltbot-manager.js status', COLORS.GREEN));
      break;
      
    case 'stop-all':
      log(colorize('\n🛑 STOPPING SERVICES', COLORS.BOLD));
      log(colorize('==================', COLORS.BOLD));
      await stopClawdbot();
      await stopMoltbotUI();
      log(colorize('\n✅ Services stopped (Ollama left running)', COLORS.GREEN));
      break;
      
    case 'start-ollama':
      await startOllama();
      break;
      
    case 'start-clawdbot':
      await startClawdbot();
      break;
      
    case 'start-ui':
      await startMoltbotUI();
      break;
      
    case 'stop-clawdbot':
      await stopClawdbot();
      break;
      
    case 'stop-ui':
      await stopMoltbotUI();
      break;
      
    case 'status':
      // Run the status checker
      const { exec } = require('child_process');
      exec('node moltbot-status-checker.cjs', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error}`);
          return;
        }
        console.log(stdout);
        if (stderr) console.error(stderr);
      });
      break;
      
    default:
      log(`❌ Unknown command: ${command}`, COLORS.RED);
      log('Run without arguments to see available commands.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}