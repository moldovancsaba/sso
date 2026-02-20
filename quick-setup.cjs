#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');
const execAsync = promisify(exec);

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function colorize(text, color) {
  return `${color}${text}${COLORS.RESET}`;
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function showWelcome() {
  console.log(colorize('\n🦞 WELCOME TO YOUR PERSONAL AI ASSISTANT!', COLORS.BOLD + COLORS.CYAN));
  console.log(colorize('==========================================', COLORS.CYAN));
  console.log(colorize('\n🎉 Congratulations! Your Moltbot system is ready.', COLORS.GREEN));
  console.log(colorize('Now let\'s connect you to your AI assistant so you can start chatting!', COLORS.YELLOW));
  console.log('\nYour AI assistant can help you with:');
  console.log(colorize('• 💻 Coding and development tasks', COLORS.BLUE));
  console.log(colorize('• 📝 Writing and content creation', COLORS.BLUE));
  console.log(colorize('• 🔍 Research and information gathering', COLORS.BLUE));
  console.log(colorize('• 🤖 System automation and control', COLORS.BLUE));
  console.log(colorize('• 📊 Data analysis and reporting', COLORS.BLUE));
  console.log(colorize('• 🎯 Task management and productivity', COLORS.BLUE));
}

async function chooseChannel() {
  console.log(colorize('\n📱 CHOOSE YOUR COMMUNICATION CHANNEL', COLORS.BOLD + COLORS.MAGENTA));
  console.log(colorize('=====================================', COLORS.MAGENTA));
  console.log('\nHow would you like to chat with your AI assistant?');
  console.log(colorize('1. 💬 WhatsApp (Recommended - easiest setup)', COLORS.GREEN));
  console.log(colorize('2. 🤖 Telegram (Great for power users)', COLORS.BLUE));
  console.log(colorize('3. 💬 iMessage (macOS only)', COLORS.CYAN));
  console.log(colorize('4. 🎮 Discord (For communities)', COLORS.MAGENTA));
  console.log(colorize('5. 🌐 Web Dashboard Only (No chat setup)', COLORS.YELLOW));
  
  const choice = await question(colorize('\nEnter your choice (1-5): ', COLORS.BOLD));
  return choice.trim();
}

async function setupWhatsApp() {
  console.log(colorize('\n💬 SETTING UP WHATSAPP', COLORS.BOLD + COLORS.GREEN));
  console.log(colorize('=====================', COLORS.GREEN));
  console.log('\n📱 Get ready to scan a QR code with your phone!');
  console.log('1. Open WhatsApp on your phone');
  console.log('2. Go to Settings > Linked Devices');
  console.log('3. Tap "Link a Device"');
  console.log('4. Scan the QR code that will appear below');
  
  await question(colorize('\nPress Enter when ready to show QR code...', COLORS.BOLD));
  
  try {
    console.log(colorize('\n🔄 Starting WhatsApp connection...', COLORS.YELLOW));
    await execAsync('CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot channels login whatsapp --verbose');
    console.log(colorize('\n✅ WhatsApp connected successfully!', COLORS.GREEN));
    return true;
  } catch (error) {
    console.log(colorize('\n❌ WhatsApp setup failed. You can try again later.', COLORS.RED));
    console.log(colorize('Error: ' + error.message, COLORS.RED));
    return false;
  }
}

async function setupTelegram() {
  console.log(colorize('\n🤖 SETTING UP TELEGRAM', COLORS.BOLD + COLORS.BLUE));
  console.log(colorize('====================', COLORS.BLUE));
  console.log('\n📋 To set up Telegram, you need to create a bot:');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send /newbot to create a new bot');
  console.log('3. Follow the instructions to get your bot token');
  console.log('4. Copy the token (looks like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)');
  
  const token = await question(colorize('\nEnter your Telegram bot token (or press Enter to skip): ', COLORS.BOLD));
  
  if (!token.trim()) {
    console.log(colorize('⏭️  Skipping Telegram setup.', COLORS.YELLOW));
    return false;
  }
  
  try {
    console.log(colorize('\n🔄 Setting up Telegram bot...', COLORS.YELLOW));
    await execAsync(`CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot channels add telegram --bot-token "${token.trim()}"`);
    console.log(colorize('\n✅ Telegram bot connected successfully!', COLORS.GREEN));
    console.log(colorize('💡 Now search for your bot on Telegram and send /start', COLORS.CYAN));
    return true;
  } catch (error) {
    console.log(colorize('\n❌ Telegram setup failed. Check your token and try again.', COLORS.RED));
    console.log(colorize('Error: ' + error.message, COLORS.RED));
    return false;
  }
}

async function setupiMessage() {
  console.log(colorize('\n💬 SETTING UP iMESSAGE', COLORS.BOLD + COLORS.CYAN));
  console.log(colorize('====================', COLORS.CYAN));
  console.log('\n📱 Setting up iMessage integration...');
  console.log('⚠️  Note: This requires macOS and may need additional permissions.');
  
  const confirm = await question(colorize('\nProceed with iMessage setup? (y/n): ', COLORS.BOLD));
  
  if (confirm.toLowerCase() !== 'y') {
    console.log(colorize('⏭️  Skipping iMessage setup.', COLORS.YELLOW));
    return false;
  }
  
  try {
    console.log(colorize('\n🔄 Setting up iMessage...', COLORS.YELLOW));
    await execAsync('CLAWDBOT_STATE_DIR=/tmp/clawdbot-state clawdbot channels login imessage');
    console.log(colorize('\n✅ iMessage connected successfully!', COLORS.GREEN));
    return true;
  } catch (error) {
    console.log(colorize('\n❌ iMessage setup failed. You may need to grant permissions.', COLORS.RED));
    console.log(colorize('Error: ' + error.message, COLORS.RED));
    return false;
  }
}

async function showNextSteps(channelSetup) {
  console.log(colorize('\n🎯 NEXT STEPS', COLORS.BOLD + COLORS.GREEN));
  console.log(colorize('============', COLORS.GREEN));
  
  if (channelSetup) {
    console.log(colorize('\n🎉 Great! Your AI assistant is ready to chat!', COLORS.GREEN));
    console.log('\n💬 Try sending these messages to your AI:');
    console.log(colorize('• "Hello! What can you help me with?"', COLORS.CYAN));
    console.log(colorize('• "What\'s the weather like today?"', COLORS.CYAN));
    console.log(colorize('• "Help me organize my desktop files"', COLORS.CYAN));
    console.log(colorize('• "Write a Python script to sort a list"', COLORS.CYAN));
  } else {
    console.log(colorize('\n🌐 No chat channel set up, but you can still use the web dashboard!', COLORS.YELLOW));
  }
  
  console.log(colorize('\n🔗 Your Control Centers:', COLORS.BOLD));
  console.log(colorize('• Moltbot UI: http://localhost:4000', COLORS.BLUE));
  console.log(colorize('• Gateway Dashboard: http://localhost:18789/?token=6b138f6653587f36f7a54fa0e681cddf2b1bdf8b4656e2bf', COLORS.BLUE));
  console.log(colorize('• Control UI: http://localhost:18791/?token=6b138f6653587f36f7a54fa0e681cddf2b1bdf8b4656e2bf', COLORS.BLUE));
  
  console.log(colorize('\n📚 Learn More:', COLORS.BOLD));
  console.log(colorize('• Read the guide: cat moltbot-getting-started-guide.md', COLORS.MAGENTA));
  console.log(colorize('• Check status: node moltbot-status-checker.cjs', COLORS.MAGENTA));
  console.log(colorize('• Documentation: https://docs.clawd.bot', COLORS.MAGENTA));
  
  console.log(colorize('\n🦞 Welcome to the future of personal AI! Enjoy your new assistant!', COLORS.BOLD + COLORS.CYAN));
}

async function main() {
  try {
    await showWelcome();
    
    const choice = await chooseChannel();
    let channelSetup = false;
    
    switch (choice) {
      case '1':
        channelSetup = await setupWhatsApp();
        break;
      case '2':
        channelSetup = await setupTelegram();
        break;
      case '3':
        channelSetup = await setupiMessage();
        break;
      case '4':
        console.log(colorize('\n🎮 Discord setup requires a bot token. Check the guide for details!', COLORS.MAGENTA));
        break;
      case '5':
        console.log(colorize('\n🌐 Web dashboard only - you can set up chat channels later!', COLORS.YELLOW));
        break;
      default:
        console.log(colorize('\n⏭️  Skipping channel setup for now.', COLORS.YELLOW));
    }
    
    await showNextSteps(channelSetup);
    
  } catch (error) {
    console.log(colorize('\n❌ Setup error: ' + error.message, COLORS.RED));
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main().catch(console.error);
}