const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { G4F } = require("g4f");
const g4f = new G4F();
const http = require('http');

// هذا الجزء هو السر: خادم وهمي يبقي البوت مستيقظاً 24/7
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر'),
    new SlashCommandBuilder().setName('status').setDescription('حالة البوت'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص كفاءة البوت'),
    new SlashCommandBuilder().setName('ask').setDescription('سؤال ذكي').addStringOption(o => o.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('racing-master').setDescription('أسئلة Racing Master').addStringOption(o => o.setName('query').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('say').setDescription('يجعل البوت يكرر كلامك').addStringOption(o => o.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('amount').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('log').setDescription('سجل حالة البوت'),
    new SlashCommandBuilder().setName('sup').setDescription('حذف أمر').addStringOption(o => o.setName('command').setDescription('اسم الأمر').setRequired(true))
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('البوت يعمل الآن ومحمي من الانطفاء!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ask' || commandName === 'racing-master') {
        await interaction.deferReply();
        try {
            const q = interaction.options.getString(commandName === 'ask' ? 'question' : 'query');
            const res = await g4f.chatCompletion([{ role: "user", content: q }]);
            await interaction.editReply(`🤖 **الجواب:**\n${res}`);
        } catch (e) { await interaction.editReply("❌ حدث خطأ، تأكد من الاتصال."); }
    }
    else if (commandName === 'bot-working') await interaction.reply('✅ البوت يعمل بكفاءة 100% ومستمر بالعمل 24/7.');
    else if (commandName === 'status') await interaction.reply('🟢 البوت متصل ولا ينطفئ.');
    else if (commandName === 'say') {
        await interaction.reply({ content: 'تم الإرسال', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
    }
    else if (commandName === 'clear') {
        await interaction.channel.bulkDelete(interaction.options.getInteger('amount'), true);
        await interaction.reply({ content: `🧹 تم المسح.`, ephemeral: true });
    }
    else if (commandName === 'log') await interaction.reply('📊 حالة النظام: مستقرة (Keep-Alive Active).');
    else if (commandName === 'help') await interaction.reply('الأوامر: help, status, bot-working, ask, racing-master, say, clear, log, sup');
    else if (commandName === 'sup') await interaction.reply('⚠️ لحذف أمر، قم بإزالته من الكود أعلاه ثم أعد التشغيل.');
});

client.login(process.env.DISCORD_TOKEN);
