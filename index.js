const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { G4F } = require("g4f");
const g4f = new G4F();
const cron = require('node-cron');
const http = require('http');

// خادم وهمي لإبقاء البوت مستيقظاً 24/7
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// تعريف جميع الأوامر
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('معرفة حالة البوت الحالية'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص كفاءة البوت وهل هو شغال'),
    new SlashCommandBuilder().setName('ask').setDescription('سؤال ذكي (بحث عبر الذكاء الاصطناعي)').addStringOption(o => o.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('racing-master').setDescription('أسئلة وأخبار Racing Master').addStringOption(o => o.setName('query').setDescription('سؤالك عن اللعبة').setRequired(true)),
    new SlashCommandBuilder().setName('say').setDescription('يجعل البوت يكرر كلامك').addStringOption(o => o.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('amount').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('log').setDescription('معرفة سجل حالة البوت'),
    new SlashCommandBuilder().setName('sup').setDescription('حذف أمر من السيرفر').addStringOption(o => o.setName('command').setDescription('اسم الأمر المراد حذفه').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('تم تحديث جميع الأوامر بنجاح!');

    // النشر التلقائي في قناتك المحددة كل 20 دقيقة بدون تكرار
    cron.schedule('*/20 * * * *', async () => {
        try {
            const targetChannelId = '1534368094888398978'; 
            const targetChannel = await client.channels.fetch(targetChannelId);
            
            if (!targetChannel) return;

            const newsPrompt = "أعطني خبراً أو فعالية جديدة كلياً، حصرية ومختصرة عن لعبة السيارات Racing Master (تحديث، سيارات جديدة، فعالية سباق، أو نصيحة احترافية). اجعل المحتوى متجدداً تماماً وغير مكرر.";
            const freshNews = await g4f.chatCompletion([{ role: "user", content: newsPrompt }]);
            
            await targetChannel.send(`🏎️ **[أخبار وفعاليات Racing Master]**\n\n${freshNews}`);
            console.log('تم نشر الخبر في القناة المحددة بنجاح!');
        } catch (error) {
            console.error('خطأ في النشر التلقائي:', error);
        }
    });
});

// تنفيذ الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ask' || commandName === 'racing-master') {
        await interaction.deferReply();
        try {
            const q = interaction.options.getString(commandName === 'ask' ? 'question' : 'query');
            const res = await g4f.chatCompletion([{ role: "user", content: q }]);
            await interaction.editReply(`🤖 **الجواب:**\n${res}`);
        } catch (e) { 
            await interaction.editReply("❌ حدث خطأ في جلب الإجابة، تأكد من الاتصال."); 
        }
    }
    else if (commandName === 'help') {
        await interaction.reply({ content: '🛠️ **قائمة الأوامر الكاملة:**\n/help, /status, /bot-working, /ask, /racing-master, /say, /clear, /log, /sup', ephemeral: true });
    }
    else if (commandName === 'status') {
        await interaction.reply('🟢 البوت يعمل بكفاءة 24/7 مع النشر التلقائي للأخبار.');
    }
    else if (commandName === 'bot-working') {
        await interaction.reply('✅ البوت شغال 100% وجاهز لجميع الأوامر والبحث الفوري.');
    }
    else if (commandName === 'log') {
        await interaction.reply('📊 سجل التشغيل: النظام مستقر، ونظام النشر كل 20 دقيقة مفعل للقناة المحددة.');
    }
    else if (commandName === 'say') {
        await interaction.reply({ content: 'تم الإرسال بنجاح', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
    }
    else if (commandName === 'clear') {
        const amount = interaction.options.getInteger('amount');
        await interaction.channel.bulkDelete(amount, true);
        await interaction.reply({ content: `🧹 تم مسح ${amount} رسالة.`, ephemeral: true });
    }
    else if (commandName === 'sup') {
        const cmdName = interaction.options.getString('command');
        await interaction.reply({ content: `⚠️ الأمر "${cmdName}" محجوز. لإزالته، احذفه من الكود وأعد التشغيل.`, ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
p
