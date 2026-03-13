require('dotenv').config();
const {MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin} = require("matrix-bot-sdk");
const express = require("express");
const {v4: uuidv4} = require("uuid");
const path = require("path");
const fs = require("fs");


const url = "https://matrix.simplybush.pl";
const token = process.env.MATRIX_TOKEN;
const dbFile = 'data/database.json';

const active = new Map(); 

const app = express();
const port = 3000;
app.use(express.json());


//this needs to be all replaced someday, with the actual wordle answer, bu t whatever smh my head
app.get('/api/word', (req, res) => {                            //so true
    const answers = ["train", "adieu", "lease", "grand", "furry", "knots", "based", "apple", "queue", "drink"];
    const t = Math.floor(Date.now()/(1000 * 60 * 60 * 24));
    res.json({ word: answers[t % answers.length]});
});



app.post('/api/result', (req, res) => {
    const {gid, box, attempts, ifwon} = req.body;
    
    const current = active.get(gid);
    if (!current) return res.status(404).send("Game not found or already finished");
    // ^^^ will literary never happen because all ids point to index.html - site will always load but not save

    const {roomid, usid} = current;
    const today = new Date().toLocaleDateString('en-CA', {timeZone: 'Europe/Warsaw'});    

    //again GOTTA SWITCH TO SQLITE
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

client.on("room.message", (roomid, event) => {
    if (event.sender === "@wordle:simplybush.pl") return;
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
        
        const gameLink = `https://wordle.simplybush.pl/${gid}`;
        client.sendMessage(roomid, {msgtype: "m.text", body: `good luck uwu: ${gameLink}`});
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

        let message = "Today's Wordle Leaderboard\n\n";
        
        scoreboard.forEach((player, index) => {
            let medal = "⬛";
            if (player.score !== 'X'){
                if (index === 0) medal = "🥇";
                else if (index === 1) medal = "🥈";
                else if (index === 2) medal = "🥉";
            }
            
            message += `${medal} ${player.usid}: ${player.score}/6\n`;
        });

        client.sendMessage(roomid, {msgtype: "m.text",body: message});
    }
});

client.start().then(() => {
    console.log("Wordle Bot started");
}).catch((error) => console.error("failed:", error.body || error.message));
