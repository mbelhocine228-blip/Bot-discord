const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
app.set('trust proxy', 1);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rks-koya-master-secret-999', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: '1171579175635800175',         
    clientSecret: 'I1JZsvXEZ_L4iQjAlIMurRy-c_ikOecN', 
    callbackURL: 'https://bot-discord-g9r5.onrender.com/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { 
    failureRedirect: '/' 
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { 
    req.logout(() => {
        res.redirect('/');
    }); 
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Koya Master Dashboard</title>
            <style>
                body { background-color: #2f3136; color: #ffffff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 380px; }
                h1 { color: #ffffff; margin-bottom: 10px; font-size: 26px; }
                p { color: #b9bbbe; margin-bottom: 30px; font-size: 14px; }
                .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; width: 100%; box-sizing: border-box; }
                .btn:hover { background-color: #4752C4; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الكاملة لجميع أوامر Koya</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد</a>
            </div>
        </body>
        </html>
    `);
});

// قائمة السيرفرات
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/autoroles" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 130px;">
                <img src="${iconUrl}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #5865F2; margin-bottom: 10px;">
                <span style="font-size: 14px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${guild.name}</span>
            </a>
        `;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>اختر السيرفر</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; padding: 40px; }
                .container { max-width: 850px; margin: auto; background: #36393f; padding: 30px; border-radius: 12px; border: 1px solid #202225; }
                h2 { margin-top: 0; color: #fff; }
                .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }
                .logout { display: inline-block; margin-top: 30px; color: #ed4245; text-decoration: none; font-weight: bold; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>مرحباً بك، ${req.user.username} 👋</h2>
                <p style="color: #b9bbbe;">اختر السيرفر للتحكم الشامل بجميع الأوامر والخصائص:</p>
                <div class="grid">${guildsHtml || '<p style="color: #ed4245;">لا توجد سيرفرات مشتركة.</p>'}</div>
                <br><a href="/logout" class="logout">تسجيل الخروج 🚪</a>
            </div>
        </body>
        </html>
    `);
});

// لوحة التحكم بالأقسام الكاملة (مطابقة لـ Koya.gg)
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    const section = req.params.section || 'autoroles';
    let contentHtml = '';

    // أقسام الرتب والترحيب
    if (section === 'autoroles') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">➕ Auto Rôles</div>
                <div class="setting-desc">تحديد الرتب التلقائية للأعضاء الجدد فور انضمامهم.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="role" placeholder="اسم الرتبة أو الـ ID...">
                    <button type="submit" class="btn-apply">حفظ الرتبة 💾</button>
                </form>
            </div>`;
    } else if (section === 'reactions') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">⭐ Rôles Réaction</div>
                <div class="setting-desc">منح الرتب تلقائياً عبر تفاعل الأعضاء بالإيموجي.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="channel" placeholder="معرف القناة...">
                    <input type="text" name="emoji" placeholder="الإيموجي...">
                    <input type="text" name="role" placeholder="الرتبة المستهدفة...">
                    <button type="submit" class="btn-apply">إنشاء تفاعل الرتب 🎯</button>
                </form>
            </div>`;
    } else if (section === 'welcome') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">👋 Message de Bienvenue</div>
                <div class="setting-desc">تخصيص رسالة الترحيب والـ Embeds للأعضاء الجدد.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <textarea name="welcomeText" rows="3">مرحباً بك {user.mention} في سيرفر **{server.name}**!</textarea>
                    <button type="submit" class="btn-apply">حفظ رسالة الترحيب 🚀</button>
                </form>
            </div>`;
    } else if (section === 'banmsg') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📢 Message de Banissement</div>
                <div class="setting-desc">إعداد وتخصيص رسائل وإشعارات الحظر.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <textarea name="banText" rows="3">{user.mention} a été banni.</textarea>
                    <button type="submit" class="btn-apply">حفظ الإعداد 🛡️</button>
                </form>
            </div>`;
    } 
    // أقسام المودريشن والحماية المتقدمة
    else if (section === 'autopseudo') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">👤 Auto Pseudo</div>
                <div class="setting-desc">إجبار الأعضاء على استخدام تنسيق أسماء محدد تلقائياً عند الدخول.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="nicknameFormat" placeholder="مثال: [RKS] {user.name}">
                    <button type="submit" class="btn-apply">حفظ تنسيق الأسماء ✍️</button>
                </form>
            </div>`;
    } else if (section === 'automod') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">🛡️ Auto Mod <span class="badge">New</span></div>
                <div class="setting-desc">حماية السيرفر من السبام، الروابط الخبيثة، والشتائم.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="display:flex; gap:10px; margin-bottom:12px; cursor:pointer;"><input type="checkbox" name="antiSpam" style="width:18px;"> منع السبام والتكرار السريع</label>
                    <label style="display:flex; gap:10px; margin-bottom:15px; cursor:pointer;"><input type="checkbox" name="antiLinks" style="width:18px;"> منع الروابط الخارجية والدعوات</label>
                    <button type="submit" class="btn-apply">حفظ إعدادات الحماية 🔒</button>
                </form>
            </div>`;
    } else if (section === 'honeypot') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">🍯 Honeypot <span class="badge">New</span></div>
                <div class="setting-desc">قنوات وهمية مخفية للإيقاع بالبـوتات (Raid Protection) وحظرهم تلقائياً.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="display:flex; gap:10px; margin-bottom:15px; cursor:pointer;"><input type="checkbox" name="enableHoneypot" style="width:18px;"> تفعيل نظام فخ الحماية ضد الرايد</label>
                    <button type="submit" class="btn-apply">تفعيل الحماية العميقة 🐝</button>
                </form>
            </div>`;
    } else if (section === 'moderation') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">⚡ Modération (أوامر المودريشن)</div>
                <div class="setting-desc">إعدادات الصلاحيات والعقوبات الخاصة بالمشرفين.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="modRole" placeholder="معرف رتبة المشرفين (Mod Role ID)...">
                    <button type="submit" class="btn-apply">حفظ الصلاحيات ⚔️</button>
                </form>
            </div>`;
    } else if (section === 'warnings') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">⚠️ Avertissements (نظام التحذيرات)</div>
                <div class="setting-desc">العقوبات التلقائية عند وصول العضو لعدد معين من التحذيرات.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="maxWarns" placeholder="الحد الأقصى للتحذيرات قبل الحظر (مثال: 3)...">
                    <button type="submit" class="btn-apply">حفظ نظام التحذيرات ⚠️</button>
                </form>
            </div>`;
    } else if (section === 'dossiers') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📁 Dossiers de modération <span class="badge">New</span></div>
                <div class="setting-desc">أرشيف شامل لملفات وتقارير العقوبات الخاصة بالأعضاء.</div>
                <p style="color:#b9bbbe; font-size:14px;">يتم حفظ أرشيف المخالفات وسجلات العقوبات هنا تلقائياً.</p>
            </div>`;
    } else if (section === 'logs') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📋 Logs</div>
                <div class="setting-desc">تسجيل جميع الأحداث والتعديلات في السيرفر.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="logChannel" placeholder="معرف قناة السجلات...">
                    <button type="submit" class="btn-apply">حفظ السجلات 📊</button>
                </form>
            </div>`;
    } 
    // أقسام Flux Sociaux (المنصات الخارجية)
    else if (section === 'youtube') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">▶️ YouTube</div><div class="setting-desc">إشعارات فيديوهات وبثوث يوتيوب تلقائياً.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="ytChannel" placeholder="رابط قناة اليوتيوب..."><button type="submit" class="btn-apply">حفظ يوتيوب 🔔</button></form></div>`;
    } else if (section === 'twitch') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">💜 Twitch</div><div class="setting-desc">إشعارات بثوث تويتش المباشرة.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="twitchUser" placeholder="اسم حساب تويتش..."><button type="submit" class="btn-apply">حفظ تويتش 🎮</button></form></div>`;
    } else if (section === 'kick') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">🟢 Kick</div><div class="setting-desc">إشعارات منصة Kick للبثوث.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="kickUser" placeholder="حساب كيك..."><button type="submit" class="btn-apply">حفظ كيك 📡</button></form></div>`;
    } else if (section === 'reddit') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">🤖 Reddit</div><div class="setting-desc">جلب منشورات وسبريديت ريديت للسيرفر.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="subreddit" placeholder="اسم السبريديت (مثال: r/gaming)..."><button type="submit" class="btn-apply">حفظ ريديت 🌐</button></form></div>`;
    } else if (section === 'bluesky') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">🦋 Bluesky</div><div class="setting-desc">متابعة منشورات Bluesky في السيرفر.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="bskyUser" placeholder="حساب Bluesky..."><button type="submit" class="btn-apply">حفظ Bluesky ✨</button></form></div>`;
    } else if (section === 'rss') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">📰 RSS Feeds</div><div class="setting-desc">ربط مواقع الأخبار والمقالات عبر موجز RSS.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="rssUrl" placeholder="رابط الـ RSS..."><button type="submit" class="btn-apply">حفظ RSS 📌</button></form></div>`;
    } else if (section === 'music') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">🎵 Sorties musicales <span class="badge">New</span></div><div class="setting-desc">إشعارات الإصدارات والألبومات الموسيقية الجديدة.</div>
            <form action="/action/save" method="POST"><input type="hidden" name="guildId" value="${guild.id}"><input type="text" name="artistName" placeholder="اسم الفنان أو الألبوم..."><button type="submit" class="btn-apply">حفظ الإصدارات 🎧</button></form></div>`;
    } 
    // أقسام Utilitaires (الأدوات العامة)
    else if (section === 'lovecalc') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">❤️ LoveCalc</div><div class="setting-desc">أمر قياس نسبة التوافق والحب الترفيهي بين الأعضاء.</div>
            <p style="color:#b9bbbe; font-size:14px;">الأمر مفعل تلقائياً وجاهز للاستخدام في السيرفر عبر بوتات الكلان.</p></div>`;
    } else if (section === 'divers') {
        contentHtml = `
            <div class="setting-card"><div class="setting-title">🛠️ Divers (أدوات عامة منوعة)</div><div class="setting-desc">أوامر ترفيهية ومعلومات عامة إضافية.</div>
            <p style="color:#b9bbbe; font-size:14px;">تضم مجموعة واسعة من الأوامر المساعدة والترفيهية.</p></div>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - Koya Master Dashboard</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
                .sidebar { width: 300px; background: #202225; padding: 15px; display: flex; flex-direction: column; gap: 3px; border-left: 1px solid #2f3136; box-sizing: border-box; overflow-y: auto; }
                .sidebar h3 { font-size: 11px; color: #8e9297; margin: 12px 0 4px 0; text-transform: uppercase; }
                .sidebar a { color: #b9bbbe; text-decoration: none; padding: 8px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; }
                .sidebar a:hover, .sidebar a.active { background: #393c43; color: #ffffff; }
                .badge { background: #5865F2; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
                .content { flex: 1; padding: 40px; overflow-y: auto; background: #36393f; }
                .setting-card { background: #2f3136; padding: 25px; border-radius: 8px; border: 1px solid #202225; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .setting-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #fff; display: flex; align-items: center; gap: 10px; }
                .setting-desc { font-size: 13px; color: #b9bbbe; margin-bottom: 20px; }
                input[type="text"], textarea { width: 100%; padding: 12px; background: #202225; color: white; border: 1px solid #202225; border-radius: 6px; box-sizing: border-box; margin-bottom: 12px; font-size: 14px; }
                .btn-apply { background: #5865F2; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
                .btn-apply:hover { background: #4752C4; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <h3 style="margin-top:0;">Rôles & Accueil</h3>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ Auto Rôles</a>
                <a href="/control/${guild.id}/reactions" class="${section === 'reactions' ? 'active' : ''}">⭐ Rôles Réaction</a>
                <a href="/control/${guild.id}/welcome" class="${section === 'welcome' ? 'active' : ''}">👋 Message de Bienvenue</a>
                <a href="/control/${guild.id}/banmsg" class="${section === 'banmsg' ? 'active' : ''}">📢 Message de Banissement</a>
                
                <h3>Modération</h3>
                <a href="/control/${guild.id}/autopseudo" class="${section === 'autopseudo' ? 'active' : ''}">👤 Auto Pseudo</a>
                <a href="/control/${guild.id}/automod" class="${section === 'automod' ? 'active' : ''}">🛡️ Auto Mod <span class="badge">New</span></a>
                <a href="/control/${guild.id}/honeypot" class="${section === 'honeypot' ? 'active' : ''}">🍯 Honeypot <span class="badge">New</span></a>
                <a href="/control/${guild.id}/moderation" class="${section === 'moderation' ? 'active' : ''}">⚡ Modération</a>
                <a href="/control/${guild.id}/warnings" class="${section === 'warnings' ? 'active' : ''}">⚠️ Avertissements</a>
                <a href="/control/${guild.id}/dossiers" class="${section === 'dossiers' ? 'active' : ''}">📁 Dossiers <span class="badge">New</span></a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 Logs</a>

                <h3>Flux Sociaux</h3>
                <a href="/control/${guild.id}/youtube" class="${section === 'youtube' ? 'active' : ''}">▶️ YouTube</a>
                <a href="/control/${guild.id}/twitch" class="${section === 'twitch' ? 'active' : ''}">💜 Twitch</a>
                <a href="/control/${guild.id}/kick" class="${section === 'kick' ? 'active' : ''}">🟢 Kick</a>
                <a href="/control/${guild.id}/reddit" class="${section === 'reddit' ? 'active' : ''}">🤖 Reddit</a>
                <a href="/control/${guild.id}/bluesky" class="${section === 'bluesky' ? 'active' : ''}">🦋 Bluesky</a>
                <a href="/control/${guild.id}/rss" class="${section === 'rss' ? 'active' : ''}">📰 RSS</a>
                <a href="/control/${guild.id}/music" class="${section === 'music' ? 'active' : ''}">🎵 Sorties musicales <span class="badge">New</span></a>

                <h3>Utilitaires</h3>
                <a href="/control/${guild.id}/lovecalc" class="${section === 'lovecalc' ? 'active' : ''}">❤️ LoveCalc</a>
                <a href="/control/${guild.id}/divers" class="${section === 'divers' ? 'active' : ''}">🛠️ Divers</a>
                
                <h3>Navigation</h3>
                <a href="/dashboard" style="color: #5865F2;">← اختيار سيرفر آخر</a>
                <a href="/logout" style="color: #ed4245;">تسجيل الخروج 🚪</a>
            </div>
            
            <div class="content">
                <h2 style="margin-top:0; color:#fff;">إدارة سيرفر: ${guild.name}</h2>
                ${contentHtml}
            </div>
        </body>
        </html>
    `);
});

app.post('/action/save', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.redirect(req.headers.referer || '/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Koya Master Dashboard running on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
