const { Client, GatewayIntentBits } = require('discord.js');

// إنشاء عميل البوت مع الصلاحيات الأساسية
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// حدث يتم تنفيذه بمجرد تشغيل البوت بنجاح
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

// مثال على تفاعل بسيط (رد على رسالة ping بـ pong)
client.on('messageCreate', message => {
  if (message.author.bot) return;
  
  if (message.content === 'ping') {
    message.reply('pong!');
  }
});

// تشغيل البوت باستخدام التوكن من إعدادات البيئة (Render Environment Variables)
client.login(process.env.DISCORD_TOKEN);
