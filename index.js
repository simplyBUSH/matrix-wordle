require('dotenv').config();
const {MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin} = require("matrix-bot-sdk");
const express = require("express");
const {v4: uuidv4} = require("uuid");
const path = require("path");
const fs = require("fs");

const url = process.env.MATRIX_URL;
const token = process.env.MATRIX_TOKEN;
const bot_id = process.env.MATRIX_BOT_ID;

const dbFile = 'data/database.json';
const  wordsFile= 'data/words.json';

const active = new Map(); 

const app = express();
const port = 3000;
app.use(express.json());

function ifplayed(roomid, t){
    if (!t) return false;
    return Object.values(t).some(record => 
        (record.roomids && record.roomids.includes(roomid)) || record.roomid === roomid
    );
}

function getstreak(roomid, db){
    let streak = 0;
    let dateObj = new Date();
    const d = (date) => date.toLocaleDateString('en-CA', {timeZone: 'Europe/Warsaw'});
    
    let playedToday = ifplayed(roomid, db[d(dateObj)]);
    if (playedToday) streak++;
    
    while (true){
        dateObj.setDate(dateObj.getDate() - 1);
        let prevDayStr = d(dateObj);
        
        if (ifplayed(roomid, db[prevDayStr])){
            streak++;

        }else{
            break; 
        }
    }
    return streak;
}

function wDate(days = 0){
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toLocaleDateString('en-CA', {timeZone: 'Europe/Warsaw'});
}

async function fetchNYT(dateStr){
    const res = await fetch(`https://www.nytimes.com/svc/wordle/v2/${dateStr}.json`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return {word: data.solution.toLowerCase(), no: data.days_since_launch};
}

async function updateWords(){
    const window = [wDate(-1), wDate(0), wDate(1)];

    let words = {};
    if (fs.existsSync(wordsFile)){
        try {words = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));}
        catch {words = {};}
    }
    let changed = false;
    for (const date of window){
        if (!words[date]){
            try{
                words[date] = await fetchNYT(date);
                console.log(`fetched word for ${date}: ${words[date].word}`);
                changed = true;
            }catch (e){
                console.error(`failed to fetch word for ${date}:`, e.message);
            }
        }
    }
    const keep = new Set(window);
    for (const key of Object.keys(words)){
        if (!keep.has(key)){delete words[key]; changed = true;}
    }

    if (changed){
        fs.mkdirSync('data', {recursive: true});
        fs.writeFileSync(wordsFile, JSON.stringify(words, null, 2));
    }
    return words;
}

setInterval(updateWords, 3_600_000);

app.get('/api/word', async (req, res) => {
    const date = req.query.date;

    if (date){
        if (fs.existsSync(wordsFile)){
            try{
                const words = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
                if (words[date]) return res.json({word: words[date].word, no: words[date].no});
            }catch {}
        }

        try{
            const entry = await fetchNYT(date);
            return res.json({word: entry.word, no: entry.no});
        }catch (e){            
            console.error('NYT fallback failed:', e.message);
        }
    }

    res.status(500).json({error: 'Word unavailable'});
});

app.post('/api/result', (req, res) => {
    const {gid, box, attempts, ifwon} = req.body;
    
    const current = active.get(gid);
    if (!current) return res.status(404).send("Game not found or already finished");
    // ^^^ will literary never happen because all ids point to index.html - site will always load but not save

    const {roomid, usid} = current;
    const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Warsaw'});    

    //again GOTTA SWITCH TO SQLITE - not today (16.03)
    let db = {};
    if (fs.existsSync(dbFile)){
        db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
    
    if (!db[today]) db[today] = {};
    
    const scoreText = ifwon ? attempts : 'X';
    
    db[today][usid] = {
        score: scoreText,
        grid: box,
        roomids: [roomid]
    };

    
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

    const message = `Wordle ${scoreText}/6\nPlayer: ${usid}\n\n${box}`;
    
    client.sendMessage(roomid, {
        msgtype: "m.text",
        body: message
    });

    active.delete(gid);
    res.json({ success: true });
});

app.get('/:id', (req, res) => {
    if (req.params.id === 'favicon.ico') return res.status(404).end();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`web server is running on port ${port}`);
});

const storage = new SimpleFsStorageProvider("data/bot-state.json");
const client = new MatrixClient(url, token, storage);
AutojoinRoomsMixin.setupOnClient(client);

