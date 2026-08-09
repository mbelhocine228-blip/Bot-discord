require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require('node-cron');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// المفتاح مدمج هنا مباشرة لضمان العمل 100% دون الاعتماد على Render
const genAI = new GoogleGenerativeAI("AQ.Ab8RN6IsPcWQliXBObUFg46AAFaOXAWltu_qYrGfFK_5at9t0w");

let lastNewsTime = "لم يتم النشر بعد منذ تشغيل البوت";

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('فحص حالة البوت'),
    new SlashCommandBuilder().setName('news-status').setDescription('مراقبة حالة النشر التلقائي للأخبار'),
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('البحث عن أي معلومة أو إجابة باستخدام الذكاء الاصطناعي')
        .addStringOption(option => option.setName('question').setDescription('السؤال أو الموضوع الذي تريد البحث عنه').setRequired(true)),
    new SlashCommandBuilder()
        .setName('racing-master')
        .setDescription('البحث والإجابة عن أي سؤال يخص لعبة Racing Master بالتفصيل')
        .addStringOption(option => option.setName('query').setDescription('سؤالك أو استفسارك عن اللعبة').setRequired(true)),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل')
        .addIntegerOption(option => option.setName('count').setDescription('عدد الرسائل').setRequired(true)),
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة من خلال البوت')
        .addStringOption(option => option.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(option => option.setName('target').setDescription('العضو').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(option => option.setName('target').setDescription('العضو').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر عضو بالأيدي')
        .addStringOption(option => option.setName('userid').setDescription('أيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('announce-now').setDescription('نشر خبر فوري عن الفعاليات')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}! Bot is ready.`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error(error);
    }

    cron.schedule('*/20 * * * *', () => {
        const targetChannelId = '1534368094888398978'; 
        const channel = client.channels.cache.get(targetChannelId);
        if (channel) {
            const newsList = [
                "📢 **أخبار Racing Master:** ترقبوا أحدث الفعاليات وتحديثات السيارات القادمة في اللعبة!",
                "🏎️ **مفاجآت Racing Master:** هل أنت مستعد للسباق القادم؟ تجهّز لتحديات ومسابقات كبرى هذا الأسبوع!",
                "🔥 **تحديثات اللعبة:** تابع معنا أحدث أخبار وتكتيكات الاحتراف في Racing Master لتكون الأول دائماً!"
            ];
            const randomNews = newsList[Math.floor(Math.random() * newsList.length)];
            channel.send(randomNews);
            lastNewsTime = new Date().toLocaleTimeString();
        }
    });
});

async function askGemini(promptText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { text: "أنت مساعد ذكي ومحترف جداً. تجيب على الأسئلة وتبحث عن المعلومات الدقيقة وتقدمها باللغة العربية بأسلوب منظم وواضح. السؤال هو: " + promptText }
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini Error Details:", error);
        return "عذراً، حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي.";
    }
}

async function askRacingMaster(promptText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { text: "أنت خبير محترف وموسوعة شاملة لكل ما يخص لعبة سباق السيارات الشهيرة Racing Master (أسرار، سيارات، تعديلات، تحكم، خطط، وكل تفاصيل اللعبة). أجب عن هذا السؤال بدقة واحترافية باللغة العربية: " + promptText }
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Racing Master AI Error:", error);
        return "عذراً، حدث خطأ أثناء الاتصال بمدرب Racing Master.";
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        await interaction.reply({ content: '🛠️ **قائمة الأوامر المتاحة:**\n`/ai` - البحث وسؤال الذكاء الاصطناعي\n`/racing-master` - الإجابة عن أي استفسار يخص لعبة Racing Master\n`/news-status` - حالة الأخبار التلقائية\n`/clear` - مسح الرسائل\n`/say` - إرسال رسالة\n`/kick` - طرد\n`/ban` - حظر\n`/unban` - فك حظر', ephemeral: true });
    } 
    else if (commandName === 'status') {
        await interaction.reply({ content: '🟢 البوت يعمل بكفاءة تامة!', ephemeral: true });
    }
    else if (commandName === 'news-status') {
        await interaction.reply({ content: `📡 **حالة النشر التلقائي (Racing Master):**\n- الحالة: تعمل بنجاح\n- آخر وقت نشر: ${lastNewsTime}`, ephemeral: true });
    }
    else if (commandName === 'ai') {
        await interaction.deferReply();
        const question = interaction.options.getString('question');
        const answer = await askGemini(question);
        await interaction.editReply(answer);
    }
    else if (commandName === 'racing-master') {
        await interaction.deferReply();
        const query = interaction.options.getString('query');
        const answer = await askRacingMaster(query);
        await interaction.editReply(answer);
    }
    else if (commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لمسح الرسائل!', ephemeral: true });
        }
        const count = interaction.options.getInteger('count');
        await interaction.channel.bulkDelete(count, true).catch(err => {});
        await interaction.reply({ content: `✅ تم مسح ${count} رسالة.`, ephemeral: true });
    }
    else if (commandName === 'say') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ للمشرفين فقط!', ephemeral: true });
        }
        const msg = interaction.options.getString('message');
        await interaction.channel.send(msg);
        await interaction.reply({ content: '✅ تم الإرسال.', ephemeral: true });
    }
    else if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية للطرد!', ephemeral: true });
        }
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        const member = interaction.guild.members.cache.get(target.id);
        await member.kick(reason);
        await interaction.reply(`👢 تم طرد ${target.tag}. السبب: ${reason}`);
    }
    else if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية للحظر!', ephemeral: true });
        }
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        await interaction.guild.members.ban(target.id, { reason });
        await interaction.reply(`🔨 تم حظر ${target.tag}.`);
    }
    else if (commandName === 'unban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية لفك الحظر!', ephemeral: true });
        }
        const userId = interaction.options.getString('userid');
        await interaction.guild.members.unban(userId);
        await interaction.reply(`🔓 تم إلغاء حظر العضو بنجاح.`);
    }
    else if (commandName === 'announce-now') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ للمشرفين فقط!', ephemeral: true });
        }
        await interaction.channel.send("🚨 **إعلان رسمي:** ترقبوا أقوى الفعاليات والمسابقات في السيرفر الآن!");
        await interaction.reply({ content: '✅ تم نشر الإعلان.', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.mentions.has(client.user)) {
        const cleanMessage = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        if (cleanMessage.length > 0) {
            await message.channel.sendTyping();
            const replyText = await askGemini(cleanMessage);
            message.reply(replyText);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
