const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { OpenAI } = require('openai');
const express = require('express');

// إعداد خادم الويب ليبقي البوت يعمل 24/7
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is active and running!'));
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// قائمة أخبار Racing Master للنشر التلقائي
const newsList = [
    "🏎️ تحديث جديد لـ Racing Master: إضافة سيارات أسطورية جديدة للمنافسة!",
    "🛠️ صيانة دورية للسيرفرات لضمان أفضل أداء، استعدوا للعودة بقوة!",
    "🏆 انطلاق الموسم الجديد من السباقات التنافسية، ادخلوا للمنافسة الآن!",
    "🔥 تخفيضات خاصة على قطع تطوير المحركات في المتجر، لا تفوت الفرصة!",
    "📢 إعلان هام: تحسينات جديدة في نظام الفيزيائية والتحكم في السيارات."
];

let usedNews = new Set();

// دالة النشر التلقائي كل 30 دقيقة
function sendRacingNews(clientInstance) {
    const channel = clientInstance.channels.cache.get('1534368094888398978');
    if (!channel) return;
    if (usedNews.size >= newsList.length) usedNews.clear();
    let news;
    do { news = newsList[Math.floor(Math.random() * newsList.length)]; } while (usedNews.has(news));
    usedNews.add(news);
    channel.send(news).catch(console.error);
}

// تعريف الأوامر المطلوبة فقط وتحديثها وحذف القديم
const commands = [
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('اسأل الذكاء الاصطناعي أي سؤال')
        .addStringOption(o => o.setName('question').setDescription('سؤالك').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد محدد من الرسائل')
        .addIntegerOption(o => o.setName('count').setDescription('عدد الرسائل المراد مسحها').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    
    // تسجيل الأوامر الجديدة ومسح أي أوامر سابقة من الديسكورد
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ تم تسجيل الأوامر الجديدة وحذف القديمة بنجاح.');
    } catch (error) {
        console.error('❌ خطأ أثناء تسجل الأوامر:', error);
    }
    
    // تشغيل النشر التلقائي (كل 30 دقيقة)
    setInterval(() => { sendRacingNews(client); }, 30 * 60 * 1000);
});

// التعامل مع الأوامر المتاحة
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        if (interaction.commandName === 'ai') {
            await interaction.deferReply();
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: interaction.options.getString('question') }]
            });
            await interaction.editReply(completion.choices[0].message.content);
        } 
        else if (interaction.commandName === 'clear') {
            const count = interaction.options.getInteger('count');
            if (count < 1 || count > 100) {
                return interaction.reply({ content: '❌ يرجى اختيار عدد بين 1 و 100.', ephemeral: true });
            }
            
            await interaction.deferReply({ ephemeral: true });
            await interaction.channel.bulkDelete(count, true);
            await interaction.editReply(`🧹 تم مسح **${count}** رسالة بنجاح!`);
        }
    } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.' }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
