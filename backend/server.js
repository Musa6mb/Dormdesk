// const openai = new OpenAI({
//     apiKey: "YOUR_REAL_OPENAI_KEY"
// });
//test
require("dotenv").config();
console.log("API KEY:", process.env.OPENAI_API_KEY);
const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const DB_FILE = "./db.json";

// helper function
function readDB() {
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2)
    );
}

// student registration API
app.post("/api/students/register", (req, res) => {
    const student = req.body;

    const studentNumberPattern = /^[1-9][0-9]{8}$/;

    const passwordPattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // Student Number Validation
    if (!studentNumberPattern.test(student.studentNumber)) {
        return res.status(400).json({
            message:
            "Student number must be exactly 9 digits and cannot start with 0."
        });
    }

    // Password Validation
    if (!passwordPattern.test(student.password)) {
        return res.status(400).json({
            message:
            "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number and special character."
        });
    }

    const db = readDB();

    const exists = db.students.find(
        s => s.studentNumber === student.studentNumber
    );

    if (exists) {
        return res.status(400).json({
            message: "Student already registered."
        });
    }

    db.students.push(student);

    writeDB(db);

    res.json({
        message: "Registration successful."
    });
});
// END OF OUR VALIDATIONS

// LOGIN API
app.post("/api/students/login", (req, res) => {

    const { studentNumber, password } = req.body;

    const db = readDB();

    const student = db.students.find(
        s =>
        s.studentNumber === studentNumber &&
        s.password === password
    );

    if (!student) {

        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    res.json({
        message: "Login successful",
        student
    });
});

//api for getting all registered students
// GET ALL REGISTERED STUDENTS
app.get("/api/students", (req, res) => {

    const db = readDB();

    res.json(db.students);

});

// deleting students API
app.delete(
"/api/students/:studentNumber",
(req, res) => {

    const db = readDB();

    const index = db.students.findIndex(
        student =>
        student.studentNumber ===
        req.params.studentNumber
    );

    if(index === -1){

        return res.status(404).json({
            message: "Student not found"
        });

    }

    db.students.splice(index, 1);

    writeDB(db);

    res.json({
        message: "Student deleted successfully"
    });

});

// API FOR Reporting issues(creating issues)
app.post("/api/issues/report", (req, res) => {

    const db = readDB();

const issue = {
    id: Date.now(),
    studentNumber: req.body.studentNumber,
    title: req.body.title,
    category: req.body.category,
    location: req.body.location,
    description: req.body.description,
    status: "Pending",
    createdAt: new Date()
};

    db.issues.push(issue);
    db.notifications.push({
    id: Date.now(),
    studentNumber: req.body.studentNumber,
    message:
    `Issue "${req.body.title}" has been reported.`,
    read:false,
    createdAt:new Date()
});

    writeDB(db);

    res.json({
        message: "Issue reported successfully",
        issue
    });

});
// to view issues
app.get("/api/issues", (req,res)=>{

    const db = readDB();

    res.json(db.issues);

});



// API FOR GETTING ALL ISSUES
app.get("/api/issues/:studentNumber", (req, res) => {

    const db = readDB();

    const issues = db.issues.filter(
        issue =>
        issue.studentNumber === req.params.studentNumber
    );

    res.json(issues);

});


// API FOR UPDATING ISSUE STATUS
app.put("/api/issues/:id/update", (req, res) => {

    const db = readDB();

    const issue = db.issues.find(
        i => i.id == req.params.id
    );

    if (!issue) {
        return res.status(404).json({
            message: "Issue not found"
        });
    }

    issue.status = req.body.status;
    issue.adminComment = req.body.comment;
    issue.updatedAt = new Date().toISOString();

    // Create notification for student
    db.notifications.push({
        id: Date.now(),
        studentNumber: issue.studentNumber,
        message: `Update on "${issue.title}": ${req.body.status} - ${req.body.comment}`,
        read: false,
        createdAt: new Date().toISOString()
    });

    writeDB(db);

    res.json({
        message: "Issue updated successfully",
        issue
    });

});


// API FOR MARKET PLACE
app.post("/api/marketplace/add", (req, res) => {

    const db = readDB();

    const item = {
    id: Date.now(),
    studentNumber: req.body.studentNumber,
    title: req.body.title,
    description: req.body.description,
    price: req.body.price,
    createdAt: new Date()
};

    db.marketplace.push(item);

    writeDB(db);

    res.json({
        message: "Listing added successfully",
        item
    });
});

// rout for market place API

app.get("/api/marketplace", (req,res)=>{

    const db = readDB();

    res.json(db.marketplace);

});

// missing for markret place 
// app.get("/api/marketplace", (req, res) => {

//     const db = readDB();

//     res.json(db.marketplace);

// });

// populate the active listing and updates

app.get("/api/dashboard/stats", (req, res) => {

    const db = readDB();

    const stats = {

        activeAlerts: db.emergencies.length,

        newListings: db.marketplace.length,

        openCases: db.issues.filter(
            issue => issue.status !== "Resolved"
        ).length
    };

    res.json(stats);
});


// When an issue is created, create a notification(notification API)

app.post("/api/notifications", (req, res) => {

    const db = readDB();

    const notification = {

        id: Date.now(),

        studentNumber: req.body.studentNumber,

        message: req.body.message,

        read: false,

        createdAt: new Date()
    };

    db.notifications.push(notification);

    writeDB(db);

    res.json(notification);
});

// get nofications
app.get("/api/notifications/:studentNumber", (req, res) => {

    const db = readDB();

    const notifications = db.notifications.filter(

        n =>
        n.studentNumber === req.params.studentNumber

    );

    res.json(notifications);
});

// API FOR LOST AND FOUND(REPORT ITEMS)
app.post("/api/lostfound/report", (req, res) => {
    try {
        const db = readDB();

        if (!db.lostFound) {
            db.lostFound = [];
        }

        const report = {
            id: Date.now(),
            studentNumber: req.body.studentNumber,
            itemName: req.body.itemName,
            description: req.body.description,
            location: req.body.location,
            contact: req.body.contact,
            type: req.body.type,
            createdAt: new Date()
        };

        db.lostFound.push(report);

        writeDB(db);

        console.log("Lost & Found item saved:", report);

        res.status(201).json(report);

    } catch (error) {
        console.error("Lost & Found Error:", error);

        res.status(500).json({
            message: "Failed to save lost and found report"
        });
    }
});

// GETTING ALL REPORTS
app.get("/api/lostfound", (req, res) => {

    const db = readDB();

    res.json(db.lostFound);

});
// FORGOT PASSWORD API
app.put("/api/students/reset-password", (req, res) => {

    const { studentNumber, emailAddress, newPassword } = req.body;

    const db = readDB();

    const student = db.students.find(
        s =>
        s.studentNumber === studentNumber &&
        s.emailAddress === emailAddress
    );

    if (!student) {
        return res.status(404).json({
            message: "Student Number or Email is incorrect"
        });
    }

    student.password = newPassword;

    writeDB(db);

    res.json({
        message: "Password updated successfully"
    });

});

// chat route api
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

 app.post("/api/chat", async (req, res) => {
     console.log("Chat request received:", req.body);
     const { message } = req.body;
     console.log("Message:", message);
     try {

        const { message } = req.body;

        const completion =
            await openai.chat.completions.create({
                model: "gpt-4o-mini",

                messages: [
                    {
                        role: "system",
                        content: `
                        You are DormDesk AI Assistant.
                        You help students with:
                        - residence information
                        - maintenance reports
                        - WiFi issues
                        - room allocations
                        - residence rules
                        - issue tracking
                        - emergency guidance

                        Keep answers concise and helpful.
                        `
                    },
                    {
                        role: "user",
                        content: message
                    }
                ]
            });

        res.json({
            reply:
            completion.choices[0].message.content
        });

    } catch (error) {

    console.error("========== OPENAI ERROR ==========");
    console.error(error);
    console.error("Message:", error.message);

    res.status(500).json({
        reply: "AI service unavailable."
    });
}
});


// FOR RUNNING THE SERVER.JS
app.listen(3000, () => {
    console.log("Server running on port 3000");
});