client.on("room.message", async (roomid, event) => {
    if (event.sender === bot_id) return;
    if (!event.content || event.content.msgtype !== "m.text") return;

    const command = event.content.body.trim();
    const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Warsaw' });

    //commands
    if (command === "!help"){
        client.sendMessage(roomid, {msgtype: "m.text", body: `click the generated link and finish the game, your answer will be saved in a leaderboard for this chat!\n\nList of commands: \n!play - generate a link to todays wordle \n!lb - show the leaderboard in current channel \n!share - adds your answer to this chat \n!help - show this message`});
    }

    if (command === "!share"){
        //copy existing answer to this channel
        const usid = event.sender;

        let db = {};
        if (fs.existsSync(dbFile)){
            db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }

        if (db[today] && db[today][usid]){
            const userRecord = db[today][usid];
            const message = `result added to this rooms:\n\nWordle ${userRecord.score}/6\nPlayer: ${usid}\n\n${userRecord.grid}`;
            
            client.sendMessage(roomid, {
                msgtype: "m.text", 
                body: message
            });
            
            //i fhad roomid change to rommids
            if (userRecord.roomid && !userRecord.roomids) {
                userRecord.roomids = [userRecord.roomid];
                delete userRecord.roomid;
            }

            //if the roomid is not in the users file, add it to roomids
            if (userRecord.roomids && !userRecord.roomids.includes(roomid)) {
                userRecord.roomids.push(roomid);
                fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
            }

        } else {
            client.sendMessage(roomid, {
                msgtype: "m.text", 
                body: "you haven't completed the puzzle yet"
            });
        }
    }

    if (command === "!play"){
        const usid = event.sender;

        let db = {};
        if (fs.existsSync(dbFile)){
            db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }

        if (db[today] && db[today][usid]){
            const userRecord = db[today][usid];
            const message = `you can only play one game a day`;
            client.sendMessage(roomid, {msgtype: "m.text", body: message});
            return; 
        }

        const gid = uuidv4().substring(0, 8);
        active.set(gid, {roomid: roomid, usid: usid});

        //kills game after 24h
        setTimeout(() => {
            if (active.has(gid)) {
                active.delete(gid);
            }
        }, 86400000);
        
        const gameLink = `https://wordle.simplybush.pl/${gid}`;
        let displayName = usid;
        try {
            const profile = await client.getUserProfile(usid);
            if (profile?.displayname) displayName = profile.displayname;
        } catch {}

        client.sendMessage(roomid, {
            msgtype: "m.text",
            format: "org.matrix.custom.html",
            body: `good luck ${displayName} uwu: ${gameLink}`,
            formatted_body: `good luck <a href="https://matrix.to/#/${usid}">${displayName}</a> uwu: ${gameLink}`
        });
    }

    if (command === "!lb"){
        let db = {};
        if (fs.existsSync(dbFile)){
            db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }

        if (!db[today] || Object.keys(db[today]).length === 0){
            client.sendMessage(roomid,{msgtype: "m.text", body: "No one has played Wordle today yet\nget to it"});
            return;
        }

        const players = Object.keys(db[today]).filter(usid => {
            const record = db[today][usid];
            
            if (record.roomids) {
                return record.roomids.includes(roomid);
            } 

            // safe to remove, backup if still SOMEHOW is using roomid not roomids
            else if (record.roomid) {
                return record.roomid === roomid;
            }
            return false;
        });
     
        const scoreboard = players.map(usid => {
            return {
                usid: usid,
                score: db[today][usid].score
            };
        });

        scoreboard.sort((a, b) => {
            if (a.score === 'X' && b.score === 'X') return 0;
            if (a.score === 'X') return 1;
            if (b.score === 'X') return -1;
            return a.score - b.score;
        });

        let num = "no clue";
        if (fs.existsSync(wordsFile)){
            try{
                const words = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
                if (words[today]) num = words[today].no;
            }catch{}
        }

        const str = getstreak(roomid, db);
        let message = `Todays wordle scores\nNo. ${num} | 🔥 Streak: ${str}\n\n`;

        scoreboard.forEach((player, index) => {
            let medal = "⬛";
            if (player.score !== 'X') {
                if (index === 0) medal = "🥇";
                else if (index === 1) medal = "🥈";
                else if (index === 2) medal = "🥉";
            }
            message += `${medal} ${player.usid}: ${player.score}/6\n`;
        });

        client.sendMessage(roomid, {msgtype: "m.text", body: message});
    }
});

client.start().then(async () => {
    console.log("Wordle Bot started");
    await updateWords();
    const updf = 'update.html';

    if (fs.existsSync(updf)){
        const msg = fs.readFileSync(updf, 'utf-8');

        try{
            const rooms = await client.getJoinedRooms();

            for (const room of rooms){
                // changed for formatted text - matrix uses html not markdown for some reason?
                await client.sendMessage(room, {
                    msgtype: "m.text",
                    format: "org.matrix.custom.html",
                    body: msg,
                    formatted_body: msg
                });

                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }catch (error){
            console.error(error);
        }
    }
}).catch((error) => console.error("failed:", error.body || error.message));
